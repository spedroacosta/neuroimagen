# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Admin-Only Access (PII Isolation)**: All participant records in `/participants/{participantId}` contain PII (`fullName`, `email`, `phone`, `cedula`, `paymentReference`). Read (`get`, `list`) and write (`create`, `update`, `delete`) access is strictly restricted to verified administrators (`isAdmin()`).
2. **Email Verification Mandate**: Any authenticated user acting as an admin (`pedroacosta182002@gmail.com` or registered in `/admins/{uid}`) MUST have `request.auth.token.email_verified == true`.
3. **Strict Schema & No Shadow Fields**: Every write to `/participants/{participantId}` and `/admins/{adminUid}` must pass `isValidParticipant()` or `isValidAdminUser()`, which enforces `hasAll` and `hasOnly` on the exact keys declared in `firebase-blueprint.json`, along with strict string `.size()` bounds.
4. **Immutable Fields**: During `update` on `/participants/{participantId}`, `id`, `responseId`, `ownerEmail`, and `createdAt` cannot be modified (`incoming().id == existing().id`, etc.).
5. **Temporal Integrity**: `createdAt` must equal `request.time` on `create`, and `updatedAt` must equal `request.time` on both `create` and `update`.
6. **Path Variable Hardening**: `participantId` and `adminUid` must satisfy `isValidId()` (`size() <= 128 && matches('^[a-zA-Z0-9_\\-]+$')`) on all single-document operations (`get`, `create`, `update`, `delete`).

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Read/Write**: `auth = null` attempting `get` or `create` on `/participants/NEURO-1` -> `PERMISSION_DENIED`.
2. **Unverified Admin Email Spoofing**: `auth = { uid: 'u1', token: { email: 'pedroacosta182002@gmail.com', email_verified: false } }` attempting `get` on `/participants/NEURO-1` -> `PERMISSION_DENIED`.
3. **Non-Admin Authenticated Read (PII Leak Attempt)**: `auth = { uid: 'stranger', token: { email: 'hacker@gmail.com', email_verified: true } }` attempting `get` or `list` on `/participants` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Create**: Admin creating `/participants/NEURO-1` with an extra undeclared field `isSuperAdmin: true` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Update**: Admin updating `/participants/NEURO-1` with an extra field `hacked: 'yes'` -> `PERMISSION_DENIED`.
6. **Path ID Poisoning**: Admin creating `/participants/invalid$id!with*bad^chars` -> `PERMISSION_DENIED`.
7. **Oversized String ("Denial of Wallet")**: Admin creating `/participants/NEURO-1` with `fullName` of 500 characters (`maxLength: 200`) -> `PERMISSION_DENIED`.
8. **Invalid Enum Value**: Admin updating `paymentStatus` to `'hacked_status'` instead of `'pending' | 'verified' | 'rejected'` -> `PERMISSION_DENIED`.
9. **Immutable Field Mutation**: Admin updating `/participants/NEURO-1` where `incoming().responseId != existing().responseId` or `incoming().createdAt != existing().createdAt` -> `PERMISSION_DENIED`.
10. **Forged Client Timestamp on Create**: Admin creating `/participants/NEURO-1` with `createdAt` set to a past timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
11. **Forged Client Timestamp on Update**: Admin updating `/participants/NEURO-1` with `updatedAt` not matching `request.time` -> `PERMISSION_DENIED`.
12. **Self-Privilege Escalation in `/admins`**: Non-admin user attempting to create `/admins/stranger` to grant themselves admin rights -> `PERMISSION_DENIED`.

## 3. Test Runner Reference (`firestore.rules.test.ts`)
See `/firestore.rules.test.ts` for the test suite verifying these 12 payloads.
