import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Trophy,
  Award,
  TrendingUp,
  School,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Search,
  Filter,
  Lock,
  Unlock,
  FileText,
  BarChart3,
  Sliders,
  Users2,
  ChevronLeft,
  Eye,
  Building,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { ClassDetailModal } from '../common/ClassDetailModal';
import { ClassItem, RankingEntry, ClassTitle } from '../../types';
import { exportDashboardOverviewExcel, DashboardExportData } from '../../utils/excelExporter';

type TimeScopeMode = 'week' | 'month' | 'semester' | 'year';

export const DashboardOverview: React.FC = () => {
  const {
    campuses,
    classes,
    scoreLogs,
    settings,
    selectedWeek,
    setSelectedWeek,
    selectedMonth,
    setSelectedMonth,
    selectedSemester,
    setSelectedSemester,
    setCurrentTab,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    getWeeklyRankings,
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
    redFlagDuties,
    campusWeeklyDuties,
    updateBriefingDeadline,
    navigateToScoring,
    currentUser,
    userRole,
  } = useApp();

  // State for Deadline Configuration Modal
  const [showDeadlineModal, setShowDeadlineModal] = useState<boolean>(false);
  const [deadlineDayInput, setDeadlineDayInput] = useState<string>('Thứ 6');
  const [deadlineTimeInput, setDeadlineTimeInput] = useState<string>('08:30');
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Modal inspection state
  const [inspectClass, setInspectClass] = useState<ClassItem | null>(null);

  // Time Scope Filter: 'week' | 'month' | 'semester' | 'year'
  const [timeScope, setTimeScope] = useState<TimeScopeMode>('week');
  const [activeWeek, setActiveWeek] = useState<number>(selectedWeek || 4);
  const [activeMonth, setActiveMonth] = useState<number>(selectedMonth || 9);
  const [activeSemester, setActiveSemester] = useState<1 | 2>(selectedSemester || 1);

  // Scope Filters: Campus & Grade
  const [filterCampusId, setFilterCampusId] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Class selection for Trend Chart (Requirement #6)
  const [trendClassId, setTrendClassId] = useState<string>(classes[0]?.id || '');

  // --------------------------------------------------------------------------
  // 1. TOP STATS (KPIs) - Requirement #1
  // - Tổng số lớp (59 lớp)
  // - Tổng số phân hiệu (6 phân hiệu)
  // - Số lớp đã có điểm tuần
  // - Số lớp đã chốt tháng
  // - Số lớp đã chốt học kỳ
  // - Số lớp đã chốt cả năm
  // --------------------------------------------------------------------------
  const topStats = useMemo(() => {
    const totalClasses = classes.length;
    const totalCampuses = campuses.length;

    // Số lớp đã có điểm tuần (trong tuần activeWeek)
    const weekScoredClasses = classes.filter((cls) => {
      const score = getClassWeeklyScore(cls.id, activeWeek);
      // Có biên bản chấm hoặc điểm khác 100
      const hasLogs = scoreLogs.some((l) => l.classId === cls.id && l.week === activeWeek);
      return hasLogs || score.penaltyPoints > 0 || score.bonusPoints > 0;
    }).length;

    // Số lớp đã chốt tháng (dựa trên tháng activeMonth hoặc các tháng đã chốt)
    const monthData = getMonthRankingData(activeMonth, 'all', 'all');
    const isCurMonthLocked = isMonthLocked(activeMonth);
    const monthLockedClasses = isCurMonthLocked ? totalClasses : (monthData?.rows || []).filter((r) => r.hasAllWeeksLocked).length;

    // Số lớp đã chốt học kỳ
    const semData = getSemesterRankingData(activeSemester, 'all', 'all');
    const isCurSemLocked = isSemesterLocked(activeSemester);
    const semesterLockedClasses = isCurSemLocked ? totalClasses : (semData?.rows || []).filter((r) => r.hasAllMonthsLocked).length;

    // Số lớp đã chốt cả năm
    const yearLocked = isYearLocked();
    const yearLockedClasses = yearLocked ? totalClasses : 0;

    return {
      totalClasses,
      totalCampuses,
      weekScoredClasses,
      monthLockedClasses,
      semesterLockedClasses,
      yearLockedClasses,
      isCurWeekLocked: isWeekLocked(activeWeek),
      isCurMonthLocked,
      isCurSemLocked,
      yearLocked,
    };
  }, [
    classes,
    campuses,
    activeWeek,
    activeMonth,
    activeSemester,
    getClassWeeklyScore,
    scoreLogs,
    getMonthRankingData,
    getSemesterRankingData,
    isWeekLocked,
    isMonthLocked,
    isSemesterLocked,
    isYearLocked,
  ]);

  // --------------------------------------------------------------------------
  // 2. 6 THẺ PHÂN HIỆU - Requirement #2 & #9
  // 1. Lê Hữu Lập (Trường chính)
  // 2. Hậu Lộc
  // 3. Lộc Tân
  // 4. Lộc Sơn
  // 5. Mỹ Lộc
  // 6. Thuần Lộc
  // Mỗi thẻ: Tên, Số lớp, Điểm TB hiện tại, Lớp dẫn đầu, Số lớp chưa nhập điểm, Trạng thái
  // --------------------------------------------------------------------------
  const campusCards = useMemo(() => {
    return campuses.map((campus) => {
      const campusClasses = classes.filter((c) => c.campusId === campus.id);
      const classCount = campusClasses.length;

      // Calculate scores for this campus according to current timeScope
      let scoresList: { classItem: ClassItem; score: number | null }[] = [];
      let dataStatus = 'Đang mở';

      if (timeScope === 'week') {
        const isLocked = isWeekLocked(activeWeek);
        dataStatus = isLocked ? 'Đã chốt khóa' : 'Đang cập nhật';
        scoresList = campusClasses.map((cls) => {
          const s = getClassWeeklyScore(cls.id, activeWeek);
          return { classItem: cls, score: s.finalScore };
        });
      } else if (timeScope === 'month') {
        const mData = getMonthRankingData(activeMonth, campus.id, 'all');
        const isLocked = isMonthLocked(activeMonth);
        dataStatus = isLocked ? 'Đã chốt khóa' : 'Chưa chốt tháng';
        scoresList = campusClasses.map((cls) => {
          const row = mData.rows.find((r) => r.classItem.id === cls.id);
          return { classItem: cls, score: row ? row.averageScore : null };
        });
      } else if (timeScope === 'semester') {
        const sData = getSemesterRankingData(activeSemester, campus.id, 'all');
        const isLocked = isSemesterLocked(activeSemester);
        dataStatus = isLocked ? 'Đã chốt khóa' : 'Chưa chốt HK';
        scoresList = campusClasses.map((cls) => {
          const row = sData.rows.find((r) => r.classItem.id === cls.id);
          return { classItem: cls, score: row ? row.semesterScore : null };
        });
      } else {
        // 'year'
        const yData = getYearRankingData(campus.id, 'all');
        const isLocked = isYearLocked();
        dataStatus = isLocked ? 'Đã chốt cả năm' : 'Chưa chốt năm';
        scoresList = campusClasses.map((cls) => {
          const row = yData.rows.find((r) => r.classItem.id === cls.id);
          return { classItem: cls, score: row ? row.yearScore : null };
        });
      }

      // Valid scores
      const validScores = scoresList.filter((s) => s.score !== null) as { classItem: ClassItem; score: number }[];
      const avgScore = validScores.length > 0
        ? validScores.reduce((sum, item) => sum + item.score, 0) / validScores.length
        : 0;

      // Leader class in campus
      let topClass = 'Chưa có';
      let topClassScore = 0;
      if (validScores.length > 0) {
        const sorted = [...validScores].sort((a, b) => b.score - a.score);
        topClass = sorted[0].classItem.name;
        topClassScore = sorted[0].score;
      }

      // Classes without logs/unsubmitted in this period
      const unsubmittedCount = campusClasses.filter((cls) => {
        if (timeScope === 'week') {
          const hasLogs = scoreLogs.some((l) => l.classId === cls.id && l.week === activeWeek);
          return !hasLogs;
        }
        return false;
      }).length;

      return {
        id: campus.id,
        name: campus.name,
        code: campus.code,
        type: campus.type,
        leaderName: campus.leaderName,
        classCount,
        avgScore: Number(avgScore.toFixed(2)),
        topClass,
        topClassScore,
        unsubmittedCount,
        dataStatus,
        isSelected: filterCampusId === campus.id,
      };
    });
  }, [
    campuses,
    classes,
    timeScope,
    activeWeek,
    activeMonth,
    activeSemester,
    filterCampusId,
    getClassWeeklyScore,
    getMonthRankingData,
    getSemesterRankingData,
    getYearRankingData,
    isWeekLocked,
    isMonthLocked,
    isSemesterLocked,
    isYearLocked,
    scoreLogs,
  ]);

  // Overall School Average for current timeScope
  const schoolAverageScore = useMemo(() => {
    const totalAvgs = campusCards.map((c) => c.avgScore).filter((s) => s > 0);
    if (totalAvgs.length === 0) return 0;
    return Number((totalAvgs.reduce((a, b) => a + b, 0) / totalAvgs.length).toFixed(2));
  }, [campusCards]);

  // --------------------------------------------------------------------------
  // 3. TABLE RANKINGS - Requirement #4
  // STT | Lớp | Phân hiệu | Điểm | Xếp hạng | Danh hiệu / Xếp loại
  // --------------------------------------------------------------------------
  const allRankings = useMemo(() => {
    // Title evaluations for whole school
    const titleData = getTitleEvaluationData('all', 'all');
    const titleMap = new Map(titleData.rows.map((r) => [r.classItem.id, r]));

    if (timeScope === 'week') {
      const rows = getWeeklyRankings(activeWeek, filterCampusId, filterGrade);
      return rows.map((r, index) => {
        const titleRow = titleMap.get(r.classItem.id);
        return {
          stt: index + 1,
          classItem: r.classItem,
          campus: r.campus,
          score: r.totalScore,
          scoreFormatted: `${r.totalScore.toFixed(1)}đ`,
          rank: r.rank,
          titleOrTier: r.performanceTier || 'Đang chấm',
          tierType: r.performanceTier,
          title: titleRow?.title,
          notes: r.bonusPoints > 0 || r.penaltyPoints > 0
            ? `+${r.bonusPoints}đ / -${r.penaltyPoints}đ`
            : 'Chưa có biến động điểm',
        };
      });
    } else if (timeScope === 'month') {
      const mData = getMonthRankingData(activeMonth, filterCampusId, filterGrade);
      return mData.rows.map((r, index) => {
        const titleRow = titleMap.get(r.classItem.id);
        return {
          stt: index + 1,
          classItem: r.classItem,
          campus: r.campus,
          score: r.averageScore,
          scoreFormatted: `${r.averageScore.toFixed(2)}đ`,
          rank: r.rank,
          titleOrTier: r.performanceTier,
          tierType: r.performanceTier,
          title: titleRow?.title,
          notes: `${r.lockedWeeksCount}/${r.totalWeeksInMonth} tuần đã chốt`,
        };
      });
    } else if (timeScope === 'semester') {
      const sData = getSemesterRankingData(activeSemester, filterCampusId, filterGrade);
      return sData.rows.map((r, index) => {
        const titleRow = titleMap.get(r.classItem.id);
        return {
          stt: index + 1,
          classItem: r.classItem,
          campus: r.campus,
          score: r.semesterScore,
          scoreFormatted: `${r.semesterScore.toFixed(2)}đ`,
          rank: r.rank,
          titleOrTier: r.performanceTier,
          tierType: r.performanceTier,
          title: titleRow?.title,
          notes: `${r.lockedMonthsCount}/${r.totalMonthsInSemester} tháng đã chốt`,
        };
      });
    } else {
      // 'year'
      const yData = getYearRankingData(filterCampusId, filterGrade);
      return yData.rows.map((r, index) => {
        const titleRow = titleMap.get(r.classItem.id);
        return {
          stt: index + 1,
          classItem: r.classItem,
          campus: r.campus,
          score: r.yearScore !== null ? r.yearScore : 0,
          scoreFormatted: r.yearScore !== null ? `${r.yearScore.toFixed(2)}đ` : 'Chưa đủ DL',
          rank: r.rank > 0 ? r.rank : 'Chưa xếp hạng',
          titleOrTier: titleRow?.title || 'KHÔNG ĐƯỢC XẾP LOẠI',
          tierType: r.performanceTier,
          title: titleRow?.title,
          notes: titleRow?.notes || r.displayScoreText,
        };
      });
    }
  }, [
    timeScope,
    activeWeek,
    activeMonth,
    activeSemester,
    filterCampusId,
    filterGrade,
    getWeeklyRankings,
    getMonthRankingData,
    getSemesterRankingData,
    getYearRankingData,
    getTitleEvaluationData,
  ]);

  // Filter rankings by search query
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return allRankings;
    const q = searchQuery.toLowerCase().trim();
    return allRankings.filter(
      (r) =>
        r.classItem.name.toLowerCase().includes(q) ||
        (r.classItem.homeroomTeacher || '').toLowerCase().includes(q) ||
        r.campus.name.toLowerCase().includes(q)
    );
  }, [allRankings, searchQuery]);

  // --------------------------------------------------------------------------
  // 4. TREND CHART DATA FOR SELECTED CLASS - Requirement #6
  // Tuần → Tháng → Học kỳ → Cả năm
  // --------------------------------------------------------------------------
  const trendData = useMemo(() => {
    const targetClass = classes.find((c) => c.id === trendClassId) || classes[0];
    if (!targetClass) return null;

    // 4 Weeks Scores
    const weeksList = [1, 2, 3, 4].map((w) => {
      const s = getClassWeeklyScore(targetClass.id, w);
      return { label: `T${w}`, fullLabel: `Tuần ${w}`, score: s.finalScore, type: 'week' as const };
    });

    // Month Scores (Months 9, 10, 11)
    const monthsList = [9, 10, 11].map((m) => {
      const mData = getMonthRankingData(m, 'all', 'all');
      const row = mData?.rows?.find((r) => r.classItem.id === targetClass.id);
      return {
        label: `Th.${m}`,
        fullLabel: `Tháng ${m}`,
        score: row ? row.averageScore : null,
        type: 'month' as const,
      };
    });

    // Semesters
    const s1Data = getSemesterRankingData(1, 'all', 'all');
    const s2Data = getSemesterRankingData(2, 'all', 'all');
    const s1Row = s1Data?.rows?.find((r) => r.classItem.id === targetClass.id);
    const s2Row = s2Data?.rows?.find((r) => r.classItem.id === targetClass.id);

    const semList = [
      {
        label: 'HKI',
        fullLabel: 'Học kỳ I',
        score: s1Row ? s1Row.semesterScore : null,
        type: 'semester' as const,
      },
      {
        label: 'HKII',
        fullLabel: 'Học kỳ II',
        score: s2Row ? s2Row.semesterScore : null,
        type: 'semester' as const,
      },
    ];

    // Year Score
    const yearList = getYearRankingData('all', 'all');
    const yearRow = yearList.rows.find((r) => r.classItem.id === targetClass.id);
    const yearItem = {
      label: 'Cả năm',
      fullLabel: 'Tổng kết cả năm',
      score: yearRow ? yearRow.yearScore : null,
      type: 'year' as const,
    };

    const allPoints = [...weeksList, ...monthsList, ...semList, yearItem];

    // Determine direction
    const validPoints = allPoints.filter((p) => p.score !== null) as { label: string; fullLabel: string; score: number }[];
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (validPoints.length >= 2) {
      const last = validPoints[validPoints.length - 1].score;
      const prev = validPoints[validPoints.length - 2].score;
      if (last > prev + 0.5) trendDirection = 'up';
      else if (last < prev - 0.5) trendDirection = 'down';
    }

    return {
      targetClass,
      campus: campuses.find((c) => c.id === targetClass.campusId),
      allPoints,
      validPoints,
      trendDirection,
    };
  }, [
    trendClassId,
    classes,
    campuses,
    getClassWeeklyScore,
    getMonthRankingData,
    getSemesterRankingData,
    getYearRankingData,
  ]);

  // --------------------------------------------------------------------------
  // 5. CẢNH BÁO THI ĐUA NỀ NẾP TOÀN TRƯỜNG - Requirement #7
  // - Lớp chưa nhập dữ liệu
  // - Lớp chưa chốt tuần
  // - Lớp chưa chốt tháng
  // - Dữ liệu còn thiếu
  // - Lớp có điểm giảm mạnh so với kỳ trước (> 3 điểm)
  // --------------------------------------------------------------------------
  const alertsList = useMemo(() => {
    const alerts: {
      id: string;
      level: 'error' | 'warning' | 'info';
      title: string;
      desc: string;
      classesCount?: number;
      actionText?: string;
      actionTab?: string;
    }[] = [];

    // 1. Lớp chưa nhập dữ liệu tuần này
    const unenteredWeekClasses = classes.filter((cls) => {
      const hasLogs = scoreLogs.some((l) => l.classId === cls.id && l.week === activeWeek);
      return !hasLogs;
    });
    if (unenteredWeekClasses.length > 0) {
      alerts.push({
        id: 'unentered_week',
        level: 'warning',
        title: `Có ${unenteredWeekClasses.length} lớp chưa có biên bản chấm điểm trong Tuần ${activeWeek}`,
        desc: `Cần liên hệ Đội cờ đỏ và Ban Thi đua để cập nhật đầy đủ điểm nề nếp cho các lớp (ví dụ: ${unenteredWeekClasses.slice(0, 4).map((c) => c.name).join(', ')}${unenteredWeekClasses.length > 4 ? '...' : ''}).`,
        classesCount: unenteredWeekClasses.length,
        actionText: 'Đến trang Nhập điểm',
        actionTab: 'scoring',
      });
    }

    // 2. Cảnh báo tuần chưa chốt khóa
    if (!isWeekLocked(activeWeek)) {
      alerts.push({
        id: 'week_unlocked',
        level: 'info',
        title: `Tuần ${activeWeek} đang mở (Chưa chốt khóa)`,
        desc: 'Tổng phụ trách Đội cần hoàn thiện biên bản và thực hiện Chốt dữ liệu Tuần sau khi giải quyết các phản hồi nề nếp.',
        actionText: 'Đến Chốt Dữ Liệu',
        actionTab: 'datalock',
      });
    }

    // 3. Cảnh báo tháng chưa chốt khóa
    if (!isMonthLocked(activeMonth)) {
      alerts.push({
        id: 'month_unlocked',
        level: 'info',
        title: `Tháng ${activeMonth} chưa được Ban Giám Hiệu chốt khóa`,
        desc: 'Dữ liệu xếp hạng tháng cần được chốt để làm căn cứ tính điểm thi đua học kỳ.',
        actionText: 'Đến Xếp Hạng Tháng',
        actionTab: 'month_rankings',
      });
    }

    // 4. Lớp có học sinh bị Hội đồng kỷ luật xử lý (Yêu cầu nghiêm ngặt)
    if (disciplinaryRecords.length > 0) {
      alerts.push({
        id: 'disciplinary_alert',
        level: 'error',
        title: `Cảnh báo kỷ luật: ${disciplinaryRecords.length} quyết định Hội đồng kỷ luật được ghi nhận`,
        desc: `Theo quy chế thi đua: Lớp có học sinh bị Hội đồng kỷ luật thì KHÔNG ĐƯỢC XẾP LOẠI CẢ NĂM (Các lớp: ${Array.from(new Set(disciplinaryRecords.map((r) => r.className))).join(', ')}).`,
        classesCount: disciplinaryRecords.length,
        actionText: 'Xem Hội đồng kỷ luật',
        actionTab: 'title_evaluation',
      });
    }

    // 5. Lớp có điểm giảm mạnh so với tuần trước (sụt giảm > 3 điểm)
    if (activeWeek > 1) {
      const dropClasses: { name: string; drop: number }[] = [];
      classes.forEach((cls) => {
        const curScore = getClassWeeklyScore(cls.id, activeWeek).finalScore;
        const prevScore = getClassWeeklyScore(cls.id, activeWeek - 1).finalScore;
        const diff = prevScore - curScore;
        if (diff >= 3) {
          dropClasses.push({ name: cls.name, drop: Number(diff.toFixed(1)) });
        }
      });

      if (dropClasses.length > 0) {
        dropClasses.sort((a, b) => b.drop - a.drop);
        alerts.push({
          id: 'score_drop',
          level: 'warning',
          title: `Phát hiện ${dropClasses.length} lớp có điểm nề nếp giảm mạnh so với Tuần ${activeWeek - 1}`,
          desc: `Các lớp sụt giảm nhiều nhất: ${dropClasses.slice(0, 5).map((d) => `Lớp ${d.name} (giảm ${d.drop}đ)`).join(' • ')}. Cần GVCN và Chi đội chú trọng chấn chỉnh nề nếp.`,
          classesCount: dropClasses.length,
        });
      }
    }

    return alerts;
  }, [
    classes,
    scoreLogs,
    activeWeek,
    activeMonth,
    isWeekLocked,
    isMonthLocked,
    disciplinaryRecords,
    getClassWeeklyScore,
  ]);

  // --------------------------------------------------------------------------
  // NHẮC NHỞ NHẬP ĐIỂM GIAO BAN TUẦN (Thứ Sáu - 08:30 mặc định, cấu hình theo tuần)
  // --------------------------------------------------------------------------
  const weeklyBriefingStatus = useMemo(() => {
    const targetWeek = activeWeek || selectedWeek || 4;
    const campusStatus = campuses.map((campus) => {
      const duty = campusWeeklyDuties.find((d) => d.week === targetWeek && d.campusId === campus.id);
      const logsCount = scoreLogs.filter((l) => l.campusId === campus.id && l.week === targetWeek).length;
      return {
        campus,
        dutyClass: duty ? { name: duty.className, teacher: duty.homeroomTeacher, classId: duty.classId } : null,
        logsCount,
        hasSubmitted: logsCount > 0,
        deadlineDay: duty?.briefingDeadlineDay || 'Thứ 6',
        deadlineTime: duty?.briefingDeadlineTime || '08:30',
      };
    });

    const pendingCampuses = campusStatus.filter((c) => !c.hasSubmitted);
    const deadlineDay = campusStatus[0]?.deadlineDay || 'Thứ 6';
    const deadlineTime = campusStatus[0]?.deadlineTime || '08:30';

    return {
      targetWeek,
      campusStatus,
      pendingCampuses,
      isAllSubmitted: pendingCampuses.length === 0,
      deadlineDay,
      deadlineTime,
    };
  }, [campuses, campusWeeklyDuties, scoreLogs, activeWeek, selectedWeek]);

  // --------------------------------------------------------------------------
  // 6. EXPORT / PRINT ACTIONS - Requirement #10
  // --------------------------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const timeScopeLabel =
      timeScope === 'week'
        ? `Tuần ${activeWeek}`
        : timeScope === 'month'
        ? `Tháng ${activeMonth}`
        : timeScope === 'semester'
        ? `Học kỳ ${activeSemester === 1 ? 'I' : 'II'}`
        : `Cả năm ${settings.academicYear}`;

    const campusLabel =
      filterCampusId === 'all'
        ? 'Toàn trường (Tất cả 6 phân hiệu)'
        : campuses.find((c) => c.id === filterCampusId)?.name || 'Cơ sở';

    const gradeLabel = filterGrade === 'all' ? 'Tất cả các khối' : `Khối ${filterGrade}`;

    const exportPayload: DashboardExportData = {
      academicYear: settings.academicYear,
      timeScopeLabel,
      campusFilterLabel: campusLabel,
      gradeFilterLabel: gradeLabel,
      kpiStats: {
        totalClasses: topStats.totalClasses,
        totalCampuses: topStats.totalCampuses,
        weekScoredCount: topStats.weekScoredClasses,
        monthLockedCount: topStats.monthLockedClasses,
        semesterLockedCount: topStats.semesterLockedClasses,
        yearLockedCount: topStats.yearLockedClasses,
      },
      campusCards: campusCards.map((c) => ({
        name: c.name,
        classCount: c.classCount,
        avgScore: c.avgScore,
        topClass: c.topClass,
        topClassScore: c.topClassScore,
        unsubmittedCount: c.unsubmittedCount,
        dataStatus: c.dataStatus,
      })),
      rankingRows: filteredRankings.map((r) => ({
        stt: r.stt,
        className: r.classItem.name,
        campusName: r.campus.name,
        score: r.scoreFormatted,
        rank: r.rank,
        titleOrTier: r.titleOrTier,
        notes: r.notes,
      })),
      governingBody: settings.governingBody || '',
      schoolName: settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP',
    };

    exportDashboardOverviewExcel(exportPayload);
  };

  // Click on a campus card to filter by that campus (Requirement #9)
  const handleSelectCampusCard = (campusId: string) => {
    if (filterCampusId === campusId) {
      setFilterCampusId('all');
    } else {
      setFilterCampusId(campusId);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* -------------------------------------------------------------------- */}
      {/* HEADER HERO BANNER */}
      {/* -------------------------------------------------------------------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
              <Building className="w-3.5 h-3.5" />
              <span>Hệ Thống Quản Lý Thi Đua Nề Nếp Toàn Trường &amp; 6 Phân Hiệu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
              <span>{settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}</span>
              <span className="text-amber-400 text-xl sm:text-2xl font-bold font-mono">
                {settings.academicYear}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed max-w-3xl">
              Trung tâm điều hành và tổng hợp dữ liệu thi đua từ <strong>Đội cờ đỏ</strong>, <strong>Xếp hạng tuần</strong>, <strong>Xếp hạng tháng</strong>, <strong>Xếp hạng học kỳ</strong>, <strong>Xếp hạng cả năm</strong> và <strong>Xét danh hiệu lớp</strong>.
            </p>
          </div>

          {/* Action Toolbar (Requirement #10) */}
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0 no-print">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              <span>In Báo Cáo / Xuất PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification khi BGH/TPT gửi nhắc nhở */}
      {reminderToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{reminderToast}</span>
          <button
            onClick={() => setReminderToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* CẢNH BÁO NỔI BẬT: NHẮC NHỞ NHẬP ĐIỂM GIAO BAN TUẦN */}
      {/* -------------------------------------------------------------------- */}
      <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
        !weeklyBriefingStatus.isAllSubmitted
          ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/5 border-amber-300'
          : 'bg-emerald-50/70 border-emerald-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              !weeklyBriefingStatus.isAllSubmitted
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-emerald-600 text-white'
            }`}>
              <Clock className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  {!weeklyBriefingStatus.isAllSubmitted
                    ? `NHẮC NHỞ: LỚP TRỰC CHƯA CẬP NHẬT ĐIỂM GIAO BAN TUẦN ${weeklyBriefingStatus.targetWeek}`
                    : `TIẾN ĐỘ THI ĐUA GIAO BAN TUẦN ${weeklyBriefingStatus.targetWeek}: 100% ĐÃ HOÀN TẤT`}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Hạn chót: {weeklyBriefingStatus.deadlineDay} – {weeklyBriefingStatus.deadlineTime}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {!weeklyBriefingStatus.isAllSubmitted
                  ? `Có ${weeklyBriefingStatus.pendingCampuses.length} phân hiệu chưa cập nhật biên bản thi đua tuần này. GVCN lớp trực tuần và Đội cờ đỏ cần khẩn trương nhập điểm trước thời gian giao ban.`
                  : `Tất cả ${campuses.length} phân hiệu đã ghi nhận biên bản nề nếp thi đua Tuần ${weeklyBriefingStatus.targetWeek}. Số liệu đã sẵn sàng cho buổi giao ban Liên đội.`}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                setDeadlineDayInput(weeklyBriefingStatus.deadlineDay);
                setDeadlineTimeInput(weeklyBriefingStatus.deadlineTime);
                setShowDeadlineModal(true);
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs cursor-pointer transition-all flex items-center gap-1.5"
              title="Cấu hình hạn chót nộp điểm cho tuần này"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>Cấu hình hạn nộp</span>
            </button>

            <button
              onClick={() => navigateToScoring({ week: weeklyBriefingStatus.targetWeek })}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Vào Nhập Điểm Ngay</span>
            </button>
          </div>
        </div>

        {/* CẢNH BÁO ĐỎ THEO YÊU CẦU CHO TỪNG PHÂN HIỆU CHƯA HOÀN THÀNH */}
        {weeklyBriefingStatus.pendingCampuses.length > 0 && (
          <div className="mt-4 space-y-2">
            {weeklyBriefingStatus.pendingCampuses.map((st) => (
              <div
                key={`alert_red_${st.campus.id}`}
                className="p-3 bg-rose-600 text-white rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
                  <span className="font-bold leading-snug">
                    {st.campus.name} - Lớp trực tuần {st.dutyClass?.name || 'Chưa xếp'} chưa hoàn thành nhập điểm thi đua tuần {weeklyBriefingStatus.targetWeek}. Thời hạn: {st.deadlineDay}, {st.deadlineTime} {st.dutyClass?.teacher ? `(GVCN: ${st.dutyClass.teacher})` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {['super_admin', 'bgh', 'tpt_doi', 'campus_admin'].includes(userRole) && (
                    <button
                      onClick={() => {
                        const teacherInfo = st.dutyClass?.teacher ? `GVCN ${st.dutyClass.teacher}` : 'GVCN lớp trực';
                        setReminderToast(
                          `📢 Đã gửi thông báo nhắc nhở khẩn tới ${teacherInfo} (Lớp trực ${st.dutyClass?.name || ''} - ${st.campus.name}) hoàn thành nhập điểm trước ${st.deadlineDay}, ${st.deadlineTime}!`
                        );
                        setTimeout(() => setReminderToast(null), 5000);
                      }}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg border border-white/30 transition-all flex items-center gap-1 cursor-pointer"
                      title="Gửi thông báo nhắc nhở tới GVCN lớp trực"
                    >
                      <span>📢 Gửi nhắc nhở</span>
                    </button>
                  )}

                  <button
                    onClick={() => navigateToScoring({ campusId: st.campus.id, week: weeklyBriefingStatus.targetWeek })}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Nhập điểm ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campuses Status Grid */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {weeklyBriefingStatus.campusStatus.map((st) => (
            <div
              key={st.campus.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                !st.hasSubmitted
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-medium'
                  : 'bg-white/80 border-slate-200 text-slate-800'
              }`}
            >
              <div className="truncate min-w-0 mr-2">
                <span className="font-extrabold block truncate">{st.campus.name}</span>
                <span className="text-[11px] text-slate-500 block truncate">
                  Lớp trực: <strong>{st.dutyClass?.name || 'Chưa xếp'}</strong> ({st.dutyClass?.teacher || 'Chưa rõ'})
                </span>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {st.hasSubmitted ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đã có {st.logsCount} bản ghi</span>
                  </span>
                ) : (
                  <button
                    onClick={() => navigateToScoring({ campusId: st.campus.id, week: weeklyBriefingStatus.targetWeek })}
                    className="text-[11px] font-extrabold text-rose-700 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                  >
                    ⚠️ Chưa nhập
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Cấu hình Hạn giao ban */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Cấu hình hạn chót nộp điểm Tuần {weeklyBriefingStatus.targetWeek}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDeadlineModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Mặc định: <strong>Thứ Sáu – 08:30</strong>. Bạn có thể tùy chỉnh ngày và giờ họp giao ban cho riêng Tuần {weeklyBriefingStatus.targetWeek}.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày giao ban trong tuần:</label>
                <select
                  value={deadlineDayInput}
                  onChange={(e) => setDeadlineDayInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500 cursor-pointer"
                >
                  {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Giờ giao ban:</label>
                <input
                  type="time"
                  value={deadlineTimeInput}
                  onChange={(e) => setDeadlineTimeInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateBriefingDeadline(weeklyBriefingStatus.targetWeek, deadlineDayInput, deadlineTimeInput);
                    setShowDeadlineModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* 1. TOP STATS CARDS (Requirement #1) */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Classes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổng số lớp</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {topStats.totalClasses}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Toàn bộ 4 khối (6, 7, 8, 9)
          </div>
        </div>

        {/* Total Campuses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổng phân hiệu</span>
            <School className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-2">
            {topStats.totalCampuses}
          </div>
          <div className="text-[11px] text-indigo-600/90 mt-0.5 font-semibold">
            1 Chính + 5 Phân hiệu
          </div>
        </div>

        {/* Week Scored Classes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-emerald-50/40 to-white">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Đã có điểm tuần</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
            {topStats.weekScoredClasses} <span className="text-sm font-semibold text-slate-500">/ {topStats.totalClasses}</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-semibold mt-0.5 flex items-center gap-1">
            <span>Tuần {activeWeek}: {topStats.isCurWeekLocked ? '🔒 Đã chốt' : 'Đang mở'}</span>
          </div>
        </div>

        {/* Month Locked Classes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-blue-50/40 to-white">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>Đã chốt tháng</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">
            {topStats.monthLockedClasses} <span className="text-sm font-semibold text-slate-500">/ {topStats.totalClasses}</span>
          </div>
          <div className="text-[11px] text-blue-800 font-semibold mt-0.5">
            Tháng {activeMonth}: {topStats.isCurMonthLocked ? '🔒 Đã chốt' : 'Chưa chốt'}
          </div>
        </div>

        {/* Semester Locked Classes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-purple-50/40 to-white">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span>Đã chốt học kỳ</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-2">
            {topStats.semesterLockedClasses} <span className="text-sm font-semibold text-slate-500">/ {topStats.totalClasses}</span>
          </div>
          <div className="text-[11px] text-purple-800 font-semibold mt-0.5">
            HK{activeSemester === 1 ? 'I' : 'II'}: {topStats.isCurSemLocked ? '🔒 Đã chốt' : 'Chưa chốt'}
          </div>
        </div>

        {/* Year Locked Classes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>Đã chốt cả năm</span>
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
            {topStats.yearLockedClasses} <span className="text-sm font-semibold text-slate-500">/ {topStats.totalClasses}</span>
          </div>
          <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
            {topStats.yearLocked ? '🔒 Cả năm đã chốt' : 'Chưa chốt cả năm'}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. 6 THẺ PHÂN HIỆU (Requirement #2 & #9) */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-700" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              TÌNH HÌNH THI ĐUA 6 PHÂN HIỆU (Yêu cầu #2)
            </h2>
            <span className="text-xs text-slate-500">
              (Bấm vào thẻ phân hiệu để xem số liệu riêng của phân hiệu đó - Yêu cầu #9)
            </span>
          </div>

          {filterCampusId !== 'all' && (
            <button
              onClick={() => setFilterCampusId('all')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>✕ Xem lại Toàn trường (Tất cả 6 phân hiệu)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {campusCards.map((c, idx) => (
            <div
              key={c.id}
              onClick={() => handleSelectCampusCard(c.id)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer relative overflow-hidden group ${
                c.isSelected
                  ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-500/30'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    #{idx + 1}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                    {c.name}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {c.type === 'main' ? 'Trường chính' : 'Phân hiệu'} • {c.classCount} lớp
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.dataStatus.includes('Đã chốt')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {c.dataStatus}
                </span>
              </div>

              {/* Score Metric */}
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500">Điểm trung bình:</span>
                  <span className="text-lg font-black font-mono text-blue-700">
                    {c.avgScore.toFixed(2)}đ
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Lớp dẫn đầu:</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Lớp {c.topClass} ({c.topClassScore.toFixed(1)}đ)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Chưa nhập điểm:</span>
                  <span
                    className={`font-bold ${
                      c.unsubmittedCount > 0 ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  >
                    {c.unsubmittedCount} lớp
                  </span>
                </div>
              </div>

              {/* Selected indicator */}
              {c.isSelected && (
                <div className="mt-2 text-[10px] font-bold text-blue-700 text-center bg-blue-100/70 py-1 rounded-lg">
                  ✓ Đang lọc riêng phân hiệu này
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. CHARTS SECTION (Requirements #5 & #6) */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requirement #5: BIỂU ĐỒ SO SÁNH ĐIỂM GIỮA 6 PHÂN HIỆU */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  SO SÁNH ĐIỂM TRUNG BÌNH 6 PHÂN HIỆU (Yêu cầu #5)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Mốc TB toàn trường: <strong className="text-blue-700">{schoolAverageScore.toFixed(2)}đ</strong>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đối chiếu thành tích thi đua nề nếp giữa 6 cơ sở. Bấm vào cột để lọc dữ liệu.
            </p>
          </div>

          {/* Bar Chart Visualization */}
          <div className="space-y-3 pt-2">
            {campusCards.map((c) => {
              const scorePercent = Math.min(100, Math.max(10, ((c.avgScore - 70) / 30) * 100));
              const isAboveAvg = c.avgScore >= schoolAverageScore;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCampusCard(c.id)}
                  className="space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({c.classCount} lớp)</span>
                    </span>
                    <span className="font-mono text-slate-900 text-sm">
                      {c.avgScore.toFixed(2)}đ
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      style={{ width: `${scorePercent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.isSelected
                          ? 'bg-indigo-600'
                          : isAboveAvg
                          ? 'bg-emerald-500 group-hover:bg-emerald-600'
                          : 'bg-blue-500 group-hover:bg-blue-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Trên điểm TB trường</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              <span>Dưới hoặc bằng TB trường</span>
            </span>
            <span className="text-slate-400 italic">Thang điểm chuẩn: 100đ</span>
          </div>
        </div>

        {/* Requirement #6: BIỂU ĐỒ BIẾN ĐỘNG ĐIỂM CỦA MỘT LỚP (Tuần -> Tháng -> Học kỳ -> Cả năm) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  BIẾN ĐỘNG ĐIỂM THEO THỜI GIAN (Yêu cầu #6)
                </h3>
              </div>
              {trendData && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    trendData.trendDirection === 'up'
                      ? 'bg-emerald-100 text-emerald-800'
                      : trendData.trendDirection === 'down'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {trendData.trendDirection === 'up' ? '↗ Tiến bộ' : trendData.trendDirection === 'down' ? '↘ Giảm sút' : '→ Ổn định'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Theo dõi sự biến động nề nếp: <strong>Tuần → Tháng → Học kỳ → Cả năm</strong>.
            </p>

            {/* Class Selector Dropdown */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Chọn lớp học cần theo dõi:
              </label>
              <select
                value={trendClassId}
                onChange={(e) => setTrendClassId(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden focus:bg-white focus:border-blue-500"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Lớp {cls.name} ({campuses.find((c) => c.id === cls.campusId)?.name || 'Cơ sở'}) - Khối {cls.grade}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Point Flow */}
            {trendData && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {trendData.allPoints.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center"
                    >
                      <div className="text-[10px] font-bold text-slate-500">{p.label}</div>
                      <div className="text-xs font-black font-mono text-slate-900 mt-1">
                        {p.score !== null ? `${p.score.toFixed(1)}đ` : '-'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {trendData.allPoints.slice(4, 7).map((p, i) => (
                    <div
                      key={i}
                      className="bg-blue-50/50 border border-blue-200 rounded-xl p-2 text-center"
                    >
                      <div className="text-[10px] font-bold text-blue-700">{p.label}</div>
                      <div className="text-xs font-black font-mono text-blue-900 mt-1">
                        {p.score !== null ? `${p.score.toFixed(1)}đ` : '-'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {trendData.allPoints.slice(7).map((p, i) => (
                    <div
                      key={i}
                      className="bg-amber-50/50 border border-amber-200 rounded-xl p-2 text-center"
                    >
                      <div className="text-[10px] font-bold text-amber-800">{p.label}</div>
                      <div className="text-xs font-black font-mono text-amber-900 mt-1">
                        {p.score !== null ? `${p.score.toFixed(1)}đ` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Button to inspect chosen class */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Xem toàn bộ hồ sơ thi đua chi tiết
            </span>
            <button
              onClick={() => {
                const target = classes.find((c) => c.id === trendClassId);
                if (target) setInspectClass(target);
              }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Xem chi tiết lớp này</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. CẢNH BÁO THI ĐUA NỀ NẾP (Requirement #7) */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              KHU VỰC CẢNH BÁO &amp; ĐÔN ĐỐC THI ĐUA (Yêu cầu #7)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Tổng cộng: <strong>{alertsList.length}</strong> thông báo cần chú ý
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {alertsList.map((alt) => {
            const isError = alt.level === 'error';
            const isWarning = alt.level === 'warning';

            return (
              <div
                key={alt.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 text-xs leading-relaxed ${
                  isError
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : isWarning
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-blue-50/70 border-blue-200 text-blue-950'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-black">
                    {isError ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                    <span>{alt.title}</span>
                  </div>
                  <p className="opacity-90">{alt.desc}</p>
                </div>

                {alt.actionText && alt.actionTab && (
                  <div className="pt-2 border-t border-slate-200/50 flex justify-end">
                    <button
                      onClick={() => setCurrentTab(alt.actionTab as any)}
                      className={`font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        isError
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : isWarning
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <span>{alt.actionText}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 5. CONTROLS & BỘ LỌC ĐA NĂNG (Requirement #3) */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Row 1: Time Scope Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-800 uppercase">
              BỘ LỌC DỮ LIỆU BẢNG XẾP HẠNG (Yêu cầu #3):
            </span>
          </div>

          {/* Time Scope Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeScope('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                timeScope === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Theo Tuần ({activeWeek})</span>
            </button>

            <button
              onClick={() => setTimeScope('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                timeScope === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Theo Tháng ({activeMonth})</span>
            </button>

            <button
              onClick={() => setTimeScope('semester')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                timeScope === 'semester'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Theo Học Kỳ ({activeSemester === 1 ? 'HKI' : 'HKII'})</span>
            </button>

            <button
              onClick={() => setTimeScope('year')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                timeScope === 'year'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Cả Năm (2026-2027)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Selectors for Week, Month, Semester, Campus, Grade, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Dynamic selector based on timeScope */}
          {timeScope === 'week' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Chọn tuần thi đua:
              </label>
              <select
                value={activeWeek}
                onChange={(e) => setActiveWeek(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
              >
                {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {isWeekLocked(w) ? '(🔒 Đã chốt)' : '(Đang mở)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeScope === 'month' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Chọn tháng thi đua:
              </label>
              <select
                value={activeMonth}
                onChange={(e) => setActiveMonth(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
              >
                {[9, 10, 11, 12, 1, 2, 3, 4].map((m) => (
                  <option key={m} value={m}>
                    Tháng {m} {isMonthLocked(m) ? '(🔒 Đã chốt)' : '(Đang mở)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {timeScope === 'semester' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Chọn học kỳ:
              </label>
              <select
                value={activeSemester}
                onChange={(e) => setActiveSemester(Number(e.target.value) as 1 | 2)}
                className="w-full bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
              >
                <option value={1}>Học kỳ I {isSemesterLocked(1) ? '(🔒 Đã chốt)' : '(Đang mở)'}</option>
                <option value={2}>Học kỳ II {isSemesterLocked(2) ? '(🔒 Đã chốt)' : '(Đang mở)'}</option>
              </select>
            </div>
          )}

          {timeScope === 'year' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Năm học đánh giá:
              </label>
              <div className="w-full bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200">
                Năm học {settings.academicYear} {isYearLocked() ? '(🔒 Đã chốt)' : '(Mô phỏng)'}
              </div>
            </div>
          )}

          {/* Campus Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Phân hiệu:
            </label>
            <select
              value={filterCampusId}
              onChange={(e) => setFilterCampusId(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
            >
              <option value="all">Toàn trường (Tất cả 6 phân hiệu)</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.type === 'main' ? '(Trường chính)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Khối lớp:
            </label>
            <select
              value={filterGrade}
              onChange={(e) =>
                setFilterGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full bg-slate-50 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
            >
              <option value="all">Tất cả các khối (6, 7, 8, 9)</option>
              <option value={6}>Khối 6</option>
              <option value={7}>Khối 7</option>
              <option value={8}>Khối 8</option>
              <option value={9}>Khối 9</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Tìm kiếm lớp / GVCN:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nhập tên lớp, GVCN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 outline-hidden focus:bg-white focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 6. BẢNG XẾP HẠNG TOÀN TRƯỜNG (Requirement #4) */}
      {/* STT | Lớp | Phân hiệu | Điểm | Xếp hạng | Danh hiệu / Xếp loại */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              BẢNG XẾP HẠNG THI ĐUA TOÀN TRƯỜNG (Yêu cầu #4)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Hiển thị <strong>{filteredRankings.length}</strong> lớp • Bấm vào lớp để xem chi tiết (Yêu cầu #8)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                <th className="py-3 px-3.5 text-center w-12">STT</th>
                <th className="py-3 px-4 min-w-[130px]">Lớp</th>
                <th className="py-3 px-4 min-w-[160px]">Phân hiệu</th>
                <th className="py-3 px-3.5 text-center min-w-[110px]">Điểm số</th>
                <th className="py-3 px-3.5 text-center min-w-[90px]">Xếp hạng</th>
                <th className="py-3 px-4 text-center min-w-[150px]">Danh hiệu / Xếp loại</th>
                <th className="py-3 px-4 min-w-[240px]">Ghi chú & Căn cứ</th>
                <th className="py-3 px-3.5 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-bold">Không tìm thấy lớp nào phù hợp với bộ lọc hiện tại.</p>
                  </td>
                </tr>
              ) : (
                filteredRankings.map((row) => {
                  const isTop3 = typeof row.rank === 'number' && row.rank <= 3;
                  const isExcellent = row.titleOrTier === 'LỚP XUẤT SẮC' || row.tierType === 'Xuất sắc';

                  return (
                    <tr
                      key={row.classItem.id}
                      onClick={() => setInspectClass(row.classItem)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isExcellent ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-600">
                        {row.stt}
                      </td>

                      {/* Lớp */}
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>Lớp {row.classItem.name}</span>
                          {isTop3 && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">
                              Top {row.rank}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          GVCN: {row.classItem.homeroomTeacher || 'Chưa phân công'}
                        </div>
                      </td>

                      {/* Phân hiệu */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {row.campus.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {row.campus.type === 'main' ? 'Trường chính' : 'Phân hiệu'} • Khối {row.classItem.grade}
                        </div>
                      </td>

                      {/* Điểm số */}
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-black text-slate-900 font-mono text-sm px-2.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {row.scoreFormatted}
                        </span>
                      </td>

                      {/* Xếp hạng */}
                      <td className="py-3 px-3.5 text-center">
                        {typeof row.rank === 'number' ? (
                          <span
                            className={`font-black text-xs px-2.5 py-1 rounded-full ${
                              row.rank === 1
                                ? 'bg-amber-500 text-white shadow-xs'
                                : row.rank === 2
                                ? 'bg-slate-300 text-slate-900'
                                : row.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Hạng {row.rank}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {row.rank}
                          </span>
                        )}
                      </td>

                      {/* Danh hiệu / Xếp loại */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${
                            row.titleOrTier === 'LỚP XUẤT SẮC' || row.tierType === 'Xuất sắc'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : row.titleOrTier === 'LỚP TIÊN TIẾN' || row.tierType === 'Tốt'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : row.tierType === 'Khá'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.titleOrTier}
                        </span>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-3 px-4 text-slate-600">
                        {row.notes}
                      </td>

                      {/* Detail Button */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectClass(row.classItem);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title="Xem toàn bộ hồ sơ chi tiết của lớp"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* -------------------------------------------------------------------- */}
      {/* 7. CLASS DETAIL MODAL (Requirement #8) */}
      {/* -------------------------------------------------------------------- */}
      {inspectClass && (
        <ClassDetailModal
          classItem={inspectClass}
          week={activeWeek}
          onClose={() => setInspectClass(null)}
        />
      )}
    </div>
  );
};
