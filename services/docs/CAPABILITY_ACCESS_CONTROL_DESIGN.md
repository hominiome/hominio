# Capability-Based Access Control Design

## 🎯 Goals

1. **Default Deny**: No access by default - must explicitly grant permissions
2. **Capability-Based**: Inspired by Lit Protocol's blockchain capabilities
3. **Fine-Grained**: Resource-level and row-level access control
4. **Future-Proof**: Design compatible with Lit Protocol integration
5. **Minimal & Flexible**: Start simple, extend as needed

---

## 📐 Core Concepts

### 1. **Capabilities** (Permission Tokens)

A capability is a cryptographically verifiable token that grants specific permissions.

```
Capability {
  id: string                    // Unique capability ID
  principal: string              // Who has this capability (user ID, service ID)
  resource: Resource             // What resource this applies to
  actions: Action[]              // What actions are allowed
  conditions?: Condition[]       // Optional conditions (time-based, etc.)
  metadata: {
    issuedAt: timestamp
    expiresAt?: timestamp
    issuer: string              // Who granted this capability
    delegation?: CapabilityID    // If delegated from another capability
  }
  signature?: string             // Cryptographic signature (for Lit Protocol)
}
```

### 2. **Resources** (What Can Be Accessed)

Resources are hierarchical and can be:
- **API Resources**: Endpoints (`/api/v0/projects`, `/api/v0/projects/:id`)
- **Data Resources**: Database entities (`project:*`, `project:123`, `project:123:title`)

```
Resource {
  type: 'api' | 'data'
  namespace: string              // e.g., 'projects', 'users'
  id?: string                   // Specific resource ID (row-level)
  field?: string                // Field-level (optional, future)
}
```

**Examples:**
- `api:projects` - All project endpoints
- `api:projects:create` - Create project endpoint
- `data:project:*` - All projects (read)
- `data:project:123` - Specific project (row-level)
- `data:project:123:title` - Specific field (future)

### 3. **Actions** (What Can Be Done)

```
Action = 'read' | 'write' | 'delete' | 'create' | 'update' | 'admin'
```

### 4. **Principals** (Who Has Capabilities)

- **Users**: Authenticated users (`user:123`)
- **Services**: Internal services (`service:api`, `service:sync`)
- **Anonymous**: Unauthenticated users (`anon:*`)

---

## 🏗️ Architecture Design

### Phase 1: Database-Backed Capabilities (MVP)

**Storage:**
```sql
-- Capabilities table
CREATE TABLE capabilities (
  id UUID PRIMARY KEY,
  principal VARCHAR(255) NOT NULL,        -- user:123, service:api
  resource_type VARCHAR(50) NOT NULL,      -- 'api' | 'data'
  resource_namespace VARCHAR(255) NOT NULL,-- 'projects', 'users'
  resource_id VARCHAR(255),               -- '123' or '*' for all
  actions TEXT[] NOT NULL,                 -- ['read', 'write']
  conditions JSONB,                        -- { expiresAt: '...', ip: '...' }
  metadata JSONB NOT NULL,                 -- { issuedAt, issuer, delegation }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_capabilities_principal ON capabilities(principal);
CREATE INDEX idx_capabilities_resource ON capabilities(resource_type, resource_namespace, resource_id);
CREATE INDEX idx_capabilities_expires ON capabilities((metadata->>'expiresAt'));
```

**Verification Flow:**
```
1. Request comes in → Extract principal (from auth)
2. Check capabilities table → Query by principal + resource
3. Verify conditions → Check expiresAt, IP, etc.
4. Return allowed actions → ['read', 'write']
```

### Phase 2: Capability Tokens (JWT-like)

**Token Structure:**
```json
{
  "cap": "cap:abc123",           // Capability ID reference
  "principal": "user:123",
  "resource": "data:project:123",
  "actions": ["read", "write"],
  "iat": 1234567890,
  "exp": 1234567890,
  "sig": "0x..."                 // Signature (for Lit Protocol)
}
```

**Benefits:**
- Can be passed in headers (like JWT)
- Stateless verification (with signature)
- Can be cached client-side
- Compatible with Lit Protocol

### Phase 3: Lit Protocol Integration

**Migration Path:**
- Keep database as source of truth
- Generate Lit Protocol PKPs (Programmable Key Pairs) for capabilities
- Store Lit PKP addresses in capabilities table
- Verify capabilities via Lit Protocol network

---

## 🔐 Access Control Layers

### Layer 1: API Endpoint Protection

