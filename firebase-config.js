/**
 * CẤU HÌNH GOOGLE FIREBASE (FIRESTORE DATABASE & AUTH)
 * TRƯỜNG THCS LÊ HỮU LẬP
 * 
 * Hướng dẫn sử dụng khi triển khai độc lập lên Vercel / Netlify / Firebase Hosting:
 * 1. Truy cập https://console.firebase.google.com/
 * 2. Tạo một Project mới (ví dụ: 'thcs-le-huu-lap-emulation')
 * 3. Bật dịch vụ Cloud Firestore (chọn chế độ Production mode)
 * 4. Vào Cài đặt dự án (Project Settings) -> Thêm ứng dụng Web -> Sao chép cấu hình bên dưới và dán vào đây:
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
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
const analytics = getAnalytics(app);

/**
 * Các bộ sưu tập chính (Collections) trong Firestore Database:
 * - 'users': Danh sách 71 tài khoản giáo viên, BGH, QTV, Cờ đỏ
 * - 'classes': Danh mục 59 lớp học thuộc 6 phân hiệu
 * - 'campuses': 6 phân hiệu và ban lãnh đạo phụ trách
 * - 'criteria': 68 tiêu chí thi đua chuẩn quy chế BGH
 * - 'score_logs': Nhật ký ghi nhận vi phạm và điểm thưởng theo tuần
 * - 'school_settings': Cấu hình năm học, mốc tuần, chữ ký Ban Giám hiệu
 * - 'periodic_bonus': Điểm thưởng phong trào định kỳ (Tháng, Học kỳ, Cả năm)
 * - 'locked_weeks': Trạng thái chốt số liệu các tuần
 * - 'audit_logs': Nhật ký kiểm toán an toàn hệ thống
 */
export default firebaseConfig;
