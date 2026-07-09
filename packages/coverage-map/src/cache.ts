import type { CacheStore, CoverageEntry } from './types.js';

/** Process-lifetime cache. Callers that need durable caching (Postgres) implement `CacheStore` themselves. */
export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CoverageEntry>();

  async get(key: string): Promise<CoverageEntry | undefined> {
    return this.store.get(key);
  }

  async set(key: string, entry: CoverageEntry): Promise<void> {
    this.store.set(key, entry);
  }
}
