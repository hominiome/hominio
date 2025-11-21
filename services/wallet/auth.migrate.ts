/**
 * Minimal BetterAuth config for CLI migrations
 * This file is used by @better-auth/cli migrate command
 * It doesn't import SvelteKit modules to avoid CLI errors
 */
import { betterAuth } from "better-auth";
import { Kysely, sql } from "kysely";
import { NeonDialect } from "kysely-neon";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file from root (../../.env)
try {
  const envPath = resolve(__dirname, "../../.env");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch (error) {
  // .env file might not exist, that's okay
}

const DATABASE_URL = process.env.WALLET_POSTGRES_SECRET;
const ZERO_DATABASE_URL = process.env.ZERO_POSTGRES_SECRET;
const AUTH_SECRET = process.env.AUTH_SECRET || "temp-secret-for-migration";

if (!DATABASE_URL) {
  throw new Error("WALLET_POSTGRES_SECRET environment variable is required");
}

// Create Kysely instance for wallet database (auth + capabilities)
const db = new Kysely({
  dialect: new NeonDialect({
    neon: neon(DATABASE_URL),
  }),
});

// Create Kysely instance for Zero database (schemas) - only if ZERO_POSTGRES_SECRET is available
let zeroDb: Kysely<any> | null = null;
if (ZERO_DATABASE_URL) {
  zeroDb = new Kysely({
    dialect: new NeonDialect({
      neon: neon(ZERO_DATABASE_URL),
    }),
  });
}

// Minimal BetterAuth instance for migrations
export const auth = betterAuth({
  database: {
    db: db,
    type: "postgres",
  },
  secret: AUTH_SECRET,
  // Add plugins if needed (but keep minimal for migrations)
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    }
    : undefined,
});

/**
 * Migrate capabilities tables
 * This extends BetterAuth migrations with capability-based access control tables
 */
