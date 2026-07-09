import { env } from './env';

export interface Repo {
  id: string;
  fullName: string;
  defaultBranch: string;
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
  atRiskTests: AtRiskTest[];
  testResults: TestResult[];
  judgeResults: JudgeResult[];
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
