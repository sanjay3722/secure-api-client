## secure-api-client

Framework-agnostic secure API client with JWT auth, caching, streaming, and optional encryption gateway.

### Install

```bash
npm i secure-api-client
```

### Quick start

```ts
import { ApiClient, AesGcmEncryption } from "secure-api-client";

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

# secure-api-client
