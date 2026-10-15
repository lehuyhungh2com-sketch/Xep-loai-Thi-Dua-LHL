// 7 official roles as requested:
// 1. SUPER ADMIN (Toàn quyền toàn hệ thống)
// 2. BAN GIÁM HIỆU (Xem toàn trường, duyệt và chốt dữ liệu, xem báo cáo)
// 3. QUẢN TRỊ VIÊN PHÂN HIỆU (Chỉ quản lý phân hiệu được phân công)
// 4. TPT ĐỘI / PHỤ TRÁCH ĐỘI (Nhập và quản lý dữ liệu thi đua của phân hiệu được giao)
// 5. GIÁO VIÊN CHỦ NHIỆM (Chỉ xem lớp mình phụ trách, có thể gửi phản hồi hoặc đề nghị điều chỉnh)
// 6. ĐỘI CỜ ĐỎ (Chỉ được nhập dữ liệu theo nhiệm vụ)
// 7. NGƯỜI XEM (Chỉ được xem báo cáo)
export type RoleType =
  | 'super_admin'
  | 'bgh'
  | 'campus_admin'
  | 'tpt_doi'
  | 'gvcn'
  | 'red_flag'
  | 'viewer'
  // Legacy aliases for backward-compatibility
  | 'admin'
  | 'inspector'
  | 'campus_lead'
  | 'teacher'
  | 'public';

export interface UserCustomPermissions {
  canInputScore?: boolean;      // Nhập điểm thi đua
  canEditScore?: boolean;       // Sửa điểm thi đua
  canDeleteScore?: boolean;     // Xóa điểm thi đua
  canLockData?: boolean;        // Chốt tuần, tháng, học kỳ, cả năm
  canUnlockData?: boolean;      // Mở khóa dữ liệu đã chốt
  canEditCriteria?: boolean;    // Cấu hình/sửa tiêu chí thi đua
  canManageUsers?: boolean;     // Quản lý người dùng & phân quyền
  canManageCampuses?: boolean;  // Quản lý phân hiệu & lớp học
  canViewAllReports?: boolean;  // Xem toàn bộ báo cáo
}

export interface User {
  id: string;
  name: string;
  role: RoleType;
  email: string;
  campusId?: string; // If campus_admin, tpt_doi, or gvcn
  classId?: string; // If gvcn (Giáo viên chủ nhiệm)
  dutyDays?: ('Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7')[]; // If red_flag
  dutyArea?: string; // If red_flag
  avatar?: string;
  title: string;
  phone?: string;
  teacherCode?: string; // Mã giáo viên (VD: GV01, GV02)
  password?: string; // Mật khẩu đăng nhập
  // Phân quyền & Quản lý tài khoản
  isLocked?: boolean; // Khóa/Mở khóa tài khoản
  lockedAt?: string;
  lockedReason?: string;
  scopeType?: 'all' | 'campus'; // Phân quyền theo toàn trường hoặc từng phân hiệu
  allowedCampusIds?: string[]; // Danh sách phân hiệu được phép truy cập
  customPermissions?: UserCustomPermissions; // Phân quyền theo chức năng
  createdAt?: string;
  lastLoginAt?: string;
}

