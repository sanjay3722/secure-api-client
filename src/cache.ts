import { LRUCache } from "lru-cache";

import type { ApiResponse, CacheAdapter } from "./types";

export class LruCacheAdapter<V = ApiResponse> implements CacheAdapter<V> {
  private cache: LRUCache<string, { value: V; expiresAt?: number }>;
  constructor(max = 500) {
    this.cache = new LRUCache({ max });
  }
  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key: string, value: V, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    this.cache.set(key, { value, expiresAt });
  }
  delete(key: string): void {
    this.cache.delete(key);
  }
  clear(): void {
    this.cache.clear();
  }
}

export class InFlightDeduper<T = unknown> {
  private map = new Map<string, Promise<T>>();
  get(key: string): Promise<T> | undefined {
    return this.map.get(key);
  }
  set(key: string, promise: Promise<T>): void {
    this.map.set(key, promise);
    void promise.finally(() => this.map.delete(key));
  }
}
