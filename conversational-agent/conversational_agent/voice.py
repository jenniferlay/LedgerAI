import asyncio
import os

import pyaudio
from pydantic_ai.realtime import infer_realtime_model
from pydantic_ai.usage import UsageLimits

from conversational_agent.agent import advisor_agent, financial_context, get_agent_deps


async def run_voice() -> None:
  pya = pyaudio.PyAudio()
  safety_limits = UsageLimits(request_limit=20, total_tokens_limit=8000)
  deps = await get_agent_deps()

  model_name = os.getenv("REALTIME_MODEL")
  if not model_name:
    raise ValueError(
      "REALTIME_MODEL is not set in your .env file. "
      "Please set REALTIME_MODEL in conversational-agent/.env "
      "(e.g. REALTIME_MODEL=google:gemini-3.8-live or REALTIME_MODEL=openai:gpt-4o-mini-realtime-preview)."
    )
  realtime_model = infer_realtime_model(model_name)
  in_sample_rate = realtime_model.profile.get("audio_input_sample_rate", 16000)
  out_sample_rate = realtime_model.profile.get("audio_output_sample_rate", 24000)

  realtime_advisor = advisor_agent.realtime(
    model_name,
    deps=deps,
    usage_limits=safety_limits,
    instructions=(
      "ROLEPLAY INSTRUCTION: Your name is Marty. "
      "If the user asks your name or who you are, you MUST say 'I'm Marty, your financial advisor.' "
      "NEVER say 'I don't have a name' or 'I am a large language model.' "
      "Use `lookup_spending` to fetch actual expenses before discussing spending. Never invent data. "
      "Always speak in plain conversational text. Never use Markdown formatting like asterisks (** or *), hashes (#), or bullets. "
      f"Keep answers brief.\n{financial_context(deps.categories)}"
    ),
  )

  async with realtime_advisor.session(handle_barge_in=True) as session:
    print(f"🎙️ Speak to Marty ({model_name})! (Ctrl+C to quit)")

    async def send_mic_audio() -> None:
      mic = pya.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=in_sample_rate,
        input=True,
        frames_per_buffer=1024,
      )
      while True:
        pcm_bytes = await asyncio.to_thread(mic.read, 1024, False)
        await session.send_audio(pcm_bytes)

    async def play_agent_voice() -> None:
      speaker = pya.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=out_sample_rate,
        output=True,
      )
      async for audio_chunk in session.stream_audio():
        await asyncio.to_thread(speaker.write, audio_chunk)

    async def print_live_transcripts() -> None:
      async for part in session.stream_transcripts():
        print(f"[{part.speaker}]: {part.transcript}")

    await asyncio.gather(send_mic_audio(), play_agent_voice(), print_live_transcripts())
  pya.terminate()
