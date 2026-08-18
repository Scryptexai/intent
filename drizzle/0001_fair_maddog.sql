CREATE TABLE IF NOT EXISTS "actor_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"claim_text" text NOT NULL,
	"claim_date" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" varchar(20) DEFAULT 'pending' NOT NULL,
	"evidence_link" text,
	"conflict_of_interest" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anomaly_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" varchar(20) NOT NULL,
	"scanned_projects" integer DEFAULT 0 NOT NULL,
	"scanned_metrics" integer DEFAULT 0 NOT NULL,
	"new_alerts" integer DEFAULT 0 NOT NULL,
	"threshold" numeric DEFAULT '2' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_vectors" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"vector" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "narrative_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"narrative_id" uuid,
	"channel" varchar(20) NOT NULL,
	"value" numeric DEFAULT '0.5' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "narratives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"heat" numeric DEFAULT '0.5' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"variable" varchar(40) NOT NULL,
	"value" numeric DEFAULT '0' NOT NULL,
	"result" jsonb,
	"share_token" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actor_claims" ADD CONSTRAINT "actor_claims_actor_id_entities_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_vectors" ADD CONSTRAINT "feature_vectors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "narrative_evidence" ADD CONSTRAINT "narrative_evidence_narrative_id_narratives_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."narratives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulations" ADD CONSTRAINT "simulations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulations" ADD CONSTRAINT "simulations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claims_actor_idx" ON "actor_claims" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_narrative_idx" ON "narrative_evidence" USING btree ("narrative_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulations_project_idx" ON "simulations" USING btree ("project_id");