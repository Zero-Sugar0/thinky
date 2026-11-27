import { defineTool } from "eve/tools";
import { z } from "zod";
import { identityDocuments, instructionSection, instructionSectionNames } from "../identity/documents.js";

export default defineTool({
  description:
    "Read your own identity or operating playbook. Use document 'soul' for your identity and character, or document 'instructions' with a section name for a specific procedure (e.g. meetings, growth, composio, tasks, actions). Read the relevant section before a task that depends on it.",
  inputSchema: z.object({
    document: z.enum(["soul", "instructions"]),
    section: z.string().max(64).optional().describe("Section name when document is 'instructions'"),
  }),
  outputSchema: z.object({
    content: z.string(),
    availableSections: z.array(z.string()).optional(),
  }),
  async execute({ document, section }) {
    if (document === "soul") {
      return { content: identityDocuments.soul };
    }
    const names = instructionSectionNames();
    if (!section) {
      return { content: "Pass a section name.", availableSections: names };
    }
    const content = instructionSection(section);
    if (!content) {
      return { content: `No section named '${section}'.`, availableSections: names };
    }
    return { content, availableSections: names };
  },
});
