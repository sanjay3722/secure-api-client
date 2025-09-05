import { nanoid } from "nanoid";

import { AuthManager } from "./auth";
import { InFlightDeduper, LruCacheAdapter } from "./cache";
import { AesGcmEncryption, decodeJson, encodeJson } from "./crypto";
import { makeErrorShape, toApiError } from "./errors";
import { streamResponse } from "./stream";
import { ApiErrorShape, ApiRequest, ApiResponse, ClientOptions, HttpMethod } from "./types";

const buildUrl = (
  baseUrl: string | undefined,
  path: string,
  query?: ApiRequest["query"],
): string => {
  const url = new URL(
    path,
    baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "http://localhost"),
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
};

const methodToInit = (
  method: HttpMethod,
  body: unknown,
  encryption: ClientOptions["encryption"],
): RequestInit => {
  if (method === "GET" || method === "DELETE") return {};
  if (method === "FORMDATA") {
    return { body: body as FormData };
  }
  if (encryption) {
    const data = encodeJson(body);
    return {
      body: new Blob([toArrayBuffer(data)], {
        type: "application/octet-stream",
      }),
    };
  }
  return { body: JSON.stringify(body) };
};

const defaultHeadersFor = (
  method: HttpMethod,
  encryption: ClientOptions["encryption"],
): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (method !== "GET" && method !== "DELETE" && method !== "FORMDATA") {
    headers["content-type"] = encryption ? "application/octet-stream" : "application/json";
  }
  headers["accept"] = "application/json, application/octet-stream;q=0.8, */*;q=0.5";
  return headers;
};

const toArrayBuffer = (view: Uint8Array): ArrayBuffer =>
  view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;

interface InternalOptions {
  baseUrl?: string;
  gatewayPath?: string;
  fetch: typeof globalThis.fetch;
  defaultHeaders: Record<string, string>;
  auth: NonNullable<ClientOptions["auth"]>;
  encryption: ClientOptions["encryption"];
  cache: ClientOptions["cache"];
  cacheTtlMs: number;
  enableInFlightDedup: boolean;
}

export class ApiClient {
  private options: InternalOptions;
  private auth: AuthManager;
  private cache?: LruCacheAdapter<ApiResponse> | null;
  private inflight: InFlightDeduper<ApiResponse>;

  constructor(options?: ClientOptions) {
    this.options = {
      baseUrl: options?.baseUrl ?? undefined,
      gatewayPath: options?.gatewayPath ?? undefined,
      fetch: options?.fetch ?? fetch.bind(globalThis),
      defaultHeaders: options?.defaultHeaders ?? {},
      auth: options?.auth ?? {},
      encryption: options?.encryption ?? null,
      cache: options?.cache ?? undefined,
      cacheTtlMs: options?.cacheTtlMs ?? 10_000,
      enableInFlightDedup: options?.enableInFlightDedup ?? true,
    };
    this.auth = new AuthManager(this.options.auth);
    this.cache =
      this.options.cache === false
        ? null
        : ((this.options.cache as LruCacheAdapter<ApiResponse>) ??
          new LruCacheAdapter<ApiResponse>());
    this.inflight = new InFlightDeduper<ApiResponse>();
  }

  async setTokens(tokens: { accessToken: string; refreshToken?: string | null }): Promise<void> {
    await this.auth.setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
    });
  }

  async clearTokens(): Promise<void> {
    await this.auth.clear();
  }

  withEncryption(secret: string | ArrayBuffer | Uint8Array): ApiClient {
    const enc = new AesGcmEncryption(secret);
    return new ApiClient({ ...this.options, encryption: enc });
  }

  async request<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    const method: HttpMethod = req.method ?? "GET";
    const url = buildUrl(this.options.baseUrl, req.url, req.query);
    const cacheKey = req.cacheKey ?? `${method}:${url}:${JSON.stringify(req.body ?? null)}`;

    if (this.cache) {
      const cached = this.cache.get(cacheKey) as ApiResponse<T> | undefined;
      if (cached) return cached;
    }

    if (this.options.enableInFlightDedup) {
      const inFlight = this.inflight.get(cacheKey);
      if (inFlight) return inFlight as Promise<ApiResponse<T>>;
    }

    const exec = this.execute<T>(url, method, req).then((res) => {
      if (this.cache && res.ok)
        this.cache.set(cacheKey, res as ApiResponse, this.options.cacheTtlMs);
      return res;
    });
    if (this.options.enableInFlightDedup) this.inflight.set(cacheKey, exec as Promise<ApiResponse>);
    return exec;
  }

  private async execute<T>(
    url: string,
    method: HttpMethod,
    req: ApiRequest,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      ...defaultHeadersFor(method, this.options.encryption),
      ...this.options.defaultHeaders,
      ...req.headers,
    };

    const token = await this.auth.getValidAccessToken();
    if (token) headers["authorization"] = `Bearer ${token}`;

    let response: Response;
    try {
      const init: RequestInit = {
        method: method === "FORMDATA" ? "POST" : method,
        headers,
        signal: req.signal,
        ...methodToInit(method, req.body, this.options.encryption),
      };

      if (this.options.encryption && init.body instanceof Blob) {
        const arrayBuffer = await init.body.arrayBuffer();
        const encrypted = await this.options.encryption.encrypt(new Uint8Array(arrayBuffer));
        // If gateway mode is enabled, send both target url and payload in encrypted envelope
        if (this.options.gatewayPath) {
          const envelope = encodeJson({
            id: nanoid(12),
            url,
            method,
            headers,
            payload: encrypted,
          });
          const cipher = await this.options.encryption.encrypt(envelope);
          init.body = new Blob([toArrayBuffer(cipher)], {
            type: "application/octet-stream",
          });
        } else {
          init.body = new Blob([toArrayBuffer(encrypted)], {
            type: "application/octet-stream",
          });
        }
      }

      response = await this.options.fetch(
        this.options.gatewayPath ? buildUrl(this.options.baseUrl, this.options.gatewayPath) : url,
        init,
      );
    } catch (e) {
      const err = toApiError(e, "ERR_NETWORK");
      return {
        ok: false,
        status: 0,
        headers: null,
        error: makeErrorShape(err),
      };
    }

    if (req.stream) {
      try {
        await streamResponse(response, req.streamHandlers ?? {});
        return {
          ok: true,
          status: response.status,
          headers: response.headers,
          data: undefined as unknown as T,
        };
      } catch (e) {
        const err = toApiError(e, "ERR_STREAM");
        return {
          ok: false,
          status: response.status,
          headers: response.headers,
          error: makeErrorShape(err),
        };
      }
    }

    try {
      const contentType = response.headers.get("content-type") ?? "";
      let data: unknown;
      if (contentType.includes("application/octet-stream") && this.options.encryption) {
        const buf = new Uint8Array(await response.arrayBuffer());
        const dec = await this.options.encryption.decrypt(buf);
        data = decodeJson(dec);
      } else if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text as unknown;
      }
      if (!response.ok) {
        const shape: ApiErrorShape =
          typeof data === "object" && data && "code" in (data as Record<string, unknown>)
            ? (data as ApiErrorShape)
            : { code: "ERR_HTTP", message: "Request failed", details: data };
        return {
          ok: false,
          status: response.status,
          headers: response.headers,
          error: shape,
        };
      }
      return {
        ok: true,
        status: response.status,
        headers: response.headers,
        data: data as T,
      };
    } catch (e) {
      const err = toApiError(e, "ERR_DECODE");
      return {
        ok: false,
        status: response.status,
        headers: response.headers,
        error: makeErrorShape(err),
      };
    }
  }
}
