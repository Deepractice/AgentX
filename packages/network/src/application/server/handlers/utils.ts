/**
 * Shared utilities for handlers
 */

import type { ApiErrorCode, ErrorResponse } from "@agentxjs/types";

/**
 * Create JSON response
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create error response
 */
export function errorResponse(code: ApiErrorCode, message: string, status: number): Response {
  const body: ErrorResponse = {
    error: { code, message },
  };
  return jsonResponse(body, status);
}

/**
 * Create 204 No Content response
 */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create HEAD response (200 or 404)
 */
export function headResponse(exists: boolean): Response {
  return new Response(null, { status: exists ? 200 : 404 });
}
