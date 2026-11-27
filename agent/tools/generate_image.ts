import { generateImage } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * Image generation through Vercel AI Gateway, using ByteDance Seedream 5.5.
 * The PNG is saved in the sandbox so it can be shared or used in documents.
 */
export default defineTool({
  description:
    "Generate an image from a text prompt with Seedream 5.5. Saves a PNG in the sandbox under /workspace/images and returns its path. Write prompts that describe the subject, style, lighting, and composition in concrete terms. Use this only when the owner asked for an image or it clearly helps the task.",
  inputSchema: z.object({
    prompt: z.string().trim().min(8).max(2000),
    filename: z
      .string()
      .regex(/^[a-z0-9-]{1,50}$/)
      .default("image")
      .describe("Short lowercase name for the file, without extension."),
  }),
  outputSchema: z.object({
    path: z.string(),
    mediaType: z.string(),
  }),
  async execute({ prompt, filename }, ctx) {
    const { image } = await generateImage({
      model: "bytedance/seedream-5.5",
      prompt,
    });

    const sandbox = await ctx.getSandbox();
    const path = `/workspace/images/${filename}-${Date.now()}.png`;
    await sandbox.writeBinaryFile({ path, content: image.uint8Array });

    return { path, mediaType: image.mediaType };
  },
});
