import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

export interface AppletFirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export const firebaseConfig: AppletFirebaseConfig = firebaseConfigJson as AppletFirebaseConfig;

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 1. Database mặc định (default) - Chính là cơ sở dữ liệu hiển thị trực tiếp trên giao diện Firebase Console của người dùng
let defaultDbInstance;
try {
  defaultDbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  defaultDbInstance = getFirestore(app);
}

// 2. Database phân vùng chuyên biệt theo applet (nếu có cấu hình)
let namedDbInstance = null;
if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
  try {
    namedDbInstance = initializeFirestore(
      app,
      { experimentalAutoDetectLongPolling: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    namedDbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

// Xuất db chính trỏ thẳng vào (default) để đồng bộ trực quan với Firebase Console
export const db = defaultDbInstance;
export const dbNamed = namedDbInstance;
export const auth = getAuth(app);

/**
 * Đồng bộ hai chiều (Dual-Sync) đảm bảo dữ liệu ghi thành công lên cả database (default)
 * mà người dùng nhìn thấy trên Firebase Console và database phân vùng applet.
 */
export async function syncFirestoreDoc(collectionName: string, docId: string, data: any): Promise<void> {
  const cleanData = JSON.parse(JSON.stringify(data));
  const promises: Promise<any>[] = [
    setDoc(doc(db, collectionName, docId), cleanData)
  ];
  if (dbNamed) {
    promises.push(setDoc(doc(dbNamed, collectionName, docId), cleanData));
  }
  await Promise.allSettled(promises);
}

/**
 * Xóa đồng bộ trên cả 2 cơ sở dữ liệu
 */
export async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<void> {
  const promises: Promise<any>[] = [
    deleteDoc(doc(db, collectionName, docId))
  ];
  if (dbNamed) {
    promises.push(deleteDoc(doc(dbNamed, collectionName, docId)));
  }
  await Promise.allSettled(promises);
}

export default db;
