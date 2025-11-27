import { describe, expect, it } from "vitest";

import { AesGcmEncryption, decodeJson, encodeJson } from "./crypto";

describe("AesGcmEncryption", () => {
  it("should encrypt and decrypt data", async () => {
    const encryption = new AesGcmEncryption("test-secret");
    const original = new TextEncoder().encode("Hello, World!");

    const encrypted = await encryption.encrypt(original);
    expect(encrypted).not.toEqual(original);
    expect(encrypted.length).toBeGreaterThan(original.length);

    const decrypted = await encryption.decrypt(encrypted);
    expect(decrypted).toEqual(original);
  });

  it("should encrypt and decrypt with ArrayBuffer secret", async () => {
    const secret = new TextEncoder().encode("my-secret-key");
    const encryption = new AesGcmEncryption(secret);
    const original = new TextEncoder().encode("Test data");

    const encrypted = await encryption.encrypt(original);
    const decrypted = await encryption.decrypt(encrypted);
    expect(decrypted).toEqual(original);
  });

  it("should produce different ciphertexts for same plaintext", async () => {
    const encryption = new AesGcmEncryption("secret");
    const original = new TextEncoder().encode("Same data");

    const encrypted1 = await encryption.encrypt(original);
    const encrypted2 = await encryption.encrypt(original);

    // Should be different due to random IV
    expect(encrypted1).not.toEqual(encrypted2);

    // But both should decrypt to same value
    const decrypted1 = await encryption.decrypt(encrypted1);
    const decrypted2 = await encryption.decrypt(encrypted2);
    expect(decrypted1).toEqual(original);
    expect(decrypted2).toEqual(original);
  });

  it("should fail to decrypt with wrong secret", async () => {
    const encryption1 = new AesGcmEncryption("secret1");
    const encryption2 = new AesGcmEncryption("secret2");
    const original = new TextEncoder().encode("Test");

    const encrypted = await encryption1.encrypt(original);
    await expect(encryption2.decrypt(encrypted)).rejects.toThrow();
  });

  it("should handle empty data", async () => {
    const encryption = new AesGcmEncryption("secret");
    const original = new Uint8Array(0);

    const encrypted = await encryption.encrypt(original);
    const decrypted = await encryption.decrypt(encrypted);
    expect(decrypted).toEqual(original);
  });
});

describe("encodeJson / decodeJson", () => {
  it("should encode and decode JSON", () => {
    const original = { name: "John", age: 30 };
    const encoded = encodeJson(original);
    expect(encoded).toBeInstanceOf(Uint8Array);

    const decoded = decodeJson(encoded);
    expect(decoded).toEqual(original);
  });

  it("should handle arrays", () => {
    const original = [1, 2, 3];
    const encoded = encodeJson(original);
    const decoded = decodeJson(encoded);
    expect(decoded).toEqual(original);
  });

  it("should handle nested objects", () => {
    const original = { user: { name: "John", tags: ["admin", "user"] } };
    const encoded = encodeJson(original);
    const decoded = decodeJson(encoded);
    expect(decoded).toEqual(original);
  });

  it("should handle null and undefined", () => {
    expect(decodeJson(encodeJson(null))).toBeNull();
    expect(decodeJson(encodeJson(undefined))).toBeUndefined();
  });
});
