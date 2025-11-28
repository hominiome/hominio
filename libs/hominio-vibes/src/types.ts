/**
 * TypeScript types for vibe system
 */

export interface VibeConfig {
	id: string;
	name: string;
	role: string;
	description: string;
	vibePrompt: string; // Single unified prompt (replaces systemInstructionTemplate, examplesText, dataContext)
	dataContextSchemas?: string[]; // Schema IDs for dynamic data contexts (menu, wellness, calendar)
	skills: Skill[];
}


export interface DataContextItem {
	// ID for identifying specific data context items (e.g., "menu")
	id?: string;
	// Simple string instruction
	content?: string;
	// Structured context with title
	title?: string;
	// JSON data (will be stringified)
	data?: any;
	// Description for data context
	description?: string;
}

export interface Skill {
	id: string;
	name: string;
	description: string; // Contains all instructions about when and how to use this skill
	functionId: string;
	parameters?: Record<string, ParameterDefinition>;
}

export interface ParameterDefinition {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	description: string;
	optional?: boolean;
	enum?: string[];
	default?: any;
}

export interface FunctionHandler {
	handler: (args: any, context: FunctionContext) => Promise<FunctionResult>;
	uiComponent: () => Promise<any>;
	schema: Record<string, any>;
}

export interface FunctionContext {
	dataContext: string; // Formatted string context for LLM prompt
	rawDataContext?: DataContextItem[]; // Raw data context from vibe config (for extracting structured data)
	skillDataContext?: DataContextItem[]; // Skill-specific data context (e.g., menu data for show-menu skill)
	userId?: string;
	vibeId: string;
	// Automatically injected current date/time - always available in every tool call
	now?: {
		date: string; // YYYY-MM-DD format
		dateFormatted: string; // Human-readable format (e.g., "Montag, 25. November 2025")
		time: string; // HH:MM:SS format
		timestamp: string; // ISO timestamp
	};
}

export interface FunctionResult {
	success: boolean;
	data?: any;
	error?: string;
}

