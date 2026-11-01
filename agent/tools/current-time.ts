import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Get the current date and time, optionally in an IANA timezone",
  inputSchema: z.object({
    timezone: z.string().default("UTC").describe("IANA timezone such as UTC or America/New_York"),
  }),
  outputSchema: z.object({
    timezone: z.string(),
    iso: z.string(),
    formatted: z.string(),
  }),
  async execute({ timezone }) {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: timezone,
    }).format(now);

    return { timezone, iso: now.toISOString(), formatted };
  },
});
