import type { ServiceError } from "./types";

export function validationError(message: string): ServiceError {
  return { code: "VALIDATION_ERROR", message };
}

export function notFoundError(message: string): ServiceError {
  return { code: "NOT_FOUND", message };
}

export function internalError(message: string): ServiceError {
  return { code: "INTERNAL_ERROR", message };
}
