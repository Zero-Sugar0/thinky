import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.agentcard.sh/mcp",
  description: "AgentCard MCP tools, resources, and prompts for the authenticated user.",
  auth: connect({
    connector: "agentcard/thinky",
    validate: true,
  }),
});