/**
 * Show Wellness Function
 * Displays wellness/spa services sorted by categories
 * 
 * Wellness data is dynamically loaded from agent config's dataContext
 * Single source of truth: agent config JSON
 */

/**
 * Function handler - executes the skill logic
 * @param {Object} args - Function arguments
 * @param {string} [args.category] - Optional category filter
 * @param {Object} context - Function context
 * @param {string} context.dataContext - Data context string from agent config (formatted)
 * @param {Object[]} [context.rawDataContext] - Raw data context from agent config (for extracting wellness data)
 * @param {Object[]} [context.skillDataContext] - Skill-specific data context (e.g., wellness data for show-wellness skill)
 * @param {string} [context.userId] - Current user ID
 * @param {string} context.agentId - Agent ID
 * @returns {Promise<Object>}
 */
export async function handler(args, context) {
	const { category } = args || {};
	
	// Get wellness data from store (single source of truth)
	try {
		const { getWellnessData } = await import('./wellness-store.js');
		const wellness = await getWellnessData();
		
		if (!wellness) {
			return {
				success: false,
				error: 'Wellness data not available'
			};
		}
		
		// Filter by category if specified
		const result = category ? { [category]: wellness[category] || [] } : wellness;
		
		return {
			success: true,
			data: {
				wellness: result,
				category: category || 'all',
				timestamp: new Date().toISOString()
			}
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to load wellness data: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * UI Component - dynamically loaded Svelte component
 * Note: UI component loading is handled by function-loader.js
 * This export is kept for compatibility but is overridden by function-loader.js
 */
export const uiComponent = () => Promise.resolve({ default: null });

/**
 * Generate wellness context string for LLM from agent config data
 * Formats the wellness data from agent config into a readable string for LLM prompts
 * @param {Object} wellnessData - Wellness data from agent config dataContext
 * @param {Object} [wellnessConfig={}] - Full wellness config item with instructions, categoryNames, currency, reminder
 * @returns {string} Formatted wellness context string
 */
export function getWellnessContextString(wellnessData, wellnessConfig = {}) {
	if (!wellnessData) {
		return '';
	}
	
	const instructions = wellnessConfig.instructions || [
		'DU MUSST DIESE REGELN STRENG BEFOLGEN:',
		'1. Du darfst NUR Wellness-Dienstleistungen erwähnen, die unten aufgelistet sind.',
		'2. ALLE Preise sind in EUR (Euro) NUR.',
		'3. Wenn ein Benutzer nach einer Dienstleistung fragt, die NICHT auf dieser Liste steht, musst du ihn höflich informieren, dass diese Dienstleistung nicht verfügbar ist.'
	];
	
	const reminder = wellnessConfig.reminder || 'ERINNERE DICH: Wenn ein Benutzer nach IRGENDEINER Dienstleistung fragt, die oben NICHT aufgeführt ist, musst du sagen, dass sie nicht verfügbar ist. Alle Preise sind nur in EUR.';
	
	const categoryNames = wellnessConfig.categoryNames || {
		massages: 'MASSAGEN',
		treatments: 'BEHANDLUNGEN',
		packages: 'PAKETE',
		facilities: 'EINRICHTUNGEN'
	};
	
	const currency = wellnessConfig.currency || {
		code: 'EUR',
		locale: 'de-DE'
	};
	
	const lines = [
		'[Wellness Context - CRITICAL INSTRUCTIONS]',
		'',
		...instructions,
		'',
		'TATSÄCHLICHE WELLNESS-DIENSTLEISTUNGEN (NUR DIESE EXISTIEREN):',
		''
	];
	
	// Format each category using configurable category names
	for (const [categoryKey, categoryName] of Object.entries(categoryNames)) {
		// @ts-ignore - Dynamic category access from wellnessData
		const categoryItems = wellnessData[categoryKey];
		if (categoryItems && categoryItems.length > 0) {
			lines.push(`${categoryName}:`);
			for (const item of categoryItems) {
				const priceFormatted = new Intl.NumberFormat(currency.locale, {
					style: 'currency',
					currency: currency.code,
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(item.price);
				const duration = item.duration ? ` (${item.duration})` : '';
				lines.push(`- ${item.name} - ${priceFormatted}${duration}`);
			}
			lines.push('');
		}
	}
	
	lines.push(reminder);
	
	return lines.join('\n');
}

/**
 * Schema for validation
 */
export const schema = {
	category: {
		type: 'string',
		optional: true,
		enum: ['massages', 'treatments', 'packages', 'facilities'],
		description: 'Wellness category filter'
	}
};

