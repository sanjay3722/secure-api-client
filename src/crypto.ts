import type { EncryptionAdapter } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const concat = (a: Uint8Array, b: Uint8Array) => {
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
};

const toArrayBuffer = (view: Uint8Array): ArrayBuffer =>
  view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength
  ) as ArrayBuffer;

export class AesGcmEncryption implements EncryptionAdapter {
  private keyPromise: Promise<CryptoKey>;
  private ivLength = 12;

  constructor(secret: string | ArrayBuffer | Uint8Array) {
    this.keyPromise = this.deriveKey(secret);
  }

  private async deriveKey(
    secret: string | ArrayBuffer | Uint8Array
  ): Promise<CryptoKey> {
    const data: Uint8Array =
      typeof secret === "string"
        ? textEncoder.encode(secret)
        : secret instanceof Uint8Array
        ? secret
        : new Uint8Array(secret);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(data),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    const salt = textEncoder.encode("secure-api-client");
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    const key = await this.keyPromise;
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const buf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(data)
    );
    return concat(iv, new Uint8Array(buf));
  }

  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    const key = await this.keyPromise;
    const iv = data.slice(0, this.ivLength);
    const ciphertext = data.slice(this.ivLength);
    const buf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext)
    );
    return new Uint8Array(buf);
  }
}

export const encodeJson = (value: unknown): Uint8Array =>
  textEncoder.encode(JSON.stringify(value));
export const decodeJson = <T = unknown>(data: Uint8Array): T =>
  JSON.parse(textDecoder.decode(data)) as T;
