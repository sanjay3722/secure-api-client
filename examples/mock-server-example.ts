/**
 * Mock Server Example
 * 
 * This example shows how to use the mock server feature for testing and development:
 * - Setting up mock files
 * - Using mock mode
 * - Mock delays
 * - Different mock paths
 */

import { ApiClient } from "secure-fetch-client";

// Example 1: Basic mock setup
const mockClient = new ApiClient({
  baseUrl: "https://api.example.com",
  mockBaseUrl: "/mocks", // Default: "/mocks"
  mockDelayMs: 300, // Optional artificial delay to simulate network
});

// This will fetch /mocks/users.json instead of hitting the real API
async function getMockUsers() {
  const response = await mockClient.request<{ users: Array<{ id: string; name: string }> }>({
    url: "/users",
    method: "GET",
    mock: true, // Enable mock mode
  });

  if (response.ok) {
    console.log("Mock users:", response.data.users);
  }
}

// Example 2: Explicit mock path
async function getMockUserWithPath() {
  const response = await mockClient.request({
    url: "/users",
    method: "GET",
    mock: true,
    mockPath: "/users/list.json", // Explicit path: /mocks/users/list.json
  });

  return response;
}

// Example 3: Mock POST request
async function createMockUser() {
  const response = await mockClient.request({
    url: "/users",
    method: "POST",
    body: { name: "John", email: "john@example.com" },
    mock: true,
    mockPath: "/users/create.json", // /mocks/users/create.json
  });

  return response;
}

// Example 4: Conditional mock based on environment
const isDevelopment = process.env.NODE_ENV === "development";

const client = new ApiClient({
  baseUrl: "https://api.example.com",
  mockBaseUrl: "/mocks",
});

async function conditionalMock() {
  const response = await client.request({
    url: "/users",
    method: "GET",
    mock: isDevelopment, // Only use mocks in development
  });

  return response;
}

// Example 5: Mock file structure
/*
/public
  /mocks
    users.json              # GET /users
    users/
      list.json             # GET /users with mockPath
      create.json           # POST /users
      [id].json             # GET /users/:id
    posts.json
    posts/
      create.json
    comments.json
*/

// Example 6: Mock with different responses
async function mockWithVariations() {
  // Success response
  const successResponse = await mockClient.request({
    url: "/users",
    method: "GET",
    mock: true,
    mockPath: "/users/success.json",
  });

  // Error response
  const errorResponse = await mockClient.request({
    url: "/users",
    method: "GET",
    mock: true,
    mockPath: "/users/error.json",
  });

  return { successResponse, errorResponse };
}

// Example 7: Mock delay simulation
const delayedMockClient = new ApiClient({
  baseUrl: "https://api.example.com",
  mockBaseUrl: "/mocks",
  mockDelayMs: 1000, // 1 second delay
});

async function delayedMock() {
  console.time("Mock request");
  const response = await delayedMockClient.request({
    url: "/users",
    method: "GET",
    mock: true,
  });
  console.timeEnd("Mock request"); // Should be ~1000ms

  return response;
}

// Example 8: Mock file examples
/*
// /mocks/users.json
{
  "users": [
    { "id": "1", "name": "John Doe", "email": "john@example.com" },
    { "id": "2", "name": "Jane Smith", "email": "jane@example.com" }
  ]
}

// /mocks/users/create.json
{
  "id": "3",
  "name": "New User",
  "email": "new@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}

// /mocks/users/error.json
{
  "code": "ERR_NOT_FOUND",
  "message": "Users not found",
  "details": null
}
*/

// Example 9: Testing with mocks
async function testWithMocks() {
  // Test successful response
  const successTest = await mockClient.request({
    url: "/users",
    method: "GET",
    mock: true,
    mockPath: "/users/success.json",
  });
  console.assert(successTest.ok === true, "Should succeed");

  // Test error response
  const errorTest = await mockClient.request({
    url: "/users",
    method: "GET",
    mock: true,
    mockPath: "/users/error.json",
  });
  console.assert(errorTest.ok === false, "Should fail");
}

// Example 10: Switching between mock and real API
class FlexibleClient {
  private client: ApiClient;
  private useMock: boolean;

  constructor(baseUrl: string, useMock = false) {
    this.client = new ApiClient({
      baseUrl,
      mockBaseUrl: "/mocks",
    });
    this.useMock = useMock;
  }

  async request<T>(url: string, options?: { method?: string; body?: unknown }) {
    return this.client.request<T>({
      url,
      method: (options?.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "FORMDATA") || "GET",
      body: options?.body,
      mock: this.useMock,
    });
  }

  setMockMode(enabled: boolean) {
    this.useMock = enabled;
  }
}

const flexibleClient = new FlexibleClient("https://api.example.com", true);

// Use mock
await flexibleClient.request("/users");

// Switch to real API
flexibleClient.setMockMode(false);
await flexibleClient.request("/users");

export {
  getMockUsers,
  getMockUserWithPath,
  createMockUser,
  conditionalMock,
  mockWithVariations,
  delayedMock,
  testWithMocks,
  FlexibleClient,
};

