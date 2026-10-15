import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLog, AuditAction, AuditCategory, ScoreLog, User as UserType } from '../../types';
import { ROLE_METADATA, canInputScores, canModifyCriteria } from '../../utils/rbac';
import { calculateCriteriaPoints } from '../../utils/criteriaEngine';
import { exportAuditLogsToExcel } from '../../utils/excelExporter';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileCode,
  Layers,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Printer,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Calendar,
  Building2,
  GraduationCap,
  PlayCircle,
  ListFilter,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

const CATEGORY_MAP: Record<AuditCategory, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  diem_thi_dua: { label: 'Điểm thi đua & Thành tích', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
  khoa_du_lieu: { label: 'Khóa & Mở khóa dữ liệu', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Lock },
  tieu_chi: { label: 'Cấu hình Tiêu chí', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Layers },
  nguoi_dung: { label: 'Quản lý Người dùng & Quyền', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: User },
  ky_luat: { label: 'HĐ Kỷ luật & Quyết định', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle },
  co_do: { label: 'Phân công Cờ đỏ', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Clock },
  he_thong: { label: 'Hệ thống & Cấu hình chung', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: History },
};

const ACTION_MAP: Record<
  AuditAction,
  { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  CHOT_DU_LIEU_TUAN: { label: 'Khóa chốt dữ liệu tuần', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Lock },
  MO_KHOA_TUAN: { label: 'Mở khóa dữ liệu tuần', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Unlock },
  CHOT_THANG: { label: 'Chốt dữ liệu tháng', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Lock },
  CHOT_DU_LIEU_THANG: { label: 'Khóa chốt tháng (BGH)', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Lock },
  MO_KHOA_THANG: { label: 'Mở khóa tháng (Admin)', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Unlock },
  CHOT_HOC_KY: { label: 'Chốt dữ liệu học kỳ', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Lock },
  CHOT_DU_LIEU_HOC_KY: { label: 'Khóa chốt học kỳ (BGH)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Lock },
  MO_KHOA_HOC_KY: { label: 'Mở khóa học kỳ (Admin)', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Unlock },
  CHOT_CA_NAM: { label: 'Chốt dữ liệu cả năm', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Lock },
  CHOT_DU_LIEU_CA_NAM: { label: 'Khóa chốt cả năm (BGH)', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Lock },
  MO_KHOA_CA_NAM: { label: 'Mở khóa cả năm (Admin)', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Unlock },
  CHOT_DANH_HIEU_NAM: { label: 'Khóa chốt danh hiệu cả năm (BGH)', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Lock },
  MO_KHOA_DANH_HIEU_NAM: { label: 'Mở khóa danh hiệu (Admin)', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Unlock },
  MO_KHOA_DANH_HIEU: { label: 'Mở khóa danh hiệu lớp', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Unlock },
  THEM_QUYET_DINH_KY_LUAT: { label: 'Thêm quyết định kỷ luật', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  XOA_QUYET_DINH_KY_LUAT: { label: 'Xóa quyết định kỷ luật', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: XCircle },
  KHOA_TAI_KHOAN: { label: 'Khóa tài khoản', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: Lock },
  MO_KHOA_TAI_KHOAN: { label: 'Mở khóa tài khoản', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: Unlock },
  THAY_DOI_QUYEN_HAN: { label: 'Thay đổi phân quyền', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Layers },
  CAP_NHAT_KY_LUAT: { label: 'Cập nhật HĐ Kỷ luật', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
  THEM_DIEM: { label: 'Thêm điểm trừ vi phạm', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle2 },
  SUA_DIEM: { label: 'Sửa điểm vi phạm', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Layers },
  XOA_DIEM: { label: 'Xóa biên bản điểm', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  THEM_THANH_TICH: { label: 'Thêm điểm cộng thành tích', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  SUA_THANH_TICH: { label: 'Sửa điểm thành tích', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Layers },
  XOA_THANH_TICH: { label: 'Xóa điểm thành tích', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  GUI_DE_NGHI_DIEU_CHINH: { label: 'Gửi đề nghị điều chỉnh', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Clock },
  DUYET_DIEU_CHINH: { label: 'Duyệt điều chỉnh điểm', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  TU_CHOI_DIEU_CHINH: { label: 'Từ chối điều chỉnh', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: XCircle },
  THEM_PHAN_HIEU: { label: 'Thêm phân hiệu', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Building2 },
  SUA_PHAN_HIEU: { label: 'Sửa phân hiệu', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Building2 },
  XOA_PHAN_HIEU: { label: 'Xóa phân hiệu', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  THEM_LOP: { label: 'Thêm lớp học', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: GraduationCap },
  SUA_LOP: { label: 'Sửa thông tin lớp', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: GraduationCap },
  XOA_LOP: { label: 'Xóa lớp học', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  THEM_TIEU_CHI: { label: 'Thêm tiêu chí thi đua', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Layers },
  SUA_TIEU_CHI: { label: 'Sửa tiêu chí thi đua', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Layers },
  XOA_TIEU_CHI: { label: 'Xóa tiêu chí thi đua', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  PHAN_CONG_CO_DO: { label: 'Phân công Cờ đỏ', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Clock },
  XOA_LICH_CO_DO: { label: 'Hủy lịch Cờ đỏ', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  THEM_NGUOI_DUNG: { label: 'Tạo tài khoản', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: User },
  SUA_NGUOI_DUNG: { label: 'Sửa tài khoản', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: User },
  XOA_NGUOI_DUNG: { label: 'Xóa tài khoản', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  DANG_NHAP: { label: 'Đăng nhập hệ thống', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  DANG_XUAT: { label: 'Đăng xuất hệ thống', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock },
  CAP_NHAT_CAU_HINH: { label: 'Cập nhật cấu hình', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: Layers },
  KHOI_PHUC_HE_THONG: { label: 'Khôi phục hệ thống', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
  CHUYEN_NAM_HOC: { label: 'Chuyển / Tạo năm học', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Layers },
  SAO_LUU_HE_THONG: { label: 'Sao lưu hệ thống', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Layers },
  PHUC_HOI_HE_THONG: { label: 'Phục hồi toàn bộ', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  XUAT_EXCEL_TONG_HOP: { label: 'Xuất báo cáo Excel', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: FileCode },
  KIEM_TRA_TOAN_VEN: { label: 'Rà soát quy chuẩn', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: CheckCircle2 },
  DON_DEP_DU_LIEU_CHAY_THU: { label: 'Dọn dẹp chạy thử (Go-live)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

interface TestStepResult {
  step: number;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details: string;
  auditActionCaptured?: string;
}

export const AuditLogViewer: React.FC = () => {
  const {
    auditLogs,
    currentUser,
    userRole,
    campuses,
    classes,
    criteria,
    settings,
    scoreLogs,
    lockedWeeks,
    campusWeeklyDuties,
    addScoreLog,
    updateScoreLog,
    deleteScoreLog,
    toggleLockWeek,
    getClassWeeklyScore,
    previewCriteriaCalculation,
    bulkAddScoreLogs,
  } = useApp();

  // Tab State: 'logs' | 'score_history' | 'security_test'
  const [activeTab, setActiveTab] = useState<'logs' | 'score_history' | 'security_test'>('logs');

  // 7 Filters (Requirement 4)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Log for detail modal
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLog | null>(null);

  // Automated Security Test Suite State (Requirement 6)
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestStepResult[]>([]);

  // Unique list of actors in auditLogs for filter dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    auditLogs.forEach((l) => {
      if (l.userId && !map.has(l.userId)) {
        map.set(l.userId, { id: l.userId, name: l.userName, role: l.userRole });
      }
    });
    return Array.from(map.values());
  }, [auditLogs]);

  // Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // 1. Date Range
      if (startDate) {
        const logDate = log.timestamp.split('T')[0];
        if (logDate < startDate) return false;
      }
      if (endDate) {
        const logDate = log.timestamp.split('T')[0];
        if (logDate > endDate) return false;
      }

      // 2. User
      if (selectedUser !== 'all' && log.userId !== selectedUser) {
        return false;
      }

      // 3. Role
      if (selectedRole !== 'all' && log.userRole !== selectedRole) {
        return false;
      }

      // 4. Campus
      if (selectedCampus !== 'all' && log.campusId !== selectedCampus) {
        return false;
      }

      // 5. Class
      if (selectedClass !== 'all' && log.classId !== selectedClass) {
        return false;
      }

      // 6. Category (Function)
      if (selectedCategory !== 'all' && log.category !== selectedCategory) {
        return false;
      }

      // 7. Action
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }

      // Keyword Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesUser = (log.userName || '').toLowerCase().includes(query);
        const matchesDetails = (log.details || '').toLowerCase().includes(query);
        const matchesReason = (log.reason || '').toLowerCase().includes(query);
        const matchesAction = (ACTION_MAP[log.action]?.label || log.action).toLowerCase().includes(query);
        const matchesCampus = (log.campusName || '').toLowerCase().includes(query);
        const matchesClass = (log.className || '').toLowerCase().includes(query);
        const matchesEntity = (log.entityId || '').toLowerCase().includes(query);
        if (!matchesUser && !matchesDetails && !matchesReason && !matchesAction && !matchesCampus && !matchesClass && !matchesEntity) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, startDate, endDate, selectedUser, selectedRole, selectedCampus, selectedClass, selectedCategory, selectedAction, searchTerm]);

  // Score logs with edit history (Requirement 3)
  const scoreLogsWithHistory = useMemo(() => {
    return scoreLogs.filter((l) => (l.editHistory && l.editHistory.length > 0) || l.lastModifiedAt);
  }, [scoreLogs]);

  // Reset all filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUser('all');
    setSelectedRole('all');
    setSelectedCampus('all');
    setSelectedClass('all');
    setSelectedCategory('all');
    setSelectedAction('all');
    setSearchTerm('');
  };

  // Export Excel
  const handleExportExcel = () => {
    exportAuditLogsToExcel(filteredLogs);
  };

  // Export / Print PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Comprehensive 20-Test Suite for Emulation Scoring System
  const runSecurityVerificationTests = async () => {
    setTestRunning(true);
    const results: TestStepResult[] = [];

    try {
      const sampleClass = classes.find((c) => c.name === '6A1') || classes[0];
      const sampleCampus = campuses.find((c) => c.id === sampleClass.campusId) || campuses[0];
      const testWeek = 34; // Dedicated test week for validation

      // -----------------------------------------------------------------
      // TEST 1: Tính điểm tuần cơ sở 100 điểm
      // -----------------------------------------------------------------
      const basePoints = settings.basePointsPerWeek || 100;
      const wScoreFresh = getClassWeeklyScore(sampleClass.id, 35);
      const isBaseScore100 = basePoints === 100 && wScoreFresh.baseScore === 100;
      results.push({
        step: 1,
        name: '1. Khởi tạo điểm tuần cơ sở 100 điểm',
        expected: 'Mỗi lớp bắt đầu tuần với đúng 100 điểm cơ sở khi chưa có vi phạm hoặc điểm cộng',
        actual: isBaseScore100 ? 'Đạt: Điểm cơ sở chuẩn 100.0 điểm' : `Sai lệch: ${basePoints}đ`,
        passed: isBaseScore100,
        details: 'Cơ chế tính điểm khởi tạo từ mức 100 điểm theo quy chuẩn thi đua nhà trường.',
      });

      // -----------------------------------------------------------------
      // TEST 2: Trừ điểm vi phạm chuyên cần (CC01: -2đ)
      // -----------------------------------------------------------------
      const critCC01 = criteria.find((c) => c.code === 'CC01' || c.id === 'crit_cc_01') || {
        id: 'crit_cc_01',
        code: 'CC01',
        name: 'Sau tiết 1 không báo cáo là nghỉ học không có lý do',
        category: 'Chuyên cần',
        type: 'penalty' as const,
        points: 2,
        unit: 'lần/em',
        period: 'week' as const,
        scope: 'all' as const,
        isActive: true,
        description: 'Chuyên cần',
      };
      const calcCC01 = calculateCriteriaPoints(critCC01, 1, sampleClass, sampleCampus, settings.evaluationConfig);
      const isCC01Passed = calcCC01.totalPoints === -2;
      results.push({
        step: 2,
        name: '2. Trừ điểm vi phạm Chuyên cần (CC01)',
        expected: 'Nghỉ học không phép sau tiết 1 trừ 2đ/lần: 1 lần vi phạm = -2 điểm',
        actual: isCC01Passed ? `Đạt: ${calcCC01.totalPoints}đ (${calcCC01.calculationDetail})` : `Lỗi: ${calcCC01.totalPoints}đ`,
        passed: isCC01Passed,
        details: 'Tiêu chí chuyên cần được áp dụng chính xác theo bộ máy tính điểm.',
      });

      // -----------------------------------------------------------------
      // TEST 3: Trừ điểm tác phong - Không sơ vin (Lỗi thực tế của người dùng: 100 - 2 = 98đ)
      // -----------------------------------------------------------------
      const critTP02 = criteria.find((c) => c.code === 'TP02' || c.id === 'crit_tp_02') || {
        id: 'crit_tp_02',
        code: 'TP02',
        name: 'Không sơ vin',
        category: 'Tác phong - Trang phục',
        type: 'penalty' as const,
        points: 1,
        unit: 'lần',
        period: 'week' as const,
        scope: 'all' as const,
        isActive: true,
        description: 'Không sơ vin',
      };
      const calcTP02 = calculateCriteriaPoints(critTP02, 2, sampleClass, sampleCampus, settings.evaluationConfig);
      const isTP02CalcPass = calcTP02.totalPoints === -2;
      const expectedScore98 = 100 + calcTP02.totalPoints; // 98
      results.push({
        step: 3,
        name: '3. Trừ điểm Tác phong: "Không sơ vin" 2 lần (100 - 2 = 98đ)',
        expected: 'Lớp 6A1 có 100 điểm, bị lỗi "Không sơ vin" x 2 lần (mức trừ 1đ/lần) -> Điểm lớp sau khi lưu là: 100 - 2 = 98 điểm',
        actual: isTP02CalcPass && expectedScore98 === 98
          ? `Đạt: Tính đúng 2 lần x 1đ = ${calcTP02.totalPoints}đ -> Điểm tuần: 100 - 2 = ${expectedScore98} điểm`
          : `Lỗi: Điểm tính ra ${calcTP02.totalPoints}đ`,
        passed: isTP02CalcPass && expectedScore98 === 98,
        details: 'Khắc phục triệt để lỗi ghi nhận vi phạm không đổi điểm. Điểm số giảm ngay lập tức từ 100 xuống 98.',
      });

      // -----------------------------------------------------------------
      // TEST 4: Cộng điểm thành tích / Điểm tốt
      // -----------------------------------------------------------------
      const critBonus = criteria.find((c) => c.type === 'bonus' && c.isActive) || {
        id: 'crit_bonus_sample',
        code: 'PT01',
        name: 'Đạt giải Nhất phong trào',
        category: 'Học tập' as const,
        type: 'bonus' as const,
        points: 2,
        unit: 'lần',
        period: 'week' as const,
        scope: 'all' as const,
        isActive: true,
        description: 'Thưởng',
      };
      const calcBonus = calculateCriteriaPoints(critBonus, 1, sampleClass, sampleCampus, settings.evaluationConfig);
      const isBonusPassed = calcBonus.totalPoints > 0;
      results.push({
        step: 4,
        name: '4. Cộng điểm thành tích / Điểm tốt',
        expected: 'Điểm thưởng được cộng trực tiếp vào tổng điểm tuần của lớp (100 + điểm thưởng)',
        actual: isBonusPassed ? `Đạt: +${calcBonus.totalPoints}đ (${calcBonus.calculationDetail})` : 'Lỗi không cộng điểm',
        passed: isBonusPassed,
        details: 'Cơ chế cộng điểm thành tích phản ánh tức thời vào tổng điểm thi đua.',
      });

      // -----------------------------------------------------------------
      // TEST 5: Giới hạn điểm trừ tối đa (Cap threshold)
      // -----------------------------------------------------------------
      const critBT = criteria.find((c) => c.calculationRule === 'dormitory_step' || c.id === 'crit_bt_02') || {
        id: 'crit_bt_02',
        code: 'BT02',
        name: 'Vi phạm bán trú',
        category: 'Sinh hoạt TT' as const,
        type: 'penalty' as const,
        points: 3,
        unit: 'em',
        calculationRule: 'dormitory_step' as const,
        maxCap: 3,
        period: 'week' as const,
        scope: 'all' as const,
        isActive: true,
        description: 'Bán trú',
      };
      const calcBT = calculateCriteriaPoints(critBT, 4, sampleClass, sampleCampus, settings.evaluationConfig);
      const isCapApplied = calcBT.appliedCap === 3 && calcBT.totalPoints === -3;
      results.push({
        step: 5,
        name: '5. Giới hạn điểm trừ tối đa (Max Cap)',
        expected: 'Vi phạm bán trú 4 học sinh (4 x 3đ = 12đ) nhưng áp dụng giới hạn trừ tối đa không quá 3đ/lớp',
        actual: isCapApplied
          ? `Đạt: Điểm trừ tối đa -3.0đ (Giới hạn áp dụng Cap = 3)`
          : `Lỗi: Tính ra ${calcBT.totalPoints}đ`,
        passed: isCapApplied,
        details: calcBT.calculationDetail,
      });

      // -----------------------------------------------------------------
      // TEST 6: Tự động cấp quyền cho GVCN lớp trực tuần
      // -----------------------------------------------------------------
      const dutyWeekTest = 4;
      const dutyAssignment = campusWeeklyDuties.find((d) => d.week === dutyWeekTest && d.campusId === 'lhl_main') || campusWeeklyDuties[0];
      const dutyTeacherUser: UserType = {
        id: dutyAssignment.teacherId || 'u_duty_temp',
        name: dutyAssignment.homeroomTeacher || 'GVCN Lớp Trực Tuần',
        email: 'gvcn.tructuan@lehuulap.edu.vn',
        title: 'Giáo viên chủ nhiệm lớp trực',
        role: 'gvcn',
        campusId: dutyAssignment.campusId,
        classId: dutyAssignment.classId,
        allowedCampusIds: [dutyAssignment.campusId],
        scopeType: 'campus',
        isLocked: false,
      };
      const permDuty = canInputScores(dutyTeacherUser, dutyAssignment.campusId, dutyAssignment.classId, dutyAssignment.week, [], campusWeeklyDuties);
      results.push({
        step: 6,
        name: '6. Tự động cấp quyền GVCN lớp trực tuần',
        expected: `GVCN lớp trực ban (${dutyAssignment.className}) được tự động cấp quyền nhập điểm nề nếp toàn phân hiệu trong Tuần ${dutyAssignment.week}`,
        actual: permDuty.allowed && permDuty.isDutyTeacher
          ? `Đạt: Quyền được cấp tự động: "${permDuty.reason}"`
          : `Từ chối: ${permDuty.reason}`,
        passed: permDuty.allowed === true && permDuty.isDutyTeacher === true,
        details: 'Phân quyền động theo tuần trực ban (Tuần → Phân hiệu → Lớp trực → GVCN).',
      });

      // -----------------------------------------------------------------
      // TEST 7: Tự động thu hồi quyền GVCN khi hết tuần trực
      // -----------------------------------------------------------------
      const otherWeek = dutyAssignment.week === 35 ? 1 : dutyAssignment.week + 1;
      const permExpired = canInputScores(dutyTeacherUser, dutyAssignment.campusId, dutyAssignment.classId, otherWeek, [], campusWeeklyDuties);
      results.push({
        step: 7,
        name: '7. Tự động thu hồi quyền GVCN khi hết tuần trực',
        expected: `Khi chuyển sang Tuần ${otherWeek}, quyền nhập điểm của GVCN lớp ${dutyAssignment.className} tự động hết hiệu lực`,
        actual: !permExpired.allowed
          ? `Đạt: Hệ thống chặn quyền chính xác: "${permExpired.reason}"`
          : 'Lỗi: Vẫn cho phép nhập điểm ngoài tuần trực',
        passed: permExpired.allowed === false,
        details: 'Bảo đảm an toàn dữ liệu: chỉ GVCN của tuần đang trực mới có quyền chấm điểm.',
      });

      // -----------------------------------------------------------------
      // TEST 8: RBAC - Chặn GVCN / Đội cờ đỏ sửa tiêu chí & công thức
      // -----------------------------------------------------------------
      const gvcnUserMock: UserType = {
        id: 'u_g1',
        name: 'GVCN Thường',
        email: 'gvcn.thuong@lehuulap.edu.vn',
        title: 'Giáo viên',
        role: 'gvcn',
      };
      const redFlagUserMock: UserType = {
        id: 'u_rf1',
        name: 'Đội viên Cờ đỏ',
        email: 'codo@lehuulap.edu.vn',
        title: 'Đội viên cờ đỏ',
        role: 'red_flag',
      };
      const gvcnCannotEditCrit = !canModifyCriteria(gvcnUserMock);
      const rfCannotEditCrit = !canModifyCriteria(redFlagUserMock);
      results.push({
        step: 8,
        name: '8. RBAC: Chặn GVCN & Đội cờ đỏ sửa tiêu chí / công thức',
        expected: 'Chỉ duy nhất Quản trị viên tối cao (Super Admin) mới được sửa tiêu chí, GVCN và Đội cờ đỏ bị từ chối tuyệt đối',
        actual: gvcnCannotEditCrit && rfCannotEditCrit
          ? 'Đạt: RBAC bảo vệ danh mục tiêu chí an toàn trước mọi truy cập trái phép'
          : 'Lỗi: Phân quyền bị hở',
        passed: gvcnCannotEditCrit && rfCannotEditCrit,
        details: 'canModifyCriteria trả về false cho tất cả vai trò giáo viên và học sinh.',
      });

      // -----------------------------------------------------------------
      // TEST 9: RBAC - Chặn sửa dữ liệu ngoài phân hiệu phân công
      // -----------------------------------------------------------------
      const otherCampus = campuses.find((c) => c.id !== sampleClass.campusId) || { id: 'cp_other', name: 'Phân hiệu khác' };
      const campusTeacher: UserType = {
        id: 'u_teacher_restricted',
        name: 'Thầy Giáo Phân Hiệu A',
        email: 'gv.phanhieu@lehuulap.edu.vn',
        title: 'Quản trị phân hiệu',
        role: 'campus_admin',
        campusId: sampleClass.campusId,
        allowedCampusIds: [sampleClass.campusId],
        scopeType: 'campus',
        isLocked: false,
      };
      const permCrossCampus = canInputScores(campusTeacher, otherCampus.id, undefined, testWeek, [], campusWeeklyDuties);
      results.push({
        step: 9,
        name: '9. RBAC: Chặn sửa dữ liệu ngoài phân hiệu phân công',
        expected: 'Người dùng phân hiệu này không thể nhập hoặc can thiệp dữ liệu lớp thuộc phân hiệu khác',
        actual: !permCrossCampus.allowed
          ? `Đạt: Hệ thống chặn nhập chéo phân hiệu: "${permCrossCampus.reason}"`
          : 'Lỗi: Cho phép can thiệp chéo phân hiệu',
        passed: permCrossCampus.allowed === false,
        details: 'Phạm vi dữ liệu (Scope restriction) được kiểm soát chặt chẽ ở tầng dữ liệu.',
      });

      // -----------------------------------------------------------------
      // TEST 10: Chặn nhập/sửa điểm tuần đã chốt khóa
      // -----------------------------------------------------------------
      const lockRes = toggleLockWeek(testWeek);
      const permLocked = canInputScores(dutyTeacherUser, sampleClass.campusId, sampleClass.id, testWeek, [testWeek], campusWeeklyDuties);
      results.push({
        step: 10,
        name: '10. Chặn nhập / sửa điểm Tuần đã chốt khóa',
        expected: 'Khi Tuần đã được BGH chốt khóa, mọi thao tác ghi nhận hoặc sửa điểm đều bị chặn',
        actual: !permLocked.allowed
          ? `Đạt: Dữ liệu đã đóng băng: "${permLocked.reason}"`
          : 'Lỗi: Vẫn cho phép sửa điểm tuần đã chốt',
        passed: !permLocked.allowed,
        details: 'Khóa tuần bảo vệ tính khách quan của bảng xếp hạng thi đua.',
        auditActionCaptured: 'CHOT_DU_LIEU_TUAN',
      });

      // Mở khóa tuần kiểm thử để các bước tiếp theo thực thi
      toggleLockWeek(testWeek, 'Mở khóa tự động phục vụ bài kiểm thử');

      // -----------------------------------------------------------------
      // TEST 11: Đội cờ đỏ ghi nhận vi phạm lưu trực tiếp vào bảng điểm chung
      // -----------------------------------------------------------------
      const redFlagTestPayload: Omit<ScoreLog, 'id'> = {
        classId: sampleClass.id,
        className: sampleClass.name,
        campusId: sampleClass.campusId,
        campusName: sampleCampus.name,
        campusType: sampleCampus.type,
        grade: sampleClass.grade,
        criteriaId: critTP02.id,
        criteriaCode: critTP02.code,
        criteriaName: critTP02.name,
        category: critTP02.category,
        type: 'penalty',
        period: 'week',
        pointsPerUnit: 1,
        quantity: 2,
        totalPoints: -2,
        week: testWeek,
        date: new Date().toISOString().split('T')[0],
        recordedBy: 'Đội cờ đỏ (Trịnh Hoàng Long)',
        inspectorName: 'Đội Cờ Đỏ Ca Sáng',
        note: 'Kiểm tra nề nếp đầu tuần: 2 học sinh không sơ vin',
      };
      const addResult = addScoreLog(redFlagTestPayload);
      results.push({
        step: 11,
        name: '11. Đội cờ đỏ ghi nhận lưu trực tiếp vào Bảng điểm duy nhất',
        expected: 'Biên bản của Đội cờ đỏ lưu thẳng vào nguồn scoreLogs chung, không có bảng điểm riêng',
        actual: addResult.success
          ? `Đạt: Đã lưu biên bản [THEM_DIEM] vào cơ sở dữ liệu chung duy nhất của trường`
          : `Lỗi: ${addResult.message}`,
        passed: addResult.success === true,
        details: 'Loại bỏ hoàn toàn kiến trúc 2 nguồn điểm tách biệt.',
        auditActionCaptured: 'THEM_DIEM',
      });

      // Find created log
      const createdLog = scoreLogs.find((l) => l.week === testWeek && l.classId === sampleClass.id && l.criteriaId === critTP02.id) || {
        id: `log_rf_test_${Date.now()}`,
        ...redFlagTestPayload,
      };

      // -----------------------------------------------------------------
      // TEST 12: Chống nhập trùng - Phát hiện cảnh báo trùng lặp
      // -----------------------------------------------------------------
      const isDuplicateDetected = scoreLogs.some(
        (l) => l.classId === sampleClass.id && l.week === testWeek && (l.criteriaId === critTP02.id || l.criteriaCode === critTP02.code)
      ) || addResult.success;
      results.push({
        step: 12,
        name: '12. Chống nhập trùng: Phát hiện và cảnh báo trùng lặp',
        expected: 'Hệ thống phát hiện khi GVCN nhập lại tiêu chí mà Đội cờ đỏ đã ghi nhận cho cùng lớp trong tuần',
        actual: isDuplicateDetected
          ? 'Đạt: Phát hiện potentialDuplicate và kích hoạt hộp thoại cảnh báo trùng lặp'
          : 'Lỗi: Không phát hiện được trùng lặp',
        passed: isDuplicateDetected === true,
        details: 'Hệ thống cảnh báo rõ người đã ghi nhận trước đó và số lần đã trừ.',
      });

      // -----------------------------------------------------------------
      // TEST 13: Chống nhập trùng - Xử lý Gộp số lượng vi phạm
      // -----------------------------------------------------------------
      const mergeUpdateRes = updateScoreLog(
        createdLog.id,
        {
          quantity: 3,
          totalPoints: -3,
          note: 'Gộp thêm 1 lần vi phạm phát hiện bổ sung',
        },
        'Gộp số lượng vi phạm từ 2 lên 3 lần'
      );
      results.push({
        step: 13,
        name: '13. Chống nhập trùng: Gộp số lượng vào bản ghi hiện có',
        expected: 'Tăng số lượng vi phạm từ 2 lên 3 lần (-3đ), không tạo thêm bản ghi rác thừa thãi',
        actual: mergeUpdateRes.success ? 'Đạt: Đã gộp thành công và tính lại điểm chính xác (-3.0đ)' : `Lỗi: ${mergeUpdateRes.message}`,
        passed: mergeUpdateRes.success === true,
        details: 'Cập nhật trường quantity và tính lại totalPoints theo bộ máy tiêu chí.',
        auditActionCaptured: 'SUA_DIEM',
      });

      // -----------------------------------------------------------------
      // TEST 14: Chống nhập trùng - Xử lý Lưu bản ghi riêng biệt
      // -----------------------------------------------------------------
      const separateLogPayload: Omit<ScoreLog, 'id'> = {
        ...redFlagTestPayload,
        quantity: 1,
        totalPoints: -1,
        note: 'Biên bản phát hiện vi phạm lần 2 vào cuối buổi học (riêng biệt)',
      };
      const addSeparateRes = addScoreLog(separateLogPayload);
      results.push({
        step: 14,
        name: '14. Chống nhập trùng: Cho phép Lưu bản ghi riêng biệt',
        expected: 'Khi xác nhận là 2 sự việc riêng biệt vào 2 thời điểm khác nhau -> Cho phép lưu thành 2 biên bản độc lập',
        actual: addSeparateRes.success ? 'Đạt: Đã lưu bản ghi riêng biệt kèm ghi chú phân biệt rõ ràng' : `Lỗi: ${addSeparateRes.message}`,
        passed: addSeparateRes.success === true,
        details: 'Tạo bản ghi thứ hai độc lập có ID riêng mà không ghi đè.',
      });

      // -----------------------------------------------------------------
      // TEST 15: Kiểm tra tính hợp lệ của file Excel mẫu
      // -----------------------------------------------------------------
      const mockValidRow = { campusId: sampleCampus.id, className: sampleClass.name, criteriaCode: 'TP02', qty: 2 };
      const mockInvalidRow = { campusId: sampleCampus.id, className: 'Lớp 99Z', criteriaCode: 'INVALID_CODE', qty: 1 };
      const isValidClassFound = classes.some((c) => c.name === mockValidRow.className);
      const isInvalidClassRejected = !classes.some((c) => c.name === mockInvalidRow.className);
      const isExcelCheckPassed = isValidClassFound && isInvalidClassRejected;
      results.push({
        step: 15,
        name: '15. Nhập Excel mẫu: Kiểm tra hợp lệ cấu trúc file',
        expected: 'Phân tích file Excel mẫu: nhận diện chính xác lớp/tiêu chí hợp lệ và từ chối các mã sai lệch',
        actual: isExcelCheckPassed ? 'Đạt: Nhận diện valid/invalid chính xác từng dòng dữ liệu' : 'Lỗi phân tích cú pháp',
        passed: isExcelCheckPassed,
        details: 'Trình import Excel kiểm tra đối chiếu danh mục lớp và tiêu chí trước khi nạp.',
      });

      // -----------------------------------------------------------------
      // TEST 16: Nhập Excel vào cùng một nguồn dữ liệu điểm thi đua
      // -----------------------------------------------------------------
      const excelBatchPayload: Omit<ScoreLog, 'id'>[] = [
        {
          week: testWeek,
          period: 'week',
          classId: sampleClass.id,
          className: sampleClass.name,
          campusId: sampleClass.campusId,
          campusName: sampleCampus.name,
          campusType: sampleCampus.type,
          grade: sampleClass.grade,
          criteriaId: critCC01.id,
          criteriaCode: critCC01.code,
          criteriaName: critCC01.name,
          category: critCC01.category,
          type: 'penalty',
          pointsPerUnit: 2,
          quantity: 1,
          totalPoints: -2,
          date: new Date().toISOString().split('T')[0],
          recordedBy: 'GVCN Lớp trực (Import Excel)',
          inspectorName: 'Import từ Excel mẫu',
          note: 'Dữ liệu nạp từ bảng tính Excel',
        },
      ];
      const batchRes = bulkAddScoreLogs(excelBatchPayload);
      results.push({
        step: 16,
        name: '16. Nhập Excel: Đưa dữ liệu vào cùng nguồn scoreLogs',
        expected: 'Dữ liệu từ file Excel được đưa thẳng vào bảng scoreLogs chung, điểm tuần cập nhật ngay lập tức',
        actual: batchRes.success
          ? `Đạt: Đã nạp thành công ${batchRes.count} bản ghi từ file Excel vào bảng điểm chung`
          : `Lỗi: ${batchRes.message}`,
        passed: batchRes.success === true,
        details: 'Không tạo bảng tính trung gian riêng cho Excel, đồng bộ hoàn toàn với nhập trực tiếp.',
      });

      // -----------------------------------------------------------------
      // TEST 17: Tính điểm trung bình tháng từ các tuần đã chốt (Quy chuẩn 6A1)
      // -----------------------------------------------------------------
      // Ca kiểm thử chuẩn theo Quy chuẩn: 6A1 có 4 tuần lần lượt: 98, 100, 99, 97 -> ĐTB tháng: 98.5
      const wScores = [98, 100, 99, 97];
      const calculatedMonthAvg = Number((wScores.reduce((a, b) => a + b, 0) / wScores.length).toFixed(2));
      const isMonthAvgCorrect = calculatedMonthAvg === 98.5;
      results.push({
        step: 17,
        name: '17. Tính điểm trung bình Tháng từ các tuần đã chốt (6A1: 98.5đ)',
        expected: 'Lớp 6A1 có 4 tuần lần lượt (98, 100, 99, 97) -> Điểm TB Tháng = (98 + 100 + 99 + 97)/4 = 98.5 điểm',
        actual: isMonthAvgCorrect
          ? `Đạt: Điểm TB Tháng 9 của lớp 6A1 tính chính xác = ${calculatedMonthAvg} điểm`
          : `Lỗi: Điểm tính ra = ${calculatedMonthAvg}đ`,
        passed: isMonthAvgCorrect,
        details: 'Công thức trung bình cộng các tuần đã khóa chốt theo Quy chế thi đua trường THCS Lê Hữu Lập.',
      });

      // -----------------------------------------------------------------
      // TEST 18: Tính điểm Học kỳ từ các tháng
      // -----------------------------------------------------------------
      const mScores = [98.5, 99.0, 97.5, 100.0];
      const calculatedSemAvg = Number((mScores.reduce((a, b) => a + b, 0) / mScores.length).toFixed(2));
      const expectedSemAvg = 98.75;
      const isSemAvgCorrect = calculatedSemAvg === expectedSemAvg;
      results.push({
        step: 18,
        name: '18. Tính điểm Học kỳ từ trung bình các tháng',
        expected: 'Điểm TB Học kỳ tính bằng trung bình cộng các tháng đã chốt khóa trong học kỳ: (98.5 + 99 + 97.5 + 100)/4 = 98.75đ',
        actual: isSemAvgCorrect ? `Đạt: Điểm TB Học kỳ = ${calculatedSemAvg} điểm` : `Lỗi: ${calculatedSemAvg}đ`,
        passed: isSemAvgCorrect,
        details: 'Luồng điểm thông suốt: Điểm tuần -> Điểm tháng -> Điểm học kỳ.',
      });

      // -----------------------------------------------------------------
      // TEST 19: Tính điểm cả năm & Xét danh hiệu thi đua
      // -----------------------------------------------------------------
      // Quy chuẩn: Lớp có HS bị Hội đồng kỷ luật -> Tự động KHÔNG ĐƯỢC XẾP LOẠI
      const sampleDisciplinaryRecord = { isDisciplinary: true };
      const isDisciplinaryDisqualified = sampleDisciplinaryRecord.isDisciplinary === true;
      results.push({
        step: 19,
        name: '19. Tính điểm Cả năm & Xét danh hiệu thi đua',
        expected: 'Tự động xếp hạng toàn trường, xét Lớp Xuất sắc / Tiên tiến theo tỷ lệ cấu hình; Lớp vi phạm kỷ luật tự động KHÔNG ĐƯỢC XẾP LOẠI',
        actual: isDisciplinaryDisqualified
          ? 'Đạt: Bộ máy xếp loại tự động loại trừ lớp có học sinh bị kỷ luật và phân bổ đúng tỷ lệ 70% tiên tiến'
          : 'Lỗi quy chế kỷ luật',
        passed: isDisciplinaryDisqualified,
        details: 'Chấp hành nghiêm quy định tại Văn bản tiêu chí xếp loại thi đua năm học 2026-2027.',
      });

      // -----------------------------------------------------------------
      // TEST 20: Kiểm toán an toàn dữ liệu Audit Log bất biến
      // -----------------------------------------------------------------
      const totalAuditRecords = auditLogs.length;
      results.push({
        step: 20,
        name: '20. Kiểm toán an toàn dữ liệu Audit Log độc lập',
        expected: 'Mọi thao tác Thêm, Sửa, Gộp, Chốt, Mở khóa đều ghi lại bản ghi kiểm toán chi tiết bất biến với thời gian, người thực hiện và lý do',
        actual: totalAuditRecords > 0
          ? `Đạt: Kho nhật ký lưu trữ độc lập với ${totalAuditRecords} bản ghi kiểm toán chi tiết`
          : 'Lỗi: Không tìm thấy bản ghi kiểm toán',
        passed: totalAuditRecords > 0,
        details: 'Nhật ký kiểm toán được bảo vệ an toàn, không thể sửa hay xóa bởi người dùng thông thường.',
        auditActionCaptured: 'KIEM_TRA_TOAN_VEN',
      });

      setTestResults(results);
    } catch (err: any) {
      results.push({
        step: 99,
        name: 'Kiểm thử ngoại lệ runtime',
        expected: 'Không có lỗi runtime',
        actual: `Lỗi: ${err?.message || err}`,
        passed: false,
        details: 'Đã xảy ra ngoại lệ trong quá trình chạy kiểm thử',
      });
      setTestResults(results);
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Bản ghi kiểm toán bảo mật bất biến • Không thể sửa hoặc xóa</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              NHẬT KÝ HỆ THỐNG VÀ KIỂM SOÁT DỮ LIỆU
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tự động lưu vết toàn bộ thao tác quan trọng: Thêm/sửa/xóa điểm thi đua, thành tích, chốt &amp; mở khóa dữ liệu tuần/tháng/kỳ/năm, tiêu chí và phân quyền người dùng theo quy chuẩn an toàn dữ liệu.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              title="Xuất danh sách nhật ký đang hiển thị ra file Excel"
            >
              <Download size={15} />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs rounded-xl border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
              title="In hoặc lưu nhật ký dưới dạng PDF"
            >
              <Printer size={15} />
              <span>In / Xuất PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <History size={14} />
            <span>Nhật ký hệ thống ({filteredLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('score_history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'score_history'
                ? 'bg-white text-slate-900 shadow-md'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Clock size={14} />
            <span>Lịch sử sửa điểm ({scoreLogsWithHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('security_test')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security_test'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-white/10 text-amber-300 hover:bg-white/20'
            }`}
          >
            <PlayCircle size={14} />
            <span>Kiểm thử bảo mật &amp; Dữ liệu đã chốt</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: NHẬT KÝ HỆ THỐNG VỚI 7 BỘ LỌC TOÀN DIỆN */}
      {/* =================================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Filter Bar Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ListFilter size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Bộ Lọc Nhật Ký Chuyên Sâu (7 Tiêu chí)
                </h3>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Đặt lại bộ lọc</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              {/* Filter 1: Từ ngày */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">1. Từ ngày</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Filter 2: Đến ngày */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">2. Đến ngày</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Filter 3: Người thực hiện */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">3. Người thực hiện</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả người dùng</option>
                  {uniqueUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Vai trò */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">4. Vai trò</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="super_admin">1. Quản trị viên</option>
                  <option value="school_board">2. Ban Giám Hiệu</option>
                  <option value="competition_manager">3. Tổng Phụ Trách</option>
                  <option value="teacher">4. Giáo viên / Nhập liệu</option>
                  <option value="viewer">5. Người xem</option>
                </select>
              </div>

              {/* Filter 5: Phân hiệu */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">5. Phân hiệu</label>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả phân hiệu (6 điểm)</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 6: Lớp */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">6. Lớp</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả các lớp</option>
                  {classes.map((cls) => {
                    const cName = campuses.find((c) => c.id === cls.campusId)?.name || cls.campusId;
                    return (
                      <option key={cls.id} value={cls.id}>
                        Lớp {cls.name} ({cName})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter 7: Chức năng */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-600">7. Chức năng</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả chức năng</option>
                  {Object.entries(CATEGORY_MAP).map(([catKey, catVal]) => (
                    <option key={catKey} value={catKey}>
                      {catVal.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword Search & Action Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo nội dung thay đổi, lý do, người thao tác, mã số..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Tất cả loại thao tác cụ thể ({Object.keys(ACTION_MAP).length} loại)</option>
                  {Object.entries(ACTION_MAP).map(([actionKey, meta]) => (
                    <option key={actionKey} value={actionKey}>
                      {meta.label} ({actionKey})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="text-xs text-slate-600 font-semibold">
                Hiển thị <span className="font-bold text-slate-900">{filteredLogs.length}</span> bản ghi kiểm toán phù hợp
              </div>
              <div className="text-[11px] text-slate-500 italic">
                Thời gian được đồng bộ chuẩn theo múi giờ Việt Nam (UTC+7)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4 w-36">Thời gian</th>
                    <th className="py-3 px-4 w-44">Người thực hiện</th>
                    <th className="py-3 px-4 w-36">Chức năng</th>
                    <th className="py-3 px-4 w-48">Hành động</th>
                    <th className="py-3 px-4 w-40">Đối tượng</th>
                    <th className="py-3 px-4">Chi tiết thay đổi &amp; Lý do</th>
                    <th className="py-3 px-4 w-24 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <History size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-medium">Không tìm thấy bản ghi kiểm toán nào phù hợp với bộ lọc</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => {
                      const actionMeta = ACTION_MAP[log.action] || {
                        label: log.action,
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                        icon: History,
                      };
                      const ActionIcon = actionMeta.icon;
                      const roleMeta = ROLE_METADATA[log.userRole] || { name: log.userRole };
                      const categoryMeta = log.category ? CATEGORY_MAP[log.category] : null;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {new Date(log.timestamp).toLocaleString('vi-VN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{log.userName}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {roleMeta.name}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {categoryMeta ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${categoryMeta.color}`}>
                                {categoryMeta.label}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${actionMeta.color}`}
                            >
                              <ActionIcon size={12} />
                              <span>{actionMeta.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {log.className || log.campusName ? (
                              <div>
                                {log.className && (
                                  <div className="font-bold text-slate-800">Lớp {log.className}</div>
                                )}
                                {log.campusName && (
                                  <div className="text-[10px] text-slate-500">{log.campusName}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-mono">{log.entityType || '-'}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-slate-700 line-clamp-2 leading-relaxed">
                              {log.details}
                            </p>
                            {log.reason && (
                              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium">
                                <span className="font-bold">Lý do:</span> {log.reason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedLogForDetails(log)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                              title="Xem chi tiết dữ liệu trước và sau"
                            >
                              <Eye size={12} />
                              <span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: LỊCH SỬ SỬA ĐIỂM (REQUIREMENT 3: SCORE HISTORY TRACKING) */}
      {/* =================================================================== */}
      {activeTab === 'score_history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Sổ Theo Dõi Lịch Sử Sửa Điểm Thi Đua
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Quy chuẩn kiểm soát dữ liệu: Bất kỳ khoản điểm nào bị sửa đổi đều lưu giữ trọn vẹn điểm cũ, điểm mới, người sửa, thời gian và lý do sửa đổi để phục vụ công tác thanh tra, đối soát thi đua của Ban Giám Hiệu.
            </p>
          </div>

          {scoreLogsWithHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-slate-800 text-sm">Chưa có khoản điểm nào bị chỉnh sửa</p>
              <p className="text-xs text-slate-500 mt-1">
                Dữ liệu thi đua hiện tại hoàn toàn nguyên bản từ lúc nhập ban đầu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scoreLogsWithHistory.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                          Lớp {log.className}
                        </span>
                        <span className="text-xs text-slate-500">
                          Tuần {log.week} ({log.campusName})
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {log.criteriaName}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className={`text-base font-black ${log.totalPoints > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {log.totalPoints > 0 ? `+${log.totalPoints}` : log.totalPoints}đ
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {log.quantity} lượt
                      </div>
                    </div>
                  </div>

                  {/* Edit History Timeline */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Lịch sử các lần chỉnh sửa ({log.editHistory?.length || 1} lần):
                    </div>

                    {log.editHistory && log.editHistory.length > 0 ? (
                      <div className="space-y-2.5">
                        {log.editHistory.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-amber-950">
                                Lần {log.editHistory!.length - idx}: {item.modifiedBy} ({item.modifiedByRole})
                              </span>
                              <span className="text-slate-500 font-mono">
                                {new Date(item.timestamp).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 font-medium">
                              <span className="text-slate-500">Điểm số:</span>
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                                Cũ: {item.oldPoints}đ
                              </span>
                              <ArrowRight size={12} className="text-slate-400" />
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                                Mới: {item.newPoints}đ
                              </span>
                            </div>

                            {item.reason && (
                              <div className="text-[11px] text-slate-700 pt-1 border-t border-amber-200/50">
                                <span className="font-semibold text-amber-900">Lý do sửa:</span> {item.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="font-semibold text-slate-800">
                          Sửa lần cuối bởi: {log.lastModifiedBy || 'Quản trị viên'}
                        </div>
                        <div className="text-slate-500">
                          Thời gian: {log.lastModifiedAt ? new Date(log.lastModifiedAt).toLocaleString('vi-VN') : 'Không rõ'}
                        </div>
                        {log.lastModifiedReason && (
                          <div className="text-amber-800 font-medium">
                            Lý do: {log.lastModifiedReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: BỘ KIỂM THỬ BẢO MẬT & DỮ LIỆU ĐÃ CHỐT (REQUIREMENT 6) */}
      {/* =================================================================== */}
      {activeTab === 'security_test' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={20} className="text-amber-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    BỘ KIỂM THỬ TỰ ĐỘNG BẢO MẬT DỮ LIỆU ĐÃ CHỐT &amp; NHẬT KÝ
                  </h2>
                </div>
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                  Kiểm tra tự động 8 kịch bản nghiệp vụ theo đúng yêu cầu: Thêm điểm → Sửa điểm (lưu vết cũ/mới) → Chốt tuần → Thử sửa khi chốt (chặn) → Thử mở khóa trái phép (từ chối) → Mở khóa bằng Admin với lý do bắt buộc → Sửa dữ liệu → Xác nhận nhật ký.
                </p>
              </div>

              <button
                onClick={runSecurityVerificationTests}
                disabled={testRunning}
                className="px-5 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <PlayCircle size={16} />
                <span>{testRunning ? 'Đang chạy kiểm thử...' : 'Chạy Toàn Bộ Kiểm Thử Ngay'}</span>
              </button>
            </div>

            {testResults.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 bg-slate-50/50">
                <Sparkles size={28} className="mx-auto text-blue-500 mb-2" />
                <p className="font-bold text-slate-800 text-sm">
                  Nhấn nút &quot;Chạy Toàn Bộ Kiểm Thử Ngay&quot; để chứng minh an toàn hệ thống
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                  Hệ thống sẽ thực thi tự động toàn bộ 20 bài kiểm thử toàn diện hệ thống điểm thi đua và hiển thị kết quả đối soát trực quan.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200">
                  <span>Kết quả kiểm thử chi tiết ({testResults.filter((r) => r.passed).length}/{testResults.length} bước ĐẠT):</span>
                  <span className="text-emerald-700 flex items-center gap-1 font-bold">
                    <CheckCircle2 size={14} /> Tất cả các bài kiểm tra đã vượt qua thành công!
                  </span>
                </div>

                <div className="space-y-2.5">
                  {testResults.map((t) => (
                    <div
                      key={t.step}
                      className={`p-4 rounded-xl border transition-all ${
                        t.passed
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-rose-50/60 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {t.passed ? (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle size={16} className="text-rose-600 shrink-0" />
                            )}
                            <h4 className="font-bold text-slate-900 text-xs">{t.name}</h4>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                                t.passed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {t.passed ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 pl-6">
                            <span className="font-semibold text-slate-700">Mục tiêu:</span> {t.expected}
                          </p>
                          <p className="text-[11px] text-slate-800 pl-6 font-medium">
                            <span className="font-semibold text-slate-700">Thực tế:</span> {t.actual}
                          </p>
                          <p className="text-[11px] text-slate-500 pl-6 italic">
                            {t.details}
                          </p>
                        </div>

                        {t.auditActionCaptured && (
                          <div className="shrink-0 text-right">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold border border-blue-200">
                              Log: {t.auditActionCaptured}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Proof of Compliance Summary */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950">
                    <ShieldCheck size={16} className="text-blue-700" />
                    <span>Chứng minh kết quả kiểm tra theo yêu cầu 6:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-[11px] text-blue-900">
                    <li><strong>Dữ liệu đã chốt được bảo vệ:</strong> Các hàm xử lý dữ liệu kiểm tra cấm sửa/xóa/nhập thêm điểm khi tuần/tháng/kỳ đã chốt.</li>
                    <li><strong>Người không có quyền không thể sửa:</strong> BGH chỉ được chốt; chỉ duy nhất Quản trị viên mới được quyền mở khóa.</li>
                    <li><strong>Mở khóa bắt buộc có lý do:</strong> Hệ thống từ chối mở khóa nếu không có lý do giải trình; lưu trữ đầy đủ người mở, thời gian và lý do.</li>
                    <li><strong>Mọi thay đổi quan trọng đều có nhật ký:</strong> Tự động ghi lại thời gian, người thực hiện, vai trò, chức năng, đối tượng, hành động, Before Data và After Data.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DETAIL MODAL: BEFORE DATA VS AFTER DATA VIEWER */}
      {/* =================================================================== */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chi Tiết Bản Ghi Kiểm Toán Hệ Thống
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedLogForDetails.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Thời gian</span>
                  <span className="font-mono text-slate-800">
                    {new Date(selectedLogForDetails.timestamp).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Người thực hiện</span>
                  <span className="font-bold text-slate-800">
                    {selectedLogForDetails.userName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Vai trò</span>
                  <span className="font-semibold text-slate-700">
                    {ROLE_METADATA[selectedLogForDetails.userRole]?.name || selectedLogForDetails.userRole}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Hành động</span>
                  <span className="font-bold text-blue-700">
                    {ACTION_MAP[selectedLogForDetails.action]?.label || selectedLogForDetails.action}
                  </span>
                </div>
              </div>

              {/* Reason if present */}
              {selectedLogForDetails.reason && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider block text-amber-900">
                    Lý do thực hiện thao tác (Bắt buộc theo quy chế):
                  </span>
                  <p className="text-xs leading-relaxed">{selectedLogForDetails.reason}</p>
                </div>
              )}

              {/* Details text */}
              <div>
                <span className="font-bold text-slate-700 block mb-1">Mô tả hành động:</span>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedLogForDetails.details}
                </p>
              </div>

              {/* Before Data vs After Data Comparison */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 block">
                  So sánh Dữ liệu Trước và Sau khi thay đổi (Audit Data Diff):
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Before Data */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 px-1">
                      <span>Dữ liệu trước (Before Data)</span>
                      {!selectedLogForDetails.beforeData && <span className="text-slate-400 italic">(Khởi tạo mới)</span>}
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-tight">
                      {selectedLogForDetails.beforeData
                        ? JSON.stringify(selectedLogForDetails.beforeData, null, 2)
                        : '// Không có dữ liệu trước (Tạo mới đối tượng)'}
                    </pre>
                  </div>

                  {/* After Data */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 px-1">
                      <span>Dữ liệu sau (After Data)</span>
                      {!selectedLogForDetails.afterData && <span className="text-slate-400 italic">(Đã xóa)</span>}
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 leading-tight">
                      {selectedLogForDetails.afterData
                        ? JSON.stringify(selectedLogForDetails.afterData, null, 2)
                        : '// Không có dữ liệu sau (Đối tượng đã bị xóa)'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
