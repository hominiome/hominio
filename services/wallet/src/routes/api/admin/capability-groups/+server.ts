import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAdmin } from "$lib/api-helpers";
import { getAuthDb } from "$lib/db.server";
import { sql } from "kysely";

/**
 * GET /api/admin/capability-groups
 * Get all capability groups with their members
 */
export const GET: RequestHandler = async ({ request }) => {
  try {
    await requireAdmin(request);
    const db = getAuthDb();

    // Get all groups
    const groups = await db
      .selectFrom("capability_groups")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    // Get members for each group
    const groupsWithMembers = await Promise.all(
      groups.map(async (group) => {
        const members = await db
          .selectFrom("capability_group_members")
          .innerJoin("capabilities", "capabilities.id", "capability_group_members.capability_id")
          .select([
            "capabilities.id",
            "capabilities.resource_type",
            "capabilities.resource_namespace",
            "capabilities.resource_id",
            "capabilities.actions",
            "capabilities.title",
            "capabilities.description",
          ])
          .where("capability_group_members.group_id", "=", group.id)
          .execute();

        return {
          ...group,
          members,
        };
      })
    );

    return json({ groups: groupsWithMembers });
  } catch (error: any) {
    console.error("[Admin] Error fetching capability groups:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

