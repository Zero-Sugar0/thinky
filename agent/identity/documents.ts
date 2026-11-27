import soul from "./SOUL.md?raw";
import instructions from "./INSTRUCTIONS.md?raw";
import company from "./COMPANY.md?raw";
import business from "./BUSINESS.md?raw";
import personal from "./PERSONAL.md?raw";
import { getInstructionSection, listInstructionSections } from "./sections.js";

export const identityDocuments = {
  soul,
  instructions,
  company,
  business,
  personal,
} as const;

export type IdentityDocument = keyof typeof identityDocuments;

/** Company and business context for meeting voice agents. PERSONAL.md is excluded on purpose. */
export function meetingBriefing(): string {
  return `${company.trim()}\n\n${business.trim()}`;
}

export function instructionSection(name: string): string | null {
  return getInstructionSection(instructions, name);
}

export function instructionSectionNames(): string[] {
  return listInstructionSections(instructions);
}
