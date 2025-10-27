# Fraud Detection System - Quick Reference Guide

## Overview
The fraud detection system automatically monitors voting patterns and blocks suspicious activity in real-time.

## Automatic Detection (No Action Required)

Fraud detection runs automatically on every vote submission. No manual intervention needed.

### What Gets Detected
1. ✅ Multiple IPs per fingerprint (>3)
2. ✅ Multiple fingerprints per IP (>5)
3. ✅ Rapid voting (<10 seconds apart)
4. ✅ Bot user agents
5. ✅ Geographic inconsistencies (>100km)
6. ✅ Coordinate spoofing (>10 exact matches)
7. ⚠️ VPN/Proxy detection (ready for API integration)

### Automatic Actions
- **Score ≤ 5**: Vote allowed, no flag
- **Score 6-10**: Vote allowed, flagged for review
- **Score > 10**: Vote **BLOCKED**, logged with reason

## Admin Review API

### List Fraud Events
```bash
# Get all unreviewed high-severity events
GET /api/admin/fraud?reviewed=false&severity=high&limit=20

# Get events for specific match
GET /api/admin/fraud?matchId={uuid}&page=1

# Filter by severity
GET /api/admin/fraud?severity=critical
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event-uuid",
        "match_id": "match-uuid",
        "fingerprint_hash": "fp-hash...",
        "ip_hash": "ip-hash...",
        "detection_reason": "IP has 7 different fingerprints",
        "severity": "high",
        "metadata": { /* detection details */ },
        "detected_at": "2025-10-27T21:00:00Z",
        "reviewed": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Mark Event as Reviewed
```bash
POST /api/admin/fraud/{eventId}/review
Authorization: Bearer {admin-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Fraud event marked as reviewed"
}
```

### Get Statistics

#### Match Overview
```bash
GET /api/admin/fraud/stats?matchId={uuid}&type=overview
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 45,
    "bySeverity": {
      "low": 10,
      "medium": 20,
      "high": 12,
      "critical": 3
    },
    "reviewed": 30,
    "unreviewed": 15,
    "reviewProgress": 67
  }
}
```

#### Fraud Trends
```bash
GET /api/admin/fraud/stats?type=trends&days=7
```
**Response:**
```json
{
  "success": true,
  "data": [
    { "date": "2025-10-27", "count": 15, "severity": "high" },
    { "date": "2025-10-27", "count": 8, "severity": "medium" }
  ]
}
```

#### Top Offenders
```bash
GET /api/admin/fraud/stats?matchId={uuid}&type=offenders
```
**Response:**
```json
{
  "success": true,
  "data": {
    "ips": [
      {
        "hash": "ip-hash...",
        "eventCount": 25,
        "highestSeverity": "high",
        "lastDetected": "2025-10-27T21:00:00Z"
      }
    ],
    "fingerprints": [
      {
        "hash": "fp-hash...",
        "eventCount": 18,
        "highestSeverity": "critical",
        "lastDetected": "2025-10-27T20:55:00Z"
      }
    ]
  }
}
```

#### Review Progress
```bash
GET /api/admin/fraud/stats?type=review-progress
```
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 450,
    "reviewed": 380,
    "unreviewed": 70,
    "percentage": 84
  }
}
```

## Detection Methods Details

### 1. Multiple IPs per Fingerprint
**Severity:** Medium
**Threshold:** >3 different IPs
**Pattern:** Same device/browser from multiple networks
**Reason:** "Fingerprint used from X different IP addresses"

### 2. Multiple Fingerprints per IP
**Severity:** High
**Threshold:** >5 different fingerprints
**Pattern:** Multiple devices/browsers from same network
**Reason:** "IP has X different fingerprints"

### 3. Rapid Voting
**Severity:** Low
**Threshold:** <10 seconds between votes
**Pattern:** Same fingerprint voting too quickly
**Reason:** "Votes submitted X seconds apart"

### 4. Suspicious User Agent
**Severity:** Medium
**Detects:** Bot patterns, missing user agents
**Patterns:** curl, wget, python-requests, postman, etc.
**Reason:** "Bot user agent detected: {agent}"

### 5. Geographic Inconsistency
**Severity:** Medium
**Threshold:** >100km distance
**Pattern:** IP location vs browser geolocation mismatch
**Reason:** "IP and browser locations Xkm apart"

### 6. Coordinate Spoofing
**Severity:** High
**Threshold:** >10 votes from exact coordinates
**Pattern:** Many votes from identical GPS coordinates
**Reason:** "X votes from exact same GPS coordinates"

### 7. VPN/Proxy Detection
**Severity:** High
**Status:** Placeholder (ready for API integration)
**APIs:** IPHub, IPQualityScore, ProxyCheck, IPData
**Reason:** "VPN or proxy IP detected"

