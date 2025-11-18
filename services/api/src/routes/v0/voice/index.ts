/**
 * Voice routes
 * Handles Google Live Voice API endpoints
 */

import { Elysia } from "elysia";
import { voiceLiveHandler } from "./live";

export const voiceRoutes = new Elysia({ prefix: "/api/v0/voice" })
    .ws("/live", voiceLiveHandler);

