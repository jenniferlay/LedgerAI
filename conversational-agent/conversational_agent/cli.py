from pydantic_ai.usage import UsageLimits

from conversational_agent.agent import advisor_agent, get_agent_deps


async def run_text() -> None:
  safety_limits = UsageLimits(request_limit=20, total_tokens_limit=8000)
  history = []
  deps = await get_agent_deps()

  print("💬 Financial Advisor Ready! (type 'quit' to stop)\n")
  while True:
    user_text = input("You: ")
    if user_text.strip().lower() in ("quit", "exit"):
      break

    result = await advisor_agent.run(
      user_text,
      deps=deps,
      message_history=history,
      usage_limits=safety_limits,
    )

    print(f"\nAdvisor: {result.output}\n")
    history = result.all_messages()
