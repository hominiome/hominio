/**
 * Context Injection Manager
 * Unified system for injecting context for skills
 * Maps skill IDs to context formatters
 */

import { getMenuContextString } from '../lib/functions/menu-store.js';
import { getWellnessContextString } from '../lib/functions/wellness-store.js';
import { getCalendarContextString } from '../lib/functions/calendar-store.js';

/**
 * Registry of skill IDs to context formatter functions
 * Maps skillId → async function that returns context string
 */
const CONTEXT_FORMATTERS = {
	'show-menu': getMenuContextString,
	'show-wellness': getWellnessContextString,
	'view-calendar': getCalendarContextString,
	'create-calendar-entry': getCalendarContextString,
	'edit-calendar-entry': getCalendarContextString,
	'delete-calendar-entry': getCalendarContextString
};

/**
 * Inject context for a skill
 * @param {Object} options - Injection options
 * @param {string} options.skillId - Skill ID (e.g., "show-menu", "show-wellness")
 * @param {Function} options.injectFn - Function to inject context (e.g., session.sendClientContent)
 * @returns {Promise<void>}
 */
export async function injectContextForSkill({ skillId, injectFn }) {
	try {
		// Get formatter function for this skill
		const formatter = CONTEXT_FORMATTERS[skillId];
		
		if (!formatter) {
			// No context formatter for this skill - that's okay, some skills don't need context injection
			console.log(`[ContextInjection] No context formatter for skill: ${skillId}`);
			return;
		}
		
		// Get context string
		const contextString = await formatter();
		
		if (!contextString) {
			console.warn(`[ContextInjection] No context returned for skill: ${skillId}`);
			return;
		}
		
		// Inject context
		if (injectFn) {
			injectFn({
				turns: contextString,
				turnComplete: true
			});
			console.log(`[ContextInjection] ✅ Injected context for skill: ${skillId}`);
		}
	} catch (error) {
		console.error(`[ContextInjection] Error injecting context for skill ${skillId}:`, error);
		// Don't throw - context injection failure shouldn't break skill execution
	}
}

/**
 * Register a context formatter for a skill
 * @param {string} skillId - Skill ID
 * @param {Function} formatter - Async function that returns context string
 */
export function registerContextFormatter(skillId, formatter) {
	CONTEXT_FORMATTERS[skillId] = formatter;
}

/**
 * Check if a skill has a context formatter
 * @param {string} skillId - Skill ID
 * @returns {boolean} True if formatter exists
 */
export function hasContextFormatter(skillId) {
	return skillId in CONTEXT_FORMATTERS;
}
