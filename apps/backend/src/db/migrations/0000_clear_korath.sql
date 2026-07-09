CREATE TYPE "public"."impact_edge_kind" AS ENUM('imports', 'calls', 'covers');--> statement-breakpoint
CREATE TYPE "public"."regression_event_kind" AS ENUM('pass_to_pass', 'new_fail');--> statement-breakpoint
CREATE TYPE "public"."run_source" AS ENUM('agent', 'pr');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'pass', 'fail', 'error');--> statement-breakpoint
CREATE TYPE "public"."test_result_status" AS ENUM('pass', 'fail', 'skipped');--> statement-breakpoint
CREATE TABLE "at_risk_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"test_file" text NOT NULL,
	"test_name" text,
	"score" real NOT NULL,
	"reasons_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coverage_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"test_file_hash" text NOT NULL,
	"coverage_jsonb" jsonb NOT NULL,
	"built_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"from_symbol" text NOT NULL,
	"to_symbol" text NOT NULL,
	"kind" "impact_edge_kind" NOT NULL,
	"weight" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judge_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"criterion" text NOT NULL,
	"score_int" integer NOT NULL,
	"reasoning" text,
	"model" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regression_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"test_file" text NOT NULL,
	"test_name" text NOT NULL,
	"kind" "regression_event_kind" NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_installation_id" text,
	"full_name" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"settings_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"head_sha" text NOT NULL,
	"base_sha" text NOT NULL,
	"source" "run_source" NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"verdict_jsonb" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"test_file" text NOT NULL,
	"test_name" text NOT NULL,
	"status" "test_result_status" NOT NULL,
	"was_passing_before" boolean,
	"message" text,
	"stack" text
);
--> statement-breakpoint
CREATE TABLE "trajectories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent" text NOT NULL,
	"tool_calls_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasoning_text" text,
	"files_touched_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "at_risk_tests" ADD CONSTRAINT "at_risk_tests_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage_cache" ADD CONSTRAINT "coverage_cache_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_edges" ADD CONSTRAINT "impact_edges_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "judge_results" ADD CONSTRAINT "judge_results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regression_events" ADD CONSTRAINT "regression_events_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trajectories" ADD CONSTRAINT "trajectories_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;