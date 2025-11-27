/**
 * Query Data Context Handler
 * Handles queryDataContext tool calls
 * Routes to appropriate store-based handlers and injects context
 */

import { getSchemaHandler } from './data-context-schema-registry.js';

/**
 * Handle queryDataContext tool call
 * @param {Object} options - Handler options
 * @param {string} options.schemaId - Schema ID (e.g., "menu", "wellness", "calendar")
 * @param {Object} [options.params={}] - Query parameters (schema-specific)
 * @param {Function} options.injectFn - Function to inject context (e.g., session.sendClientContent)
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function handleQueryDataContext({ schemaId, params = {}, injectFn }) {
	try {
		// Get schema handler
		const handler = getSchemaHandler(schemaId);
		
		if (!handler) {
			return {
				success: false,
				error: `Unknown schema ID: ${schemaId}. Available schemas: menu, wellness, calendar`
			};
		}
		
		// Get context string from handler
		const contextString = await handler.getContextString(params);
		
		if (!contextString) {
			return {
				success: false,
				error: `No context available for schema: ${schemaId}`
			};
		}
		
		// Inject context into conversation
		if (injectFn) {
			injectFn({
				turns: contextString,
				turnComplete: true
			});
		}
		
		return {
			success: true,
			message: `Loaded ${schemaId} data context`
		};
	} catch (error) {
		console.error(`[QueryDataContext] Error handling query:`, error);
		return {
			success: false,
			error: `Failed to query data context: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}
