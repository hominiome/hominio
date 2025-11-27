/**
 * System Instruction Builder
 * Builds system instructions for Hominio (unified assistant)
 * Can optionally include vibe-specific context
 */

import { loadDataContext } from './data-context-loader.js';
import { listVibes } from './vibe-loader.js';

/**
 * Build unified Hominio system instruction
 * @param {Object} options - Additional options
 * @param {string[]} [options.activeVibeIds] - Currently active vibe IDs
 * @param {Object<string, import('./types.ts').VibeConfig>} [options.vibeConfigs] - Vibe configs to include context from
 * @returns {Promise<string>} - Complete system instruction
 */
export async function buildSystemInstruction(options = {}) {
	const { activeVibeIds = [], vibeConfigs = {} } = options;
	
	// Get list of available vibes
	const availableVibes = await listVibes();
	
	// Build base Hominio instruction
	let instruction = `Du bist Hominio, ein hilfreicher KI-Assistent.

Du kannst verschiedene "Vibes" abfragen, um zusätzlichen Kontext und Funktionen zu erhalten:
`;

	// Add available vibes list
	for (const vibeId of availableVibes) {
		const vibeConfig = vibeConfigs[vibeId] || await import('./vibe-loader.js').then(m => m.loadVibeConfig(vibeId).catch(() => null));
		if (vibeConfig) {
			instruction += `- **${vibeConfig.name} Vibe** (vibeId: "${vibeId}"): ${vibeConfig.description}\n`;
		}
	}

	instruction += `
Wenn ein Benutzer eine Aufgabe erwähnt, die einen bestimmten Vibe erfordert, rufe automatisch queryVibeContext auf, um den entsprechenden Kontext zu laden. Nur wenn du unsicher bist, welcher Vibe benötigt wird, frage den Benutzer.

Verfügbare Tools:
- queryVibeContext: Lade Kontext und Tools von einem Vibe
- queryDataContext: Lade dynamische Datenkontexte (z.B. Menü, Wellness, Kalender) - nutze dies, um aktuelle Daten abzurufen, bevor du actionSkill aufrufst
`;

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
		instruction += `Nutze queryDataContext mit schemaId, um diese Daten abzurufen (z.B. queryDataContext({ schemaId: "menu" })).\n`;
	}

	// Add active vibe contexts if any
	if (activeVibeIds.length > 0) {
		instruction += `\nAktuell aktive Vibes: ${activeVibeIds.join(', ')}\n`;
		
		for (const vibeId of activeVibeIds) {
			const vibeConfig = vibeConfigs[vibeId];
			if (vibeConfig) {
				const dataContextString = await loadDataContext(vibeConfig);
				if (dataContextString) {
					instruction += `\n**${vibeConfig.name} Vibe Kontext:**\n${dataContextString}\n`;
				}
			}
		}
	}
	
	// Add current date to context (useful for relative date calculations)
	const now = new Date();
	const currentDateISO = now.toISOString().split('T')[0];
	const currentDateFormatted = now.toLocaleDateString('de-DE', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const currentDateContext = `\nAKTUELLES DATUM: ${currentDateFormatted} (${currentDateISO})\nVerwende dieses Datum als Referenz für relative Datumsangaben wie "heute", "morgen", "übermorgen".`;
	
	instruction += currentDateContext;
	
	return instruction;
}

/**
 * Build vibe-specific context string for injection
 * @param {import('./types.ts').VibeConfig} vibeConfig - Vibe configuration
 * @param {Object} options - Additional options
 * @param {string} [options.calendarContext] - Calendar context string (for Karl)
 * @returns {Promise<string>} - Vibe context string
 */
export async function buildVibeContext(vibeConfig, options = {}) {
	const { calendarContext } = options;
	
	// Build skills description
	const skillsDesc = vibeConfig.skills.map((skill) =>
		`- **${skill.name}** (skillId: "${skill.id}"): ${skill.description}`
	).join('\n');
	
	// Load data context
	let dataContextString = await loadDataContext(vibeConfig);
	
	// Get examples text from config or use default
	let examplesText = '';
	if (vibeConfig.prompts?.examplesText) {
		examplesText = vibeConfig.prompts.examplesText;
	}
	
	// Format data context with header if present
	let dataContextFormatted = '';
	if (dataContextString) {
		dataContextFormatted = `\nHintergrundwissen:\n${dataContextString}`;
	}
	
	// Add calendar context for Karl if provided
	let calendarContextFormatted = '';
	if (calendarContext) {
		calendarContextFormatted = `\n${calendarContext}`;
	}
	
	// Build vibe context
	let context = `**${vibeConfig.name} Vibe Kontext geladen**

${vibeConfig.description}

Verfügbare Funktionen:
${skillsDesc}`;

	if (examplesText) {
		context += `\n\n${examplesText}`;
	}

	if (dataContextFormatted) {
		context += dataContextFormatted;
	}

	if (calendarContextFormatted) {
		context += calendarContextFormatted;
	}
	
	return context;
}

