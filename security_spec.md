# Security Specification & Test Harness

## 1. Data Invariants
1. **Telemetry Ownership**: A telemetry reading record cannot exist without a valid `userId` matching the authenticated user's `request.auth.uid`.
2. **Alert Event Ownership**: An alert or event log entry must belong strictly to the authenticated user (`userId == request.auth.uid`).
3. **Settings Isolation**: A user can only access or mutate their own settings document where the document ID matches their authenticated `uid` (`request.auth.uid`).
4. **Field Boundaries**: String fields like `title`, `detail`, `pump`, `lid`, `rawLine`, and `timestamp` must have strict size ceilings to eliminate denial-of-wallet resource attacks.
5. **No Blind Blanket Reads**: Read/list operations on `/telemetry_readings` and `/alerts_and_events` must enforce resource ownership matching `request.auth.uid`.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Spoofed User ID on Telemetry Write**:
   `{ userId: "victim_123", soilMoistureRaw: 450, timestamp: "2026-10-20T12:00:00Z" }` (Expected: PERMISSION_DENIED)
2. **Unauthenticated Telemetry Creation**:
   Unauthenticated write to `/telemetry_readings/reading_1`. (Expected: PERMISSION_DENIED)
3. **Huge Raw String Payload Bomb (> 512 chars)**:
   `{ userId: "auth_user_1", rawLine: "A".repeat(10000), timestamp: "2026-10-20T12:00:00Z" }` (Expected: PERMISSION_DENIED)
4. **Altering Another User's System Settings**:
   Authenticated user `user_A` writing to `/system_settings/user_B`. (Expected: PERMISSION_DENIED)
5. **Blanket Query Scraping**:
   User querying all `/telemetry_readings` across the entire database without restricting `userId == request.auth.uid`. (Expected: PERMISSION_DENIED)
6. **Altering Immutable Telemetry Reading**:
   User attempting to update historical sensor readings in `/telemetry_readings/{readingId}` (readings are append-only/immutable). (Expected: PERMISSION_DENIED)
7. **Deleting Another User's Alert Events**:
   User `user_A` trying to delete an alert in `/alerts_and_events/{eventId}` where `resource.data.userId == "user_B"`. (Expected: PERMISSION_DENIED)
8. **Invalid Document ID Injection**:
   Document ID with dangerous characters `/telemetry_readings/../../malicious/path`. (Expected: PERMISSION_DENIED)
9. **Missing Required Fields**:
   `{ soilMoistureRaw: 500 }` (Missing `userId` and `timestamp`). (Expected: PERMISSION_DENIED)
10. **Type Poisoning**:
    `{ userId: "auth_user_1", distanceCm: "not-a-number", timestamp: "2026-10-20T12:00:00Z" }`. (Expected: PERMISSION_DENIED)
11. **Negative Distance Injection Attack**:
    `{ userId: "auth_user_1", distanceCm: -9999, timestamp: "2026-10-20T12:00:00Z" }`. (Expected: PERMISSION_DENIED)
12. **Settings Escalation / Ghost Fields**:
    `{ userId: "auth_user_1", moistureThreshold: 35, autoIrrigation: true, autoLighting: true, role: "superadmin" }`. (Expected: PERMISSION_DENIED)
