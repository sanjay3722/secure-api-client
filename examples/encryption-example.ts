/**
 * Encryption Example
 * 
 * This example demonstrates how to use AES-GCM encryption with secure-fetch-client:
 * - Basic encryption
 * - Gateway mode for endpoint hiding
 * - Server-side decryption example
 */

import { ApiClient, AesGcmEncryption } from "secure-fetch-client";

// Example 1: Basic encryption
async function basicEncryption() {
  const client = new ApiClient({
    baseUrl: "https://api.example.com",
  });

  // Create an encrypted client
  const secureClient = client.withEncryption("my-secret-key");

  // All requests are automatically encrypted
  const response = await secureClient.request({
    url: "/sensitive-data",
    method: "POST",
    body: {
      creditCard: "1234-5678-9012-3456",
      ssn: "123-45-6789",
    },
  });

  if (response.ok) {
    console.log("Encrypted request successful");
  }
}

// Example 2: Gateway mode (recommended for production)
async function gatewayMode() {
  const client = new ApiClient({
    baseUrl: "https://api.example.com",
    gatewayPath: "/gateway", // All encrypted requests go to this endpoint
  });

  const secureClient = client.withEncryption("shared-secret-key");

  // Request goes to /gateway with encrypted envelope containing:
  // - target URL (/users/secret-data)
  // - method (POST)
  // - headers
  // - encrypted payload
  const response = await secureClient.request({
    url: "/users/secret-data",
    method: "POST",
    body: {
      secret: "hidden data",
    },
  });

  if (response.ok) {
    console.log("Gateway request successful");
  }
}

// Example 3: Using different secrets for different clients
function createSecureClients() {
  const baseClient = new ApiClient({
    baseUrl: "https://api.example.com",
  });

  // Different encryption keys for different use cases
  const userDataClient = baseClient.withEncryption("user-data-secret");
  const paymentClient = baseClient.withEncryption("payment-secret");
  const adminClient = baseClient.withEncryption("admin-secret");

  return {
    userDataClient,
    paymentClient,
    adminClient,
  };
}

// Example 4: Server-side gateway implementation (Node.js/Express)
/*
import express from 'express';
import { AesGcmEncryption } from 'secure-fetch-client';

const app = express();
const encryption = new AesGcmEncryption('shared-secret-key');

app.post('/gateway', express.raw({ type: 'application/octet-stream' }), async (req, res) => {
  try {
    // Decrypt the envelope
    const encrypted = new Uint8Array(req.body);
    const decrypted = await encryption.decrypt(encrypted);
    const envelope = JSON.parse(new TextDecoder().decode(decrypted));
    
    // envelope contains: { id, url, method, headers, payload }
    const { url, method, headers, payload } = envelope;
    
    // Decrypt the actual payload
    const decryptedPayload = await encryption.decrypt(payload);
    const body = JSON.parse(new TextDecoder().decode(decryptedPayload));
    
    // Forward to actual endpoint
    const targetUrl = new URL(url, 'https://api.example.com');
    const response = await fetch(targetUrl.toString(), {
      method,
      headers: {
        ...headers,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const responseData = await response.json();
    
    // Encrypt the response
    const encryptedResponse = await encryption.encrypt(
      new TextEncoder().encode(JSON.stringify(responseData))
    );
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(encryptedResponse));
  } catch (error) {
    console.error('Gateway error:', error);
    res.status(500).json({ error: 'Decryption failed' });
  }
});
*/

// Example 5: Combining encryption with authentication
async function encryptedWithAuth() {
  const client = new ApiClient({
    baseUrl: "https://api.example.com",
    gatewayPath: "/gateway",
    auth: {
      onRefresh: async ({ refreshToken }) => {
        // Refresh token logic
        const response = await fetch("/auth/refresh", {
          method: "POST",
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

  // Set tokens
  await client.setTokens({
    accessToken: "jwt-access-token",
    refreshToken: "jwt-refresh-token",
  });

  // Create encrypted client
  const secureClient = client.withEncryption("secret-key");

  // Request includes both authentication and encryption
  const response = await secureClient.request({
    url: "/protected-data",
    method: "POST",
    body: { sensitive: "data" },
  });

  if (response.ok) {
    console.log("Encrypted and authenticated request successful");
  }
}

// Example 6: Encryption with custom storage
class SecureTokenStorage {
  private encryption: AesGcmEncryption;

  constructor(secret: string) {
    this.encryption = new AesGcmEncryption(secret);
  }

  async getTokens() {
    const encrypted = localStorage.getItem("encryptedTokens");
    if (!encrypted) return { accessToken: null, refreshToken: null };

    const decrypted = await this.encryption.decrypt(
      new Uint8Array(JSON.parse(encrypted)),
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  async setTokens(tokens: { accessToken: string | null; refreshToken?: string | null }) {
    const encoded = new TextEncoder().encode(JSON.stringify(tokens));
    const encrypted = await this.encryption.encrypt(encoded);
    localStorage.setItem("encryptedTokens", JSON.stringify(Array.from(encrypted)));
  }

  async clear() {
    localStorage.removeItem("encryptedTokens");
  }
}

async function encryptedTokenStorage() {
  const storage = new SecureTokenStorage("storage-secret");
  const client = new ApiClient({
    baseUrl: "https://api.example.com",
    auth: {
      storage: storage as unknown as import("secure-fetch-client").TokenStorage,
    },
  });

  await client.setTokens({
    accessToken: "token",
    refreshToken: "refresh",
  });
}

export {
  basicEncryption,
  gatewayMode,
  createSecureClients,
  encryptedWithAuth,
  encryptedTokenStorage,
};

