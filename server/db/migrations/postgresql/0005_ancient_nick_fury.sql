CREATE TABLE "agent_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"toolkit" text NOT NULL,
	"trigger_slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_signals" ADD CONSTRAINT "agent_signals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_signals_user_created_idx" ON "agent_signals" USING btree ("user_id","created_at");