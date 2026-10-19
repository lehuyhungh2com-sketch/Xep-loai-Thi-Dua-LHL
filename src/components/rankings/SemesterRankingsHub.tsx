import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SemesterRankingRow, SemesterMonthScoreItem, MonthWeeklyScoreItem } from '../../types';
import { canLockSemester, canUnlockSemester } from '../../utils/rbac';
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

export const SemesterRankingsHub: React.FC = () => {
  const {
    campuses,
    settings,
    currentUser,
    userRole,
    selectedSemester,
    setSelectedSemester,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    isSemesterLocked,
    getSemesterLockInfo,
    lockSemester,
    unlockSemester,
    getSemesterRankingData,
    applySemesterVerificationSample,
    exportSemesterRankingsExcel,
    setCurrentTab,
    setSelectedMonth,
    setSelectedWeek,
    updatePeriodicBonus,
  } = useApp();

  const canEditBonus = userRole === 'super_admin' || userRole === 'bgh' || userRole === 'tpt_doi' || userRole === 'admin';

  // Local state
  const [selectedClassRow, setSelectedClassRow] = useState<SemesterRankingRow | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [lockNotes, setLockNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Semester ranking data
  const rankingData = useMemo(() => {
    return getSemesterRankingData(selectedSemester, selectedCampusId, selectedGrade);
  }, [getSemesterRankingData, selectedSemester, selectedCampusId, selectedGrade]);

  const semesterIsLocked = isSemesterLocked(selectedSemester);
  const lockInfo = getSemesterLockInfo(selectedSemester);

  const userCanLock = canLockSemester(currentUser);
  const userCanUnlock = canUnlockSemester(currentUser);

  // Scope title for reports
  const scopeTitle = useMemo(() => {
    const campusName =
      selectedCampusId === 'all'
        ? 'Toàn trường'
        : campuses.find((c) => c.id === selectedCampusId)?.name || 'Phân hiệu';
    const gradeName = selectedGrade === 'all' ? 'Tất cả các khối' : `Khối ${selectedGrade}`;
    return `${campusName} - ${gradeName}`;
  }, [selectedCampusId, selectedGrade, campuses]);

  // Handle Lock Semester
  const handleExecuteLock = () => {
    const res = lockSemester(selectedSemester, lockNotes);
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      setLockConfirmOpen(false);
      setLockNotes('');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  // Handle Unlock Semester
  const handleExecuteUnlock = () => {
    if (!unlockReason.trim()) {
      setActionMessage({ text: 'Bắt buộc nhập lý do mở khóa bảng xếp hạng học kỳ để ghi nhật ký hệ thống!', type: 'error' });
      return;
    }
    const res = unlockSemester(selectedSemester, unlockReason.trim());
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
      setUnlockConfirmOpen(false);
      setUnlockReason('');
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  // Handle Test Verification Sample
  const handleRunVerificationSample = () => {
    setSelectedSemester(2); // Dữ liệu mẫu 5 tháng thuộc Học kỳ II
    const res = applySemesterVerificationSample('c_6a1');
    if (res.success) {
      setActionMessage({ text: res.message, type: 'success' });
    } else {
      setActionMessage({ text: res.message, type: 'error' });
    }
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Summary statistics
  const stats = useMemo(() => {
    const rows = rankingData.rows;
    if (rows.length === 0) {
      return { totalClasses: 0, avgSemesterScore: 0, topClass: null, lowestClass: null };
    }
    const sum = rows.reduce((acc, r) => acc + r.semesterScore, 0);
    const avg = Number((sum / rows.length).toFixed(2));
    const sorted = [...rows].sort((a, b) => b.semesterScore - a.semesterScore);
    return {
      totalClasses: rows.length,
      avgSemesterScore: avg,
      topClass: sorted[0],
      lowestClass: sorted[sorted.length - 1],
    };
  }, [rankingData.rows]);

  return (
    <div className="space-y-6">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
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
          onClick={() => setCurrentTab('month_rankings')}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Calendar size={13} />
          <span>Xếp Hạng Tháng</span>
        </button>
        <button
          className="px-3.5 py-1.5 bg-white text-indigo-900 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Award size={13} className="text-indigo-600" />
          <span>Xếp Hạng Học Kỳ</span>
        </button>
        <button
          onClick={() => setCurrentTab('year_rankings')}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Medal size={13} className="text-amber-500" />
          <span>Xếp Hạng Cả Năm</span>
        </button>
      </div>

      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border shadow-sm flex items-start justify-between gap-3 animate-fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : actionMessage.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : actionMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{actionMessage.text}</p>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                <Trophy className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                  XẾP HẠNG THI ĐUA HỌC KỲ
                </h1>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  Năm học {settings.academicYear} • Áp dụng chuẩn quy chế &quot;Tiêu chí xếp loại lớp, năm học 2026-2027&quot;
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions (Export, Print) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportSemesterRankingsExcel(selectedSemester, scopeTitle)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-medium shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs md:text-sm font-medium shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>In Bảng Xếp Hạng / PDF</span>
            </button>
          </div>
        </div>

        {/* Filters and Semester Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
          {/* Semester Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Học kỳ
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedSemester(1)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  selectedSemester === 1
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Học kỳ I</span>
                {isSemesterLocked(1) && <Lock className="w-3.5 h-3.5 text-amber-300" />}
              </button>
              <button
                onClick={() => setSelectedSemester(2)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${
                  selectedSemester === 2
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Học kỳ II</span>
                {isSemesterLocked(2) && <Lock className="w-3.5 h-3.5 text-amber-300" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {selectedSemester === 1
                ? 'Học kỳ I gồm 4 tháng: Tháng 9, 10, 11, 12'
                : 'Học kỳ II gồm 5 tháng: Tháng 1, 2, 3, 4, 5'}
            </p>
          </div>

          {/* Campus Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Phân hiệu
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Toàn trường (Tất cả phân hiệu)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'main' ? 'Khu trung tâm' : 'Điểm lẻ'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Khối lớp
            </label>
            <div className="relative">
              <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedGrade}
                onChange={(e) =>
                  setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả các khối (Khối 6, 7, 8, 9)</option>
                <option value={6}>Khối 6</option>
                <option value={7}>Khối 7</option>
                <option value={8}>Khối 8</option>
                <option value={9}>Khối 9</option>
              </select>
            </div>
          </div>

          {/* Semester Lock Status & Action Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {semesterIsLocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Đã chốt Học kỳ {selectedSemester === 1 ? 'I' : 'II'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Unlock className="w-3 h-3" /> Chưa chốt Học kỳ {selectedSemester === 1 ? 'I' : 'II'}
                  </span>
                )}
              </div>

              {/* Lock/Unlock Button */}
              {semesterIsLocked ? (
                userCanUnlock && (
                  <button
                    onClick={() => setUnlockConfirmOpen(true)}
                    className="text-xs text-rose-700 hover:text-rose-900 font-semibold underline flex items-center gap-1"
                  >
                    <Unlock className="w-3 h-3" /> Mở khóa
                  </button>
                )
              ) : (
                userCanLock && (
                  <button
                    onClick={() => setLockConfirmOpen(true)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Lock className="w-3 h-3" /> Chốt học kỳ
                  </button>
                )
              )}
            </div>

            {/* Lock audit preview */}
            <div className="mt-2 text-[11px] text-slate-500">
              {semesterIsLocked && lockInfo ? (
                <div>
                  <span className="font-medium text-slate-700">Chốt bởi:</span> {lockInfo.lockedBy.name} ({lockInfo.lockedBy.title || 'BGH'})
                  <span className="block text-[10px] text-slate-400">
                    {new Date(lockInfo.lockedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              ) : (
                <span>
                  {rankingData.lockedMonths.length}/{rankingData.totalMonthsInSemester} tháng đã chốt
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rule & Formula Notification Bar */}
        <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-900">Quy tắc tính điểm Học kỳ: </span>
              <span>
                Điểm học kỳ của mỗi lớp = <strong>TRUNG BÌNH ĐIỂM CÁC THÁNG ĐÃ CHỐT TRONG HỌC KỲ</strong>. Dữ liệu trích xuất tự động 100% từ Bảng xếp hạng tháng. Không cho nhập trực tiếp điểm học kỳ.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-medium text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg shadow-xs">
              Các tháng trong kỳ: {rankingData.monthsInSemester.map((m) => `Tháng ${m}`).join(', ')}
            </span>
          </div>
        </div>

        {/* Warning if months are not all locked */}
        {!rankingData.isFullyLocked && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Lưu ý tiến độ dữ liệu: </span>
              {rankingData.hasNoLockedMonths ? (
                <span className="text-amber-800">
                  <strong>Chưa đủ dữ liệu để tính điểm học kỳ</strong> do chưa có tháng nào trong Học kỳ {selectedSemester === 1 ? 'I' : 'II'} được Ban Giám Hiệu chốt dữ liệu.
                </span>
              ) : (
                <span>
                  Hiện tại mới có <strong>{rankingData.lockedMonths.length}/{rankingData.totalMonthsInSemester}</strong> tháng được chốt ({rankingData.lockedMonths.map((m) => `T${m}`).join(', ')}). Còn các tháng ({rankingData.unlockedMonths.map((m) => `Tháng ${m}`).join(', ')}) chưa chốt dữ liệu. Điểm học kỳ tạm tính theo trung bình các tháng đã chốt!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print View Official Header (Only shown during print) */}
      <div className="hidden print:block print:mb-6 text-center border-b pb-4">
        <div className="flex justify-between items-start text-xs text-slate-600">
          <div>
            <p className="font-bold uppercase">{settings.schoolName}</p>
            <p>HỘI ĐỒNG THI ĐUA KHEN THƯỞNG</p>
          </div>
          <div>
            <p className="font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="italic">Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>
        <h2 className="text-xl font-bold uppercase mt-4">
          BẢNG XẾP HẠNG THI ĐUA NỀ NẾP HỌC KỲ {selectedSemester === 1 ? 'I' : 'II'}
        </h2>
        <p className="text-sm mt-1">
          Năm học: {settings.academicYear} • Phạm vi: {scopeTitle}
        </p>
        <p className="text-xs italic text-slate-500 mt-0.5">
          (Điểm học kỳ = Trung bình điểm các tháng đã chốt dữ liệu)
        </p>
      </div>

      {/* Main Ranking Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              KẾT QUẢ THI ĐUA HỌC KỲ {selectedSemester === 1 ? 'I' : 'II'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              {rankingData.rows.length} lớp tham gia
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Tháng đã chốt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
              <span>Tháng chưa chốt</span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 text-center w-16">Xếp hạng</th>
                <th className="py-3 px-4">Lớp & GVCN</th>
                <th className="py-3 px-4">Phân hiệu</th>
                {rankingData.monthsInSemester.map((m) => {
                  const isLocked = rankingData.lockedMonths.includes(m);
                  return (
                    <th key={m} className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold">Tháng {m}</span>
                        <span
                          className={`text-[10px] font-normal px-1.5 py-0.2 rounded ${
                            isLocked
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isLocked ? 'Đã chốt' : 'Chưa chốt'}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center bg-slate-50 text-slate-700 font-semibold">
                  Điểm TB Tháng
                </th>
                <th className="py-3 px-3 text-center bg-emerald-50 text-emerald-900 font-bold border-x border-emerald-200">
                  Thưởng phong trào
                </th>
                <th className="py-3 px-4 text-center bg-indigo-50/70 text-indigo-950 font-bold">
                  Tổng điểm Học Kỳ
                </th>
                <th className="py-3 px-4 text-center">Xếp loại</th>
                <th className="py-3 px-3 text-center no-print w-24">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {rankingData.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8 + rankingData.monthsInSemester.length}
                    className="py-12 text-center text-slate-500"
                  >
                    Không có lớp nào phù hợp với bộ lọc đã chọn.
                  </td>
                </tr>
              ) : (
                rankingData.rows.map((row, idx) => {
                  const isExempt = selectedSemester === 1 && (row.isExempt || row.classItem.exemptSemester1);
                  const isTop1 = !isExempt && row.rank === 1;
                  const isTop2 = !isExempt && row.rank === 2;
                  const isTop3 = !isExempt && row.rank === 3;

                  return (
                    <tr
                      key={row.classItem.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isExempt
                          ? 'bg-amber-50/20'
                          : isTop1
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

                      {/* Rank Medal */}
                      <td className="py-3 px-3 text-center">
                        {isExempt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] shadow-2xs">
                            Miễn (Đội tuyển HSG)
                          </span>
                        ) : isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-xs" title="Hạng 1">
                            🥇 1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-bold text-xs shadow-xs" title="Hạng 2">
                            🥈 2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-bold text-xs shadow-xs" title="Hạng 3">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700">
                            #{row.rank}
                          </span>
                        )}
                      </td>

                      {/* Class & Homeroom Teacher */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{row.classItem.name}</span>
                          {isExempt && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold">
                              HSG
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          GVCN: {row.classItem.homeroomTeacher} • Khối {row.classItem.grade}
                        </div>
                      </td>

                      {/* Campus */}
                      <td className="py-3 px-4 text-xs text-slate-700">
                        <div className="font-medium">{row.campus.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {row.campus.type === 'main' ? 'Khu trung tâm' : 'Điểm lẻ'}
                        </div>
                      </td>

                      {/* Monthly Scores */}
                      {row.monthScores.map((mScore) => {
                        return (
                          <td
                            key={mScore.month}
                            className={`py-3 px-3 text-center text-xs ${
                              isExempt
                                ? 'text-slate-300'
                                : mScore.isLocked
                                ? 'font-semibold text-slate-900 bg-emerald-50/20'
                                : 'text-slate-400 italic'
                            }`}
                          >
                            {isExempt ? (
                              <span className="text-[11px] text-amber-700/60 font-medium">---</span>
                            ) : (
                              <span
                                className={`inline-block px-2 py-1 rounded-lg ${
                                  mScore.isLocked
                                    ? 'bg-white border border-slate-200 shadow-xs'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {mScore.averageScore}đ
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Semester Average Score */}
                      <td className="py-3 px-3 text-center bg-slate-50/50">
                        {isExempt ? (
                          <span className="text-xs text-amber-800 font-semibold italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Miễn HK1
                          </span>
                        ) : row.hasNoMonthsLocked ? (
                          <span className="text-xs font-medium text-slate-400 italic">
                            Chưa có dữ liệu
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-800">
                              {row.semesterScore}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              TB {row.lockedMonthsCount} tháng
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Điểm thưởng phong trào (Inline editing cho Role 1, 2, 3) */}
                      <td className="py-2 px-3 text-center bg-emerald-50/30 border-x border-emerald-100">
                        {isExempt ? (
                          <span className="text-xs text-slate-400 font-medium">---</span>
                        ) : canEditBonus ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-emerald-700 font-bold text-xs">+</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={row.bonus_points_term || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updatePeriodicBonus('term', `${selectedSemester}_${row.classItem.id}`, val);
                              }}
                              className="w-14 px-1.5 py-1 text-center font-bold text-xs text-emerald-800 bg-white border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              title="Role 1, 2, 3: Nhập trực tiếp điểm thưởng phong trào học kỳ"
                            />
                            <span className="text-[10px] text-emerald-600">đ</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                            +{row.bonus_points_term || 0}đ
                          </span>
                        )}
                      </td>

                      {/* Final Semester Score */}
                      <td className="py-3 px-4 text-center bg-indigo-50/70 border-r border-indigo-100">
                        {isExempt ? (
                          <div className="flex flex-col items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
                              Miễn (Đội tuyển HSG)
                            </span>
                            <span className="text-[10px] text-amber-700 mt-0.5">
                              Lấy 100% điểm HK2 cả năm
                            </span>
                          </div>
                        ) : row.hasNoMonthsLocked ? (
                          <span className="text-xs font-medium text-slate-400 italic">
                            Chưa có dữ liệu
                          </span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-base font-extrabold text-indigo-700">
                              {row.finalSemesterScore}
                            </span>
                            <span className="text-[10px] text-indigo-600">
                              Tổng kết HK{selectedSemester}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Performance Tier */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            isExempt
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : getTierBadgeClass(row.performanceTier)
                          }`}
                        >
                          {isExempt ? 'Miễn thi đua' : row.performanceTier}
                        </span>
                      </td>

                      {/* Drill-down detail action */}
                      <td className="py-3 px-3 text-center no-print">
                        <button
                          onClick={() => {
                            setSelectedClassRow(row);
                            setExpandedMonth(row.monthScores[0]?.month || null);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
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
        <div className="hidden print:grid print:grid-cols-3 gap-6 pt-10 pb-6 px-6 text-center text-xs">
          <div>
            <p className="font-bold uppercase">TỔNG PHỤ TRÁCH ĐỘI</p>
            <p className="italic text-slate-400 mt-1">(Ký, ghi rõ họ tên)</p>
            <div className="h-16"></div>
          </div>
          <div>
            <p className="font-bold uppercase">HỘI ĐỒNG THI ĐUA</p>
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

      {/* Drill-down Detail Modal: Học kỳ -> Các tháng -> Các tuần -> Điểm số */}
      {selectedClassRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-600 text-white rounded-xl">
                  <Trophy className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Chi tiết thi đua Lớp {selectedClassRow.classItem.name} — Học kỳ {selectedSemester === 1 ? 'I' : 'II'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân hiệu: {selectedClassRow.campus.name} • GVCN: {selectedClassRow.classItem.homeroomTeacher} • Xếp hạng #{selectedClassRow.rank}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClassRow(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 3-Tier Drilldown */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Tier 1: Semester Level Summary */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                      Cấp 1: Tổng kết Học kỳ {selectedSemester === 1 ? 'I' : 'II'}
                    </span>
                    <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      Điểm Học kỳ: {selectedClassRow.semesterScore} điểm
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Công thức: Trung bình cộng điểm các tháng đã chốt = (
                      {selectedClassRow.monthScores
                        .filter((m) => m.isLocked)
                        .map((m) => `${m.averageScore}`)
                        .join(' + ') || '0'}
                      ) / {selectedClassRow.lockedMonthsCount || 1} ={' '}
                      <strong>{selectedClassRow.semesterScore}đ</strong>
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
                    <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
                      Hạng {selectedClassRow.rank}/{rankingData.rows.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tier 2: Monthly Breakdown */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  Cấp 2: Các tháng trong Học kỳ (Bấm từng tháng để xem chi tiết các tuần)
                </h5>

                <div className="space-y-3">
                  {selectedClassRow.monthScores.map((mScore) => {
                    const isExpanded = expandedMonth === mScore.month;

                    return (
                      <div
                        key={mScore.month}
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                      >
                        {/* Month Header / Click to Expand */}
                        <button
                          onClick={() => setExpandedMonth(isExpanded ? null : mScore.month)}
                          className="w-full p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left"
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
                                {mScore.isLocked ? 'Đã chốt tháng' : 'Chưa chốt'}
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

                        {/* Tier 3: Weeks within Month */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                            <p className="text-xs font-semibold text-slate-600 mb-2">
                              Cấp 3: Chi tiết điểm từng tuần của Tháng {mScore.month}
                            </p>

                            {mScore.weekScores.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                Không có tuần nào trong tháng này.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {mScore.weekScores.map((wScore) => {
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
                                              Đã chốt
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

                                      {/* Logs toggle */}
                                      {wScore.logs.length > 0 && (
                                        <div className="pt-1 border-t border-slate-200">
                                          <button
                                            onClick={() =>
                                              setExpandedWeek(isWeekExpanded ? null : wScore.week)
                                            }
                                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                          >
                                            {isWeekExpanded
                                              ? 'Ẩn biên bản vi phạm'
                                              : `Xem ${wScore.logs.length} biên bản vi phạm/khen thưởng`}
                                          </button>

                                          {isWeekExpanded && (
                                            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                                              {wScore.logs.map((log) => (
                                                <div
                                                  key={log.id}
                                                  className="p-2 bg-white border border-slate-200 rounded text-[11px] flex justify-between items-start gap-2"
                                                >
                                                  <div>
                                                    <span className="font-medium text-slate-800">
                                                      {log.criteriaName}
                                                    </span>
                                                    <p className="text-[10px] text-slate-500">
                                                      {log.calculationDetail || log.note}
                                                    </p>
                                                  </div>
                                                  <span
                                                    className={`font-bold flex-shrink-0 ${
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
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClassRow(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Confirm Lock Semester */}
      {lockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-indigo-50">
              <span className="p-2 bg-indigo-600 text-white rounded-xl">
                <Lock className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  CHỐT KHÓA DỮ LIỆU HỌC KỲ {selectedSemester === 1 ? 'I' : 'II'}
                </h3>
                <p className="text-xs text-slate-600">
                  Dành cho Ban Giám Hiệu & Quản trị viên
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p>
                Sau khi chốt, toàn bộ bảng xếp hạng và điểm số của Học kỳ {selectedSemester === 1 ? 'I' : 'II'} sẽ được <strong>đóng băng chính thức</strong>.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" /> Quy định chốt dữ liệu:
                </p>
                <ul className="list-disc list-inside space-y-1 text-amber-800">
                  <li>Yêu cầu tất cả các tháng trong học kỳ phải được chốt trước.</li>
                  <li>Lưu lại danh tính người chốt và thời gian chốt vào Nhật ký hệ thống (Audit Log).</li>
                  <li>Chỉ <strong>Quản trị viên hệ thống (Super Admin)</strong> mới có quyền mở khóa.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú hoặc Quyết định công nhận (không bắt buộc):
                </label>
                <textarea
                  value={lockNotes}
                  onChange={(e) => setLockNotes(e.target.value)}
                  placeholder="Ví dụ: Căn cứ Quyết định khen thưởng số 12/QĐ-BGH..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setLockConfirmOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteLock}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                Xác nhận chốt Học kỳ {selectedSemester === 1 ? 'I' : 'II'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Confirm Unlock Semester */}
      {unlockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-rose-50">
              <span className="p-2 bg-rose-600 text-white rounded-xl">
                <Unlock className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  MỞ KHÓA DỮ LIỆU HỌC KỲ {selectedSemester === 1 ? 'I' : 'II'}
                </h3>
                <p className="text-xs text-slate-600">
                  Chỉ Quản trị viên hệ thống (Super Admin)
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p>
                Bạn có chắc chắn muốn mở khóa Bảng dữ liệu Học kỳ {selectedSemester === 1 ? 'I' : 'II'} không?
              </p>
              <p className="text-rose-700 font-medium">
                Hành động này sẽ được ghi lại trong Nhật ký an toàn hệ thống (Audit Log).
              </p>
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do mở khóa <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Nhập lý do mở khóa chính thức (Bắt buộc)..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setUnlockConfirmOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteUnlock}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5" />
                Mở khóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
