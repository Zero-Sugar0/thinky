CREATE TABLE "agent_action_log" (
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
CREATE TABLE "agent_tasks" (
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
CREATE TABLE "meetings" (
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
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
ALTER TABLE "agent_action_log" ADD CONSTRAINT "agent_action_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_action_log_user_created_idx" ON "agent_action_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_tasks_user_status_idx" ON "agent_tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "meetings_user_idx" ON "meetings" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "meetings_bot_idx" ON "meetings" USING btree ("bot_id");