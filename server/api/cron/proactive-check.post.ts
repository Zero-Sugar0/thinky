import { eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import { verifyQStashOrSecret } from "~~/server/utils/qstash";
import { decideCheckin, type CheckinRolls } from "~~/server/utils/checkin-policy";
import { composeCheckin, gatherCheckin } from "~~/server/utils/checkin";
import { dispatchProactiveSuggestion } from "~~/server/utils/proactive";
import { FREQUENCY_HOURS, type ProactiveChannel, type ProactiveFrequency } from "#shared/types/profile";
import { pruneOldSignals } from "~~/server/utils/signals";
import { fetchUserMemoryEntries } from "~~/server/utils/memory";

function randomRolls(): CheckinRolls {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return {
    gate: values[0]! / 0x1_0000_0000,
    pick: values[1]! / 0x1_0000_0000,
  };
}

/**
 * Runs on a QStash schedule. For each opted-in user it decides whether a check-in is
 * due right now, and if so writes it and queues it for the dispatcher.
 */
export default defineEventHandler(async (event) => {
  if (!(await verifyQStashOrSecret(event))) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized QStash or cron request" });
  }

  await pruneOldSignals(7);

  const profiles = await db.select({
    userId: schema.userProfiles.userId,
    timezone: schema.userProfiles.timezone,
    bio: schema.userProfiles.bio,
    proactiveEnabled: schema.userProfiles.proactiveEnabled,
    proactiveChannel: schema.userProfiles.proactiveChannel,
    proactiveFrequency: schema.userProfiles.proactiveFrequency,
    userName: schema.user.name,
  })
    .from(schema.userProfiles)
    .innerJoin(schema.user, eq(schema.userProfiles.userId, schema.user.id));

  const results: Array<{ userId: string; category?: string; queued: boolean; reason?: string }> = [];

  for (const profile of profiles) {
    if (profile.proactiveEnabled === "false") {
      results.push({ userId: profile.userId, queued: false, reason: "disabled" });
      continue;
    }

    const memories = await fetchUserMemoryEntries(profile.userId);
    const { signals, facts } = await gatherCheckin({
      userId: profile.userId,
      timezone: profile.timezone,
      name: profile.userName?.split(" ")[0] ?? "",
      bio: profile.bio,
      memories,
      cadenceHours: FREQUENCY_HOURS[profile.proactiveFrequency as ProactiveFrequency] ?? FREQUENCY_HOURS["4h"],
    });

    const category = decideCheckin(signals, randomRolls());
    if (!category) {
      results.push({ userId: profile.userId, queued: false, reason: "no check-in due" });
      continue;
    }

    const content = await composeCheckin(category, facts);
    const dispatched = await dispatchProactiveSuggestion({
      userId: profile.userId,
      candidate: { type: category, content },
      channelPref: profile.proactiveChannel as ProactiveChannel,
    });

    results.push({ userId: profile.userId, category, queued: dispatched.success });
  }

  return { ok: true, processed: results.length, results };
});
