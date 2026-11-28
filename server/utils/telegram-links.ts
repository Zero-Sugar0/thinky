import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@nuxthub/db";
import type { TelegramLinkRecord, TelegramLinkSummary } from "#shared/types/telegram-link";

const CODE_TTL_MS = 15 * 60 * 1000;

function rowToRecord(row: typeof schema.telegramLinks.$inferSelect): TelegramLinkRecord {
  return {
    appUserId: row.appUserId,
    telegramUserId: row.telegramUserId,
    telegramChatId: row.telegramChatId,
    telegramUsername: row.telegramUsername ?? undefined,
    telegramDisplayName: row.telegramDisplayName ?? undefined,
    linkedAt: row.linkedAt,
  };
}

export async function getTelegramLinkForMember(telegramUserId: string) {
  const [row] = await db.select()
    .from(schema.telegramLinks)
    .where(eq(schema.telegramLinks.telegramUserId, telegramUserId))
    .limit(1);

  return row ? rowToRecord(row) : undefined;
}

export async function getTelegramLinkForAppUser(appUserId: string) {
  const [row] = await db.select()
    .from(schema.telegramLinks)
    .where(eq(schema.telegramLinks.appUserId, appUserId))
    .limit(1);

  return row ? rowToRecord(row) : undefined;
}

export async function createTelegramLinkCode(appUserId: string) {
  await db.delete(schema.telegramLinkCodes)
    .where(eq(schema.telegramLinkCodes.appUserId, appUserId));

  const code = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await db.insert(schema.telegramLinkCodes).values({ code, appUserId, expiresAt });
  return { code, expiresAt };
}

export async function getPendingTelegramLinkCode(appUserId: string) {
  const [row] = await db.select({
    code: schema.telegramLinkCodes.code,
    expiresAt: schema.telegramLinkCodes.expiresAt,
  })
    .from(schema.telegramLinkCodes)
    .where(eq(schema.telegramLinkCodes.appUserId, appUserId))
    .orderBy(desc(schema.telegramLinkCodes.createdAt))
    .limit(1);

  if (!row) return undefined;

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.telegramLinkCodes)
      .where(eq(schema.telegramLinkCodes.code, row.code));
    return undefined;
  }

  return { code: row.code, expiresAt: row.expiresAt };
}

export interface ConsumeTelegramLinkInput {
  code: string;
  telegramUserId: string;
  telegramChatId: string;
  telegramUsername?: string;
  telegramDisplayName?: string;
}

/** Links the Telegram account that sent the code. Replaces any earlier link for either side. */
export async function consumeTelegramLinkCode(input: ConsumeTelegramLinkInput) {
  const normalized = input.code.trim().toUpperCase();

  const [row] = await db.select({
    code: schema.telegramLinkCodes.code,
    appUserId: schema.telegramLinkCodes.appUserId,
    expiresAt: schema.telegramLinkCodes.expiresAt,
  })
    .from(schema.telegramLinkCodes)
    .where(eq(schema.telegramLinkCodes.code, normalized))
    .limit(1);

  if (!row) return { ok: false as const, reason: "invalid" as const };

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.telegramLinkCodes)
      .where(eq(schema.telegramLinkCodes.code, normalized));
    return { ok: false as const, reason: "expired" as const };
  }

  await db.delete(schema.telegramLinks)
    .where(eq(schema.telegramLinks.appUserId, row.appUserId));
  await db.delete(schema.telegramLinks)
    .where(eq(schema.telegramLinks.telegramUserId, input.telegramUserId));

  await db.insert(schema.telegramLinks).values({
    appUserId: row.appUserId,
    telegramUserId: input.telegramUserId,
    telegramChatId: input.telegramChatId,
    telegramUsername: input.telegramUsername,
    telegramDisplayName: input.telegramDisplayName,
  });

  await db.delete(schema.telegramLinkCodes)
    .where(eq(schema.telegramLinkCodes.appUserId, row.appUserId));

  return { ok: true as const, appUserId: row.appUserId };
}

export async function deleteTelegramLinkForAppUser(appUserId: string) {
  const before = await getTelegramLinkForAppUser(appUserId);
  await db.delete(schema.telegramLinks)
    .where(eq(schema.telegramLinks.appUserId, appUserId));
  return Boolean(before);
}

export function toTelegramLinkSummary(
  link: TelegramLinkRecord | undefined,
  pending: { code: string; expiresAt: string } | undefined,
): TelegramLinkSummary {
  return {
    linked: Boolean(link),
    username: link?.telegramUsername,
    displayName: link?.telegramDisplayName,
    linkedAt: link?.linkedAt,
    pendingCode: pending?.code,
    pendingExpiresAt: pending?.expiresAt,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || undefined,
  };
}
