import { createMCPClient } from "@ai-sdk/mcp";

export async function listMcpTools(url: string, token: string): Promise<string[]> {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url,
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  try {
    const { tools } = await client.listTools();
    if (tools.length === 0) {
      throw new Error("MCP server exposed no tools");
    }

    return tools.slice(0, 5).map(tool => tool.name);
  }
  finally {
    await client.close().catch(() => undefined);
  }
}