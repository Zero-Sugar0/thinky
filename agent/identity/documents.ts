import soul from "./SOUL.md?raw";
import instructions from "./INSTRUCTIONS.md?raw";
import { getInstructionSection, listInstructionSections } from "./sections.js";

export const identityDocuments = {
  soul,
  instructions,
} as const;

export type IdentityDocument = keyof typeof identityDocuments;

export function instructionSection(name: string): string | null {
  return getInstructionSection(instructions, name);
}

export function instructionSectionNames(): string[] {
  return listInstructionSections(instructions);
}
