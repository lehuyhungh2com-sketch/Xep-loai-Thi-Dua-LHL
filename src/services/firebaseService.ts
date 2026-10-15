/**
 * DỊCH VỤ ĐỒNG BỘ CLOUD FIRESTORE (DÀNH CHO TRIỂN KHAI ĐỘC LẬP NETLIFY/VERCEL)
 * 
 * Kiến trúc sẵn sàng kết nối Google Firebase khi người dùng nhập API Key vào firebase-config.js
 */
import { firebaseConfig } from '../../firebase-config';

export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
  );
};

export interface CloudCollections {
  USERS: string;
  CLASSES: string;
  CAMPUSES: string;
  CRITERIA: string;
  SCORE_LOGS: string;
  SETTINGS: string;
  PERIODIC_BONUS: string;
  AUDIT_LOGS: string;
}

export const CLOUD_COLLECTIONS: CloudCollections = {
  USERS: 'lhl_users',
  CLASSES: 'lhl_classes',
  CAMPUSES: 'lhl_campuses',
  CRITERIA: 'lhl_criteria',
  SCORE_LOGS: 'lhl_score_logs',
  SETTINGS: 'lhl_settings',
  PERIODIC_BONUS: 'lhl_periodic_bonus',
  AUDIT_LOGS: 'lhl_audit_logs',
};
