/**
 * Tool Schema Builder
 * Converts vibe skill parameters to proper JSON schema for tool definitions
 */

import { getAllSchemasMetadata, getRegisteredSchemaIds } from './data-context-schema-registry.js';

/**
 * Convert vibe skill parameter definition to JSON schema property
 * @param {Object} paramDef - Parameter definition from vibe config
 * @param {string} skillId - Skill ID this parameter belongs to
 * @param {string} vibeId - Vibe ID this skill belongs to
 * @param {boolean} isRequired - Whether this parameter is required
 * @returns {Object} JSON schema property
 */
function paramToSchemaProperty(paramDef, skillId, vibeId, isRequired) {
	const schema = {
		type: paramDef.type === 'number' ? 'number' : 'string',
		description: `${isRequired ? 'REQUIRED' : 'OPTIONAL'} when skillId='${skillId}' (${vibeId} vibe): ${paramDef.description || ''}`
	};
	
	if (paramDef.enum) {
		schema.enum = paramDef.enum;
	}
	
	return schema;
}

/**
 * Build JSON schema for actionSkill parameters (flat structure)
 * @param {Array} skills - Array of skill definitions from vibe configs
 * @param {Object<string, string>} skillToVibeMap - Map of skillId to vibeId
 * @returns {Object} JSON schema for parameters object
 */
export function buildActionSkillArgsSchema(skills, skillToVibeMap = {}) {
	// Build list of all skill IDs for description
	const allSkillIds = [...new Set(skills.map(s => s.id))].join("', '");
	
	// Get unique vibe IDs
	const vibeIds = [...new Set(Object.values(skillToVibeMap))];
	
	// Base properties that are always present
	const properties = {
		vibeId: {
			type: "string",
			description: `The vibe ID (e.g., ${vibeIds.map(v => `'${v}'`).join(', ')})`,
			enum: vibeIds.length > 0 ? vibeIds : ["charles", "karl"]
		},
		skillId: {
			type: "string",
			description: `The skill ID to execute. Available skills: '${allSkillIds}'.\n\nFor charles vibe:\n- 'show-menu': Use when user asks about menu, food, restaurant, Speisekarte\n- 'show-wellness': Use when user asks about wellness, spa, massages, treatments, wellness program, Wellness-Programm\n\nFor karl vibe:\n- 'view-calendar', 'create-calendar-entry', 'edit-calendar-entry', 'delete-calendar-entry'`
		}
	};
	
	const allRequiredFields = new Set(["vibeId", "skillId"]);
	
	// Collect all possible parameters from all skills
	for (const skill of skills) {
		const vibeId = skillToVibeMap[skill.id] || 'unknown';
		if (skill.parameters) {
			for (const [paramName, paramDef] of Object.entries(skill.parameters)) {
				const isRequired = !paramDef.optional;
				
				// Add property if not already defined
				if (!properties[paramName]) {
					properties[paramName] = paramToSchemaProperty(paramDef, skill.id, vibeId, isRequired);
				} else {
					// Merge descriptions if parameter is used by multiple skills
					const existingDesc = properties[paramName].description;
					const newDesc = paramToSchemaProperty(paramDef, skill.id, vibeId, isRequired).description;
					if (!existingDesc.includes(skill.id)) {
						properties[paramName].description = `${existingDesc}. ${newDesc}`;
					}
				}
			}
		}
	}
	
	// Build top-level description
	let description = 'Execute a skill/action. Required parameters depend on the skillId:\n\n';
	for (const skill of skills) {
		const vibeId = skillToVibeMap[skill.id] || 'unknown';
		description += `**When skillId='${skill.id}' (${vibeId} vibe):**\n`;
		const required = [];
		const optional = [];
		
		if (skill.parameters) {
			for (const [paramName, paramDef] of Object.entries(skill.parameters)) {
				if (paramDef.optional) {
					optional.push(paramName);
				} else {
					required.push(paramName);
				}
			}
		}
		
		if (required.length > 0) {
			description += `  REQUIRED: ${required.join(', ')}\n`;
		} else {
			description += `  (No extra parameters required)\n`;
		}
		if (optional.length > 0) {
			description += `  OPTIONAL: ${optional.join(', ')}\n`;
		}
		description += '\n';
	}
	
	return {
		type: 'object',
		properties,
		required: ["vibeId", "skillId"], // Only base fields are strictly required at JSON schema level, others depend on context
		additionalProperties: false
	};
}

/**
 * Build JSON schema for queryDataContext tool
 * Dynamically builds schema based on available data context schemas
 * @param {Object<string, import('./types.ts').VibeConfig>} vibeConfigs - Map of vibeId to vibe config
 * @returns {Object} JSON schema for queryDataContext parameters
 */
export function buildQueryDataContextSchema(vibeConfigs = {}) {
	// Collect all available schemas from vibe configs
	const availableSchemas = new Set();
	for (const vibeConfig of Object.values(vibeConfigs)) {
		if (vibeConfig.dataContextSchemas) {
			for (const schemaId of vibeConfig.dataContextSchemas) {
				availableSchemas.add(schemaId);
			}
		}
	}
	
	// Fallback to registered schemas if no vibe configs provided
	if (availableSchemas.size === 0) {
		const registeredSchemas = getRegisteredSchemaIds();
		for (const schemaId of registeredSchemas) {
			availableSchemas.add(schemaId);
		}
	}
	
	const schemaArray = Array.from(availableSchemas);
	const schemasMetadata = getAllSchemasMetadata();
	
	// Build properties object with all possible params from all schemas
	const properties = {
		schemaId: {
			type: "string",
			description: `The data context schema ID to query. Available schemas: ${schemaArray.map(s => `'${s}'`).join(', ')}`,
			enum: schemaArray
		},
		params: {
			type: "object",
			description: "Optional query parameters (schema-specific). Leave empty {} if no params needed.",
			properties: {},
			additionalProperties: true
		}
	};
	
	// Add schema-specific param descriptions
	let paramsDescription = "Schema-specific parameters:\n";
	for (const schemaId of schemaArray) {
		const metadata = schemasMetadata[schemaId];
		if (metadata && metadata.paramsSchema) {
			paramsDescription += `\n**For schemaId='${schemaId}':**\n`;
			if (metadata.paramsSchema.properties) {
				for (const [paramName, paramDef] of Object.entries(metadata.paramsSchema.properties)) {
					const required = metadata.paramsSchema.required?.includes(paramName) ? 'REQUIRED' : 'OPTIONAL';
					paramsDescription += `  - ${paramName} (${required}): ${paramDef.description || ''}\n`;
				}
			} else {
				paramsDescription += `  (No parameters)\n`;
			}
		}
	}
	
	properties.params.description += paramsDescription;
	
	return {
		type: 'object',
		properties,
		required: ["schemaId"],
		additionalProperties: false
	};
}

