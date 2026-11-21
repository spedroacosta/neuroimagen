/**
 * Firestore Security Rules Test Suite (`firestore.rules.test.ts`)
 * Verifies the "Dirty Dozen" adversarial payloads defined in `security_spec.md`
 * all return PERMISSION_DENIED.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read/Write Attempt',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'get',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoofing',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'get',
    auth: { uid: 'spoof1', email: 'pedroacosta182002@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Non-Admin Authenticated Read (PII Leak Attempt)',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'get',
    auth: { uid: 'stranger1', email: 'hacker@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { id: 'NEURO-1', isSuperAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Update',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { hacked: 'yes' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Path ID Poisoning',
    collection: 'participants',
    docId: 'invalid$id!with*bad^chars',
    operation: 'create',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { id: 'invalid$id!with*bad^chars' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Oversized String Denial of Wallet',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { id: 'NEURO-1', fullName: 'A'.repeat(500) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Invalid Enum Value on Payment Status',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { paymentStatus: 'hacked_status' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Mutation (responseId / createdAt)',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { responseId: 'CHANGED_RESPONSE_ID' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Forged Client Timestamp on Create',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { id: 'NEURO-1', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Forged Client Timestamp on Update',
    collection: 'participants',
    docId: 'NEURO-1',
    operation: 'update',
    auth: { uid: 'admin1', email: 'pedroacosta182002@gmail.com', email_verified: true },
    payload: { updatedAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Privilege Escalation in /admins',
    collection: 'admins',
    docId: 'stranger1',
    operation: 'create',
    auth: { uid: 'stranger1', email: 'hacker@gmail.com', email_verified: true },
    payload: { uid: 'stranger1', email: 'hacker@gmail.com', addedBy: 'pedroacosta182002@gmail.com' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
