CREATE TABLE "access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terminal_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"visitor_id" text,
	"event" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hack_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terminal_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lockouts" (
	"terminal_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"ip_hash" text NOT NULL,
	"until" timestamp with time zone NOT NULL,
	CONSTRAINT "lockouts_terminal_id_visitor_id_pk" PRIMARY KEY("terminal_id","visitor_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"deleted_by_sender" boolean DEFAULT false NOT NULL,
	"deleted_by_recipient" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terminal_id" uuid NOT NULL,
	"parent_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"welcome" text DEFAULT '' NOT NULL,
	"server_no" integer DEFAULT 1 NOT NULL,
	"firmware" text DEFAULT 'uos' NOT NULL,
	"phosphor" text DEFAULT 'green' NOT NULL,
	"security_level" integer DEFAULT 3 NOT NULL,
	"lockout_seconds" integer DEFAULT 300 NOT NULL,
	"exploit_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terminals_owner_id_unique" UNIQUE("owner_id"),
	CONSTRAINT "terminals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hack_sessions" ADD CONSTRAINT "hack_sessions_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lockouts" ADD CONSTRAINT "lockouts_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_terminal_id_terminals_id_fk" FOREIGN KEY ("terminal_id") REFERENCES "public"."terminals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terminals" ADD CONSTRAINT "terminals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_log_terminal_idx" ON "access_log" USING btree ("terminal_id","created_at");--> statement-breakpoint
CREATE INDEX "hack_sessions_visitor_idx" ON "hack_sessions" USING btree ("terminal_id","visitor_id");--> statement-breakpoint
CREATE INDEX "lockouts_ip_idx" ON "lockouts" USING btree ("terminal_id","ip_hash");--> statement-breakpoint
CREATE INDEX "messages_to_idx" ON "messages" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_from_idx" ON "messages" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE INDEX "nodes_terminal_parent_idx" ON "nodes" USING btree ("terminal_id","parent_id");