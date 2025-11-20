# Voice API Capability Gating Design

## Concept: Dynamic Usage-Based Capabilities

Gate voice API calls using capabilities with dynamic conditions (e.g., "X minutes per day").

## Design Approach

### 1. **Usage Tracking Table**

```sql
CREATE TABLE capability_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  principal VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_namespace VARCHAR(255) NOT NULL,
  usage_type VARCHAR(50) NOT NULL, -- 'voice_minutes', 'api_calls', etc.
  usage_amount DECIMAL(10, 2) NOT NULL, -- e.g., 5.5 minutes
  usage_period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP NOT NULL, -- Start of current period
  period_end TIMESTAMP NOT NULL, -- End of current period
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_capability_usage_period ON capability_usage(capability_id, usage_period, period_start);
```

### 2. **Capability Conditions Enhancement**

Extend `CapabilityConditions` to include usage limits:

```typescript
interface CapabilityConditions {
  expiresAt?: string;
  ip?: string;
  usageLimits?: {
    voice_minutes?: {
      daily?: number;      // e.g., 30 minutes per day
      weekly?: number;     // e.g., 120 minutes per week
      monthly?: number;    // e.g., 500 minutes per month
    };
    api_calls?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
  };
}
```

### 3. **Voice API Gating Flow**

```
1. User connects to voice WebSocket
   ↓
2. Check capability: system:voice:live (with device_id)
   ↓
3. If capability exists:
   a. Check usage limits from conditions
   b. Query usage table for current period
   c. Calculate remaining quota
   d. If quota exceeded → reject connection
   e. If quota available → allow connection, track usage
   ↓
4. During call:
   - Track audio duration
   - Update usage table periodically (every 30 seconds)
   - If quota exceeded mid-call → disconnect gracefully
   ↓
5. On disconnect:
   - Finalize usage tracking
   - Update capability_usage table
```

### 4. **Usage Tracking Functions**

```typescript
// Check if user has quota remaining
async function checkUsageQuota(
  principal: Principal,
  resource: Resource,
  usageType: 'voice_minutes' | 'api_calls',
  requestedAmount: number
): Promise<{ allowed: boolean; remaining: number; limit: number }>

// Record usage
async function recordUsage(
  capabilityId: string,
  principal: Principal,
  usageType: string,
  amount: number,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<void>

// Get current usage for period
async function getCurrentUsage(
  capabilityId: string,
  usageType: string,
  period: 'daily' | 'weekly' | 'monthly'
): Promise<number>
```

### 5. **Voice API Integration Points**

**Before Connection:**
- Check capability exists
- Check usage limits from conditions
- Verify quota available
- Reject if exceeded

**During Call:**
- Track audio duration (calculate from audio chunks)
- Update usage every 30 seconds
- Check quota on each update
- Disconnect if exceeded

**After Call:**
- Finalize usage tracking
- Store total duration

### 6. **Example Capability**

```json
{
  "principal": "user:123",
  "resource": {
    "type": "system",
    "namespace": "voice",
    "id": "live",
    "device_id": "device-abc"
  },
  "actions": ["read"], // "read" = use voice API
  "conditions": {
    "usageLimits": {
      "voice_minutes": {
        "daily": 30,    // 30 minutes per day
        "weekly": 120   // 120 minutes per week
      }
    }
  }
}
```

### 7. **Implementation Considerations**

**Period Calculation:**
- Daily: Reset at midnight UTC
- Weekly: Reset on Monday 00:00 UTC
- Monthly: Reset on 1st of month 00:00 UTC

**Usage Tracking:**
- Track in real-time during call
- Store aggregated usage per period
- Clean up old usage records (retention policy)

**Quota Enforcement:**
- Hard limit: Reject connection if quota exceeded
- Soft limit: Warn at 80% usage
- Graceful disconnect: If quota exceeded mid-call

**Performance:**
- Cache current usage in memory (Redis optional)
- Update database periodically (not every second)
- Batch updates for multiple calls

## Benefits

1. **Flexible**: Different limits per user/service
2. **Dynamic**: Limits can be changed without revoking capability
3. **Trackable**: Usage history for billing/analytics
4. **Enforceable**: Real-time quota checking
5. **Scalable**: Can handle many concurrent calls

## Questions for Discussion

1. **Granularity**: Track per-call or aggregate all calls?
2. **Reset Strategy**: Fixed periods (daily/weekly/monthly) or rolling windows?
3. **Overage Handling**: Hard stop or allow with warning?
4. **Billing Integration**: Should usage feed into billing system?
5. **Admin Override**: Should admins have unlimited usage?