```typescript
// Middleware: Check capability before route handler
async function requireCapability(
  request: Request,
  resource: Resource,
  action: Action
): Promise<void> {
  const authData = await extractAuthData(request);
  const principal = authData ? `user:${authData.sub}` : 'anon:*';
  
  const hasCapability = await checkCapability(principal, resource, action);
  
  if (!hasCapability) {
    throw new Error(`Forbidden: No ${action} capability for ${resource}`);
  }
}

// Usage in routes
app.get('/api/v0/projects/:id', async (request) => {
  await requireCapability(
    request,
    { type: 'api', namespace: 'projects', id: request.params.id },
    'read'
  );
  // ... handler
});
```

### Layer 2: Data Row-Level Protection

```typescript
// In Zero mutators / queries
async function checkRowAccess(
  principal: string,
  resource: Resource,
  action: Action,
  row: any
): Promise<boolean> {
  // Check explicit row capability
  const hasExplicit = await checkCapability(
    principal,
    { ...resource, id: row.id },
    action
  );
  
  if (hasExplicit) return true;
  
  // Check wildcard capability
  const hasWildcard = await checkCapability(
    principal,
    { ...resource, id: '*' },
    action
  );
  
  return hasWildcard;
}

// Usage in Zero queries
function getQuery(name: string, args: any[], principal: string) {
  if (name === 'allProjects') {
    // Filter by capabilities
    return builder.project
      .where((project) => 
        checkRowAccess(principal, { type: 'data', namespace: 'project' }, 'read', project)
      )
      .orderBy('createdAt', 'desc');
  }
}
```

### Layer 3: Field-Level Protection (Future)

```typescript
// Capability can specify fields
{
  resource: { type: 'data', namespace: 'project', id: '123', field: 'title' },
  actions: ['read']
}
```

---

## 📋 Capability Management

### Granting Capabilities

```typescript
// Grant capability to user
async function grantCapability(
  issuer: string,              // Who is granting (must have 'admin' action)
  principal: string,            // Who receives capability
  resource: Resource,
  actions: Action[],
  conditions?: Condition[]
): Promise<Capability> {
  // Verify issuer has admin capability for this resource
  await requireCapability(issuer, resource, 'admin');
  
  // Create capability
  const capability = await db.capabilities.insert({
    principal,
    resource,
    actions,
    conditions,
    metadata: {
      issuedAt: Date.now(),
      issuer
    }
  });
  
  return capability;
}
```

### Delegation

```typescript
// Delegate capability to another user
async function delegateCapability(
  delegator: string,            // Current capability holder
  delegatee: string,            // Who receives delegated capability
  capabilityId: string
): Promise<Capability> {
  // Verify delegator has the capability
  const originalCap = await getCapability(capabilityId);
  if (originalCap.principal !== delegator) {
    throw new Error('Cannot delegate capability you do not own');
  }
  
  // Check if capability allows delegation
  if (!originalCap.actions.includes('delegate')) {
    throw new Error('Capability does not allow delegation');
  }
  
  // Create delegated capability
  return await grantCapability(
    delegator,
    delegatee,
    originalCap.resource,
    originalCap.actions,
    {
      ...originalCap.conditions,
      delegation: capabilityId  // Track delegation chain
    }
  );
}
```

### Revocation

```typescript
// Revoke capability
async function revokeCapability(
  revoker: string,
  capabilityId: string
): Promise<void> {
  const capability = await getCapability(capabilityId);
  
  // Verify revoker has admin capability or owns the capability
  const canRevoke = 
    await checkCapability(revoker, capability.resource, 'admin') ||
    capability.principal === revoker;
  
  if (!canRevoke) {
    throw new Error('Cannot revoke capability');
  }
  
  // Soft delete or hard delete
  await db.capabilities.delete(capabilityId);
  
  // If delegated, revoke all delegations
  if (capability.metadata.delegation) {
    await revokeDelegations(capabilityId);
  }
}
```

---

## 🎨 Implementation Strategy

### Step 1: Core Capability System (MVP)

**Files to Create:**
```
libs/hominio-capabilities/
├── package.json
├── src/
│   ├── index.ts
│   ├── types.ts              # Resource, Action, Capability types
│   ├── storage.ts            # Database operations
│   ├── verification.ts       # Check capabilities
│   └── management.ts         # Grant/revoke/delegate
```

**Database Migration:**
- Create `capabilities` table
- Create indexes
- Seed initial admin capabilities

**Integration Points:**
- API middleware for endpoint protection
- Zero mutators for row-level checks
- Zero queries for data filtering

