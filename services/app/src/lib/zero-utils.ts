/**
 * Zero Context Utilities
 * 
 * Helper functions for working with Zero from child routes
 * Usage:
 *   import { getZeroContext } from '$lib/zero-utils';
 *   const zero = getZeroContext();
 */

import { getContext } from "svelte";

export type ZeroContext = {
    getInstance: () => any;
    isReady: () => boolean;
    getError: () => string | null;
    getServerUrl: () => string;
};

/**
 * Get Zero context from parent layout
 * Returns null if context is not available
 */
export function getZeroContext(): ZeroContext | null {
    try {
        return getContext<ZeroContext>("zero");
    } catch (error) {
        console.error("Zero context not found. Make sure you're inside the app layout.");
        return null;
    }
}

/**
 * Wait for Zero to be ready and return the instance
 * Returns null if Zero is not available or fails to initialize
 */
export async function waitForZero(
    context: ZeroContext | null,
    timeout = 10000
): Promise<any> {
    if (!context) return null;

    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (context.isReady() && context.getInstance()) {
                clearInterval(checkInterval);
                resolve(context.getInstance());
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                console.error("Zero initialization timeout");
                resolve(null);
            } else if (context.getError()) {
                clearInterval(checkInterval);
                console.error("Zero initialization error:", context.getError());
                resolve(null);
            }
        }, 100);
    });
}

/**
 * React-style hook to use Zero context
 * Returns ZeroContext with utilities
 */
export function useZero(): ZeroContext {
    const context = getZeroContext();
    if (!context) {
        throw new Error("Zero context not found. Make sure you're inside the app layout.");
    }
    return context;
}

