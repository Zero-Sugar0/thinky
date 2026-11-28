CREATE TABLE "telegram_link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"app_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"telegram_user_id" text PRIMARY KEY NOT NULL,
	"app_user_id" text NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"telegram_username" text,
	"telegram_display_name" text,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telegram_link_codes_app_user_idx" ON "telegram_link_codes" USING btree ("app_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_links_app_user_idx" ON "telegram_links" USING btree ("app_user_id");