CREATE TYPE "public"."actor_type" AS ENUM('user', 'api_client');--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "action" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "resource" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_type" "actor_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_name" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "api_client_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "api_client_name" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "application_name" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "resource_label" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "before_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "after_value" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_api_client_id_api_clients_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."api_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_type_idx" ON "audit_logs" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "audit_api_client_idx" ON "audit_logs" USING btree ("api_client_id");--> statement-breakpoint
CREATE INDEX "audit_app_idx" ON "audit_logs" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_logs" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "audit_status_idx" ON "audit_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_account_created_idx" ON "audit_logs" USING btree ("account_id","created_at");