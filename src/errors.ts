import { ApiError, ApiErrorShape } from "./types";

export const toApiError = (e: unknown, fallbackCode = "ERR_UNKNOWN"): ApiError => {
  if (e instanceof ApiError) return e;
  if (typeof e === "object" && e && "message" in e) {
    const anyErr = e as any;
    const message = String(anyErr.message ?? "Unknown error");
    const code = String(anyErr.code ?? fallbackCode);
    const status = typeof anyErr.status === "number" ? anyErr.status : undefined;
    const details = anyErr.details;
    return new ApiError(message, code, status, details);
  }
  return new ApiError(String(e), fallbackCode);
};

export const makeErrorShape = (error: ApiError): ApiErrorShape => ({
  code: error.code,
  message: error.message,
  details: error.details,
});
