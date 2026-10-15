import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/server_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. Reset all scores & locks (TRỐNG hoàn toàn về điểm số)
db.scoreLogs = [];
db.lockedWeeks = [];
db.lockedMonths = {};
db.lockedSemesters = {};
db.lockedYear = null;
db.lockedTitles = null;
db.historicalWeeklyScores = {};
db.bonus_monthly = {};
db.bonus_term = {};
db.bonus_yearly = {};
db.appeals = [];
db.disciplinaryRecords = [];

if (db.settings) {
  db.settings.dataMode = 'production';
  db.settings.lockedWeeks = [];
  db.settings.lockedMonths = {};
  db.settings.lockedSemesters = {};
  db.settings.lockedYear = null;
  db.settings.lockedTitles = null;
  db.settings.historicalWeeklyScores = {};
}

// 2. Đồng bộ danh mục Giáo viên (teachers) từ 59 lớp và module Người dùng
const teacherList: any[] = [];
const seen = new Set<string>();

db.classes.forEach((cls: any) => {
  const user = db.users.find(
    (u: any) =>
      (cls.teacherId && u.id === cls.teacherId) ||
      (u.classId && u.classId === cls.id) ||
      (u.name && cls.homeroomTeacher && u.name.trim().toLowerCase() === cls.homeroomTeacher.trim().toLowerCase())
  );

  const tId = cls.teacherId || user?.id || `teacher_${cls.id}`;
  const tName = cls.homeroomTeacher || user?.name || 'Chưa phân công';
  const tCode = cls.teacherCode || user?.code || user?.username?.toUpperCase() || `GV_${cls.name}`;

  if (!seen.has(tId)) {
    seen.add(tId);
    teacherList.push({
      id: tId,
      code: tCode,
      fullName: tName,
      campusId: cls.campusId,
      status: cls.status === 'inactive' ? 'inactive' : 'active',
      homeroomClassId: cls.id,
      homeroomClassName: cls.name,
      academicYear: cls.academicYear || db.settings?.academicYear || '2026-2027',
      email: user?.email || undefined,
      phone: user?.phone || undefined,
    });
  }
});

db.teachers = teacherList;

// 3. Xóa các bản ghi audit nháp cũ liên quan đến "Nguyễn Thị Thu" và "Lê Văn Hiếu"
db.auditLogs = (db.auditLogs || []).filter(
  (log: any) =>
    !log.userName?.includes('Nguyễn Thị Thu') &&
    !log.userName?.includes('Lê Văn Hiếu') &&
    !log.details?.includes('Nguyễn Thị Thu') &&
    !log.details?.includes('Lê Văn Hiếu')
);

// Ghi nhật ký khởi tạo lại cơ sở dữ liệu sản xuất sạch
db.auditLogs.unshift({
  id: `audit_init_clean_${Date.now()}`,
  timestamp: new Date().toISOString(),
  userId: 'u_admin_hung',
  userName: 'Lê Huy Hùng',
  userRole: 'super_admin',
  action: 'KHOI_TAO_CSDL',
  entityType: 'database',
  entityId: 'database_production',
  details: 'Khởi tạo lại cơ sở dữ liệu thi đua sản xuất hoàn toàn trống về điểm số, bảo toàn 59 lớp, 6 phân hiệu, 71 tài khoản và danh mục tiêu chí chuẩn theo QĐ số 31/QĐ-THCSLHL.',
});

db.lastUpdated = new Date().toISOString();

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Database successfully reset & cleaned. Classes: ${db.classes.length}, Users: ${db.users.length}, Teachers: ${db.teachers.length}, ScoreLogs: ${db.scoreLogs.length}`);
