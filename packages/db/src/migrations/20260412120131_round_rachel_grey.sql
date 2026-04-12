ALTER TYPE "public"."activity_event_type" ADD VALUE 'policy_update';--> statement-breakpoint
ALTER TABLE "policy_packs" ADD COLUMN "default_outcome" varchar(50) DEFAULT 'REVIEW_REQUIRED' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_concept_workspace_name" ON "concepts" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_entity_workspace_name_type" ON "entities" USING btree ("workspace_id","name","entity_type");