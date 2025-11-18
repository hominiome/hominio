/**
 * CORS plugin for Elysia
 * Centralized CORS configuration
 */

import { cors } from "@elysiajs/cors";
import { getTrustedOrigins } from "../utils/trusted-origins";

export const corsPlugin = cors({
  origin: (origin) => {
    const trustedOrigins = getTrustedOrigins();
    if (!origin) return false;
    return trustedOrigins.includes(origin) ? origin : false;
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
});