export type AuditAction =
  | 'THEM_DIEM'             // Thêm điểm vi phạm/khen thưởng
  | 'SUA_DIEM'              // Sửa điểm vi phạm/khen thưởng
  | 'XOA_DIEM'              // Xóa điểm vi phạm/khen thưởng
  | 'THEM_THANH_TICH'       // Thêm thành tích/khen thưởng đột xuất
  | 'SUA_THANH_TICH'        // Sửa thành tích/khen thưởng
  | 'XOA_THANH_TICH'        // Xóa thành tích/khen thưởng
  | 'CHOT_DU_LIEU_TUAN'     // Chốt khóa điểm thi đua tuần
  | 'MO_KHOA_TUAN'          // Mở khóa điểm thi đua tuần
  | 'CHOT_THANG'            // Chốt tháng
  | 'MO_KHOA_THANG'         // Mở khóa tháng
  | 'CHOT_HOC_KY'           // Chốt học kỳ
  | 'MO_KHOA_HOC_KY'        // Mở khóa học kỳ
  | 'CHOT_CA_NAM'           // Chốt cả năm
  | 'MO_KHOA_CA_NAM'        // Mở khóa cả năm
  | 'CHOT_DANH_HIEU_NAM'    // Chốt danh hiệu
  | 'MO_KHOA_DANH_HIEU_NAM' // Mở khóa danh hiệu
  | 'MO_KHOA_DANH_HIEU'     // Mở khóa danh hiệu
  | 'THEM_QUYET_DINH_KY_LUAT' // Thêm kỷ luật
  | 'XOA_QUYET_DINH_KY_LUAT'  // Xóa kỷ luật
  | 'THEM_LOP'              // Thêm lớp học
  | 'SUA_LOP'               // Sửa thông tin lớp học
  | 'XOA_LOP'               // Xóa lớp học
  | 'THEM_PHAN_HIEU'        // Thêm phân hiệu
  | 'SUA_PHAN_HIEU'         // Sửa phân hiệu
  | 'XOA_PHAN_HIEU'         // Xóa phân hiệu
  | 'PHAN_CONG_CO_DO'       // Phân công lịch trực cờ đỏ
  | 'XOA_LICH_CO_DO'        // Xóa lịch trực cờ đỏ
  | 'GUI_DE_NGHI_DIEU_CHINH'// GVCN gửi đề nghị điều chỉnh
  | 'DUYET_DIEU_CHINH'      // BGH/TPT duyệt điều chỉnh điểm
  | 'TU_CHOI_DIEU_CHINH'    // BGH/TPT từ chối điều chỉnh
  | 'CAP_NHAT_CAU_HINH'     // Cập nhật cấu hình hệ thống
  | 'THEM_TIEU_CHI'         // Thêm tiêu chí thi đua mới
  | 'SUA_TIEU_CHI'          // Sửa tiêu chí thi đua
  | 'XOA_TIEU_CHI'          // Xóa tiêu chí thi đua
  | 'THEM_NGUOI_DUNG'       // Thêm tài khoản người dùng
  | 'SUA_NGUOI_DUNG'        // Sửa quyền/thông tin người dùng
  | 'XOA_NGUOI_DUNG'        // Xóa tài khoản người dùng
  | 'DANG_NHAP'             // Đăng nhập hệ thống
  | 'DANG_XUAT'             // Đăng xuất khỏi hệ thống
  | 'KHOA_TAI_KHOAN'        // Khóa tài khoản
  | 'MO_KHOA_TAI_KHOAN'     // Mở khóa tài khoản
  | 'THAY_DOI_QUYEN_HAN'    // Thay đổi phân quyền chức năng/phân hiệu
  | 'KHOI_PHUC_HE_THONG'    // Khôi phục dữ liệu mẫu gốc
  | 'CHUYEN_NAM_HOC'        // Chuyển hoặc tạo năm học mới
  | 'SAO_LUU_HE_THONG'      // Xuất bản sao lưu hệ thống
  | 'PHUC_HOI_HE_THONG'     // Phục hồi hệ thống từ bản sao lưu
  | 'XUAT_EXCEL_TONG_HOP'   // Xuất báo cáo Excel tổng hợp
  | 'CHOT_DU_LIEU_THANG'    // Chốt khóa dữ liệu xếp hạng tháng
  | 'CHOT_DU_LIEU_HOC_KY'   // Chốt khóa dữ liệu xếp hạng học kỳ
  | 'CHOT_DU_LIEU_CA_NAM'   // Chốt khóa dữ liệu xếp hạng cả năm
  | 'CAP_NHAT_KY_LUAT'      // Cập nhật thông tin học sinh bị hội đồng kỷ luật
  | 'DON_DEP_DU_LIEU_CHAY_THU' // Dọn dẹp an toàn dữ liệu chạy thử trước khi Go-live
  | 'KIEM_TRA_TOAN_VEN';    // Chạy rà soát kiểm tra tính toàn vẹn hệ thống

export interface MonthLockInfo {
  month: number;
  academicYear: string;
  isLocked: boolean;
  lockedAt: string; // ISO string
  lockedBy: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  unlockedAt?: string;
  unlockedBy?: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  notes?: string;
}

export interface MonthWeeklyScoreItem {
  week: number;
  score: number;
  isLocked: boolean;
  baseScore: number;
  bonusPoints: number;
  penaltyPoints: number;
  logsCount: number;
  logs: ScoreLog[];
}

export interface MonthRankingRow {
  rank: number;
  classItem: ClassItem;
  campus: Campus;
  totalWeeksInMonth: number;
  lockedWeeksCount: number;
  weekScores: MonthWeeklyScoreItem[];
  averageScore: number; // (Tổng điểm các tuần đã chốt) / (Số tuần đã chốt)
  bonus_points_monthly?: number; // Điểm thưởng phong trào của tháng đó
  finalMonthlyScore: number; // averageScore + (bonus_points_monthly || 0)
  hasAllWeeksLocked: boolean;
  hasNoWeeksLocked: boolean;
  performanceTier: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Trung bình' | 'Cần cố gắng';
  isExempt?: boolean;
  exemptReason?: string;
}

