export interface TelegramLinkRecord {
  appUserId: string;
  telegramUserId: string;
  telegramChatId: string;
  telegramUsername?: string;
  telegramDisplayName?: string;
  linkedAt: string;
}

export interface TelegramLinkSummary {
  linked: boolean;
  username?: string;
  displayName?: string;
  linkedAt?: string;
  pendingCode?: string;
  pendingExpiresAt?: string;
  /** Bot username from TELEGRAM_BOT_USERNAME, so the UI can say which bot to message. */
  botUsername?: string;
}
