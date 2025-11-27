# Context Injection Flow Documentation

## Overview

This document describes how context (system instructions, data, and prompts) is injected into AI conversations in the Hominio voice system. The architecture uses a unified, schema-based approach for dynamic data context management.

## Architecture Principles

1. **Single Source of Truth**: All data lives in Svelte stores (menu, wellness, calendar)
2. **Dynamic Context Injection**: Context is injected dynamically, not hardcoded in system instructions
3. **Background vs Visual Tools**: Clear distinction between background queries (context gathering) and visual actions (UI-triggering)
4. **Schema-Based Queries**: Universal `queryDataContext` tool for querying any data schema
5. **Unified Injection Manager**: Single manager handles all context injection for skills

## Context Injection Points

### 1. Initial System Instruction (Immutable)

**When**: At WebSocket connection start  
**What**: Base Hominio identity, available vibes list, available tools  
**Mutability**: Immutable (set once at connection start)

**Location**: `services/api/src/routes/v0/voice/live.ts` → `buildSystemInstruction()`

**Content**:
- Base Hominio identity
- List of available vibes (Charles, Karl, etc.)
- Available tools: `queryVibeContext`, `queryDataContext`, `actionSkill`
- Available data context schemas from active vibes
- Current date/time context

**Example**:
```
Du bist Hominio, ein hilfreicher KI-Assistent.

Du kannst verschiedene "Vibes" abfragen:
- **Charles Vibe** (vibeId: "charles"): Hotel Concierge...
- **Karl Vibe** (vibeId: "karl"): Calendar Assistant...

Verfügbare Tools:
- queryVibeContext: Lade Kontext und Tools von einem Vibe
- queryDataContext: Lade dynamische Datenkontexte (z.B. Menü, Wellness, Kalender)
- actionSkill: Führe eine Skill/Aktion aus

Verfügbare Datenkontexte für aktive Vibes: menu, wellness
Nutze queryDataContext mit schemaId, um diese Daten abzurufen.

AKTUELLES DATUM: Montag, 25. November 2025 (2025-11-25)
```

### 2. Vibe Context Injection (Dynamic)

**When**: AI calls `queryVibeContext({ vibeId: "charles" })`  
**What**: Vibe-specific context, skills, examples, static data context  
**Mutability**: Dynamic (injected when requested)

**Location**: `services/api/src/routes/v0/voice/live.ts` → `queryVibeContext` handler

**Flow**:
1. AI calls `queryVibeContext({ vibeId: "charles" })`
2. Server loads vibe config
3. Server builds vibe context string (skills, examples, static data context)
4. Server injects context via `session.sendClientContent()`
5. Server responds with success

**Content**:
- Vibe description
- Available skills list
- Examples and instructions
- Static data context (background knowledge, NOT menu/wellness data)

**Example**:
```
**Charles Vibe Kontext geladen**

Dein persönlicher Concierge...

Verfügbare Funktionen:
- **Speisekarte anzeigen** (skillId: "show-menu"): ...
- **Wellness-Programm anzeigen** (skillId: "show-wellness"): ...

Hintergrundwissen:
Hotelinformationen: Dies ist ein Luxushotel...
```

### 3. Data Context Query (Background - Optional)

**When**: AI calls `queryDataContext({ schemaId: "menu" })`  
**What**: Dynamic data from Svelte stores (menu, wellness, calendar)  
**Mutability**: Dynamic (injected when requested, data comes from stores)

**Location**: `services/api/src/routes/v0/voice/live.ts` → `queryDataContext` handler

