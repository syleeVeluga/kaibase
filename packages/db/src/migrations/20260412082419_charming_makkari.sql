CREATE TYPE "public"."activity_event_type" AS ENUM('ingest', 'classify', 'page_create', 'page_update', 'page_publish', 'query', 'answer', 'review_create', 'review_complete', 'lint', 'digest', 'channel_send', 'mcp_call');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('user', 'ai', 'system', 'mcp_agent');--> statement-breakpoint
CREATE TYPE "public"."compilation_level" AS ENUM('L0', 'L1', 'L2');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('person', 'organization', 'product', 'technology', 'location', 'event', 'custom');--> statement-breakpoint
CREATE TYPE "public"."graph_edge_type" AS ENUM('cites', 'mentions', 'related_to', 'parent_of', 'derived_from', 'contradicts');--> statement-breakpoint
CREATE TYPE "public"."graph_node_type" AS ENUM('page', 'entity', 'concept', 'source');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'ko');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('owner', 'admin', 'editor', 'reviewer', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."connector_type" AS ENUM('local_folder', 'google_drive', 's3', 'gcs', 'dropbox', 'onedrive');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('pending', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('file_upload', 'url', 'email', 'slack_message', 'discord_message', 'mcp_input', 'text_input', 'connector');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TYPE "public"."collection_type" AS ENUM('inbox', 'project', 'entities', 'concepts', 'briefs', 'review_queue', 'knowledge_index', 'activity_log', 'custom');--> statement-breakpoint
CREATE TYPE "public"."page_creator_type" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('draft', 'published', 'archived', 'review_pending');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('project', 'entity', 'concept', 'brief', 'answer', 'summary', 'comparison', 'custom');--> statement-breakpoint
CREATE TYPE "public"."review_task_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."review_task_type" AS ENUM('page_creation', 'page_update', 'classification', 'contradiction', 'stale_content', 'lint_issue');--> statement-breakpoint
CREATE TYPE "public"."channel_direction" AS ENUM('inbound', 'outbound', 'bidirectional');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('email', 'slack', 'discord', 'mcp', 'webhook');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_type" "activity_event_type" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" varchar(255),
	"target_type" varchar(100),
	"target_id" uuid,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"excerpt" text NOT NULL,
	"location_hint" varchar(255),
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compilation_traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"source_ids" uuid[] DEFAULT '{}' NOT NULL,
	"template_id" uuid,
	"compilation_level" "compilation_level" NOT NULL,
	"reasoning" text NOT NULL,
	"decisions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_used" varchar(255) NOT NULL,
	"token_usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"name_ko" varchar(500),
	"description" text,
	"canonical_page_id" uuid,
	"parent_concept_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"name" varchar(500) NOT NULL,
	"name_ko" varchar(500),
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"description" text,
	"canonical_page_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"edge_type" "graph_edge_type" NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"weight" real,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"node_type" "graph_node_type" NOT NULL,
	"ref_id" uuid NOT NULL,
	"label" varchar(500) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"default_language" "language" DEFAULT 'en' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "source_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"filename" varchar(500) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"content_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connector_type" "connector_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sync_status" "sync_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"file_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_type" "source_type" NOT NULL,
	"channel" varchar(255) NOT NULL,
	"connector_id" uuid,
	"source_uri" text,
	"title" varchar(500),
	"content_text" text,
	"content_hash" varchar(64) NOT NULL,
	"raw_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ingested_by" uuid,
	"status" "source_status" DEFAULT 'pending' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "canonical_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"page_type" "page_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"title_ko" varchar(500),
	"slug" varchar(500) NOT NULL,
	"content_snapshot" text DEFAULT '' NOT NULL,
	"ydoc_id" varchar(255),
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"created_by" "page_creator_type" NOT NULL,
	"created_by_user_id" uuid,
	"parent_page_id" uuid,
	"collection_id" uuid,
	"template_id" uuid,
	"compilation_trace_id" uuid,
	"language" "language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_ko" varchar(255),
	"collection_type" "collection_type" NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"page_type" "page_type" NOT NULL,
	"trigger_conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"task_type" "review_task_type" NOT NULL,
	"status" "review_task_status" DEFAULT 'pending' NOT NULL,
	"target_page_id" uuid,
	"target_source_id" uuid,
	"proposed_change" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_reasoning" text NOT NULL,
	"assigned_to" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"policy_rule_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "policy_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_type" "channel_type" NOT NULL,
	"direction" "channel_direction" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"query_text" varchar(2000) NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schedule_cron" varchar(100),
	"output_channel_id" uuid,
	"last_run_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_page_id_canonical_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."canonical_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_traces" ADD CONSTRAINT "compilation_traces_page_id_canonical_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."canonical_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_traces" ADD CONSTRAINT "compilation_traces_template_id_page_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."page_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_embeddings" ADD CONSTRAINT "page_embeddings_page_id_canonical_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."canonical_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_embeddings" ADD CONSTRAINT "source_embeddings_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_canonical_page_id_canonical_pages_id_fk" FOREIGN KEY ("canonical_page_id") REFERENCES "public"."canonical_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_canonical_page_id_canonical_pages_id_fk" FOREIGN KEY ("canonical_page_id") REFERENCES "public"."canonical_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_source_node_id_graph_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_target_node_id_graph_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_nodes" ADD CONSTRAINT "graph_nodes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_attachments" ADD CONSTRAINT "source_attachments_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_connectors" ADD CONSTRAINT "source_connectors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_connectors" ADD CONSTRAINT "source_connectors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_connector_id_source_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."source_connectors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_ingested_by_users_id_fk" FOREIGN KEY ("ingested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_pages" ADD CONSTRAINT "canonical_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_pages" ADD CONSTRAINT "canonical_pages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_pages" ADD CONSTRAINT "canonical_pages_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_pages" ADD CONSTRAINT "canonical_pages_template_id_page_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."page_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_target_page_id_canonical_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."canonical_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_target_source_id_sources_id_fk" FOREIGN KEY ("target_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_packs" ADD CONSTRAINT "policy_packs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_packs" ADD CONSTRAINT "policy_packs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_endpoints" ADD CONSTRAINT "channel_endpoints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_queries" ADD CONSTRAINT "saved_queries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_queries" ADD CONSTRAINT "saved_queries_output_channel_id_channel_endpoints_id_fk" FOREIGN KEY ("output_channel_id") REFERENCES "public"."channel_endpoints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_queries" ADD CONSTRAINT "saved_queries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_workspace_time" ON "activity_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_event_type" ON "activity_events" USING btree ("workspace_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_activity_target" ON "activity_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_citation_page" ON "citations" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_citation_source" ON "citations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_compilation_trace_page" ON "compilation_traces" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_compilation_trace_level" ON "compilation_traces" USING btree ("compilation_level");--> statement-breakpoint
CREATE INDEX "idx_page_embedding_page" ON "page_embeddings" USING btree ("page_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_source_embedding_source" ON "source_embeddings" USING btree ("source_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_concept_workspace" ON "concepts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_concept_name" ON "concepts" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_concept_canonical_page" ON "concepts" USING btree ("canonical_page_id");--> statement-breakpoint
CREATE INDEX "idx_concept_parent" ON "concepts" USING btree ("parent_concept_id");--> statement-breakpoint
CREATE INDEX "idx_entity_workspace_type" ON "entities" USING btree ("workspace_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_entity_name" ON "entities" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "idx_entity_canonical_page" ON "entities" USING btree ("canonical_page_id");--> statement-breakpoint
CREATE INDEX "idx_graph_edge_source" ON "graph_edges" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "idx_graph_edge_target" ON "graph_edges" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "idx_graph_edge_workspace_type" ON "graph_edges" USING btree ("workspace_id","edge_type");--> statement-breakpoint
CREATE INDEX "idx_graph_node_workspace" ON "graph_nodes" USING btree ("workspace_id","node_type");--> statement-breakpoint
CREATE INDEX "idx_graph_node_ref" ON "graph_nodes" USING btree ("workspace_id","ref_id");--> statement-breakpoint
CREATE INDEX "idx_source_attachment_source" ON "source_attachments" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_source_connector_workspace" ON "source_connectors" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_source_content_hash" ON "sources" USING btree ("workspace_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_source_workspace_status" ON "sources" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_source_connector" ON "sources" USING btree ("connector_id");--> statement-breakpoint
CREATE INDEX "idx_page_workspace_type" ON "canonical_pages" USING btree ("workspace_id","page_type","status");--> statement-breakpoint
CREATE INDEX "idx_page_slug" ON "canonical_pages" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "idx_page_collection" ON "canonical_pages" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_page_status" ON "canonical_pages" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_collection_workspace" ON "collections" USING btree ("workspace_id","collection_type");--> statement-breakpoint
CREATE INDEX "idx_page_template_workspace" ON "page_templates" USING btree ("workspace_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_review_workspace_status" ON "review_tasks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_review_target_page" ON "review_tasks" USING btree ("target_page_id");--> statement-breakpoint
CREATE INDEX "idx_review_assigned" ON "review_tasks" USING btree ("assigned_to","status");--> statement-breakpoint
CREATE INDEX "idx_review_expires" ON "review_tasks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_policy_workspace_active" ON "policy_packs" USING btree ("workspace_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_channel_workspace_type" ON "channel_endpoints" USING btree ("workspace_id","channel_type");--> statement-breakpoint
CREATE INDEX "idx_channel_active" ON "channel_endpoints" USING btree ("workspace_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_saved_query_workspace" ON "saved_queries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_saved_query_schedule" ON "saved_queries" USING btree ("schedule_cron");