-- Idempotent: the agent_action_log table can already exist in a database that was
-- created outside migration tracking. meetings is created by 0002_meetings.sql.
CREATE TABLE IF NOT EXISTS "agent_action_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tool_slug" text NOT NULL,
	"toolkit" text,
	"status" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"external_log_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"source" text DEFAULT 'chat' NOT NULL,
	"due_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_action_log" ADD CONSTRAINT "agent_action_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_action_log_user_created_idx" ON "agent_action_log" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_tasks_user_status_idx" ON "agent_tasks" USING btree ("user_id","status");
