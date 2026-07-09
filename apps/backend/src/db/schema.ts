import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const runSourceEnum = pgEnum('run_source', ['agent', 'pr']);
export const runStatusEnum = pgEnum('run_status', ['queued', 'running', 'pass', 'fail', 'error']);
export const impactEdgeKindEnum = pgEnum('impact_edge_kind', ['imports', 'calls', 'covers']);
export const testResultStatusEnum = pgEnum('test_result_status', ['pass', 'fail', 'skipped']);
export const regressionEventKindEnum = pgEnum('regression_event_kind', [
  'pass_to_pass',
  'new_fail',
]);

export const repos = pgTable('repos', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubInstallationId: text('github_installation_id'),
  fullName: text('full_name').notNull().unique(),
  defaultBranch: text('default_branch').notNull().default('main'),
  settings: jsonb('settings_jsonb').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id, { onDelete: 'cascade' }),
  headSha: text('head_sha').notNull(),
  baseSha: text('base_sha').notNull(),
  source: runSourceEnum('source').notNull(),
  status: runStatusEnum('status').notNull().default('queued'),
  verdict: jsonb('verdict_jsonb'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trajectories = pgTable('trajectories', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  agent: text('agent').notNull(),
  toolCalls: jsonb('tool_calls_jsonb').notNull().default([]),
  reasoningText: text('reasoning_text'),
  filesTouched: jsonb('files_touched_jsonb').notNull().default([]),
});

export const impactEdges = pgTable('impact_edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  fromSymbol: text('from_symbol').notNull(),
  toSymbol: text('to_symbol').notNull(),
  kind: impactEdgeKindEnum('kind').notNull(),
  weight: real('weight').notNull(),
});

export const atRiskTests = pgTable('at_risk_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  testFile: text('test_file').notNull(),
  testName: text('test_name'),
  score: real('score').notNull(),
  reasons: jsonb('reasons_jsonb').notNull().default([]),
});

export const testResults = pgTable('test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  testFile: text('test_file').notNull(),
  testName: text('test_name').notNull(),
  status: testResultStatusEnum('status').notNull(),
  wasPassingBefore: boolean('was_passing_before'),
  message: text('message'),
  stack: text('stack'),
});

export const regressionEvents = pgTable('regression_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  testFile: text('test_file').notNull(),
  testName: text('test_name').notNull(),
  kind: regressionEventKindEnum('kind').notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
});

export const judgeResults = pgTable('judge_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  criterion: text('criterion').notNull(),
  scoreInt: integer('score_int').notNull(),
  reasoning: text('reasoning'),
  model: text('model').notNull(),
});

export const coverageCache = pgTable('coverage_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  repoId: uuid('repo_id')
    .notNull()
    .references(() => repos.id, { onDelete: 'cascade' }),
  testFileHash: text('test_file_hash').notNull(),
  coverage: jsonb('coverage_jsonb').notNull(),
  builtAt: timestamp('built_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reposRelations = relations(repos, ({ many }) => ({
  runs: many(runs),
  coverageCache: many(coverageCache),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  repo: one(repos, { fields: [runs.repoId], references: [repos.id] }),
  trajectories: many(trajectories),
  impactEdges: many(impactEdges),
  atRiskTests: many(atRiskTests),
  testResults: many(testResults),
  regressionEvents: many(regressionEvents),
  judgeResults: many(judgeResults),
}));

export const trajectoriesRelations = relations(trajectories, ({ one }) => ({
  run: one(runs, { fields: [trajectories.runId], references: [runs.id] }),
}));

export const impactEdgesRelations = relations(impactEdges, ({ one }) => ({
  run: one(runs, { fields: [impactEdges.runId], references: [runs.id] }),
}));

export const atRiskTestsRelations = relations(atRiskTests, ({ one }) => ({
  run: one(runs, { fields: [atRiskTests.runId], references: [runs.id] }),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  run: one(runs, { fields: [testResults.runId], references: [runs.id] }),
}));

export const regressionEventsRelations = relations(regressionEvents, ({ one }) => ({
  run: one(runs, { fields: [regressionEvents.runId], references: [runs.id] }),
}));

export const judgeResultsRelations = relations(judgeResults, ({ one }) => ({
  run: one(runs, { fields: [judgeResults.runId], references: [runs.id] }),
}));

export const coverageCacheRelations = relations(coverageCache, ({ one }) => ({
  repo: one(repos, { fields: [coverageCache.repoId], references: [repos.id] }),
}));
