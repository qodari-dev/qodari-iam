ALTER TABLE "audit_logs" RENAME COLUMN "resource" TO "resource_key";--> statement-breakpoint
DROP INDEX "audit_resource_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "function_name" varchar(100) NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_resource_key_idx" ON "audit_logs" USING btree ("resource_key");