export interface SemesterLockInfo {
  semester: 1 | 2;
  academicYear: string;
  isLocked: boolean;
  lockedAt: string; // ISO string
  lockedBy: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  unlockedAt?: string;
  unlockedBy?: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  notes?: string;
}

export interface SemesterMonthScoreItem {
  month: number;
  averageScore: number; // Điểm trung bình tháng từ các tuần đã chốt
  isLocked: boolean; // Tháng đã được chốt hay chưa
  totalWeeks: number;
  lockedWeeksCount: number;
  weekScores: MonthWeeklyScoreItem[];
}

export interface SemesterRankingRow {
  rank: number;
  classItem: ClassItem;
  campus: Campus;
  totalMonthsInSemester: number;
  lockedMonthsCount: number;
  monthScores: SemesterMonthScoreItem[];
  semesterScore: number; // Điểm trung bình các tháng đã chốt trong học kỳ
  bonus_points_term?: number; // Điểm thưởng phong trào của học kỳ đó
  finalSemesterScore: number; // semesterScore + (bonus_points_term || 0)
  hasAllMonthsLocked: boolean;
  hasNoMonthsLocked: boolean;
  performanceTier: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Trung bình' | 'Cần cố gắng';
  isExempt?: boolean; // Miễn thi đua HK1 (Đội tuyển HSG)
}

export interface YearLockInfo {
  academicYear: string;
  isLocked: boolean;
  lockedAt: string; // ISO string
  lockedBy: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  unlockedAt?: string;
  unlockedBy?: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  notes?: string;
}

export interface YearRankingRow {
  rank: number;
  classItem: ClassItem;
  campus: Campus;
  semester1Score: number | null; // Điểm HKI (chỉ khi HKI đã chốt)
  semester2Score: number | null; // Điểm HKII (chỉ khi HKII đã chốt)
  isSemester1Locked: boolean;
  isSemester2Locked: boolean;
  hasBothSemestersLocked: boolean;
  isExemptSemester1?: boolean; // Lớp được miễn HK1 -> Điểm cả năm = HKII
  yearScore: number | null; // (HKI + HKII * 2) / 3 nếu cả 2 kỳ đã chốt; hoặc HKII nếu miễn HK1
  bonus_points_yearly?: number; // Điểm thưởng phong trào cả năm
  finalYearScore: number | null; // yearScore + (bonus_points_yearly || 0)
  displayScoreText: string; // "94.00" hoặc "Chưa đủ dữ liệu"
  performanceTier: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Trung bình' | 'Cần cố gắng' | 'Chưa đủ dữ liệu';
  semester1Row?: SemesterRankingRow;
  semester2Row?: SemesterRankingRow;
}

export interface PeriodicBonusData {
  monthly: Record<number, Record<string, number>>; // month -> classId -> bonus
  term: Record<number, Record<string, number>>;    // semester -> classId -> bonus
  yearly: Record<string, number>;                  // classId -> bonus
}

export interface AcademicYearArchive {
  id: string;
  year: string; // e.g. "2025-2026"
  archivedAt: string;
  archivedBy: string;
  totalClasses: number;
  totalScoreLogs: number;
  lockedWeeks: number[];
  classesSnapshot: ClassItem[];
  scoreLogsSnapshot: ScoreLog[];
  settingsSnapshot: SchoolSettings;
  note?: string;
}

export interface SystemFullBackupPayload {
  version: string;
  appName: string;
  exportedAt: string;
  exportedBy: string;
  settings: SchoolSettings;
  campuses: Campus[];
  classes: ClassItem[];
  criteria: Criteria[];
  scoreLogs: ScoreLog[];
  lockedWeeks: number[];
  lockedMonths?: Record<number, MonthLockInfo>;
  appeals: AdjustmentAppeal[];
  auditLogs: AuditLog[];
  academicYearArchives: AcademicYearArchive[];
  users: User[];
  redFlagDuties?: any[];
  checksum?: string;
}

export type AuditCategory =
  | 'diem_thi_dua'   // Điểm thi đua & vi phạm/khen thưởng
  | 'khoa_du_lieu'   // Chốt/Mở khóa tuần, tháng, học kỳ, cả năm
  | 'tieu_chi'       // Danh mục tiêu chí thi đua
  | 'nguoi_dung'     // Phân quyền & tài khoản
  | 'ky_luat'        // Hồ sơ kỷ luật học sinh
  | 'co_do'          // Phân công cờ đỏ
  | 'he_thong';      // Cấu hình & sao lưu hệ thống

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  userName: string;
  userRole: RoleType;
  action: AuditAction;
  category?: AuditCategory;
  entityType: 'score_log' | 'class' | 'campus' | 'week_lock' | 'month_lock' | 'semester_lock' | 'year_lock' | 'title_lock' | 'disciplinary_record' | 'appeal' | 'settings' | 'user' | 'red_flag' | 'criteria' | 'historical_scores';
  entityId: string;
  campusId?: string;
  campusName?: string;
  classId?: string;
  className?: string;
  reason?: string;
  beforeData?: any;
  afterData?: any;
  details: string;
}

