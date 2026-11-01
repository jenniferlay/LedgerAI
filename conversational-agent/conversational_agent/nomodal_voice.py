import asyncio
import json
import os
import sys

import httpx
import pyaudio
import websockets
from pydantic_ai.usage import UsageLimits

from conversational_agent.agent import advisor_agent, get_agent_deps
from conversational_agent.speech_sanitizer import clean_for_speech


async def run_nomodal_voice() -> None:
  api_key = os.getenv("DEEPGRAM_API_KEY")
  if not api_key:
    raise ValueError(
      "DEEPGRAM_API_KEY is not set in your .env file. "
      "Please set DEEPGRAM_API_KEY in conversational-agent/.env to use --nomodal."
    )

  stt_model = os.getenv("DEEPGRAM_STT_MODEL", "nova-2")
  tts_model = os.getenv("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
  endpointing_ms = os.getenv("DEEPGRAM_ENDPOINTING_MS", "400")

  deps = await get_agent_deps()
  history = []
  safety_limits = UsageLimits(request_limit=20, output_tokens_limit=100000)

  pya = pyaudio.PyAudio()
  
  # 16kHz mono 16-bit PCM for Deepgram STT
  mic_stream = pya.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=16000,
    input=True,
    frames_per_buffer=1024,
  )

  # 24kHz mono 16-bit PCM for Deepgram Aura TTS
  speaker_stream = pya.open(
    format=pyaudio.paInt16,
    channels=1,
    rate=24000,
    output=True,
  )

  is_busy = False
  user_utterance_parts: list[str] = []
  utterance_queue: asyncio.Queue[str] = asyncio.Queue()

  print(f"\n🎙️ Voice Ready (Non-multimodal: Deepgram {stt_model} -> Marty -> {tts_model})!")
  print("Speak into your microphone. Say 'quit' or press Ctrl+C to stop.\n")

  dg_ws_url = (
    f"wss://api.deepgram.com/v1/listen"
    f"?encoding=linear16&sample_rate=16000&channels=1"
    f"&model={stt_model}&smart_format=true&endpointing={endpointing_ms}"
  )
  headers = {"Authorization": f"Token {api_key}"}

  async with httpx.AsyncClient(timeout=30) as http_client:
    async with websockets.connect(dg_ws_url, additional_headers=headers) as ws:
      
      async def send_mic() -> None:
        nonlocal is_busy
        while True:
          pcm_bytes = await asyncio.to_thread(mic_stream.read, 1024, False)
          if is_busy:
            # Send keep-alive instead of mic audio while agent is speaking to prevent self-hearing
            await ws.send(json.dumps({"type": "KeepAlive"}))
            await asyncio.sleep(0.05)
          else:
            await ws.send(pcm_bytes)

      async def receive_transcripts() -> None:
        nonlocal user_utterance_parts, is_busy
        async for raw_msg in ws:
          if is_busy:
            continue
          try:
            data = json.loads(raw_msg)
          except Exception:
            continue

          if data.get("type") == "Results":
            channel = data.get("channel", {})
            alternatives = channel.get("alternatives", [])
            if not alternatives:
              continue

            transcript = alternatives[0].get("transcript", "").strip()
            is_final = data.get("is_final", False)
            speech_final = data.get("speech_final", False)

            if transcript and is_final:
              user_utterance_parts.append(transcript)
              # Live progress indicator
              print(f"\r👂 [Listening]: {' '.join(user_utterance_parts)}", end="", flush=True)

            if speech_final and user_utterance_parts:
              complete_text = " ".join(user_utterance_parts).strip()
              user_utterance_parts = []
              print()  # Clear line
              if complete_text:
                await utterance_queue.put(complete_text)

      async def process_dialogue() -> None:
        nonlocal is_busy, history
        while True:
          user_text = await utterance_queue.get()
          is_busy = True
          print(f"\nYou: {user_text}")

          if user_text.lower().strip() in ("quit", "exit", "goodbye"):
            print("Marty: Goodbye! Have a great day.")
            await speak_tts("Goodbye! Have a great day.", http_client, api_key, tts_model, speaker_stream)
            sys.exit(0)

          try:
            print("Marty: thinking...")
            result = await advisor_agent.run(
              user_text,
              deps=deps,
              message_history=history,
              usage_limits=safety_limits,
            )
            clean_response = clean_for_speech(result.output)
            print(f"Marty: {clean_response}\n")
            history = result.all_messages()

            await speak_tts(clean_response, http_client, api_key, tts_model, speaker_stream)
          except Exception as exc:
            print(f"Error processing response: {exc}")
          finally:
            is_busy = False
            user_utterance_parts.clear()
            print("🎙️ Listening...")

      tasks = [
        asyncio.create_task(send_mic()),
        asyncio.create_task(receive_transcripts()),
        asyncio.create_task(process_dialogue()),
      ]

      try:
        await asyncio.gather(*tasks)
      except (asyncio.CancelledError, KeyboardInterrupt):
        pass
      finally:
        for t in tasks:
          t.cancel()
        mic_stream.stop_stream()
        mic_stream.close()
        speaker_stream.stop_stream()
        speaker_stream.close()
        pya.terminate()


async def speak_tts(
  text: str,
  client: httpx.AsyncClient,
  api_key: str,
  tts_model: str,
  speaker_stream: pyaudio.Stream,
) -> None:
  """Stream audio directly from Deepgram Aura TTS to speaker stream."""
  url = f"https://api.deepgram.com/v1/speak?model={tts_model}&encoding=linear16&sample_rate=24000&container=none"
  headers = {
    "Authorization": f"Token {api_key}",
    "Content-Type": "application/json",
  }

  try:
    async with client.stream("POST", url, headers=headers, json={"text": text}) as resp:
      resp.raise_for_status()
      async for chunk in resp.aiter_bytes(chunk_size=1024):
        await asyncio.to_thread(speaker_stream.write, chunk)
  except Exception as e:
    print(f"[TTS Error]: {e}")

