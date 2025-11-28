/**
 * Vibe Context Builder
 * Builds context strings for vibe queries
 * Used by queryVibeContext tool to inject vibe context into conversation
 * 
 * NOTE: Vibe prompts are pure/static - AI should use tools (queryDataContext) 
 * to get dynamic data when needed. Current date/time is automatically available in context.now
 */

import { loadVibeConfig } from './vibe-loader.js';
import { buildVibeContext } from './system-instruction-builder.js';

/**
 * Build and return vibe context string for queryVibeContext tool
 * @param {string} vibeId - Vibe ID to query
 * @returns {Promise<string>} - Formatted vibe context string (pure prompt, no dynamic data)
 */
export async function buildVibeContextString(vibeId) {
	try {
		const vibeConfig = await loadVibeConfig(vibeId);
		
		// Build vibe context - pure prompt only, no dynamic additions
		// AI should use queryDataContext to get dynamic data when needed
		// Current date/time is automatically available in context.now
		const context = await buildVibeContext(vibeConfig);
		
		return context;
	} catch (error) {
		throw new Error(`Failed to build vibe context for ${vibeId}: ${error.message}`);
	}
}

/**
 * Get list of available tools for a vibe
 * @param {string} vibeId - Vibe ID
 * @returns {Promise<string[]>} - Array of skill IDs
 */
export async function getVibeTools(vibeId) {
	try {
		const vibeConfig = await loadVibeConfig(vibeId);
		return vibeConfig.skills.map(skill => skill.id);
	} catch (error) {
		throw new Error(`Failed to get tools for vibe ${vibeId}: ${error.message}`);
	}
}

