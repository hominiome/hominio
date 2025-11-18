// Client-side mutator definitions
// These run optimistically on the client for instant UI updates
import type { Transaction } from '@rocicorp/zero';
import type { Schema } from '../zero-schema';

export type AuthData = {
    sub: string; // User ID
    isAdmin?: boolean; // Admin flag (optional, checked server-side)
};

/**
 * Create mutators for Zero client
 * @param authData - Authentication data (optional, for client-side checks)
 */
export function createMutators(authData: AuthData | undefined) {
    return {
        // ========================================
        // PROJECT MUTATORS (Reference Implementation)
        // ========================================

        project: {
            /**
             * Create a new project
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates permissions (founder OR admin)
             */
            create: async (
                tx: Transaction<Schema>,
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
                // Client-side validation
                if (!args.title || args.title.trim().length === 0) {
                    throw new Error('Title is required');
                }

                if (!args.description || args.description.trim().length === 0) {
                    throw new Error('Description is required');
                }

                // Insert project
                await tx.mutate.project.insert({
                    id: args.id,
                    title: args.title.trim(),
                    description: args.description.trim(),
                    country: args.country.trim(),
                    city: args.city.trim(),
                    userId: args.userId,
                    videoUrl: (args.videoUrl || '').trim(),
                    bannerImage: (args.bannerImage || '').trim(),
                    profileImageUrl: (args.profileImageUrl || '').trim(),
                    sdgs: args.sdgs,
                    createdAt: args.createdAt,
                });
            },

            /**
             * Update a project
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates permissions (admin OR owner)
             */
            update: async (
                tx: Transaction<Schema>,
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
                const { id, ...updates } = args;

                // Client-side validation (optimistic)
                if (updates.title && updates.title.trim().length === 0) {
                    throw new Error('Title cannot be empty');
                }

                if (updates.description && updates.description.trim().length === 0) {
                    throw new Error('Description cannot be empty');
                }

                // Read existing project
                const project = await tx.query.project.where('id', id).one();

                if (!project) {
                    throw new Error('Project not found');
                }

                // Prepare update data (trim strings, preserve empty strings as empty)
                const updateData: Partial<typeof project> = {};

                if (updates.title !== undefined) {
                    updateData.title = updates.title.trim();
                }
                if (updates.description !== undefined) {
                    updateData.description = updates.description.trim();
                }
                if (updates.country !== undefined) {
                    updateData.country = updates.country.trim();
                }
                if (updates.city !== undefined) {
                    updateData.city = updates.city.trim();
                }
                if (updates.videoUrl !== undefined) {
                    updateData.videoUrl = updates.videoUrl.trim();
                }
                if (updates.bannerImage !== undefined) {
                    updateData.bannerImage = updates.bannerImage.trim();
                }
                if (updates.profileImageUrl !== undefined) {
                    updateData.profileImageUrl = updates.profileImageUrl.trim();
                }
                if (updates.sdgs !== undefined) {
                    updateData.sdgs = updates.sdgs;
                }
                // Only admins can change userId (enforced server-side)
                if (updates.userId !== undefined) {
                    updateData.userId = updates.userId;
                }

                // Update project
                await tx.mutate.project.update({ id, ...updateData });
            },

            /**
             * Delete a project
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates permissions (admin OR (founder AND owner))
             */
            delete: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                }
            ) => {
                const { id } = args;

                // Read existing project to check ownership
                const project = await tx.query.project.where('id', id).one();

                if (!project) {
                    throw new Error('Project not found');
                }

                // Delete project
                await tx.mutate.project.delete({ id });
            },
        },

        // ========================================
        // NOTIFICATION MUTATORS
        // ========================================

        notification: {
            /**
             * Create a notification
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Only admins or system can create notifications
             */
            create: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                    userId: string;
                    resourceType: string;
                    resourceId: string;
                    title: string;
                    previewTitle: string;
                    message: string;
                    read: string;
                    createdAt: string;
                    actions: string;
                    sound: string;
                    icon: string;
                    displayComponent: string;
                    priority: string;
                    imageUrl?: string;
                }
            ) => {
                // Client-side validation
                if (!args.userId || args.userId.trim().length === 0) {
                    throw new Error('userId is required');
                }
                if (!args.title || args.title.trim().length === 0) {
                    throw new Error('title is required');
                }
                if (!args.message || args.message.trim().length === 0) {
                    throw new Error('message is required');
                }

                await tx.mutate.notification.insert({
                    id: args.id,
                    userId: args.userId,
                    resourceType: args.resourceType,
                    resourceId: args.resourceId,
                    title: args.title.trim(),
                    previewTitle: args.previewTitle,
                    message: args.message.trim(),
                    read: args.read || 'false',
                    createdAt: args.createdAt,
                    actions: args.actions || '[]',
                    sound: args.sound || '',
                    icon: args.icon || '',
                    displayComponent: args.displayComponent || '',
                    priority: args.priority || 'false',
                    imageUrl: args.imageUrl || '',
                });
            },

            /**
             * Mark a single notification as read
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates user owns the notification
             */
            markRead: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                }
            ) => {
                const { id } = args;

                // Read existing notification to check ownership
                const notification = await tx.query.notification.where('id', id).one();

                if (!notification) {
                    throw new Error('Notification not found');
                }

                // Update notification to mark as read
                await tx.mutate.notification.update({
                    id,
                    read: 'true'
                });
            },

            /**
             * Mark all non-priority notifications as read for a user
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates user is marking their own notifications
             */
            markAllRead: async (
                tx: Transaction<Schema>,
                args: {
                    userId: string;
                }
            ) => {
                const { userId } = args;

                // Fetch all unread non-priority notifications for this user
                const notifications = await tx.query.notification
                    .where('userId', userId)
                    .where('read', 'false')
                    .where('priority', '!=', 'true')
                    .run();

                // Mark each one as read
                for (const notification of notifications) {
                    await tx.mutate.notification.update({
                        id: notification.id,
                        read: 'true'
                    });
                }
            },

            /**
             * Delete a notification
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates user owns the notification or is admin
             */
            delete: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                }
            ) => {
                const { id } = args;

                // Read existing notification to check ownership
                const notification = await tx.query.notification.where('id', id).one();

                if (!notification) {
                    throw new Error('Notification not found');
                }

                // Delete notification
                await tx.mutate.notification.delete({ id });
            },
        },

        // ========================================
        // IDENTITY PURCHASE MUTATORS
        // ========================================
        // Note: Purchases are typically created via /api/purchase-package (payment flow)
        // These mutators are mainly for admin operations (testing, refunds, adjustments)

        identityPurchase: {
            /**
             * Delete an identity purchase (admin only)
             * Client-side: Runs optimistically
             * Server-side: Only admins can delete purchases
             */
            delete: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                }
            ) => {
                const { id } = args;

                // Read existing purchase to check it exists
                const purchase = await tx.query.identityPurchase.where('id', id).one();

                if (!purchase) {
                    throw new Error('Purchase not found');
                }

                // Delete purchase
                await tx.mutate.identityPurchase.delete({ id });
            },
        },

        // ========================================
        // USER PREFERENCES MUTATORS
        // ========================================

        userPreferences: {
            /**
             * Create user preferences (defaults to newsletter subscribed: true)
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates user is creating their own preferences
             */
            create: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                    userId: string;
                    newsletterSubscribed: string;
                    pushEnabled?: string;
                    updatedAt: string;
                }
            ) => {
                // Client-side validation
                if (!args.userId || args.userId.trim().length === 0) {
                    throw new Error('userId is required');
                }

                await tx.mutate.userPreferences.insert({
                    id: args.id,
                    userId: args.userId.trim(),
                    newsletterSubscribed: args.newsletterSubscribed || 'false',
                    pushEnabled: args.pushEnabled || 'false',
                    updatedAt: args.updatedAt,
                });
            },

            /**
             * Update user preferences
             * Client-side: Runs optimistically for instant UI updates
             * Server-side: Validates user is updating their own preferences
             */
            update: async (
                tx: Transaction<Schema>,
                args: {
                    id: string;
                    newsletterSubscribed?: string;
                    pushEnabled?: string;
                    updatedAt: string;
                }
            ) => {
                const { id } = args;

                // Verify preferences exist
                const preferences = await tx.query.userPreferences.where('id', id).one();
                if (!preferences) {
                    throw new Error('User preferences not found');
                }

                // Update preferences
                await tx.mutate.userPreferences.update({
                    id,
                    newsletterSubscribed: args.newsletterSubscribed !== undefined ? args.newsletterSubscribed : preferences.newsletterSubscribed,
                    pushEnabled: args.pushEnabled !== undefined ? args.pushEnabled : preferences.pushEnabled,
                    updatedAt: args.updatedAt,
                });
            },
        },
    } as const;
}

