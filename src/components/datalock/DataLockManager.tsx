import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  Search,
  Filter,
  Trophy,
  TrendingUp,
  Download,
  School,
  X,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { canLockUnlockWeeks } from '../../utils/rbac';

export const DataLockManager: React.FC = () => {
  const {
    settings,
    selectedWeek,
    setSelectedWeek,
    currentUser,
    userRole,
    lockedWeeks,
    isWeekLocked,
    toggleLockWeek,
    getWeeklyRankings,
    getSchoolStats,
    scoreLogs,
    classes,
    campuses,
    setCurrentTab,
    maxWeeks,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [filterSemester, setFilterSemester] = useState<'all' | 'hk1' | 'hk2'>('all');
  const [reportWeekModal, setReportWeekModal] = useState<number | null>(null);
  const [unlockWeekTarget, setUnlockWeekTarget] = useState<{ week: number; reason: string; error?: string } | null>(null);

  const sem1Weeks = settings.totalWeeksSemester1 || 18;

  // Check permissions: Ban Giám Hiệu, TPT Đội or Super Admin
  const canLock = canLockUnlockWeeks(currentUser);

  // Build data list for all maxWeeks weeks
  const weeksData = useMemo(() => {
    return Array.from({ length: maxWeeks }, (_, idx) => {
      const week = idx + 1;
      const isLocked = isWeekLocked(week);
      const semester = week <= sem1Weeks ? 1 : 2;
      const stats = getSchoolStats(week);
      const rankings = getWeeklyRankings(week, 'all', 'all');
      const topClass = rankings[0];
      const weekLogs = scoreLogs.filter((l) => l.week === week);

      return {
        week,
        semester,
        isLocked,
        stats,
        topClass,
        logCount: weekLogs.length,
        bonusCount: weekLogs.filter((l) => l.type === 'bonus').length,
        penaltyCount: weekLogs.filter((l) => l.type === 'penalty').length,
      };
    });
  }, [maxWeeks, sem1Weeks, isWeekLocked, getSchoolStats, getWeeklyRankings, scoreLogs]);

  // Filtered weeks
  const filteredWeeks = useMemo(() => {
    return weeksData.filter((item) => {
      // Semester filter
      if (filterSemester === 'hk1' && item.semester !== 1) return false;
      if (filterSemester === 'hk2' && item.semester !== 2) return false;

      // Status filter
      if (filterStatus === 'locked' && !item.isLocked) return false;
      if (filterStatus === 'unlocked' && item.isLocked) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesWeek = `tuần ${item.week}`.includes(q) || item.week.toString() === q;
        const matchesTopClass = item.topClass?.classItem.name.toLowerCase().includes(q) || false;
        if (!matchesWeek && !matchesTopClass) return false;
      }

      return true;
    });
  }, [weeksData, filterSemester, filterStatus, searchQuery]);

  const totalLocked = lockedWeeks.length;
  const currentWeekIsLocked = isWeekLocked(selectedWeek);

  const handleToggle = (week: number) => {
    if (!canLock) {
      alert('Chỉ Ban Giám Hiệu, Tổng phụ trách Đội hoặc Quản trị viên mới có thẩm quyền chốt hoặc mở khóa dữ liệu tuần!');
      return;
    }
    const locked = isWeekLocked(week);
    if (locked) {
      // Unlocking requires reason and Admin role
      setUnlockWeekTarget({ week, reason: '', error: undefined });
    } else {
      // Locking week
      const result = toggleLockWeek(week);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  const handleConfirmUnlockWeek = () => {
    if (!unlockWeekTarget) return;
    if (!unlockWeekTarget.reason.trim()) {
      setUnlockWeekTarget({ ...unlockWeekTarget, error: 'Bắt buộc nhập lý do mở khóa để lưu vết kiểm toán hệ thống!' });
      return;
    }
    const result = toggleLockWeek(unlockWeekTarget.week, unlockWeekTarget.reason.trim());
    if (result.success) {
      setUnlockWeekTarget(null);
    } else {
      setUnlockWeekTarget({ ...unlockWeekTarget, error: result.message });
    }
  };

  // Selected week report data for modal
  const modalWeekData = useMemo(() => {
    if (!reportWeekModal) return null;
    const rankings = getWeeklyRankings(reportWeekModal, 'all', 'all');
    const stats = getSchoolStats(reportWeekModal);
    const logs = scoreLogs.filter((l) => l.week === reportWeekModal);
    const locked = isWeekLocked(reportWeekModal);

    return {
      week: reportWeekModal,
      rankings,
      stats,
      logs,
      isLocked: locked,
    };
  }, [reportWeekModal, getWeeklyRankings, getSchoolStats, scoreLogs, isWeekLocked]);

  return (
    <div className="space-y-6">
      {/* 3-Tier Hierarchy Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl w-fit">
        <button
          className="px-3.5 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Lock size={13} className="text-blue-600" />
          <span>Chốt Dữ Liệu Tuần</span>
        </button>
        <button
          onClick={() => setCurrentTab('month_rankings')}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Calendar size={13} />
          <span>Chốt Dữ Liệu Tháng</span>
        </button>
        <button
          onClick={() => setCurrentTab('semester_rankings')}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Trophy size={13} />
          <span>Chốt Dữ Liệu Học Kỳ</span>
        </button>
      </div>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <Lock size={15} />
            <span>Phân hệ Nghiệp vụ Chốt số liệu & Khóa sổ thi đua</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
            Quản Lý Chốt Dữ Liệu Thi Đua Tuần
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Khi chốt tuần, toàn bộ bảng điểm, biên bản vi phạm và bảng xếp hạng của tuần sẽ được niêm phong để chuẩn bị báo cáo chào cờ đầu tuần và xếp cờ luân lưu.
          </p>
        </div>

        {/* Action Controls for Current Week */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-left">
            <div className="text-[11px] font-semibold text-blue-900">Tuần hiện hành: Tuần {selectedWeek}</div>
            <div className="text-xs font-bold mt-0.5">
              {currentWeekIsLocked ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <Lock size={13} /> Đã khóa chốt số liệu
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Unlock size={13} /> Đang mở cho phép nhập
                </span>
              )}
            </div>
          </div>

          {canLock && (
            <button
              onClick={() => handleToggle(selectedWeek)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                currentWeekIsLocked
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {currentWeekIsLocked ? (
                <>
                  <Unlock size={16} />
                  <span>Mở khóa tuần {selectedWeek}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Khóa chốt tuần {selectedWeek}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center justify-between">
            <span>Tiến độ chốt sổ</span>
            <Calendar size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 tabular-nums">
            {totalLocked} <span className="text-xs font-normal text-slate-400">/ {maxWeeks} tuần</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Năm học {settings.academicYear}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center justify-between">
            <span>Tuần {selectedWeek} xếp loại</span>
            <Trophy size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1 truncate">
            {weeksData[selectedWeek - 1]?.topClass ? `Lớp ${weeksData[selectedWeek - 1]?.topClass?.classItem.name}` : '---'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Điểm: <strong className="text-blue-700 tabular-nums">{weeksData[selectedWeek - 1]?.topClass?.totalScore || 100}đ</strong> ({weeksData[selectedWeek - 1]?.topClass?.campus.name})
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center justify-between">
            <span>Điểm TB tuần {selectedWeek}</span>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 tabular-nums">
            {weeksData[selectedWeek - 1]?.stats.avgScore || 100}{' '}
            <span className="text-xs font-normal text-slate-400">/ 100đ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {weeksData[selectedWeek - 1]?.logCount} bản ghi nề nếp
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold flex items-center justify-between">
            <span>Quyền hạn thao tác</span>
            <ShieldCheck size={16} className={canLock ? 'text-emerald-600' : 'text-slate-400'} />
          </div>
          <div className="text-sm font-bold text-slate-800 mt-1 truncate">
            {canLock ? 'Quản trị viên / TPT' : 'Chỉ xem số liệu'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {canLock ? 'Có quyền khóa & mở khóa sổ' : 'Cần quyền BGH để thay đổi'}
          </div>
        </div>
      </div>

      {/* Main Table Container: Clear High-Density Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filters and Search Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tuần hoặc tên lớp..."
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 w-48 sm:w-56"
              />
            </div>

            {/* Filter by Semester */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterSemester('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSemester === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả năm ({maxWeeks}T)
              </button>
              <button
                onClick={() => setFilterSemester('hk1')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSemester === 'hk1' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kỳ 1 (1-{sem1Weeks})
              </button>
              <button
                onClick={() => setFilterSemester('hk2')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSemester === 'hk2' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học kỳ 2 ({sem1Weeks + 1}-{maxWeeks})
              </button>
            </div>

            {/* Filter by Lock Status */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterStatus('locked')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterStatus === 'locked' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã chốt ({totalLocked})
              </button>
              <button
                onClick={() => setFilterStatus('unlocked')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterStatus === 'unlocked' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang mở ({Math.max(0, maxWeeks - totalLocked)})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Hiển thị <strong>{filteredWeeks.length}</strong> / {maxWeeks} tuần
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Tuần học</th>
                <th className="py-3 px-3">Học kỳ</th>
                <th className="py-3 px-3">Trạng thái chốt sổ</th>
                <th className="py-3 px-4 text-center">Bản ghi nề nếp</th>
                <th className="py-3 px-4 text-right">Điểm TB trường</th>
                <th className="py-3 px-4">Lớp hạng 1 tuần</th>
                <th className="py-3 px-4 text-center">Thao tác nghiệp vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWeeks.map((item) => {
                const isCurrent = item.week === selectedWeek;
                return (
                  <tr
                    key={item.week}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isCurrent ? 'bg-blue-50/70 font-semibold' : ''
                    }`}
                  >
                    {/* Week Column */}
                    <td className="py-3.5 px-4 font-bold text-blue-950 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {item.week}
                      </span>
                      <span>Tuần {item.week}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-sm">
                          Hiện tại
                        </span>
                      )}
                    </td>

                    {/* Semester */}
                    <td className="py-3.5 px-3 text-slate-600">
                      Học kỳ {item.semester}
                    </td>

                    {/* Lock Status */}
                    <td className="py-3.5 px-3">
                      {item.isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock size={12} className="text-amber-600" />
                          <span>Đã chốt sổ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Unlock size={12} className="text-emerald-600" />
                          <span>Đang mở ghi</span>
                        </span>
                      )}
                    </td>

                    {/* Log counts */}
                    <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700">
                      <span className="text-emerald-700 font-bold">+{item.bonusCount}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-rose-700 font-bold">-{item.penaltyCount}</span>
                      <span className="text-slate-400 text-[10px] block">({item.logCount} lượt)</span>
                    </td>

                    {/* Average Score */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-blue-950 tabular-nums">
                      {item.stats.avgScore} đ
                    </td>

                    {/* Top Class */}
                    <td className="py-3.5 px-4">
                      {item.topClass ? (
                        <div>
                          <span className="font-extrabold text-blue-900">
                            Lớp {item.topClass.classItem.name}
                          </span>{' '}
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({item.topClass.campus.name})
                          </span>
                          <div className="text-[10px] font-bold text-emerald-700">
                            {item.topClass.totalScore}đ • {item.topClass.performanceTier}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa xếp hạng</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Lock / Unlock button */}
                        {canLock && (
                          <button
                            onClick={() => handleToggle(item.week)}
                            title={item.isLocked ? 'Mở khóa tuần' : 'Khóa chốt tuần'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              item.isLocked
                                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {item.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        )}

                        {/* View Report Sheet */}
                        <button
                          onClick={() => setReportWeekModal(item.week)}
                          title="Xem biên bản tổng hợp"
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <FileText size={13} className="text-blue-600" />
                          <span>Biên bản</span>
                        </button>

                        {/* Jump to scoring */}
                        <button
                          onClick={() => {
                            setSelectedWeek(item.week);
                            setCurrentTab('scoring');
                          }}
                          title="Chuyển đến màn hình nhập điểm"
                          className="px-2 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 font-medium text-[11px] flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Sổ điểm</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Formal Inspection & Lock Summary Report */}
      {reportWeekModal && modalWeekData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-blue-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-blue-950 text-base sm:text-lg">
                    Biên Bản Nghiệm Thu & Chốt Điểm Thi Đua Tuần {reportWeekModal}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trường THCS Lê Hữu Lập • Năm học {settings.academicYear} • Trạng thái: {modalWeekData.isLocked ? 'Đã khóa sổ' : 'Đang mở'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReportWeekModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Printable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Header Official Letterhead */}
              <div className="grid grid-cols-2 text-center pb-4 border-b border-slate-200">
                <div>
                  {settings.governingBody && settings.governingBody.trim() && (
                    <div className="font-bold text-xs uppercase text-slate-700">{settings.governingBody.trim()}</div>
                  )}
                  <div className="font-extrabold text-xs sm:text-sm text-blue-950 uppercase mt-0.5">{settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Số: ...... /BB-THCSLHL</div>
                </div>
                <div>
                  <div className="font-bold text-xs uppercase text-slate-700">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="text-[11px] font-semibold text-slate-600 underline underline-offset-4 mt-0.5">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="text-[11px] text-slate-500 italic mt-1">Hậu Lộc, ngày ..... tháng ..... năm 2026</div>
                </div>
              </div>

              <div className="text-center">
                <h4 className="font-extrabold text-base sm:text-lg uppercase text-blue-950">
                  BIÊN BẢN TỔNG HỢP & XẾP LOẠI THI ĐUA NỀ NẾP TUẦN {reportWeekModal}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Áp dụng cho 6 Phân hiệu và {classes.length} lớp học toàn trường
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">Điểm TB toàn trường</div>
                  <div className="text-lg font-black text-blue-950 tabular-nums">
                    {modalWeekData.stats.avgScore} đ
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">Lớp dẫn đầu toàn trường</div>
                  <div className="text-base font-extrabold text-blue-900">
                    {modalWeekData.stats.topClass?.classItem.name || '---'} ({modalWeekData.stats.topClass?.totalScore || 100}đ)
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">Tổng điểm thưởng</div>
                  <div className="text-lg font-black text-emerald-700 tabular-nums">
                    +{modalWeekData.stats.totalBonusPoints} đ
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">Tổng điểm vi phạm trừ</div>
                  <div className="text-lg font-black text-rose-700 tabular-nums">
                    -{modalWeekData.stats.totalPenaltyPoints} đ
                  </div>
                </div>
              </div>

              {/* Top 5 Ranked Classes Table */}
              <div>
                <h5 className="font-bold text-xs uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-500" />
                  <span>Danh sách 5 Lớp Xuất Sắc Nhất Tuần {reportWeekModal} (Trao cờ luân lưu)</span>
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Thứ hạng</th>
                        <th className="p-2.5">Tên lớp</th>
                        <th className="p-2.5">Phân hiệu</th>
                        <th className="p-2.5">GVCN</th>
                        <th className="p-2.5 text-right">Tổng điểm</th>
                        <th className="p-2.5 text-center">Xếp loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalWeekData.rankings.slice(0, 5).map((r, idx) => (
                        <tr key={r.classItem.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold">
                            {idx === 0 ? '🥇 Nhất tuần' : idx === 1 ? '🥈 Nhì tuần' : idx === 2 ? '🥉 Ba tuần' : `Hạng #${r.rank}`}
                          </td>
                          <td className="p-2.5 font-bold text-blue-900">Lớp {r.classItem.name}</td>
                          <td className="p-2.5 text-slate-600">{r.campus.name}</td>
                          <td className="p-2.5 text-slate-600">{r.classItem.homeroomTeacher}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-950 tabular-nums">
                            {r.totalScore} đ
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold">
                              {r.performanceTier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-3 text-center pt-8 pb-4">
                <div>
                  <div className="font-bold text-xs uppercase text-slate-700">BAN GIÁM HIỆU</div>
                  <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký và duyệt)</div>
                  <div className="h-16"></div>
                  <div className="font-bold text-xs text-slate-900">Thầy Nguyễn Văn Sơn</div>
                  <div className="text-[11px] text-slate-500 font-medium">Hiệu trưởng nhà trường</div>
                </div>
                <div>
                  <div className="font-bold text-xs uppercase text-slate-700">TỔNG PHỤ TRÁCH ĐỘI</div>
                  <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-bold text-xs text-slate-900">Cô Lê Thị Hoa</div>
                  <div className="text-[11px] text-slate-500 font-medium">Tổng Phụ Trách Đội</div>
                </div>
                <div>
                  <div className="font-bold text-xs uppercase text-slate-700">ĐỘI CỜ ĐỎ TRỰC BAN</div>
                  <div className="text-[11px] text-slate-400 italic mt-0.5">(Ký, ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-bold text-xs text-slate-900">Trưởng ban cờ đỏ</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Biên bản xuất tự động từ hệ thống LHL CLASS RANKING
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={15} />
                  <span>In biên bản này</span>
                </button>
                <button
                  onClick={() => setReportWeekModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Week Reason Modal */}
      {unlockWeekTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 lg:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Unlock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Mở Khóa Dữ Liệu Tuần {unlockWeekTarget.week}
                </h3>
                <p className="text-xs text-slate-500">
                  Quyền Quản trị viên cấp cao (Super Admin)
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Bảo mật dữ liệu đã chốt:</p>
              <p>
                Dữ liệu Tuần {unlockWeekTarget.week} đã được chốt và đóng băng. Thao tác mở khóa bắt buộc phải giải trình lý do chính đáng và sẽ được lưu trữ vĩnh viễn trong nhật ký kiểm toán hệ thống.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Lý do mở khóa <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={unlockWeekTarget.reason}
                onChange={(e) => setUnlockWeekTarget({ ...unlockWeekTarget, reason: e.target.value, error: undefined })}
                placeholder="Nhập lý do chi tiết (VD: Điều chỉnh biên bản vi phạm theo đơn khiếu nại được BGH phê duyệt)..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
              {unlockWeekTarget.error && (
                <p className="text-xs text-rose-600 font-medium">
                  {unlockWeekTarget.error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setUnlockWeekTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmUnlockWeek}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm cursor-pointer"
              >
                Xác nhận Mở Khóa Tuần
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
