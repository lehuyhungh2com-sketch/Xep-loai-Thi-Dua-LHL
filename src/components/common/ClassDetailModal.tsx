import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ClassItem, RankingEntry, ClassTitle } from '../../types';
import {
  X,
  Award,
  AlertTriangle,
  Plus,
  Minus,
  Calendar,
  UserCheck,
  ShieldCheck,
  Zap,
  TrendingUp,
  Medal,
  Trophy,
  Building,
  School,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface ClassDetailModalProps {
  classItem: ClassItem | null;
  rankingEntry?: RankingEntry | null;
  week?: number;
  onClose: () => void;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  classItem,
  rankingEntry,
  week = 4,
  onClose,
}) => {
  const {
    scoreLogs,
    campuses,
    settings,
    getClassWeeklyScore,
    getMonthRankingData,
    getSemesterRankingData,
    getYearRankingData,
    getTitleEvaluationData,
    isWeekLocked,
    isMonthLocked,
    isSemesterLocked,
    isYearLocked,
    disciplinaryRecords,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'trend' | 'weeks' | 'months' | 'logs'>('overview');
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(week);

  if (!classItem) return null;

  const campus = campuses.find((c) => c.id === classItem.campusId);

  // 1. Weekly Score Info for selected week
  const currentWeekScore = getClassWeeklyScore(classItem.id, selectedWeekNum);
  const weekLogs = scoreLogs.filter(
    (l) => l.classId === classItem.id && (Number(l.week) === Number(selectedWeekNum) || (l.period !== 'week' && l.period !== undefined))
  );
  const bonusLogs = weekLogs.filter((l) => l.type === 'bonus' || l.totalPoints > 0);
  const penaltyLogs = weekLogs.filter((l) => l.type === 'penalty' || l.totalPoints < 0);

  // All logs for this class throughout the school year
  const allClassesLogs = useMemo(() => {
    return scoreLogs.filter((l) => l.classId === classItem.id);
  }, [scoreLogs, classItem.id]);

  // Check disciplinary
  const classDisciplinary = useMemo(() => {
    return disciplinaryRecords.find((r) => r.classId === classItem.id);
  }, [disciplinaryRecords, classItem.id]);

  // 2. Month Scores (Months 9, 10, 11, 12, 1, 2, 3, 4)
  const monthScores = useMemo(() => {
    const months = [9, 10, 11, 12, 1, 2, 3, 4];
    return months.map((m) => {
      const monthData = getMonthRankingData(m, 'all', 'all');
      const row = monthData.rows.find((r) => r.classItem.id === classItem.id);
      const isLocked = isMonthLocked(m);
      return {
        month: m,
        score: row ? row.averageScore : null,
        rank: row ? row.rank : null,
        tier: row ? row.performanceTier : 'Chưa xếp loại',
        isLocked,
        weeksCount: row ? row.weekScores.length : 0,
      };
    });
  }, [getMonthRankingData, classItem.id, isMonthLocked]);

  // 3. Semester Scores (HKI, HKII)
  const semesterScores = useMemo(() => {
    const s1Data = getSemesterRankingData(1, 'all', 'all');
    const s2Data = getSemesterRankingData(2, 'all', 'all');
    const s1Row = s1Data.rows.find((r) => r.classItem.id === classItem.id);
    const s2Row = s2Data.rows.find((r) => r.classItem.id === classItem.id);

    return {
      s1: {
        score: s1Row ? s1Row.semesterScore : null,
        rank: s1Row ? s1Row.rank : null,
        tier: s1Row ? s1Row.performanceTier : 'Chưa xếp loại',
        isLocked: isSemesterLocked(1),
      },
      s2: {
        score: s2Row ? s2Row.semesterScore : null,
        rank: s2Row ? s2Row.rank : null,
        tier: s2Row ? s2Row.performanceTier : 'Chưa xếp loại',
        isLocked: isSemesterLocked(2),
      },
    };
  }, [getSemesterRankingData, classItem.id, isSemesterLocked]);

  // 4. Year Scores & Title Evaluation
  const yearData = useMemo(() => {
    const yearList = getYearRankingData('all', 'all');
    const row = yearList.rows.find((r) => r.classItem.id === classItem.id);
    const titleData = getTitleEvaluationData('all', 'all');
    const titleRow = titleData.rows.find((r) => r.classItem.id === classItem.id);

    return {
      yearScore: row ? row.yearScore : null,
      rank: row ? row.rank : null,
      isDisqualified: titleRow ? titleRow.hasDisciplinaryStudent : false,
      disqualificationReason: titleRow ? titleRow.disciplinaryDetails : undefined,
      isLocked: isYearLocked(),
      title: titleRow ? titleRow.title : ('KHÔNG ĐƯỢC XẾP LOẠI' as ClassTitle),
      evaluationStatus: titleRow ? titleRow.evaluationStatus : 'Chưa xét',
      titleNotes: titleRow ? titleRow.notes : '',
      specialAchievement: titleRow ? titleRow.specialAchievementNote : undefined,
    };
  }, [getYearRankingData, getTitleEvaluationData, classItem.id, isYearLocked]);

  // 5. Weekly Trend Data for Chart (Weeks 1 to current max week)
  const weeklyTrend = useMemo(() => {
    const weeksList = [1, 2, 3, 4]; // currently weeks with score data
    return weeksList.map((w) => {
      const s = getClassWeeklyScore(classItem.id, w);
      return {
        week: w,
        score: s.finalScore,
        bonus: s.bonusPoints,
        penalty: s.penaltyPoints,
        isLocked: isWeekLocked(w),
      };
    });
  }, [getClassWeeklyScore, classItem.id, isWeekLocked]);

  // Helper for title badge
  const getTitleBadge = (title: ClassTitle) => {
    switch (title) {
      case 'LỚP XUẤT SẮC':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <Trophy className="w-4 h-4 text-amber-600" />,
        };
      case 'LỚP TIÊN TIẾN':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: <Award className="w-4 h-4 text-emerald-600" />,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <AlertTriangle className="w-4 h-4 text-slate-500" />,
        };
    }
  };

  const titleBadge = getTitleBadge(yearData.title);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-up">
        {/* Header Section: Class & Campus Info */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
              {campus?.name || 'Phân hiệu'} ({campus?.type === 'main' ? 'Trường chính' : 'Phân hiệu vệ tinh'})
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              Khối {classItem.grade}
            </span>
            {classDisciplinary && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold flex items-center gap-1">
                <ShieldAlert size={12} /> Có QĐ Kỷ luật
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>Hồ Sơ Thi Đua Lớp {classItem.name}</span>
              </h2>
              <p className="text-xs text-blue-200/90 mt-1">
                GVCN: <strong>{classItem.homeroomTeacher || 'Chưa phân công'}</strong> • Lớp trưởng: <strong>{classItem.monitorName || 'Chưa cập nhật'}</strong> • Sĩ số: <strong>{classItem.studentCount} HS</strong> • Phòng: <strong>{classItem.roomNumber || 'N/A'}</strong>
              </p>
            </div>

            {/* Quick Badge Title */}
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-2xl border text-xs font-black flex items-center gap-1.5 bg-white text-slate-900 shadow-md`}>
                {titleBadge.icon}
                <span>{yearData.title}</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy size={14} className="text-amber-400" />
              <span>Tổng Quan & Danh Hiệu</span>
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'trend'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Biểu Đồ Biến Động</span>
            </button>
            <button
              onClick={() => setActiveTab('weeks')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'weeks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar size={14} className="text-blue-400" />
              <span>Điểm Tuần ({selectedWeekNum})</span>
            </button>
            <button
              onClick={() => setActiveTab('months')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'months'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Medal size={14} className="text-indigo-400" />
              <span>Điểm 8 Tháng</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText size={14} className="text-purple-400" />
              <span>Lịch Sử Cộng / Trừ ({allClassesLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: OVERVIEW & TITLE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Score Hierarchy Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Weekly Score */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Điểm Tuần {selectedWeekNum}
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {currentWeekScore.finalScore.toFixed(1)}đ
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    +{currentWeekScore.bonusPoints}đ • -{currentWeekScore.penaltyPoints}đ
                  </div>
                </div>

                {/* S1 Score */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Điểm Học Kỳ I
                  </div>
                  <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                    {semesterScores.s1.score !== null ? `${semesterScores.s1.score.toFixed(2)}đ` : 'Chưa đủ'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {semesterScores.s1.isLocked ? '🔒 Đã chốt' : 'Đang mở'}
                  </div>
                </div>

                {/* S2 Score */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Điểm Học Kỳ II
                  </div>
                  <div className="text-2xl font-black text-purple-700 font-mono mt-1">
                    {semesterScores.s2.score !== null ? `${semesterScores.s2.score.toFixed(2)}đ` : 'Chưa đủ'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {semesterScores.s2.isLocked ? '🔒 Đã chốt' : 'Đang mở'}
                  </div>
                </div>

                {/* Year Score */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-300 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Điểm Cả Năm
                  </div>
                  <div className="text-2xl font-black text-amber-900 font-mono mt-1">
                    {yearData.yearScore !== null ? `${yearData.yearScore.toFixed(2)}đ` : 'Chưa đủ'}
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                    (HKI + HKII × 2) / 3
                  </div>
                </div>
              </div>

              {/* Title Evaluation Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black text-slate-900">
                      KẾT QUẢ XÉT DANH HIỆU THI ĐUA CẢ NĂM
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${titleBadge.bg} flex items-center gap-1.5`}
                  >
                    {titleBadge.icon}
                    <span>{yearData.title}</span>
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                  <p>
                    ✓ <strong>Trạng thái dự xét:</strong> {yearData.evaluationStatus}
                  </p>
                  <p>
                    ✓ <strong>Ghi chú & Căn cứ:</strong> {yearData.titleNotes || 'Được phân bổ theo tỷ lệ cấu hình và điểm tổng kết cả năm.'}
                  </p>
                  {yearData.specialAchievement && (
                    <p className="text-indigo-700 font-semibold">
                      ⭐ <strong>Thành tích đặc cách (Trường chính):</strong> {yearData.specialAchievement}
                    </p>
                  )}
                  {classDisciplinary && (
                    <div className="text-rose-700 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        Lớp có học sinh <strong>{classDisciplinary.studentName}</strong> bị Hội đồng kỷ luật xử lý ({classDisciplinary.decisionNumber} ngày {classDisciplinary.decisionDate}) • Lý do: {classDisciplinary.reason}
                        <br />
                        <span className="text-[11px] font-normal">
                          Căn cứ quy chế: Lớp có học sinh bị Hội đồng kỷ luật thì KHÔNG ĐƯỢC XẾP LOẠI CẢ NĂM.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TREND CHART (Tuần -> Tháng -> Học kỳ -> Cả năm) */}
          {activeTab === 'trend' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>BIẾN ĐỘNG ĐIỂM THI ĐUA THEO THỜI GIAN</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi sự tiến bộ hoặc sụt giảm điểm nề nếp của lớp qua các tuần, tháng và học kỳ.
                </p>
              </div>

              {/* Weekly Trend Bar / Line Visualization */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="text-xs font-bold text-slate-700">
                  1. Điểm các tuần trong học kỳ:
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {weeklyTrend.map((item) => {
                    const heightPercent = Math.min(100, Math.max(20, (item.score / 100) * 100));
                    const isGood = item.score >= 90;
                    return (
                      <div
                        key={item.week}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-between text-center"
                      >
                        <span className="text-[11px] font-bold text-slate-500">
                          Tuần {item.week}
                        </span>
                        <div className="h-24 w-full flex items-end justify-center my-2">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-8 rounded-t-lg transition-all ${
                              isGood ? 'bg-emerald-500' : item.score >= 80 ? 'bg-blue-500' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                        <span className="text-sm font-black font-mono text-slate-900">
                          {item.score.toFixed(1)}đ
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {item.isLocked ? '🔒 Đã chốt' : 'Đang mở'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month Trend */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="text-xs font-bold text-slate-700">
                  2. Điểm tổng kết các tháng:
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {monthScores.map((m) => (
                    <div
                      key={m.month}
                      className="bg-white border border-slate-200 rounded-xl p-2.5 text-center"
                    >
                      <div className="text-[10px] font-bold text-slate-500">
                        Tháng {m.month}
                      </div>
                      <div className="text-xs font-black font-mono text-indigo-700 mt-1">
                        {m.score !== null ? `${m.score.toFixed(1)}đ` : '-'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {m.isLocked ? '🔒' : 'Mở'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semester & Year Summary Flow */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <span>HKI: {semesterScores.s1.score !== null ? `${semesterScores.s1.score.toFixed(1)}đ` : 'Chưa đủ'}</span>
                  <span>→</span>
                  <span>HKII: {semesterScores.s2.score !== null ? `${semesterScores.s2.score.toFixed(1)}đ` : 'Chưa đủ'}</span>
                  <span>→</span>
                  <span>Cả Năm: {yearData.yearScore !== null ? `${yearData.yearScore.toFixed(1)}đ` : 'Chưa đủ'}</span>
                </div>
                <span className="text-xs font-bold text-blue-700">
                  Công thức: (HKI + HKII × 2) / 3
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: WEEKS DETAILED SCORING */}
          {activeTab === 'weeks' && (
            <div className="space-y-4">
              {/* Week Selector Bar */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Chọn tuần để xem chi tiết:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeekNum(w)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedWeekNum === w
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      Tuần {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ribbon */}
              <div className="grid grid-cols-4 border border-slate-200 rounded-2xl bg-white p-3 text-center divide-x divide-slate-100">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Điểm gốc</div>
                  <div className="text-base font-bold text-slate-700">100</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 font-medium">Điểm thưởng (+)</div>
                  <div className="text-base font-bold text-emerald-600">+{currentWeekScore.bonusPoints}</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-600 font-medium">Điểm trừ (-)</div>
                  <div className="text-base font-bold text-rose-600">-{currentWeekScore.penaltyPoints}</div>
                </div>
                <div className="bg-indigo-50/50 rounded-r-xl">
                  <div className="text-[10px] text-indigo-700 font-bold">Tổng tuần {selectedWeekNum}</div>
                  <div className="text-lg font-black text-indigo-700">{currentWeekScore.finalScore.toFixed(1)}</div>
                </div>
              </div>

              {/* Penalty List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-700">
                  <span className="flex items-center gap-1">
                    <AlertTriangle size={14} />
                    <span>Lỗi vi phạm & Điểm trừ ({penaltyLogs.length})</span>
                  </span>
                  <span>Tổng trừ: -{currentWeekScore.penaltyPoints}đ</span>
                </div>
                {penaltyLogs.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">
                    ✓ Lớp không có vi phạm nào trong Tuần {selectedWeekNum}.
                  </div>
                ) : (
                  penaltyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-rose-900">{log.criteriaName}</span>
                        <span className="text-rose-700 font-mono">{log.totalPoints}đ</span>
                      </div>
                      {log.note && <p className="text-slate-600 italic text-[11px]">"{log.note}"</p>}
                      <div className="text-[10px] text-slate-400">
                        {log.date} • Ghi nhận: {log.recordedBy}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bonus List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span className="flex items-center gap-1">
                    <Award size={14} />
                    <span>Khen thưởng & Điểm cộng ({bonusLogs.length})</span>
                  </span>
                  <span>Tổng cộng: +{currentWeekScore.bonusPoints}đ</span>
                </div>
                {bonusLogs.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-slate-50 text-slate-500 text-xs border border-slate-100">
                    Chưa có điểm thưởng ghi nhận trong Tuần {selectedWeekNum}.
                  </div>
                ) : (
                  bonusLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-emerald-900">{log.criteriaName}</span>
                        <span className="text-emerald-700 font-mono">+{log.totalPoints}đ</span>
                      </div>
                      {log.note && <p className="text-slate-600 italic text-[11px]">"{log.note}"</p>}
                      <div className="text-[10px] text-slate-400">
                        {log.date} • Ghi nhận: {log.recordedBy}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MONTH SCORES */}
          {activeTab === 'months' && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900">
                BẢNG ĐIỂM 8 THÁNG TRONG NĂM HỌC
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Tháng</th>
                      <th className="py-2.5 px-3 text-center">Số tuần tính</th>
                      <th className="py-2.5 px-3 text-center">Điểm tháng</th>
                      <th className="py-2.5 px-3 text-center">Xếp hạng</th>
                      <th className="py-2.5 px-3 text-center">Xếp loại</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthScores.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          Tháng {m.month}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {m.weeksCount > 0 ? `${m.weeksCount} tuần` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-indigo-700">
                          {m.score !== null ? `${m.score.toFixed(2)}đ` : 'Chưa đủ DL'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {m.rank ? `Hạng ${m.rank}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {m.tier}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {m.isLocked ? (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                              🔒 Đã chốt
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Đang mở</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ALL LOGS HISTORY */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">
                  LỊCH SỬ TOÀN BỘ CÁC KHOẢN CỘNG / TRỪ CẢ NĂM
                </h3>
                <span className="text-xs text-slate-500">
                  Tổng số: <strong>{allClassesLogs.length}</strong> biên bản
                </span>
              </div>

              {allClassesLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  Chưa có ghi nhận nào cho lớp này.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {allClassesLogs.map((log) => {
                    const isPenalty = log.type === 'penalty' || log.totalPoints < 0;
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                          isPenalty
                            ? 'bg-rose-50/40 border-rose-100 text-rose-950'
                            : 'bg-emerald-50/40 border-emerald-100 text-emerald-950'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                isPenalty ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                              }`}
                            >
                              Tuần {log.week}
                            </span>
                            <span>{log.criteriaName}</span>
                          </div>
                          {log.note && <p className="text-slate-600 italic text-[11px]">"{log.note}"</p>}
                          <div className="text-[10px] text-slate-400">
                            Ngày: {log.date} • Ghi nhận: {log.recordedBy}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-black font-mono text-sm ${
                              isPenalty ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {isPenalty ? log.totalPoints : `+${log.totalPoints}`}đ
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Mã lớp: <strong>{classItem.id}</strong></span>
            <span>•</span>
            <span>Cơ sở: <strong>{campus?.name}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
