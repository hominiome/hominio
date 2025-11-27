/**
 * Google Live Voice API WebSocket Proxy
 * 
 * Server-to-server proxy pattern:
 * Frontend → Elysia WebSocket → Google Live API WebSocket
 * 
 * Handles bidirectional audio streaming:
 * - Client audio (16-bit PCM, 16kHz) → Google Live API
 * - Google audio responses (24kHz) → Client
 */

import { GoogleGenAI, Modality } from "@google/genai";
import { requireWebSocketAuth } from "../../../lib/middleware/ws-auth";
import type { AuthData } from "../../../lib/auth-context";
import { checkCapability } from "@hominio/caps";
import { loadVibeConfig } from "@hominio/vibes";

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

if (!GOOGLE_AI_API_KEY) {
    console.warn("[voice/live] WARNING: GOOGLE_AI_API_KEY not set. Voice API will not work.");
}

// Initialize Google GenAI client
const ai = new GoogleGenAI({
    apiKey: GOOGLE_AI_API_KEY || "",
});

/**
 * Google Live API WebSocket handler configuration
 * 
 * Endpoint: /api/v0/voice/live
 * 
 * Authentication: Required (Better Auth cookies)
 * 
 * Message Format:
 * - Client → Server: JSON with audio data (base64 encoded PCM)
 * - Server → Client: JSON with audio data (base64 encoded PCM) or status messages
 */
