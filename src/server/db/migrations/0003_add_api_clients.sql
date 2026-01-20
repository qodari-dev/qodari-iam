CREATE TABLE "api_client_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_client_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"client_id" text NOT NULL,
	"client_secret_hash" text NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"access_token_exp" integer DEFAULT 600 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_clients_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "api_client_roles" ADD CONSTRAINT "api_client_roles_api_client_id_api_clients_id_fk" FOREIGN KEY ("api_client_id") REFERENCES "public"."api_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_client_roles" ADD CONSTRAINT "api_client_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_clients" ADD CONSTRAINT "api_clients_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_client_roles_client_idx" ON "api_client_roles" USING btree ("api_client_id");--> statement-breakpoint
CREATE INDEX "api_client_roles_role_idx" ON "api_client_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_client_roles_uniq" ON "api_client_roles" USING btree ("api_client_id","role_id");--> statement-breakpoint
CREATE INDEX "api_clients_account_idx" ON "api_clients" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "api_clients_client_id_idx" ON "api_clients" USING btree ("client_id");