/**
 * Admin utilities
 */

/**
 * Checks if a user ID matches the ADMIN environment variable
 * @param userId - The user ID to check
 * @returns true if the user is an admin, false otherwise
 */
export function isAdmin(userId: string | undefined | null): boolean {
    if (!userId || !process.env.ADMIN) {
        return false;
    }
    return userId === process.env.ADMIN;
}

/**
 * Gets the admin user ID from environment variable
 * @returns The admin user ID or null if not set
 */
export function getAdminId(): string | null {
    return process.env.ADMIN || null;
}

