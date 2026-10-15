import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { MonthRankingRow, MonthWeeklyScoreItem } from '../../types';
import { canLockMonth, canUnlockMonth } from '../../utils/rbac';
import { PrintReportModal } from '../common/PrintReportModal';
import {
  Calendar,
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
  X,
  Sparkles,
  FileSpreadsheet,
  Layers,
  School,
  Building,
  UserCheck,
  Check,
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
    default:
      return 'bg-rose-100 text-rose-900 border-rose-300';
  }
};

export const MonthlyRankingsHub: React.FC = () => {
  const {
    campuses,
    settings,
    currentUser,
    userRole,
    selectedMonth,
    setSelectedMonth,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    isMonthLocked,
    getMonthLockInfo,
    lockMonth,
    unlockMonth,
    getMonthRankingData,
    applyVerificationSample,
    exportMonthlyRankingsExcel,
    setCurrentTab,
    setSelectedWeek,
    updatePeriodicBonus,
  } = useApp();

  const canEditBonus = userRole === 'super_admin' || userRole === 'bgh' || userRole === 'tpt_doi' || userRole === 'admin';

  // Local state
  const [selectedClassRow, setSelectedClassRow] = useState<MonthRankingRow | null>(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [lockNotes, setLockNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Month calculation data
  const rankingData = useMemo(() => {
    const data = getMonthRankingData(selectedMonth, selectedCampusId, selectedGrade);
    const isSem1Month = selectedMonth >= 9 && selectedMonth <= 12;
    const filteredRows = data.rows.filter((row) => {
      const isExempt = isSem1Month && (row.classItem.exemptSemester1 || (row.classItem as any).mien_thi_dua_HK1);
      return !isExempt;
    });

    filteredRows.forEach((row, idx) => {
      if (idx > 0 && row.finalMonthlyScore === filteredRows[idx - 1].finalMonthlyScore) {
        row.rank = filteredRows[idx - 1].rank;
      } else {
        row.rank = idx + 1;
      }
    });

    return {
      ...data,
      rows: filteredRows,
    };
  }, [getMonthRankingData, selectedMonth, selectedCampusId, selectedGrade]);

  const monthIsLocked = isMonthLocked(selectedMonth);
  const lockInfo = getMonthLockInfo(selectedMonth);

  const userCanLock = canLockMonth(currentUser);
  const userCanUnlock = canUnlockMonth(currentUser);

  // Scope title for reports
  const scopeTitle = useMemo(() => {
    const campusName =
      selectedCampusId === 'all'
        ? 'Toàn trường'
        : campuses.find((c) => c.id === selectedCampusId)?.name || 'Phân hiệu';
    const gradeName = selectedGrade === 'all' ? 'Tất cả các khối' : `Khối ${selectedGrade}`;
    return `${campusName} - ${gradeName}`;
  }, [selectedCampusId, selectedGrade, campuses]);

  // Handle Lock Month
  const handleExecuteLock = () => {
    const res = lockMonth(selectedMonth, lockNotes);
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      setLockConfirmOpen(false);
      setLockNotes('');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  // Handle Unlock Month
  const handleExecuteUnlock = () => {
    if (!unlockReason.trim()) {
      setActionMessage({ text: 'Bắt buộc nhập lý do mở khóa bảng xếp hạng tháng để ghi nhật ký hệ thống!', type: 'error' });
      return;
    }
    const res = unlockMonth(selectedMonth, unlockReason.trim());
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      setUnlockConfirmOpen(false);
      setUnlockReason('');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  // Handle Load Verification Sample (Requirement 13)
  const handleLoadVerification = () => {
    const res = applyVerificationSample('c_6a1');
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
    }
  };

  // Handle Print / PDF
  const handlePrint = () => {
    window.print();
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    exportMonthlyRankingsExcel(selectedMonth, scopeTitle);
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #monthly-ranking-print-zone, #monthly-ranking-print-zone * {
            visibility: visible;
          }
          #monthly-ranking-print-zone {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
          }
          .no-print, header, aside, nav, footer {
            display: none !important;
          }
        }
      `}</style>

      {/* 3-Tier Ranking Module Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl w-fit no-print">
        <button
          onClick={() => setCurrentTab('rankings')}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Trophy size={13} />
          <span>Xếp Hạng Tuần</span>
        </button>
        <button
          className="px-3.5 py-1.5 bg-white text-indigo-900 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Calendar size={13} className="text-indigo-600" />
          <span>Xếp Hạng Tháng</span>
        </button>
        <button
          onClick={() => setCurrentTab('semester_rankings')}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Award size={13} />
          <span>Xếp Hạng Học Kỳ</span>
        </button>
      </div>

      {/* Header & Title Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 lg:p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Quy chế thi đua 2026-2027
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Năm học: {settings.academicYear}
              </span>
              {monthIsLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <Lock size={12} />
                  ĐÃ CHỐT THÁNG {selectedMonth}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Unlock size={12} />
                  ĐANG ĐÁNH GIÁ (Chưa chốt)
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Trophy className="text-amber-500" size={26} />
              Bảng Xếp Hạng Thi Đua Nề Nếp Tháng {selectedMonth}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Điểm tháng = Trung bình cộng điểm các tuần đã chốt trong tháng. Dữ liệu tính trực tiếp từ Module Xếp Hạng Tuần.
            </p>
          </div>

          {/* Quick Actions (Export Excel, In) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={15} />
              Xuất Excel
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors shadow-sm"
            >
              <Printer size={15} />
              In / Xuất PDF
            </button>

            {/* Lock / Unlock Month Controls */}
            {!monthIsLocked ? (
              <button
                onClick={() => setLockConfirmOpen(true)}
                disabled={!userCanLock}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm ${
                  userCanLock
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                title={userCanLock ? 'Chốt khóa số liệu tháng' : 'Chỉ Ban Giám Hiệu hoặc Super Admin mới được chốt tháng'}
              >
                <Lock size={15} />
                Chốt Tháng {selectedMonth}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {userCanUnlock ? (
                  <button
                    onClick={() => setUnlockConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm"
                  >
                    <Unlock size={15} />
                    Mở Khóa Tháng
                  </button>
                ) : (
                  <span className="text-xs text-rose-600 font-medium bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 inline-flex items-center gap-1">
                    <Lock size={13} />
                    Đã đóng băng số liệu
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action / Notification Message */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : actionMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Lock Info Notification Banner if Locked */}
        {monthIsLocked && lockInfo && (
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Lock size={14} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Dữ liệu Tháng {selectedMonth} đã được CHỐT KHÓA CHÍNH THỨC
                </p>
                <p className="text-slate-600 text-[11px]">
                  Người chốt: <strong className="text-indigo-800">{lockInfo.lockedBy.name}</strong> ({lockInfo.lockedBy.title || lockInfo.lockedBy.role}) • Thời gian:{' '}
                  {new Date(lockInfo.lockedAt).toLocaleString('vi-VN')}
                  {lockInfo.notes && ` • Ghi chú: ${lockInfo.notes}`}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-slate-500 bg-white/80 px-2.5 py-1 rounded-md border border-indigo-200">
              Chỉ Quản trị viên hệ thống có quyền mở khóa
            </span>
          </div>
        )}

        {/* Filter Bar (Yêu cầu 5: Toàn trường, Từng phân hiệu, Khối 6,7,8,9, Tháng, Năm học) */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Lọc Năm Học */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Năm Học
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span>{settings.academicYear}</span>
            </div>
          </div>

          {/* Lọc Tháng */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Chọn Tháng
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => {
                const isLocked = isMonthLocked(m);
                return (
                  <option key={m} value={m}>
                    Tháng {m} {m <= 5 ? '(HK2)' : '(HK1)'} {isLocked ? '🔒 [Đã chốt]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lọc Phân Hiệu (Toàn trường / Từng phân hiệu) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phân Hiệu
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toàn trường (Tất cả)</option>
              {campuses.map((cmp) => (
                <option key={cmp.id} value={cmp.id}>
                  {cmp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Khối (Khối 6, 7, 8, 9) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Khối Lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả các khối (6, 7, 8, 9)</option>
              <option value={6}>Khối 6</option>
              <option value={7}>Khối 7</option>
              <option value={8}>Khối 8</option>
              <option value={9}>Khối 9</option>
            </select>
          </div>

          {/* Trạng thái tuần trong tháng */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tiến độ chốt tuần
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2
                  size={14}
                  className={rankingData.isFullyLocked ? 'text-emerald-500' : 'text-amber-500'}
                />
                <span>
                  {rankingData.lockedWeeks.length}/{rankingData.totalWeeksInMonth} tuần
                </span>
              </span>
              <span className="text-[10px] text-slate-500">
                Tuần: {rankingData.weeksInMonth.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Warning if Month has incomplete locked weeks (Yêu cầu 8) */}
        {!rankingData.isFullyLocked && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" size={17} />
              <div>
                <p className="font-semibold text-amber-900">
                  Thông báo quy chuẩn nề nếp: Tháng {selectedMonth} chưa đủ toàn bộ các tuần được chốt khóa!
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Tháng {selectedMonth} có {rankingData.totalWeeksInMonth} tuần ({rankingData.weeksInMonth.map((w) => `Tuần ${w}`).join(', ')}). Hiện tại đã chốt {rankingData.lockedWeeks.length} tuần, còn <strong>{rankingData.unlockedWeeks.length} tuần chưa chốt ({rankingData.unlockedWeeks.map((w) => `Tuần ${w}`).join(', ')})</strong>.
                  Theo quy định, hệ thống <strong className="underline">chỉ tính trung bình trên các tuần đã được Ban Giám Hiệu chốt chính thức</strong>, tuyệt đối không tự tạo dữ liệu.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (rankingData.unlockedWeeks.length > 0) {
                  setSelectedWeek(rankingData.unlockedWeeks[0]);
                }
                setCurrentTab('rankings');
              }}
              className="shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm text-xs"
            >
              Chốt tuần ngay
            </button>
          </div>
        )}
      </div>

      {/* Main Print / Display Zone (Requirement 4 & 10) */}
      <div id="monthly-ranking-print-zone" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Print Header Visible only in Print Mode */}
        <div className="hidden print:block p-6 text-center border-b border-slate-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {settings.schoolName}
          </p>
          <h2 className="text-xl font-bold uppercase mt-1 text-slate-900">
            BẢNG XẾP HẠNG THI ĐUA NỀ NẾP THÁNG {selectedMonth}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Năm học: {settings.academicYear} | Phạm vi: {scopeTitle}
          </p>
          <p className="text-[10px] text-slate-500 italic mt-0.5">
            (Công thức: Điểm TB tháng = Trung bình cộng các tuần đã chốt trong tháng theo quy chế nhà trường)
          </p>
        </div>

        {/* Table Top Controls & Summary Banner */}
        <div className="p-4 lg:p-5 bg-slate-50/60 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              Tổng số lớp tham gia thi đua: <strong className="text-indigo-600 text-sm">{rankingData.rows.length} lớp</strong>
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <span className="text-xs text-slate-500">
              Phạm vi: <span className="font-medium text-slate-700">{scopeTitle}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={14} className="text-slate-400" />
            <span>Bấm vào một lớp bất kỳ để xem chi tiết từng khoản cộng/trừ các tuần</span>
          </div>
        </div>

        {/* Table View (Requirement 4: STT | Lớp | Phân hiệu | Số tuần | Điểm các tuần | Điểm trung bình tháng | Xếp hạng) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 text-center w-12">STT</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4">Phân hiệu</th>
                <th className="py-3 px-3 text-center">Số tuần tính</th>
                {rankingData.weeksInMonth.map((w) => {
                  const isLocked = rankingData.lockedWeeks.includes(w);
                  return (
                    <th key={w} className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span>Tuần {w}</span>
                        <span
                          className={`text-[9px] font-normal px-1.5 py-0.2 rounded mt-0.5 ${
                            isLocked
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isLocked ? 'Đã chốt' : 'Chưa chốt'}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center bg-slate-50 text-slate-700 font-semibold">
                  Điểm TB Tuần
                </th>
                <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-900 font-bold border-x border-emerald-200">
                  Thưởng phong trào
                </th>
                <th className="py-3 px-4 text-center bg-indigo-50/70 text-indigo-950 font-bold">
                  Tổng điểm Tháng
                </th>
                <th className="py-3 px-4 text-center font-bold">Xếp hạng</th>
                <th className="py-3 px-4 text-center">Xếp loại</th>
                <th className="py-3 px-3 text-center no-print">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rankingData.rows.length === 0 ? (
                <tr>
                  <td colSpan={9 + rankingData.weeksInMonth.length} className="py-12 text-center text-slate-400">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                rankingData.rows.map((row) => {
                  const isTop3 = row.rank <= 3;
                  const isTop1 = row.rank === 1;

                  return (
                    <tr
                      key={row.classItem.id}
                      onClick={() => setSelectedClassRow(row)}
                      className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                        isTop1 ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3.5 text-center font-semibold text-slate-500">
                        {row.rank}
                      </td>

                      {/* Lớp */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{row.classItem.name}</span>
                          <span className="text-[10px] text-slate-400">Khối {row.classItem.grade}</span>
                        </div>
                      </td>

                      {/* Phân hiệu */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {row.campus.name}
                        </span>
                      </td>

                      {/* Số tuần tính */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-xs ${
                            row.lockedWeeksCount === row.totalWeeksInMonth
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.lockedWeeksCount > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {row.lockedWeeksCount}/{row.totalWeeksInMonth}
                        </span>
                      </td>

                      {/* Điểm các tuần */}
                      {row.weekScores.map((wScore) => (
                        <td key={wScore.week} className="py-3 px-3 text-center">
                          {wScore.isLocked ? (
                            <span
                              className={`font-semibold text-xs ${
                                wScore.score >= 100
                                  ? 'text-emerald-700 font-bold'
                                  : wScore.score >= 95
                                  ? 'text-slate-800'
                                  : 'text-rose-700'
                              }`}
                            >
                              {wScore.score}
                            </span>
                          ) : (
                            <span
                              className="text-slate-400 italic text-[11px]"
                              title="Tuần chưa chốt số liệu chính thức"
                            >
                              ({wScore.score})*
                            </span>
                          )}
                        </td>
                      ))}

                      {/* Điểm trung bình tuần trong tháng */}
                      <td className="py-3 px-3 text-center bg-slate-50/50">
                        {row.lockedWeeksCount > 0 ? (
                          <span className="text-xs font-semibold text-slate-700">
                            {row.averageScore.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa chốt tuần</span>
                        )}
                      </td>

                      {/* Điểm thưởng phong trào (Inline editing cho Role 1, 2, 3) */}
                      <td className="py-2 px-3 text-center bg-emerald-50/30 border-x border-emerald-100" onClick={(e) => e.stopPropagation()}>
                        {canEditBonus ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-emerald-700 font-bold text-xs">+</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={row.bonus_points_monthly || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updatePeriodicBonus('monthly', `${selectedMonth}_${row.classItem.id}`, val);
                              }}
                              className="w-14 px-1.5 py-1 text-center font-bold text-xs text-emerald-800 bg-white border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              title="Role 1, 2, 3: Nhập trực tiếp điểm thưởng phong trào tháng"
                            />
                            <span className="text-[10px] text-emerald-600">đ</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                            +{row.bonus_points_monthly || 0}đ
                          </span>
                        )}
                      </td>

                      {/* Tổng điểm tháng sau cộng thưởng */}
                      <td className="py-3 px-4 text-center bg-indigo-50/60">
                        {row.lockedWeeksCount > 0 ? (
                          <span className="text-sm font-extrabold text-indigo-700">
                            {row.finalMonthlyScore.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa chốt tuần</span>
                        )}
                      </td>

                      {/* Xếp hạng */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {row.rank === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Trophy size={13} className="text-amber-600" />
                              Hạng 1
                            </span>
                          ) : row.rank === 2 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
                              <Medal size={13} className="text-slate-500" />
                              Hạng 2
                            </span>
                          ) : row.rank === 3 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
                              <Award size={13} className="text-orange-600" />
                              Hạng 3
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-600">
                              Hạng {row.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Xếp loại */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getTierBadgeClass(
                            row.performanceTier
                          )}`}
                        >
                          {row.performanceTier}
                        </span>
                      </td>

                      {/* Hành động xem chi tiết */}
                      <td className="py-3 px-3 text-center no-print">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClassRow(row);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Xem chi tiết điểm từng tuần"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Print Signatures */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] no-print">
            <Info size={13} className="text-slate-400 shrink-0" />
            <span>Điểm tháng tính từ các tuần đã chốt dữ liệu chính thức. Thứ hạng tự động cập nhật theo chuẩn thi đua.</span>
          </div>

          {/* Print Footer */}
          <div className="hidden print:grid grid-cols-2 mt-8 pt-6 border-t border-slate-300 text-center text-xs">
            <div>
              <p className="font-bold">NGƯỜI LẬP BẢNG</p>
              <p className="italic text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-semibold">{currentUser.name}</p>
            </div>
            <div>
              <p className="font-bold">HIỆU TRƯỞNG / BAN GIÁM HIỆU</p>
              <p className="italic text-slate-500 mt-0.5">(Duyệt và ký tên đóng dấu)</p>
              <div className="h-16" />
              <p className="font-semibold">
                {lockInfo ? lockInfo.lockedBy.name : '...........................................'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Detail Modal (Requirement 6: Chi tiết các tuần, điểm từng tuần, điểm TB, các khoản cộng/trừ) */}
      {selectedClassRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-700 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
                  {selectedClassRow.classItem.name}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Chi Tiết Thi Đua Lớp {selectedClassRow.classItem.name} - Tháng {selectedMonth}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Phân hiệu: {selectedClassRow.campus.name} | GVCN: {selectedClassRow.classItem.homeroomTeacher || 'Chưa cập nhật'} | Khối {selectedClassRow.classItem.grade}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassRow(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 lg:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Formula & Monthly Average Card */}
              <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-900">
                    Công thức tính điểm trung bình tháng:
                  </p>
                  <p className="text-xs text-indigo-700 font-mono mt-1">
                    {selectedClassRow.lockedWeeksCount > 0 ? (
                      <>
                        (
                        {selectedClassRow.weekScores
                          .filter((w) => w.isLocked)
                          .map((w) => w.score)
                          .join(' + ')}
                        ) ÷ {selectedClassRow.lockedWeeksCount} ={' '}
                        <strong className="text-indigo-900 text-sm">
                          {selectedClassRow.averageScore.toLocaleString('vi-VN')} điểm
                        </strong>
                      </>
                    ) : (
                      'Chưa có tuần nào được chốt trong tháng này'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-indigo-200 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Xếp hạng</span>
                    <strong className="text-sm text-indigo-700">Hạng {selectedClassRow.rank}</strong>
                  </div>
                  <div className="px-3 py-1.5 bg-white rounded-lg border border-indigo-200 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Xếp loại</span>
                    <strong className="text-sm text-slate-800">{selectedClassRow.performanceTier}</strong>
                  </div>
                </div>
              </div>

              {/* Weekly Breakdown Table (Requirement 6) */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  Bảng tổng hợp điểm từng tuần trong Tháng {selectedMonth}
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Tuần</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái chốt</th>
                        <th className="py-2.5 px-3 text-center">Điểm gốc</th>
                        <th className="py-2.5 px-3 text-center text-emerald-700">Cộng (+)</th>
                        <th className="py-2.5 px-3 text-center text-rose-700">Trừ (-)</th>
                        <th className="py-2.5 px-3 text-center font-bold">Điểm tuần</th>
                        <th className="py-2.5 px-3 text-center">Số biên bản</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedClassRow.weekScores.map((wScore) => (
                        <tr key={wScore.week} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            Tuần {wScore.week}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {wScore.isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                <Check size={11} /> Đã chốt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                Chưa chốt
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {wScore.baseScore}
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">
                            +{wScore.bonusPoints}
                          </td>
                          <td className="py-2.5 px-3 text-center text-rose-600 font-semibold">
                            -{wScore.penaltyPoints}
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-sm text-slate-900">
                            {wScore.score}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {wScore.logsCount} vụ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Score Logs of each week */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" />
                  Chi tiết các khoản cộng / trừ từng tuần (Biên bản nề nếp)
                </h4>

                <div className="space-y-3">
                  {selectedClassRow.weekScores.map((wScore) => (
                    <div
                      key={wScore.week}
                      className="border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <div className="bg-slate-100/70 px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-200">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          Tuần {wScore.week} ({wScore.logs.length} bản ghi)
                        </span>
                        <span className="text-[11px] font-bold">
                          Điểm tuần: {wScore.score} điểm
                        </span>
                      </div>

                      {wScore.logs.length === 0 ? (
                        <p className="p-3 text-xs text-slate-400 italic text-center">
                          Lớp đạt 100 điểm tròn - Không có biên bản trừ điểm hay cộng điểm trong tuần này.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {wScore.logs.map((log) => (
                            <div
                              key={log.id}
                              className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                                    {log.criteriaCode}
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {log.criteriaName}
                                  </span>
                                  <span className="text-slate-400">
                                    (SL: {log.quantity})
                                  </span>
                                </div>
                                {log.calculationDetail && (
                                  <p className="text-[11px] text-slate-500">
                                    {log.calculationDetail}
                                  </p>
                                )}
                                {log.note && (
                                  <p className="text-[11px] text-slate-600 italic">
                                    Ghi chú: {log.note}
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    log.totalPoints > 0
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {log.totalPoints > 0 ? `+${log.totalPoints}` : log.totalPoints}đ
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {log.recordedBy || 'Cờ đỏ'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Toàn bộ dữ liệu được liên kết và lấy tự động từ Module Xếp Hạng Tuần.
              </span>
              <button
                onClick={() => setSelectedClassRow(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-medium hover:bg-slate-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Month Confirmation Modal (Requirement 9) */}
      {lockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 lg:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Chốt Khóa Dữ Liệu Tháng {selectedMonth}
                </h3>
                <p className="text-xs text-slate-500">
                  Dành cho Ban Giám Hiệu & Quản trị viên
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <p>
                <strong>Người thực hiện chốt:</strong> {currentUser.name} ({currentUser.title || currentUser.role})
              </p>
              <p>
                <strong>Thời gian ghi nhận:</strong> {new Date().toLocaleString('vi-VN')}
              </p>
              <p className="text-rose-700 font-semibold pt-1">
                Sau khi chốt: Toàn bộ điểm số của Tháng {selectedMonth} sẽ được đóng băng chính thức. Chỉ Quản trị viên mới được quyền mở khóa.
              </p>
            </div>

            {!rankingData.isFullyLocked && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Cảnh báo:</strong> Tháng {selectedMonth} còn {rankingData.unlockedWeeks.length} tuần chưa được chốt ({rankingData.unlockedWeeks.map((w) => `Tuần ${w}`).join(', ')}). Bạn phải chốt toàn bộ các tuần trước khi chốt tháng!
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú phê duyệt của Ban Giám Hiệu (tùy chọn)
              </label>
              <textarea
                value={lockNotes}
                onChange={(e) => setLockNotes(e.target.value)}
                placeholder="Ví dụ: Đã thông qua cuộc họp giao ban đầu tháng..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setLockConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteLock}
                disabled={!rankingData.isFullyLocked}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all shadow-sm ${
                  rankingData.isFullyLocked
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Xác nhận Chốt Tháng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Month Confirmation Modal (Requirement 9: Chỉ quản trị viên được mở khóa) */}
      {unlockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 lg:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Mở Khóa Dữ Liệu Tháng {selectedMonth}
                </h3>
                <p className="text-xs text-slate-500">
                  Quyền quản trị viên cấp cao (Super Admin)
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p>
                Bạn đang chuẩn bị mở khóa bảng xếp hạng Tháng {selectedMonth}. Sau khi mở khóa, các bộ phận có thể cập nhật hoặc điều chỉnh điểm thi đua các tuần tương ứng nếu cần.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Lý do mở khóa <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Nhập lý do mở khóa chính thức (Bắt buộc để lưu vết kiểm toán)..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUnlockConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteUnlock}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm"
              >
                Xác nhận Mở Khóa Tháng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Report Preview Modal */}
      {showPrintModal && (
        <PrintReportModal
          periodTitle={`BẢNG XẾP HẠNG THÁNG ${selectedMonth}`}
          scopeTitle={scopeTitle}
          rankings={rankingData.rows.map(r => ({
            rank: r.rank,
            classItem: r.classItem,
            campus: r.campus,
            totalScore: r.finalMonthlyScore,
            baseScore: r.averageScore,
            bonusPoints: r.bonus_points_monthly || 0,
            penaltyPoints: 0,
            logCount: r.weekScores.reduce((acc, w) => acc + w.logsCount, 0),
            performanceTier: r.performanceTier,
            weekBreakdown: r.weekScores.map(w => ({ week: w.week, score: w.score })),
          }))}
          selectedCampusId={selectedCampusId}
          periodType="month"
          periodNumber={selectedMonth}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
