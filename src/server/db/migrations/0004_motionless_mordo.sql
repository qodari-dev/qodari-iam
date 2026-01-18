ALTER TABLE "applications" ALTER COLUMN "refresh_token_exp" SET DEFAULT 604800;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "callback_urls" text[] DEFAULT '{}';--> statement-breakpoint
UPDATE "applications" SET "callback_urls" = ARRAY["callback_url"] WHERE "callback_url" IS NOT NULL AND "callback_url" != '';--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "callback_url";
