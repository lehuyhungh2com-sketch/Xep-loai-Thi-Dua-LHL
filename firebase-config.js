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
  apiKey: "AIzaSyApSYsBgGfP8KCSGdzAPHvXa2EbRrVULMk",
  authDomain: "mindful-range-853bd.firebaseapp.com",
  projectId: "mindful-range-853bd",
  storageBucket: "mindful-range-853bd.firebasestorage.app",
  messagingSenderId: "302161623693",
  appId: "1:302161623693:web:3c7ed3d90a16088da240c4",
  firestoreDatabaseId: "ai-studio-lhlclassrankingt-83560724-b04d-433b-b1de-904dc275f188"
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
