export type SymbolKind = 'function' | 'class' | 'method' | 'export' | 'variable';

export interface AffectedSymbol {
  file: string;
  name: string;
  kind: SymbolKind;
  startLine: number;
  endLine: number;
}

export type ImpactEdgeKind = 'imports' | 'calls' | 'covers';

export interface ImpactEdge {
  from: string;
  to: string;
  kind: ImpactEdgeKind;
  weight: number;
}

export interface ParsedFileDiff {
  file: string;
  /** 1-based line numbers in the *new* (post-change) version of the file. */
  changedLines: number[];
}

export interface ImpactGraphOptions {
  /** Max hops to walk outward from an affected symbol when finding callers. */
  maxCallerDepth?: number;
  /** Max hops to walk outward when finding files that import an affected file. */
  maxImportDepth?: number;
}

export interface ImpactGraph {
  affected: AffectedSymbol[];
  edges: ImpactEdge[];
}
