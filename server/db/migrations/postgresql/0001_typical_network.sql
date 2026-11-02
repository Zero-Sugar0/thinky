ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "proactive_enabled" text DEFAULT 'true' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "proactive_channel" text DEFAULT 'chat' NOT NULL;
