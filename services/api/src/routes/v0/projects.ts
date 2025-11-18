import { extractAuthData } from '../../lib/auth-context';
import { getZeroDbPool } from '../../lib/db';
import { isTrustedOrigin } from '../../lib/utils/trusted-origins';

/**
 * Projects API endpoint (v0)
 * Returns a list of projects from Zero database
 * Manually adds CORS headers like hominio-me implementation
 * Returns Response object directly to avoid Elysia header duplication
 */
export async function projects({ request }: { request: Request }) {
  try {
    // Extract auth data (optional - projects can be public)
    const authData = await extractAuthData(request);

    const pool = getZeroDbPool();
    
    // Query projects from database
    const result = await pool.query(
      'SELECT * FROM project ORDER BY "createdAt" DESC'
    );

    // Manually add CORS headers like hominio-me does
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Set CORS headers if origin is trusted
    if (origin && isTrustedOrigin(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Cookie';
    }

    return new Response(
      JSON.stringify({ projects: result.rows }),
      {
        headers,
        status: 200,
      }
    );
  } catch (error) {
    const errorHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const origin = request.headers.get('origin');
    if (origin && isTrustedOrigin(origin)) {
      errorHeaders['Access-Control-Allow-Origin'] = origin;
      errorHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: errorHeaders,
        status: 500,
      }
    );
  }
}

