/** Source line numbers (1-based) touched while running a given test file. */
export type CoveredLines = Record<string, number[]>;

export interface CoverageEntry {
  testFile: string;
  testFileHash: string;
  covers: CoveredLines;
  builtAt: number;
}

/** sourceFile -> testFile -> covered line numbers. What `impact` unions against the static graph. */
export type CoverageMap = Record<string, Record<string, number[]>>;

export interface CacheStore {
  get(key: string): Promise<CoverageEntry | undefined>;
  set(key: string, entry: CoverageEntry): Promise<void>;
}

export interface BuildCoverageMapOptions {
  /** Repo root the test files are run from; also where vitest is resolved from. */
  cwd: string;
  cache?: CacheStore;
}