export type AppealStatus = 'pending' | 'approved' | 'rejected';
export type AppealType = 'adjust_score' | 'remove_penalty' | 'add_bonus' | 'dispute_violation';

export interface AdjustmentAppeal {
  id: string;
  createdAt: string; // ISO
  classId: string;
  className: string;
  campusId: string;
  campusName: string;
  teacherId: string;
  teacherName: string;
  week: number;
  scoreLogId?: string; // Target violation/bonus log if adjusting existing one
  criteriaName?: string;
  appealType: AppealType;
  reason: string;
  evidenceNotes?: string; // Ghi chú minh chứng
  proposedPoints?: number;
  status: AppealStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  resultingScoreLogId?: string; // ID of log created/updated after approval
}

export interface AcademicYearSemester {
  name: string;
  startDate: string;
  endDate: string;
  totalWeeks: number;
}

export interface AcademicYear {
  id: string; // e.g., '2026-2027', '2027-2028'
  name: string; // e.g., 'Năm học 2026 - 2027'
  startYear: number;
  endYear: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  semester1: AcademicYearSemester;
  semester2: AcademicYearSemester;
  status: 'active' | 'archived' | 'upcoming'; // 'Đang sử dụng' | 'Đã kết thúc' | 'Sắp diễn ra'
  isDefault?: boolean;
  notes?: string;
}

export interface GradeItem {
  id: string; // e.g. 'grade_6'
  grade: number; // 6, 7, 8, 9...
  name: string; // 'Khối 6'
  order?: number;
  displayOrder?: number;
  status: 'active' | 'inactive';
  description?: string;
}

