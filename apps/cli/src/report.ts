import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { RegressionVerdict } from '@trust-gate/orchestrator';
import { checkRegression } from '@trust-gate/orchestrator';
import { summarizeVerdict } from './format.js';

const execFile = promisify(execFileCb);

type RunSource = 'agent' | 'pr';

interface ReportOptions {
  repoRoot: string;
  baseRef: string;
  maxTests?: number;
  repoFullName?: string;
  headSha?: string;
  baseSha?: string;
  source: RunSource;
  backendUrl?: string;
  token?: string;
}

function isRunSource(value: string): value is RunSource {
  return value === 'agent' || value === 'pr';
}

/** Minimal `--flag value` / `--flag` (boolean) parser -- no external dep needed for this small a surface. */
function parseArgs(argv: string[]): ReportOptions {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(key, next);
      i += 1;
    } else {
      flags.set(key, 'true');
    }
  }

  const sourceFlag = flags.get('source');
  const source: RunSource =
    sourceFlag && isRunSource(sourceFlag)
      ? sourceFlag
      : process.env.GITHUB_ACTIONS === 'true'
        ? 'pr'
        : 'agent';

  const maxTestsFlag = flags.get('max-tests');
  const repoFullName = flags.get('repo-full-name') ?? process.env.GITHUB_REPOSITORY;
  const headSha = flags.get('head-sha') ?? process.env.TRUST_GATE_HEAD_SHA;
  const baseSha = flags.get('base-sha') ?? process.env.TRUST_GATE_BASE_SHA;
  const backendUrl = flags.get('backend-url') ?? process.env.TRUST_GATE_BACKEND_URL;
  const token = flags.get('token') ?? process.env.TRUST_GATE_API_TOKEN;

  return {
    repoRoot: flags.get('repo-root') ?? process.cwd(),
    baseRef: flags.get('base-ref') ?? 'HEAD',
    ...(maxTestsFlag !== undefined ? { maxTests: Number(maxTestsFlag) } : {}),
    ...(repoFullName !== undefined ? { repoFullName } : {}),
    ...(headSha !== undefined ? { headSha } : {}),
    ...(baseSha !== undefined ? { baseSha } : {}),
    source,
    ...(backendUrl !== undefined ? { backendUrl } : {}),
    ...(token !== undefined ? { token } : {}),
  };
}

async function resolveSha(repoRoot: string, ref: string): Promise<string> {
  const { stdout } = await execFile('git', ['rev-parse', ref], { cwd: repoRoot });
  return stdout.trim();
}

async function postRun(
  backendUrl: string,
  token: string,
  body: {
    repoFullName: string;
    headSha: string;
    baseSha: string;
    verdict: RegressionVerdict;
    source: RunSource;
  },
): Promise<string> {
  const res = await fetch(new URL('/runs', backendUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST /runs failed: ${res.status} ${res.statusText} ${text}`);
  }
  const json = (await res.json()) as { runId: string };
  return json.runId;
}

/**
 * `trust-gate report` -- runs check_regression and, if a backend URL + token are
 * configured, POSTs the verdict to `/runs`. Used both as the "optionally report back
 * to the backend" step of the local agent path and as the payload of the reusable
 * GitHub Actions workflow (source defaults to 'pr' when $GITHUB_ACTIONS is set).
 * Returns the process exit code -- non-zero on a regression, a run error, or a failed
 * report so either usage gates correctly on its own exit status.
 */
export async function report(argv: string[]): Promise<number> {
  const opts = parseArgs(argv);

  let verdict: RegressionVerdict;
  try {
    verdict = await checkRegression({
      repoRoot: opts.repoRoot,
      baseRef: opts.baseRef,
      ...(opts.maxTests !== undefined ? { maxTests: opts.maxTests } : {}),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`check_regression failed: ${errorMessage}`);
    return 1;
  }

  console.log(summarizeVerdict(verdict));

  if (opts.backendUrl && opts.token) {
    if (!opts.repoFullName) {
      console.error(
        'Cannot report to backend: --repo-full-name (or $GITHUB_REPOSITORY) is not set.',
      );
      return 1;
    }
    try {
      const headSha = opts.headSha ?? (await resolveSha(opts.repoRoot, 'HEAD'));
      const baseSha = opts.baseSha ?? (await resolveSha(opts.repoRoot, opts.baseRef));
      const runId = await postRun(opts.backendUrl, opts.token, {
        repoFullName: opts.repoFullName,
        headSha,
        baseSha,
        verdict,
        source: opts.source,
      });
      console.log(`Reported to backend: runId=${runId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed to report run to backend: ${errorMessage}`);
      return 1;
    }
  }

  return verdict.status === 'pass' ? 0 : 1;
}
