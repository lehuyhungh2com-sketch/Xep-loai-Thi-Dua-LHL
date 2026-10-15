import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from '../../firebase-config';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function testConnection(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  try {
    await getDocFromServer(doc(db, '_connection_check', 'ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firebase client is offline. Operating in fallback mode.');
    }
    return false;
  }
}

export const CLOUD_COLLECTIONS = {
  USERS: 'users',
  CLASSES: 'classes',
  CAMPUSES: 'campuses',
  CRITERIA: 'criteria',
  SCORE_LOGS: 'score_logs',
  SETTINGS: 'settings',
  LOCKED_WEEKS: 'locked_weeks',
  LOCKED_MONTHS: 'locked_months',
  LOCKED_SEMESTERS: 'locked_semesters',
  LOCKED_YEAR: 'locked_year',
  LOCKED_TITLES: 'locked_titles',
  AUDIT_LOGS: 'audit_logs',
  APPEALS: 'appeals',
  DISCIPLINARY_RECORDS: 'disciplinary_records',
  HISTORICAL_SCORES: 'historical_scores',
  CAMPUS_WEEKLY_DUTIES: 'campus_weekly_duties',
  RED_FLAG_MEMBERS: 'red_flag_members',
  RED_FLAG_BRIEFINGS: 'red_flag_briefings',
  RED_FLAG_ACTIVITY_LOGS: 'red_flag_activity_logs',
};

/**
 * Real-time listener for a Firestore collection
 */
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as T);
        });
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
        if (onError) onError(error);
      }
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, collectionName);
    return () => {};
  }
}

/**
 * Real-time listener for a single Firestore document
 */
export function subscribeDocument<T>(
  collectionName: string,
  documentId: string,
  onData: (data: T | null) => void
): () => void {
  if (!isFirebaseConfigured()) return () => {};
  try {
    const docRef = doc(db, collectionName, documentId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          onData(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${collectionName}/${documentId}`);
      }
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `${collectionName}/${documentId}`);
    return () => {};
  }
}

/**
 * Save / Update a document in Firestore in real-time
 */
export async function saveCloudDoc(collectionName: string, documentId: string, data: any): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  try {
    const docRef = doc(db, collectionName, documentId);
    // Sanitize undefined fields to null for Firestore compatibility
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${documentId}`);
    return false;
  }
}

/**
 * Delete a document from Firestore in real-time
 */
export async function deleteCloudDoc(collectionName: string, documentId: string): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${documentId}`);
    return false;
  }
}

/**
 * Batch write multiple documents to Firestore
 */
export async function batchSaveCloudDocs(collectionName: string, items: Array<{ id: string; [key: string]: any }>): Promise<boolean> {
  if (!isFirebaseConfigured() || items.length === 0) return false;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      const cleanData = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
    return false;
  }
}
