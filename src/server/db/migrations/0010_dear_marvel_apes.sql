CREATE TYPE "public"."token_alg" AS ENUM('HS256', 'RS256');--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "token_alg" "token_alg" DEFAULT 'HS256' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "jwt_kid" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "jwt_public_key" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "jwt_private_key" text;