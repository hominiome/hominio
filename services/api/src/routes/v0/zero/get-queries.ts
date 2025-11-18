import { handleGetQueriesRequest, type ReadonlyJSONValue } from '@rocicorp/zero/server';
import { schema } from '../../../zero-schema';
import { builder } from '../../../zero-schema';
import { extractAuthData } from '../../../lib/auth-context';
import { buildCorsHeaders } from '../../../lib/utils/cors-headers';
import { buildErrorResponse } from '../../../lib/utils/error-handler';
import z from 'zod';

// Server-side query implementations
// We can't import synced-queries.ts here because it uses syncedQuery (client-only)
// Instead, we implement the queries directly using the builder
function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
    // ========================================
    // NOTIFICATION QUERIES
    // ========================================

    if (name === 'myNotifications') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.notification
                .where('userId', '=', userId)
                .orderBy('createdAt', 'desc'),
        };
    }

    if (name === 'unreadNotificationCount') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.notification
                .where('userId', '=', userId)
                .where('read', '=', 'false'),
        };
    }

    // ========================================
    // USER PREFERENCES QUERIES
    // ========================================

    if (name === 'userPreferencesByUser') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.userPreferences.where('userId', '=', userId),
        };
    }

    // ========================================
    // PUSH SUBSCRIPTION QUERIES
    // ========================================

    if (name === 'pushSubscriptionsByUser') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.pushSubscription
                .where('userId', '=', userId)
                .orderBy('createdAt', 'desc'),
        };
    }

    // ========================================
    // IDENTITY PURCHASE QUERIES
    // ========================================

    if (name === 'allPurchases') {
        z.tuple([]).parse(args);
        return {
            query: builder.identityPurchase.orderBy('purchasedAt', 'desc'),
        };
    }

    if (name === 'purchasesByUser') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.identityPurchase
                .where('userId', '=', userId)
                .orderBy('purchasedAt', 'desc'),
        };
    }

    if (name === 'purchaseById') {
        z.tuple([z.string()]).parse(args);
        const [purchaseId] = args as [string];
        return {
            query: builder.identityPurchase.where('id', '=', purchaseId),
        };
    }

    // ========================================
    // USER IDENTITIES QUERIES
    // ========================================

    if (name === 'identitiesByUser') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.userIdentities.where('userId', '=', userId),
        };
    }

    // ========================================
    // PROJECT QUERIES (Reference Implementation)
    // ========================================

    if (name === 'allProjects') {
        z.tuple([]).parse(args);
        return {
            query: builder.project.orderBy('createdAt', 'desc'),
        };
    }

    if (name === 'projectById') {
        z.tuple([z.string()]).parse(args);
        const [projectId] = args as [string];
        return {
            query: builder.project.where('id', '=', projectId),
        };
    }

    if (name === 'projectsByUser') {
        z.tuple([z.string()]).parse(args);
        const [userId] = args as [string];
        return {
            query: builder.project
                .where('userId', '=', userId)
                .orderBy('createdAt', 'desc'),
        };
    }


    throw new Error(`No such query: ${name}`);
}

/**
 * Zero get-queries endpoint handler
 * Uses Elysia context for proper request handling
 */
export async function getQueries({ request }: { request: Request }) {
    try {
        // Extract auth data from cookies using centralized auth context
        const authData = await extractAuthData(request);

        // Log for debugging
        if (authData) {
            console.log('[get-queries] Authenticated user:', authData.sub, 'isAdmin:', authData.isAdmin);
        } else {
            console.log('[get-queries] Anonymous request');
        }

        // Zero forwards cookies automatically for get-queries requests (no env var needed)
        const result = await handleGetQueriesRequest(getQuery, schema, request);

        // Build CORS headers
        const origin = request.headers.get('origin');
        const headers = buildCorsHeaders(origin);

        return new Response(JSON.stringify(result), {
            headers,
            status: 200,
        });
    } catch (error) {
        return buildErrorResponse(error, 500);
    }
}

