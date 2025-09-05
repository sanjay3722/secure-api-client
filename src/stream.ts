import type { StreamHandlers } from "./types";

export async function streamResponse(response: Response, handlers: StreamHandlers<Uint8Array>) {
  const { onStart, onChunk, onError, onComplete } = handlers;
  onStart?.(response.status, response.headers);
  const reader = response.body?.getReader();
  if (!reader) {
    onComplete?.();
    return;
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) onChunk?.(value);
    }
    onComplete?.();
  } catch (e) {
    // Defer throw to consumer but allow callback

    onError?.(e as any);
    throw e;
  } finally {
    reader.releaseLock();
  }
}
