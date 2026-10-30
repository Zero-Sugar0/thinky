import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp-server.zomato.com/mcp",
  description: "Zomato MCP tools for the authenticated user's account.",
  auth: connect({
    connector: "zomato/thinky",
    tokenParams: {
      scopes: ["mcp:tools", "mcp:resources", "mcp:prompts"],
    },
    validate: true,
  }),
});