export async function migrateCapabilities(dbInstance: Kysely<any>) {
  console.log("🔄 Migrating capabilities tables...\n");

  try {
    // Capabilities table
    await dbInstance.schema
      .createTable("capabilities")
      .ifNotExists()
      .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
      .addColumn("principal", "varchar(255)", (col) => col.notNull())
      .addColumn("resource_type", "varchar(50)", (col) => col.notNull())
      .addColumn("resource_namespace", "varchar(255)", (col) => col.notNull())
      .addColumn("resource_id", "varchar(255)")
      .addColumn("device_id", "varchar(255)")
      .addColumn("actions", sql`text[]`, (col) => col.notNull())
      .addColumn("conditions", sql`jsonb`)
      .addColumn("metadata", sql`jsonb`, (col) => col.notNull())
      .addColumn("title", "varchar(255)") // Human-readable title
      .addColumn("description", "text") // Human-readable description
      .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .execute();

    console.log("✅ Created capabilities table");

    // Capability requests table
    await dbInstance.schema
      .createTable("capability_requests")
      .ifNotExists()
      .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
      .addColumn("requester_principal", "varchar(255)", (col) => col.notNull())
      .addColumn("resource_type", "varchar(50)", (col) => col.notNull())
      .addColumn("resource_namespace", "varchar(255)", (col) => col.notNull())
      .addColumn("resource_id", "varchar(255)")
      .addColumn("device_id", "varchar(255)")
      .addColumn("actions", sql`text[]`, (col) => col.notNull())
      .addColumn("owner_id", "varchar(255)", (col) => col.notNull())
      .addColumn("status", "varchar(50)", (col) => col.defaultTo("pending"))
      .addColumn("message", "text")
      .addColumn("callback_url", "text")
      .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .execute();

    console.log("✅ Created capability_requests table");

    // Capability groups table
    await dbInstance.schema
      .createTable("capability_groups")
      .ifNotExists()
      .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
      .addColumn("name", "varchar(255)", (col) => col.notNull().unique())
      .addColumn("title", "varchar(255)", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("managed_by", "varchar(255)", (col) => col.notNull()) // Principal who manages this group (e.g., "user:admin-id")
      .addColumn("metadata", sql`jsonb`, (col) => col.defaultTo(sql`'{}'::jsonb`))
      .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .execute();

    console.log("✅ Created capability_groups table");

    // Capability group members table (links capabilities to groups)
    await dbInstance.schema
      .createTable("capability_group_members")
      .ifNotExists()
      .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
      .addColumn("group_id", "uuid", (col) => 
        col.notNull().references("capability_groups.id").onDelete("cascade")
      )
      .addColumn("capability_id", "uuid", (col) => 
        col.notNull().references("capabilities.id").onDelete("cascade")
      )
      .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`NOW()`))
      .execute();

    // Add unique constraint on (group_id, capability_id)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_capability_group_members_unique 
      ON capability_group_members(group_id, capability_id)
    `.execute(dbInstance);

    console.log("✅ Created capability_group_members table");

    // Add indexes for faster lookups
    await dbInstance.schema
      .createIndex("idx_capability_groups_name")
      .ifNotExists()
      .on("capability_groups")
      .column("name")
      .execute();

    await dbInstance.schema
      .createIndex("idx_capability_group_members_group_id")
      .ifNotExists()
      .on("capability_group_members")
      .column("group_id")
      .execute();

    await dbInstance.schema
      .createIndex("idx_capability_group_members_capability_id")
      .ifNotExists()
      .on("capability_group_members")
      .column("capability_id")
      .execute();

    console.log("✅ Created indexes for capability groups");

    // Add username column to user table (if it doesn't exist)
    // Username is optional (nullable), unique, and used for name-scoped schema IDs (e.g., @hominio/hotel-v1)
    // Admin user will have username "@hominio" set via seedAdminUsername()
    try {
      // Check if username column exists
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'username'
      `.execute(dbInstance);

      if (columnCheck.rows.length === 0) {
        console.log("📝 Adding username column to user table (optional, unique)...\n");
        // Add as nullable (optional) with unique constraint
        await dbInstance.schema
          .alterTable("user")
          .addColumn("username", "varchar(255)", (col) => col.unique())
          .execute();
        console.log("✅ Added username column to user table\n");
        console.log("   Column is optional (nullable) and unique\n");
      } else {
        console.log("ℹ️  Username column already exists in user table\n");
      }
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        console.log("ℹ️  Username column or constraint already exists\n");
      } else {
        console.error("⚠️  Error adding username column:", error.message);
        console.log("   Continuing migration...\n");
      }
    }

    // Create indexes
    try {
      await dbInstance.schema
        .createIndex("idx_capabilities_principal")
        .on("capabilities")
        .column("principal")
        .execute();
      console.log("✅ Created index idx_capabilities_principal");
    } catch (error: any) {
      if (!error.message?.includes("already exists")) {
        throw error;
      }
    }

    try {
      await dbInstance.schema
        .createIndex("idx_capabilities_resource")
        .on("capabilities")
        .columns(["resource_type", "resource_namespace", "resource_id"])
        .execute();
      console.log("✅ Created index idx_capabilities_resource");
    } catch (error: any) {
      if (!error.message?.includes("already exists")) {
        throw error;
      }
    }

    try {
      await dbInstance.schema
        .createIndex("idx_capability_requests_owner")
        .on("capability_requests")
        .columns(["owner_id", "status"])
        .execute();
      console.log("✅ Created index idx_capability_requests_owner");
    } catch (error: any) {
      if (!error.message?.includes("already exists")) {
        throw error;
      }
    }

    try {
      await dbInstance.schema
        .createIndex("idx_capability_requests_requester")
        .on("capability_requests")
        .columns(["requester_principal", "status"])
        .execute();
      console.log("✅ Created index idx_capability_requests_requester");
    } catch (error: any) {
      if (!error.message?.includes("already exists")) {
        throw error;
      }
    }

    // Add title and description columns if they don't exist (for existing tables)
    try {
      await dbInstance.schema
        .alterTable("capabilities")
        .addColumn("title", "varchar(255)")
        .execute();
      console.log("✅ Added title column to capabilities table");
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        console.log("ℹ️  Title column already exists, skipping");
      } else {
        // Re-throw unexpected errors (connection issues, permissions, etc.)
        throw error;
      }
    }

    try {
      await dbInstance.schema
        .alterTable("capabilities")
        .addColumn("description", "text")
        .execute();
      console.log("✅ Added description column to capabilities table");
    } catch (error: any) {
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        console.log("ℹ️  Description column already exists, skipping");
      } else {
        // Re-throw unexpected errors (connection issues, permissions, etc.)
        throw error;
      }
    }

    console.log("\n✅ Capabilities migration completed successfully!\n");
  } catch (error) {
    console.error("❌ Capabilities migration failed:", error);
    throw error;
  }
}

