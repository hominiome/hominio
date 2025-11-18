/**
 * Zero sync routes
 * Handles Zero sync endpoints (get-queries, push)
 */

import { Elysia } from "elysia";
import { getQueries } from "./get-queries";
import { push } from "./push";

export const zeroRoutes = new Elysia({ prefix: "/api/v0/zero" })
  .post("/get-queries", async ({ request }) => {
    return await getQueries({ request });
  })
  .post("/push", async ({ request }) => {
    return await push({ request });
  });

