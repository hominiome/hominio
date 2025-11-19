// Server-side mutator definitions
// These add permission checks and server-only logic
import type { Transaction } from '@rocicorp/zero';
import type { Schema } from '@hominio/zero';
import { createMutators } from '@hominio/zero';
import { isAdmin } from './admin';

// Type alias to avoid TypeScript complexity with ServerTransaction
// ServerTransaction requires 2 type arguments, but for our purposes we can simplify
type AnyTransaction = Transaction<Schema> | any;

export type AuthData = {
    sub: string; // User ID
    isAdmin?: boolean; // Admin flag (optional)
};

/**
 * Create server-side mutators with permission checks
 * @param authData - Authentication data from cookie session
 * @param clientMutators - Client mutators to reuse
 */
// Helper function to check if user can update a project
async function canUpdateProject(
    tx: AnyTransaction,
    projectId: string,
    userId: string
): Promise<boolean> {
    // Admins can always update
    if (isAdmin(userId)) {
        return true;
    }

    // If projectId is empty, checking for create permission
    // For now, allow any authenticated user to create projects
    if (!projectId) {
        return true;
    }

    // Check if user owns the project
    const projects = await tx.query.project.where('id', '=', projectId).run();
    const project = projects.length > 0 ? projects[0] : null;

    if (!project) {
        return false; // Project doesn't exist
    }

    // Owner can update
    return project.userId === userId;
}

export function createServerMutators(
    authData: AuthData | undefined,
    clientMutators: any // Typed as any to avoid complex CustomMutatorDefs inference
) {
    return {
        // ========================================
        // PROJECT MUTATORS (Reference Implementation)
        // ========================================

        project: {
            /**
             * Create a project (server-side)
             * Enforces permissions: founder OR admin
             */
            create: async (
                tx: AnyTransaction,
                args: {
                    id: string;
                    title: string;
                    description: string;
                    country: string;
                    city: string;
                    userId: string;
                    videoUrl?: string;
                    bannerImage?: string;
                    profileImageUrl?: string;
                    sdgs: string;
                    createdAt: string;
                }
            ) => {
                // Check authentication
                if (!authData?.sub) {
                    throw new Error('Unauthorized: Must be logged in to create projects');
                }

                // For now, allow any authenticated user to create projects
                // TODO: Add proper permission checks (founder/admin) when identities are implemented

                // Ensure user is creating project for themselves (unless admin)
                const userIsAdmin = isAdmin(authData.sub);
                if (!userIsAdmin && args.userId !== authData.sub) {
                    throw new Error('Forbidden: You can only create projects for yourself');
                }

                // Delegate to client mutator
                await clientMutators.project.create(tx, args);
            },

            /**
             * Update a project (server-side)
             * Enforces permissions: admin OR owner
             */
            update: async (
                tx: AnyTransaction,
                args: {
                    id: string;
                    title?: string;
                    description?: string;
                    country?: string;
                    city?: string;
                    videoUrl?: string;
                    bannerImage?: string;
                    profileImageUrl?: string;
                    sdgs?: string;
                    userId?: string; // Only admins can change owner
                }
            ) => {
                // Check authentication
                if (!authData?.sub) {
                    throw new Error('Unauthorized: Must be logged in to update projects');
                }

                const { id, userId: newUserId } = args;

                // Check permissions
                const canUpdate = await canUpdateProject(tx, id, authData.sub);

                if (!canUpdate) {
                    throw new Error(
                        'Forbidden: Only admins and project owners can update projects'
                    );
                }

                // If trying to change userId (project owner), only admins can do this
                if (newUserId !== undefined && newUserId !== null) {
                    // Get current project to check current owner
                    const projects = await tx.query.project.where('id', '=', id).run();
                    const currentProject = projects.length > 0 ? projects[0] : null;

                    if (currentProject && newUserId !== currentProject.userId) {
                        // userId is being changed to a different user - only admins allowed
                        const userIsAdmin = isAdmin(authData.sub);
                        if (!userIsAdmin) {
                            throw new Error('Forbidden: Only admins can change project owner');
                        }
                    }
                }

                // Delegate to client mutator
                await clientMutators.project.update(tx, args);
            },

            /**
             * Delete a project (server-side)
             * Enforces permissions: admin OR (founder AND owner)
             */
            delete: async (
                tx: AnyTransaction,
                args: {
                    id: string;
                }
            ) => {
                // Check authentication
                if (!authData?.sub) {
                    throw new Error('Unauthorized: Must be logged in to delete projects');
                }

                const { id } = args;

                // Check permissions
                const canUpdate = await canUpdateProject(tx, id, authData.sub);

                if (!canUpdate) {
                    throw new Error(
                        'Forbidden: Only admins and project owners can delete projects'
                    );
                }

                // For now, allow any authenticated user to create projects
                // TODO: Add proper permission checks (founder/admin) when identities are implemented

                // Ensure user is creating project for themselves (unless admin)
                const userIsAdmin = isAdmin(authData.sub);
                if (!userIsAdmin && args.userId !== authData.sub) {
                    throw new Error('Forbidden: You can only create projects for yourself');
                }

                // Delegate to client mutator
                await clientMutators.project.create(tx, args);
            },

            /**
             * Update a project (server-side)
             * Enforces permissions: admin OR owner
             */
            update: async (
                tx: AnyTransaction,
                args: {
                    id: string;
                    title?: string;
                    description?: string;
                    country?: string;
                    city?: string;
                    videoUrl?: string;
                    bannerImage?: string;
                    profileImageUrl?: string;
                    sdgs?: string;
                    userId?: string; // Only admins can change owner
                }
            ) => {
                // Check authentication
                if (!authData?.sub) {
                    throw new Error('Unauthorized: Must be logged in to update projects');
                }

                const { id, userId: newUserId } = args;

                // Check permissions
                const canUpdate = await canUpdateProject(tx, id, authData.sub);

                if (!canUpdate) {
                    throw new Error(
                        'Forbidden: Only admins and project owners can update projects'
                    );
                }

                // If trying to change userId (project owner), only admins can do this
                if (newUserId !== undefined && newUserId !== null) {
                    // Get current project to check current owner
                    const projects = await tx.query.project.where('id', '=', id).run();
                    const currentProject = projects.length > 0 ? projects[0] : null;

                    if (currentProject && newUserId !== currentProject.userId) {
                        // userId is being changed to a different user - only admins allowed
                        const userIsAdmin = isAdmin(authData.sub);
                        if (!userIsAdmin) {
                            throw new Error('Forbidden: Only admins can change project owner');
                        }
                    }
                }

                // Delegate to client mutator
                await clientMutators.project.update(tx, args);
            },

            /**
             * Delete a project (server-side)
             * Enforces permissions: admin OR owner
             */
            delete: async (
                tx: AnyTransaction,
                args: {
                    id: string;
                }
            ) => {
                // Check authentication
                if (!authData?.sub) {
                    throw new Error('Unauthorized: Must be logged in to delete projects');
                }

                const { id } = args;

                // Check permissions
                const canUpdate = await canUpdateProject(tx, id, authData.sub);

                if (!canUpdate) {
                    throw new Error(
                        'Forbidden: Only admins and project owners can delete projects'
                    );
                }

                // Delegate to client mutator
                await clientMutators.project.delete(tx, args);
            },
        },
    } as const;
}

