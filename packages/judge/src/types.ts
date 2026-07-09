export interface ExplainFailureInput {
  testFile: string;
  testName: string;
  message: string;
  stack?: string | undefined;
  /** Unified diff the test failed against -- without this the explanation has nothing concrete to point at. */
  diff: string;
  /** Agent's stated intent for the diff, if available (agent path only -- the PR/Actions path doesn't have one). */
  reasoningText?: string | undefined;
}

export interface ExplainFailureResult {
  rootCause: string;
  suggestedFix: string;
}

/** LLM provider config -- callers supply their own credentials (BYO key locally, or the backend's shared key). No default; nothing in this package reads process.env. */
export interface JudgeProviderConfig {
  apiKey: string;
  model: string;
  baseURL: string;
}
