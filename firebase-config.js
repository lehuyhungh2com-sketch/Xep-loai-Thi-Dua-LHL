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

export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

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
