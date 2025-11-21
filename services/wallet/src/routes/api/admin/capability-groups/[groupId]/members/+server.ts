import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getAuthDb } from "$lib/db.server";
import { sql } from "kysely";

/**
 * POST /api/admin/capability-groups/[groupId]/members
 * Add a capability to a group
 */
export const POST: RequestHandler = async ({ request, params }) => {
  try {
    // TODO: Add admin authentication check
    const db = getAuthDb();
    const { groupId } = params;
    const { capabilityId } = await request.json();

    if (!capabilityId) {
      return json({ error: "capabilityId is required" }, { status: 400 });
    }

    // Check if group exists
    const group = await db
      .selectFrom("capability_groups")
      .selectAll()
      .where("id", "=", groupId)
      .executeTakeFirst();

    if (!group) {
      return json({ error: "Group not found" }, { status: 404 });
    }

    // Check if capability exists
    const capability = await db
      .selectFrom("capabilities")
      .selectAll()
      .where("id", "=", capabilityId)
      .executeTakeFirst();

    if (!capability) {
      return json({ error: "Capability not found" }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await db
      .selectFrom("capability_group_members")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("capability_id", "=", capabilityId)
      .executeTakeFirst();

    if (existingMember) {
      return json({ error: "Capability is already a member of this group" }, { status: 400 });
    }

    // Add member
    await db
      .insertInto("capability_group_members")
      .values({
        id: sql`gen_random_uuid()`,
        group_id: groupId,
        capability_id: capabilityId,
        created_at: sql`NOW()`,
      })
      .execute();

    return json({ success: true });
  } catch (error: any) {
    console.error("[Admin] Error adding capability to group:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

/**
 * DELETE /api/admin/capability-groups/[groupId]/members
 * Remove a capability from a group
 */
export const DELETE: RequestHandler = async ({ request, params }) => {
  try {
    // TODO: Add admin authentication check
    const db = getAuthDb();
    const { groupId } = params;
    const { capabilityId } = await request.json();

    if (!capabilityId) {
      return json({ error: "capabilityId is required" }, { status: 400 });
    }

    // Remove member
    await db
      .deleteFrom("capability_group_members")
      .where("group_id", "=", groupId)
      .where("capability_id", "=", capabilityId)
      .execute();

    return json({ success: true });
  } catch (error: any) {
    console.error("[Admin] Error removing capability from group:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

