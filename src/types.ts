import type { JWTPayload } from "jose";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "FORMDATA";

export interface ApiRequest {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  cacheKey?: string;
  stream?: boolean;
  streamHandlers?: StreamHandlers<Uint8Array>;
}

export type ApiResponse<T = unknown> =
  | {
      ok: true;
      status: number;
      headers: Headers;
      data: T;
    }
  | {
      ok: false;
      status: number;
      headers: Headers | null;
      error: ApiErrorShape;
    };

export interface StreamHandlers<TChunk = Uint8Array> {
  onStart?: (status: number, headers: Headers) => void;
  onChunk?: (chunk: TChunk) => void;
  onError?: (error: ApiError) => void;
  onComplete?: () => void;
}

export interface TokenPair {
  accessToken: string | null;
  refreshToken?: string | null;
}

export interface TokenMetadata {
  accessTokenExpiresAt?: number; // epoch ms
  refreshTokenExpiresAt?: number; // epoch ms
  payload?: JWTPayload | null;
}

export interface TokenStorage {
  getTokens(): Promise<TokenPair & TokenMetadata> | (TokenPair & TokenMetadata);
  setTokens(tokens: TokenPair & Partial<TokenMetadata>): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface JwtOptions {
  clockToleranceSec?: number;
}

export interface AuthConfig {
  storage?: TokenStorage;
  jwt?: JwtOptions;
  onRefresh?: (current: TokenPair) => Promise<TokenPair>;
  isTokenExpired?: (meta: TokenMetadata) => boolean;
  setTokenMetadata?: (
    tokens: TokenPair
  ) => Promise<TokenMetadata> | TokenMetadata;
}

export interface EncryptionAdapter {
  encrypt(data: Uint8Array): Promise<Uint8Array>;
  decrypt(data: Uint8Array): Promise<Uint8Array>;
}

export interface CacheAdapter<V = unknown> {
  get(key: string): V | undefined;
  set(key: string, value: V, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
}

export interface ClientOptions {
  baseUrl?: string;
  gatewayPath?: string; // Optional single gateway endpoint to hide real URLs
  fetch?: typeof globalThis.fetch;
  defaultHeaders?: Record<string, string>;
  auth?: AuthConfig;
  encryption?: EncryptionAdapter | null;
  cache?: CacheAdapter<ApiResponse> | false;
  cacheTtlMs?: number;
  enableInFlightDedup?: boolean;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: unknown;
  constructor(
    message: string,
    code = "ERR_API",
    status?: number,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
