import argparse
import asyncio


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Run the LedgerAI conversational agent.")
  parser.add_argument(
    "--server",
    action="store_true",
    help="Run the HTTP microservice server (default: port 8001).",
  )
  parser.add_argument(
    "--port",
    type=int,
    default=8001,
    help="Port for the HTTP microservice server (default: 8001).",
  )
  parser.add_argument(
    "--voice",
    action="store_true",
    help="Use the voice interface instead of the text interface.",
  )
  parser.add_argument(
    "--nomodal",
    action="store_true",
    help="Use the non-multimodal voice pipeline (Deepgram STT -> Marty Agent -> Deepgram TTS).",
  )
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  if args.server:
    import uvicorn

    uvicorn.run("conversational_agent.server:app", host="0.0.0.0", port=args.port, reload=True)
  elif args.nomodal:
    from conversational_agent.nomodal_voice import run_nomodal_voice

    asyncio.run(run_nomodal_voice())
  elif args.voice:
    from conversational_agent.voice import run_voice

    asyncio.run(run_voice())
  else:
    from conversational_agent.cli import run_text

    asyncio.run(run_text())


if __name__ == "__main__":
  main()
