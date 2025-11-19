import { handleGetQueriesRequest, type ReadonlyJSONValue } from '@rocicorp/zero/server';
import { schema, builder } from '@hominio/zero';
import { extractAuthData } from '../../../lib/auth-context';
import { buildCorsHeaders } from '../../../lib/utils/cors-headers';
import { buildErrorResponse } from '../../../lib/utils/error-handler';
import z from 'zod';

// Server-side query implementations - Projects only
// We can't import synced-queries.ts here because it uses syncedQuery (client-only)
// Instead, we implement the queries directly using the builder
function getQuery(name: string, args: readonly ReadonlyJSONValue[]) {
    // ========================================
    // PROJECT QUERIES
    // ========================================

    if (name === 'allProjects') {
        z.tuple([]).parse(args);
        return {
            query: builder.project.orderBy('createdAt', 'desc'),
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

