import { env } from '../env.js';
import { GOLD_SET } from './gold-set.js';
import { CRITERIA, type CriterionId } from './rubric.js';
import { scoreDiff } from './score-diff.js';

const AGREEMENT_TOLERANCE = 1; // |judge - gold| <= this counts as agreement
const FALSE_POSITIVE_THRESHOLD = 2; // judge score <= this on a clean example counts as a false positive
const CLEAN_GOLD_MIN = 4; // an example is "clean" if every gold score is >= this

const AGREEMENT_GATE = 0.8; // plan §5/§13
const FP_RATE_GATE = 0.1; // plan §5/§13

interface CriterionResult {
  criterion: CriterionId;
  gold: number;
  judged: number;
  agrees: boolean;
}

interface ExampleResult {
  id: string;
  isClean: boolean;
  criteria: CriterionResult[];
  falsePositive: boolean;
}

function isClean(gold: Record<CriterionId, number>): boolean {
  return CRITERIA.every((c) => gold[c.id] >= CLEAN_GOLD_MIN);
}

async function runOne(example: (typeof GOLD_SET)[number]): Promise<ExampleResult> {
  const judged = await scoreDiff({
    reasoningText: example.reasoningText,
    diff: example.diff,
    atRiskTests: example.atRiskTests,
    verdictStatus: example.verdictStatus,
  });

  const clean = isClean(example.gold);
  const criteria: CriterionResult[] = CRITERIA.map((c) => {
    const gold = example.gold[c.id];
    const score = judged[c.id].score;
    return {
      criterion: c.id,
      gold,
      judged: score,
      agrees: Math.abs(gold - score) <= AGREEMENT_TOLERANCE,
    };
  });

  const falsePositive = clean && criteria.some((c) => c.judged <= FALSE_POSITIVE_THRESHOLD);

  return { id: example.id, isClean: clean, criteria, falsePositive };
}

async function main(): Promise<void> {
  if (!env.GROQ_API_KEY || !env.GROQ_MODEL) {
    console.error('GROQ_API_KEY and GROQ_MODEL must be set to run calibration.');
    process.exitCode = 1;
    return;
  }

  console.log(`Calibrating against ${GOLD_SET.length} gold examples using ${env.GROQ_MODEL}...\n`);

  const results: ExampleResult[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const example of GOLD_SET) {
    try {
      const result = await runOne(example);
      results.push(result);
      const line = result.criteria
        .map((c) => `${c.criterion}: gold=${c.gold} judged=${c.judged} ${c.agrees ? '✓' : '✗'}`)
        .join('  ');
      console.log(`${result.falsePositive ? '⚠ FP ' : '     '}${example.id.padEnd(32)} ${line}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ id: example.id, error: message });
      console.log(`ERROR ${example.id.padEnd(32)} ${message}`);
    }
  }

  const allCriteria = results.flatMap((r) => r.criteria);
  const agreementRate =
    allCriteria.length > 0 ? allCriteria.filter((c) => c.agrees).length / allCriteria.length : 0;

  const cleanResults = results.filter((r) => r.isClean);
  const fpRate =
    cleanResults.length > 0
      ? cleanResults.filter((r) => r.falsePositive).length / cleanResults.length
      : 0;

  console.log('\n--- Summary ---');
  console.log(`Examples scored: ${results.length}/${GOLD_SET.length} (${errors.length} errored)`);
  console.log(
    `Agreement rate (|judge - gold| <= ${AGREEMENT_TOLERANCE}): ${(agreementRate * 100).toFixed(1)}% ` +
      `-- gate is >= ${AGREEMENT_GATE * 100}% -- ${agreementRate >= AGREEMENT_GATE ? 'PASS' : 'FAIL'}`,
  );
  console.log(
    `False-positive rate on ${cleanResults.length} clean examples: ${(fpRate * 100).toFixed(1)}% ` +
      `-- gate is < ${FP_RATE_GATE * 100}% -- ${fpRate < FP_RATE_GATE ? 'PASS' : 'FAIL'}`,
  );

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  ${e.id}: ${e.error}`);
  }

  if (agreementRate < AGREEMENT_GATE || fpRate >= FP_RATE_GATE || errors.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
