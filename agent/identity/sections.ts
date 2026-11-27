// Pure helpers for reading sections of INSTRUCTIONS.md. Kept free of bundler imports
// so they can be unit tested directly.

export function listInstructionSections(content: string): string[] {
  return content
    .split("\n")
    .filter(line => line.startsWith("## "))
    .map(line => line.slice(3).trim());
}

/** Returns one named "## section" with its body, or null when it does not exist. */
export function getInstructionSection(content: string, name: string): string | null {
  const lines = content.split("\n");
  const start = lines.findIndex(line => line.trim() === `## ${name}`);
  if (start === -1) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}