export interface TeacherItem {
  id: string; // e.g., 'gv_01'
  code: string; // e.g., 'GV01'
  fullName: string;
  campusId: string;
  status: 'active' | 'inactive';
  homeroomClassId?: string;
  homeroomClassName?: string;
  academicYear: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CalendarWeekConfig {
  week: number;
  name: string;
  startDate: string;
  endDate: string;
  month: number;
  semester: 1 | 2;
  academicYear: string;
  isHoliday?: boolean;
  notes?: string;
}

export interface Campus {
  id: string;
  code: string;
  name: string;
  type: 'main' | 'sub';
  leaderName?: string;
  phone?: string;
  address?: string;
  description?: string;
  colorTheme?: string;
  status?: 'active' | 'inactive'; // Tạm ngừng sử dụng
  isMain?: boolean; // TRƯỜNG CHÍNH
}

export interface ClassItem {
  id: string;
  name: string; // e.g., '6A1', '9G2'
  grade: number; // 6 | 7 | 8 | 9 | ...
  campusId: string;
  homeroomTeacher: string; // GVCN
  monitorName?: string; // Lớp trưởng
  studentCount: number;
  roomNumber?: string;
  code?: string; // Mã lớp
  classType?: 'A1' | 'A2' | 'A3' | 'standard'; // Loại lớp: A1, A2, A3 (trường chính) hoặc standard
  type?: 'A1' | 'A2' | 'A3' | 'Standard'; // compatibility alias
  status?: 'active' | 'inactive'; // Trạng thái hoạt động
  teacherId?: string; // Liên kết giáo viên chủ nhiệm
  teacherCode?: string; // Mã giáo viên chủ nhiệm
  notes?: string; // Ghi chú
  academicYear?: string;
  exemptSemester1?: boolean; // Miễn thi đua HK1 (Cho lớp đội tuyển HSG, bồi dưỡng HSG)
}

export type CriteriaCategory =
  | 'Chuyên cần'
  | 'Hành vi ứng xử'
  | 'Tác phong - Trang phục'
  | 'Sinh hoạt TT'
  | 'Lao động, vệ sinh'
  | 'Bảo vệ của công'
  | 'Trật tự ATGT'
  | 'Chất lượng học tập'
  | 'Quy chế thi'
  | 'Đóng góp – Sổ đầu bài'
  | 'Đội cờ đỏ'
  | 'Bán trú'
  | 'Học tập'
  | 'HS nhặt được của rơi'
  | 'Các hoạt động khác'
  | 'Lớp có HS đạt giải các kỳ thi'
  | 'Khác';

export type CriteriaType = 'bonus' | 'penalty';
export type CriteriaPeriod = 'week' | 'month' | 'year';
export type CriteriaScope = 'all' | 'main_only' | 'sub_only' | 'sub_with_badge';
export type CalculationRuleType =
  | 'standard'
  | 'weak_score_main'
  | 'weak_score_sub'
  | 'good_score_main_a1'
  | 'good_score_main_a2a3'
  | 'good_score_sub'
  | 'dormitory_step'
  | 'ceremony_team'
  | 'provincial_exam_k9'
  | 'club_exchange_k678'
  | 'upper_competition';

export type CriteriaStatus = 'active' | 'inactive' | 'locked' | 'archived';

export interface Criteria {
  id: string;
  code: string;
  name: string;
  category: CriteriaCategory;
  type: CriteriaType;
  type_vn?: 'TRU' | 'CONG';
  points: number; // Điểm cơ bản
  point?: number; // Tương thích trường point theo yêu cầu BGH
  unit: string; // 'lần', 'tiết', 'buổi', 'lần/em', 'tuần', 'giải', 'em', 'lỗi/em'
  period: CriteriaPeriod; // 'week' | 'month' | 'year'
  scope: CriteriaScope; // 'all' | 'main_only' | 'sub_only' | 'sub_with_badge'
  targetGrades?: number[]; // [6,7,8] hoặc [9], undefined = tất cả các khối
  targetClassType?: 'all' | 'A1' | 'A2_A3'; // Dành riêng cho phân loại lớp A1 vs A2, A3 trường chính
  condition?: string; // Mô tả điều kiện áp dụng
  maxCap?: number; // Giới hạn điểm cộng/trừ tối đa nếu có
  calculationRule?: CalculationRuleType; // Quy tắc tính điểm động
  isActive: boolean;
  academicYear?: string; // Năm học áp dụng
  description?: string;
  version?: number;
  isLocked?: boolean;
  status?: CriteriaStatus;
  startWeek?: number;
  endWeek?: number;
  changeReason?: string;
}

export interface CriteriaVersionHistory {
  id: string;
  criteriaId: string;
  criteriaCode: string;
  criteriaName?: string;
  version: number;
  data: Criteria;
  createdAt?: string;
  createdBy?: string;
  changedAt?: string;
  changedBy?: string;
  changedByRole?: string;
  changeReason?: string;
  effectiveStartWeek?: number;
  effectiveFromWeek?: number;
  effectiveToWeek?: number;
  oldPoints?: number;
  oldUnit?: string;
  newPoints?: number;
  newUnit?: string;
  scopeSummary?: string;
  newScope?: string;
}

export interface CriteriaAdjustmentRuleConfig {
  lockMode: 'flexible' | 'strict' | 'locked_historical' | 'before_week_lock' | 'before_specific_date' | 'before_period_lock';
  adjustmentDeadlineDate?: string;
  notes?: string;
  allowSuperAdminOverride?: boolean;
}

export interface ScoreEditHistoryItem {
  id: string;
  timestamp: string; // ISO string
  modifiedBy: string;
  modifiedByRole: RoleType;
  reason?: string;
  oldPoints: number;
  newPoints: number;
  oldQuantity: number;
  newQuantity: number;
  oldCriteriaName?: string;
  newCriteriaName?: string;
  oldNote?: string;
  newNote?: string;
}

export interface ScoreLog {
  id: string;
  week: number;
  month?: number;
  semester?: 1 | 2;
  period: CriteriaPeriod;
  classId: string;
  className: string;
  campusId: string;
  campusName: string;
  campusType: 'main' | 'sub';
  grade: number;
  criteriaId: string;
  criteriaCode: string;
  criteriaName: string;
  category: CriteriaCategory;
  type: CriteriaType;
  pointsPerUnit: number;
  quantity: number;
  totalPoints: number; // positive if bonus, negative if penalty
  appliedCap?: number;
  calculationDetail?: string;
  note?: string;
  date: string; // YYYY-MM-DD
  recordedBy: string;
  inspectorName: string;
  isDisciplinary?: boolean; // Nếu vi phạm bị hội đồng kỷ luật xử lý -> Không xếp loại cả năm
  editHistory?: ScoreEditHistoryItem[];
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  lastModifiedReason?: string;
  isDemo?: boolean; // Phân biệt Dữ liệu Demo (true) vs Dữ liệu Thật (false)
  academicYear?: string; // Năm học áp dụng
}

export interface ClassWeeklyScore {
  classId: string;
  week: number;
  baseScore: number; // default 100
  bonusPoints: number;
  penaltyPoints: number;
  finalScore: number;
  logCount: number;
  rankInCampus?: number;
  rankInSchool?: number;
  isHistorical?: boolean; // Điểm bảo lưu trực tiếp từ dữ liệu lịch sử
  historicalNote?: string;
}

export interface HistoricalScoreEntry {
  classId: string;
  className?: string;
  finalScore: number;
  note?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type HistoricalWeeklyScoresMap = Record<number, Record<string, HistoricalScoreEntry>>;

export interface RankingEntry {
  rank: number;
  classItem: ClassItem;
  campus: Campus;
  totalScore: number;
  baseScore: number;
  bonusPoints: number;
  penaltyPoints: number;
  monthBonusPoints?: number;
  monthPenaltyPoints?: number;
  yearBonusPoints?: number;
  logCount: number;
  performanceTier: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Trung bình' | 'Cần cố gắng';
  averageScore?: number;
  weekBreakdown?: { week: number; score: number }[];
  semester1Score?: number;
  semester2Score?: number;
  isDisqualifiedYearly?: boolean;
  disqualificationReason?: string;
  isHistorical?: boolean;
  historicalNote?: string;
  isExempt?: boolean;
  exemptReason?: string;
}

export interface EvaluationConfig {
  advancedClassesRatio: number; // default 0.70 (70% lớp tiên tiến trở lên)
  excellentClassesRatio: number; // default 0.35 (35% lớp xuất sắc)
  goodClassesRatio: number; // default 0.35 (35% lớp tiên tiến)
  allowMainCampusExceed70: boolean; // default true
  mainWeakBaseThreshold: number; // default 2
  mainWeakBasePoints: number; // default 1
  mainWeakStepPoints: number; // default 0.5
  subWeakThreshold: number; // default 5
  subWeakPenalty: number; // default 2
  subWeakMaxCap: number; // default 2
  mainA1GoodThreshold: number; // default 13
  mainA2A3GoodThreshold: number; // default 10
  subGoodThreshold: number; // default 5
  goodScoreBonus: number; // default 2
  goodScoreMaxCap: number; // default 2
  dormitoryMaxCap: number; // default 3
  ceremonyMaxCap: number; // default 0.5
  lostFoundValueThreshold: number; // default 200000
  // Title evaluation settings
  quotaBasis?: 'total_classes' | 'advanced_pool'; // default 'total_classes'
  roundingMethod?: 'round' | 'ceil' | 'floor'; // default 'round'
  minScoreExcellent?: number; // default 0 (no floor threshold, rank-based)
  minScoreAdvanced?: number; // default 0 (no floor threshold, rank-based)
  quotaAllocationScope?: 'all' | 'by_campus'; // default 'all'
}

export type ClassTitle = 'LỚP XUẤT SẮC' | 'LỚP TIÊN TIẾN' | 'KHÔNG ĐƯỢC XẾP LOẠI';

export interface DisciplinaryRecord {
  id: string;
  classId: string;
  className: string;
  studentName: string;
  decisionNumber: string; // Số quyết định kỷ luật của Hội đồng
  decisionDate: string; // Ngày ra quyết định
  reason: string; // Lý do kỷ luật
  councilLevel: 'Hội đồng kỷ luật trường' | 'Hội đồng kỷ luật' | 'Cấp trên';
  recordedBy: string;
  recordedAt: string;
  notes?: string;
}

export interface TitleLockInfo {
  academicYear: string;
  isLocked: boolean;
  lockedAt: string;
  lockedBy: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  unlockedAt?: string;
  unlockedBy?: {
    id: string;
    name: string;
    role: RoleType;
    title?: string;
  };
  notes?: string;
}

export interface TitleEvaluationRow {
  stt: number;
  classItem: ClassItem;
  campus: Campus;
  yearScore: number | null;
  isYearLocked: boolean;
  evaluationStatus: 'Được xét' | 'Không được xét';
  title: ClassTitle;
  rank: number | null;
  isDisqualified: boolean;
  disqualificationReason?: string;
  hasDisciplinaryStudent: boolean;
  disciplinaryDetails?: string;
  specialAchievementNote?: string;
  notes: string;
  quotaReason: string;
}

export interface TitleEvaluationResult {
  rows: TitleEvaluationRow[];
  totalClasses: number;
  evaluatedClassesCount: number;
  excellentCount: number;
  advancedCount: number;
  disqualifiedCount: number;
  unclassifiedCount: number;
  isYearLocked: boolean;
  isTitleLocked: boolean;
  lockInfo?: TitleLockInfo | null;
  config: EvaluationConfig;
}

export interface RedFlagDuty {
  id: string;
  week: number;
  campusId: string;
  dayOfWeek: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7';
  assignedClassId: string; // Class in charge of duty
  assignedClassName: string;
  inspectorNames: string; // E.g. 'Lê Hải Đăng, Nguyễn Thu Hà'
  dutyArea: string; // E.g. 'Khu phòng học Khối 8 & Khối 9'
  shiftName?: string; // Ca trực: Sáng đầu giờ, Ra chơi, Tan trường...
  tasks?: string; // Nhiệm vụ cụ thể
  notes?: string;
  createdAt?: string;
}

export interface CampusWeeklyDuty {
  id: string;
  week: number;
  campusId: string;
  classId: string;
  className: string;
  homeroomTeacher: string; // GVCN của lớp trực
  teacherId?: string;
  dutyRoleDescription?: string; // Nhiệm vụ trực ban tuần: Kéo cờ, giám sát nề nếp...
  notes?: string;
  briefingDeadlineDay?: string; // Mặc định: 'Thứ 6'
  briefingDeadlineTime?: string; // Mặc định: '08:30'
}

export interface RedFlagMember {
  id: string;
  name: string;
  classId: string;
  className: string;
  campusId: string;
  campusName: string;
  roleTitle: 'Đội trưởng' | 'Đội phó' | 'Ủy viên BCH' | 'Đội viên';
  assignedArea: string; // Khu vực thường trực
  assignedShift: string; // Ca trực (Đầu giờ sáng / Ra chơi / Ra về)
  phone?: string;
  status: 'active' | 'leave' | 'standby';
  notes?: string;
}

export interface RedFlagBriefing {
  id: string;
  week: number;
  campusId: string;
  meetingDate: string; // YYYY-MM-DD
  meetingTime: string; // HH:mm (e.g. 08:30)
  presidedBy: string; // TPT Đội / Đại diện BGH
  dutyClassId: string;
  dutyClassName: string;
  dutyTeacherName: string;
  logBookHandedOver: boolean; // Đã nộp sổ trực
  attendeesCount: number;
  status: 'completed' | 'pending' | 'delayed';
  conclusionSummary: string; // Nội dung kết luận giao ban
  notes?: string;
}

export interface RedFlagActivityLog {
  id: string;
  week: number;
  campusId: string;
  date: string;
  time: string;
  area: string;
  reporterName: string;
  activityType: 'patrol' | 'traffic_support' | 'flag_ceremony' | 'cleanliness_check' | 'other';
  title: string;
  content: string;
  result: string;
}

export interface LeadershipSignatures {
  principalName?: string; // Hiệu trưởng
  tptName?: string; // Tổng phụ trách Đội
  vicePrincipalEmulationName?: string; // Phó Hiệu trưởng phụ trách thi đua
  campusVicePrincipals?: Record<string, string>; // campusId -> Phó Hiệu trưởng phụ trách phân hiệu
}

export interface SchoolSettings {
  schoolName: string;
  governingBody?: string; // Đơn vị cấp trên / Chủ quản (cho phép để trống)
  academicYear: string;
  basePointsPerWeek: number;
  currentWeek: number;
  totalWeeksSemester1: number;
  totalWeeksSemester2: number;
  totalWeeks?: number; // Tổng số tuần tối đa toàn hệ thống (= totalWeeksSemester1 + totalWeeksSemester2)
  current_active_week?: number; // Tuần hiện tại đang hoạt động
  start_date_of_week_1?: string; // Ngày Thứ Hai bắt đầu của Tuần 1 (YYYY-MM-DD, e.g. 2026-08-31)
  last_baseline_date?: string; // Ngày thiết lập mốc gần nhất (YYYY-MM-DD)
  max_weeks?: number; // Ngưỡng số tuần tối đa
  schoolStartDate?: string; // Ngày bắt đầu năm học (mặc định 'YYYY-09-05')
  monthWeeksMap: Record<number, number[]>; // Month -> array of weeks
  yearFormula: string; // '(HK1 + HK2 * 2) / 3'
  evaluationConfig: EvaluationConfig;
  leadershipSignatures?: LeadershipSignatures; // Cấu hình Ban Giám hiệu & Phó Hiệu trưởng ký biên bản
  dataMode?: 'demo' | 'production'; // 'demo' = Dữ liệu mẫu thử nghiệm, 'production' = Dữ liệu thật vận hành
  activeAcademicYearId?: string; // ID năm học đang hoạt động
  lockedWeeks?: number[]; // Weeks locked by TPT Đội or Admin
  lockedMonths?: Record<number, MonthLockInfo>; // Months locked by BGH or Super Admin
  lockedSemesters?: Record<number, SemesterLockInfo>; // Semesters locked by BGH or Super Admin
  lockedYear?: YearLockInfo | null; // Year locked by BGH or Super Admin
  lockedTitles?: TitleLockInfo | null; // Titles locked by BGH or Super Admin
  historicalWeeklyScores?: HistoricalWeeklyScoresMap; // Điểm bảo lưu lịch sử theo tuần
}

export type ViewTab = 
  | 'dashboard'
  | 'campuses'
  | 'classes'
  | 'academic_catalog'
  | 'redflag'
  | 'scoring'
  | 'criteria'
  | 'rankings'
  | 'month_rankings'
  | 'semester_rankings'
  | 'year_rankings'
  | 'title_evaluation'
  | 'reports'
  | 'datalock'
  | 'appeals'
  | 'audit_logs'
  | 'users'
  | 'settings';

export interface RoleMeta {
  role: RoleType;
  title: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const ROLE_METAS: Record<string, RoleMeta> = {
  super_admin: {
    role: 'super_admin',
    title: 'SUPER ADMIN',
    badge: 'Toàn quyền',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Toàn quyền tối cao toàn hệ thống: Cấu hình, phân quyền, quản lý 6 phân hiệu, 59 lớp, audit log, chốt dữ liệu.',
  },
  bgh: {
    role: 'bgh',
    title: 'BAN GIÁM HIỆU',
    badge: 'Ban Giám Hiệu',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Xem toàn trường, duyệt và chốt dữ liệu thi đua tuần/tháng/kỳ, duyệt điều chỉnh điểm, xem báo cáo toàn diện.',
  },
  campus_admin: {
    role: 'campus_admin',
    title: 'QUẢN TRỊ VIÊN PHÂN HIỆU',
    badge: 'QTV Phân Hiệu',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Chỉ quản lý phân hiệu được phân công (các lớp, phân công cờ đỏ, duyệt đề nghị lớp mình).',
  },
  tpt_doi: {
    role: 'tpt_doi',
    title: 'TPT ĐỘI / PHỤ TRÁCH ĐỘI',
    badge: 'Tổng Phụ Trách',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Nhập và quản lý dữ liệu thi đua của phân hiệu được giao, điều phối cờ đỏ, giải quyết khiếu nại.',
  },
  gvcn: {
    role: 'gvcn',
    title: 'GIÁO VIÊN CHỦ NHIỆM',
    badge: 'GVCN Lớp',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    description: 'Chỉ xem lớp mình phụ trách, xem chi tiết điểm cộng/trừ, gửi phản hồi hoặc đề nghị điều chỉnh điểm.',
  },
  red_flag: {
    role: 'red_flag',
    title: 'ĐỘI CỜ ĐỎ',
    badge: 'Cờ Đỏ Trực Nhật',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Chỉ được nhập dữ liệu chấm điểm vi phạm/khen thưởng theo nhiệm vụ và khu vực được phân công.',
  },
  viewer: {
    role: 'viewer',
    title: 'NGƯỜI XEM',
    badge: 'Chỉ Xem',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    description: 'Chỉ được xem bảng xếp hạng công khai và các báo cáo thi đua tổng hợp, không sửa đổi dữ liệu.',
  },
  // Legacy aliases
  admin: {
    role: 'super_admin',
    title: 'SUPER ADMIN',
    badge: 'Toàn quyền',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Toàn quyền tối cao toàn hệ thống',
  },
  inspector: {
    role: 'tpt_doi',
    title: 'TPT ĐỘI / PHỤ TRÁCH ĐỘI',
    badge: 'Tổng Phụ Trách',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Nhập và quản lý dữ liệu thi đua của phân hiệu được giao',
  },
  campus_lead: {
    role: 'campus_admin',
    title: 'QUẢN TRỊ VIÊN PHÂN HIỆU',
    badge: 'QTV Phân Hiệu',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Chỉ quản lý phân hiệu được phân công',
  },
  teacher: {
    role: 'gvcn',
    title: 'GIÁO VIÊN CHỦ NHIỆM',
    badge: 'GVCN Lớp',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    description: 'Chỉ xem lớp mình phụ trách, có thể gửi phản hồi',
  },
  public: {
    role: 'viewer',
    title: 'NGƯỜI XEM',
    badge: 'Chỉ Xem',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-200',
    description: 'Chỉ được xem báo cáo',
  },
};

export function normalizeRole(role: RoleType | string): RoleType {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return 'super_admin';
    case 'bgh':
      return 'bgh';
    case 'campus_lead':
    case 'campus_admin':
      return 'campus_admin';
    case 'inspector':
    case 'tpt_doi':
      return 'tpt_doi';
    case 'teacher':
    case 'gvcn':
      return 'gvcn';
    case 'red_flag':
      return 'red_flag';
    case 'public':
    case 'viewer':
    default:
      return 'viewer';
  }
}

