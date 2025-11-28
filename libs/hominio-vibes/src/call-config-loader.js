/**
 * Call Config Loader
 * Loads and processes call configuration (callPrompt, repeatedPrompt)
 */

import callConfigData from '../lib/callConfig.json';

/**
 * Load call config
 * @returns {Promise<Object>} Call config object
 */
export async function loadCallConfig() {
	return callConfigData;
}

/**
 * Build repeated prompt with current date/time injected
 * @returns {Promise<string>} Repeated prompt string
 */
export async function buildRepeatedPrompt() {
	const now = new Date();
	const dateISO = now.toISOString().split('T')[0];
	const dateFormatted = now.toLocaleDateString('de-DE', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const time = now.toLocaleTimeString('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});

	const template = callConfigData.repeatedPromptTemplate;
	return template
		.replace(/\{\{dateFormatted\}\}/g, dateFormatted)
		.replace(/\{\{date\}\}/g, dateISO)
		.replace(/\{\{time\}\}/g, time);
}

/**
 * Build initial system instruction (callPrompt + repeatedPrompt)
 * @returns {Promise<string>} Complete initial system instruction
 */
export async function buildInitialSystemInstruction() {
	const callConfig = await loadCallConfig();
	const repeatedPrompt = await buildRepeatedPrompt();
	return `${callConfig.callPrompt}\n\n${repeatedPrompt}`;
}

