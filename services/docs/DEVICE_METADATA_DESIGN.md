# Device Metadata Design

## Question: Do we need more metadata for device_id?

## Current Implementation

Currently, `device_id` is just a string identifier:
- Stored in `capabilities` and `capability_requests` tables
- Used for matching system resources (microphone, camera, etc.)
- No additional metadata stored

## Proposed Enhancement: Device Metadata Table

### Option 1: Separate Device Registry Table

```sql
CREATE TABLE devices (
  id VARCHAR(255) PRIMARY KEY, -- device_id
  user_id VARCHAR(255) NOT NULL, -- Owner of the device
  label VARCHAR(255), -- Human-readable name: "iPhone 15 Pro", "MacBook Pro"
  type VARCHAR(50), -- 'mobile', 'desktop', 'tablet', 'server'
  platform VARCHAR(50), -- 'ios', 'android', 'macos', 'windows', 'linux'
  capabilities TEXT[], -- ['microphone', 'camera', 'location']
  metadata JSONB, -- { osVersion: '17.0', browser: 'Safari', ... }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_user ON devices(user_id);
```

**Benefits:**
- Centralized device management
- Can show device labels in UI
- Track device capabilities
- Last seen tracking
- Platform-specific handling

**Usage:**
- When requesting system resource capability, include device_id
- Lookup device metadata for display
- Show "iPhone 15 Pro" instead of "device-abc123"

### Option 2: Store in Capability Metadata

```typescript
// Store device info in capability metadata
{
  metadata: {
    issuedAt: '...',
    issuer: '...',
    device: {
      label: 'iPhone 15 Pro',
      type: 'mobile',
      platform: 'ios'
    }
  }
}
```

**Benefits:**
- Simpler (no extra table)
- Device info travels with capability

**Drawbacks:**
- Duplicated if same device has multiple capabilities
- Harder to query all devices
- No centralized device management

### Option 3: Hybrid Approach

- Store basic device info in capability metadata (for display)
- Optional device registry table (for advanced features)

## Recommendation: Option 1 (Device Registry)

**Why:**
1. **Better UX**: Show "iPhone 15 Pro" instead of "device-abc123"
2. **Device Management**: Users can see all their devices
3. **Capability Discovery**: "Which devices have microphone access?"
4. **Security**: Track device last seen, detect suspicious devices
5. **Future Features**: Device-specific settings, remote device management

**Implementation:**
- Create `devices` table
- When requesting system capability, create/update device entry
- UI shows device label from registry
- Capability checks still use device_id (unchanged)

**Example Flow:**
```
1. User requests microphone access from iPhone
   → device_id = "iphone-abc123"
   → Create device entry: { id: "iphone-abc123", label: "iPhone 15 Pro", ... }
   
2. Capability request shows: "iPhone 15 Pro requests microphone access"
   
3. Owner approves → Capability created with device_id
   
4. UI shows: "Microphone access granted to iPhone 15 Pro"
```

## Device Metadata Fields

**Required:**
- `id` (device_id) - Unique identifier
- `user_id` - Owner

**Recommended:**
- `label` - Human-readable name
- `type` - mobile/desktop/tablet/server
- `platform` - ios/android/macos/windows/linux
- `last_seen_at` - For security tracking

**Optional:**
- `capabilities` - Available system resources
- `metadata` - Platform-specific info (OS version, browser, etc.)
- `trusted` - Is device trusted? (for security)

## Questions

1. **When to create device entry?**
   - On capability request? (recommended)
   - On first system resource access?
   - Manually by user?

2. **Device ID generation?**
   - Client generates? (recommended - can use device fingerprint)
   - Server generates?
   - UUID?

3. **Device labeling?**
   - Auto-detect from user agent?
   - User provides label?
   - Both (auto-detect, user can override)?

4. **Device lifecycle?**
   - Delete when all capabilities revoked?
   - Keep for history?
   - Archive after X days inactive?

