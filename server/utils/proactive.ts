import { and, desc, eq, gt } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { callSlackApi } from "eve/channels/slack";
import type { ProactiveChannel } from "#shared/types/profile";
import { getSlackLinkForAppUser } from "~~/server/utils/slack-links";
import { listThreadsForUser } from "~~/server/utils/threads";

export interface ProactiveSuggestionCandidate {
  type: "deadline" | "todo" | "client_followup" | "undone_task" | "reminder";
  content: string;
}

/**
 * Checks when the user was last sent a proactive suggestion
 * to avoid spamming them multiple times in a short interval.
 */
export async function getLastProactiveSuggestionForUser(userId: string) {
  const [row] = await db.select()
    .from(schema.proactiveSuggestions)
    .where(eq(schema.proactiveSuggestions.userId, userId))
    .orderBy(desc(schema.proactiveSuggestions.createdAt))
    .limit(1);

  return row ?? null;
}

/**
 * Records a proactive suggestion in the database.
 */
export async function recordProactiveSuggestion(input: {
  userId: string;
  threadId?: string | null;
  channel: ProactiveChannel | string;
  content: string;
  type: string;
}) {
  const id = crypto.randomUUID();
  await db.insert(schema.proactiveSuggestions).values({
    id,
    userId: input.userId,
    threadId: input.threadId ?? null,
    channel: input.channel,
    content: input.content,
    type: input.type,
  });

  return id;
}

/**
 * Gets suggestions for a thread to display in the chat UI.
 */
export async function getRecentProactiveSuggestionsForThread(threadId: string) {
  return db.select()
    .from(schema.proactiveSuggestions)
    .where(eq(schema.proactiveSuggestions.threadId, threadId))
    .orderBy(desc(schema.proactiveSuggestions.createdAt))
    .limit(10);
}

/**
 * Gets recent proactive suggestions for a user (within last 24h).
 */
export async function getRecentProactiveSuggestionsForUser(userId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db.select()
    .from(schema.proactiveSuggestions)
    .where(and(
      eq(schema.proactiveSuggestions.userId, userId),
      gt(schema.proactiveSuggestions.createdAt, oneDayAgo),
    ))
    .orderBy(desc(schema.proactiveSuggestions.createdAt));
}

/**
 * Analyzes the user's profile, timezone, bio, memories, and thread context
 * to generate a proactive suggestion using an LLM when available, falling back
 * gracefully to heuristic evaluation.
 */
