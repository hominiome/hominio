import {
  createSchema,
  createBuilder,
  table,
  string,
  number,
  definePermissions,
  ANYONE_CAN,
} from '@rocicorp/zero';

// User identities - tracks which identity a user has selected
// expiresAt is nullable: null = no expiration, otherwise ISO timestamp when identity expires
// subscriptionId is nullable: Polar subscription ID for subscription-based identities (hominio)
const userIdentities = table('userIdentities')
  .columns({
    id: string(),
    userId: string(), // User ID
    identityType: string(), // 'explorer' | 'hominio' | 'founder' | 'angel'
    selectedAt: string(), // ISO timestamp
    upgradedFrom: string(), // Previous identity type if upgraded
    expiresAt: string(), // ISO timestamp when identity expires (null = no expiration)
    subscriptionId: string(), // Polar subscription ID (nullable, only for subscription-based identities)
  })
  .primaryKey('id');

// Identity purchases - tracks purchases of identities
const identityPurchase = table('identityPurchase')
  .columns({
    id: string(),
    userId: string(), // User ID
    identityType: string(), // 'hominio' | 'founder' | 'angel'
    price: number(), // Price in cents
    purchasedAt: string(), // ISO timestamp
    userIdentityId: string(), // Reference to userIdentities.id
  })
  .primaryKey('id');

// Notifications - generic notification system for users
const notification = table('notification')
  .columns({
    id: string(),
    userId: string(), // User ID (private to user)
    resourceType: string(), // Type of resource: 'identityPurchase', 'newsletter', etc.
    resourceId: string(), // ID of the resource
    title: string(), // Notification title
    previewTitle: string(), // Optional preview title for curiosity loop
    message: string(), // Notification message
    read: string(), // 'true' | 'false' (as string for Zero compatibility)
    createdAt: string(), // ISO timestamp
    actions: string(), // JSON string array of action objects
    sound: string(), // Optional sound file path
    icon: string(), // Optional Iconify icon name
    displayComponent: string(), // Optional component name to display
    priority: string(), // 'true' | 'false' (as string) - force opens notification
    imageUrl: string(), // Optional image URL for notifications (e.g., newsletter images)
  })
  .primaryKey('id');

// User preferences - stores user notification and other preferences
const userPreferences = table('userPreferences')
  .columns({
    id: string(),
    userId: string(), // User ID
    newsletterSubscribed: string(), // 'true' | 'false' (as string for Zero compatibility)
    pushEnabled: string(), // 'true' | 'false' (as string for Zero compatibility) - Web Push Notifications enabled
    updatedAt: string(), // ISO timestamp
  })
  .primaryKey('id');

// Push subscriptions - stores Web Push API subscriptions for users (one per device/browser)
const pushSubscription = table('pushSubscription')
  .columns({
    id: string(),
    userId: string(), // User ID
    endpoint: string(), // Push service endpoint URL (unique per device/browser)
    p256dh: string(), // User public key (base64)
    auth: string(), // Auth secret (base64)
    userAgent: string(), // Browser user agent for device identification
    deviceName: string(), // Human-readable device name (e.g., "Chrome on Mac", "Safari on iPhone")
    createdAt: string(), // ISO timestamp
    updatedAt: string(), // ISO timestamp
  })
  .primaryKey('id');

// Projects - reference implementation for future entity management
const project = table('project')
  .columns({
    id: string(),
    title: string(),
    description: string(),
    country: string(),
    city: string(),
    userId: string(), // Reference to user
    videoUrl: string(), // YouTube URL for project pitch video (optional)
    bannerImage: string(), // Custom banner image URL (optional)
    profileImageUrl: string(), // Custom project profile image URL (optional)
    sdgs: string(), // JSON string array of SDG goals
    createdAt: string(), // ISO timestamp
  })
  .primaryKey('id');

export const schema = createSchema({
  tables: [userIdentities, identityPurchase, notification, userPreferences, pushSubscription, project],
  // Disable legacy queries - we use synced queries instead
  enableLegacyQueries: false,
  // Disable legacy CRUD mutators - we use custom mutators instead
  enableLegacyMutators: false,
});

// Export builder for synced queries
export const builder = createBuilder(schema);

// ⚠️ DUMMY PERMISSIONS - NOT USED ⚠️
// These permissions exist ONLY to satisfy zero-cache-dev's automatic deployment script.
// They are NOT enforced because:
// 1. enableLegacyQueries: false - clients can't run arbitrary queries
// 2. enableLegacyMutators: false - clients can't use CRUD mutators
// 
// Real security is enforced in:
// - Custom mutators (src/lib/mutators.server.ts) for writes
// - Synced queries (src/routes/v0/zero/get-queries.ts) for reads
type DummyAuthData = { sub: string };

export const permissions = definePermissions<DummyAuthData, typeof schema>(
  schema,
  () => (
    {
      //   // Public read, no writes (custom mutators handle all writes)
      //   project: {
      //     row: {
      //       select: ANYONE_CAN,
      //       insert: [],
      //       update: { preMutation: [], postMutation: [] },
      //       delete: [],
      //     },
      //   },
    }
  )
);

export type Schema = typeof schema;

