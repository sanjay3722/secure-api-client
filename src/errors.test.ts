import { describe, expect, it } from "vitest";

import { makeErrorShape, toApiError } from "./errors";
import { ApiError } from "./types";

describe("toApiError", () => {
  it("should return ApiError as-is", () => {
    const error = new ApiError("Test error", "ERR_TEST", 400);
    const result = toApiError(error);
    expect(result).toBe(error);
    expect(result.code).toBe("ERR_TEST");
  });

  it("should convert Error with code property", () => {
    const error = { message: "Test", code: "ERR_CUSTOM", status: 500 };
    const result = toApiError(error);
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("Test");
    expect(result.code).toBe("ERR_CUSTOM");
    expect(result.status).toBe(500);
  });

  it("should convert Error with details", () => {
    const error = {
      message: "Test",
      code: "ERR_TEST",
      details: { field: "value" },
    };
    const result = toApiError(error);
    expect(result.details).toEqual({ field: "value" });
  });

  it("should use fallback code when not provided", () => {
    const error = { message: "Test" };
    const result = toApiError(error, "ERR_FALLBACK");
    expect(result.code).toBe("ERR_FALLBACK");
  });

  it("should handle string errors", () => {
    const result = toApiError("String error", "ERR_STRING");
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("String error");
    expect(result.code).toBe("ERR_STRING");
  });

  it("should handle unknown errors", () => {
    const result = toApiError(123, "ERR_UNKNOWN");
    expect(result).toBeInstanceOf(ApiError);
    expect(result.message).toBe("123");
  });
});

describe("makeErrorShape", () => {
  it("should create error shape from ApiError", () => {
    const error = new ApiError("Test error", "ERR_TEST", 400, { field: "value" });
    const shape = makeErrorShape(error);
    expect(shape).toEqual({
      code: "ERR_TEST",
      message: "Test error",
      details: { field: "value" },
    });
  });

  it("should handle error without details", () => {
    const error = new ApiError("Test error", "ERR_TEST");
    const shape = makeErrorShape(error);
    expect(shape.details).toBeUndefined();
  });
});
