// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Bổ sung thư viện Database

// Your web app's Firebase configuration
// Bổ sung chữ "export" vào trước cấu hình
export const firebaseConfig = {
  apiKey: "AIzaSyCpW-PxHIo9FQ0IIspMhBW6Sc0VN6l15f4",
  authDomain: "neneplhl.firebaseapp.com",
  projectId: "neneplhl",
  storageBucket: "neneplhl.firebasestorage.app",
  messagingSenderId: "879961923597",
  appId: "1:879961923597:web:753b8273faf2e9ac8cf544",
  measurementId: "G-VTQ7BYWZ4R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Analytics an toàn (chỉ chạy khi có cửa sổ trình duyệt)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

// Bổ sung và xuất "db" (Cổng kết nối cơ sở dữ liệu để các file khác lưu điểm)
export const db = getFirestore(app);
