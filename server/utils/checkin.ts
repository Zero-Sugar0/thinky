import { inArray, gt, and, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { listTasksForUser } from "~~/server/utils/tasks";
import { listRecentToolkits } from "~~/server/utils/signals";
import { CHECKIN_CATEGORIES, type CheckinCategory, type CheckinSignals } from "~~/server/utils/checkin-policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface CheckinFacts {
  name: string;
  bio: string;
  memories: string[];
  overdueTitles: string[];
  dueSoonTitles: string[];
  openTitles: string[];
  toolkits: string[];
}

export function localHourIn(timezone: string, now = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" })
      .formatToParts(now)
      .find(part => part.type === "hour")?.value;
    return hour !== undefined ? Number(hour) : now.getUTCHours();
  }
  catch {
    return now.getUTCHours();
  }
}

/** Everything the check-in policy and the wording need, gathered once per user. */
export async function gatherCheckin(input: {
  userId: string;
  timezone: string;
  name: string;
  bio: string;
  memories: string[];
}): Promise<{ signals: CheckinSignals; facts: CheckinFacts }> {
  const now = Date.now();
  const tasks = await listTasksForUser(input.userId, "open", 50);

  const overdue = tasks.filter(t => t.dueAt !== null && t.dueAt < now);
  const dueSoon = tasks.filter(t => t.dueAt !== null && t.dueAt >= now && t.dueAt - now < DAY_MS);
  const stale = tasks.filter(t => now - t.updatedAt > 3 * DAY_MS);

  const toolkits = await listRecentToolkits(input.userId, 12);
  const recentActivity = toolkits.length;

  const since = new Date(now - DAY_MS);
  const rows = await db.select({ kind: schema.agentNotifications.kind, createdAt: schema.agentNotifications.createdAt })
    .from(schema.agentNotifications)
    .where(and(
      eq(schema.agentNotifications.userId, input.userId),
      gt(schema.agentNotifications.createdAt, since),
      inArray(schema.agentNotifications.kind, [...CHECKIN_CATEGORIES]),
    ));

  const recentCheckins = rows
    .map(row => ({
      category: row.kind as CheckinCategory,
      hoursAgo: (now - row.createdAt.getTime()) / HOUR_MS,
    }))
    .filter(c => c.hoursAgo >= 0 && c.hoursAgo <= 24);

  return {
    signals: {
      localHour: localHourIn(input.timezone),
      openTasks: tasks.length,
      overdueTasks: overdue.length,
      dueSoonTasks: dueSoon.length,
      staleTasks: stale.length,
      recentActivity,
      hasMemories: input.memories.length > 0,
      recentCheckins,
    },
    facts: {
      name: input.name,
      bio: input.bio,
      memories: input.memories.slice(0, 20),
      overdueTitles: overdue.map(t => t.title).slice(0, 5),
      dueSoonTitles: dueSoon.map(t => t.title).slice(0, 5),
      openTitles: tasks.map(t => t.title).slice(0, 5),
      toolkits: toolkits.slice(0, 5),
    },
  };
}

const CATEGORY_GUIDE: Record<CheckinCategory, string> = {
  important: "Point out the overdue or due-soon task by name and offer to reschedule it or mark it done.",
  undone_task: "Gently ask about the open task by name and offer to help take the next step.",
  follow_up: "Mention the recent activity from the connected apps and offer to check whether anything needs a reply.",
  conversation: "Start a warm, low-pressure conversation. If a memory is relevant, refer to it naturally. Ask one open question.",
  update: "Give a brief status update: how many open tasks there are and any recent activity. Offer a fuller rundown.",
};

function greeting(name: string): string {
  return name ? `Hey ${name}` : "Hey";
}

/** Plain-text wording for every category. Used when no model is configured or the model call fails. */
export function templateCheckin(category: CheckinCategory, facts: CheckinFacts): string {
  const hi = greeting(facts.name);
  const toolkitList = facts.toolkits.length > 0 ? facts.toolkits.join(", ") : "your connected apps";

  switch (category) {
    case "important": {
      const title = facts.overdueTitles[0] ?? facts.dueSoonTitles[0] ?? "a task";
      const verb = facts.overdueTitles.length > 0 ? "is past its due time" : "is due within a day";
      return `${hi}, "${title}" ${verb}. Want to reschedule it or mark it done?`;
    }
    case "undone_task": {
      const count = facts.openTitles.length;
      return `${hi}, you still have ${count} open ${count === 1 ? "task" : "tasks"}, starting with "${facts.openTitles[0]}". Want to tackle that now or move it?`;
    }
    case "follow_up":
      return `${hi}, there's new activity in ${toolkitList} since we last talked. Want me to check whether anything needs a reply?`;
    case "conversation": {
      const memory = facts.memories[0];
      return memory
        ? `${hi}, how's things going with ${memory.replace(/\.$/, "")}? Anything you want to think through today?`
        : `${hi}, how's your day going so far?`;
    }
    case "update": {
      const count = facts.openTitles.length;
      const activity = facts.toolkits.length > 0 ? ` and new activity in ${toolkitList}` : "";
      return `${hi}, quick update: ${count} open ${count === 1 ? "task" : "tasks"}${activity}. Want a fuller rundown?`;
    }
  }
}

/** Writes the check-in in the assistant's voice, grounded only in the facts provided. */
export async function composeCheckin(category: CheckinCategory, facts: CheckinFacts): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateCheckin(category, facts);

  const prompt = [
    "You are Thinky, a thoughtful personal assistant sending one proactive check-in message.",
    `Category: ${category}. ${CATEGORY_GUIDE[category]}`,
    `Name: ${facts.name || "unknown"}. Bio: ${facts.bio || "none"}.`,
    `Memories: ${facts.memories.join(" | ") || "none"}.`,
    `Overdue tasks: ${facts.overdueTitles.join(" | ") || "none"}.`,
    `Due within a day: ${facts.dueSoonTitles.join(" | ") || "none"}.`,
    `Open tasks: ${facts.openTitles.join(" | ") || "none"}.`,
    `Recent activity from connected apps: ${facts.toolkits.join(", ") || "none"} (no content available).`,
    "Rules: one or two sentences. Use only the facts above, never invent details. No greeting beyond the name. Plain text only.",
  ].join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return templateCheckin(category, facts);

    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find(block => block.type === "text")?.text?.trim() ?? "";
    return text.length > 0 && text.length <= 500 ? text : templateCheckin(category, facts);
  }
  catch {
    return templateCheckin(category, facts);
  }
}


