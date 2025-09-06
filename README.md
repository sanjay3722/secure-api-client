## secure-fetch-client

[![npm version](https://img.shields.io/npm/v/secure-fetch-client.svg)](https://www.npmjs.com/package/secure-fetch-client)
[![npm downloads](https://img.shields.io/npm/dm/secure-fetch-client.svg)](https://www.npmjs.com/package/secure-fetch-client)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Lightweight, framework-agnostic HTTP client for secure APIs: JWT, LRU cache, streaming, and optional AES‑GCM encryption via WebCrypto with a single decrypting gateway.

### Summary

A secure, robust, and fast API utility library that works seamlessly with any frontend framework, including Angular, React, and Vue. It simplifies API calls, supports mock JSON APIs for testing, and ensures smooth integration with modern applications.

### Install

```bash
npm i secure-fetch-client
```

### Quick start

```ts
import { ApiClient, AesGcmEncryption } from "secure-fetch-client";

const client = new ApiClient({ baseUrl: "/api" });

// Optional: enable encryption to hide payloads (requires a server gateway to decrypt)
const secureClient = client.withEncryption("my-strong-secret");

// Set tokens when you get them
await client.setTokens({
  accessToken: "jwt-access",
  refreshToken: "jwt-refresh",
});

// JSON request
const res = await client.request<{ userId: string }>({
  url: "/users/me",
  method: "GET",
});
if (res.ok) console.log(res.data.userId);
else console.error(res.error);

// FormData upload
const fd = new FormData();
fd.append("file", file);
await client.request({ url: "/upload", method: "FORMDATA", body: fd });

// Streaming
await client.request({
  url: "/stream",
  method: "GET",
  stream: true,
  streamHandlers: {
    onStart: (status) => console.log("status", status),
    onChunk: (chunk) => console.log("len", chunk.length),
  },
});
```

### Mock server

- Pass `mock: true` to return data from a local/mock JSON instead of the live API.
- The client will GET `{mockBaseUrl}/{mockPath||url}.json` and return its contents.
- Options:
  - Request: `mock?: boolean`, `mockPath?: string` (e.g., "/users/list.json")
  - Client: `mockBaseUrl?: string` (default `"/mocks"`), `mockDelayMs?: number`

Example:

```ts
const client = new ApiClient({ baseUrl: "/api", mockBaseUrl: "/mocks", mockDelayMs: 300 });

// Will fetch "/mocks/users.json" and return it
const users = await client.request<{ users: Array<{ id: string }> }>({
  url: "/users",
  method: "GET",
  mock: true,
});

// Explicit mock path
const post = await client.request<{ ok: boolean }>({
  url: "/posts",
  method: "POST",
  body: { title: "hello" },
  mock: true,
  mockPath: "/posts/create.json",
});
```

### React/Angular/Vue usage

- React: call in `useEffect`, SWR/React Query compatible. Provide `fetch` via options to integrate.
- Angular: inject as service wrapper; the client is framework-agnostic.
- Vue: use in composables; client exposes plain Promise API.

### Features

- JWT handling with pluggable storage and refresh callback
- LRU response cache and in-flight deduplication
- Optional AES-GCM encryption via WebCrypto; supports single gateway endpoint with encrypted envelope
- Streaming helpers
- Custom error types with codes and details

### Configuration

```ts
const client = new ApiClient({
  baseUrl: "https://api.example.com",
  gatewayPath: "/gateway", // If set, all encrypted requests post to this path
  defaultHeaders: { "x-client": "my-app" },
  auth: {
    onRefresh: async ({ refreshToken }) => {
      // call your refresh endpoint
      const r = await fetch("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      const j = await r.json();
      return { accessToken: j.accessToken, refreshToken: j.refreshToken };
    },
  },
  cacheTtlMs: 10000,
});
```

### Security note

- To truly hide endpoints/payloads from browser devtools, route encrypted requests to a single `gatewayPath` on your domain and decrypt on the server.
- Without a gateway, encryption only hides payload bodies but URLs/headers remain visible.

### API surface

- `ApiClient.request(req)` → `ApiResponse<T>` with `{ ok, status, headers, data | error }`
- `ApiClient.setTokens({ accessToken, refreshToken? })`
- `ApiClient.clearTokens()`
- `ApiClient.withEncryption(secret)` returns a new `ApiClient` with AES-GCM adapter
- `AesGcmEncryption` implements `EncryptionAdapter`

# secure-fetch-client
