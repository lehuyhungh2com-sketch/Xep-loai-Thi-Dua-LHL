import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PenTool,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  School,
  BookOpen,
  Filter,
  Layers,
  Sparkles,
  Info,
  AlertTriangle,
  Zap,
  Upload,
  Download,
  FileSpreadsheet,
  X,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Check,
  Flag,
} from 'lucide-react';
import { Criteria, ScoreLog, CriteriaPeriod, ClassItem, Campus, CampusWeeklyDuty, normalizeRole } from '../../types';
import { canInputScores, canLockWeek, canUnlockWeek, ROLE_METADATA } from '../../utils/rbac';
import { exportWeeklyScoringTemplate } from '../../utils/excelTemplateManager';
import { ExcelImportModal } from './ExcelImportModal';

export const WeeklyScoring: React.FC = () => {
  const {
    campuses,
    classes,
    criteria,
    scoreLogs,
    selectedWeek,
    setSelectedWeek,
    maxWeeks,
    currentUser,
    userRole,
    lockedWeeks,
    isWeekLocked,
    toggleLockWeek,
    addScoreLog,
    updateScoreLog,
    deleteScoreLog,
    bulkAddScoreLogs,
    getClassWeeklyScore,
    previewCriteriaCalculation,
    campusWeeklyDuties,
    scoringNavigationContext,
    clearScoringNavigationContext,
    settings,
    calendarWeeks,
    logAudit,
  } = useApp();

  if (!currentUser) return null;

  const roleNorm = normalizeRole(currentUser.role);
  const isAdmin = roleNorm === 'super_admin' || roleNorm === 'bgh' || roleNorm === 'tpt_doi';
  const availableCampuses = isAdmin ? campuses : campuses.filter((c) => c.id === currentUser.campusId);

  const isLocked = isWeekLocked(selectedWeek);
  const canLock = canLockWeek(currentUser);
  const canUnlock = canUnlockWeek(currentUser);

  const handleToggleLockCurrentWeek = () => {
    if (isLocked) {
      if (!canUnlock) {
        alert(`Từ chối quyền: Chỉ Quản trị viên tối cao (Admin) mới có thẩm quyền mở khóa dữ liệu Tuần ${selectedWeek} đã chốt!`);
        return;
      }
      const reason = window.prompt(`Nhập lý do mở khóa dữ liệu Tuần ${selectedWeek} (Bắt buộc để lưu vết kiểm toán hệ thống):`);
      if (!reason || !reason.trim()) return;
      const res = toggleLockWeek(selectedWeek, reason.trim());
      alert(res.message);
    } else {
      if (!canLock) {
        alert(`Từ chối quyền: Chỉ Ban Giám Hiệu, Tổng Phụ Trách Đội hoặc Quản trị viên mới có thẩm quyền chốt số liệu Tuần ${selectedWeek}!`);
        return;
      }
      if (window.confirm(`Xác nhận CHỐT KHÓA dữ liệu thi đua Tuần ${selectedWeek}? Toàn bộ điểm số tuần này sẽ được đóng băng để tính bảng xếp hạng.`)) {
        const res = toggleLockWeek(selectedWeek);
        alert(res.message);
      }
    }
  };

  // 1. Phân hiệu & Tuần
  const [selectedCampusId, setSelectedCampusId] = useState<string>(() => {
    if (scoringNavigationContext?.campusId) return scoringNavigationContext.campusId;
    if (currentUser.campusId) return currentUser.campusId;
    return campuses[0]?.id || 'lhl_main';
  });

  // Grade filter
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | 'all'>('all');

  // Available classes for selected campus
  const campusClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchCampus = c.campusId === selectedCampusId;
      const matchGrade = selectedGradeFilter === 'all' || c.grade === selectedGradeFilter;
      return matchCampus && matchGrade;
    });
  }, [classes, selectedCampusId, selectedGradeFilter]);

  // Selected Class
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (scoringNavigationContext?.classId) return scoringNavigationContext.classId;
    if (currentUser.classId) return currentUser.classId;
    const firstCampusClass = classes.find((c) => c.campusId === selectedCampusId);
    return firstCampusClass?.id || classes[0]?.id || '';
  });

  // Synchronize when campus changes or when incoming context arrives
  useEffect(() => {
    if (scoringNavigationContext) {
      if (scoringNavigationContext.campusId) setSelectedCampusId(scoringNavigationContext.campusId);
      if (scoringNavigationContext.week) setSelectedWeek(scoringNavigationContext.week);
      if (scoringNavigationContext.classId) setSelectedClassId(scoringNavigationContext.classId);
      if (scoringNavigationContext.inspectorName) setCustomInspectorName(scoringNavigationContext.inspectorName);
    }
  }, [scoringNavigationContext, setSelectedWeek]);

  useEffect(() => {
    if (!isAdmin && currentUser.campusId && selectedCampusId !== currentUser.campusId) {
      setSelectedCampusId(currentUser.campusId);
    }
  }, [isAdmin, currentUser.campusId, selectedCampusId]);

  // Ensure selected class belongs to selected campus
  useEffect(() => {
    const isCurrentClassInCampus = classes.some((c) => c.id === selectedClassId && c.campusId === selectedCampusId);
    if (!isCurrentClassInCampus) {
      const firstClass = classes.find((c) => c.campusId === selectedCampusId);
      if (firstClass && firstClass.id !== selectedClassId) setSelectedClassId(firstClass.id);
    }
  }, [selectedCampusId, classes, selectedClassId]);

  // Selected Class object
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || campusClasses[0] || classes[0] || { id: 'default', name: 'Chưa xác định', grade: 6, campusId: selectedCampusId };
  }, [classes, selectedClassId, campusClasses, selectedCampusId]);

  // Duty Class assigned for this campus in this week
  const dutyAssignmentThisWeek = useMemo(() => {
    return campusWeeklyDuties.find((d) => d.week === selectedWeek && d.campusId === selectedCampusId);
  }, [campusWeeklyDuties, selectedWeek, selectedCampusId]);

  // Selected Campus object
  const currentCampus = useMemo(() => {
    return campuses.find((c) => c.id === selectedCampusId) || campuses[0] || { id: 'default', name: 'Chưa xác định', type: 'sub', leaderName: '', phone: '', address: '', colorTheme: 'slate' };
  }, [campuses, selectedCampusId]);

  // Criteria Selection State
  const [criteriaCategory, setCriteriaCategory] = useState<string>('all');
  const [criteriaSearch, setCriteriaSearch] = useState<string>('');
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string>(criteria[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [customInspectorName, setCustomInspectorName] = useState<string>(() => {
    if (scoringNavigationContext?.inspectorName) return scoringNavigationContext.inspectorName;
    return currentUser.name;
  });
  const [customPeriod, setCustomPeriod] = useState<CriteriaPeriod | 'auto'>('auto');

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Duplicate Confirmation Modal State
  const [duplicateModalData, setDuplicateModalData] = useState<{
    isOpen: boolean;
    existingLog: ScoreLog;
    pendingLog: Omit<ScoreLog, 'id'>;
  } | null>(null);

  // Edit Log Modal State
  const [editingLog, setEditingLog] = useState<ScoreLog | null>(null);
  const [editReason, setEditReason] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editNote, setEditNote] = useState<string>('');

  // Delete Confirmation Modal State
  const [deleteConfirmLog, setDeleteConfirmLog] = useState<ScoreLog | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('Nhập nhầm bản ghi lỗi');

  // Bulk / Excel Import Modal State
  const [showExcelModal, setShowExcelModal] = useState<boolean>(false);

  // Filtered criteria
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    criteria.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [criteria]);

  const filteredCriteriaList = useMemo(() => {
    return criteria.filter((crit) => {
      if (!crit.isActive) return false;
      const matchCategory = criteriaCategory === 'all' || crit.category === criteriaCategory;
      const matchSearch =
        criteriaSearch === '' ||
        crit.name.toLowerCase().includes(criteriaSearch.toLowerCase()) ||
        crit.code.toLowerCase().includes(criteriaSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [criteria, criteriaCategory, criteriaSearch]);

  const currentCriteria = useMemo(() => {
    if (selectedCriteriaId) {
      const raw = selectedCriteriaId.trim().toLowerCase();
      const stripped = raw.replace(/^crit_/, '');
      const match = criteria.find(
        (c) =>
          c.id.toLowerCase() === raw ||
          c.code.toLowerCase() === raw ||
          c.code.toLowerCase() === stripped ||
          c.id.toLowerCase().replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, '') ||
          c.code.toLowerCase().replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, '')
      );
      if (match) return match;
    }
    return filteredCriteriaList[0] || criteria[0];
  }, [criteria, selectedCriteriaId, filteredCriteriaList]);

  // Đảm bảo tiêu chí đang chọn luôn hiển thị trong dropdown kể cả khi đang lọc danh mục khác
  const dropdownCriteriaList = useMemo(() => {
    if (currentCriteria && !filteredCriteriaList.some((c) => c.id === currentCriteria.id)) {
      return [currentCriteria, ...filteredCriteriaList];
    }
    return filteredCriteriaList;
  }, [currentCriteria, filteredCriteriaList]);

  // Real-time calculation preview
  const previewResult = useMemo(() => {
    if (!currentClass || !currentCriteria || quantity <= 0) return null;
    return previewCriteriaCalculation(currentCriteria.id, quantity, currentClass.id);
  }, [currentClass, currentCriteria, quantity, previewCriteriaCalculation]);

  // Score summary for current class in selected week
  const scoreSummary = useMemo(() => {
    if (!currentClass) {
      return {
        classId: '',
        week: selectedWeek,
        baseScore: 100,
        bonusPoints: 0,
        penaltyPoints: 0,
        finalScore: 100,
        logCount: 0,
        rankInCampus: 1,
        rankInSchool: 1,
      };
    }
    return getClassWeeklyScore(currentClass.id, selectedWeek);
  }, [currentClass, selectedWeek, getClassWeeklyScore, scoreLogs]);

  // Projected score if current preview is added
  const projectedFinalScore = useMemo(() => {
    if (!previewResult) return scoreSummary.finalScore;
    return Math.round((scoreSummary.finalScore + previewResult.totalPoints) * 10) / 10;
  }, [scoreSummary, previewResult]);

  // Logs for current class in selected week
  const classLogs = useMemo(() => {
    if (!currentClass) return [];
    return scoreLogs.filter(
      (l) => l.classId === currentClass.id && Number(l.week) === Number(selectedWeek)
    );
  }, [scoreLogs, currentClass, selectedWeek]);

  // RBAC Permission Check for scoring
  const scoringPermission = useMemo(() => {
    return canInputScores(
      currentUser,
      selectedCampusId,
      currentClass?.id,
      selectedWeek,
      lockedWeeks,
      campusWeeklyDuties
    );
  }, [currentUser, selectedCampusId, currentClass, selectedWeek, lockedWeeks, campusWeeklyDuties]);

  // -------------------------------------------------------------
  // CHỐNG NHẬP TRÙNG (Duplicate Detection)
  // Check if an existing log exists for same class + criteria in this week
  // -------------------------------------------------------------
  const potentialDuplicate = useMemo(() => {
    if (!currentClass || !currentCriteria) return null;
    return scoreLogs.find(
      (l) =>
        l.classId === currentClass.id &&
        Number(l.week) === Number(selectedWeek) &&
        (l.criteriaId === currentCriteria.id || l.criteriaCode === currentCriteria.code)
    );
  }, [scoreLogs, currentClass, selectedWeek, currentCriteria]);

  // Handle single log addition with anti-duplicate validation
  const handleSaveLog = (bypassDuplicateCheck = false) => {
    if (!currentClass || !currentCriteria || !previewResult) return;

    if (!scoringPermission.allowed) {
      setErrorMessage(scoringPermission.reason || 'Bạn không có quyền nhập điểm thi đua trong tuần này!');
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('Số lượng / số học sinh vi phạm phải lớn hơn 0!');
      return;
    }

    const effectivePeriod = customPeriod === 'auto' ? previewResult.period : customPeriod;

    const logToSave: Omit<ScoreLog, 'id'> = {
      week: selectedWeek,
      period: effectivePeriod,
      classId: currentClass.id,
      className: currentClass.name,
      campusId: currentClass.campusId,
      campusName: previewResult.campus?.name || currentCampus.name,
      campusType: previewResult.campus?.type || 'sub',
      grade: currentClass.grade,
      criteriaId: currentCriteria.id,
      criteriaCode: currentCriteria.code,
      criteriaName: currentCriteria.name,
      category: currentCriteria.category,
      type: currentCriteria.type,
      pointsPerUnit: previewResult.pointsPerUnit,
      quantity,
      totalPoints: previewResult.totalPoints,
      appliedCap: previewResult.appliedCap,
      calculationDetail: previewResult.calculationDetail,
      note: note.trim() || undefined,
      date,
      recordedBy: `${currentUser.name} (${currentUser.title || currentUser.role})`,
      inspectorName: customInspectorName.trim() || currentUser.name,
      isDisciplinary: previewResult.isDisciplinary,
    };

    // If potential duplicate exists and user has not bypassed, open confirmation dialog
    if (potentialDuplicate && !bypassDuplicateCheck) {
      setDuplicateModalData({
        isOpen: true,
        existingLog: potentialDuplicate,
        pendingLog: logToSave,
      });
      return;
    }

    const res = addScoreLog(logToSave);
    if (res.success) {
      setSuccessMessage(
        `✅ Đã lưu thành công: "${currentCriteria.name}" (${previewResult.totalPoints >= 0 ? `+${previewResult.totalPoints}` : previewResult.totalPoints}đ) cho lớp ${currentClass.name}. Điểm số được cập nhật ngay lập tức!`
      );
      setNote('');
      setQuantity(1);
      setErrorMessage(null);
      setDuplicateModalData(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.message || 'Có lỗi xảy ra khi lưu biên bản!');
    }
  };

  // Merge / Update into existing log when duplicate is confirmed to be combined
  const handleMergeWithExisting = () => {
    if (!duplicateModalData || !duplicateModalData.existingLog) return;
    const exist = duplicateModalData.existingLog;
    const newQty = exist.quantity + quantity;
    const calc = previewCriteriaCalculation(exist.criteriaId, newQty, exist.classId);

    const res = updateScoreLog(
      exist.id,
      {
        quantity: newQty,
        pointsPerUnit: calc.pointsPerUnit,
        totalPoints: calc.totalPoints,
        calculationDetail: calc.calculationDetail,
        note: `${exist.note ? `${exist.note} | ` : ''}Gộp thêm ${quantity} lần (${customInspectorName})`,
      },
      `Gộp số lượng vi phạm từ ${exist.quantity} lên ${newQty} lần`
    );

    if (res.success) {
      setSuccessMessage(`✅ Đã cập nhật gộp số lượng vào bản ghi có sẵn: ${newQty} lần (${calc.totalPoints}đ)!`);
      setNote('');
      setQuantity(1);
      setDuplicateModalData(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.message || 'Lỗi khi gộp bản ghi');
    }
  };

  // Handle Edit existing log
  const handleOpenEdit = (log: ScoreLog) => {
    setEditingLog(log);
    setEditQuantity(log.quantity);
    setEditNote(log.note || '');
    setEditReason('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    if (editQuantity <= 0) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }

    const calc = previewCriteriaCalculation(editingLog.criteriaId, editQuantity, editingLog.classId);
    const res = updateScoreLog(
      editingLog.id,
      {
        quantity: editQuantity,
        pointsPerUnit: calc.pointsPerUnit,
        totalPoints: calc.totalPoints,
        calculationDetail: calc.calculationDetail,
        note: editNote.trim() || undefined,
      },
      editReason.trim() || 'Điều chỉnh số lượng/nội dung biên bản'
    );

    if (res.success) {
      setSuccessMessage('✅ Đã cập nhật biên bản thành công!');
      setEditingLog(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      alert(res.message || 'Không thể cập nhật biên bản!');
    }
  };

  // Check if current user has permission to delete a specific score log
  const canDeleteScore = (log: ScoreLog): boolean => {
    // 1. Quản trị viên (Admin / Super Admin / Ban Giám Hiệu) luôn có toàn quyền xóa bản ghi lỗi
    const normRole = normalizeRole(currentUser.role);
    const isAdmin =
      normRole === 'super_admin' ||
      normRole === 'bgh' ||
      currentUser.role === 'super_admin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'bgh' ||
      userRole === 'super_admin' ||
      userRole === 'admin' ||
      userRole === 'bgh';
    if (isAdmin) return true;

    // 2. Giáo viên trực tuần (Duty teacher of this week/campus)
    const isDutyTeacherThisWeek = campusWeeklyDuties.some((d) =>
      d.week === (log.week || selectedWeek) && (
        (currentUser.classId && d.classId === currentUser.classId) ||
        (currentUser.name && d.homeroomTeacher && currentUser.name.toLowerCase().trim() === d.homeroomTeacher.toLowerCase().trim()) ||
        (d.teacherId && currentUser.id === d.teacherId)
      )
    );
    if (isDutyTeacherThisWeek) return true;

    if (
      dutyAssignmentThisWeek &&
      ((currentUser.classId && dutyAssignmentThisWeek.classId === currentUser.classId) ||
        (currentUser.name &&
          dutyAssignmentThisWeek.homeroomTeacher &&
          currentUser.name.toLowerCase().trim() ===
            dutyAssignmentThisWeek.homeroomTeacher.toLowerCase().trim()) ||
        (dutyAssignmentThisWeek.teacherId && currentUser.id === dutyAssignmentThisWeek.teacherId))
    ) {
      return true;
    }

    // 3. Người ghi nhận / Giáo viên đã nhập sai bản ghi này (Author / inspector)
    if (
      currentUser.name &&
      log.inspectorName &&
      (currentUser.name.toLowerCase().trim() === log.inspectorName.toLowerCase().trim() ||
        log.inspectorName.toLowerCase().includes(currentUser.name.toLowerCase().trim()) ||
        currentUser.name.toLowerCase().includes(log.inspectorName.toLowerCase().trim()))
    ) {
      return true;
    }

    // 4. Có quyền chấm điểm tuần này
    if (scoringPermission.allowed) return true;

    // 5. Cán bộ trực ban, TPT Đội, Quản trị phân hiệu
    if (
      normRole === 'tpt_doi' ||
      normRole === 'campus_admin' ||
      currentUser.role === 'tpt_doi' ||
      currentUser.role === 'campus_admin'
    ) {
      return true;
    }

    // 6. Giáo viên / GVCN khi tuần chưa bị khóa
    if ((normRole === 'gvcn' || currentUser.role === 'teacher' || currentUser.role === 'gvcn') && !isLocked) {
      return true;
    }

    // 7. Quyền tùy chỉnh canDeleteScore
    if (currentUser.customPermissions?.canDeleteScore) {
      return true;
    }

    return false;
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteConfirm = (log: ScoreLog) => {
    setDeleteReason('Nhập nhầm bản ghi lỗi');
    setDeleteConfirmLog(log);
  };

  // Execute confirmed deletion
  const handleConfirmDelete = () => {
    if (!deleteConfirmLog) return;
    const res = deleteScoreLog(deleteConfirmLog.id, deleteReason.trim() || 'Xóa bản ghi nhầm lẫn');
    if (res.success) {
      setSuccessMessage(
        `✅ Đã xóa bản ghi lỗi thành công! Điểm số của lớp ${deleteConfirmLog.className} đã được hoàn lại ngay.`
      );
      setDeleteConfirmLog(null);
      setTimeout(() => setSuccessMessage(null), 3500);
    } else {
      setErrorMessage(res.message || 'Không thể xóa bản ghi!');
      setDeleteConfirmLog(null);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // -------------------------------------------------------------
  // EXCEL IMPORT & TEMPLATE DOWNLOAD
  // -------------------------------------------------------------
  // EXCEL IMPORT & TEMPLATE DOWNLOAD (Multi-sheet .xlsx standard)
  // -------------------------------------------------------------
  const handleDownloadExcelTemplate = () => {
    const weekConfig = calendarWeeks.find((w) => w.week === selectedWeek);
    const startDate = weekConfig?.startDate || '2026-09-22';
    const endDate = weekConfig?.endDate || '2026-09-27';

    exportWeeklyScoringTemplate({
      campus: currentCampus,
      week: selectedWeek,
      academicYear: settings.academicYear,
      startDate,
      endDate,
      classes,
      criteria,
      currentUser,
    });

    setSuccessMessage(
      `✅ Đã tải xuống tệp Excel mẫu Tuần ${selectedWeek} cho Phân hiệu ${currentCampus.name} (.xlsx)! Tệp gồm 4 sheet theo đúng chuẩn của nhà trường.`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Shortcuts for frequent conduct items
  const popularShortcuts = useMemo(() => {
    const popularCodes = ['TP02', 'CC01', 'CD01', 'TP04', 'VS01', 'HV04', 'TT01', 'CR01', 'HD01'];
    return criteria.filter((c) => popularCodes.includes(c.code) && c.isActive);
  }, [criteria]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & IDENTITY BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden border border-blue-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold">
              <PenTool size={14} className="text-amber-400" />
              <span>MODULE NHẬP ĐIỂM THI ĐUA DUY NHẤT</span>
              <span className="opacity-60">•</span>
              <span>NGUỒN DỮ LIỆU ĐIỂM TẬP TRUNG TOÀN TRƯỜNG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              GHI NHẬN & CHẤM ĐIỂM THI ĐUA NỀ NẾP
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Mọi bản ghi từ Đội cờ đỏ, GVCN Lớp trực tuần, và Ban điều hành đều đưa vào một bộ máy tính điểm chuẩn, cập nhật điểm trực tiếp tức thì trên toàn hệ thống.
            </p>
          </div>

          {/* Quick Week Selector & Lock Status */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-3 rounded-xl backdrop-blur-md border border-slate-700 self-start md:self-auto shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Tuần thi đua:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-white text-slate-900 text-sm font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
              >
                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {isWeekLocked(w) ? '🔒 (Đã chốt)' : '🟢 (Đang mở)'}
                  </option>
                ))}
              </select>
            </div>

            {isLocked ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                  <Lock size={14} className="text-amber-400" />
                  <span>TUẦN ĐÃ CHỐT</span>
                </span>
                {canUnlock && (
                  <button
                    onClick={handleToggleLockCurrentWeek}
                    title={`Mở khóa Tuần ${selectedWeek} (Yêu cầu quyền Admin & lý do)`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Unlock size={13} />
                    <span>Mở khóa tuần</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
                  <Unlock size={14} className="text-emerald-400" />
                  <span>ĐANG MỞ CHẤM</span>
                </span>
                {canLock && (
                  <button
                    onClick={handleToggleLockCurrentWeek}
                    title={`Chốt điểm thi đua Tuần ${selectedWeek}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Lock size={13} />
                    <span>Chốt điểm tuần</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User Identity & Duty Week Authorization Strip */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-lg text-slate-200">
              <UserCheck size={14} className="text-amber-400 shrink-0" />
              <span>Người ghi nhận:</span>
              <strong className="text-white font-bold">{currentUser.name}</strong>
              <span className="text-[11px] text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded font-mono">
                {currentUser.title || currentUser.role}
              </span>
            </div>

            {/* Scope / Duty status badge */}
            {scoringPermission.allowed ? (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold">
                <ShieldCheck size={14} />
                <span>Được cấp quyền chấm điểm</span>
                {scoringPermission.isDutyTeacher && <span className="underline ml-1">(GVCN Lớp trực tuần)</span>}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg font-bold">
                <ShieldAlert size={14} />
                <span>Chế độ Chỉ Xem / Giới hạn quyền</span>
              </span>
            )}
          </div>

          {/* Duty Class of the week */}
          {dutyAssignmentThisWeek && (
            <div className="text-slate-300 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-400" />
              <span>Lớp trực ban Tuần {selectedWeek}:</span>
              <strong className="text-amber-300">{dutyAssignmentThisWeek.className}</strong>
              <span className="text-slate-400">({dutyAssignmentThisWeek.homeroomTeacher})</span>
            </div>
          )}
        </div>

        {/* Transition Notice if routed from Red Flag Module */}
        {scoringNavigationContext?.fromRedFlag && (
          <div className="mt-3 p-2.5 bg-rose-500/20 border border-rose-400/40 rounded-xl text-xs text-rose-100 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-rose-300 shrink-0" />
              <span>
                <strong>Chuyển tiếp từ Module Đội cờ đỏ:</strong> Tự động xác định người nhập <strong>{currentUser.name}</strong>, phân hiệu <strong>{currentCampus.name}</strong>, khu vực <strong>"{scoringNavigationContext.dutyArea || 'Được phân công'}"</strong>.
              </span>
            </div>
            <button
              onClick={clearScoringNavigationContext}
              className="text-rose-200 hover:text-white text-[11px] underline cursor-pointer shrink-0"
            >
              Đóng thông báo
            </button>
          </div>
        )}
      </div>

      {/* Week Locked Alert */}
      {isLocked && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-xl flex items-center gap-3 text-amber-900 shadow-xs">
          <ShieldAlert size={22} className="text-amber-600 shrink-0" />
          <div className="text-xs sm:text-sm">
            <strong className="font-bold">Tuần {selectedWeek} đã được Ban Giám Hiệu chốt khóa sổ thi đua!</strong> Dữ liệu đã đóng băng, không cho phép nhập hoặc chỉnh sửa thêm để bảo đảm tính khách quan khi công bố xếp hạng.
          </div>
        </div>
      )}

      {/* Gentle Read-Only Notification for Non-Duty Teachers */}
      {!scoringPermission.allowed && !isLocked && (
        <div className="p-4 bg-blue-50/90 border border-blue-200 border-l-4 border-l-blue-600 rounded-xl flex items-start sm:items-center gap-3.5 text-blue-950 shadow-xs animate-fadeIn">
          <Info size={22} className="text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-bold">Bạn đang ở chế độ Chỉ xem.</span>{' '}
            <span>
              Việc nhập điểm tuần này do GVCN lớp trực tuần{' '}
              <strong className="text-blue-900 underline font-extrabold">
                {dutyAssignmentThisWeek?.className ? `[${dutyAssignmentThisWeek.className}]` : '[Chưa phân công]'}
              </strong>
              {dutyAssignmentThisWeek?.homeroomTeacher ? ` (${dutyAssignmentThisWeek.homeroomTeacher})` : ''} phụ trách.
            </span>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-xs animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm font-semibold shadow-xs animate-fadeIn">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. ACTION TOOLBAR: EXCEL IMPORT & TEMPLATE DOWNLOAD */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Layers size={16} className="text-blue-600" />
          <span>Phương thức ghi nhận:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
            Nhập trực tiếp hoặc qua Excel mẫu (CÙNG NGUỒN DỮ LIỆU)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Excel Template */}
          <button
            onClick={handleDownloadExcelTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Tải bảng tính Excel mẫu đã cấu hình sẵn danh sách lớp và mã tiêu chí"
          >
            <Download size={14} className="text-emerald-700" />
            <span>Tải Excel mẫu Tuần {selectedWeek}</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={() => setShowExcelModal(true)}
            disabled={isLocked || !scoringPermission.allowed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Nhập dữ liệu thi đua đồng loạt từ bảng tính Excel / CSV"
          >
            <Upload size={14} />
            <span>Nhập từ file Excel / Dán bảng</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN UNIFIED INPUT INTERFACE (8-STEP UNIFIED WORKFLOW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 cols): Step-by-Step Entry Form */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
            {/* Step Navigation Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs font-bold text-slate-500">
              <span className="text-blue-900 flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-500" />
                MÀN HÌNH NHẬP LIỆU THỐNG NHẤT
              </span>
              <span className="text-slate-400">8 Bước chuẩn quy trình thi đua</span>
            </div>

            {/* STEP 1: CHỌN PHÂN HIỆU */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Chọn Phân hiệu cơ sở:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableCampuses.map((camp) => (
                  <button
                    key={camp.id}
                    type="button"
                    onClick={() => setSelectedCampusId(camp.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedCampusId === camp.id
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate">{camp.name}</span>
                      {selectedCampusId === camp.id && <Check size={14} className="text-blue-600 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {camp.type === 'main' ? 'Trường cơ sở chính' : 'Phân hiệu trực thuộc'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 2 & 3: CHỌN TUẦN & CHỌN LỚP */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">2-3</span>
                  <span>Chọn Lớp học cần ghi nhận (Phân hiệu: {currentCampus.name}):</span>
                </label>

                {/* Grade filter tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedGradeFilter('all')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      selectedGradeFilter === 'all' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Tất cả
                  </button>
                  {[6, 7, 8, 9].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGradeFilter(g)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        selectedGradeFilter === g ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Khối {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Buttons Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                {campusClasses.map((cls) => {
                  const score = getClassWeeklyScore(cls.id, selectedWeek);
                  const isDutyClass = dutyAssignmentThisWeek?.classId === cls.id;
                  const isSelected = selectedClassId === cls.id;

                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-700 font-extrabold shadow-sm'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      {isDutyClass && (
                        <span
                          className={`absolute -top-1.5 -right-1 text-[9px] px-1 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-500 text-white'
                          }`}
                          title="Lớp trực ban tuần này"
                        >
                          Trực
                        </span>
                      )}
                      <div className="text-xs font-bold truncate">Lớp {cls.name}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {score.finalScore}đ
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 4: CHỌN TIÊU CHÍ */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>Chọn Tiêu chí thi đua (Vi phạm / Thưởng):</span>
                </label>

                {/* Popular shortcut pills */}
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-slate-400 font-medium">Nhanh:</span>
                  {popularShortcuts.slice(0, 4).map((shortcut) => (
                    <button
                      key={shortcut.id}
                      type="button"
                      onClick={() => setSelectedCriteriaId(shortcut.id)}
                      className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedCriteriaId === shortcut.id
                          ? 'bg-amber-500 text-white border-amber-600 font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {shortcut.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters for Criteria */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5 relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={criteriaSearch}
                    onChange={(e) => setCriteriaSearch(e.target.value)}
                    placeholder="Tìm tên hoặc mã lỗi (CC01, sơ vin...)"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:bg-white focus:outline-blue-500"
                  />
                </div>

                <div className="sm:col-span-7">
                  <select
                    value={criteriaCategory}
                    onChange={(e) => setCriteriaCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-blue-500 cursor-pointer"
                  >
                    <option value="all">-- Tất cả nhóm tiêu chí ({criteria.length}) --</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Criteria Selector Dropdown */}
              <div>
                <select
                  value={currentCriteria?.id || selectedCriteriaId}
                  onChange={(e) => setSelectedCriteriaId(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold text-slate-800 bg-blue-50/40 border border-blue-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-blue-600 cursor-pointer"
                >
                  {dropdownCriteriaList.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} — {c.type === 'bonus' ? `+${c.points}đ` : `-${Math.abs(c.points)}đ`}/{c.unit} ({c.category})
                    </option>
                  ))}
                </select>
                {currentCriteria.description && (
                  <p className="text-[11px] text-slate-500 mt-1 italic pl-1">
                    ℹ️ {currentCriteria.description}
                  </p>
                )}
              </div>
            </div>

            {/* STEP 5 & 6: NHẬP SỐ LẦN & HỆ THỐNG TÍNH ĐIỂM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Step 5 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">5</span>
                  <span>Nhập số lần / học sinh ({currentCriteria.unit}):</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 h-10 text-center font-black text-lg text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Step 6: Live calculation preview */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">6</span>
                  <span>Hệ thống tự động tính điểm:</span>
                </label>
                <div
                  className={`h-10 rounded-xl px-3 flex items-center justify-between border font-bold text-xs ${
                    previewResult?.totalPoints && previewResult.totalPoints > 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <span className="truncate">
                    {quantity} {currentCriteria.unit} × {previewResult?.pointsPerUnit || currentCriteria.points}đ
                  </span>
                  <span className="text-base font-black">
                    {previewResult?.totalPoints && previewResult.totalPoints > 0 ? `+${previewResult.totalPoints}` : previewResult?.totalPoints || 0}đ
                  </span>
                </div>
              </div>
            </div>

            {/* Additional details: Date, Inspector, Note */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ngày ghi nhận</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Người phát hiện / Cờ đỏ</label>
                <input
                  type="text"
                  value={customInspectorName}
                  onChange={(e) => setCustomInspectorName(e.target.value)}
                  placeholder="Họ tên người trực..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ghi chú chi tiết (Tên HS / vị trí)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Em Hoàng Long không sơ vin đầu giờ..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-500"
                />
              </div>
            </div>

            {/* STEP 7 & 8: CHỐNG TRÙNG VÀ LƯU */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              {/* Duplicate Warning Box if matching item detected */}
              {potentialDuplicate && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 animate-fadeIn">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                      <span>CẢNH BÁO: PHÁT HIỆN KHẢ NĂNG TRÙNG LẶP BẢN GHI!</span>
                    </div>
                    <p className="text-amber-900 leading-relaxed">
                      Lớp <strong>{currentClass.name}</strong> đã có bản ghi <strong>"{potentialDuplicate.criteriaName}"</strong> trong Tuần {selectedWeek} do <strong>{potentialDuplicate.inspectorName}</strong> ({potentialDuplicate.recordedBy}) ghi nhận vào ngày {potentialDuplicate.date} ({potentialDuplicate.quantity} lần, {potentialDuplicate.totalPoints}đ).
                    </p>
                    <p className="text-amber-800 text-[11px] italic">
                      Hệ thống không tự động trừ điểm hai lần nếu đây là cùng một sự việc. Vui lòng xác nhận trước khi lưu.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500">
                  <span>Sau khi lưu, điểm lớp <strong>{currentClass.name}</strong> sẽ thay đổi từ </span>
                  <strong className="text-slate-800">{scoreSummary.finalScore}đ</strong>
                  <span> sang </span>
                  <strong className={projectedFinalScore < scoreSummary.finalScore ? 'text-rose-600' : 'text-emerald-600'}>
                    {projectedFinalScore}đ
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuantity(1);
                      setNote('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Làm mới
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveLog(false)}
                    disabled={isLocked || !scoringPermission.allowed}
                    className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2"
                  >
                    {!scoringPermission.allowed ? (
                      <>
                        <Lock size={16} />
                        <span>CHẾ ĐỘ CHỈ XEM (KHÔNG ĐƯỢC LƯU)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>LƯU BIÊN BẢN THI ĐUA (BƯỚC 8)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 cols): Live Score Board & Recent Class Logs */}
        <div className="lg:col-span-4 space-y-5">
          {/* Live Score Card for Current Class */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  ĐIỂM HIỆN TẠI TUẦN {selectedWeek}
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>Lớp {currentClass.name}</span>
                  <span className="text-xs font-bold text-slate-500 font-normal">
                    (GVCN: {currentClass.homeroomTeacher})
                  </span>
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                Hạng #{scoreSummary.rankInCampus || 1} PH
              </span>
            </div>

            {/* Core Formula Display: 100 + Thưởng - Phạt = Hiện tại */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
              <div className="text-[11px] text-slate-500 font-mono font-medium text-center border-b border-slate-200 pb-1.5">
                CÔNG THỨC: 100đ gốc + Điểm cộng - Điểm trừ = Điểm hiện tại
              </div>
              <div className="grid grid-cols-4 text-center divide-x divide-slate-200 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">GỐC</span>
                  <span className="text-xs font-bold text-slate-700">100đ</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 block font-bold">CỘNG</span>
                  <span className="text-xs font-bold text-emerald-700">+{scoreSummary.bonusPoints}</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-600 block font-bold">TRỪ</span>
                  <span className="text-xs font-bold text-rose-700">-{scoreSummary.penaltyPoints}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-700 block font-bold">TỔNG</span>
                  <span className="text-base font-black text-blue-900">{scoreSummary.finalScore}đ</span>
                </div>
              </div>
            </div>

            {/* Logs summary for this class in this week */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Biên bản ghi nhận trong tuần ({classLogs.length}):</span>
              </div>

              {classLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có biên bản thi đua nào cho lớp {currentClass.name} trong Tuần {selectedWeek}. Lớp đang giữ trọn 100đ nề nếp.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {classLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                        log.totalPoints > 0
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 leading-tight">
                          [{log.criteriaCode}] {log.criteriaName}
                        </span>
                        <span
                          className={`font-black shrink-0 ${
                            log.totalPoints > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {log.totalPoints > 0 ? `+${log.totalPoints}` : log.totalPoints}đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{log.quantity} lần • {log.date}</span>
                        <span>{log.inspectorName}</span>
                      </div>

                      {log.note && (
                        <div className="text-[11px] text-slate-600 bg-white/60 p-1.5 rounded border border-slate-100 italic">
                          "{log.note}"
                        </div>
                      )}

                      {/* Edit / Delete actions */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(log)}
                          disabled={isLocked && !(currentUser.role === 'super_admin' || currentUser.role === 'admin')}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Sửa bản ghi này"
                        >
                          <Edit2 size={11} /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteConfirm(log)}
                          disabled={!canDeleteScore(log)}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed px-2 py-0.5 rounded hover:bg-rose-50 transition-colors"
                          title={canDeleteScore(log) ? 'Xóa bản ghi lỗi này' : 'Bạn không có quyền xóa bản ghi này'}
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Campus Score Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <School size={14} className="text-blue-600" />
              <span>Bảng điểm nhanh phân hiệu ({campusClasses.length} lớp):</span>
            </h4>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {campusClasses.map((cls) => {
                const sc = getClassWeeklyScore(cls.id, selectedWeek);
                const isSelected = selectedClassId === cls.id;
                const isDuty = dutyAssignmentThisWeek?.classId === cls.id;

                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 font-bold text-blue-950'
                        : 'bg-slate-50/60 border-slate-150 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Lớp {cls.name}</span>
                      {isDuty && (
                        <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                          Trực ban
                        </span>
                      )}
                    </div>
                    <span className={`font-black ${sc.finalScore < 95 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {sc.finalScore}đ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODAL: CONFIRMATION OF DUPLICATE LOG (CHỐNG NHẬP TRÙNG) */}
      {duplicateModalData?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 space-y-5 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  XÁC NHẬN CHỐNG NHẬP TRÙNG DỮ LIỆU
                </h3>
                <p className="text-xs text-slate-600">
                  Hệ thống phát hiện đã có bản ghi tương tự được ghi nhận cho lớp{' '}
                  <strong className="text-slate-900">{currentClass.name}</strong> trong Tuần {selectedWeek}.
                </p>
              </div>
            </div>

            {/* Comparison Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Bản ghi đã có trong hệ thống:
              </div>
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{duplicateModalData.existingLog.criteriaName}</span>
                <span className="text-rose-600">{duplicateModalData.existingLog.totalPoints}đ</span>
              </div>
              <div className="text-slate-600 text-[11px] space-y-0.5">
                <div>• Người đã ghi: <strong>{duplicateModalData.existingLog.inspectorName}</strong> ({duplicateModalData.existingLog.recordedBy})</div>
                <div>• Số lần: <strong>{duplicateModalData.existingLog.quantity}</strong> • Ngày ghi: {duplicateModalData.existingLog.date}</div>
                {duplicateModalData.existingLog.note && <div>• Ghi chú: "{duplicateModalData.existingLog.note}"</div>}
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="font-bold">Bạn đang chuẩn bị ghi thêm:</div>
              <div>• Tiêu chí: {duplicateModalData.pendingLog.criteriaName} × {duplicateModalData.pendingLog.quantity} ({duplicateModalData.pendingLog.totalPoints}đ)</div>
              <div>• Người ghi: {duplicateModalData.pendingLog.inspectorName}</div>
            </div>

            {/* Action Choices */}
            <div className="space-y-2 pt-2">
              {/* Option 1: Skip to prevent double deducting */}
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Check size={16} />
                <span>Bỏ qua - Không ghi lại (Đã được tính, tránh trừ 2 lần)</span>
              </button>

              {/* Option 2: Merge quantities */}
              <button
                type="button"
                onClick={handleMergeWithExisting}
                className="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Gộp số lượng vào bản ghi hiện có (+{quantity} lần)</span>
              </button>

              {/* Option 3: Confirm separate violation */}
              <button
                type="button"
                onClick={() => handleSaveLog(true)}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Xác nhận đây là vi phạm riêng biệt (Tiếp tục lưu bản ghi mới)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDIT EXISTING SCORE LOG */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit2 size={16} className="text-blue-600" />
                <span>Điều chỉnh biên bản thi đua</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">
                  Lớp: {editingLog.className} — Tiêu chí: {editingLog.criteriaName}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Người ghi ban đầu: {editingLog.inspectorName} ({editingLog.recordedBy})
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số lượng điều chỉnh:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú chi tiết:</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lý do điều chỉnh (Bắt buộc cho nhật ký kiểm toán):
                </label>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ví dụ: Đính chính số học sinh sau khi đối chiếu sổ trực..."
                  className="w-full p-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs focus:bg-white focus:outline-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Xác nhận cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA BẢN GHI LỖI (ĐIỂM TRỪ/THƯỞNG) */}
      {deleteConfirmLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-rose-600 via-rose-700 to-red-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">Xác Nhận Xóa Bản Ghi Lỗi</h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Khôi phục lại điểm số cho lớp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmLog(null)}
                className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <span className="text-sm font-bold">Bạn có chắc chắn muốn xóa bản ghi này?</span>
              </div>

              {/* Record Summary Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Lớp học:</span>
                  <span className="font-bold text-blue-900 text-sm">Lớp {deleteConfirmLog.className}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Tiêu chí:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[220px] truncate" title={deleteConfirmLog.criteriaName}>
                    [{deleteConfirmLog.criteriaCode}] {deleteConfirmLog.criteriaName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Điểm số:</span>
                  <span className={`font-black text-sm ${deleteConfirmLog.totalPoints > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {deleteConfirmLog.totalPoints > 0 ? `+${deleteConfirmLog.totalPoints}` : deleteConfirmLog.totalPoints} điểm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Thời gian:</span>
                  <span className="font-medium text-slate-700">{deleteConfirmLog.date} (Tuần {deleteConfirmLog.week})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Người ghi nhận:</span>
                  <span className="font-medium text-slate-700">{deleteConfirmLog.inspectorName}</span>
                </div>
                {deleteConfirmLog.note && (
                  <div className="pt-1.5 border-t border-slate-200 text-slate-600 italic">
                    Ghi chú: "{deleteConfirmLog.note}"
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Sau khi xóa, số điểm {deleteConfirmLog.totalPoints > 0 ? `thưởng (+${deleteConfirmLog.totalPoints}đ)` : `bị trừ (${deleteConfirmLog.totalPoints}đ)`} sẽ được <strong>hoàn trả lại ngay lập tức</strong> cho lớp {deleteConfirmLog.className}.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Lý do xóa bản ghi:
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ví dụ: Nhập nhầm điểm / bản ghi lỗi / đối chiếu sổ trực..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-rose-500 font-medium"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmLog(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Xác nhận xóa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: EXCEL IMPORT & VERIFICATION WORKFLOW (Requirements 12 - 17) */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        selectedWeek={selectedWeek}
        selectedCampusId={selectedCampusId}
        currentCampus={currentCampus}
        campuses={campuses}
        classes={classes}
        criteria={criteria}
        scoreLogs={scoreLogs}
        settings={settings}
        calendarWeeks={calendarWeeks}
        currentUser={currentUser}
        previewCriteriaCalculation={previewCriteriaCalculation}
        isWeekLocked={isWeekLocked}
        bulkAddScoreLogs={bulkAddScoreLogs}
        updateScoreLog={updateScoreLog}
        logAudit={logAudit}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          setTimeout(() => setSuccessMessage(null), 4500);
        }}
        onDownloadTemplate={handleDownloadExcelTemplate}
      />
    </div>
  );
};

