import argparse
import asyncio


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Run the LedgerAI conversational agent.")
  parser.add_argument(
    "--voice",
    action="store_true",
    help="Use the realtime voice interface instead of the text interface.",
  )
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  if args.voice:
    from conversational_agent.voice import run_voice

    asyncio.run(run_voice())
  else:
    from conversational_agent.cli import run_text

    asyncio.run(run_text())


if __name__ == "__main__":
  main()
