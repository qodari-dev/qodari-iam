ALTER TABLE "account_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account_members" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_account_id_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "fk_user_roles_accounts1_idx";--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_role_id_account_id_pk";--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id");--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_id" uuid ;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "user_account_idx" ON "users" USING btree ("account_id","email");--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN "is_system";--> statement-breakpoint
ALTER TABLE "user_roles" DROP COLUMN "account_id";