### Step 2: Capability Tokens

**Enhancement:**
- Generate capability tokens (JWT-like)
- Store tokens in database
- Verify tokens on requests
- Cache verification results

### Step 3: Lit Protocol Integration

**Migration:**
- Create Lit Protocol adapter
- Generate PKPs for capabilities
- Store PKP addresses in capabilities table
- Verify via Lit Protocol network

---

## 🔄 Integration with Current System

### Zero Sync Mutators

```typescript
// Before (current)
async function canUpdateProject(tx, projectId, userId) {
  if (isAdmin(userId)) return true;
  const project = await tx.query.project.where('id', projectId).one();
  return project.userId === userId;
}

// After (capability-based)
async function canUpdateProject(tx, projectId, userId) {
  const principal = `user:${userId}`;
  const resource = { type: 'data', namespace: 'project', id: projectId };
  
  // Check explicit capability
  const hasCapability = await checkCapability(principal, resource, 'write');
  if (hasCapability) return true;
  
  // Fallback: Check ownership (for backward compatibility)
  const project = await tx.query.project.where('id', projectId).one();
  return project.userId === userId;
}
```

### API Endpoints

```typescript
// Before (current)
app.get('/api/v0/projects/:id', async (request) => {
  const authData = await requireAuth(request);
  // ... handler
});

// After (capability-based)
app.get('/api/v0/projects/:id', async (request) => {
  await requireCapability(
    request,
    { type: 'api', namespace: 'projects', id: request.params.id },
    'read'
  );
  // ... handler
});
```

---

## 🚀 Migration Path

### Phase 1: Add Capability System (Non-Breaking)

1. Create `libs/hominio-capabilities` library
2. Add capabilities table to database
3. Create capability management functions
4. **Keep existing permission checks** (backward compatible)

### Phase 2: Migrate Existing Permissions

1. Convert existing permissions to capabilities:
   - `isAdmin(userId)` → `capability:admin:*`
   - `project.userId === userId` → `capability:data:project:{id}:write`
2. Update permission checks to use capabilities
3. Remove old permission logic

### Phase 3: Lit Protocol Integration

1. Add Lit Protocol adapter
2. Generate PKPs for new capabilities
3. Migrate existing capabilities to Lit Protocol
4. Verify via Lit Protocol network

---

## 📊 Example: Projects Access Control

### Scenario: User wants to read project

**Current Flow:**
```
1. User requests GET /api/v0/projects/123
2. Extract auth → userId
3. Check: isAdmin(userId) || project.userId === userId
4. Return project if allowed
```

**Capability-Based Flow:**
```
1. User requests GET /api/v0/projects/123
2. Extract auth → principal = "user:123"
3. Check capabilities:
   - Explicit: data:project:123:read
   - Wildcard: data:project:*:read
   - Admin: data:*:*:read
4. Return project if any capability matches
```

### Granting Access

```typescript
// Admin grants read access to user
await grantCapability(
  'admin:system',
  'user:456',
  { type: 'data', namespace: 'project', id: '123' },
  ['read']
);

// User can now read project 123
```

---

## 🎯 Design Principles

1. **Default Deny**: No capability = no access
2. **Explicit Grants**: Must explicitly grant every permission
3. **Principle of Least Privilege**: Grant minimum required permissions
4. **Auditability**: All capability grants/revokes logged
5. **Delegation**: Capabilities can be delegated (with restrictions)
6. **Expiration**: Capabilities can expire
7. **Revocation**: Capabilities can be revoked immediately

---

## ❓ Questions for Discussion

1. **Storage**: Database-backed initially, or JWT-like tokens from the start?
2. **Performance**: How to handle capability checks at scale? (Caching strategy?)
3. **Delegation**: Should all capabilities be delegatable, or only specific ones?
4. **Conditions**: What conditions should we support? (Time-based, IP-based, etc.)
5. **Migration**: How to migrate existing permissions without breaking changes?
6. **Lit Protocol**: When to integrate? (After MVP or from the start?)
7. **Row-Level**: Should we support field-level permissions from the start?
8. **Services**: How should internal services (API, Sync) get capabilities?

---

## 📝 Next Steps

1. **Review & Discuss**: This design document
2. **Decide on MVP Scope**: What's in v1?
3. **Create Detailed Spec**: API design, database schema
4. **Prototype**: Build minimal version
5. **Test**: Verify with real scenarios
6. **Iterate**: Refine based on feedback

---

**Status**: 🟡 Design Phase - Awaiting Discussion & Approval

