import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Trophy,
  Calendar,
  Award,
  Filter,
  Download,
  Printer,
  Search,
  School,
  ChevronRight,
  Eye,
  ArrowUpDown,
  Sparkles,
  Layers,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ClassItem, RankingEntry } from '../../types';
import { ClassDetailModal } from '../common/ClassDetailModal';
import { PrintReportModal } from '../common/PrintReportModal';

type PeriodType = 'week' | 'month' | 'semester' | 'year';

export const RankingsHub: React.FC = () => {
  const {
    campuses,
    settings,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    selectedWeek,
    setSelectedWeek,
    selectedMonth,
    setSelectedMonth,
    selectedSemester,
    setSelectedSemester,
    getWeeklyRankings,
    getMonthlyRankings,
    getSemesterRankings,
    getYearlyRankings,
    exportCurrentRankingsExcel,
    exportOfflineStandbyWorkbook,
    setCurrentTab,
  } = useApp();

  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectClass, setInspectClass] = useState<ClassItem | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Compute rankings dynamically based on periodType and filters
  const rawRankings = useMemo(() => {
    switch (periodType) {
      case 'week':
        return getWeeklyRankings(selectedWeek, selectedCampusId, selectedGrade);
      case 'month':
        return getMonthlyRankings(selectedMonth, selectedCampusId, selectedGrade);
      case 'semester':
        return getSemesterRankings(selectedSemester, selectedCampusId, selectedGrade);
      case 'year':
        return getYearlyRankings(selectedCampusId, selectedGrade);
      default:
        return getWeeklyRankings(selectedWeek, selectedCampusId, selectedGrade);
    }
  }, [
    periodType,
    selectedWeek,
    selectedMonth,
    selectedSemester,
    selectedCampusId,
    selectedGrade,
    getWeeklyRankings,
    getMonthlyRankings,
    getSemesterRankings,
    getYearlyRankings,
  ]);

  // Client-side search
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return rawRankings;
    const q = searchQuery.toLowerCase();
    return rawRankings.filter(
      (r) =>
        r.classItem.name.toLowerCase().includes(q) ||
        r.classItem.homeroomTeacher.toLowerCase().includes(q) ||
        r.campus.name.toLowerCase().includes(q)
    );
  }, [rawRankings, searchQuery]);

  // Labels for display & printing
  const periodLabel = useMemo(() => {
    switch (periodType) {
      case 'week':
        return `Tuần ${selectedWeek}`;
      case 'month':
        return `Tháng ${selectedMonth}`;
      case 'semester':
        return `Học kỳ ${selectedSemester === 1 ? 'I' : 'II'}`;
      case 'year':
        return `Cả năm học ${settings.academicYear}`;
    }
  }, [periodType, selectedWeek, selectedMonth, selectedSemester, settings.academicYear]);

  const scopeLabel = useMemo(() => {
    const campus = campuses.find((c) => c.id === selectedCampusId);
    const cName = campus ? campus.name : 'Toàn trường (6 Phân hiệu)';
    const gName = selectedGrade === 'all' ? 'Tất cả khối' : `Khối ${selectedGrade}`;
    return `${cName} · ${gName}`;
  }, [campuses, selectedCampusId, selectedGrade]);

  // Quotas for Yearly Ranking
  const yearlyQuotaInfo = useMemo(() => {
    if (periodType !== 'year') return null;
    const totalClasses = filteredRankings.length;
    const maxAdvanced = Math.round(totalClasses * (settings.evaluationConfig?.advancedClassesRatio || 0.7));
    const maxExcellent = Math.round(maxAdvanced * (settings.evaluationConfig?.excellentClassesRatio || 0.35));
    const maxGood = Math.round(maxAdvanced * (settings.evaluationConfig?.goodClassesRatio || 0.35));
    return {
      totalClasses,
      maxAdvanced,
      maxExcellent,
      maxGood,
    };
  }, [periodType, filteredRankings, settings.evaluationConfig]);

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'Xếp hạng',
      'Tên lớp',
      'Khối',
      'Phân hiệu',
      'Giáo viên chủ nhiệm',
      'Điểm gốc/TB',
      'Điểm cộng',
      'Điểm trừ',
      'Điểm tổng kết',
      'Xếp loại',
      'Kỷ luật cả năm',
    ];

    const rows = filteredRankings.map((r) => [
      r.isDisqualifiedYearly ? 'Không xếp loại' : r.rank,
      `Lớp ${r.classItem.name}`,
      `Khối ${r.classItem.grade}`,
      r.campus.name,
      r.classItem.homeroomTeacher,
      r.baseScore,
      r.bonusPoints || r.monthBonusPoints || r.yearBonusPoints || 0,
      r.penaltyPoints || r.monthPenaltyPoints || 0,
      r.totalScore,
      r.performanceTier,
      r.isDisqualifiedYearly ? r.disqualificationReason || 'Vi phạm kỷ luật' : 'Đủ điều kiện',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Xep_Hang_${periodType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 3-Tier Ranking Module Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl w-fit no-print">
        <button
          className="px-4 py-2 bg-white text-indigo-900 rounded-xl text-xs font-black shadow-xs flex items-center gap-2"
        >
          <Trophy size={14} className="text-indigo-600" />
          <span>Xếp Hạng Tuần</span>
        </button>
        <button
          onClick={() => setCurrentTab('month_rankings')}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Calendar size={14} />
          <span>Xếp Hạng Tháng</span>
        </button>
        <button
          onClick={() => setCurrentTab('semester_rankings')}
          className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Award size={14} />
          <span>Xếp Hạng Học Kỳ</span>
        </button>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-700 uppercase tracking-wider mb-1">
            <Trophy size={16} />
            <span>Bảng tổng sắp thi đua</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Bảng Xếp Hạng Toàn Trường & Phân Hiệu
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {periodLabel} · {scopeLabel} · Xếp hạng chuẩn theo quyết định năm học {settings.academicYear}
          </p>
        </div>

        {/* Export / Print Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportCurrentRankingsExcel(periodType, scopeLabel)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-2 border-emerald-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Xuất bảng xếp hạng ra file Microsoft Excel (.xls) có định dạng và công thức"
          >
            <Download size={15} className="text-emerald-700" />
            <span>Xuất Excel (.xls)</span>
          </button>
          <button
            onClick={() => exportOfflineStandbyWorkbook(selectedWeek)}
            className="hidden xl:flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Tải bảng chấm điểm & xếp hạng dự phòng offline tự động tính"
          >
            <span>Bản Offline Tuần {selectedWeek}</span>
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            title="In ấn và xuất file PDF bảng xếp hạng chính thức"
          >
            <Printer size={15} />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Yearly Quota Notice Box */}
      {yearlyQuotaInfo && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
          <div className="flex items-start gap-2.5">
            <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900">
                Chỉ tiêu thi đua cả năm: Tối đa {yearlyQuotaInfo.maxAdvanced} lớp Tiên tiến trở lên ({Math.round((settings.evaluationConfig?.advancedClassesRatio || 0.7) * 100)}% tổng số {yearlyQuotaInfo.totalClasses} lớp)
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Trong đó: Tối đa <strong>{yearlyQuotaInfo.maxExcellent}</strong> lớp Xuất sắc (35%), <strong>{yearlyQuotaInfo.maxGood}</strong> lớp Tiên tiến (35%). Riêng trường chính được xét duyệt bổ sung nếu có nhiều giải HSG tỉnh và CLB văn hóa.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-white rounded-lg border border-indigo-200 text-indigo-700 shrink-0">
            Mục II - Quyết định 2026-2027
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        {/* Level 1: Period Selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriodType('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'week'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Tuần
            </button>
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'month'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo Tháng
            </button>
            <button
              onClick={() => setPeriodType('semester')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'semester'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Học Kỳ
            </button>
            <button
              onClick={() => setPeriodType('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'year'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả Năm Học
            </button>
          </div>

          {/* Sub-selectors depending on period */}
          <div className="flex items-center gap-2">
            {periodType === 'week' && (
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Chọn Tuần:</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
                >
                  {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'month' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium">Chọn Tháng:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
                  >
                    {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setCurrentTab('month_rankings')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors"
                >
                  <span>Chốt tháng & Chi tiết tuần quy chuẩn →</span>
                </button>
              </div>
            )}

            {periodType === 'semester' && (
              <div className="flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Học kỳ:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(Number(e.target.value) as 1 | 2)}
                  className="text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
                >
                  <option value={1}>Học kỳ I (Tháng 9 - Tháng 12)</option>
                  <option value={2}>Học kỳ II (Tháng 1 - Tháng 5)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Level 2 & 3: Campus & Grade Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Campus Filter */}
            <div className="flex items-center gap-1.5">
              <School size={15} className="text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Phân hiệu:</span>
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Toàn trường (Tất cả 6 Phân hiệu)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'main' ? 'Trường chính' : 'Phân hiệu'})
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1.5">
              <Layers size={15} className="text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">Khối:</span>
              <select
                value={selectedGrade}
                onChange={(e) =>
                  setSelectedGrade(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 6 | 7 | 8 | 9))
                }
                className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Tất cả Khối 6, 7, 8, 9</option>
                <option value="6">Khối 6</option>
                <option value="7">Khối 7</option>
                <option value="8">Khối 8</option>
                <option value="9">Khối 9</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên lớp, GVCN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                <th className="py-3.5 px-4">Lớp & Khối</th>
                <th className="py-3.5 px-4">Phân hiệu</th>
                <th className="py-3.5 px-4">Giáo viên chủ nhiệm</th>
                <th className="py-3.5 px-4 text-center w-20">Điểm gốc/TB</th>

                {periodType === 'week' && (
                  <>
                    <th className="py-3.5 px-4 text-center text-emerald-600 w-24">Thưởng (+)</th>
                    <th className="py-3.5 px-4 text-center text-rose-600 w-24">Phạt (-)</th>
                  </>
                )}

                {periodType === 'month' && (
                  <>
                    <th className="py-3.5 px-4 text-center text-emerald-600 w-24">Thưởng Tháng</th>
                    <th className="py-3.5 px-4 text-center text-rose-600 w-24">Phạt Quy chế</th>
                  </>
                )}

                {periodType === 'semester' && (
                  <th className="py-3.5 px-4 text-center text-slate-600 w-32">Kỳ tính điểm</th>
                )}

                {periodType === 'year' && (
                  <>
                    <th className="py-3.5 px-4 text-center text-indigo-700 w-24">Công thức HK</th>
                    <th className="py-3.5 px-4 text-center text-emerald-600 w-28">Thưởng cả năm (+)</th>
                  </>
                )}

                <th className="py-3.5 px-4 text-center bg-indigo-50/70 text-indigo-900 w-28 font-bold">
                  Tổng điểm
                </th>
                <th className="py-3.5 px-4 text-center">Xếp loại</th>
                <th className="py-3.5 px-4 text-center w-24">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredRankings.map((entry) => {
                  const isDisqualified = entry.isDisqualifiedYearly;
                  const isTop1 = !isDisqualified && entry.rank === 1;
                  const isTop2 = !isDisqualified && entry.rank === 2;
                  const isTop3 = !isDisqualified && entry.rank === 3;

                  return (
                    <tr
                      key={entry.classItem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDisqualified
                          ? 'bg-rose-50/40 opacity-75'
                          : isTop1
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3 px-4 text-center">
                        {isDisqualified ? (
                          <span className="text-rose-600 font-bold text-xs" title={entry.disqualificationReason}>
                            ✕
                          </span>
                        ) : isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs shadow-xs">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-black text-xs">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-600 tabular-nums">
                            {entry.rank}
                          </span>
                        )}
                      </td>

                      {/* Class Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            Lớp {entry.classItem.name}
                          </span>
                          {periodType === 'week' && entry.isHistorical && (
                            <span
                              className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                              title={entry.historicalNote || 'Điểm bảo lưu lịch sử'}
                            >
                              Bảo lưu
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Khối {entry.classItem.grade} · {entry.classItem.studentCount} học sinh
                        </div>
                      </td>

                      {/* Campus */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{entry.campus.name}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {entry.campus.type === 'main' ? 'Trường chính' : 'Phân hiệu'}
                        </span>
                      </td>

                      {/* Homeroom Teacher */}
                      <td className="py-3 px-4 text-slate-600">
                        <div>{entry.classItem.homeroomTeacher}</div>
                        <div className="text-[10px] text-slate-400">LT: {entry.classItem.monitorName}</div>
                      </td>

                      {/* Base / Average Score */}
                      <td className="py-3 px-4 text-center text-slate-500 tabular-nums font-semibold">
                        {entry.baseScore}
                      </td>

                      {/* Bonus / Penalty by Period */}
                      {periodType === 'week' && (
                        <>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 tabular-nums">
                            +{entry.bonusPoints || 0}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600 tabular-nums">
                            -{entry.penaltyPoints || 0}
                          </td>
                        </>
                      )}

                      {periodType === 'month' && (
                        <>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 tabular-nums">
                            +{entry.monthBonusPoints || 0}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600 tabular-nums">
                            -{entry.monthPenaltyPoints || 0}
                          </td>
                        </>
                      )}

                      {periodType === 'semester' && (
                        <td className="py-3 px-4 text-center text-[11px] text-slate-500">
                          TB các tháng
                        </td>
                      )}

                      {periodType === 'year' && (
                        <>
                          <td className="py-3 px-4 text-center text-xs font-mono font-bold text-slate-700">
                            {entry.baseScore}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 tabular-nums">
                            +{entry.yearBonusPoints || 0}
                          </td>
                        </>
                      )}

                      {/* Final Score */}
                      <td className="py-3 px-4 text-center bg-indigo-50/40">
                        <span className="font-black text-indigo-700 text-base tabular-nums">
                          {entry.totalScore}
                        </span>
                        <span className="text-[10px] text-slate-400 block">điểm</span>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3 px-4 text-center">
                        {isDisqualified ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                              Kỷ luật
                            </span>
                            <span className="block text-[9px] text-rose-600">Không xếp loại</span>
                          </div>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              entry.performanceTier === 'Xuất sắc'
                                ? 'bg-amber-100 text-amber-800'
                                : entry.performanceTier === 'Tốt'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.performanceTier === 'Khá'
                                ? 'bg-blue-100 text-blue-800'
                                : entry.performanceTier === 'Trung bình'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {entry.performanceTier}
                          </span>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setInspectClass(entry.classItem)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Xem chi tiết điểm"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Hiển thị <strong className="text-slate-800">{filteredRankings.length}</strong> lớp học · Điểm cao nhất:{' '}
            <strong className="text-indigo-700">{filteredRankings[0]?.totalScore || 100} đ</strong> · Điểm thấp nhất:{' '}
            <strong className="text-slate-700">
              {filteredRankings[filteredRankings.length - 1]?.totalScore || 100} đ
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Xuất sắc (≥ 105đ)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Tốt (≥ 95đ)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Khá (≥ 85đ)
            </span>
          </div>
        </div>
      </div>

      {/* Class Detail Modal */}
      {inspectClass && (
        <ClassDetailModal
          classItem={inspectClass}
          week={selectedWeek}
          onClose={() => setInspectClass(null)}
        />
      )}

      {/* Print Report Preview Modal */}
      {showPrintModal && (
        <PrintReportModal
          periodTitle={periodLabel}
          scopeTitle={scopeLabel}
          rankings={rawRankings}
          selectedCampusId={selectedCampusId}
          periodType={periodType}
          periodNumber={
            periodType === 'week'
              ? selectedWeek
              : periodType === 'month'
              ? selectedMonth
              : periodType === 'semester'
              ? selectedSemester
              : 1
          }
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
