ALTER TABLE "meetings" ADD COLUMN "bridge_token" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "agent_session_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_bridge_token_unique" UNIQUE("bridge_token");