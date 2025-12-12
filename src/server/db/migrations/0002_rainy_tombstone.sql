DROP INDEX "fk_refresh_tokens_users1_idx";--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "client_jwt_secret" text NOT NULL;--> statement-breakpoint
CREATE INDEX "fk_refresh_tokens_users_application_idx" ON "refresh_tokens" USING btree ("user_id","application_id");
