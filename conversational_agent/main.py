import asyncio
import pyaudio
from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext
from pydantic_ai.usage import UsageLimits

load_dotenv()

sql_worker_agent = Agent(
  'google:gemini-3.1-flash-lite',
  system_prompt=(
    "You are a fast database lookup worker. Map user terms to the closest database category "
    "(e.g., 'coffee' -> 'dining', 'uber' -> 'transportation', or 'all' for a full summary) "
    "and call `query_monthly_spend`. Return ONLY the exact numbers from the tool with no extra commentary."
  ),
)

@sql_worker_agent.tool_plain
def query_monthly_spend(category: str) -> str:
  """Look up current monthly spending for a category, or pass 'all' for a full summary."""
  mock_db = {
    "housing": "$1,850.00 (Rent: $1,700.00, Insurance: $150.00)",
    "utilities": "$215.40 (Electric: $110.20, Water: $45.20, Internet: $60.00)",
    "groceries": "$410.00 (Supermarkets: $365.00, Specialty: $45.00)",
    "dining": "$245.50 (Restaurants: $168.00, Coffee: $42.50, Takeout: $35.00)",
    "transportation": "$312.80 (Fuel: $140.00, Transit: $88.00, Rideshare: $84.80)",
    "subscriptions": "$64.99 (Streaming: $32.99, Cloud: $9.99, Apps: $22.01)",
    "entertainment": "$128.00 (Movies/Events: $85.00, Hobbies: $43.00)",
    "shopping": "$290.15 (Clothing: $115.00, Tech: $95.15, Home: $80.00)",
    "healthcare": "$145.00 (Pharmacy: $35.00, Dental: $60.00, Gym: $50.00)",
    "travel": "$450.00 (Flights: $300.00, Hotels: $150.00)",
    "savings": "$800.00 (Emergency Fund: $500.00, Roth IRA: $300.00)",
    "debt": "$350.00 (Student Loan: $250.00, Credit Card: $100.00)",
  }

  key = category.strip().lower()
  if key in ("all", "total", "summary"):
    return " | ".join(f"{k}: {v}" for k, v in mock_db.items())

  return mock_db.get(
    key,
    f"$0.00 (Not found. Try: {', '.join(mock_db.keys())})"
  )


advisor_agent = Agent(
  'google:gemini-3.1-flash-lite',
  system_prompt=(
    "Your name is Marty. Always introduce yourself as Marty if asked who you are. "
    "You are a friendly, down-to-earth personal financial advisor. "
    "Always call `lookup_spending` to get exact numbers before giving budget advice—never guess. "
    "Keep your answers brief, warm, and conversational so they sound natural spoken aloud."
  ),
)

@advisor_agent.tool
async def lookup_spending(ctx: RunContext[None], category: str) -> str:
  """Fetch monthly spending for a category (e.g., 'dining', 'groceries', 'housing', or 'all')."""
  result = await sql_worker_agent.run(
    f"Get spending for {category}",
    usage=ctx.usage,
  )
  return result.output


async def main():
  safety_limits = UsageLimits(request_limit=20, total_tokens_limit=8000)
  history = []

  print("💬 Financial Advisor Ready! (type 'quit' to stop)\n")
  while True:
    user_text = input("You: ")
    if user_text.strip().lower() in ("quit", "exit"):
      break

    result = await advisor_agent.run(
      user_text,
      message_history=history,
      usage_limits=safety_limits,
    )

    print(f"\nAdvisor: {result.output}\n")
    history = result.all_messages()


async def voice_main():
  pya = pyaudio.PyAudio()
  safety_limits = UsageLimits(request_limit=20, total_tokens_limit=8000)

  realtime_advisor = advisor_agent.realtime(
    'google:gemini-3.8-live',
    usage_limits=safety_limits,
    instructions=(
      "ROLEPLAY INSTRUCTION: Your name is Marty. "
      "If the user asks your name or who you are, you MUST say 'I'm Marty, your financial advisor.' "
      "NEVER say 'I don't have a name' or 'I am a large language model.' "
      "Always call `lookup_spending` for exact numbers before giving budget advice, and keep answers brief."
    )
  )

  async with realtime_advisor.session(handle_barge_in=True) as session:
    print("🎙️ Speak to Marty! (Ctrl+C to quit)")

    async def send_mic_audio():
      mic = pya.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=1024)
      while True:
        pcm_bytes = await asyncio.to_thread(mic.read, 1024, False)
        await session.send_audio(pcm_bytes)

    async def play_agent_voice():
      speaker = pya.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)
      async for audio_chunk in session.stream_audio():
        await asyncio.to_thread(speaker.write, audio_chunk)

    async def print_live_transcripts():
      async for part in session.stream_transcripts():
        print(f"[{part.speaker}]: {part.transcript}")

    await asyncio.gather(send_mic_audio(), play_agent_voice(), print_live_transcripts())

if __name__ == "__main__":
  asyncio.run(voice_main())
