CREATE TABLE "meeting_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_activity" ADD CONSTRAINT "meeting_activity_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_activity_meeting_idx" ON "meeting_activity" USING btree ("meeting_id","created_at");