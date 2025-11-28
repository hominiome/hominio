/**
 * Action Skill Handler
 * Generic handler for actionSkill tool calls
 * Routes to appropriate function based on vibe and skill ID
 */

import { loadVibeConfig } from './vibe-loader.js';
import { loadFunction } from './function-loader.js';

/**
 * Handle actionSkill tool call
 * @param {Object} params - Tool call parameters
 * @param {string} params.vibeId - Vibe ID (e.g., 'charles')
 * @param {string} params.skillId - Skill ID (e.g., 'show-menu')
 * @param {Object} params.args - Skill arguments
 * @param {Object} options - Handler options
 * @param {string} options.userId - Current user ID (optional)
 * @param {string[]} [options.activeVibeIds] - Currently active vibe IDs (for validation)
 * @returns {Promise<import('./types.ts').FunctionResult>}
 */
export async function handleActionSkill(
	{ vibeId, skillId, args },
	{ userId, activeVibeIds = [] }
) {
	try {
		if (!vibeId) {
			return {
				success: false,
				error: 'Vibe ID is required. Use queryVibeContext first to load the vibe context.'
			};
		}
		
		// 1. Load vibe config
		const vibeConfig = await loadVibeConfig(vibeId);
		
		// 2. Find skill in config
		const skill = vibeConfig.skills.find(s => s.id === skillId);
		if (!skill) {
			return {
				success: false,
				error: `Skill "${skillId}" not found in vibe "${vibeId}"`
			};
		}
		
		// 3. Load function implementation
		const functionImpl = await loadFunction(skill.functionId);
		
		// 4. Build function context
		// Automatically inject current date/time into every tool call
		const now = new Date();
		const currentDateISO = now.toISOString().split('T')[0];
		const currentDateFormatted = now.toLocaleDateString('de-DE', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		const currentTime = now.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
		
		const context = {
			dataContext: '', // Empty - prompts are pure, AI uses tools for dynamic data
			rawDataContext: [], // Empty - no static data context anymore
			skillDataContext: [], // Empty - no skill-specific data context anymore
			userId,
			vibeId,
			// Automatically injected current date/time - always available
			now: {
				date: currentDateISO,
				dateFormatted: currentDateFormatted,
				time: currentTime,
				timestamp: now.toISOString()
			}
		};
		
		// 6. Execute function handler
		const result = await functionImpl.handler(args || {}, context);
		
		return result;
	} catch (error) {
		console.error('[ActionSkill] Error handling actionSkill:', error);
		return {
			success: false,
			error: error.message || 'Unknown error executing skill'
		};
	}
}

