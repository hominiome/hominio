/**
 * CORS headers utility
 * Centralized CORS header building for responses
 */

import { isTrustedOrigin } from "./trusted-origins";

export function buildCorsHeaders(origin: string | null, methods: string = "GET, POST, OPTIONS"): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (origin && isTrustedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Allow-Methods"] = methods;
    headers["Access-Control-Allow-Headers"] = "Content-Type, Cookie";
  }

  return headers;
}

