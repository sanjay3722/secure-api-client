import { decodeJwt } from "jose";
import type {
  ApiError,
  AuthConfig,
  TokenMetadata,
  TokenPair,
  TokenStorage,
} from "./types";

export class MemoryTokenStorage implements TokenStorage {
  private tokens: TokenPair & TokenMetadata = {
    accessToken: null,
    refreshToken: null,
  };
  getTokens() {
    return this.tokens;
  }
  setTokens(tokens: TokenPair & Partial<TokenMetadata>) {
    this.tokens = { ...this.tokens, ...tokens };
  }
  clear() {
    this.tokens = { accessToken: null, refreshToken: null };
  }
}

export const defaultIsTokenExpired = (meta: TokenMetadata): boolean => {
  if (!meta.accessTokenExpiresAt) return false;
  return Date.now() >= meta.accessTokenExpiresAt;
};

export class AuthManager {
  private storage: TokenStorage;
  private onRefresh?: (current: TokenPair) => Promise<TokenPair>;
  private isExpired: (meta: TokenMetadata) => boolean;

  constructor(config?: AuthConfig) {
    this.storage = config?.storage ?? new MemoryTokenStorage();
    this.onRefresh = config?.onRefresh;
    this.isExpired = config?.isTokenExpired ?? defaultIsTokenExpired;
  }

  async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.storage.getTokens();
    if (!tokens.accessToken) return null;

    const meta = await this.enrichMetadata(tokens);
    if (!this.isExpired(meta)) return tokens.accessToken;

    if (this.onRefresh && tokens.refreshToken) {
      const updated = await this.onRefresh({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      await this.setTokens(updated);
      return updated.accessToken;
    }
    return null;
  }

  async setTokens(tokens: TokenPair) {
    const meta = await this.enrichMetadata(tokens);
    await this.storage.setTokens({ ...tokens, ...meta });
  }

  async clear() {
    await this.storage.clear();
  }

  private async enrichMetadata(tokens: TokenPair): Promise<TokenMetadata> {
    let payload = null;
    let accessTokenExpiresAt: number | undefined;
    if (tokens.accessToken) {
      try {
        payload = decodeJwt(tokens.accessToken);
        if (typeof payload.exp === "number")
          accessTokenExpiresAt = payload.exp * 1000;
      } catch {}
    }
    return { payload, accessTokenExpiresAt };
  }
}
