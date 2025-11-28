import type { PageServerLoad } from './$types';

/**
 * Server-side load function for prompts admin route
 * Loads all prompt and context data
 */
export const load: PageServerLoad = async () => {
	// Import vibe-related functions
	const { listVibes, loadVibeConfig } = await import('@hominio/vibes');
	const { buildSystemInstruction } = await import('@hominio/vibes');
	const { buildVibeContextString } = await import('@hominio/vibes');
	const { loadCallConfig, buildRepeatedPrompt } = await import('@hominio/vibes');
	
	// Get all vibes
	const vibeIds = await listVibes();
	
	// Load all vibe configs
	const vibeConfigs = {};
	for (const vibeId of vibeIds) {
		try {
			vibeConfigs[vibeId] = await loadVibeConfig(vibeId);
		} catch (error) {
			console.error(`Failed to load vibe config for ${vibeId}:`, error);
		}
	}
	
	// Load call config
	const callConfig = await loadCallConfig();
	const repeatedPrompt = await buildRepeatedPrompt();
	
	// Build root Hominio system instruction (without repeatedPrompt - we show it separately)
	const rootSystemInstruction = await buildSystemInstruction({
		activeVibeIds: [],
		vibeConfigs,
		includeRepeatedPrompt: false
	});
	
	// Build initial system instruction (with repeatedPrompt)
	const initialSystemInstruction = await buildSystemInstruction({
		activeVibeIds: [],
		vibeConfigs,
		includeRepeatedPrompt: true
	});
	
	// Build vibe context strings
	const vibeContexts = {};
	for (const vibeId of vibeIds) {
		try {
			vibeContexts[vibeId] = await buildVibeContextString(vibeId);
		} catch (error) {
			console.error(`Failed to build vibe context for ${vibeId}:`, error);
		}
	}
	
	// Load context ingestion data (raw JSON only - no formatted strings)
	const { getMenuData, getWellnessData, getEntries } = await import('@hominio/vibes');
	
	const menuData = await getMenuData();
	const wellnessData = await getWellnessData();
	const calendarEntries = await getEntries();
	
	return {
		vibeIds,
		vibeConfigs,
		rootSystemInstruction,
		initialSystemInstruction,
		vibeContexts,
		callConfig: {
			raw: callConfig,
			repeatedPrompt,
			repeatedPromptTemplate: callConfig.repeatedPromptTemplate
		},
		contextData: {
			menu: {
				raw: menuData
			},
			wellness: {
				raw: wellnessData
			},
			calendar: {
				raw: calendarEntries
			}
		}
	};
};

