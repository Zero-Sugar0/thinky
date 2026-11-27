CREATE TABLE "agent_delivery_targets" (
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"target" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"channels" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"claimed_until" timestamp,
	"delivered_to" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN "notify_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN "notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN "claimed_until" timestamp;--> statement-breakpoint
ALTER TABLE "agent_delivery_targets" ADD CONSTRAINT "agent_delivery_targets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_delivery_targets_user_idx" ON "agent_delivery_targets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_notifications_status_idx" ON "agent_notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "agent_tasks_notify_idx" ON "agent_tasks" USING btree ("notify_at");