export const voiceLiveHandler = {
    // Handle WebSocket connection open
    async open(ws: any) {
        // Try to get request from WebSocket data (Elysia may provide this)
        // If not available, try to access from WebSocket instance properties
        let request: Request | null = null;

        // Try different ways to access the upgrade request
        if (ws.data?.request) {
            request = ws.data.request as Request;
        } else if ((ws as any).data?.headers) {
            // Reconstruct request from headers if available
            const headers = (ws as any).data.headers;
            request = new Request("http://localhost", { headers });
        } else {
            // Last resort: try to access from WebSocket internal properties
            // In Bun, WebSocket upgrade request might be accessible differently
            console.warn("[voice/live] Could not access upgrade request, attempting to authenticate without it");
        }

        // Extract vibeId from query params if present (legacy support)
        let initialVibeId: string | null = null;
        if (request) {
            const url = new URL(request.url);
            initialVibeId = url.searchParams.get('vibeId') || url.searchParams.get('agentId'); // Support both for migration
        }

        let authData: AuthData | null = null;
        if (request) {
            try {
                authData = await requireWebSocketAuth(request);
            } catch (error) {
                console.error("[voice/live] Authentication failed:", error);
                ws.close(1008, "Authentication failed: Unauthorized");
                return;
            }
        } else {
            // If we can't get the request, we can't authenticate
            // This is a fallback - in production, Elysia should provide the request
            console.error("[voice/live] Cannot authenticate: No request available");
            ws.close(1008, "Authentication failed: No request data");
            return;
        }

        // Store authData for later use
        ws.data.authData = authData;

        // Check capability: require api:voice capability (default deny)
        const principal = `user:${authData.sub}`;
        console.log(`[voice/live] 🔍 Checking capability for user ${authData.sub} (principal: ${principal})`);

        let hasVoiceCapability = false;
        try {
            hasVoiceCapability = await checkCapability(
                principal,
                { type: 'api', namespace: 'voice' },
                'read'
            );
            console.log(`[voice/live] 🔍 Capability check result: ${hasVoiceCapability}`);
        } catch (error) {
            console.error(`[voice/live] ❌ Error checking capability:`, error);
            // Default deny on error
            hasVoiceCapability = false;
        }

        if (!hasVoiceCapability) {
            console.log(`[voice/live] ❌ BLOCKED WebSocket connection - user ${authData.sub} does not have api:voice capability`);
            ws.close(1008, "Forbidden: No api:voice capability. Access denied by default.");
            return;
        }

        console.log(`[voice/live] ✅ ALLOWED WebSocket connection - user ${authData.sub} has api:voice capability`);

        // Connect to Google Live API
        try {
            // Track active vibes (can have multiple simultaneously)
            let activeVibeIds: string[] = [];
            const vibeConfigs: Record<string, any> = {};

            // Load all vibe configs and build comprehensive tool schema
            const { buildSystemInstruction, buildActionSkillArgsSchema, buildQueryDataContextSchema, listVibes } = await import('@hominio/vibes');
            const allSkills = [];
            const skillToVibeMap: Record<string, string> = {};
            let actionSkillArgsSchema: any = null;

            try {
                // Load all known vibes
                const vibeIds = await listVibes();
                for (const vibeId of vibeIds) {
                    try {
                        const vibeConfig = await loadVibeConfig(vibeId);
                        vibeConfigs[vibeId] = vibeConfig; // Store for later use
                        if (vibeConfig.skills) {
                            allSkills.push(...vibeConfig.skills);
                            // Map each skill to its vibe
                            for (const skill of vibeConfig.skills) {
                                skillToVibeMap[skill.id] = vibeId;
                            }
                        }
                    } catch (err) {
                        console.warn(`[voice/live] Failed to load vibe config for ${vibeId}:`, err);
                    }
                }

                // Build comprehensive schema from all skills
                if (allSkills.length > 0) {
                    actionSkillArgsSchema = buildActionSkillArgsSchema(allSkills, skillToVibeMap);
                    console.log(`[voice/live] ✅ Built actionSkill args schema from ${allSkills.length} skills`);
                    console.log(`[voice/live] Schema has ${Object.keys(actionSkillArgsSchema.properties || {}).length} properties:`, Object.keys(actionSkillArgsSchema.properties || {}));
                } else {
                    console.warn(`[voice/live] ⚠️ No skills found to build schema`);
                }
            } catch (err) {
                console.error(`[voice/live] Failed to build tool schema:`, err);
            }

            // Build unified Hominio system instruction
            let systemInstruction = await buildSystemInstruction({ activeVibeIds, vibeConfigs });

            // Load initial vibe context if provided
            if (initialVibeId) {
                try {
                    activeVibeIds.push(initialVibeId);
                    const vibeConfig = vibeConfigs[initialVibeId];
                    if (vibeConfig) {
                        // Rebuild system instruction with initial vibe
                        systemInstruction = await buildSystemInstruction({ activeVibeIds, vibeConfigs });
                        console.log(`[voice/live] ✅ Loaded initial vibe context: ${initialVibeId}`);
                        console.log(`[voice/live] Vibe config has ${vibeConfig.skills?.length || 0} skills:`, vibeConfig.skills?.map(s => s.id) || []);
                    }
                } catch (err) {
                    console.error(`[voice/live] Failed to load initial vibe config:`, err);
                }
            }

            console.log(`[voice/live] System instruction length: ${systemInstruction.length} chars`);
            console.log(`[voice/live] System instruction preview (first 1000 chars): ${systemInstruction.substring(0, 1000)}`);

            const config = {
                responseModalities: [Modality.AUDIO],
                systemInstruction: systemInstruction,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Sadachbia",
                        },
                    },
                },
                tools: [
                    {
                        functionDeclarations: [
                            {
                                name: "queryVibeContext",
                                description: "Load additional context and tools from a vibe. Use this when you need specific capabilities (e.g., calendar operations → 'karl', menu/wellness → 'charles'). You can query multiple vibes simultaneously. Automatically call this when user requests functionality that requires a specific vibe.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        vibeId: {
                                            type: "string",
                                            description: "The vibe ID to query (e.g., 'charles', 'karl')",
                                            enum: Object.keys(vibeConfigs).length > 0 ? Object.keys(vibeConfigs) : ["charles", "karl"]
                                        }
                                    },
                                    required: ["vibeId"]
                                }
                            },
                            {
                                name: "queryDataContext",
                                description: "Query dynamic data contexts (e.g., menu, wellness, calendar). Use this to load current data before executing actionSkill. This is a background query that doesn't trigger UI - it just loads context for you to understand available data.",
                                parameters: (() => {
                                    try {
                                        const queryDataContextSchema = buildQueryDataContextSchema(vibeConfigs);
                                        console.log(`[voice/live] ✅ Built queryDataContext schema`);
                                        return queryDataContextSchema;
                                    } catch (err) {
                                        console.warn(`[voice/live] ⚠️ Failed to build queryDataContext schema:`, err);
                                        return {
                                            type: "object",
                                            properties: {
                                                schemaId: {
                                                    type: "string",
                                                    description: "The data context schema ID (e.g., 'menu', 'wellness', 'calendar')",
                                                    enum: ["menu", "wellness", "calendar"]
                                                },
                                                params: {
                                                    type: "object",
                                                    description: "Optional query parameters (schema-specific)",
                                                    additionalProperties: true
                                                }
                                            },
                                            required: ["schemaId"]
                                        };
                                    }
                                })()
                            },
                            {
                                name: "actionSkill",
                                description: "Execute a skill/action for a vibe. REQUIRED: You MUST use this tool - verbal responses alone are not sufficient.\n\nFor charles vibe:\n1. show-menu: When user asks about menu, food, restaurant, Speisekarte → use skillId: \"show-menu\"\n2. show-wellness: When user asks about wellness, spa, massages, treatments, wellness program, Wellness-Programm → use skillId: \"show-wellness\"\n\nFor karl vibe:\n- view-calendar, create-calendar-entry, edit-calendar-entry, delete-calendar-entry\n\nParameters are top-level (no args object).",
                                parameters: (() => {
                                    if (actionSkillArgsSchema && actionSkillArgsSchema.properties) {
                                        console.log(`[voice/live] ✅ Using generated schema for actionSkill`);
                                        return actionSkillArgsSchema;
                                    }
                                    console.warn(`[voice/live] ⚠️ No schema available, using fallback`);
                                    return {
                                        type: "object",
                                        properties: {
                                            vibeId: { type: "string", enum: ["charles", "karl"], description: "Vibe ID" },
                                            skillId: { type: "string", description: "Skill ID" },

                                        },
                                        required: ["vibeId", "skillId"]
                                    };
                                })()
                            }
                        ]
                    }
                ],
            };

            const session = await ai.live.connect({
                model: MODEL,
                callbacks: {
                    onopen: () => {
                        // Send connection status to client
                        ws.send(JSON.stringify({
                            type: "status",
                            status: "connected",
                            message: "Connected to Google Live API",
                        }));
                    },
                    onmessage: async (message: any) => {
                        // Forward Google messages to client
                        try {
                            // Check for user transcripts in clientContent
                            if (message.clientContent?.userTurn) {
                                const userParts = message.clientContent.userTurn.parts || [];
                                const userTextParts = userParts.filter((p: any) => p.text);
                                if (userTextParts.length > 0) {
                                    const userText = userTextParts.map((p: any) => p.text).join('');
                                    console.log(`[voice/live] 📝 USER TRANSCRIPT (user ${authData.sub}):`, userText);
                                }

                                // Check for turnComplete to log final transcript
                                if (message.clientContent.userTurn.turnComplete) {
                                    const finalParts = userParts.filter((p: any) => p.text);
                                    if (finalParts.length > 0) {
                                        const finalText = finalParts.map((p: any) => p.text).join('');
                                        console.log(`[voice/live] 📝 USER TURN COMPLETE (user ${authData.sub}):`, finalText);
                                    }
                                }
                            }

                            // Also check for transcript events directly in message
                            if (message.transcript) {
                                console.log(`[voice/live] 📝 TRANSCRIPT EVENT (user ${authData.sub}):`, JSON.stringify(message.transcript));
                            }

                            // Handle different message types from Google Live API
                            if (message.serverContent) {
                                const parts = message.serverContent?.modelTurn?.parts || [];

                                // CRITICAL: Process ALL parts in order - audio FIRST, then everything else
                                // This ensures audio is NEVER dropped, even when mixed with function calls or text

                                // Step 1: Send ALL audio parts immediately (highest priority)
                                for (const part of parts) {
                                    if (part.inlineData?.data) {
                                        // Audio data - send immediately, don't wait for anything
                                        ws.send(JSON.stringify({
                                            type: "audio",
                                            data: part.inlineData.data,
                                            mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                                        }));
                                    }
                                }

                                // Step 2: Log text parts (non-blocking)
                                const textParts = parts.filter((p: any) => p.text);
                                if (textParts.length > 0) {
                                    const aiText = textParts.map((p: any) => p.text).join('');
                                    console.log(`[voice/live] 🤖 AI TRANSCRIPT (user ${authData.sub}):`, aiText);
                                }

                                // Step 3: Log Turn Complete if present
                                if (message.serverContent.modelTurn?.turnComplete) {
                                    const finalParts = parts.filter((p: any) => p.text);
                                    if (finalParts.length > 0) {
                                        const finalText = finalParts.map((p: any) => p.text).join('');
                                        console.log(`[voice/live] 🤖 AI TURN COMPLETE (user ${authData.sub}):`, finalText);
                                    }
                                }

                                // Step 4: Handle Function Calls (after audio is already sent)
                                for (const part of parts) {
                                    if (!part.functionCall) continue;

                                    const functionCall = part.functionCall;
                                    console.log("[voice/live] Handling function call:", JSON.stringify(functionCall));

                                    // Send tool call to frontend for client-side handling
                                    ws.send(JSON.stringify({
                                        type: "toolCall",
                                        toolName: functionCall.name,
                                        args: functionCall.args || {},
                                    }));

                                    let response: any = { error: "Unknown tool" };
                                    if (functionCall.name === "get_name") {
                                        response = { name: "hominio" };
                                    } else if (functionCall.name === "queryDataContext") {
                                        // Handle queryDataContext tool call: load data context from stores
                                        const { schemaId, params = {} } = functionCall.args || {};
                                        console.log(`[voice/live] 🔄 Querying data context: schema="${schemaId}"`);

                                        try {
                                            const { handleQueryDataContext } = await import('@hominio/vibes');
                                            const result = await handleQueryDataContext({
                                                schemaId,
                                                params,
                                                injectFn: (content) => session.sendClientContent(content)
                                            });

                                            if (result.success) {
                                                console.log(`[voice/live] ✅ Loaded data context: ${schemaId}`);
                                                response = {
                                                    success: true,
                                                    message: result.message || `Loaded ${schemaId} data context`,
                                                    schemaId: schemaId
                                                };
                                            } else {
                                                response = {
                                                    success: false,
                                                    error: result.error || `Failed to load ${schemaId} data context`
                                                };
                                            }
                                        } catch (err) {
                                            console.error(`[voice/live] Failed to query data context:`, err);
                                            response = { success: false, error: `Failed to query data context: ${err instanceof Error ? err.message : 'Unknown error'}` };
                                        }
                                    } else if (functionCall.name === "queryVibeContext") {
                                        // Handle vibe context query: load context and inject into conversation
                                        const vibeId = functionCall.args?.vibeId || 'unknown';
                                        console.log(`[voice/live] 🔄 Querying vibe context: "${vibeId}" (serverContent handler)`);

                                        try {
                                            // Check if vibe is already active
                                            if (!activeVibeIds.includes(vibeId)) {
                                                activeVibeIds.push(vibeId);
                                            }

                                            // Load vibe config if not already loaded
                                            if (!vibeConfigs[vibeId]) {
                                                vibeConfigs[vibeId] = await loadVibeConfig(vibeId);
                                            }

                                            // Build vibe context string and await before responding
                                            const { buildVibeContextString, getVibeTools } = await import('@hominio/vibes');
                                            const vibeContext = await buildVibeContextString(vibeId);
                                            const availableTools = await getVibeTools(vibeId);

                                            // Inject vibe context into conversation BEFORE sending tool response
                                            session.sendClientContent({
                                                turns: vibeContext,
                                                turnComplete: true,
                                            });

                                            console.log(`[voice/live] ✅ Loaded vibe context: ${vibeId}`);
                                            console.log(`[voice/live] Available tools: ${availableTools.join(', ')}`);

                                            response = {
                                                success: true,
                                                message: `Loaded ${vibeId} vibe context`,
                                                vibeId: vibeId
                                            };
                                        } catch (err) {
                                            console.error(`[voice/live] Failed to load vibe context:`, err);
                                            response = { success: false, error: `Failed to load vibe context: ${vibeId}` };
                                        }
                                    } else if (functionCall.name === "actionSkill") {
                                        // Handle actionSkill tool call
                                        const { vibeId, skillId, args } = functionCall.args || {};
                                        // Support legacy agentId parameter
                                        const effectiveVibeId = vibeId || (functionCall.args as any)?.agentId;
                                        console.log(`[voice/live] ✅ Handling actionSkill tool call: vibe="${effectiveVibeId}", skill="${skillId}", args:`, args);

                                        // Use unified context injection manager
                                        try {
                                            const { injectContextForSkill } = await import('@hominio/vibes');
                                            await injectContextForSkill({
                                                skillId: skillId,
                                                injectFn: (content) => session.sendClientContent(content)
                                            });
                                        } catch (err) {
                                            console.error(`[voice/live] Error injecting context for skill ${skillId}:`, err);
                                            // Continue even if context injection fails
                                        }

                                        response = { success: true, message: `Executing skill ${skillId} for vibe ${effectiveVibeId}`, vibeId: effectiveVibeId, skillId };
                                    }

                                    console.log("[voice/live] Sending tool response:", JSON.stringify(response));

                                    session.sendToolResponse({
                                        functionResponses: [
                                            {
                                                id: functionCall.id,
                                                name: functionCall.name,
                                                response: { result: response }
                                            }
                                        ]
                                    });
                                }

                                // 4. Handle Turn Complete / Other Content
                                if (message.serverContent.turnComplete) {
                                    console.log(`[voice/live] 🏁 TURN COMPLETE (user ${authData.sub})`);
                                    // Forward server content to client (e.g. for UI state)
                                    ws.send(JSON.stringify({
                                        type: "serverContent",
                                        data: message.serverContent,
                                    }));
                                }
                            } else if (message.data) {
                                // Direct audio data chunk (fallback)
                                ws.send(JSON.stringify({
                                    type: "audio",
                                    data: message.data,
                                    mimeType: message.mimeType || "audio/pcm;rate=24000",
                                }));
                            } else if (message.setupComplete) {
                                // Setup complete message
                                ws.send(JSON.stringify({
                                    type: "serverContent",
                                    data: { setupComplete: message.setupComplete },
                                }));
                            } else if (message.toolCall) {
                                // Handle top-level toolCall (if SDK abstracts it this way)
                                console.log("[voice/live] Received top-level tool call:", JSON.stringify(message.toolCall));

                                const functionCalls = message.toolCall.functionCalls;

                                // Send each tool call to frontend for client-side handling
                                functionCalls.forEach((fc: any) => {
                                    ws.send(JSON.stringify({
                                        type: "toolCall",
                                        toolName: fc.name,
                                        args: fc.args || {},
                                        // Also include data format for compatibility
                                        data: {
                                            functionCalls: [{
                                                name: fc.name,
                                                args: fc.args || {},
                                                id: fc.id
                                            }]
                                        }
                                    }));
                                });

                                // Send success responses back to Google (frontend handles the actual work)
                                // Import vibe utilities once before processing
                                const { buildVibeContextString, getVibeTools } = await import('@hominio/vibes');

                                // Process tool calls asynchronously
                                const responses = await Promise.all(functionCalls.map(async (fc: any) => {
                                    const toolName = fc.name;
                                    console.log(`[voice/live] 🔧 Processing tool call: "${toolName}"`, JSON.stringify(fc.args));

                                    // Handle known tools
                                    if (toolName === "get_name") {
                                        console.log(`[voice/live] ✅ Responding to get_name`);
                                        return {
                                            name: "get_name",
                                            response: { result: { name: "hominio" } },
                                            id: fc.id
                                        };
                                    }

                                    if (toolName === "queryDataContext") {
                                        // Handle queryDataContext tool call: load data context from stores
                                        const { schemaId, params = {} } = fc.args || {};
                                        console.log(`[voice/live] 🔄 Querying data context: schema="${schemaId}"`);

                                        try {
                                            const { handleQueryDataContext } = await import('@hominio/vibes');
                                            const result = await handleQueryDataContext({
                                                schemaId,
                                                params,
                                                injectFn: (content) => session.sendClientContent(content)
                                            });

                                            if (result.success) {
                                                console.log(`[voice/live] ✅ Loaded data context: ${schemaId}`);
                                                return {
                                                    name: "queryDataContext",
                                                    response: {
                                                        result: {
                                                            success: true,
                                                            message: result.message || `Loaded ${schemaId} data context`,
                                                            schemaId: schemaId
                                                        }
                                                    },
                                                    id: fc.id
                                                };
                                            } else {
                                                return {
                                                    name: "queryDataContext",
                                                    response: {
                                                        result: {
                                                            success: false,
                                                            error: result.error || `Failed to load ${schemaId} data context`
                                                        }
                                                    },
                                                    id: fc.id
                                                };
                                            }
                                        } catch (err) {
                                            console.error(`[voice/live] Failed to query data context:`, err);
                                            return {
                                                name: "queryDataContext",
                                                response: { result: { success: false, error: `Failed to query data context: ${err instanceof Error ? err.message : 'Unknown error'}` } },
                                                id: fc.id
                                            };
                                        }
                                    }

                                    if (toolName === "queryVibeContext") {
                                        // Handle vibe context query: load context and inject into conversation
                                        const vibeId = fc.args?.vibeId || 'unknown';
                                        console.log(`[voice/live] 🔄 Querying vibe context: "${vibeId}"`);

                                        // Check if vibe is already active
                                        if (!activeVibeIds.includes(vibeId)) {
                                            activeVibeIds.push(vibeId);
                                        }

                                        // Load vibe config if not already loaded
                                        if (!vibeConfigs[vibeId]) {
                                            try {
                                                vibeConfigs[vibeId] = await loadVibeConfig(vibeId);
                                            } catch (err) {
                                                console.error(`[voice/live] Failed to load vibe config:`, err);
                                                return {
                                                    name: "queryVibeContext",
                                                    response: { result: { success: false, error: `Failed to load vibe context: ${vibeId}` } },
                                                    id: fc.id
                                                };
                                            }
                                        }

                                        // Build vibe context string and await before responding
                                        try {
                                            const { buildVibeContextString, getVibeTools } = await import('@hominio/vibes');
                                            const vibeContext = await buildVibeContextString(vibeId);
                                            const availableTools = await getVibeTools(vibeId);

                                            // Inject vibe context into conversation BEFORE sending tool response
                                            session.sendClientContent({
                                                turns: vibeContext,
                                                turnComplete: true,
                                            });

                                            console.log(`[voice/live] ✅ Loaded vibe context: ${vibeId}`);
                                            console.log(`[voice/live] Available tools: ${availableTools.join(', ')}`);

                                            return {
                                                name: "queryVibeContext",
                                                response: { result: { success: true, message: `Loaded ${vibeId} vibe context`, vibeId: vibeId } },
                                                id: fc.id
                                            };
                                        } catch (err) {
                                            console.error(`[voice/live] Error building vibe context:`, err);
                                            return {
                                                name: "queryVibeContext",
                                                response: { result: { success: false, error: `Failed to build vibe context: ${vibeId}` } },
                                                id: fc.id
                                            };
                                        }
                                    }

                                    if (toolName === "actionSkill") {
                                        // Frontend handles actionSkill execution, just acknowledge
                                        // Flatten parameters: args are top-level in tool call, but we need to pass them as 'args' object
                                        const { vibeId, skillId, ...rawArgs } = fc.args || {};
                                        // Support legacy agentId parameter
                                        const effectiveVibeId = vibeId || (fc.args as any)?.agentId;

                                        // Handle potential nested args from LLM (hallucination or habit)
                                        // If rawArgs has a single property 'args' which is an object, use that instead
                                        let args = rawArgs;
                                        if (Object.keys(rawArgs).length === 1 && rawArgs.args && typeof rawArgs.args === 'object') {
                                            console.log(`[voice/live] ⚠️ Detected nested 'args' object from LLM, flattening...`);
                                            args = rawArgs.args;
                                        }

                                        console.log(`[voice/live] 🔧 Processing tool call: "${toolName}"`, JSON.stringify(fc));
                                        console.log(`[voice/live] ✅ Handling actionSkill tool call: vibe="${effectiveVibeId}", skill="${skillId}", args:`, args);

                                        // Use unified context injection manager
                                        try {
                                            const { injectContextForSkill } = await import('@hominio/vibes');
                                            await injectContextForSkill({
                                                skillId: skillId,
                                                injectFn: (content) => session.sendClientContent(content)
                                            });
                                        } catch (err) {
                                            console.error(`[voice/live] Error injecting context for skill ${skillId}:`, err);
                                            // Continue even if context injection fails
                                        }

                                        return {
                                            name: "actionSkill",
                                            response: { result: { success: true, message: `Executing skill ${skillId} for vibe ${effectiveVibeId}`, vibeId: effectiveVibeId, skillId } },
                                            id: fc.id
                                        };
                                    }

                                    // Unknown tool
                                    console.warn(`[voice/live] ⚠️ Unknown tool: "${toolName}"`);
                                    return {
                                        name: toolName,
                                        response: { result: { error: `Unknown tool: ${toolName}` } },
                                        id: fc.id
                                    };
                                }));

                                console.log("[voice/live] Sending top-level tool response:", JSON.stringify(responses));
                                session.sendToolResponse({
                                    functionResponses: responses
                                });
                            }
                        } catch (error) {
                            console.error("[voice/live] Error forwarding message to client:", error);
                            ws.send(JSON.stringify({
                                type: "error",
                                message: "Failed to process server message",
                            }));
                        }
                    },
                    onerror: (error: ErrorEvent) => {
                        console.error(`[voice/live] Google Live API error for user ${authData.sub}:`, error);
                        ws.send(JSON.stringify({
                            type: "error",
                            message: error.message || "Google Live API error",
                        }));
                    },
                    onclose: (event: CloseEvent) => {
                        ws.send(JSON.stringify({
                            type: "status",
                            status: "disconnected",
                            message: event.reason || "Connection closed",
                        }));
                    },
                },
                config: config,
            });

            // Store session in WebSocket data for cleanup
            ws.data.googleSession = session;

        } catch (error) {
            console.error(`[voice/live] Failed to connect to Google Live API for user ${authData.sub}:`, error);
            ws.send(JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to connect to Google Live API",
            }));
            ws.close(1011, "Failed to connect to Google Live API");
        }
    },

    // Handle messages from client
    async message(ws: any, message: string | Buffer) {
        const authData = ws.data.authData as AuthData;
        const session = ws.data.googleSession;

        if (!session) {
            console.warn(`[voice/live] No Google session for user ${authData.sub}`);
            ws.send(JSON.stringify({
                type: "error",
                message: "Not connected to Google Live API",
            }));
            return;
        }

        try {
            // Parse client message - Elysia WebSocket messages are already parsed or strings
            let clientMessage: any;
            if (typeof message === "string") {
                try {
                    clientMessage = JSON.parse(message);
                } catch (e) {
                    console.error("[voice/live] Failed to parse message as JSON:", e);
                    return;
                }
            } else if (Buffer.isBuffer(message)) {
                try {
                    clientMessage = JSON.parse(message.toString());
                } catch (e) {
                    console.error("[voice/live] Failed to parse Buffer message as JSON:", e);
                    return;
                }
            } else {
                // Already an object
                clientMessage = message;
            }

            // Handle different message types from client
            if (clientMessage.type === "audio" && clientMessage.data) {
                // Forward audio to Google Live API
                session.sendRealtimeInput({
                    media: {
                        data: clientMessage.data,
                        mimeType: clientMessage.mimeType || "audio/pcm;rate=16000",
                    },
                });
            } else if (clientMessage.type === "text" && clientMessage.text) {
                // Forward text to Google Live API
                // Note: Voice transcripts come through clientContent events, not text messages
                session.sendClientContent({
                    turns: clientMessage.text,
                    turnComplete: clientMessage.turnComplete !== false,
                });
            } else if (clientMessage.type === "activityEnd") {
                // Signal end of user activity
                session.sendRealtimeInput({
                    activityEnd: {},
                });
            } else {
                // Unknown message type - log and ignore
                console.warn(`[voice/live] Unknown message type from client:`, clientMessage.type);
            }
        } catch (error) {
            console.error(`[voice/live] Error processing client message for user ${authData.sub}:`, error);
            ws.send(JSON.stringify({
                type: "error",
                message: "Failed to process message",
            }));
        }
    },

    // Handle WebSocket connection close
    async close(ws: any) {
        const authData = ws.data.authData as AuthData;
        const session = ws.data.googleSession;

        // Clean up Google Live API session
        if (session) {
            try {
                session.close();
            } catch (error) {
                console.error(`[voice/live] Error closing Google session for user ${authData.sub}:`, error);
            }
        }
    },
};
