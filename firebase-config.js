import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 1. Khai báo biến cấu hình (KHÔNG có chữ export ở đầu)
const firebaseConfig = {
  apiKey: "AIzaSyCpW-PxHIo9FQ0IIspMhBW6Sc0VN6l15f4",
  authDomain: "neneplhl.firebaseapp.com",
  projectId: "neneplhl",
  storageBucket: "neneplhl.firebasestorage.app",
  messagingSenderId: "879961923597",
  appId: "1:879961923597:web:753b8273faf2e9ac8cf544",
  measurementId: "G-VTQ7BYWZ4R",
  firestoreDatabaseId: "ai-studio-lhlclassrankingt-83560724-b04d-433b-b1de-904dc275f188"
};

// 2. Xuất biến cấu hình theo đúng chuẩn Named Export
export { firebaseConfig };

// 3. Khởi tạo app
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 4. Khởi tạo Database và Auth
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);

export let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
