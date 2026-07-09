import type { CriterionId } from './rubric.js';

export interface GoldExample {
  id: string;
  /** Not shown to the model -- for the calibration report only. */
  description: string;
  reasoningText: string;
  diff: string;
  atRiskTests: { testFile: string; testName?: string }[];
  verdictStatus: 'pass' | 'fail' | 'error';
  gold: Record<CriterionId, number>;
}

/**
 * Hand-labeled gold set for judge calibration (plan §5/§13: ≥80% agreement, <10% false
 * positives on clean PRs, else ship deterministic-only). Deliberately constructed so the
 * "correct" score is unambiguous by design -- each example isolates one failure mode
 * (bad intent match, scope creep, test-inconsistency) or is unambiguously clean, rather
 * than being a genuinely disputable edge case. This keeps the hand-labeling defensible
 * despite being done by the same person who built the pipeline (a real limitation: an
 * independent labeler would be more rigorous, but wasn't available this round).
 *
 * "Clean" (all three gold scores >= 4) examples are the false-positive-rate denominator
 * -- calibrate.ts flags any judge score <= 2 on a clean example as a false positive.
 */
export const GOLD_SET: GoldExample[] = [
  // --- clean: genuinely good diffs, used for the false-positive-rate check ---
  {
    id: 'clean-off-by-one',
    description: 'Fixes an off-by-one exactly as described, small, scoped, tests pass.',
    reasoningText:
      'Fix off-by-one error in getLastNItems: it was slicing one element short of the requested count.',
    diff: `diff --git a/src/array.ts b/src/array.ts
index 1111111..2222222 100644
--- a/src/array.ts
+++ b/src/array.ts
@@ -1,5 +1,5 @@
 export function getLastNItems<T>(arr: T[], n: number): T[] {
-  return arr.slice(arr.length - n + 1);
+  return arr.slice(arr.length - n);
 }
`,
    atRiskTests: [
      { testFile: 'src/array.test.ts', testName: 'getLastNItems returns exactly n items' },
    ],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 5, test_consistency: 5 },
  },
  {
    id: 'clean-null-check',
    description: 'Adds exactly the null check described, scoped, tests pass.',
    reasoningText:
      "Add a null check to formatUser so it doesn't throw when user is null; return 'Unknown' instead.",
    diff: `diff --git a/src/user.ts b/src/user.ts
index 1111111..2222222 100644
--- a/src/user.ts
+++ b/src/user.ts
@@ -1,4 +1,5 @@
 export function formatUser(user: User | null): string {
+  if (!user) return 'Unknown';
   return \`\${user.firstName} \${user.lastName}\`;
 }
`,
    atRiskTests: [{ testFile: 'src/user.test.ts', testName: 'formatUser handles null user' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 5, test_consistency: 5 },
  },
  {
    id: 'clean-rename',
    description: 'Pure rename for clarity, no behavior change, scoped, tests pass.',
    reasoningText: 'Rename the `tmp` variable in calculateTotal to `runningTotal` for clarity.',
    diff: `diff --git a/src/totals.ts b/src/totals.ts
index 1111111..2222222 100644
--- a/src/totals.ts
+++ b/src/totals.ts
@@ -1,7 +1,7 @@
 export function calculateTotal(items: number[]): number {
-  let tmp = 0;
+  let runningTotal = 0;
   for (const item of items) {
-    tmp += item;
+    runningTotal += item;
   }
-  return tmp;
+  return runningTotal;
 }
`,
    atRiskTests: [{ testFile: 'src/totals.test.ts', testName: 'calculateTotal sums correctly' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 5, test_consistency: 5 },
  },
  {
    id: 'clean-new-function',
    description: 'Adds a new function matching the description precisely, with a passing test.',
    reasoningText:
      'Add a `clamp(value, min, max)` utility function that constrains a number to a range.',
    diff: `diff --git a/src/math.ts b/src/math.ts
index 1111111..2222222 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,3 +1,7 @@
 export function add(a: number, b: number): number {
   return a + b;
 }
+
+export function clamp(value: number, min: number, max: number): number {
+  return Math.min(Math.max(value, min), max);
+}
`,
    atRiskTests: [{ testFile: 'src/math.test.ts', testName: 'clamp constrains value to range' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 5, test_consistency: 5 },
  },
  {
    id: 'clean-config-bump',
    description: 'Single-line config change matching the description exactly.',
    reasoningText: 'Increase the default request timeout from 5000ms to 10000ms as requested.',
    diff: `diff --git a/src/config.ts b/src/config.ts
index 1111111..2222222 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1 +1 @@
-export const DEFAULT_TIMEOUT_MS = 5000;
+export const DEFAULT_TIMEOUT_MS = 10000;
`,
    atRiskTests: [{ testFile: 'src/config.test.ts', testName: 'default timeout is 10000ms' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 5, test_consistency: 5 },
  },

  // --- bad intent match: diff doesn't do what the trajectory claims ---
  {
    id: 'bad-intent-inverted-fix',
    description: 'Trajectory claims a fix; diff actually introduces the bug.',
    reasoningText:
      'Fix the rounding bug in the multiply function so that multiply(2, 3) correctly returns 6 instead of 7.',
    diff: `diff --git a/src/math.ts b/src/math.ts
index 341e651..55a4600 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -3,5 +3,5 @@ export function add(a: number, b: number): number {
 }

 export function multiply(a: number, b: number): number {
-  return a * b;
+  return a * b + 1;
 }
`,
    atRiskTests: [{ testFile: 'src/math.test.ts', testName: 'multiplies two numbers' }],
    verdictStatus: 'fail',
    gold: { intent_match: 1, scope: 4, test_consistency: 1 },
  },
  {
    id: 'bad-intent-unrelated-rename',
    description:
      'Trajectory claims a null check; diff only renames the function, no null check added.',
    reasoningText:
      "Add a null check to processOrder so it doesn't crash when order.items is undefined.",
    diff: `diff --git a/src/orders.ts b/src/orders.ts
index 1111111..2222222 100644
--- a/src/orders.ts
+++ b/src/orders.ts
@@ -1,5 +1,5 @@
-export function processOrder(order: Order): number {
+export function handleOrder(order: Order): number {
   return order.items.reduce((sum, item) => sum + item.price, 0);
 }
diff --git a/src/checkout.ts b/src/checkout.ts
index 1111111..2222222 100644
--- a/src/checkout.ts
+++ b/src/checkout.ts
@@ -1,4 +1,4 @@
-import { processOrder } from './orders.js';
+import { handleOrder } from './orders.js';

 export function checkout(order: Order): void {
-  const total = processOrder(order);
+  const total = handleOrder(order);
 }
`,
    atRiskTests: [
      { testFile: 'src/orders.test.ts', testName: 'processOrder handles undefined items' },
    ],
    verdictStatus: 'fail',
    gold: { intent_match: 1, scope: 2, test_consistency: 1 },
  },
  {
    id: 'bad-intent-noop',
    description:
      'Trajectory claims a caching optimization; diff only adds a TODO comment, no logic change.',
    reasoningText:
      "Cache the result of expensiveLookup() so repeated calls with the same key don't recompute.",
    diff: `diff --git a/src/lookup.ts b/src/lookup.ts
index 1111111..2222222 100644
--- a/src/lookup.ts
+++ b/src/lookup.ts
@@ -1,3 +1,4 @@
+// TODO: consider caching
 export function expensiveLookup(key: string): number {
   return computeExpensiveThing(key);
 }
`,
    atRiskTests: [
      {
        testFile: 'src/lookup.test.ts',
        testName: 'expensiveLookup returns cached result on second call',
      },
    ],
    verdictStatus: 'fail',
    gold: { intent_match: 1, scope: 5, test_consistency: 1 },
  },

  // --- scope creep: correct core intent, but touches unrelated things ---
  {
    id: 'scope-unrelated-refactor',
    description: 'Correctly fixes the stated typo, but also refactors an unrelated logging module.',
    reasoningText: "Fix the typo 'recieved' -> 'received' in the validation error message.",
    diff: `diff --git a/src/validation.ts b/src/validation.ts
index 1111111..2222222 100644
--- a/src/validation.ts
+++ b/src/validation.ts
@@ -1,3 +1,3 @@
 export function validate(input: string): void {
-  if (!input) throw new Error('Value not recieved');
+  if (!input) throw new Error('Value not received');
 }
diff --git a/src/logger.ts b/src/logger.ts
index 1111111..2222222 100644
--- a/src/logger.ts
+++ b/src/logger.ts
@@ -1,5 +1,7 @@
 export function log(message: string): void {
-  console.log(message);
+  console.log(\`[\${new Date().toISOString()}] \${message}\`);
+  console.log('---');
+  console.log(JSON.stringify({ message }));
 }
`,
    atRiskTests: [{ testFile: 'src/validation.test.ts', testName: 'error message says received' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 1, test_consistency: 5 },
  },
  {
    id: 'scope-unrelated-behavior-break',
    description:
      'Adds the requested logging, but also changes unrelated behavior that breaks an at-risk test.',
    reasoningText: 'Add debug logging to fetchData() to log the request URL before each call.',
    diff: `diff --git a/src/fetch.ts b/src/fetch.ts
index 1111111..2222222 100644
--- a/src/fetch.ts
+++ b/src/fetch.ts
@@ -1,10 +1,12 @@
 export async function fetchData(url: string): Promise<unknown> {
+  console.debug('fetching', url);
   const res = await fetch(url);
   return parseResponse(await res.text());
 }

 export function parseResponse(body: string): unknown {
-  if (!body) return null;
+  if (!body) throw new Error('Empty response body');
   return JSON.parse(body);
 }
`,
    atRiskTests: [
      { testFile: 'src/fetch.test.ts', testName: 'parseResponse returns null for empty body' },
    ],
    verdictStatus: 'fail',
    gold: { intent_match: 4, scope: 1, test_consistency: 1 },
  },
  {
    id: 'scope-unrelated-config-files',
    description: 'Correct dependency bump, but also touches unrelated CI and lint config.',
    reasoningText:
      'Bump the `lodash` dependency from 4.17.19 to 4.17.21 to pick up the security patch.',
    diff: `diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -3,7 +3,7 @@
   "dependencies": {
-    "lodash": "4.17.19"
+    "lodash": "4.17.21"
   }
 }
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 1111111..2222222 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -10,3 +10,6 @@ jobs:
       - run: npm test
+      - name: Unrelated new step
+        run: echo "not part of the dependency bump"
diff --git a/.eslintrc.json b/.eslintrc.json
index 1111111..2222222 100644
--- a/.eslintrc.json
+++ b/.eslintrc.json
@@ -1,3 +1,3 @@
 {
-  "rules": { "no-console": "error" }
+  "rules": { "no-console": "off" }
 }
`,
    atRiskTests: [{ testFile: 'src/dependency.test.ts', testName: 'lodash version is 4.17.21' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 1, test_consistency: 5 },
  },

  // --- test-inconsistency: diff contradicts what the at-risk tests expect ---
  {
    id: 'test-consistency-removed-fallback',
    description: 'Diff removes a fallback path an at-risk test still requires.',
    reasoningText:
      'Simplify getConfigValue by removing the fallback null case -- every caller now always provides a default.',
    diff: `diff --git a/src/config.ts b/src/config.ts
index 1111111..2222222 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,3 @@
 export function getConfigValue(key: string): string | null {
-  return process.env[key] ?? null;
+  return process.env[key];
 }
`,
    atRiskTests: [
      {
        testFile: 'src/config.test.ts',
        testName: 'getConfigValue returns null when key is missing',
      },
    ],
    verdictStatus: 'fail',
    gold: { intent_match: 4, scope: 4, test_consistency: 1 },
  },
  {
    id: 'test-consistency-breaking-rename',
    description: 'Rename claimed as "no behavior change" but breaks the at-risk test\'s import.',
    reasoningText:
      'Rename `validateInput` to `validatePayload` for clarity -- purely a rename, no behavior change.',
    diff: `diff --git a/src/validate.ts b/src/validate.ts
index 1111111..2222222 100644
--- a/src/validate.ts
+++ b/src/validate.ts
@@ -1,3 +1,3 @@
-export function validateInput(s: string): boolean {
+export function validatePayload(s: string): boolean {
   return s.length > 0;
 }
`,
    atRiskTests: [
      { testFile: 'src/validate.test.ts', testName: 'validateInput rejects empty strings' },
    ],
    verdictStatus: 'fail',
    gold: { intent_match: 3, scope: 5, test_consistency: 1 },
  },

  // --- mixed: not clean, not a single-axis failure -- exercises mid-range scores ---
  {
    id: 'mixed-partial-validation',
    description: 'Correct intent and scope, but the diff only partially covers what tests expect.',
    reasoningText: 'Add input validation to createUser: reject empty email and empty name.',
    diff: `diff --git a/src/user.ts b/src/user.ts
index 1111111..2222222 100644
--- a/src/user.ts
+++ b/src/user.ts
@@ -1,4 +1,6 @@
 export function createUser(email: string, name: string): User {
+  if (!email) throw new Error('email required');
+  if (!name) throw new Error('name required');
   return { email, name };
 }
`,
    atRiskTests: [
      { testFile: 'src/user.test.ts', testName: 'createUser rejects empty name' },
      { testFile: 'src/user.test.ts', testName: 'createUser rejects whitespace-only name' },
    ],
    verdictStatus: 'fail',
    gold: { intent_match: 4, scope: 5, test_consistency: 3 },
  },
  {
    id: 'mixed-cosmetic-scope-noise',
    description:
      'Correct, well-tested fix plus a purely cosmetic (whitespace-only) unrelated diff.',
    reasoningText:
      "Fix the date formatting bug so formatDate(new Date('2026-01-05')) returns '2026-01-05' instead of '2026-1-5'.",
    diff: `diff --git a/src/date.ts b/src/date.ts
index 1111111..2222222 100644
--- a/src/date.ts
+++ b/src/date.ts
@@ -1,10 +1,10 @@
 export function formatDate(d: Date): string {
-  return \`\${d.getFullYear()}-\${d.getMonth() + 1}-\${d.getDate()}\`;
+  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
 }

 export function formatTime(d: Date): string {
-    return \`\${d.getHours()}:\${d.getMinutes()}\`;
+  return \`\${d.getHours()}:\${d.getMinutes()}\`;
 }
`,
    atRiskTests: [{ testFile: 'src/date.test.ts', testName: 'formatDate zero-pads month and day' }],
    verdictStatus: 'pass',
    gold: { intent_match: 5, scope: 3, test_consistency: 5 },
  },
];
