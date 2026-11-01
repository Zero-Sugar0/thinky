import { Composio } from "@composio/core";

let composioInstance: Composio | null = null;

export function getComposioClient(): Composio | null {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!composioInstance) {
    composioInstance = new Composio({ apiKey });
  }
  return composioInstance;
}

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export interface ComposioAppSummary {
  slug: string;
  name: string;
  description: string;
  logo?: string;
  icon?: string;
  categories: string[];
  isConnected: boolean;
  connectedAccountId?: string;
}

// Icon mappings using @iconify-json/simple-icons for crisp, consistent branding
export const COMPOSIO_APP_ICONS: Record<string, string> = {
  gmail: "i-simple-icons-gmail",
  googlecalendar: "i-simple-icons-googlecalendar",
  slack: "i-simple-icons-slack",
  github: "i-simple-icons-github",
  notion: "i-simple-icons-notion",
  linear: "i-simple-icons-linear",
  jira: "i-simple-icons-jira",
  trello: "i-simple-icons-trello",
  asana: "i-simple-icons-asana",
  discord: "i-simple-icons-discord",
  twitter: "i-simple-icons-x",
  spotify: "i-simple-icons-spotify",
  zoom: "i-simple-icons-zoom",
  airtable: "i-simple-icons-airtable",
  hubspot: "i-simple-icons-hubspot",
  clickup: "i-simple-icons-clickup",
  google_sheets: "i-simple-icons-googlesheets",
  google_docs: "i-simple-icons-googledocs",
};
