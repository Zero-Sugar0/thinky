import type { AgentActionLogEntry, AgentTask, AgentTaskSource, AgentTaskStatus } from "../../shared/types/tasks.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

async function callInternal<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${appOrigin()}${path}`, {
    ...init,
    headers: { ...internalHeaders(), ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({})) as T & { statusMessage?: string; message?: string };
  if (!response.ok) {
    throw new Error(body.statusMessage ?? body.message ?? `Internal API returned ${response.status}`);
  }
  return body;
}

export async function listTasks(userId: string, status: AgentTaskStatus | "all", limit = 50) {
  const params = new URLSearchParams({ userId, status, limit: String(limit) });
  const { tasks } = await callInternal<{ tasks: AgentTask[] }>(`/api/internal/tasks?${params}`, { method: "GET" });
  return tasks;
}

export async function createTask(input: {
  userId: string;
  title: string;
  notes?: string;
  dueAt?: string | null;
  source: AgentTaskSource;
}) {
  const { task } = await callInternal<{ task: AgentTask }>("/api/internal/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return task;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: { title?: string; notes?: string; dueAt?: string | null; status?: "open" | "done" | "cancelled" },
) {
  const { task } = await callInternal<{ task: AgentTask }>(`/api/internal/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ userId, ...patch }),
  });
  return task;
}

export async function recordAction(input: {
  userId: string;
  toolSlug: string;
  toolkit?: string | null;
  status: string;
  summary: string;
  externalLogId?: string | null;
}) {
  await callInternal<{ ok: boolean }>("/api/internal/action-log", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listActions(userId: string, limit = 50) {
  const params = new URLSearchParams({ userId, limit: String(limit) });
  const { actions } = await callInternal<{ actions: AgentActionLogEntry[] }>(`/api/internal/action-log?${params}`, { method: "GET" });
  return actions;
}
