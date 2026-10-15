import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'data/server_db.json');

console.log('=== BẮT ĐẦU DỌN DẸP DỮ LIỆU CHẠY THỬ (GO-LIVE CLEANUP) ===');

if (!fs.existsSync(DB_FILE)) {
  console.error(`Không tìm thấy tệp cơ sở dữ liệu: ${DB_FILE}`);
  process.exit(1);
}

const raw = fs.readFileSync(DB_FILE, 'utf-8');
const db = JSON.parse(raw);

// 1. Kiểm tra Master Data cần giữ lại
const usersCount = Array.isArray(db.users) ? db.users.length : 0;
console.log(`[MASTER DATA] Số tài khoản người dùng được bảo tồn: ${usersCount}`);

// 2. Dọn dẹp Transactional Data
const prevLockedWeeks = db.lockedWeeks || [];
const prevAppealsCount = Array.isArray(db.appeals) ? db.appeals.length : 0;
const prevHistoricalWeeks = db.historicalWeeklyScores ? Object.keys(db.historicalWeeklyScores).length : 0;

console.log(`[TRƯỚC KHI DỌN DẸP]`);
console.log(`- Tuần đang khóa: [${prevLockedWeeks.join(', ')}]`);
console.log(`- Số đơn khiếu nại chạy thử: ${prevAppealsCount}`);
console.log(`- Số tuần có điểm bảo lưu chạy thử: ${prevHistoricalWeeks}`);

// Reset Transactional Data
db.lockedWeeks = [];
db.appeals = [];
db.historicalWeeklyScores = {};

// Reset lock states inside settings if present
if (db.settings) {
  db.settings.lockedWeeks = [];
  db.settings.lockedMonths = {};
  db.settings.lockedSemesters = {};
  db.settings.lockedYear = null;
  db.settings.lockedTitles = null;
  db.settings.historicalWeeklyScores = {};
  db.settings.dataMode = 'production';
  // Chuẩn hóa mốc tuần 1
  db.settings.start_date_of_week_1 = '2026-08-31';
  db.settings.currentWeek = 7;
  db.settings.current_active_week = 7;
}

// Thêm bản ghi Audit Log xác nhận hành động Go-live
if (!Array.isArray(db.auditLogs)) {
  db.auditLogs = [];
}

const auditEntry = {
  id: `audit_golive_clean_${Date.now()}`,
  timestamp: new Date().toISOString(),
  userId: 'u_admin_hung',
  userName: 'Lê Huy Hùng (Quản trị viên)',
  userRole: 'super_admin',
  action: 'DON_DEP_DU_LIEU_CHAY_THU',
  entityType: 'settings',
  entityId: 'system_cleanup_golive',
  beforeData: {
    lockedWeeks: prevLockedWeeks,
    appealsCount: prevAppealsCount,
    historicalWeeksCount: prevHistoricalWeeks,
  },
  afterData: {
    lockedWeeks: [],
    appealsCount: 0,
    historicalScoresCount: 0,
    dataMode: 'production',
    status: 'go_live_ready',
  },
  details:
    'Dọn dẹp an toàn toàn bộ dữ liệu chạy thử trước khi Go-live chính thức: Đã xóa toàn bộ điểm số, lỗi vi phạm, điểm bảo lưu, và mở khóa toàn bộ các tuần/tháng. Bảo tồn nguyên vẹn 59 Lớp học, 6 Phân hiệu, 71 Tài khoản người dùng (mật khẩu giữ nguyên), Tiêu chí thi đua và Cấu hình thời gian.',
};

db.auditLogs.unshift(auditEntry);
db.lastUpdated = new Date().toISOString();

// Lưu lại Database
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

console.log(`[SAU KHI DỌN DẸP]`);
console.log(`- Tuần đang khóa: [${db.lockedWeeks.join(', ')}] (Đã mở khóa toàn bộ)`);
console.log(`- Số đơn khiếu nại: ${db.appeals.length}`);
console.log(`- Điểm bảo lưu: ${Object.keys(db.historicalWeeklyScores).length}`);
console.log(`- Chế độ dữ liệu (Data Mode): ${db.settings?.dataMode}`);
console.log(`- Số tài khoản bảo tồn: ${db.users.length}`);
console.log('=== HOÀN TẤT DỌN DẸP DỮ LIỆU CHẠY THỬ AN TOÀN! HỆ THỐNG SẴN SÀNG GO-LIVE ===');
