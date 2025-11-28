/**
 * Show Menu Function
 * Displays restaurant menu items sorted by categories
 * 
 * Menu data is dynamically loaded from agent config's dataContext
 * Single source of truth: agent config JSON
 */

/**
 * Function handler - executes the skill logic
 * Gets menu data from Svelte store (single source of truth)
 * @param {Object} args - Function arguments
 * @param {string} [args.category] - Optional category filter
 * @param {Object} context - Function context
 * @param {string} [context.userId] - Current user ID
 * @param {string} context.vibeId - Vibe ID
 * @returns {Promise<Object>}
 */
export async function handler(args, context) {
	const { category } = args || {};
	
	// Get menu data from store (single source of truth)
	try {
		const { getMenuData } = await import('./menu-store.js');
		const menu = await getMenuData();
		
		if (!menu) {
			return {
				success: false,
				error: 'Menu data not available'
			};
		}
		
		// Filter by category if specified
		const result = category ? { [category]: menu[category] || [] } : menu;
		
		return {
			success: true,
			data: {
				menu: result,
				category: category || 'all',
				timestamp: new Date().toISOString()
			}
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to load menu data: ${error instanceof Error ? error.message : 'Unknown error'}`
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
 * Generate menu context string for LLM from agent config data
 * Formats the menu data from agent config into a readable string for LLM prompts
 * Uses configurable instructions, category names, currency, and reminder from skill contextConfig
 * @param {Object} menuData - Menu data from store
 * @param {Object} contextConfig - Context config from skill.contextConfig (REQUIRED)
 * @param {string[]} contextConfig.instructions - Array of instruction strings for LLM
 * @param {string} contextConfig.reminder - Reminder text to append at end
 * @param {Object<string, string>} contextConfig.categoryNames - Mapping of category keys to display names
 * @param {Object} contextConfig.currency - Currency configuration
 * @param {string} contextConfig.currency.code - Currency code (e.g., 'EUR')
 * @param {string} contextConfig.currency.locale - Locale for formatting (e.g., 'de-DE')
 * @returns {string} Formatted menu context string
 */
export function getMenuContextString(menuData, contextConfig) {
	if (!menuData) {
		return '';
	}
	
	if (!contextConfig) {
		throw new Error('contextConfig is required for getMenuContextString');
	}
	
	// Get configurable values from contextConfig (from skill config JSON)
	const instructions = contextConfig.instructions || [];
	const reminder = contextConfig.reminder || '';
	const categoryNames = contextConfig.categoryNames || {};
	const currency = contextConfig.currency || { code: 'EUR', locale: 'de-DE' };
	
	const lines = [
		'[Menu Context - CRITICAL INSTRUCTIONS]',
		'',
		...instructions,
		'',
		'TATSÄCHLICHE MENÜPUNKTE (NUR DIESE EXISTIEREN):',
		''
	];
	
	// Format each category using configurable category names
	for (const [categoryKey, categoryName] of Object.entries(categoryNames)) {
		// @ts-ignore - Dynamic category access from menuData
		const categoryItems = menuData[categoryKey];
		if (categoryItems && categoryItems.length > 0) {
			lines.push(`${categoryName}:`);
			for (const item of categoryItems) {
				const priceFormatted = new Intl.NumberFormat(currency.locale, {
					style: 'currency',
					currency: currency.code,
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(item.price);
				lines.push(`- ${item.name} - ${priceFormatted} (${item.type})`);
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
		enum: ['appetizers', 'mains', 'desserts', 'drinks'],
		description: 'Menu category filter'
	}
};

