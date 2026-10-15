import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPw-PxHiO9FQ0IiSpMhBW6Sc0VN6L15f4",
  authDomain: "neneplhl.firebaseapp.com",
  projectId: "neneplhl",
  storageBucket: "neneplhl.appspot.com",
  messagingSenderId: "879961923597",
  appId: "1:879961923597:web:753b8273faf2e9ac8cf544"
};

// Khởi tạo Firebase an toàn không làm crash app nếu mất mạng
let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase không khởi tạo được, ứng dụng sẽ chạy thuần LocalStorage:", error);
}

export { db };
