import re

def clean_for_speech(text: str) -> str:
  """Clean markdown artifacts, asterisks, bullet points, and code markers so text sounds natural when read aloud."""
  if not text:
    return ""

  # Remove code block fences
  text = re.sub(r"```[\w]*\n?", "", text)
  # Remove inline code backticks `code` -> code
  text = re.sub(r"`([^`]+)`", r"\1", text)
  # Remove bold/italic markdown: **bold** or *italic*
  text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
  text = re.sub(r"\*([^*]+)\*", r"\1", text)
  text = re.sub(r"__([^_]+)__", r"\1", text)
  text = re.sub(r"_([^_]+)_", r"\1", text)
  # Remove markdown headings (# Heading)
  text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
  # Remove leading bullets (- item, * item, + item)
  text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
  # Remove remaining stray asterisks, hashes, backticks, tildes
  for char in ("*", "#", "`", "_", "~"):
    text = text.replace(char, "")

  # Normalize excessive whitespace but preserve single linebreaks
  lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
  return "\n".join(line for line in lines if line)

if __name__ == "__main__":
  sample = "**Hello**! Here is your summary:\n- You spent **$45.20** on *Food & Dining*.\n- #1 priority: `rent`."
  print("ORIGINAL:\n" + sample)
  print("\nCLEANED:\n" + clean_for_speech(sample))

