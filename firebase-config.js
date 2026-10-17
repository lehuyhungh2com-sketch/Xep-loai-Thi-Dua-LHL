// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = { 
  apiKey : "AIzaSyAhiV8OOtMiH9zfFgieXp0Cy4-sOIf8dW4" , 
  authDomain : "neneplhl-2026.firebaseapp.com" , 
  projectId : "neneplhl-2026" , 
  storageBucket : "neneplhl-2026.firebasestorage.app" , 
  messagingSenderId : "217535563356" , 
  appId : "1:217535563356:web:b1d8f346ba9db0071bc899" , 
  measurementId : "G-DQ7KLWG9P2" 
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore & Auth for Hybrid Synchronization
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics safely in browser environment
export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

/**
 * Các bộ sưu tập chính (Collections) trong Firestore Database:
 * - 'scores' / 'score_logs': Nhật ký ghi nhận vi phạm và điểm thưởng theo tuần
 * - 'locked_weeks': Trạng thái chốt số liệu các tuần
 * - 'locked_months': Trạng thái chốt số liệu các tháng
 * - 'criteria': 68 tiêu chí thi đua chuẩn quy chế BGH
 * - 'audit_logs': Nhật ký kiểm toán an toàn hệ thống
 * - 'users': Danh sách 71 tài khoản giáo viên, BGH, QTV, Cờ đỏ
 * - 'classes': Danh mục 59 lớp học thuộc 6 phân hiệu
 * - 'campuses': 6 phân hiệu và ban lãnh đạo phụ trách
 * - 'school_settings': Cấu hình năm học, mốc tuần, chữ ký Ban Giám hiệu
 */
export default firebaseConfig;
