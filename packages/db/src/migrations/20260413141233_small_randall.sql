CREATE TABLE "ai_prompt_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"function_id" varchar(50) NOT NULL,
	"model" varchar(100),
	"temperature" real,
	"reasoning_effort" varchar(20),
	"system_prompt_override" text,
	"user_prompt_override" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid NOT NULL,
	CONSTRAINT "ai_prompt_configs_workspace_function" UNIQUE("workspace_id","function_id")
);
--> statement-breakpoint
ALTER TABLE "ai_prompt_configs" ADD CONSTRAINT "ai_prompt_configs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_prompt_configs_workspace_idx" ON "ai_prompt_configs" USING btree ("workspace_id");