import { beforeEach, describe, expect, it } from "vitest";

import { InFlightDeduper, LruCacheAdapter } from "./cache";

describe("LruCacheAdapter", () => {
  let cache: LruCacheAdapter<string>;

  beforeEach(() => {
    cache = new LruCacheAdapter<string>(10);
  });

  it("should store and retrieve values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("should return undefined for non-existent keys", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("should expire values after TTL", async () => {
    cache.set("key1", "value1", 100);
    expect(cache.get("key1")).toBe("value1");

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(cache.get("key1")).toBeUndefined();
  });

  it("should not expire values without TTL", async () => {
    cache.set("key1", "value1");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get("key1")).toBe("value1");
  });

  it("should delete values", () => {
    cache.set("key1", "value1");
    cache.delete("key1");
    expect(cache.get("key1")).toBeUndefined();
  });

  it("should clear all values", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.clear();
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });

  it("should respect max size", () => {
    const smallCache = new LruCacheAdapter<string>(2);
    smallCache.set("key1", "value1");
    smallCache.set("key2", "value2");
    smallCache.set("key3", "value3"); // Should evict key1

    expect(smallCache.get("key1")).toBeUndefined();
    expect(smallCache.get("key2")).toBe("value2");
    expect(smallCache.get("key3")).toBe("value3");
  });
});

describe("InFlightDeduper", () => {
  let deduper: InFlightDeduper<string>;

  beforeEach(() => {
    deduper = new InFlightDeduper<string>();
  });

  it("should store and retrieve promises", () => {
    const promise = Promise.resolve("value");
    deduper.set("key1", promise);
    expect(deduper.get("key1")).toBe(promise);
  });

  it("should return undefined for non-existent keys", () => {
    expect(deduper.get("nonexistent")).toBeUndefined();
  });

  it("should remove promise after completion", async () => {
    const promise = Promise.resolve("value");
    deduper.set("key1", promise);
    await promise;
    // Wait a bit for cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(deduper.get("key1")).toBeUndefined();
  });

  it("should remove promise after rejection", async () => {
    const promise = Promise.reject(new Error("test"));
    deduper.set("key1", promise);
    await promise.catch(() => {});
    // Wait a bit for cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(deduper.get("key1")).toBeUndefined();
  });
});
