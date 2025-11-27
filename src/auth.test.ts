import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthManager, defaultIsTokenExpired, MemoryTokenStorage } from "./auth";
import type { TokenStorage } from "./types";

describe("MemoryTokenStorage", () => {
  it("should store and retrieve tokens", () => {
    const storage = new MemoryTokenStorage();
    storage.setTokens({
      accessToken: "access",
      refreshToken: "refresh",
    });

    const tokens = storage.getTokens();
    expect(tokens.accessToken).toBe("access");
    expect(tokens.refreshToken).toBe("refresh");
  });

  it("should clear tokens", () => {
    const storage = new MemoryTokenStorage();
    storage.setTokens({ accessToken: "access", refreshToken: "refresh" });
    storage.clear();

    const tokens = storage.getTokens();
    expect(tokens.accessToken).toBeNull();
    expect(tokens.refreshToken).toBeNull();
  });
});

describe("defaultIsTokenExpired", () => {
  it("should return false when no expiration", () => {
    expect(defaultIsTokenExpired({})).toBe(false);
  });

  it("should return false when token is not expired", () => {
    const future = Date.now() + 60000; // 1 minute in future
    expect(defaultIsTokenExpired({ accessTokenExpiresAt: future })).toBe(false);
  });

  it("should return true when token is expired", () => {
    const past = Date.now() - 60000; // 1 minute in past
    expect(defaultIsTokenExpired({ accessTokenExpiresAt: past })).toBe(true);
  });
});

describe("AuthManager", () => {
  let mockStorage: TokenStorage;
  let mockOnRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStorage = {
      getTokens: vi.fn().mockReturnValue({
        accessToken: null,
        refreshToken: null,
      }),
      setTokens: vi.fn(),
      clear: vi.fn(),
    };
    mockOnRefresh = vi.fn();
  });

  it("should return null when no access token", async () => {
    const manager = new AuthManager({ storage: mockStorage });
    const token = await manager.getValidAccessToken();
    expect(token).toBeNull();
  });

  it("should return access token when valid", async () => {
    const future = Date.now() + 60000;
    mockStorage.getTokens = vi.fn().mockReturnValue({
      accessToken: "valid-token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: future,
    });

    const manager = new AuthManager({ storage: mockStorage });
    const token = await manager.getValidAccessToken();
    expect(token).toBe("valid-token");
  });

  it("should refresh token when expired", async () => {
    const past = Date.now() - 60000;
    mockStorage.getTokens = vi.fn().mockReturnValue({
      accessToken: "expired-token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: past,
    });

    mockOnRefresh.mockResolvedValue({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    const manager = new AuthManager({
      storage: mockStorage,
      onRefresh: mockOnRefresh,
    });

    const token = await manager.getValidAccessToken();
    expect(token).toBe("new-access-token");
    expect(mockOnRefresh).toHaveBeenCalledWith({
      accessToken: "expired-token",
      refreshToken: "refresh-token",
    });
    expect(mockStorage.setTokens).toHaveBeenCalled();
  });

  it("should return null when refresh fails", async () => {
    const past = Date.now() - 60000;
    mockStorage.getTokens = vi.fn().mockReturnValue({
      accessToken: "expired-token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: past,
    });

    mockOnRefresh.mockRejectedValue(new Error("Refresh failed"));

    const manager = new AuthManager({
      storage: mockStorage,
      onRefresh: mockOnRefresh,
    });

    await expect(manager.getValidAccessToken()).rejects.toThrow();
  });

  it("should set tokens", async () => {
    const manager = new AuthManager({ storage: mockStorage });
    await manager.setTokens({
      accessToken: "new-token",
      refreshToken: "new-refresh",
    });

    expect(mockStorage.setTokens).toHaveBeenCalled();
  });

  it("should clear tokens", async () => {
    const manager = new AuthManager({ storage: mockStorage });
    await manager.clear();

    expect(mockStorage.clear).toHaveBeenCalled();
  });

  it("should use default storage when not provided", () => {
    const manager = new AuthManager();
    expect(manager).toBeInstanceOf(AuthManager);
  });
});
