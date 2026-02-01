ALTER TABLE applications ALTER COLUMN logout_url TYPE text[] USING '{}'::text[];--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "logout_url" SET DEFAULT '{}';
