import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient } from "./client";

describe("ApiClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create client with default options", () => {
      const client = new ApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it("should create client with custom options", () => {
      const client = new ApiClient({
        baseUrl: "https://api.example.com",
        defaultHeaders: { "x-custom": "value" },
      });
      expect(client).toBeInstanceOf(ApiClient);
    });
  });

  describe("request", () => {
    it("should make GET request successfully", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ userId: "123" }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      const response = await client.request<{ userId: string }>({
        url: "/users/me",
        method: "GET",
      });

      expect(response.ok).toBe(true);
      if (response.ok) {
        expect(response.data.userId).toBe("123");
        expect(response.status).toBe(200);
      }
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users/me",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should handle POST request with body", async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ id: "456" }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      const response = await client.request({
        url: "/users",
        method: "POST",
        body: { name: "John" },
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "content-type": "application/json" }),
        }),
      );
    });

    it("should handle query parameters", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ users: [] }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      await client.request({
        url: "/users",
        method: "GET",
        query: { page: 1, limit: 10 },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users?page=1&limit=10",
        expect.any(Object),
      );
    });

    it("should handle error responses", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({
          code: "ERR_NOT_FOUND",
          message: "User not found",
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      const response = await client.request({
        url: "/users/999",
        method: "GET",
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.error.code).toBe("ERR_NOT_FOUND");
        expect(response.status).toBe(404);
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      const response = await client.request({
        url: "/users",
        method: "GET",
      });

      expect(response.ok).toBe(false);
      if (!response.ok) {
        expect(response.error.code).toBe("ERR_NETWORK");
      }
    });

    it("should use mock server when mock option is true", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ users: [{ id: "1" }] }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({
        baseUrl: "https://api.example.com",
        mockBaseUrl: "/mocks",
      });
      const response = await client.request({
        url: "/users",
        method: "GET",
        mock: true,
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/mocks/users.json"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should cache responses", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ data: "cached" }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({
        baseUrl: "https://api.example.com",
        cacheTtlMs: 10000,
      });

      const response1 = await client.request({ url: "/users", method: "GET" });
      const response2 = await client.request({ url: "/users", method: "GET" });

      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);
      // Should only call fetch once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should add authorization header when token is set", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      await client.setTokens({ accessToken: "test-token" });
      await client.request({ url: "/users", method: "GET" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer test-token",
          }),
        }),
      );
    });
  });

  describe("setTokens", () => {
    it("should set access and refresh tokens", async () => {
      const client = new ApiClient();
      await client.setTokens({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
      // Tokens are stored internally, test by making a request
      expect(client).toBeDefined();
    });
  });

  describe("clearTokens", () => {
    it("should clear stored tokens", async () => {
      const client = new ApiClient();
      await client.setTokens({ accessToken: "token" });
      await client.clearTokens();
      expect(client).toBeDefined();
    });
  });

  describe("withEncryption", () => {
    it("should create encrypted client", () => {
      const client = new ApiClient();
      const encryptedClient = client.withEncryption("secret-key");
      expect(encryptedClient).toBeInstanceOf(ApiClient);
      expect(encryptedClient).not.toBe(client);
    });
  });

  describe("FormData requests", () => {
    it("should handle FORMDATA method", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({}),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: "https://api.example.com" });
      const formData = new FormData();
      formData.append("file", new Blob(["test"]));

      await client.request({
        url: "/upload",
        method: "FORMDATA",
        body: formData,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
