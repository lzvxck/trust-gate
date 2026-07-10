import { env } from './env';

export interface RepoSettings {
  /** testFile paths flagged as flaky. Not yet consumed by check_regression's scoring --
   * see packages/impact's `flakiness` option -- this only persists the list today. */
  flakyTests?: string[];
}

export interface Repo {
  id: string;
  fullName: string;
  defaultBranch: string;
  settings?: RepoSettings;
  createdAt: string;
}

export type RunStatus = 'queued' | 'running' | 'pass' | 'fail' | 'error';
export type RunSource = 'agent' | 'pr';

export interface RunListItem {
  id: string;
  repoId: string;
  repoFullName: string;
  headSha: string;
  baseSha: string;
  source: RunSource;
  status: RunStatus;
  createdAt: string;
  passToPassFailures: number;
  newFailures: number;
}

export interface TestFailure {
  testFile: string;
  testName: string;
  message?: string;
  stack?: string;
}

export interface RegressionVerdict {
  status: 'pass' | 'fail' | 'error';
  passToPassFailures: TestFailure[];
  newFailures: TestFailure[];
  preExistingFailures: TestFailure[];
  testsRun: number;
  diff: string;
  errorMessage?: string;
}

export interface Trajectory {
  id: string;
  agent: string;
  toolCalls: unknown[];
  reasoningText: string | null;
  filesTouched: string[];
}

export interface AtRiskTest {
  id: string;
  testFile: string;
  testName: string | null;
  score: number;
  reasons: string[];
}

export interface TestResult {
  id: string;
  testFile: string;
  testName: string;
  status: 'pass' | 'fail' | 'skipped';
  wasPassingBefore: boolean | null;
  message: string | null;
  stack: string | null;
}

export interface JudgeResult {
  id: string;
  criterion: string;
  scoreInt: number;
  reasoning: string | null;
  model: string;
}

export type ImpactEdgeKind = 'imports' | 'calls' | 'covers';

export interface ImpactEdge {
  id: string;
  fromSymbol: string;
  toSymbol: string;
  kind: ImpactEdgeKind;
  weight: number;
}

export type RegressionEventKind = 'pass_to_pass' | 'new_fail';

export interface RegressionEvent {
  id: string;
  testFile: string;
  testName: string;
  kind: RegressionEventKind;
  detectedAt: string;
}

export interface RunDetail {
  id: string;
  repoId: string;
  headSha: string;
  baseSha: string;
  source: RunSource;
  status: RunStatus;
  verdict: RegressionVerdict | null;
  createdAt: string;
  repo: Repo;
  trajectories: Trajectory[];
  impactEdges: ImpactEdge[];
  atRiskTests: AtRiskTest[];
  testResults: TestResult[];
  judgeResults: JudgeResult[];
  regressionEvents: RegressionEvent[];
}

async function backendFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${env.BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${env.BACKEND_API_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Backend request failed: ${path} -> ${res.status}`);
  return res.json();
}

export async function listRepos(): Promise<Repo[]> {
  const { repos } = await backendFetch<{ repos: Repo[] }>('/repos');
  return repos;
}

export interface ListRunsParams {
  repoId?: string;
  limit?: number;
  offset?: number;
}

export async function listRuns(
  params: ListRunsParams = {},
): Promise<{ runs: RunListItem[]; limit: number; offset: number }> {
  const search = new URLSearchParams();
  if (params.repoId) search.set('repoId', params.repoId);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.offset) search.set('offset', String(params.offset));
  const qs = search.toString();
  return backendFetch(`/runs${qs ? `?${qs}` : ''}`);
}

export async function getRun(id: string): Promise<RunDetail | null> {
  const res = await fetch(`${env.BACKEND_URL}/runs/${id}`, {
    headers: { Authorization: `Bearer ${env.BACKEND_API_TOKEN}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend request failed: /runs/${id} -> ${res.status}`);
  const { run } = await res.json();
  return run;
}

export async function getRepo(id: string): Promise<Repo | null> {
  const res = await fetch(`${env.BACKEND_URL}/repos/${id}`, {
    headers: { Authorization: `Bearer ${env.BACKEND_API_TOKEN}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend request failed: /repos/${id} -> ${res.status}`);
  const { repo } = await res.json();
  return repo;
}

export interface UpdateRepoInput {
  defaultBranch?: string;
  settings?: RepoSettings;
}

export async function updateRepo(id: string, input: UpdateRepoInput): Promise<Repo> {
  const res = await fetch(`${env.BACKEND_URL}/repos/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${env.BACKEND_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Backend request failed: PATCH /repos/${id} -> ${res.status}`);
  const { repo } = await res.json();
  return repo;
}

export interface RegressionDayBucket {
  date: string;
  passToPass: number;
  newFail: number;
}

export async function getRepoRegressions(id: string): Promise<RegressionDayBucket[]> {
  const { series } = await backendFetch<{ series: RegressionDayBucket[] }>(
    `/repos/${id}/regressions`,
  );
  return series;
}
