import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.agentphone.ai/mcp",
  description: "Agentphone MCP tools for the authenticated user.",
  auth: connect({
    connector: "agentphone/thinky",
    validate: true,
  }),
});
