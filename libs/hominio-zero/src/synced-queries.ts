// Client-side synced query definitions - Projects only
// This file must only be imported on the client side (browser)
// Synced queries require Zero client which is not available during SSR
import { syncedQuery } from '@rocicorp/zero';
import z from 'zod';
import { builder } from './schema';

/**
 * ========================================
 * PROJECT QUERIES
 * ========================================
 */

/**
 * Get all projects, ordered by creation date (newest first)
 */
export const allProjects = syncedQuery(
  'allProjects',
  z.tuple([]), // No arguments needed
  () => {
    return builder.project.orderBy('createdAt', 'desc');
  }
);

