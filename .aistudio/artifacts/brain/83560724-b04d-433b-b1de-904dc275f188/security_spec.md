# Security Specification for LHL CLASS RANKING

## 1. Data Invariants
- Scores logs belong to a class and week.
- Only authorized users can lock weeks/months.
- Criteria cannot be modified by regular users.
- Audit logs are append-only.

## 2. The "Dirty Dozen" Payloads (Examples)
1. { "classId": "123", "totalPoints": "invalid_type" } (Invalid type)
2. { "week": -1 } (Invalid range)
3. { "admin": true } (Ghost field)

## 3. Test Runner
Will be implemented in `firestore.rules.test.ts`.
