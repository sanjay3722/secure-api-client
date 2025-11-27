/**
 * Basic Usage Example
 *
 * This example demonstrates the fundamental features of secure-fetch-client:
 * - Creating a client
 * - Making GET, POST, PUT, DELETE requests
 * - Handling responses and errors
 * - Using query parameters
 */

import { ApiClient } from "secure-fetch-client";

// Create a client with base URL
const client = new ApiClient({
  baseUrl: "https://api.example.com",
  defaultHeaders: {
    "x-client": "my-app",
  },
});

// Example 1: GET request
async function getUsers() {
  const response = await client.request<{ users: Array<{ id: string; name: string }> }>({
    url: "/users",
    method: "GET",
  });

  if (response.ok) {
    console.log("Users:", response.data.users);
  } else {
    console.error("Error:", response.error.message);
  }
}

// Example 2: GET request with query parameters
async function searchUsers(query: string) {
  const response = await client.request({
    url: "/users/search",
    method: "GET",
    query: {
      q: query,
      limit: 10,
      page: 1,
    },
  });

  if (response.ok) {
    return response.data;
  }
  throw new Error(response.error.message);
}

// Example 3: POST request
async function createUser(name: string, email: string) {
  const response = await client.request<{ id: string }>({
    url: "/users",
    method: "POST",
    body: {
      name,
      email,
    },
  });

  if (response.ok) {
    console.log("Created user with ID:", response.data.id);
    return response.data;
  } else {
    console.error("Failed to create user:", response.error);
    return null;
  }
}

// Example 4: PUT request
async function updateUser(userId: string, updates: { name?: string; email?: string }) {
  const response = await client.request({
    url: `/users/${userId}`,
    method: "PUT",
    body: updates,
  });

  if (response.ok) {
    console.log("User updated:", response.data);
  } else {
    console.error("Update failed:", response.error);
  }
}

// Example 5: DELETE request
async function deleteUser(userId: string) {
  const response = await client.request({
    url: `/users/${userId}`,
    method: "DELETE",
  });

  if (response.ok) {
    console.log("User deleted successfully");
  } else {
    console.error("Delete failed:", response.error);
  }
}

// Example 6: Error handling
async function handleErrors() {
  const response = await client.request({
    url: "/users/999",
    method: "GET",
  });

  if (!response.ok) {
    switch (response.error.code) {
      case "ERR_NETWORK":
        console.error("Network error - check your connection");
        break;
      case "ERR_HTTP":
        if (response.status === 404) {
          console.error("User not found");
        } else if (response.status === 401) {
          console.error("Unauthorized - please login");
        }
        break;
      default:
        console.error("Error:", response.error.message);
    }
  }
}

// Example 7: Using AbortSignal for cancellation
async function cancellableRequest() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // Cancel after 5s

  try {
    const response = await client.request({
      url: "/users",
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.log("Request was cancelled");
    }
    throw error;
  }
}

export {
  getUsers,
  searchUsers,
  createUser,
  updateUser,
  deleteUser,
  handleErrors,
  cancellableRequest,
};
