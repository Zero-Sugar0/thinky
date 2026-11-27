export type AgentTaskStatus = "open" | "done" | "cancelled";
export type AgentTaskSource = "chat" | "meeting" | "proactive" | "slack" | "telegram" | "photon";

export interface AgentTask {
  id: string;
  title: string;
  notes: string;
  status: AgentTaskStatus;
  source: AgentTaskSource;
  dueAt: number | null;
  notifyAt: number | null;
  notifiedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AgentActionLogEntry {
  id: string;
  toolSlug: string;
  toolkit: string | null;
  status: string;
  summary: string;
  externalLogId: string | null;
  createdAt: number;
}
