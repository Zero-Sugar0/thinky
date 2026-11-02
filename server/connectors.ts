import type { ConnectorDef } from "#shared/types/connector";
// import { connectGithubScopesForPreset } from "@github-tools/sdk/connect";
// import { GITHUB_CONNECTOR, GITHUB_PRESET } from "#shared/connect";
// import { fetchLinearIssuesViaMcp } from "~~/server/utils/linear-mcp";
import { listMcpTools } from "~~/server/utils/mcp-tools";

const ZOMATO_MCP_URL = "https://mcp-server.zomato.com/mcp";
const AGENTCARD_MCP_URL = "https://mcp.agentcard.sh/mcp";
const AGENTPHONE_MCP_URL = "https://mcp.agentphone.ai/mcp";
const OXARCHIVE_MCP_URL = "https://mcp.0xarchive.io/mcp";
const CONTEXT7_MCP_URL = "https://mcp.context7.com/mcp/oauth";
const ZOMATO_SCOPES = ["mcp:tools", "mcp:resources", "mcp:prompts"];

export const connectors: ConnectorDef[] = [
  /*
  {
    id: "github",
    name: "GitHub",
    description: "Repositories, issues, pull requests, and CI workflows.",
    connector: GITHUB_CONNECTOR,
    connectionName: "github",
    icon: "i-simple-icons-github",
    scopes: connectGithubScopesForPreset(GITHUB_PRESET),
    test: {
      label: "List reachable repositories",
      run: async (token) => {
        // A page of five reads as "these are the only repositories you have".
        // Ask for a full page so the count reflects what the grant can actually
        // reach — a repository missing from it needs adding to the GitHub App's
        // repository selection, which is a GitHub-side grant, not a scope.
        const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=full_name", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "thinky",
          },
        });

        if (!res.ok) {
          throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
        }

        const repos = await res.json() as Array<{ full_name: string }>;
        if (repos.length === 0) {
          throw new Error("The connection works, but its GitHub App installation can reach no repositories. Add them to the installation's repository access.");
        }

        const shown = repos.slice(0, 10).map(repo => repo.full_name);
        return repos.length > shown.length
          ? [...shown, `…and ${repos.length - shown.length} more reachable`]
          : shown;
      },
    },
  },
  */
  /*
  {
    id: "linear",
    name: "Linear",
    description: "Issues, projects, cycles, and comments in your Linear workspace.",
    connector: "mcp.linear.app/linear",
    connectionName: "linear",
    icon: "i-simple-icons-linear",
    scopes: [],
    test: {
      label: "List my issues",
      run: token => fetchLinearIssuesViaMcp(token),
    },
  },
  */
  {
    id: "zomato",
    name: "Zomato",
    description: "Restaurant discovery and ordering through Zomato.",
    connector: "zomato/thinky",
    connectionName: "zomato",
    icon: "i-lucide-utensils",
    scopes: ZOMATO_SCOPES,
    test: {
      label: "List available tools",
      run: token => listMcpTools(ZOMATO_MCP_URL, token),
    },
  },
  {
    id: "agentcard",
    name: "AgentCard",
    description: "AgentCard tools, resources, and prompts.",
    connector: "agentcard/thinky",
    connectionName: "agentcard",
    icon: "i-lucide-id-card",
    scopes: [],
    test: {
      label: "List available tools",
      run: token => listMcpTools(AGENTCARD_MCP_URL, token),
    },
  },
  {
    id: "agentphone",
    name: "Agentphone",
    description: "Agentphone tools for calls and phone-based workflows.",
    connector: "agentphone/thinky",
    connectionName: "agentphone",
    icon: "i-lucide-phone-call",
    scopes: [],
    test: {
      label: "List available tools",
      run: token => listMcpTools(AGENTPHONE_MCP_URL, token),
    },
  },
  {
    id: "oxarchive",
    name: "0xArchive",
    description: "Search and work with your authenticated 0xArchive data.",
    connector: "0xarchive/thinky",
    connectionName: "oxarchive",
    icon: "i-lucide-archive",
    scopes: [],
    test: {
      label: "List available tools",
      run: token => listMcpTools(OXARCHIVE_MCP_URL, token),
    },
  },
  {
    id: "context7-mcp",
    name: "Context7",
    description: "Current library documentation and implementation guidance.",
    connector: "context7-mcp/thinky",
    connectionName: "context7-mcp",
    icon: "i-lucide-book-open",
    scopes: [],
    test: {
      label: "List available tools",
      run: token => listMcpTools(CONTEXT7_MCP_URL, token),
    },
  },
];

export function getConnector(id: string): ConnectorDef {
  const connector = connectors.find((entry) => entry.id === id);

  if (!connector) {
    throw createError({
      statusCode: 404,
      statusMessage: "Connector not found",
    });
  }

  return connector;
}
