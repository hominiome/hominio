import { api } from "$lib/api-helpers";
import { isTrustedOrigin } from "$lib/utils/domain";
import type { RequestHandler } from "./$types";

/**
 * List My Capabilities Endpoint
 * 
 * Returns all capabilities granted to the authenticated user
 */
export const GET: RequestHandler = async ({ request }) => {
    console.log('[capabilities] GET /api/auth/capabilities called');
    
    // Validate origin for CORS
    const origin = request.headers.get("origin");
    if (origin && !isTrustedOrigin(origin)) {
        return api.json(
            { error: "Unauthorized: Untrusted origin" },
            { status: 403 }
        );
    }
    
    try {
        // Get authenticated session
        const session = await api.getAuthenticatedSession(request);
        console.log('[capabilities] Session found:', session.user.id);

        // Extract principal
        const principal = `user:${session.user.id}` as const;

        // Get all capabilities for this user
        const capabilities = await api.caps.getCapabilities(principal);

        // Add CORS headers if origin is present
        const responseHeaders: HeadersInit = {};
        if (origin) {
            responseHeaders["Access-Control-Allow-Origin"] = origin;
            responseHeaders["Access-Control-Allow-Credentials"] = "true";
            responseHeaders["Access-Control-Allow-Methods"] = "GET, OPTIONS";
            responseHeaders["Access-Control-Allow-Headers"] = "Content-Type, Cookie";
        }

        return api.json(
            { capabilities },
            { headers: responseHeaders }
        );
    } catch (error) {
        console.error("[capabilities] Error:", error);
        
        // Add CORS headers to error responses too
        const responseHeaders: HeadersInit = {};
        if (origin) {
            responseHeaders["Access-Control-Allow-Origin"] = origin;
            responseHeaders["Access-Control-Allow-Credentials"] = "true";
            responseHeaders["Access-Control-Allow-Methods"] = "GET, OPTIONS";
            responseHeaders["Access-Control-Allow-Headers"] = "Content-Type, Cookie";
        }
        
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return api.json(
                { error: error.message },
                { status: 401, headers: responseHeaders }
            );
        }
        return api.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500, headers: responseHeaders }
        );
    }
};

/**
 * Handle OPTIONS preflight requests
 */
export const OPTIONS: RequestHandler = async ({ request }) => {
    const origin = request.headers.get("origin");
    const headers = new Headers();

    if (origin && isTrustedOrigin(origin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, Cookie");
        headers.set("Access-Control-Max-Age", "86400"); // 24 hours
    }

    return new Response(null, { status: 204, headers });
};