**Flow**:
1. AI calls `queryDataContext({ schemaId: "menu", params: {} })`
2. Server routes to schema handler via registry
3. Handler calls store's `getMenuContextString()`
4. Store loads data and formats it using formatter function
5. Server injects context via `session.sendClientContent()`
6. Frontend shows mini info message (doesn't trigger UI)
7. Server responds with success

**Purpose**: 
- **Background query**: AI proactively queries data to understand what's available
- **No UI trigger**: Just injects context, doesn't show UI components
- **Self-serving**: AI decides when it needs more context

**Content**:
- Formatted data with instructions (e.g., menu items with prices, categories)
- Critical instructions about what data exists
- Reminders about data constraints

**Example**:
```
[Menu Context - CRITICAL INSTRUCTIONS]

DU MUSST DIESE REGELN STRENG BEFOLGEN:
1. Du darfst NUR Menüpunkte erwähnen, die unten aufgelistet sind.
2. ALLE Preise sind in EUR (Euro) NUR.
...

TATSÄCHLICHE MENÜPUNKTE (NUR DIESE EXISTIEREN):

VORSPEISEN:
- Caesar Salat - 11,90 € (Portion)
- Bruschetta - 9,20 € (Portion)
...
```

### 4. Skill Context Injection (Automatic - Visual Actions)

**When**: AI calls `actionSkill({ skillId: "show-menu" })`  
**What**: Same as data context query, but automatically injected when skill is executed  
**Mutability**: Dynamic (injected automatically when skill executes)

**Location**: `services/api/src/routes/v0/voice/live.ts` → `actionSkill` handler → `injectContextForSkill()`

**Flow**:
1. AI calls `actionSkill({ vibeId: "charles", skillId: "show-menu" })`
2. Server calls `injectContextForSkill({ skillId: "show-menu" })`
3. Context injection manager looks up formatter for skill
4. Formatter calls store's `getMenuContextString()`
5. Server injects context via `session.sendClientContent()`
6. Server executes skill handler (returns data for UI)
7. Frontend shows UI component (menu view)
8. Server responds with success

**Purpose**:
- **Visual action**: Triggers UI component to display data
- **Automatic context**: Ensures AI has context even if it didn't call `queryDataContext` first
- **User-facing**: Shows actual UI to user

**Content**: Same as data context query (formatted data with instructions)

## Complete Example Flow

### Scenario: User asks "What's on the menu?"

**Step 1: Connection Established**
```
[System] Initial system instruction injected
- Base Hominio identity
- Available vibes: charles, karl
- Available tools: queryVibeContext, queryDataContext, actionSkill
- Available schemas: menu, wellness (from active vibes)
```

**Step 2: AI Queries Vibe Context (Optional but Recommended)**
```
[AI] queryVibeContext({ vibeId: "charles" })
[Server] Loads Charles vibe config
[Server] Injects vibe context:
  - Charles description
  - Available skills: show-menu, show-wellness
  - Examples and instructions
  - Static background knowledge
[Frontend] Shows mini info: "Vibe context queried: charles"
```

**Step 3a: AI Queries Data Context (Optional - Background)**
```
[AI] queryDataContext({ schemaId: "menu" })
[Server] Routes to menu schema handler
[Server] Calls menu-store.getMenuContextString()
[Store] Loads menu data from Svelte store
[Store] Formats using show-menu.js formatter
[Server] Injects menu context:
  - Critical instructions
  - All menu items with prices
  - Category breakdown
[Frontend] Shows mini info: "Data context queried: menu"
[AI] Now knows what menu items exist
```

**Step 3b: AI Executes Skill (Visual Action)**
```
[AI] actionSkill({ vibeId: "charles", skillId: "show-menu" })
[Server] Calls injectContextForSkill({ skillId: "show-menu" })
[Server] Injects menu context (same as Step 3a)
[Server] Executes show-menu handler
[Handler] Gets menu data from store
[Handler] Returns data for UI
[Frontend] Shows MenuView component with menu items
[Frontend] User sees menu in UI
```

### Alternative Flow: AI Skips queryDataContext

**If AI doesn't call queryDataContext first:**
```
[AI] actionSkill({ vibeId: "charles", skillId: "show-menu" })
[Server] Still injects menu context automatically via injectContextForSkill()
[AI] Gets context anyway, just later in the flow
[UI] Still shows correctly
```

**Why this works**: The `injectContextForSkill()` manager ensures context is always injected when a skill executes, even if the AI didn't proactively query it.

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Svelte Stores (Data)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ menu-store   │  │wellness-store │  │calendar-store │    │
│  │              │  │               │  │               │    │
│  │ - Data       │  │ - Data        │  │ - Data        │    │
│  │ - getContext │  │ - getContext │  │ - getContext │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │            │
└─────────┼─────────────────┼─────────────────┼────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Schema Registry (Routing)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  schemaId → handler mapping                          │  │
│  │  "menu" → menu-store.getMenuContextString()          │  │
│  │  "wellness" → wellness-store.getWellnessContextString│  │
│  │  "calendar" → calendar-store.getCalendarContextString│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│         Context Injection Manager (Unified)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  skillId → formatter mapping                         │  │
│  │  "show-menu" → menu-store.getMenuContextString()     │  │
│  │  "show-wellness" → wellness-store.getWellness...()  │  │
│  │  "view-calendar" → calendar-store.getCalendar...()   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Voice Handler (API)                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  queryDataContext → Schema Registry                   │  │
│  │  actionSkill → Context Injection Manager              │  │
│  │  Both inject via session.sendClientContent()          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Key Differences: Background vs Visual

### Background Tools (Non-Visual)
- **`queryVibeContext`**: Loads vibe context, doesn't trigger UI
- **`queryDataContext`**: Loads data context, doesn't trigger UI
- **Purpose**: AI context gathering
- **Frontend**: Shows mini info message only

### Visual Tools (UI-Triggering)
- **`actionSkill({ skillId: "show-menu" })`**: Triggers UI component
- **Purpose**: User-facing actions
- **Frontend**: Shows full UI component (MenuView, WellnessView, etc.)
- **Automatic Context**: Also injects context automatically

## Why queryDataContext Exists

**Problem it solves**: 
- AI needs to understand available data BEFORE deciding what to do
- Example: AI wants to recommend a menu item, but doesn't know what's available
- Without `queryDataContext`, AI would have to guess or execute `actionSkill` blindly

**Solution**:
- AI can proactively call `queryDataContext({ schemaId: "menu" })` to see menu items
- Then AI can make informed recommendations
- Then AI can call `actionSkill` to show the UI

**Example conversation flow**:
```
User: "What's a good appetizer?"
AI: [calls queryDataContext({ schemaId: "menu" })]
AI: [sees Caesar Salat, Bruschetta, Tagesuppe]
AI: "I recommend the Caesar Salat - it's fresh romaine lettuce..."
User: "Show me the menu"
AI: [calls actionSkill({ skillId: "show-menu" })]
AI: [context already injected, UI shows menu]
```

## Configuration

### Vibe Config Structure

```json
{
  "id": "charles",
  "name": "Charles",
  "dataContextSchemas": ["menu", "wellness"],  // Declares available schemas
  "skills": [
    {
      "id": "show-menu",
      "name": "Speisekarte anzeigen",
      // NO hardcoded dataContext here - data lives in stores
    }
  ]
}
```

### Schema Registry

```javascript
// libs/hominio-vibes/src/data-context-schema-registry.js
{
  menu: {
    getContextString: getMenuContextString,  // From menu-store.js
    paramsSchema: { category: "string" },
    description: "Restaurant menu items"
  }
}
```

### Context Injection Manager

```javascript
// libs/hominio-vibes/src/context-injection-manager.js
{
  'show-menu': getMenuContextString,  // Maps skill → formatter
  'show-wellness': getWellnessContextString,
  'view-calendar': getCalendarContextString
}
```

## Benefits

1. **No Hardcoded Data**: Data lives in stores, not configs
2. **Single Source of Truth**: Each data type has one store
3. **Flexible Queries**: AI can query data proactively
4. **Automatic Context**: Skills always get context, even without proactive queries
5. **Clean Separation**: Background queries vs visual actions
6. **Extensible**: Easy to add new schemas and skills

## Migration Notes

**Old Flow** (Before refactor):
- Menu/wellness data hardcoded in vibe configs
- Context injected from config during `actionSkill`
- No way to query data proactively

**New Flow** (Current):
- Menu/wellness data in Svelte stores
- `queryDataContext` for proactive queries
- `injectContextForSkill` for automatic injection
- Unified, schema-based approach