/**
 * Seed admin username (only if ADMIN is set)
 * Sets admin username to "@hominio" for name-scoped schema IDs
 */
export async function seedAdminUsername(dbInstance: Kysely<any>) {
  const ADMIN = process.env.ADMIN;

  if (!ADMIN) {
    console.log("ℹ️  ADMIN not set, skipping admin username seeding\n");
    return;
  }

  console.log("📝 Checking if admin username seeding is needed...\n");

  try {
    // Check if admin already has a username
    const adminUser = await dbInstance
      .selectFrom("user")
      .select(["id", "username"])
      .where("id", "=", ADMIN)
      .executeTakeFirst();

    if (!adminUser) {
      console.log(`⚠️  Admin user ${ADMIN} not found in user table. Skipping username seeding.\n`);
      return;
    }

    if (adminUser.username) {
      console.log(`ℹ️  Admin already has username: ${adminUser.username}\n`);
      return;
    }

    // Set admin username to "@hominio"
    console.log(`📝 Setting admin username to "@hominio"...\n`);
    await dbInstance
      .updateTable("user")
      .set({ username: "@hominio" })
      .where("id", "=", ADMIN)
      .execute();

    console.log("✅ Admin username set successfully!\n");
    console.log(`   User ID: ${ADMIN}\n`);
    console.log(`   Username: @hominio\n`);
  } catch (error: any) {
    console.error("❌ Error seeding admin username:", error.message);
    // Don't throw - this is optional, migration can continue
    console.log("⚠️  Continuing migration despite admin username seeding error...\n");
  }
}

/**
 * Seed admin capabilities (only if ADMIN is set)
 * Grants api:voice capability to admin user (allows using voice API)
 */
