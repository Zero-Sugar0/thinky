CREATE TABLE IF NOT EXISTS "meetings" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "bot_id" text NOT NULL,
  "meeting_url" text NOT NULL,
  "title" text,
  "bot_name" text DEFAULT 'Thinky Assistant' NOT NULL,
  "status" text DEFAULT 'scheduled' NOT NULL,
  "recording_id" text,
  "transcript_id" text,
  "transcript_text" text,
  "transcript_data" jsonb,
  "summary" text,
  "join_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_user_idx" ON "meetings" USING btree ("user_id", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meetings_bot_idx" ON "meetings" USING btree ("bot_id");
--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