## Fraud Score Calculation

| Severity | Score |
|----------|-------|
| Low      | 1     |
| Medium   | 3     |
| High     | 5     |
| Critical | 10    |

**Decision Rules:**
- Score > 10: **Block vote**
- Score 6-10: **Allow but flag for review**
- Score ≤ 5: **Allow without flag**

## Redis Pattern Keys

All keys have 2-day TTL:

```
fraud:fp:ips:{fingerprintHash}:{matchId}      → Set of IP hashes
fraud:ip:fps:{ipHash}:{matchId}               → Set of fingerprint hashes
fraud:times:{fingerprintHash}:{matchId}       → List of timestamps
fraud:coords:{matchId}                        → Hash map: "lat,lon" → count
```

## Database Schema

```sql
fraud_events (
  id                UUID PRIMARY KEY,
  match_id          UUID NOT NULL,
  vote_id           UUID,
  fingerprint_hash  VARCHAR(64),
  ip_hash           VARCHAR(64),
  detection_reason  TEXT NOT NULL,
  severity          ENUM('low','medium','high','critical'),
  metadata          JSONB,
  detected_at       TIMESTAMPTZ DEFAULT NOW(),
  reviewed          BOOLEAN DEFAULT FALSE,
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ
)
```

## Common Scenarios

### Scenario 1: Bot Attack Detected
**Pattern:** Multiple fingerprints from single IP, rapid voting, bot user agent
**Score:** 3 (high) + 3 (high) + 3 (medium) + 1 (low) = 10
**Action:** Flagged for review, votes allowed
**Admin Action:** Review and potentially ban IP

### Scenario 2: Coordinated Attack
**Pattern:** 10 different IPs, same coordinates, rapid voting
**Score:** 5 (coord spoofing) + 5 (high for multiple IPs) + 1 (low for rapid) = 11
**Action:** **Vote blocked automatically**
**Admin Action:** Investigate network, ban if confirmed

### Scenario 3: VPN User
**Pattern:** Multiple IPs per fingerprint, geo inconsistency
**Score:** 3 (medium) + 3 (medium) = 6
**Action:** Vote allowed, flagged for review
**Admin Action:** Verify if legitimate user traveling

### Scenario 4: Automated Script
**Pattern:** Bot user agent, rapid voting
**Score:** 3 (medium) + 1 (low) = 4
**Action:** Vote allowed, no flag
**Note:** Low severity, continue monitoring

## Integration Points

### Vote Submission
Located in: `src/services/vote-service.ts`
```typescript
// Automatic fraud check
const fraudResult = await detectFraud({
  matchId: data.matchId,
  fingerprintHash,
  ipHash,
  userAgent: data.userAgent,
  location: { /* coordinates */ }
});

if (fraudResult.shouldBlock) {
  // Vote blocked, fraud logged
  return { success: false, code: 'FRAUD_DETECTED' };
}
```

### Custom Integration
```typescript
import { detectFraud } from '@/services/fraud-detection';
import { calculateFraudScore, shouldBlockVote } from '@/lib/fraud-utils';

const result = await detectFraud({ /* params */ });
const score = calculateFraudScore(result.events);
const block = shouldBlockVote(score);
```

## Monitoring Logs

Fraud events are logged with Winston:

```typescript
// View logs
tail -f logs/all.log | grep -i fraud

// Filter by severity
tail -f logs/all.log | grep "Fraud event logged" | grep "critical"

// View blocked votes
tail -f logs/all.log | grep "Vote blocked"
```

## Performance Notes

- **Redis Operations:** O(1) complexity
- **Parallel Detection:** All methods run concurrently
- **Non-blocking:** Fraud logging doesn't delay votes
- **Auto-expiry:** Redis keys auto-clean after 2 days
- **Indexed Queries:** Fast database lookups

## Troubleshooting

### High False Positive Rate
1. Review detection thresholds
2. Adjust severity levels
3. Tune score calculation
4. Check for legitimate VPN users

### Performance Issues
1. Check Redis connection
2. Verify database indexes
3. Monitor log volume
4. Review pattern tracking TTL

### Missing Detections
1. Verify Redis is running
2. Check database schema
3. Test detection methods individually
3. Review Winston log output

## Next Steps

1. **Deploy to Production**
   - Apply database schema
   - Configure Redis
   - Test with real traffic

2. **Optional Enhancements**
   - Integrate VPN detection API
   - Add ML-based detection
   - Build admin dashboard
   - Implement auto-ban feature

## Support

For issues or questions:
1. Check validation script: `pnpm tsx scripts/validate-task9-fraud-detection.ts`
2. Review logs: `tail -f logs/all.log`
3. Consult implementation summary: `TASK9_IMPLEMENTATION_SUMMARY.md`
