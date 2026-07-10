export interface Mutation {
  /** Path relative to the fixture root, e.g. "src/plugins/upper.ts". */
  file: string;
  /** New file contents, replacing the committed baseline as an uncommitted edit. */
  content: string;
}

export interface Scenario {
  name: string;
  /** One line: what real-world pattern this models. */
  description: string;
  /** Directory name under src/fixtures/. */
  fixture: string;
  /** The regression to inject as an uncommitted change on top of the baseline commit. */
  mutation: Mutation;
  /** "testFile :: testName" that should fail once the mutation is applied. */
  expectedFailure: string;
  /** Whether this scenario targets the dynamic-import/DI blind spot, or is a plain
   *  static-import control case both tools are expected to catch. */
  kind: 'dynamic' | 'static-control';
}

export interface ArmResult {
  /** Whether this arm's test run actually surfaced expectedFailure as a failure. */
  caught: boolean;
  /** Free-form detail for the report (e.g. "0 test files selected" or a real failure message). */
  detail: string;
  durationMs: number;
}

export interface ScenarioResult {
  scenario: Scenario;
  trustGate: ArmResult;
  vitestChanged: ArmResult;
}

export interface BenchmarkReport {
  generatedAt: string;
  results: ScenarioResult[];
}
