/**
 * System Instruction Builder
 * Builds system instructions for Hominio (unified assistant)
 * Can optionally include vibe-specific context
 */

import { listVibes } from './vibe-loader.js';
import { loadCallConfig, buildRepeatedPrompt, buildInitialSystemInstruction } from './call-config-loader.js';

/**
 * Build unified Hominio system instruction
 * @param {Object} options - Additional options
 * @param {string[]} [options.activeVibeIds] - Currently active vibe IDs
 * @param {Object<string, import('./types.ts').VibeConfig>} [options.vibeConfigs] - Vibe configs to include context from
 * @returns {Promise<string>} - Complete system instruction
 */
export async function buildSystemInstruction(options = {}) {
	const { activeVibeIds = [], vibeConfigs = {}, includeRepeatedPrompt = false } = options;
	
	// Load call config
	const callConfig = await loadCallConfig();
	
	// Get list of available vibes
	const availableVibes = await listVibes();
	
	// Start with callPrompt from callConfig
	let instruction = callConfig.callPrompt;
	
	// Add available vibes list
	instruction += '\n\nDu kannst verschiedene "Vibes" abfragen, um zusätzlichen Kontext und Funktionen zu erhalten:\n';
	for (const vibeId of availableVibes) {
		const vibeConfig = vibeConfigs[vibeId] || await import('./vibe-loader.js').then(m => m.loadVibeConfig(vibeId).catch(() => null));
		if (vibeConfig) {
			instruction += `- **${vibeConfig.name} Vibe** (vibeId: "${vibeId}"): ${vibeConfig.description}\n`;
		}
	}

	// Add available data context schemas from active vibes
	const availableSchemas = new Set();
	for (const vibeId of activeVibeIds) {
		const vibeConfig = vibeConfigs[vibeId];
		if (vibeConfig?.dataContextSchemas) {
			for (const schemaId of vibeConfig.dataContextSchemas) {
				availableSchemas.add(schemaId);
			}
		}
	}
	
	if (availableSchemas.size > 0) {
		instruction += `\nVerfügbare Datenkontexte für aktive Vibes: ${Array.from(availableSchemas).join(', ')}\n`;
		instruction += `\nKRITISCH: Wenn der Benutzer nach diesen dynamischen Daten fragt, MUSST du IMMER zuerst queryDataContext aufrufen, bevor du actionSkill verwendest!\n`;
		instruction += `Beispiele:\n`;
		instruction += `- Menü/Essen → queryDataContext({ schemaId: "menu" }) → dann actionSkill\n`;
		instruction += `- Wellness/Spa → queryDataContext({ schemaId: "wellness" }) → dann actionSkill\n`;
		instruction += `- Kalender/Termine → queryDataContext({ schemaId: "calendar" }) → dann actionSkill\n`;
		instruction += `\nNutze queryDataContext mit schemaId, um diese Daten abzurufen (z.B. queryDataContext({ schemaId: "menu" })).\n`;
	}

	// Add active vibe prompts if any
	if (activeVibeIds.length > 0) {
		instruction += `\nAktuell aktive Vibes: ${activeVibeIds.join(', ')}\n`;
		
		for (const vibeId of activeVibeIds) {
			const vibeConfig = vibeConfigs[vibeId];
			if (vibeConfig?.vibePrompt) {
				instruction += `\n**${vibeConfig.name} Vibe Kontext:**\n${vibeConfig.vibePrompt}\n`;
			}
		}
	}
	
	// Append repeated prompt if requested (for initial call start)
	if (includeRepeatedPrompt) {
		const repeatedPrompt = await buildRepeatedPrompt();
		instruction += `\n\n${repeatedPrompt}`;
	}
	
	return instruction;
}

/**
 * Build vibe-specific context string for injection
 * @param {import('./types.ts').VibeConfig} vibeConfig - Vibe configuration
 * @param {Object} options - Additional options (unused, kept for compatibility)
 * @returns {Promise<string>} - Vibe context string
 */
export async function buildVibeContext(vibeConfig, options = {}) {
	// Use the single vibePrompt field from config - pure, no dynamic additions
	// AI should use tools (queryDataContext) to get dynamic data when needed
	// Current date/time is automatically available in context.now
	let context = `**${vibeConfig.name} Vibe Kontext geladen**\n\n`;
	
	if (vibeConfig.vibePrompt) {
		context += vibeConfig.vibePrompt;
	} else {
		// Fallback if vibePrompt not set
		context += `${vibeConfig.description}\n\nVerfügbare Funktionen:\n`;
		context += vibeConfig.skills.map((skill) =>
			`- **${skill.name}** (skillId: "${skill.id}"): ${skill.description}`
		).join('\n');
	}
	
	return context;
}

