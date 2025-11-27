import { describe, expect, it, vi } from "vitest";

import { streamResponse } from "./stream";

describe("streamResponse", () => {
  it("should call onStart with status and headers", async () => {
    const onStart = vi.fn();
    const headers = new Headers({ "content-type": "text/plain" });
    const response = {
      status: 200,
      headers,
      body: {
        getReader: vi.fn().mockReturnValue({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          releaseLock: vi.fn(),
        }),
      },
    } as unknown as Response;

    await streamResponse(response, { onStart });

    expect(onStart).toHaveBeenCalledWith(200, headers);
  });

  it("should call onChunk for each chunk", async () => {
    const onChunk = vi.fn();
    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5, 6]);

    const reader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ done: false, value: chunk1 })
        .mockResolvedValueOnce({ done: false, value: chunk2 })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    const response = {
      status: 200,
      headers: new Headers(),
      body: {
        getReader: vi.fn().mockReturnValue(reader),
      },
    } as unknown as Response;

    await streamResponse(response, { onChunk });

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, chunk1);
    expect(onChunk).toHaveBeenNthCalledWith(2, chunk2);
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it("should call onComplete when done", async () => {
    const onComplete = vi.fn();
    const reader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    const response = {
      status: 200,
      headers: new Headers(),
      body: {
        getReader: vi.fn().mockReturnValue(reader),
      },
    } as unknown as Response;

    await streamResponse(response, { onComplete });

    expect(onComplete).toHaveBeenCalled();
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it("should call onComplete when body is null", async () => {
    const onComplete = vi.fn();
    const response = {
      status: 200,
      headers: new Headers(),
      body: null,
    } as unknown as Response;

    await streamResponse(response, { onComplete });

    expect(onComplete).toHaveBeenCalled();
  });

  it("should call onError and rethrow on error", async () => {
    const onError = vi.fn();
    const error = new Error("Stream error");
    const reader = {
      read: vi.fn().mockRejectedValue(error),
      releaseLock: vi.fn(),
    };

    const response = {
      status: 200,
      headers: new Headers(),
      body: {
        getReader: vi.fn().mockReturnValue(reader),
      },
    } as unknown as Response;

    await expect(streamResponse(response, { onError })).rejects.toThrow("Stream error");
    expect(onError).toHaveBeenCalledWith(error);
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it("should handle empty stream", async () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const reader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    const response = {
      status: 200,
      headers: new Headers(),
      body: {
        getReader: vi.fn().mockReturnValue(reader),
      },
    } as unknown as Response;

    await streamResponse(response, { onStart, onComplete });

    expect(onStart).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });
});
