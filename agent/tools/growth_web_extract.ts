import { defineTool } from "eve/tools";
import { z } from "zod";
import { callGrowthTool } from "../lib/growth-engine.js";

export default defineTool({
  description:
    "Direct 1-shot tool to scrape and extract clean markdown content, text, and metadata from any public web page without browser rendering.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL of the webpage to extract content from."),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    markdown: z.string().optional(),
    description: z.string().optional(),
    servedBy: z.string().optional(),
    costUsd: z.number().optional(),
    raw: z.unknown().optional(),
    error: z.string().optional(),
  }),
  async execute({ url }, ctx) {
    try {
      const customerId = ctx.session?.auth?.current?.principalId;

      const result = await callGrowthTool({
        toolId: "treg.web.extract",
        method: "POST",
        data: { url },
        customerId,
        signal: ctx.abortSignal,
      });

      if (!result.success) {
        return {
          success: false,
          url,
          costUsd: result.costUsd,
          servedBy: result.servedBy,
          error: result.error,
        };
      }

      let title: string | undefined;
      let content: string | undefined;
      let markdown: string | undefined;
      let description: string | undefined;

      if (result.data && typeof result.data === "object") {
        const body = result.data as Record<string, unknown>;
        const output = (body.output || body) as Record<string, unknown>;

        title = (output.title || body.title) as string | undefined;
        markdown = (output.markdown || output.md || body.markdown) as string | undefined;
        content = (output.content || output.text || body.content || markdown) as string | undefined;
        description = (output.description || body.description) as string | undefined;
      }

      return {
        success: true,
        url,
        title,
        content,
        markdown,
        description,
        servedBy: result.servedBy,
        costUsd: result.costUsd,
        raw: result.data,
      };
    } catch (error) {
      if (ctx.abortSignal.aborted) throw error;
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : "Failed to extract web content",
      };
    }
  },
});