export async function analyzeUserContextForProactiveSuggestion(params: {
  userId: string;
  userName?: string;
  timezone?: string;
  bio?: string;
  recentSuggestions: Array<{ type: string; content: string; createdAt: Date }>;
  memories?: string[];
  recentChatSummary?: string;
}): Promise<ProactiveSuggestionCandidate | null> {
  const tz = params.timezone || "UTC";
  let currentHour: number;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    currentHour = parseInt(formatter.format(new Date()), 10);
  }
  catch {
    currentHour = new Date().getUTCHours();
  }

  const name = params.userName ? params.userName.split(" ")[0] : "";
  const greetingPrefix = name ? `Hey ${name}` : "Hey";

  // Try AI-driven synthesis if an LLM API endpoint or key is available
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const prompt = `You are Thinky, a thoughtful and proactive personal AI assistant.
User: ${name || "User"}
Timezone: ${tz} (Current local hour: ${currentHour}:00)
User bio / context: ${params.bio || "None"}
Stored user memories, tasks, commitments & dealings:
${params.memories && params.memories.length > 0 ? params.memories.map(m => `- ${m}`).join("\n") : "None recorded yet."}
Recent conversation topics / active threads:
${params.recentChatSummary || "None."}
Suggestions already sent recently:
${params.recentSuggestions.map(s => `- [${s.type}] ${s.content}`).join("\n") || "None"}

Your job:
Proactively inspect the stored memories and chat history to identify 1-3 pending todos, upcoming deadlines, client dealings, or unfinished tasks.
Formulate a very brief, helpful check-in that asks if you should handle them, or if the user would like to take care of them:
- "Hey, I noticed [task/deadline/client dealing]. Would you like me to handle this, or would you prefer to take care of it?"
- Keep it brief, actionable, and direct (1-2 short sentences).
- If no pending items exist and no follow-up is needed, respond with "NONE".

If you decide to suggest something, respond ONLY with a raw JSON object (no markdown, no extra words):
{"type": "deadline"|"todo"|"client_followup"|"undone_task"|"reminder", "content": "..."}`;

    try {
      // Use Vercel AI SDK when available or direct API call
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 250,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json() as { content?: Array<{ type: string; text: string }> };
        const rawText = data.content?.[0]?.text?.trim() || "";
        if (rawText && rawText.toUpperCase() !== "NONE") {
          const parsed = JSON.parse(rawText.replace(/^```json/, "").replace(/```$/, "").trim());
          if (parsed.content && parsed.type) {
            return parsed as ProactiveSuggestionCandidate;
          }
        }
      }
    }
    catch {
      // Fallback to heuristic analysis below if LLM request fails
    }
  }

  // Inspect stored memories for tasks, deadlines, dealings, or client follow-ups
  const memories = params.memories || [];
  const taskKeywords = /todo|task|deadline|client|project|send|call|email|review|follow\s*up|due|finish|deliver/i;
  const pendingMemoryItems = memories.filter(m => taskKeywords.test(m));

  if (pendingMemoryItems.length > 0) {
    const selected = pendingMemoryItems[0];
    if (selected) {
      const hasSentForThis = params.recentSuggestions.some(
        s => (Date.now() - new Date(s.createdAt).getTime()) < 8 * 60 * 60 * 1000
          && s.content.toLowerCase().includes(selected.slice(0, 15).toLowerCase()),
      );

      if (!hasSentForThis) {
        return {
          type: "todo",
          content: `${greetingPrefix}, I noticed from your notes: "${selected}". Would you like me to handle this, or would you like to take care of it?`,
        };
      }
    }
  }

  // Check recent chat context for projects / client dealings
  const chatContext = params.recentChatSummary || "";
  const bio = params.bio || "";
  const combinedContext = `${bio} ${chatContext}`;
  const mentionsClientOrProject = /client|project|launch|feature|customer|partner/i.test(combinedContext);

  const hasSentClientFollowupToday = params.recentSuggestions.some(
    s => (s.type === "client_followup" || s.type === "deadline")
      && (Date.now() - new Date(s.createdAt).getTime()) < 8 * 60 * 60 * 1000,
  );

  if (!hasSentClientFollowupToday && mentionsClientOrProject && currentHour >= 9 && currentHour <= 18) {
    return {
      type: "client_followup",
      content: `${greetingPrefix}, checking on your open project dealings. Shall I prepare updates and follow up with the client for you, or do you have this covered?`,
    };
  }

  // Undone task / focus reminder
  const hasSentTaskReminder = params.recentSuggestions.some(
    s => s.type === "undone_task" && (Date.now() - new Date(s.createdAt).getTime()) < 6 * 60 * 60 * 1000,
  );

  if (!hasSentTaskReminder && currentHour >= 9 && currentHour <= 18) {
    return {
      type: "undone_task",
      content: `${greetingPrefix}, checking your active priorities for today. Are there pending tasks or deadlines you'd like me to assist with?`,
    };
  }

  return null;
}

/**
 * Dispatches a suggestion to the specified channels.
 */
export async function dispatchProactiveSuggestion(input: {
  userId: string;
  candidate: ProactiveSuggestionCandidate;
  channelPref: ProactiveChannel;
  threadId?: string;
}) {
  const { userId, candidate, channelPref, threadId } = input;
  const dispatchedTo: string[] = [];

  // Determine latest thread if not provided
  let targetThreadId = threadId;
  if (!targetThreadId) {
    const userThreads = await listThreadsForUser(userId);
    targetThreadId = userThreads[0]?.id;
  }

  // 1. Web chat delivery
  if (channelPref === "chat" || channelPref === "all") {
    await recordProactiveSuggestion({
      userId,
      threadId: targetThreadId ?? null,
      channel: "chat",
      content: candidate.content,
      type: candidate.type,
    });
    dispatchedTo.push("chat");
  }

  // 2. Slack delivery
  if (channelPref === "slack" || channelPref === "all") {
    const slackLink = await getSlackLinkForAppUser(userId);
    if (slackLink && slackLink.slackUserId) {
      let postedToSlack = false;
      try {
        // Post direct message to user via Slack API
        const response = await callSlackApi({
          botToken: undefined, // uses SLACK_BOT_TOKEN by default
          operation: "chat.postMessage",
          body: {
            channel: slackLink.slackUserId,
            text: candidate.content,
          },
        });
        if (response?.ok) {
          postedToSlack = true;
        }
      }
      catch {
        // If Slack credentials are not configured or request fails, still record in DB
      }

      await recordProactiveSuggestion({
        userId,
        threadId: targetThreadId ?? null,
        channel: "slack",
        content: candidate.content,
        type: candidate.type,
      });
      dispatchedTo.push(postedToSlack ? "slack" : "slack_pending");
    }
  }

  return {
    success: dispatchedTo.length > 0,
    dispatchedTo,
    content: candidate.content,
  };
}
