/**
 * Centralized auth data extraction from cookies (Read-Only)
 * 
 * ⚠️ IMPORTANT: This module ONLY reads cookies set by the wallet service.
 * It does NOT create sessions, set cookies, or handle authentication.
 * 
 * The wallet service (`services/wallet`) is responsible for:
 * - User sign up / sign in
 * - Session creation
 * - Cookie setting
 * 
 * This API service ONLY verifies cookies for authorization checks.
 */

import { auth } from "./auth";

/**
 * AuthData structure used throughout the application
 * Extracted from BetterAuth session cookies (set by wallet service)
 */
export type AuthData = {
    sub: string; // User ID (subject)
    isAdmin: boolean; // Admin status (checked against ADMIN env var)
};

/**
 * Check if a user ID matches the ADMIN environment variable
 */
function isAdmin(userId: string | undefined | null): boolean {
    if (!userId || !process.env.ADMIN) {
        return false;
    }
    return userId === process.env.ADMIN;
}

/**
 * Extract authentication data from request cookies (Read-Only)
 * 
 * This function verifies cookies that were set by the wallet service.
 * It does NOT create sessions or set cookies - it only reads them.
 * 
 * Usage:
 * - Zero push endpoint: Get auth for mutator permissions
 * - Zero get-queries endpoint: Get auth for query permissions
 * - API endpoints: Get auth for route protection
 *
 * @param request - The incoming request (cookies set by wallet service)
 * @returns AuthData if authenticated, undefined if anonymous
 */
export async function extractAuthData(
    request: Request
): Promise<AuthData | undefined> {
    // Verify cookies using Better Auth instance
    // Cookies were set by wallet service, we just verify them here
    // For requests from zero-cache, cookies are forwarded in the Cookie header
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    // Debug logging for cookie-based auth issues
    const cookieHeader = request.headers.get("cookie");
    if (!session?.user && cookieHeader) {
        // Cookies present but no session - might be cookie domain/secure issue
        const cookieNames = cookieHeader
            .split(";")
            .map((c) => c.split("=")[0].trim());
        console.log(
            "[auth-context] Cookies present but no session. Cookie names:",
            cookieNames
        );
    }

    // If no session, user is anonymous
    if (!session?.user) {
        return undefined;
    }

    // Return standardized auth data
    return {
        sub: session.user.id,
        isAdmin: isAdmin(session.user.id),
    };
}

/**
 * Require authentication - throws if not authenticated
 * Use this in endpoints that require a logged-in user
 *
 * @param request - The incoming request
 * @returns AuthData for the authenticated user
 * @throws Error if not authenticated
 */
export async function requireAuth(request: Request): Promise<AuthData> {
    const authData = await extractAuthData(request);

    if (!authData) {
        throw new Error("Unauthorized: Authentication required");
    }

    return authData;
}

/**
 * Require admin - throws if not admin
 * Use this in endpoints that require admin access
 *
 * @param request - The incoming request
 * @returns AuthData for the admin user
 * @throws Error if not authenticated or not admin
 */
export async function requireAdmin(request: Request): Promise<AuthData> {
    const authData = await requireAuth(request);

    if (!authData.isAdmin) {
        throw new Error("Forbidden: Admin access required");
    }

    return authData;
}

