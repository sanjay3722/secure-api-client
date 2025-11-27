# secure-fetch-client

[![npm version](https://img.shields.io/npm/v/secure-fetch-client.svg)](https://www.npmjs.com/package/secure-fetch-client)
[![npm downloads](https://img.shields.io/npm/dm/secure-fetch-client.svg)](https://www.npmjs.com/package/secure-fetch-client)
[![bundlephobia](https://img.shields.io/bundlephobia/minzip/secure-fetch-client)](https://bundlephobia.com/package/secure-fetch-client)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/sanjay3722/secure-api-client/ci.yml?branch=main&label=build)](https://github.com/sanjay3722/secure-api-client/actions/workflows/ci.yml)

> Lightweight, framework-agnostic HTTP client for secure APIs: JWT, LRU cache, streaming, and optional AES‑GCM encryption via WebCrypto with a single decrypting gateway.

A secure, robust, and fast API utility library that works seamlessly with any frontend framework, including Angular, React, and Vue. It simplifies API calls, supports mock JSON APIs for testing, and ensures smooth integration with modern applications.

## 📦 Install

```bash
npm i secure-fetch-client
```

## 🚀 Quick Start

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

## 🎯 Features

- ✅ **JWT Authentication** - Automatic token management with refresh callbacks
- ✅ **LRU Cache** - Built-in response caching with TTL support
- ✅ **In-Flight Deduplication** - Prevents duplicate concurrent requests
- ✅ **AES-GCM Encryption** - Optional end-to-end encryption via WebCrypto API
- ✅ **Streaming Support** - Handle streaming responses with chunk callbacks
- ✅ **Mock Server** - Easy testing with local JSON mock files
- ✅ **TypeScript** - Full type safety and IntelliSense support
- ✅ **Framework Agnostic** - Works with React, Angular, Vue, and vanilla JS
- ✅ **Zero Dependencies** (runtime) - Uses native Web APIs

## 📚 Documentation

### Basic Usage

#### Creating a Client

```ts
import { ApiClient } from "secure-fetch-client";

const client = new ApiClient({
  baseUrl: "https://api.example.com",
  defaultHeaders: {
    "x-client": "my-app",
  },
});
```

#### Making Requests

```ts
// GET request
const response = await client.request<{ users: User[] }>({
  url: "/users",
  method: "GET",
  query: { page: 1, limit: 10 },
});

if (response.ok) {
  console.log(response.data.users);
} else {
  console.error(response.error.code, response.error.message);
}

// POST request
const createResponse = await client.request<{ id: string }>({
  url: "/users",
  method: "POST",
  body: { name: "John", email: "john@example.com" },
});

// PUT/PATCH/DELETE
await client.request({ url: "/users/123", method: "PUT", body: { name: "Jane" } });
await client.request({ url: "/users/123", method: "PATCH", body: { email: "jane@example.com" } });
await client.request({ url: "/users/123", method: "DELETE" });
```

### Authentication

#### Setting Tokens

```ts
await client.setTokens({
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
});
```

#### Token Refresh

```ts
const client = new ApiClient({
  baseUrl: "/api",
  auth: {
    onRefresh: async ({ refreshToken }) => {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json();
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    },
  },
});
```

#### Custom Token Storage

```ts
import { TokenStorage } from "secure-fetch-client";

class MyTokenStorage implements TokenStorage {
  async getTokens() {
    // Retrieve from your storage (localStorage, IndexedDB, etc.)
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
    };
  }

  async setTokens(tokens) {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
  }

  async clear() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

const client = new ApiClient({
  baseUrl: "/api",
  auth: {
    storage: new MyTokenStorage(),
  },
});
```

### Caching

#### Default LRU Cache

The client uses an LRU cache by default with a 10-second TTL:

```ts
const client = new ApiClient({
  baseUrl: "/api",
  cacheTtlMs: 30000, // 30 seconds
});

// Cached response
const response1 = await client.request({ url: "/users", method: "GET" });
// Returns from cache (if within TTL)
const response2 = await client.request({ url: "/users", method: "GET" });
```

#### Custom Cache

```ts
import { CacheAdapter } from "secure-fetch-client";

class MyCache implements CacheAdapter {
  private cache = new Map();

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttlMs?: number) {
    this.cache.set(key, value);
    if (ttlMs) {
      setTimeout(() => this.cache.delete(key), ttlMs);
    }
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

const client = new ApiClient({
  baseUrl: "/api",
  cache: new MyCache(),
});
```

#### Disable Caching

```ts
const client = new ApiClient({
  baseUrl: "/api",
  cache: false,
});
```

### Encryption

#### Basic Encryption

```ts
import { ApiClient, AesGcmEncryption } from "secure-fetch-client";

const client = new ApiClient({ baseUrl: "/api" });
const secureClient = client.withEncryption("my-secret-key");

// All requests are encrypted
const response = await secureClient.request({
  url: "/sensitive-data",
  method: "POST",
  body: { secret: "data" },
});
```

#### Gateway Mode (Recommended)

For true endpoint hiding, use a gateway that decrypts on the server:

```ts
const client = new ApiClient({
  baseUrl: "https://api.example.com",
  gatewayPath: "/gateway", // All encrypted requests go here
});

const secureClient = client.withEncryption("shared-secret");

// Request goes to /gateway with encrypted envelope containing:
// - target URL
// - method
// - headers
// - encrypted payload
await secureClient.request({
  url: "/users/secret-data",
  method: "POST",
  body: { data: "hidden" },
});
```

**Server-side gateway example:**

```ts
// Server endpoint: POST /gateway
app.post("/gateway", async (req, res) => {
  const encrypted = await req.arrayBuffer();
  const decrypted = await encryption.decrypt(new Uint8Array(encrypted));
  const envelope = JSON.parse(new TextDecoder().decode(decrypted));

  // envelope contains: { id, url, method, headers, payload }
  // Forward to actual endpoint and return encrypted response
});
```

### Streaming

```ts
await client.request({
  url: "/stream",
  method: "GET",
  stream: true,
  streamHandlers: {
    onStart: (status, headers) => {
      console.log("Stream started", status);
    },
    onChunk: (chunk) => {
      console.log("Received chunk:", chunk.length, "bytes");
      // Process chunk
    },
    onError: (error) => {
      console.error("Stream error:", error);
    },
    onComplete: () => {
      console.log("Stream completed");
    },
  },
});
```

### Mock Server

For testing and development, use mock JSON files:

```ts
const client = new ApiClient({
  baseUrl: "/api",
  mockBaseUrl: "/mocks", // Default: "/mocks"
  mockDelayMs: 300, // Optional artificial delay
});

// Fetches /mocks/users.json
const users = await client.request<{ users: User[] }>({
  url: "/users",
  method: "GET",
  mock: true,
});

// Explicit mock path
const post = await client.request({
  url: "/posts",
  method: "POST",
  body: { title: "Hello" },
  mock: true,
  mockPath: "/posts/create.json", // Fetches /mocks/posts/create.json
});
```

**Mock file structure:**

```
/public
  /mocks
    users.json
    posts.json
    posts/
      create.json
```

### Error Handling

```ts
const response = await client.request({ url: "/users", method: "GET" });

if (!response.ok) {
  switch (response.error.code) {
    case "ERR_NETWORK":
      console.error("Network error");
      break;
    case "ERR_HTTP":
      console.error("HTTP error:", response.status);
      break;
    case "ERR_DECODE":
      console.error("Failed to decode response");
      break;
    default:
      console.error(response.error.message, response.error.details);
  }
}
```

### Advanced Configuration

```ts
const client = new ApiClient({
  baseUrl: "https://api.example.com",
  gatewayPath: "/gateway",
  defaultHeaders: {
    "x-client": "my-app",
    "x-version": "1.0.0",
  },
  fetch: customFetch, // Custom fetch implementation
  auth: {
    storage: new CustomTokenStorage(),
    onRefresh: refreshCallback,
    jwt: {
      clockToleranceSec: 60, // JWT clock skew tolerance
    },
  },
  cache: new CustomCache(),
  cacheTtlMs: 60000,
  enableInFlightDedup: true, // Prevent duplicate concurrent requests
  mockBaseUrl: "/mocks",
  mockDelayMs: 200,
});
```

## 🎨 Framework Integration

### React

```tsx
import { useEffect, useState } from "react";
import { ApiClient } from "secure-fetch-client";

const client = new ApiClient({ baseUrl: "/api" });

function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    client.request({ url: "/users/me", method: "GET" }).then((res) => {
      if (res.ok) setUser(res.data);
    });
  }, []);

  return <div>{user?.name}</div>;
}
```

**With SWR/React Query:**

```tsx
import useSWR from "swr";
import { ApiClient } from "secure-fetch-client";

const client = new ApiClient({ baseUrl: "/api" });

const fetcher = (url: string) =>
  client.request({ url, method: "GET" }).then((res) => {
    if (!res.ok) throw new Error(res.error.message);
    return res.data;
  });

function Users() {
  const { data, error } = useSWR("/users", fetcher);
  // ...
}
```

### Angular

```ts
import { Injectable } from "@angular/core";
import { ApiClient } from "secure-fetch-client";

@Injectable({ providedIn: "root" })
export class ApiService {
  private client = new ApiClient({ baseUrl: "/api" });

  getUsers() {
    return this.client.request({ url: "/users", method: "GET" });
  }
}
```

### Vue

```ts
import { ref, onMounted } from "vue";
import { ApiClient } from "secure-fetch-client";

const client = new ApiClient({ baseUrl: "/api" });

export function useUsers() {
  const users = ref([]);

  onMounted(async () => {
    const res = await client.request({ url: "/users", method: "GET" });
    if (res.ok) users.value = res.data;
  });

  return { users };
}
```

## 🔒 Security Notes

- **Encryption without gateway**: Only hides payload bodies. URLs and headers remain visible in browser devtools.
- **Encryption with gateway**: Routes all encrypted requests to a single endpoint, hiding URLs, methods, and payloads. Requires server-side decryption.
- **JWT tokens**: Stored in memory by default. Use custom storage for persistence (localStorage, IndexedDB, etc.).
- **HTTPS**: Always use HTTPS in production to protect data in transit.

## 📖 API Reference

### `ApiClient`

#### Constructor

```ts
new ApiClient(options?: ClientOptions)
```

#### Methods

- `request<T>(req: ApiRequest): Promise<ApiResponse<T>>` - Make an API request
- `setTokens(tokens: TokenPair): Promise<void>` - Set access and refresh tokens
- `clearTokens(): Promise<void>` - Clear stored tokens
- `withEncryption(secret: string | ArrayBuffer | Uint8Array): ApiClient` - Create encrypted client

### Types

```ts
interface ApiRequest {
  url: string;
  method?: HttpMethod; // "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "FORMDATA"
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  cacheKey?: string;
  stream?: boolean;
  streamHandlers?: StreamHandlers;
  mock?: boolean;
  mockPath?: string;
}

type ApiResponse<T> =
  | { ok: true; status: number; headers: Headers; data: T }
  | { ok: false; status: number; headers: Headers | null; error: ApiErrorShape };

interface ClientOptions {
  baseUrl?: string;
  gatewayPath?: string;
  fetch?: typeof globalThis.fetch;
  defaultHeaders?: Record<string, string>;
  auth?: AuthConfig;
  encryption?: EncryptionAdapter | null;
  cache?: CacheAdapter<ApiResponse> | false;
  cacheTtlMs?: number;
  enableInFlightDedup?: boolean;
  mockBaseUrl?: string;
  mockDelayMs?: number;
}
```

## 🧪 Testing

```bash
npm test
```

See the [examples](./examples) folder for usage examples.

## 📝 Examples

Check out the [examples](./examples) folder for:

- Basic usage examples
- Framework-specific integrations
- Encryption examples
- Mock server setup
- Streaming examples

## 🎥 Live Demo

- [StackBlitz](https://stackblitz.com/edit/secure-fetch-client-demo)
- [CodeSandbox](https://codesandbox.io/s/secure-fetch-client-demo)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [sanjay3722](https://github.com/sanjay3722)
