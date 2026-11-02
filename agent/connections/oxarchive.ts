import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.0xarchive.io/mcp",
  description: "0xArchive MCP tools for the authenticated user.",
  auth: connect({
    connector: "0xarchive/thinky",
    validate: true,
  }),
});
