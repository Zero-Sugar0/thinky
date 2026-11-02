import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.context7.com/mcp/oauth",
  description: "Context7 documentation lookup tools for the authenticated user.",
  auth: connect({
    connector: "context7-mcp/thinky",
    validate: true,
  }),
});
