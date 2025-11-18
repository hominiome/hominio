import { Kysely, sql } from "kysely";
import { NeonDialect } from "kysely-neon";
import { neon } from "@neondatabase/serverless";

// Bun automatically loads .env file
// Support both new name (ZERO_POSTGRES_SECRET) and old name (SECRET_ZERO_DEV_PG) for backward compatibility
const DATABASE_URL = process.env.ZERO_POSTGRES_SECRET || process.env.SECRET_ZERO_DEV_PG;

if (!DATABASE_URL) {
  console.error("❌ ZERO_POSTGRES_SECRET (or SECRET_ZERO_DEV_PG) environment variable is required");
  console.error(
    "💡 Make sure you have a .env file with ZERO_POSTGRES_SECRET set"
  );
  process.exit(1);
}

const db = new Kysely({
  dialect: new NeonDialect({
    neon: neon(DATABASE_URL),
  }),
});

/**
 * Clean migration system for Zero database schema
 * Creates all 7 tables from scratch based on zero-schema.ts
 */
async function createTables() {
  console.log("🚀 Creating Zero database schema...\n");

  try {
    // 1. Project table
    console.log("📊 Creating project table...");
    await db.schema
      .createTable("project")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("title", "text", (col) => col.notNull())
      .addColumn("description", "text", (col) => col.notNull())
      .addColumn("country", "text", (col) => col.notNull())
      .addColumn("city", "text", (col) => col.notNull())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("videoUrl", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("bannerImage", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("profileImageUrl", "text", (col) =>
        col.notNull().defaultTo("")
      )
      .addColumn("sdgs", "text", (col) => col.notNull().defaultTo("[]"))
      .addColumn("createdAt", "text", (col) => col.notNull())
      .execute();
    console.log("✅ Project table created\n");

    // 2. UserIdentities table
    // All identities are universal
    // expiresAt is nullable: null = no expiration, otherwise ISO timestamp when identity expires
    console.log("👤 Creating userIdentities table...");
    await db.schema
      .createTable("userIdentities")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("identityType", "text", (col) => col.notNull())
      .addColumn("selectedAt", "text", (col) => col.notNull())
      .addColumn("upgradedFrom", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("expiresAt", "text") // Nullable: ISO timestamp when identity expires (null = no expiration)
      .addColumn("subscriptionId", "text") // Nullable: Polar subscription ID for subscription-based identities
      .execute();

    // Create index for efficient lookups by userId
    await sql`
      CREATE INDEX IF NOT EXISTS idx_userIdentities_user 
      ON "userIdentities"("userId")
    `.execute(db);

    console.log("✅ UserIdentities table created\n");

    // 5. IdentityPurchase table
    // All purchases are universal (apply to all cups)
    console.log("💰 Creating identityPurchase table...");
    await db.schema
      .createTable("identityPurchase")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("identityType", "text", (col) => col.notNull())
      .addColumn("price", "integer", (col) => col.notNull())
      .addColumn("purchasedAt", "text", (col) => col.notNull())
      .addColumn("userIdentityId", "text", (col) => col.notNull())
      .execute();
    console.log("✅ IdentityPurchase table created\n");

    // 5. Notification table
    console.log("🔔 Creating notification table...");
    await db.schema
      .createTable("notification")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("resourceType", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("resourceId", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("title", "text", (col) => col.notNull())
      .addColumn("previewTitle", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("message", "text", (col) => col.notNull())
      .addColumn("read", "text", (col) => col.notNull().defaultTo("false"))
      .addColumn("createdAt", "text", (col) => col.notNull())
      .addColumn("actions", "text", (col) => col.notNull().defaultTo("[]"))
      .addColumn("sound", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("icon", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("displayComponent", "text", (col) =>
        col.notNull().defaultTo("")
      )
      .addColumn("priority", "text", (col) => col.notNull().defaultTo("false"))
      .addColumn("imageUrl", "text", (col) => col.notNull().defaultTo(""))
      .execute();
    console.log("✅ Notification table created\n");

    // 6. UserPreferences table
    console.log("⚙️  Creating userPreferences table...");
    await db.schema
      .createTable("userPreferences")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("newsletterSubscribed", "text", (col) =>
        col.notNull().defaultTo("false")
      )
      .addColumn("pushEnabled", "text", (col) =>
        col.notNull().defaultTo("false")
      )
      .addColumn("updatedAt", "text", (col) => col.notNull())
      .execute();

    // Create index for efficient lookups by userId
    await sql`
      CREATE INDEX IF NOT EXISTS idx_userPreferences_user 
      ON "userPreferences"("userId")
    `.execute(db);

    console.log("✅ UserPreferences table created\n");

    // 7. PushSubscription table (for Web Push Notifications)
    console.log("📱 Creating pushSubscription table...");
    await db.schema
      .createTable("pushSubscription")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("userId", "text", (col) => col.notNull())
      .addColumn("endpoint", "text", (col) => col.notNull())
      .addColumn("p256dh", "text", (col) => col.notNull())
      .addColumn("auth", "text", (col) => col.notNull())
      .addColumn("userAgent", "text", (col) => col.notNull().defaultTo(""))
      .addColumn("deviceName", "text", (col) => col.notNull().defaultTo("Unknown Device"))
      .addColumn("createdAt", "text", (col) => col.notNull())
      .addColumn("updatedAt", "text", (col) => col.notNull())
      .execute();

    // Create index for efficient lookups by userId
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pushSubscription_user 
      ON "pushSubscription"("userId")
    `.execute(db);

    // Create unique index on endpoint to prevent duplicates
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pushSubscription_endpoint 
      ON "pushSubscription"("endpoint")
    `.execute(db);

    console.log("✅ PushSubscription table created\n");

    // 8. Polar webhook events table (SERVER-SIDE ONLY - NOT in Zero schema, NOT synced to clients)
    // This table exists in the same Postgres DB but is completely isolated from Zero replication
    console.log("🔔 Creating polar_webhook_events table (server-side only)...");
    await db.schema
      .createTable("polar_webhook_events")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("event_type", "text", (col) => col.notNull()) // e.g., 'checkout.created', 'order.paid'
      .addColumn("polar_event_id", "text", (col) => col.unique()) // Polar's event ID for deduplication
      .addColumn("payload", sql`jsonb`, (col) => col.notNull()) // Full event payload as JSONB
      .addColumn("processed", "boolean", (col) =>
        col.notNull().defaultTo(false)
      )
      .addColumn("processed_at", "timestamp", (col) => col)
      .addColumn("error_message", "text", (col) => col)
      .addColumn("created_at", "timestamp", (col) =>
        col.notNull().defaultTo(sql`NOW()`)
      )
      .execute();

    // Create indexes for common queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_type 
      ON polar_webhook_events(event_type)
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_processed 
      ON polar_webhook_events(processed, created_at)
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_created_at 
      ON polar_webhook_events(created_at DESC)
    `.execute(db);

    // Index for JSONB queries (e.g., finding events by customer_id)
    // Use B-tree index on extracted text value (GIN doesn't work directly on text)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_polar_webhook_events_payload_customer 
      ON polar_webhook_events ((payload->'data'->>'customer_id'))
    `.execute(db);

    console.log("✅ Polar webhook events table created\n");
    console.log(
      "⚠️  NOTE: polar_webhook_events is SERVER-ONLY and will NOT be synced to Zero clients\n"
    );

    // Setup replication for Zero tables
    // ⚠️ IMPORTANT: polar_webhook_events is intentionally EXCLUDED from replication
    // It exists in the same Postgres DB but is completely isolated from Zero sync
    await setupReplication();

    console.log("🎉 Zero database schema created successfully!\n");
    console.log(
      "⚠️  IMPORTANT: Restart your Zero cache server to pick up schema changes!"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

/**
 * Setup PostgreSQL logical replication for Zero
 * Enables replica identity and creates publication for all tables
 */
async function setupReplication() {
  console.log("🔄 Setting up replication...\n");

  const tables = [
    "project",
    "userIdentities",
    "identityPurchase",
    "notification",
    "userPreferences",
    "pushSubscription",
  ];

  // Enable replica identity for all tables
  for (const table of tables) {
    try {
      const quotedTable = [
        "userIdentities",
        "identityPurchase",
        "userPreferences",
        "pushSubscription",
      ].includes(table)
        ? `"${table}"`
        : table;

      await sql`ALTER TABLE ${sql.raw(quotedTable)} REPLICA IDENTITY FULL`.execute(
        db
      );
      console.log(`✅ Enabled replica identity for ${table}`);
    } catch (error) {
      console.log(`ℹ️  Replica identity already set for ${table}`);
    }
  }

  console.log();

  // Create or update publication
  try {
    await sql`CREATE PUBLICATION zero_data FOR TABLE project, "userIdentities", "identityPurchase", notification, "userPreferences", "pushSubscription"`.execute(
      db
    );
    console.log("✅ Created publication 'zero_data'\n");
  } catch (error) {
    if (error.message?.includes("already exists")) {
      console.log("ℹ️  Publication 'zero_data' already exists\n");

      // Ensure all current tables are included
      try {
        await sql`ALTER PUBLICATION zero_data SET TABLE project, "userIdentities", "identityPurchase", notification, "userPreferences", "pushSubscription"`.execute(
          db
        );
        console.log("✅ Updated publication to include all tables\n");
      } catch (alterError) {
        console.log("ℹ️  Publication already up to date\n");
      }
    } else {
      throw error;
    }
  }

    console.log("✅ Replication setup complete\n");
}

/**
 * Add example project if projects table is empty
 * Useful for development and testing
 */
async function addExampleProjectIfEmpty() {
  console.log("📝 Checking if example project is needed...\n");

  try {
    // Check if projects table has any rows
    const countResult = await sql`
      SELECT COUNT(*) as count FROM project
    `.execute(db);

    const count = parseInt(countResult.rows[0]?.count || "0", 10);

    if (count === 0) {
      console.log("📝 Projects table is empty, adding example project...\n");

      // Generate a unique ID for the example project
      const exampleProjectId = `example-project-${Date.now()}`;
      const now = new Date().toISOString();

      // Insert example project
      await sql`
        INSERT INTO project (
          id, title, description, country, city, "userId",
          "videoUrl", "bannerImage", "profileImageUrl", sdgs, "createdAt"
        ) VALUES (
          ${exampleProjectId},
          ${"Welcome to Hominio"},
          ${"This is an example project to help you get started. Create your own projects to showcase your work and connect with others!"},
          ${"Global"},
          ${"Everywhere"},
          ${"example-user"},
          ${""},
          ${""},
          ${""},
          ${"[]"},
          ${now}
        )
      `.execute(db);

      console.log("✅ Example project added successfully!\n");
      console.log(`   Project ID: ${exampleProjectId}\n`);
      console.log(`   Title: Welcome to Hominio\n`);
    } else {
      console.log(`ℹ️  Projects table already has ${count} project(s), skipping example project\n`);
    }
  } catch (error) {
    console.error("❌ Error adding example project:", error.message);
    // Don't throw - this is optional, migration can continue
    console.log("⚠️  Continuing migration despite example project error...\n");
  }
}

/**
 * Add expiresAt column to userIdentities table if it doesn't exist
 * This is a migration for existing databases
 */
async function addExpiresAtColumn() {
  console.log("🔄 Adding expiresAt column to userIdentities table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'userIdentities' 
      AND column_name = 'expiresAt'
    `.execute(db);

    if (columnExists.rows.length === 0) {
      // Column doesn't exist, add it
      await sql`
        ALTER TABLE "userIdentities" 
        ADD COLUMN "expiresAt" text
      `.execute(db);
      console.log("✅ Added expiresAt column to userIdentities table\n");
    } else {
      console.log("ℹ️  expiresAt column already exists\n");
    }
  } catch (error) {
    console.error("❌ Error adding expiresAt column:", error.message);
    throw error;
  }
}

/**
 * Add subscriptionId column to userIdentities table if it doesn't exist
 * This stores the Polar subscription ID for subscription-based identities (hominio)
 */
async function addSubscriptionIdColumn() {
  console.log("🔄 Adding subscriptionId column to userIdentities table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'userIdentities' 
      AND column_name = 'subscriptionId'
    `.execute(db);

    if (columnExists.rows.length === 0) {
      // Column doesn't exist, add it
      await sql`
        ALTER TABLE "userIdentities" 
        ADD COLUMN "subscriptionId" text
      `.execute(db);
      console.log("✅ Added subscriptionId column to userIdentities table\n");
    } else {
      console.log("ℹ️  subscriptionId column already exists\n");
    }
  } catch (error) {
    console.error("❌ Error adding subscriptionId column:", error.message);
    throw error;
  }
}

/**
 * Remove cupId column from userIdentities table if it exists
 * All identities are now universal (cupId = null)
 */
async function removeCupIdFromUserIdentities() {
  console.log("🔄 Removing cupId column from userIdentities table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'userIdentities' 
      AND column_name = 'cupId'
    `.execute(db);

    if (columnExists.rows.length > 0) {
      // Column exists, drop it
      await sql`
        ALTER TABLE "userIdentities" 
        DROP COLUMN "cupId"
      `.execute(db);
      console.log("✅ Removed cupId column from userIdentities table\n");
    } else {
      console.log(
        "ℹ️  cupId column doesn't exist in userIdentities (already removed)\n"
      );
    }
  } catch (error) {
    console.error(
      "❌ Error removing cupId column from userIdentities:",
      error.message
    );
    throw error;
  }
}

/**
 * Remove cupId column from identityPurchase table if it exists
 * All identities are now universal (cupId = null)
 */
async function removeCupIdFromIdentityPurchase() {
  console.log("🔄 Removing cupId column from identityPurchase table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'identityPurchase' 
      AND column_name = 'cupId'
    `.execute(db);

    if (columnExists.rows.length > 0) {
      // Column exists, drop it
      await sql`
        ALTER TABLE "identityPurchase" 
        DROP COLUMN "cupId"
      `.execute(db);
      console.log("✅ Removed cupId column from identityPurchase table\n");
    } else {
      console.log(
        "ℹ️  cupId column doesn't exist in identityPurchase (already removed)\n"
      );
    }
  } catch (error) {
    console.error(
      "❌ Error removing cupId column from identityPurchase:",
      error.message
    );
    throw error;
  }
}

/**
 * Drop legacy cup/match/vote tables
 * These tables are no longer needed
 */
async function dropLegacyTables() {
  console.log("🗑️  Dropping legacy cup/match/vote tables...\n");

  const tablesToDrop = [
    { name: "vote", quoted: false },
    { name: "cupMatch", quoted: true },
    { name: "cup", quoted: false },
    { name: "projectVote", quoted: false },
    { name: "heartTransaction", quoted: false },
  ];

  for (const table of tablesToDrop) {
    try {
      const tableName = table.quoted ? `"${table.name}"` : table.name;
      
      // Check if table exists
      const tableExists = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = ${table.name}
      `.execute(db);

      if (tableExists.rows.length > 0) {
        // Drop table
        await sql`DROP TABLE IF EXISTS ${sql.raw(tableName)} CASCADE`.execute(db);
        console.log(`✅ Dropped table ${table.name}\n`);
      } else {
        console.log(`ℹ️  Table ${table.name} doesn't exist (already removed)\n`);
      }
    } catch (error) {
      console.error(`❌ Error dropping table ${table.name}:`, error.message);
      // Continue with other tables even if one fails
    }
  }

  // Remove from publication if they were there
  try {
    await sql`ALTER PUBLICATION zero_data DROP TABLE IF EXISTS cup, "cupMatch", vote`.execute(db);
    console.log("✅ Removed legacy tables from publication\n");
  } catch (error) {
    // Ignore if already removed
    console.log("ℹ️  Legacy tables already removed from publication\n");
  }
}

/**
 * Remove votingWeight column from userIdentities table if it exists
 * Voting functionality has been removed
 */
async function removeVotingWeightFromUserIdentities() {
  console.log("🔄 Removing votingWeight column from userIdentities table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'userIdentities' 
      AND column_name = 'votingWeight'
    `.execute(db);

    if (columnExists.rows.length > 0) {
      // Column exists, drop it
      await sql`
        ALTER TABLE "userIdentities" 
        DROP COLUMN "votingWeight"
      `.execute(db);
      console.log("✅ Removed votingWeight column from userIdentities table\n");
    } else {
      console.log("ℹ️  votingWeight column doesn't exist (already removed)\n");
    }
  } catch (error) {
    console.error("❌ Error removing votingWeight column:", error.message);
    throw error;
  }
}

/**
 * Add imageUrl column to notification table if it doesn't exist
 */
async function addImageUrlToNotification() {
  console.log("🔄 Adding imageUrl column to notification table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notification' 
      AND column_name = 'imageUrl'
    `.execute(db);

    if (columnExists.rows.length === 0) {
      // Column doesn't exist, add it
      await sql`
        ALTER TABLE notification 
        ADD COLUMN "imageUrl" text NOT NULL DEFAULT ''
      `.execute(db);
      console.log("✅ Added imageUrl column to notification table\n");
    } else {
      console.log("ℹ️  imageUrl column already exists\n");
    }
  } catch (error) {
    console.error("❌ Error adding imageUrl column:", error.message);
    throw error;
  }
}

/**
 * Add pushEnabled column to userPreferences table if it doesn't exist
 */
async function addPushEnabledToUserPreferences() {
  console.log("🔄 Adding pushEnabled column to userPreferences table...\n");

  try {
    // Check if column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'userPreferences' 
      AND column_name = 'pushEnabled'
    `.execute(db);

    if (columnExists.rows.length === 0) {
      // Column doesn't exist, add it
      await sql`
        ALTER TABLE "userPreferences" 
        ADD COLUMN "pushEnabled" text NOT NULL DEFAULT 'false'
      `.execute(db);
      console.log("✅ Added pushEnabled column to userPreferences table\n");
    } else {
      console.log("ℹ️  pushEnabled column already exists\n");
    }
  } catch (error) {
    console.error("❌ Error adding pushEnabled column:", error.message);
    throw error;
  }
}

/**
 * Ensure all userPreferences have a userId (migration for old data)
 * This fixes any preferences that might have been created without userId
 */
async function ensureUserPreferencesHaveUserId() {
  console.log("🔄 Ensuring all userPreferences have userId...\n");

  try {
    // Check if there are any preferences without userId
    const preferencesWithoutUserId = await sql`
      SELECT id 
      FROM "userPreferences" 
      WHERE "userId" IS NULL OR "userId" = ''
    `.execute(db);

    if (preferencesWithoutUserId.rows.length > 0) {
      console.log(`⚠️  Found ${preferencesWithoutUserId.rows.length} preferences without userId, removing them...`);
      
      // Delete preferences without userId (they're invalid)
      await sql`
        DELETE FROM "userPreferences" 
        WHERE "userId" IS NULL OR "userId" = ''
      `.execute(db);
      
      console.log(`✅ Removed ${preferencesWithoutUserId.rows.length} invalid preferences\n`);
    } else {
      console.log("ℹ️  All preferences have userId\n");
    }

    // Ensure userId column is NOT NULL (should already be, but double-check)
    try {
      await sql`
        ALTER TABLE "userPreferences" 
        ALTER COLUMN "userId" SET NOT NULL
      `.execute(db);
      console.log("✅ Ensured userId column is NOT NULL\n");
    } catch (error) {
      if (error.message?.includes("already")) {
        console.log("ℹ️  userId column already NOT NULL\n");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("❌ Error ensuring userId in userPreferences:", error.message);
    throw error;
  }
}

/**
 * Add device information columns to pushSubscription table if they don't exist
 */
async function addDeviceInfoToPushSubscription() {
  console.log("🔄 Adding device information to pushSubscription table...\n");

  try {
    // Check if userAgent column exists
    const userAgentExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pushSubscription' 
      AND column_name = 'userAgent'
    `.execute(db);

    if (userAgentExists.rows.length === 0) {
      await sql`
        ALTER TABLE "pushSubscription" 
        ADD COLUMN "userAgent" text NOT NULL DEFAULT ''
      `.execute(db);
      console.log("✅ Added userAgent column to pushSubscription table\n");
    } else {
      console.log("ℹ️  userAgent column already exists\n");
    }

    // Check if deviceName column exists
    const deviceNameExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pushSubscription' 
      AND column_name = 'deviceName'
    `.execute(db);

    if (deviceNameExists.rows.length === 0) {
      await sql`
        ALTER TABLE "pushSubscription" 
        ADD COLUMN "deviceName" text NOT NULL DEFAULT 'Unknown Device'
      `.execute(db);
      console.log("✅ Added deviceName column to pushSubscription table\n");
    } else {
      console.log("ℹ️  deviceName column already exists\n");
    }
  } catch (error) {
    console.error("❌ Error adding device info to pushSubscription:", error.message);
    throw error;
  }
}

/**
 * Create pushSubscription table if it doesn't exist
 */
async function createPushSubscriptionTable() {
  console.log("🔄 Creating pushSubscription table...\n");

  try {
    // Check if table exists
    const tableExists = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'pushSubscription'
    `.execute(db);

    if (tableExists.rows.length === 0) {
      // Table doesn't exist, create it
      await db.schema
        .createTable("pushSubscription")
        .addColumn("id", "text", (col) => col.primaryKey())
        .addColumn("userId", "text", (col) => col.notNull())
        .addColumn("endpoint", "text", (col) => col.notNull())
        .addColumn("p256dh", "text", (col) => col.notNull())
        .addColumn("auth", "text", (col) => col.notNull())
        .addColumn("userAgent", "text", (col) => col.notNull().defaultTo(""))
        .addColumn("deviceName", "text", (col) => col.notNull().defaultTo("Unknown Device"))
        .addColumn("createdAt", "text", (col) => col.notNull())
        .addColumn("updatedAt", "text", (col) => col.notNull())
        .execute();

      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS idx_pushSubscription_user 
        ON "pushSubscription"("userId")
      `.execute(db);

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pushSubscription_endpoint 
        ON "pushSubscription"("endpoint")
      `.execute(db);

      // Enable replica identity
      await sql`ALTER TABLE "pushSubscription" REPLICA IDENTITY FULL`.execute(db);

      console.log("✅ Created pushSubscription table\n");
    } else {
      console.log("ℹ️  pushSubscription table already exists\n");
    }
  } catch (error) {
    console.error("❌ Error creating pushSubscription table:", error.message);
    throw error;
  }
}

// Run migration
createTables()
  .then(() => addExpiresAtColumn())
  .then(() => addSubscriptionIdColumn())
  .then(() => removeCupIdFromUserIdentities())
  .then(() => removeCupIdFromIdentityPurchase())
  .then(() => addImageUrlToNotification())
  .then(() => addPushEnabledToUserPreferences())
  .then(() => createPushSubscriptionTable())
  .then(() => addDeviceInfoToPushSubscription())
  .then(() => ensureUserPreferencesHaveUserId())
  .then(() => dropLegacyTables())
  .then(() => removeVotingWeightFromUserIdentities())
  .then(() => addExampleProjectIfEmpty())
  .then(() => {
    console.log("✨ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  });

