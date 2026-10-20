import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { YearRankingRow, SemesterMonthScoreItem, MonthWeeklyScoreItem } from '../../types';
import { canLockYear, canUnlockYear } from '../../utils/rbac';
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Unlock,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  FileSpreadsheet,
  Layers,
  School,
  Building,
  UserCheck,
  Check,
  Clock,
  ShieldAlert,
  ArrowRight,
  FileText,
  Calendar,
} from 'lucide-react';

const getTierBadgeClass = (tier: string) => {
  switch (tier) {
    case 'Xuất sắc':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Tốt':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'Khá':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'Trung bình':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    case 'Chưa đủ dữ liệu':
      return 'bg-slate-100 text-slate-600 border-slate-300';
    default:
      return 'bg-rose-100 text-rose-900 border-rose-300';
  }
};

export const YearRankingsHub: React.FC = () => {
  const {
    campuses,
    classes,
    settings,
    currentUser,
    userRole,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    isYearLocked,
    getYearLockInfo,
    lockYear,
    unlockYear,
    getYearRankingData,
    applyYearVerificationSample,
    exportYearRankingsExcel,
    setCurrentTab,
    setSelectedSemester,
    updatePeriodicBonus,
  } = useApp();

  const canEditBonus = userRole === 'super_admin' || userRole === 'bgh' || userRole === 'tpt_doi' || userRole === 'admin';

  // Local state
  const [selectedClassRow, setSelectedClassRow] = useState<YearRankingRow | null>(null);
  const [drillSemester, setDrillSemester] = useState<1 | 2>(1);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [lockNotes, setLockNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Year ranking data
  const rankingData = useMemo(() => {
    return getYearRankingData(selectedCampusId, selectedGrade);
  }, [getYearRankingData, selectedCampusId, selectedGrade]);

  const yearIsLocked = isYearLocked();
  const lockInfo = getYearLockInfo();

  const userCanLock = canLockYear(currentUser);
  const userCanUnlock = canUnlockYear(currentUser);

  // Scope title for reports
  const scopeTitle = useMemo(() => {
    const campusName =
      selectedCampusId === 'all'
        ? 'Toàn trường'
        : campuses.find((c) => c.id === selectedCampusId)?.name || 'Phân hiệu';
    const gradeName = selectedGrade === 'all' ? 'Tất cả các khối' : `Khối ${selectedGrade}`;
    return `${campusName} - ${gradeName}`;
  }, [selectedCampusId, selectedGrade, campuses]);

  // Statistics
  const validScores = rankingData.rows
    .map((r) => r.yearScore)
    .filter((s): s is number => s !== null);

  const stats = useMemo(() => {
    if (validScores.length === 0) {
      return { avg: null, max: null, min: null, count: 0 };
    }
    const sum = validScores.reduce((acc, v) => acc + v, 0);
    return {
      avg: Number((sum / validScores.length).toFixed(2)),
      max: Math.max(...validScores),
      min: Math.min(...validScores),
      count: validScores.length,
    };
  }, [validScores]);

  // Handle Lock Year
  const handleLockYear = () => {
    const res = lockYear(lockNotes);
    setActionMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
    setLockConfirmOpen(false);
    setLockNotes('');
  };

  // Handle Unlock Year
  const handleUnlockYear = () => {
    if (!unlockReason.trim()) {
      setActionMessage({ text: 'Bắt buộc nhập lý do mở khóa xếp hạng cả năm để ghi nhật ký hệ thống!', type: 'error' });
      return;
    }
    const res = unlockYear(unlockReason.trim());
    setActionMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
    if (res.success) {
      setUnlockConfirmOpen(false);
      setUnlockReason('');
    }
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Export PDF Action
  const handleExportPDF = () => {
    window.print();
  };

  // Export Excel Action
  const handleExportExcel = () => {
    exportYearRankingsExcel(scopeTitle);
    setActionMessage({
      text: `Đã xuất thành công Báo cáo Xếp Hạng Cả Năm (${scopeTitle}) ra file Excel!`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* 4-Tier Hierarchy Switcher (Tuần -> Tháng -> Học kỳ -> Cả năm) */}
      <div className="no-print bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setCurrentTab('rankings')}
          className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>1. Xếp Hạng Tuần</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <button
          onClick={() => setCurrentTab('month_rankings')}
          className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span>2. Xếp Hạng Tháng</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <button
          onClick={() => setCurrentTab('semester_rankings')}
          className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <Award className="w-4 h-4 text-purple-500" />
          <span>3. Xếp Hạng Học Kỳ</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <div className="px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 text-white shadow-xs flex items-center gap-2">
          <Medal className="w-4 h-4 text-amber-300" />
          <span>4. Xếp Hạng Cả Năm (2026-2027)</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <button
          onClick={() => setCurrentTab('title_evaluation')}
          className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>5. Xét Danh Hiệu Lớp</span>
        </button>
      </div>

      {/* Header & Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Medal className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                BẢNG XẾP HẠNG CẢ NĂM HỌC
                <span className="text-sm font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {settings.academicYear}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Được tính đúng theo quy chế: Điểm cả năm = (Điểm HKI + Điểm HKII × 2) / 3 • Dữ liệu lấy trực tiếp từ Học kỳ đã chốt
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Chốt cả năm, In, Excel, PDF */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Lock / Unlock Year button */}
          {yearIsLocked ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                <Lock className="w-3.5 h-3.5" />
                CẢ NĂM ĐÃ CHỐT KHÓA
              </span>
              {userCanUnlock && (
                <button
                  onClick={() => setUnlockConfirmOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Chỉ Super Admin mới có quyền mở khóa"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Mở Khóa Cả Năm
                </button>
              )}
            </div>
          ) : (
            userCanLock && (
              <button
                onClick={() => setLockConfirmOpen(true)}
                disabled={!rankingData.hasBothSemestersLocked}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 ${
                  rankingData.hasBothSemestersLocked
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title={
                  rankingData.hasBothSemestersLocked
                    ? 'Chốt khóa toàn bộ kết quả thi đua cả năm học (Ban Giám Hiệu)'
                    : 'Cần chốt khóa cả Học kỳ I và Học kỳ II trước khi chốt Cả Năm'
                }
              >
                <Lock className="w-3.5 h-3.5" />
                Chốt Xếp Hạng Cả Năm
              </button>
            )
          )}

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Xuất Excel (.xls)
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Xuất PDF
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            In Bảng Xếp Hạng
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`no-print p-4 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : actionMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : actionMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Verification & Standard Formula Callout Banner */}
      <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-blue-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs uppercase tracking-wider font-bold text-amber-300">
                Quy Chuẩn Tính Điểm Cả Năm (2026-2027)
              </span>
            </div>
            <div className="text-base sm:text-lg font-black tracking-tight flex flex-wrap items-center gap-2">
              <span>Điểm cả năm = (Điểm HKI + Điểm HKII × 2) / 3</span>
            </div>
            <p className="text-xs text-blue-200/90 leading-relaxed max-w-3xl">
              ✓ <strong>Quy tắc bất biến:</strong> Hệ thống tự động trích xuất điểm Học kỳ I và Học kỳ II từ Module Xếp Hạng Học Kỳ. Không cho phép nhập trực tiếp điểm cả năm. Chỉ tính điểm khi học kỳ đã được Ban Giám Hiệu chốt khóa chính thức. Nếu thiếu HKI hoặc HKII, điểm cả năm hiển thị <em>“Chưa đủ dữ liệu”</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Lock Status Info Banner */}
      {yearIsLocked && lockInfo ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                DỮ LIỆU XẾP HẠNG CẢ NĂM ĐÃ ĐƯỢC CHỐT KHÓA CHÍNH THỨC
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Người chốt: <strong>{lockInfo.lockedBy.name}</strong> ({lockInfo.lockedBy.title || lockInfo.lockedBy.role}) • Thời gian:{' '}
                <strong>{new Date(lockInfo.lockedAt).toLocaleString('vi-VN')}</strong>
                {lockInfo.notes ? ` • Ghi chú: ${lockInfo.notes}` : ''}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 bg-white border border-rose-300 text-rose-800 rounded-full shadow-2xs self-start sm:self-auto">
            Chỉ Quản trị viên mới được mở khóa
          </span>
        </div>
      ) : (
        /* Semester Readiness Check Banner (Requirement 7 & 8) */
        !rankingData.hasBothSemestersLocked && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold">
                  CHƯA ĐỦ ĐIỀU KIỆN CHỐT CẢ NĂM: HỌC KỲ CHƯA ĐƯỢC CHỐT ĐẦY ĐỦ
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {!rankingData.isSemester1Locked && !rankingData.isSemester2Locked ? (
                    <span>Cả <strong>Học kỳ I</strong> và <strong>Học kỳ II</strong> đều chưa được chốt khóa. Điểm cả năm của tất cả các lớp sẽ hiển thị <strong>“Chưa đủ dữ liệu”</strong>.</span>
                  ) : !rankingData.isSemester1Locked ? (
                    <span><strong>Học kỳ I</strong> chưa được chốt khóa. Vui lòng chuyển sang module Xếp Hạng Học Kỳ để hoàn thành chốt Học kỳ I.</span>
                  ) : (
                    <span><strong>Học kỳ II</strong> chưa được chốt khóa. Vui lòng chuyển sang module Xếp Hạng Học Kỳ để hoàn thành chốt Học kỳ II.</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto no-print">
              {!rankingData.isSemester1Locked && (
                <button
                  onClick={() => {
                    setSelectedSemester(1);
                    setCurrentTab('semester_rankings');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Đến Học kỳ I <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {!rankingData.isSemester2Locked && (
                <button
                  onClick={() => {
                    setSelectedSemester(2);
                    setCurrentTab('semester_rankings');
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Đến Học kỳ II <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* Filter Bar: Requirement 5 (Toàn trường, Từng phân hiệu, Từng khối, Trường chính, Tất cả 6 phân hiệu) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Phạm vi xem:</span>
          </div>

          {/* Campus Selector */}
          <div className="flex items-center gap-1.5">
            <School className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="all">Toàn trường (Tất cả 6 cơ sở)</option>
              <option value="campus_main">Trường chính (Khu trung tâm)</option>
              {campuses
                .filter((c) => c.type !== 'main')
                .map((cmp) => (
                  <option key={cmp.id} value={cmp.id}>
                    {cmp.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Grade Selector */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={selectedGrade}
              onChange={(e) =>
                setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="all">Tất cả các khối (Khối 6, 7, 8, 9)</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>
        </div>

        {/* Quick Scope Description */}
        <div className="text-xs font-medium text-slate-500">
          Đang hiển thị:{' '}
          <strong className="text-slate-800 font-bold">{scopeTitle}</strong> • Tổng số{' '}
          <strong className="text-blue-600 font-bold">{rankingData.rows.length}</strong> lớp
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Số lớp có dữ liệu */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lớp Đã Xếp Hạng
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {stats.count} / {rankingData.rows.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {stats.count === rankingData.rows.length
              ? 'Đã đủ điểm cả năm 100%'
              : `${rankingData.rows.length - stats.count} lớp chưa đủ dữ liệu`}
          </p>
        </div>

        {/* KPI 2: Điểm trung bình toàn trường cả năm */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Điểm TB Cả Năm
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Medal className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {stats.avg !== null ? `${stats.avg}đ` : 'Chưa có'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Trung bình trọng số toàn trường
          </p>
        </div>

        {/* KPI 3: Lớp quán quân cả năm */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Quán Quân Cả Năm
            </span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Trophy className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2 truncate">
            {rankingData.rows[0]?.yearScore !== null
              ? `Lớp ${rankingData.rows[0]?.classItem.name}`
              : 'Chưa xác định'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {rankingData.rows[0]?.yearScore !== null
              ? `${rankingData.rows[0]?.yearScore}đ (${rankingData.rows[0]?.campus.name})`
              : 'Chưa đủ dữ liệu 2 kỳ'}
          </p>
        </div>

        {/* KPI 4: Trạng thái 2 học kỳ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Trạng Thái Học Kỳ
            </span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-sm font-black text-slate-900 mt-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${rankingData.isSemester1Locked ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>HKI: {rankingData.isSemester1Locked ? 'Đã chốt 🔒' : 'Chưa chốt'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${rankingData.isSemester2Locked ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>HKII: {rankingData.isSemester2Locked ? 'Đã chốt 🔒' : 'Chưa chốt'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {rankingData.hasBothSemestersLocked ? 'Đủ điều kiện xếp hạng cả năm' : 'Chưa đủ dữ liệu cả năm'}
          </p>
        </div>
      </div>

      {/* Main Ranking Table Card: Requirement 4 (STT | Lớp | Phân hiệu | Điểm HKI | Điểm HKII | Điểm cả năm | Xếp hạng) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Print Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Bảng Tổng Hợp Xếp Loại Thi Đua Cả Năm Học {settings.academicYear}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phạm vi: {scopeTitle} • Công thức: <code>Điểm cả năm = (Điểm HKI + Điểm HKII × 2) / 3</code>
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Đơn vị:</span>
            <span className="font-bold text-slate-900">{settings.schoolName}</span>
          </div>
        </div>

        {/* Printable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4">Phân hiệu</th>
                <th className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center">
                    <span>Điểm HKI</span>
                    <span className="text-[10px] font-normal text-slate-500">(Hệ số 1)</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center">
                    <span>Điểm HKII</span>
                    <span className="text-[10px] font-normal text-slate-500">(Hệ số 2)</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center bg-slate-50 text-slate-700">
                  <div className="flex flex-col items-center">
                    <span>Điểm TB Năm</span>
                    <span className="text-[10px] font-normal text-slate-500">(HKI + HKII×2)/3</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-900 font-bold border-x border-emerald-200">
                  Thưởng Cả năm
                </th>
                <th className="py-3 px-5 text-center bg-blue-50/80 text-blue-950 font-black">
                  Tổng điểm Cả Năm
                </th>
                <th className="py-3 px-4 text-center w-20">Xếp hạng</th>
                <th className="py-3 px-4 text-center">Xếp loại</th>
                <th className="py-3 px-3 text-center no-print w-28">Xem chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {rankingData.rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Không có lớp nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                rankingData.rows.map((row, idx) => {
                  const hasData = row.finalYearScore !== null;
                  const isTop1 = hasData && row.rank === 1;
                  const isTop2 = hasData && row.rank === 2;
                  const isTop3 = hasData && row.rank === 3;

                  return (
                    <tr
                      key={row.classItem.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isTop1
                          ? 'bg-amber-50/40 font-medium'
                          : isTop2
                          ? 'bg-slate-50/40'
                          : isTop3
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center text-xs text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Lớp & GVCN */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.classItem.name}</div>
                        <div className="text-xs text-slate-500">
                          GVCN: {row.classItem.homeroomTeacher} • Khối {row.classItem.grade}
                        </div>
                      </td>

                      {/* Phân hiệu */}
                      <td className="py-3 px-4 text-xs text-slate-700">
                        <div className="font-medium">{row.campus.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {row.campus.type === 'main' ? 'Khu trung tâm' : 'Điểm lẻ'}
                        </div>
                      </td>

                      {/* Điểm HKI */}
                      <td className="py-3 px-4 text-center text-xs">
                        {row.isSemester1Locked && row.semester1Score !== null ? (
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-bold">
                            {row.semester1Score.toFixed(2)}đ
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Chưa chốt HKI
                          </span>
                        )}
                      </td>

                      {/* Điểm HKII */}
                      <td className="py-3 px-4 text-center text-xs">
                        {row.isSemester2Locked && row.semester2Score !== null ? (
                          <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-lg font-bold">
                            {row.semester2Score.toFixed(2)}đ
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Chưa chốt HKII
                          </span>
                        )}
                      </td>

                      {/* Điểm TB Năm */}
                      <td className="py-3 px-3 text-center bg-slate-50/50">
                        {row.yearScore !== null ? (
                          <span className="text-xs font-bold text-slate-800">
                            {row.yearScore.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa đủ</span>
                        )}
                      </td>

                      {/* Điểm thưởng phong trào cả năm (Inline editing cho Role 1, 2, 3) */}
                      <td className="py-2 px-3 text-center bg-emerald-50/30 border-x border-emerald-100">
                        {canEditBonus ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-emerald-700 font-bold text-xs">+</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={row.bonus_points_yearly || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updatePeriodicBonus('yearly', row.classItem.id, val);
                              }}
                              className="w-14 px-1.5 py-1 text-center font-bold text-xs text-emerald-800 bg-white border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              title="Role 1, 2, 3: Nhập trực tiếp điểm thưởng phong trào cả năm"
                            />
                            <span className="text-[10px] text-emerald-600">đ</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                            +{row.bonus_points_yearly || 0}đ
                          </span>
                        )}
                      </td>

                      {/* Tổng Điểm Cả Năm */}
                      <td className="py-3 px-5 text-center bg-blue-50/70">
                        {hasData ? (
                          <div className="flex flex-col items-center">
                            <span className="text-base font-black text-blue-700 tracking-tight">
                              {row.finalYearScore?.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-blue-600 font-medium">
                              Tổng kết cả năm
                            </span>
                          </div>
                        ) : (
                          <span className="inline-block px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                            Chưa đủ dữ liệu
                          </span>
                        )}
                      </td>

                      {/* Xếp hạng: Requirement 4 */}
                      <td className="py-3 px-4 text-center">
                        {hasData ? (
                          isTop1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-xs" title="Hạng 1 Cả Năm">
                              🥇 1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-bold text-xs shadow-xs" title="Hạng 2 Cả Năm">
                              🥈 2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-xs shadow-xs" title="Hạng 3 Cả Năm">
                              🥉 3
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-700">
                              #{row.rank}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Xếp loại */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getTierBadgeClass(
                            row.performanceTier
                          )}`}
                        >
                          {row.performanceTier}
                        </span>
                      </td>

                      {/* Drill-down detail action */}
                      <td className="py-3 px-3 text-center no-print">
                        <button
                          onClick={() => {
                            setSelectedClassRow(row);
                            setDrillSemester(1);
                            setExpandedMonth(null);
                            setExpandedWeek(null);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Print Signatures Block (Only during print) */}
        <div className="hidden print:grid print:grid-cols-3 gap-6 pt-12 pb-8 px-6 text-center text-xs">
          <div>
            <p className="font-bold uppercase">TỔNG PHỤ TRÁCH ĐỘI</p>
            <p className="italic text-slate-400 mt-1">(Ký, ghi rõ họ tên)</p>
            <div className="h-16"></div>
          </div>
          <div>
            <p className="font-bold uppercase">HỘI ĐỒNG THI ĐUA KHEN THƯỞNG</p>
            <p className="italic text-slate-400 mt-1">(Ký, ghi rõ họ tên)</p>
            <div className="h-16"></div>
          </div>
          <div>
            <p className="font-bold uppercase">HIỆU TRƯỞNG / BAN GIÁM HIỆU</p>
            <p className="italic text-slate-400 mt-1">(Ký tên và đóng dấu)</p>
            <div className="h-16"></div>
          </div>
        </div>
      </div>

      {/* Drill-down Detail Modal: Requirement 6 */}
      {/* Khi chọn một lớp, hiển thị toàn bộ quá trình tính điểm: Cả năm -> HKI, HKII -> các tháng -> các tuần -> các khoản cộng/trừ */}
      {selectedClassRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <Medal className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Toàn bộ quá trình tính điểm Lớp {selectedClassRow.classItem.name} — Cả Năm Học {settings.academicYear}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân hiệu: {selectedClassRow.campus.name} • GVCN: {selectedClassRow.classItem.homeroomTeacher} • Xếp hạng cả năm:{' '}
                    {selectedClassRow.yearScore !== null ? `#${selectedClassRow.rank}` : 'Chưa xếp hạng'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassRow(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 5-Tier Drill-down */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Level 1: CẢ NĂM */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Medal className="w-4 h-4 text-blue-600" />
                      Cấp 1: Tổng Kết Cả Năm Học (Công Thức Chuẩn)
                    </span>
                    <h4 className="text-2xl font-black text-slate-900 mt-1">
                      {selectedClassRow.yearScore !== null
                        ? `Điểm Cả Năm: ${selectedClassRow.yearScore.toFixed(2)} điểm`
                        : 'Điểm Cả Năm: Chưa Đủ Dữ Liệu'}
                    </h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      Công thức: <code>Điểm cả năm = (Điểm HKI + Điểm HKII × 2) / 3</code>
                      {selectedClassRow.yearScore !== null && (
                        <span>
                          {' '}= ({selectedClassRow.semester1Score?.toFixed(2)} + {selectedClassRow.semester2Score?.toFixed(2)} × 2) / 3
                          {' '}= ({selectedClassRow.semester1Score?.toFixed(2)} + {((selectedClassRow.semester2Score || 0) * 2).toFixed(2)}) / 3
                          {' '}= <strong>{selectedClassRow.yearScore?.toFixed(2)} điểm</strong>
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${getTierBadgeClass(
                        selectedClassRow.performanceTier
                      )}`}
                    >
                      Xếp loại: {selectedClassRow.performanceTier}
                    </span>
                    {selectedClassRow.yearScore !== null && (
                      <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
                        Hạng {selectedClassRow.rank}/{rankingData.rows.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Level 2: HỌC KỲ I & HỌC KỲ II */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  Cấp 2: Chi tiết 2 Học Kỳ (Chọn Học kỳ để xem các tháng)
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Semester 1 Tab Card */}
                  <button
                    onClick={() => {
                      setDrillSemester(1);
                      setExpandedMonth(null);
                      setExpandedWeek(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      drillSemester === 1
                        ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 uppercase">HỌC KỲ I (Hệ số 1)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedClassRow.isSemester1Locked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {selectedClassRow.isSemester1Locked ? 'Đã chốt 🔒' : 'Chưa chốt'}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1.5">
                      {selectedClassRow.semester1Score !== null
                        ? `${selectedClassRow.semester1Score.toFixed(2)}đ`
                        : 'Chưa đủ dữ liệu'}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedClassRow.semester1Row
                        ? `TB cộng ${selectedClassRow.semester1Row.lockedMonthsCount} tháng (Tháng 9, 10, 11, 12)`
                        : 'Chưa có dữ liệu'}
                    </p>
                  </button>

                  {/* Semester 2 Tab Card */}
                  <button
                    onClick={() => {
                      setDrillSemester(2);
                      setExpandedMonth(null);
                      setExpandedWeek(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      drillSemester === 2
                        ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-700 uppercase">HỌC KỲ II (Hệ số 2)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedClassRow.isSemester2Locked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {selectedClassRow.isSemester2Locked ? 'Đã chốt 🔒' : 'Chưa chốt'}
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1.5">
                      {selectedClassRow.semester2Score !== null
                        ? `${selectedClassRow.semester2Score.toFixed(2)}đ`
                        : 'Chưa đủ dữ liệu'}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedClassRow.semester2Row
                        ? `TB cộng ${selectedClassRow.semester2Row.lockedMonthsCount} tháng (Tháng 1, 2, 3, 4, 5)`
                        : 'Chưa có dữ liệu'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Level 3: CÁC THÁNG trong học kỳ đã chọn */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  Cấp 3: Các Tháng trong Học kỳ {drillSemester === 1 ? 'I' : 'II'} (Bấm từng tháng để mở rộng tuần)
                </h5>

                {(() => {
                  const semRow = drillSemester === 1 ? selectedClassRow.semester1Row : selectedClassRow.semester2Row;
                  if (!semRow || semRow.monthScores.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                        Chưa có dữ liệu tháng nào trong Học kỳ {drillSemester === 1 ? 'I' : 'II'}.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {semRow.monthScores.map((mScore: SemesterMonthScoreItem) => {
                        const isExpanded = expandedMonth === mScore.month;

                        return (
                          <div
                            key={mScore.month}
                            className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                          >
                            {/* Month Header / Click to Expand */}
                            <button
                              onClick={() => setExpandedMonth(isExpanded ? null : mScore.month)}
                              className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <div>
                                  <span className="font-bold text-slate-900 text-sm">
                                    Tháng {mScore.month}
                                  </span>
                                  <span
                                    className={`ml-2.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                                      mScore.isLocked
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {mScore.isLocked ? 'Đã chốt tháng 🔒' : 'Chưa chốt'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-500">
                                  {mScore.lockedWeeksCount}/{mScore.totalWeeks} tuần đã chốt
                                </span>
                                <span className="text-sm font-extrabold text-indigo-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                                  {mScore.averageScore}đ
                                </span>
                              </div>
                            </button>

                            {/* Level 4: CÁC TUẦN trong tháng */}
                            {isExpanded && (
                              <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                                <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  Cấp 4: Chi tiết điểm từng tuần của Tháng {mScore.month} (Bấm xem biên bản vi phạm)
                                </p>

                                {mScore.weekScores.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">
                                    Không có tuần nào trong tháng này.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {mScore.weekScores.map((wScore: MonthWeeklyScoreItem) => {
                                      const isWeekExpanded = expandedWeek === wScore.week;

                                      return (
                                        <div
                                          key={wScore.week}
                                          className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-slate-800">
                                                Tuần {wScore.week}
                                              </span>
                                              {wScore.isLocked ? (
                                                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                                  Đã chốt 🔒
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                                  Chưa chốt
                                                </span>
                                              )}
                                            </div>

                                            <span className="font-bold text-slate-900 bg-white border px-2 py-0.5 rounded shadow-2xs">
                                              {wScore.score}đ
                                            </span>
                                          </div>

                                          <div className="text-[11px] text-slate-500 flex justify-between">
                                            <span>Gốc: 100đ</span>
                                            <span className="text-emerald-600 font-medium">
                                              +{wScore.bonusPoints}đ
                                            </span>
                                            <span className="text-rose-600 font-medium">
                                              -{wScore.penaltyPoints}đ
                                            </span>
                                            <span>{wScore.logsCount} biên bản</span>
                                          </div>

                                          {/* Level 5: CÁC KHOẢN CỘNG/TRỪ */}
                                          {wScore.logs.length > 0 && (
                                            <div className="pt-1.5 border-t border-slate-200">
                                              <button
                                                onClick={() =>
                                                  setExpandedWeek(isWeekExpanded ? null : wScore.week)
                                                }
                                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                                              >
                                                {isWeekExpanded
                                                  ? '▼ Thu gọn biên bản vi phạm'
                                                  : `► Cấp 5: Xem ${wScore.logs.length} khoản cộng/trừ chi tiết`}
                                              </button>

                                              {isWeekExpanded && (
                                                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                                                  {wScore.logs.map((log) => (
                                                    <div
                                                      key={log.id}
                                                      className="p-2 bg-white border border-slate-200 rounded text-[11px] flex justify-between items-start gap-2 shadow-2xs"
                                                    >
                                                      <div>
                                                        <div className="font-bold text-slate-800">
                                                          [{log.criteriaCode || 'TC'}] {log.criteriaName}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                                          {log.calculationDetail || log.note}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                          Ngày: {log.date} • Ghi nhận: {log.recordedBy || 'Cờ đỏ'}
                                                        </p>
                                                      </div>
                                                      <span
                                                        className={`font-black flex-shrink-0 text-xs ${
                                                          log.totalPoints > 0
                                                            ? 'text-emerald-600'
                                                            : 'text-rose-600'
                                                        }`}
                                                      >
                                                        {log.totalPoints > 0 ? '+' : ''}
                                                        {log.totalPoints}đ
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedClassRow(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Lock Year (Ban Giám Hiệu / Super Admin) */}
      {lockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <Lock className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Chốt Khóa Xếp Hạng Cả Năm
                </h3>
                <p className="text-xs text-slate-500">
                  Năm học {settings.academicYear} • Thao tác Ban Giám Hiệu
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Lưu ý quan trọng:
              </p>
              <p>
                • Sau khi chốt, dữ liệu thi đua cả năm học sẽ được đóng băng chính thức.
              </p>
              <p>
                • Người chốt ({currentUser.name} - {currentUser.title || userRole}) và thời gian chốt sẽ được lưu vết vĩnh viễn trong Nhật ký giám sát (Audit Log).
              </p>
              <p>
                • <strong>Chỉ Quản trị viên hệ thống (Super Admin)</strong> mới có quyền mở khóa bảng dữ liệu này.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú phê duyệt / Quyết định chốt cả năm:
              </label>
              <textarea
                value={lockNotes}
                onChange={(e) => setLockNotes(e.target.value)}
                placeholder="Nhập quyết định hoặc ghi chú chốt số liệu thi đua cả năm học..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setLockConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleLockYear}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Xác Nhận Chốt Cả Năm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Unlock Year (Super Admin only) */}
      {unlockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Unlock className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Mở Khóa Xếp Hạng Cả Năm
                </h3>
                <p className="text-xs text-slate-500">
                  Chỉ Quản trị viên hệ thống (Super Admin)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn mở khóa Bảng Xếp Hạng Cả Năm Học {settings.academicYear}?
              Hành động này sẽ ghi lại nhật ký giám sát hệ thống với danh tính của bạn ({currentUser.name}).
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                Lý do mở khóa <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Nhập lý do mở khóa chính thức (Bắt buộc)..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUnlockConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUnlockYear}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                Xác Nhận Mở Khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
