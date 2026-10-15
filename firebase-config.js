import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCPw-PxHiO9FQ0IiSpMhBW6Sc0VN6L15f4",
  authDomain: "neneplhl.firebaseapp.com",
  projectId: "neneplhl",
  storageBucket: "neneplhl.appspot.com",
  messagingSenderId: "879961923597",
  appId: "1:879961923597:web:753b8273faf2e9ac8cf544"
};

let app = null;
let db = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase không khởi tạo được, ứng dụng sẽ chạy thuần LocalStorage:", error);
}

export { app, db };
export default firebaseConfig;