export async function seedAdminCapabilities(dbInstance: Kysely<any>) {
  const ADMIN = process.env.ADMIN;

  if (!ADMIN) {
    console.log("ℹ️  ADMIN not set, skipping admin capability seeding\n");
    return;
  }

  console.log("📝 Checking if admin capability seeding is needed...\n");

  try {
    const principal = `user:${ADMIN}`;

    // Check if admin already has voice API capability
    const existingCapability = await dbInstance
      .selectFrom("capabilities")
      .selectAll()
      .where("principal", "=", principal)
      .where("resource_type", "=", "api")
      .where("resource_namespace", "=", "voice")
      .executeTakeFirst();

    if (existingCapability) {
      // Update existing capability with title and description if missing
      if (!existingCapability.title || !existingCapability.description) {
        console.log(`📝 Updating existing admin voice capability with title and description...\n`);
        await dbInstance
          .updateTable("capabilities")
          .set({
            title: "Voice Assistant Access",
            description: "Unlimited voice minutes",
            updated_at: new Date(),
          })
          .where("id", "=", existingCapability.id)
          .execute();
        console.log("✅ Updated existing admin voice capability with title and description!\n");
      } else {
        console.log(`ℹ️  Admin ${ADMIN} already has voice API capability with title/description, skipping\n`);
      }
      // Continue to check schema and hotel capabilities (don't return early)
    } else {
      console.log(`📝 Granting voice API capability to admin: ${ADMIN}...\n`);

      // Grant api:voice capability to admin (allows using voice API endpoint)
      await dbInstance
        .insertInto("capabilities")
        .values({
          id: sql`gen_random_uuid()`,
          principal: principal,
          resource_type: "api",
          resource_namespace: "voice",
          resource_id: null, // API resources don't have specific IDs (applies to all voice endpoints)
          device_id: null,
          actions: ["read"], // Read = use/call the voice API
          conditions: null,
          metadata: {
            granted_by: "system",
            reason: "admin_seeding",
            created_at: new Date().toISOString(),
          },
          title: "Voice Assistant Access",
          description: "Unlimited voice minutes",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      console.log("✅ Admin voice API capability granted successfully!\n");
      console.log(`   Principal: ${principal}\n`);
      console.log(`   Resource: api:voice\n`);
      console.log(`   Actions: read\n`);
    }

    // Grant admin wildcard access to schema table
    const existingSchemaCapability = await dbInstance
      .selectFrom("capabilities")
      .selectAll()
      .where("principal", "=", principal)
      .where("resource_type", "=", "data")
      .where("resource_namespace", "=", "schema")
      .where("resource_id", "=", "*")
      .executeTakeFirst();

    if (!existingSchemaCapability) {
      console.log(`📝 Granting schema wildcard capability to admin: ${ADMIN}...\n`);

      await dbInstance
        .insertInto("capabilities")
        .values({
          id: sql`gen_random_uuid()`,
          principal: principal,
          resource_type: "data",
          resource_namespace: "schema",
          resource_id: "*", // Wildcard - access to all schemas
          device_id: null,
          actions: ["read", "write", "delete", "manage"], // Full access
          conditions: null,
          metadata: {
            granted_by: "system",
            reason: "admin_seeding",
            created_at: new Date().toISOString(),
          },
          title: "Schema Management Access",
          description: "Full access to manage all schemas",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      console.log("✅ Admin schema wildcard capability granted successfully!\n");
      console.log(`   Principal: ${principal}\n`);
      console.log(`   Resource: data:schema:*\n`);
      console.log(`   Actions: read, write, delete, manage\n`);
    } else {
      console.log(`ℹ️  Admin ${ADMIN} already has schema wildcard capability, skipping\n`);
    }

    // Grant admin wildcard access to hotel data entries only (not all data)
    // Naming convention:
    // - Schema lookup: Uses name-scoped identifier (e.g., "@hominio/hotel-v1") for human-readable lookup
    // - Capability grant: Uses nanoid schema ID for relationships (e.g., "wwQ237r5E0hGYXO-fu818")
    // - This ensures capabilities reference schemas by their relational ID, not the human-readable name
    let hotelSchemaId: string | null = null;
    let adminUsername = "@hominio"; // Default fallback
    
    // Get admin username first (used for name-scoped schema lookup)
    try {
      const adminUser = await dbInstance
        .selectFrom("user")
        .select(["username"])
        .where("id", "=", ADMIN)
        .executeTakeFirst();
      if (adminUser?.username) {
        adminUsername = adminUser.username;
        console.log(`📌 Using admin username for schema lookup: ${adminUsername}\n`);
      }
    } catch (error) {
      console.log(`⚠️  Could not fetch admin username, using default: ${adminUsername}\n`);
    }
    
    if (zeroDb) {
      try {
        // Query Zero database for hotel schema by name-scoped identifier
        // Format: @username/schema-name-v1 (e.g., @hominio/hotel-v1)
        const schemaName = `${adminUsername}/hotel-v1`;
        console.log(`🔍 Looking up hotel schema by name: ${schemaName}\n`);
        
        const hotelSchemaResult = await sql`
          SELECT id, name, "ownedBy" FROM schema 
          WHERE name = ${schemaName}
          LIMIT 1
        `.execute(zeroDb);
        
        if (hotelSchemaResult.rows.length > 0) {
          hotelSchemaId = hotelSchemaResult.rows[0].id as string;
          const foundSchemaName = hotelSchemaResult.rows[0].name;
          const foundOwnedBy = hotelSchemaResult.rows[0].ownedBy;
          
          console.log(`📌 Found hotel schema:\n`);
          console.log(`   Name (metadata): ${foundSchemaName}\n`);
          console.log(`   ID (nanoid): ${hotelSchemaId}\n`);
          console.log(`   Owner: ${foundOwnedBy || '(not set)'}\n`);
          
          // Ensure ownedBy is set
          if (!foundOwnedBy) {
            console.log(`📝 Updating schema ownedBy to admin: ${ADMIN}...\n`);
            await sql`
              UPDATE schema 
              SET "ownedBy" = ${ADMIN}
              WHERE id = ${hotelSchemaId}
            `.execute(zeroDb);
            console.log(`✅ Updated schema ownedBy\n`);
          }
        } else {
          console.log(`⚠️  Hotel schema not found in Zero database (looking for: ${schemaName}). Skipping hotel capability grant.\n`);
          console.log(`   This is expected if Zero migration hasn't run yet. Run Zero migration first.\n`);
        }
      } catch (error: any) {
        console.log(`⚠️  Could not query Zero database for hotel schema: ${error.message}\n`);
        console.log(`   This is expected if ZERO_POSTGRES_SECRET is not set or Zero migration hasn't run.\n`);
      }
    } else {
      console.log(`⚠️  ZERO_POSTGRES_SECRET not set. Cannot query for hotel schema ID.\n`);
      console.log(`   Skipping hotel capability grant. Set ZERO_POSTGRES_SECRET to enable.\n`);
    }
    
    // Only grant hotel capability if we found the schema ID
    // Capability uses nanoid ID (not name-scoped identifier) for relationships
    if (hotelSchemaId) {
      const existingHotelCapability = await dbInstance
        .selectFrom("capabilities")
        .selectAll()
        .where("principal", "=", principal)
        .where("resource_type", "=", "data")
        .where("resource_namespace", "=", hotelSchemaId) // Uses nanoid ID (not name-scoped identifier)
        .where("resource_id", "=", "*")
        .executeTakeFirst();

      if (!existingHotelCapability) {
        console.log(`📝 Granting hotel data wildcard capability to admin: ${ADMIN}...\n`);
        console.log(`   Using schema ID (nanoid): ${hotelSchemaId}\n`);

        await dbInstance
          .insertInto("capabilities")
          .values({
            id: sql`gen_random_uuid()`,
            principal: principal,
            resource_type: "data",
            resource_namespace: hotelSchemaId, // Uses nanoid ID for relationships (not name-scoped identifier)
            resource_id: "*", // Wildcard - access to all hotel data entries
            device_id: null,
            actions: ["read", "write", "delete", "manage"], // Full CRUD access
            conditions: null,
            metadata: {
              granted_by: "system",
              reason: "admin_seeding",
              created_at: new Date().toISOString(),
            },
            title: "Hotel Management Access",
            description: "Full access to manage all hotel data entries",
            created_at: new Date(),
            updated_at: new Date(),
          })
          .execute();

        console.log("✅ Admin hotel data wildcard capability granted successfully!\n");
        console.log(`   Principal: ${principal}\n`);
        console.log(`   Resource: data:${hotelSchemaId}:*\n`);
        console.log(`   Schema name (metadata): @hominio/hotel-v1\n`);
        console.log(`   Actions: read, write, delete, manage\n`);
      } else {
        console.log(`ℹ️  Admin ${ADMIN} already has hotel data wildcard capability, skipping\n`);
      }
    }
  } catch (error: any) {
    console.error("❌ Error seeding admin capabilities:", error.message);
    // Don't throw - this is optional, migration can continue
    console.log("⚠️  Continuing migration despite admin capability seeding error...\n");
  }
}

/**
 * Seed default capability groups
 * Creates "Hominio Explorer" group with "read all hotels" sub-capability
 */
export async function seedCapabilityGroups(dbInstance: Kysely<any>) {
  console.log("🔄 Seeding capability groups...\n");

  try {
    const ADMIN = process.env.ADMIN;
    if (!ADMIN) {
      console.log("⚠️  ADMIN not set. Skipping capability group seeding.\n");
      return;
    }

    const principal = `user:${ADMIN}`;

    // Check if "Hominio Explorer" group already exists
    const existingGroup = await dbInstance
      .selectFrom("capability_groups")
      .selectAll()
      .where("name", "=", "hominio-explorer")
      .executeTakeFirst();

    let groupId: string;

    if (existingGroup) {
      console.log("ℹ️  Hominio Explorer group already exists, using existing group\n");
      groupId = existingGroup.id;
    } else {
      // Create "Hominio Explorer" group
      const groupResult = await dbInstance
        .insertInto("capability_groups")
        .values({
          id: sql`gen_random_uuid()`,
          name: "hominio-explorer",
          title: "Hominio Explorer",
          description: "Free tier capability group that unlocks basic features like reading hotel listings",
          managed_by: principal,
          metadata: {
            tier: "free",
            autoAssignOnSignup: true,
          },
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      groupId = groupResult.id;
      console.log("✅ Created Hominio Explorer capability group\n");
    }

    // Get hotel schema ID for the "read all hotels" capability
    let hotelSchemaId: string | null = null;
    const ZERO_POSTGRES_SECRET = process.env.ZERO_POSTGRES_SECRET;

    if (ZERO_POSTGRES_SECRET) {
      try {
        const zeroDb = new Kysely<any>({
          dialect: new NeonDialect({
            connection: neon(ZERO_POSTGRES_SECRET),
          }),
        });

        // Get admin username for name-scoped schema lookup
        const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "@hominio";
        const schemaName = `${ADMIN_USERNAME}/hotel-v1`;

        const schemaResult = await sql`
          SELECT id FROM schema 
          WHERE name = ${schemaName}
          LIMIT 1
        `.execute(zeroDb);

        if (schemaResult.rows.length > 0) {
          hotelSchemaId = schemaResult.rows[0].id as string;
          console.log(`✅ Found hotel schema ID: ${hotelSchemaId}\n`);
        } else {
          console.log(`⚠️  Hotel schema "${schemaName}" not found in Zero database\n`);
          console.log(`   Skipping "read all hotels" capability creation.\n`);
        }
      } catch (error: any) {
        console.log(`⚠️  Could not query Zero database for hotel schema: ${error.message}\n`);
        console.log(`   Skipping "read all hotels" capability creation.\n`);
      }
    } else {
      console.log(`⚠️  ZERO_POSTGRES_SECRET not set. Cannot query for hotel schema ID.\n`);
      console.log(`   Skipping "read all hotels" capability creation.\n`);
    }

    // Create "read all hotels" capability if we have the schema ID
    if (hotelSchemaId) {
      // Check if capability already exists (for the group, not for a specific user)
      // Group capabilities are stored with a special principal format: "group:hominio-explorer"
      const groupPrincipal = `group:hominio-explorer`;
      
      const existingCapability = await dbInstance
        .selectFrom("capabilities")
        .selectAll()
        .where("principal", "=", groupPrincipal)
        .where("resource_type", "=", "data")
        .where("resource_namespace", "=", hotelSchemaId)
        .where("resource_id", "=", "*")
        .executeTakeFirst();

      let capabilityId: string;

      if (existingCapability) {
        console.log("ℹ️  Read all hotels capability already exists, using existing capability\n");
        capabilityId = existingCapability.id;
      } else {
        // Create the capability for the group
        const capabilityResult = await dbInstance
          .insertInto("capabilities")
          .values({
            id: sql`gen_random_uuid()`,
            principal: groupPrincipal,
            resource_type: "data",
            resource_namespace: hotelSchemaId,
            resource_id: "*",
            device_id: null,
            actions: ["read"],
            conditions: null,
            metadata: {
              group: "hominio-explorer",
              issuedAt: new Date().toISOString(),
              issuer: principal,
            },
            title: "Read All Hotels",
            description: "Read access to all hotel listings",
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        capabilityId = capabilityResult.id;
        console.log("✅ Created 'read all hotels' capability for Hominio Explorer group\n");
      }

      // Link capability to group (if not already linked)
      const existingLink = await dbInstance
        .selectFrom("capability_group_members")
        .selectAll()
        .where("group_id", "=", groupId)
        .where("capability_id", "=", capabilityId)
        .executeTakeFirst();

      if (!existingLink) {
        await dbInstance
          .insertInto("capability_group_members")
          .values({
            id: sql`gen_random_uuid()`,
            group_id: groupId,
            capability_id: capabilityId,
            created_at: sql`NOW()`,
          })
          .execute();

        console.log("✅ Linked 'read all hotels' capability to Hominio Explorer group\n");
      } else {
        console.log("ℹ️  Capability already linked to group\n");
      }
    }

    // Create "read all schemas" capability for the group
    // This is needed so users can read schema information (e.g., to display hotels)
    const groupPrincipal = `group:hominio-explorer`;
    
    const existingSchemaCapability = await dbInstance
      .selectFrom("capabilities")
      .selectAll()
      .where("principal", "=", groupPrincipal)
      .where("resource_type", "=", "data")
      .where("resource_namespace", "=", "schema")
      .where("resource_id", "=", "*")
      .executeTakeFirst();

    let schemaCapabilityId: string;

    if (existingSchemaCapability) {
      console.log("ℹ️  Read all schemas capability already exists, using existing capability\n");
      schemaCapabilityId = existingSchemaCapability.id;
    } else {
      // Create the capability for the group
      const schemaCapabilityResult = await dbInstance
        .insertInto("capabilities")
        .values({
          id: sql`gen_random_uuid()`,
          principal: groupPrincipal,
          resource_type: "data",
          resource_namespace: "schema",
          resource_id: "*",
          device_id: null,
          actions: ["read"],
          conditions: null,
          metadata: {
            group: "hominio-explorer",
            issuedAt: new Date().toISOString(),
            issuer: principal,
          },
          title: "Read All Schemas",
          description: "Read access to all schema definitions",
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      schemaCapabilityId = schemaCapabilityResult.id;
      console.log("✅ Created 'read all schemas' capability for Hominio Explorer group\n");
    }

    // Link schema capability to group (if not already linked)
    const existingSchemaLink = await dbInstance
      .selectFrom("capability_group_members")
      .selectAll()
      .where("group_id", "=", groupId)
      .where("capability_id", "=", schemaCapabilityId)
      .executeTakeFirst();

    if (!existingSchemaLink) {
      await dbInstance
        .insertInto("capability_group_members")
        .values({
          id: sql`gen_random_uuid()`,
          group_id: groupId,
          capability_id: schemaCapabilityId,
          created_at: sql`NOW()`,
        })
        .execute();

      console.log("✅ Linked 'read all schemas' capability to Hominio Explorer group\n");
    } else {
      console.log("ℹ️  Schema capability already linked to group\n");
    }

    console.log("✅ Capability group seeding completed!\n");
  } catch (error: any) {
    console.error("❌ Error seeding capability groups:", error.message);
    console.log("⚠️  Continuing migration despite capability group seeding error...\n");
  }
}

/**
 * Grant Hominio Explorer group capability to all existing users
 * This should be called after seeding capability groups
 */
export async function grantGroupCapabilityToAllUsers(dbInstance: Kysely<any>) {
  console.log("🔄 Granting Hominio Explorer group capability to all users...\n");

  try {
    const ADMIN = process.env.ADMIN;
    if (!ADMIN) {
      console.log("⚠️  ADMIN not set. Skipping group capability grant.\n");
      return;
    }

    const issuerPrincipal = `user:${ADMIN}`;

    // Check if Hominio Explorer group exists
    const group = await dbInstance
      .selectFrom("capability_groups")
      .selectAll()
      .where("name", "=", "hominio-explorer")
      .executeTakeFirst();

    if (!group) {
      console.log("⚠️  Hominio Explorer group not found. Run seedCapabilityGroups first.\n");
      return;
    }

    // Get all users
    const users = await dbInstance
      .selectFrom("user")
      .select(["id"])
      .execute();

    console.log(`📊 Found ${users.length} users\n`);

    let grantedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const principal = `user:${user.id}`;

      // Check if user already has this group capability
      const existingGroupCapability = await dbInstance
        .selectFrom("capabilities")
        .selectAll()
        .where("principal", "=", principal)
        .where("resource_type", "=", "group")
        .where("resource_namespace", "=", "hominio-explorer")
        .executeTakeFirst();

      if (existingGroupCapability) {
        skippedCount++;
        continue;
      }

      // Grant the group capability
      await dbInstance
        .insertInto("capabilities")
        .values({
          id: sql`gen_random_uuid()`,
          principal: principal,
          resource_type: "group",
          resource_namespace: "hominio-explorer",
          resource_id: null,
          device_id: null,
          actions: ["read"],
          conditions: null,
          metadata: {
            group: "hominio-explorer",
            issuedAt: new Date().toISOString(),
            issuer: issuerPrincipal,
            autoGranted: true,
          },
          title: group.title,
          description: `Membership in ${group.title} capability group`,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .execute();

      grantedCount++;
    }

    console.log(`✅ Group capability grant completed!\n`);
    console.log(`   Granted: ${grantedCount} users\n`);
    console.log(`   Skipped: ${skippedCount} users (already had capability)\n`);
  } catch (error: any) {
    console.error("❌ Error granting group capability to users:", error.message);
    console.log("⚠️  Continuing migration despite group capability grant error...\n");
  }
}

// Run capabilities migration if this file is executed directly
// This allows running: bun run auth.migrate.ts
if (import.meta.main) {
  migrateCapabilities(db)
    .then(() => seedAdminUsername(db))
    .then(() => seedAdminCapabilities(db))
    .then(() => seedCapabilityGroups(db))
    .then(() => grantGroupCapabilityToAllUsers(db))
    .then(() => {
      console.log("✨ Capabilities migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Capabilities migration failed:", error.message);
      process.exit(1);
    });
}

