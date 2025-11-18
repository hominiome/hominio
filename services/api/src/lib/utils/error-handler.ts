/**
 * Error handling utilities
 * Centralized error response building
 */

export function buildErrorResponse(
  error: unknown,
  status: number = 500
): Response {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Error:", message, error);

  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

