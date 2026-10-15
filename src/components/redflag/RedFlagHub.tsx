import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Flag,
  Calendar,
  PenTool,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Award,
  Clock,
  UserCheck,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  Filter,
  BarChart2,
  X,
  Edit2,
  Sparkles,
  ArrowRight,
  Users2,
  FileText,
  ClipboardList,
  Check,
  MapPin,
  Megaphone,
  BookOpen,
  Zap,
} from 'lucide-react';
import {
  CampusWeeklyDuty,
  RedFlagMember,
  RedFlagDuty,
  RedFlagBriefing,
  RedFlagActivityLog,
  ClassItem,
  Campus,
  ScoreLog,
} from '../../types';
import { findCriteriaByIdOrCode, OFFICIAL_CRITERIA_DATABASE } from '../../utils/criteriaEngine';

export const RedFlagHub: React.FC = () => {
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
    isWeekLocked,
    toggleLockWeek,
    addScoreLog,
    updateScoreLog,
    deleteScoreLog,
    getClassWeeklyScore,
    previewCriteriaCalculation,
    redFlagDuties,
    addRedFlagDuty,
    updateRedFlagDuty,
    deleteRedFlagDuty,
    campusWeeklyDuties,
    updateCampusWeeklyDuty,
    setWeeklyDutyAssignment,
    updateBriefingDeadline,
    redFlagMembers,
    addRedFlagMember,
    updateRedFlagMember,
    deleteRedFlagMember,
    briefingRecords,
    addBriefingRecord,
    updateBriefingRecord,
    activityLogs,
    addActivityLog,
    deleteActivityLog,
    navigateToScoring,
  } = useApp();

  if (!currentUser) return null;

  const isLocked = isWeekLocked(selectedWeek);
  const canManageLock = userRole === 'super_admin' || userRole === 'bgh' || userRole === 'tpt_doi';

  // Sub-tabs in Red Flag Management
  // 1. duty_schedule: Lịch trực & Phân công Lớp trực tuần (Tuần → Phân hiệu → Lớp trực → GVCN)
  // 2. members: Danh sách Đội viên Cờ đỏ & Phân công
  // 3. daily_shifts: Ca trực & Phân công Khu vực (Thứ 2 - Thứ 7)
  // 4. briefings: Theo dõi Giao ban Tuần
  // 5. activity_log: Nhật ký Hoạt động
  // 6. reports: Báo cáo Hoạt động Đội cờ đỏ
  // 7. unified_logs: Nhật ký nề nếp & Điểm số (Nguồn dữ liệu điểm chung)
  const [activeTab, setActiveTab] = useState<
    'duty_schedule' | 'members' | 'daily_shifts' | 'briefings' | 'activity_log' | 'reports' | 'unified_logs'
  >('duty_schedule');

  // Campus filter
  const [selectedCampusId, setSelectedCampusId] = useState<string>(() => {
    return currentUser.campusId || campuses[0]?.id || 'lhl_main';
  });

  const currentCampus = useMemo(() => {
    return campuses.find((c) => c.id === selectedCampusId) || campuses[0];
  }, [campuses, selectedCampusId]);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Duty Class for current campus and selected week
  const currentWeekDuty = useMemo(() => {
    return campusWeeklyDuties.find((d) => d.week === selectedWeek && d.campusId === selectedCampusId);
  }, [campusWeeklyDuties, selectedWeek, selectedCampusId]);

  // -------------------------------------------------------------
  // ACTION: CHUYỂN SANG MODULE NHẬP ĐIỂM THI ĐUA DUY NHẤT
  // -------------------------------------------------------------
  const handleGoToScoring = () => {
    navigateToScoring({
      campusId: selectedCampusId,
      week: selectedWeek,
      dutyArea: currentUser.dutyArea || 'Khu vực trực ban nề nếp',
      inspectorName: currentUser.name,
      fromRedFlag: true,
    });
  };

  // -------------------------------------------------------------
  // 1. LỚP TRỰC TUẦN (Tuần → Phân hiệu → Lớp trực → GVCN)
  // -------------------------------------------------------------
  const [showDutyEditModal, setShowDutyEditModal] = useState<boolean>(false);
  const [editingDutyItem, setEditingDutyItem] = useState<CampusWeeklyDuty | null>(null);
  const [dutyClassSelectId, setDutyClassSelectId] = useState<string>('');
  const [dutyNotes, setDutyNotes] = useState<string>('');
  const [dutyDeadlineDay, setDutyDeadlineDay] = useState<string>('Thứ 6');
  const [dutyDeadlineTime, setDutyDeadlineTime] = useState<string>('08:30');

  const campusClasses = useMemo(() => {
    return classes.filter((c) => c.campusId === selectedCampusId);
  }, [classes, selectedCampusId]);

  const filteredDutiesForCampus = useMemo(() => {
    return campusWeeklyDuties
      .filter((d) => d.campusId === selectedCampusId)
      .sort((a, b) => a.week - b.week);
  }, [campusWeeklyDuties, selectedCampusId]);

  const handleOpenEditDuty = (duty: CampusWeeklyDuty) => {
    setEditingDutyItem(duty);
    setDutyClassSelectId(duty.classId);
    setDutyNotes(duty.notes || '');
    setDutyDeadlineDay(duty.briefingDeadlineDay || 'Thứ 6');
    setDutyDeadlineTime(duty.briefingDeadlineTime || '08:30');
    setShowDutyEditModal(true);
  };

  const handleSaveDutyAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDutyItem || !dutyClassSelectId) return;

    setWeeklyDutyAssignment(editingDutyItem.week, editingDutyItem.campusId, dutyClassSelectId, dutyNotes.trim());
    updateBriefingDeadline(editingDutyItem.week, dutyDeadlineDay, dutyDeadlineTime);

    setSuccessMessage(
      `✅ Đã cập nhật phân công Lớp trực Tuần ${editingDutyItem.week}! GVCN lớp này tự động được cấp quyền nhập điểm trong tuần.`
    );
    setShowDutyEditModal(false);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // GHI NHẬN VI PHẠM NHANH (LƯU VÀO MODULE NHẬP ĐIỂM DUY NHẤT)
  // -------------------------------------------------------------
  const [showQuickViolationModal, setShowQuickViolationModal] = useState<boolean>(false);
  const [quickClassId, setQuickClassId] = useState<string>('');
  const [quickCriteriaId, setQuickCriteriaId] = useState<string>('');
  const [quickQuantity, setQuickQuantity] = useState<number>(2);
  const [quickNote, setQuickNote] = useState<string>('');
  const [quickDate, setQuickDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quickInspector, setQuickInspector] = useState<string>('');
  const [quickDuplicateModal, setQuickDuplicateModal] = useState<{
    existing: ScoreLog;
    pendingQuantity: number;
  } | null>(null);

  const handleOpenQuickViolation = (prefillClassId?: string) => {
    const targetClass = prefillClassId || campusClasses[0]?.id || classes[0]?.id || '';
    setQuickClassId(targetClass);
    const defaultCrit = findCriteriaByIdOrCode(criteria, 'TP02') || criteria[0] || OFFICIAL_CRITERIA_DATABASE[0];
    setQuickCriteriaId(defaultCrit?.id || '');
    setQuickQuantity(2);
    setQuickInspector(currentUser.name);
    setQuickNote('Kiểm tra nề nếp trực ban');
    setQuickDate(new Date().toISOString().split('T')[0]);
    setShowQuickViolationModal(true);
  };

  const quickTargetClass = useMemo(() => {
    return classes.find((c) => c.id === quickClassId) || campusClasses[0] || classes[0];
  }, [classes, quickClassId, campusClasses]);

  const quickTargetCriteria = useMemo(() => {
    return findCriteriaByIdOrCode(criteria, quickCriteriaId) || criteria[0] || OFFICIAL_CRITERIA_DATABASE[0];
  }, [criteria, quickCriteriaId]);

  const quickPreview = useMemo(() => {
    if (!quickTargetCriteria || !quickTargetClass || quickQuantity <= 0) return null;
    return previewCriteriaCalculation(quickTargetCriteria.id, quickQuantity, quickTargetClass.id);
  }, [quickTargetCriteria, quickTargetClass, quickQuantity, previewCriteriaCalculation]);

  const quickCurrentScore = useMemo(() => {
    if (!quickTargetClass) return 100;
    return getClassWeeklyScore(quickTargetClass.id, selectedWeek).finalScore;
  }, [quickTargetClass, selectedWeek, getClassWeeklyScore, scoreLogs]);

  const quickProjectedScore = useMemo(() => {
    if (!quickPreview) return quickCurrentScore;
    return Math.round((quickCurrentScore + quickPreview.totalPoints) * 10) / 10;
  }, [quickCurrentScore, quickPreview]);

  const quickPotentialDuplicate = useMemo(() => {
    if (!quickTargetClass || !quickTargetCriteria) return null;
    return scoreLogs.find(
      (l) =>
        l.classId === quickTargetClass.id &&
        l.week === selectedWeek &&
        (l.criteriaId === quickTargetCriteria.id || l.criteriaCode === quickTargetCriteria.code)
    );
  }, [scoreLogs, quickTargetClass, quickTargetCriteria, selectedWeek]);

  const handleSaveQuickViolation = (bypassDuplicate = false) => {
    if (!quickTargetClass || !quickTargetCriteria || !quickPreview) return;
    if (isLocked) {
      setErrorMessage(`Tuần ${selectedWeek} đã bị Ban Giám Hiệu khóa chốt dữ liệu thi đua! Không thể ghi nhận vi phạm.`);
      return;
    }

    if (quickPotentialDuplicate && !bypassDuplicate) {
      setQuickDuplicateModal({
        existing: quickPotentialDuplicate,
        pendingQuantity: quickQuantity,
      });
      return;
    }

    const res = addScoreLog({
      week: selectedWeek,
      period: quickTargetCriteria.period || 'week',
      classId: quickTargetClass.id,
      className: quickTargetClass.name,
      campusId: quickTargetClass.campusId,
      campusName: currentCampus.name,
      campusType: currentCampus.type || 'sub',
      grade: quickTargetClass.grade,
      criteriaId: quickTargetCriteria.id,
      criteriaCode: quickTargetCriteria.code,
      criteriaName: quickTargetCriteria.name,
      category: quickTargetCriteria.category,
      type: quickTargetCriteria.type,
      pointsPerUnit: quickPreview.pointsPerUnit,
      quantity: quickQuantity,
      totalPoints: quickPreview.totalPoints,
      appliedCap: quickPreview.appliedCap,
      calculationDetail: quickPreview.calculationDetail,
      note: quickNote.trim() || undefined,
      date: quickDate,
      recordedBy: `${currentUser.name} (Đội cờ đỏ)`,
      inspectorName: quickInspector.trim() || currentUser.name,
      isDisciplinary: quickPreview.isDisciplinary,
    });

    if (res.success) {
      const oldScore = quickCurrentScore;
      const newScore = quickProjectedScore;
      setSuccessMessage(
        `✅ Đã ghi nhận vi phạm "${quickTargetCriteria.name}" (${quickPreview.totalPoints}đ) cho lớp ${quickTargetClass.name}! Điểm tuần của lớp ${quickTargetClass.name} đã cập nhật ngay: ${oldScore} - ${Math.abs(quickPreview.totalPoints)} = ${newScore} điểm. Dữ liệu đã đồng bộ tức thì sang Module Nhập Điểm, Bảng Xếp Hạng và Dashboard!`
      );
      setShowQuickViolationModal(false);
      setQuickDuplicateModal(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.message || 'Lỗi khi lưu vi phạm!');
    }
  };

  const handleMergeQuickDuplicate = () => {
    if (!quickDuplicateModal) return;
    const exist = quickDuplicateModal.existing;
    const newQty = exist.quantity + quickQuantity;
    const calc = previewCriteriaCalculation(exist.criteriaId, newQty, exist.classId);

    const res = updateScoreLog(
      exist.id,
      {
        quantity: newQty,
        pointsPerUnit: calc.pointsPerUnit,
        totalPoints: calc.totalPoints,
        calculationDetail: calc.calculationDetail,
        note: `${exist.note ? `${exist.note} | ` : ''}Gộp thêm ${quickQuantity} lần (Đội cờ đỏ: ${quickInspector})`,
      },
      `Gộp số lượng vi phạm từ ${exist.quantity} lên ${newQty} lần`
    );

    if (res.success) {
      setSuccessMessage(
        `✅ Đã gộp thành công số lượng vi phạm cho lớp ${exist.className}! Số lần tăng từ ${exist.quantity} lên ${newQty} lần (${calc.totalPoints}đ). Điểm số đã đồng bộ tức thì trên toàn hệ thống.`
      );
      setShowQuickViolationModal(false);
      setQuickDuplicateModal(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.message || 'Lỗi khi gộp bản ghi!');
    }
  };

  // Logs for current campus and week (Single source of truth)
  const campusWeekScoreLogs = useMemo(() => {
    return scoreLogs
      .filter((l) => l.campusId === selectedCampusId && l.week === selectedWeek)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [scoreLogs, selectedCampusId, selectedWeek]);

  // -------------------------------------------------------------
  // 2. QUẢN LÝ ĐỘI VIÊN CỜ ĐỎ
  // -------------------------------------------------------------
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<RedFlagMember | null>(null);
  const [memberForm, setMemberForm] = useState<{
    name: string;
    classId: string;
    campusId: string;
    roleTitle: RedFlagMember['roleTitle'];
    assignedArea: string;
    assignedShift: string;
    phone: string;
    status: RedFlagMember['status'];
    notes: string;
  }>({
    name: '',
    classId: '',
    campusId: selectedCampusId,
    roleTitle: 'Đội viên',
    assignedArea: 'Khu vực cổng trường & Sân cờ',
    assignedShift: 'Đầu giờ sáng (06:45 - 07:15) & Ra chơi',
    phone: '',
    status: 'active',
    notes: '',
  });

  const filteredMembers = useMemo(() => {
    return redFlagMembers.filter((m) => m.campusId === selectedCampusId);
  }, [redFlagMembers, selectedCampusId]);

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberForm({
      name: '',
      classId: campusClasses[0]?.id || '',
      campusId: selectedCampusId,
      roleTitle: 'Đội viên',
      assignedArea: 'Khu vực cổng trường & Sân cờ',
      assignedShift: 'Đầu giờ sáng (06:45 - 07:15) & Ra chơi',
      phone: '',
      status: 'active',
      notes: '',
    });
    setShowMemberModal(true);
  };

  const handleOpenEditMember = (member: RedFlagMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      classId: member.classId,
      campusId: member.campusId,
      roleTitle: member.roleTitle,
      assignedArea: member.assignedArea,
      assignedShift: member.assignedShift,
      phone: member.phone || '',
      status: member.status,
      notes: member.notes || '',
    });
    setShowMemberModal(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const targetClass = classes.find((c) => c.id === memberForm.classId);
    if (!targetClass) {
      alert('Vui lòng chọn lớp của đội viên');
      return;
    }

    if (editingMember) {
      updateRedFlagMember(editingMember.id, {
        ...memberForm,
        className: targetClass.name,
        campusName: currentCampus.name,
      });
      setSuccessMessage('Đã cập nhật thông tin đội viên cờ đỏ!');
    } else {
      addRedFlagMember({
        ...memberForm,
        className: targetClass.name,
        campusName: currentCampus.name,
      });
      setSuccessMessage('Đã thêm đội viên cờ đỏ mới vào danh sách!');
    }
    setShowMemberModal(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteMember = (member: RedFlagMember) => {
    if (confirm(`Xác nhận xóa đội viên ${member.name} (${member.className}) khỏi danh sách?`)) {
      deleteRedFlagMember(member.id);
      setSuccessMessage('Đã xóa đội viên.');
      setTimeout(() => setSuccessMessage(null), 2500);
    }
  };

  // -------------------------------------------------------------
  // 3. CA TRỰC HÀNG NGÀY (Thứ 2 - Thứ 7)
  // -------------------------------------------------------------
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<{
    dayOfWeek: RedFlagDuty['dayOfWeek'];
    assignedClassId: string;
    inspectorNames: string;
    dutyArea: string;
    shiftName: string;
    tasks: string;
    notes: string;
  }>({
    dayOfWeek: 'Thứ 2',
    assignedClassId: campusClasses[0]?.id || '',
    inspectorNames: '',
    dutyArea: 'Khu phòng học & Cổng trường',
    shiftName: 'Ca sáng (06:45 - 07:15 & Ra chơi)',
    tasks: 'Kiểm tra khăn quàng, sơ vin, vệ sinh và trật tự đầu giờ',
    notes: '',
  });

  const filteredShifts = useMemo(() => {
    return redFlagDuties.filter((d) => d.week === selectedWeek && d.campusId === selectedCampusId);
  }, [redFlagDuties, selectedWeek, selectedCampusId]);

  const handleOpenAddShift = () => {
    setEditingShiftId(null);
    setShiftForm({
      dayOfWeek: 'Thứ 2',
      assignedClassId: currentWeekDuty?.classId || campusClasses[0]?.id || '',
      inspectorNames: '',
      dutyArea: 'Khu phòng học Khối 8 & Khối 9 và Cổng trường',
      shiftName: 'Ca sáng (06:45 - 07:15 & Ra chơi)',
      tasks: 'Kiểm tra khăn quàng, sơ vin, vệ sinh và trật tự đầu giờ',
      notes: '',
    });
    setShowShiftModal(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedClass = classes.find((c) => c.id === shiftForm.assignedClassId);
    if (!assignedClass) {
      alert('Vui lòng chọn lớp phụ trách ca trực');
      return;
    }

    if (editingShiftId) {
      updateRedFlagDuty(editingShiftId, {
        week: selectedWeek,
        campusId: selectedCampusId,
        dayOfWeek: shiftForm.dayOfWeek,
        assignedClassId: assignedClass.id,
        assignedClassName: assignedClass.name,
        inspectorNames: shiftForm.inspectorNames.trim(),
        dutyArea: shiftForm.dutyArea.trim(),
        shiftName: shiftForm.shiftName.trim(),
        tasks: shiftForm.tasks.trim(),
        notes: shiftForm.notes.trim(),
      });
      setSuccessMessage('Đã cập nhật ca trực!');
    } else {
      addRedFlagDuty({
        week: selectedWeek,
        campusId: selectedCampusId,
        dayOfWeek: shiftForm.dayOfWeek,
        assignedClassId: assignedClass.id,
        assignedClassName: assignedClass.name,
        inspectorNames: shiftForm.inspectorNames.trim(),
        dutyArea: shiftForm.dutyArea.trim(),
        shiftName: shiftForm.shiftName.trim(),
        tasks: shiftForm.tasks.trim(),
        notes: shiftForm.notes.trim(),
      });
      setSuccessMessage('Đã thêm phân công ca trực mới!');
    }
    setShowShiftModal(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // -------------------------------------------------------------
  // 4. THEO DÕI GIAO BAN TUẦN
  // -------------------------------------------------------------
  const [showBriefingModal, setShowBriefingModal] = useState<boolean>(false);
  const [briefingForm, setBriefingForm] = useState<{
    meetingDate: string;
    meetingTime: string;
    presidedBy: string;
    logBookHandedOver: boolean;
    attendeesCount: number;
    status: RedFlagBriefing['status'];
    conclusionSummary: string;
    notes: string;
  }>({
    meetingDate: new Date().toISOString().split('T')[0],
    meetingTime: '08:30',
    presidedBy: 'Cô Lê Thị Hoa (Tổng Phụ Trách Đội)',
    logBookHandedOver: true,
    attendeesCount: 16,
    status: 'completed',
    conclusionSummary: 'Đã hoàn thành giao ban nề nếp tuần, bàn giao sổ trực và đối chiếu số liệu.',
    notes: '',
  });

  const currentCampusBriefings = useMemo(() => {
    return briefingRecords.filter((b) => b.campusId === selectedCampusId);
  }, [briefingRecords, selectedCampusId]);

  const handleSaveBriefing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWeekDuty) {
      alert('Chưa có thông tin lớp trực ban tuần này');
      return;
    }

    addBriefingRecord({
      week: selectedWeek,
      campusId: selectedCampusId,
      dutyClassId: currentWeekDuty.classId,
      dutyClassName: currentWeekDuty.className,
      dutyTeacherName: currentWeekDuty.homeroomTeacher,
      ...briefingForm,
    });

    setSuccessMessage('Đã ghi nhận biên bản giao ban tuần thành công!');
    setShowBriefingModal(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // -------------------------------------------------------------
  // 5. NHẬT KÝ HOẠT ĐỘNG
  // -------------------------------------------------------------
  const [showActivityModal, setShowActivityModal] = useState<boolean>(false);
  const [activityForm, setActivityForm] = useState<{
    date: string;
    time: string;
    area: string;
    reporterName: string;
    activityType: RedFlagActivityLog['activityType'];
    title: string;
    content: string;
    result: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: '07:00',
    area: 'Cổng trường chính',
    reporterName: currentUser.name,
    activityType: 'patrol',
    title: '',
    content: '',
    result: '',
  });

  const campusActivities = useMemo(() => {
    return activityLogs.filter((a) => a.campusId === selectedCampusId && a.week === selectedWeek);
  }, [activityLogs, selectedCampusId, selectedWeek]);

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title || !activityForm.content) {
      alert('Vui lòng nhập tiêu đề và nội dung sự việc');
      return;
    }

    addActivityLog({
      week: selectedWeek,
      campusId: selectedCampusId,
      ...activityForm,
    });

    setSuccessMessage('Đã lưu nhật ký hoạt động cờ đỏ!');
    setShowActivityModal(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & PROMINENT SCORING NAVIGATION BUTTON */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-rose-100">
              <Flag size={14} className="text-yellow-300 animate-pulse" />
              <span>CÔNG TÁC ĐỘI & ĐỘI CỜ ĐỎ TRỰC BAN</span>
              <span className="opacity-60">•</span>
              <span>QUẢN LÝ HOẠT ĐỘNG THỐNG NHẤT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              MODULE ĐỘI CỜ ĐỎ
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl leading-relaxed">
              Tập trung quản lý toàn diện đội viên cờ đỏ, ca trực, phân công lớp trực tuần (Tuần → Phân hiệu → Lớp trực → GVCN), sổ tay nề nếp và giao ban Liên đội.
            </p>
          </div>

          {/* PROMINENT BUTTONS: CHUYỂN SANG MODULE NHẬP ĐIỂM HOẶC GHI NHẬN VI PHẠM NHANH */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleOpenQuickViolation()}
              className="w-full sm:w-auto px-5 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95 border border-rose-400"
            >
              <Zap size={18} className="text-yellow-300" />
              <span>GHI NHẬN VI PHẠM NHANH (LƯU VÀO MODULE DUY NHẤT)</span>
            </button>
            <button
              onClick={handleGoToScoring}
              className="w-full sm:w-auto px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
            >
              <PenTool size={18} className="text-slate-950" />
              <span>CHẤM ĐIỂM THI ĐUA (VÀO MODULE DUY NHẤT)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Info Banner on Unified Scoring Architecture */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-100">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-yellow-300 shrink-0" />
            <span>
              Quy tắc cốt lõi: <strong>Không có bảng điểm riêng của Đội cờ đỏ.</strong> Mọi vi phạm ghi nhận sẽ lưu thẳng vào một nguồn dữ liệu thi đua duy nhất của trường.
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/30 px-3 py-1 rounded-lg">
            <span>Tuần:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-transparent text-white font-bold text-xs outline-hidden cursor-pointer"
            >
              {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="text-slate-900">
                  Tuần {w} {isWeekLocked(w) ? '🔒' : '🟢'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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

      {/* 2. CAMPUS SELECTION STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
          <MapPin size={16} className="text-rose-600" />
          <span>Đang xem hoạt động tại Phân hiệu:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {campuses.map((camp) => (
            <button
              key={camp.id}
              type="button"
              onClick={() => setSelectedCampusId(camp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCampusId === camp.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {camp.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. NAVIGATION TABS INSIDE RED FLAG MODULE */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('duty_schedule')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'duty_schedule'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} />
          <span>1. Lịch trực & Lớp trực tuần</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'members'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users2 size={16} />
          <span>2. Danh sách Đội viên cờ đỏ ({filteredMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('daily_shifts')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'daily_shifts'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={16} />
          <span>3. Ca trực & Khu vực (Thứ 2 - 7)</span>
        </button>

        <button
          onClick={() => setActiveTab('briefings')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'briefings'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={16} />
          <span>4. Theo dõi Giao ban tuần</span>
        </button>

        <button
          onClick={() => setActiveTab('activity_log')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'activity_log'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText size={16} />
          <span>5. Nhật ký Hoạt động</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart2 size={16} />
          <span>6. Báo cáo & Thống kê</span>
        </button>

        <button
          onClick={() => setActiveTab('unified_logs')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'unified_logs'
              ? 'border-rose-600 text-rose-700 bg-rose-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>7. Nhật ký nề nếp & Điểm số ({campusWeekScoreLogs.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PHÂN CÔNG LỚP TRỰC TUẦN (Tuần → Phân hiệu → Lớp trực → GVCN) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'duty_schedule' && (
        <div className="space-y-5">
          {/* Active Week Duty Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-white p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
                Lớp trực ban hiện tại: Tuần {selectedWeek} • {currentCampus.name}
              </span>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>Lớp trực ban: {currentWeekDuty?.className || 'Chưa phân công'}</span>
                <span className="text-sm font-bold text-slate-600 font-normal">
                  — GVCN: {currentWeekDuty?.homeroomTeacher || 'Chưa có'}
                </span>
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {currentWeekDuty?.dutyRoleDescription ||
                  'Chịu trách nhiệm theo dõi nề nếp, cử học sinh trực ban đầu giờ, ghi nhận biên bản và báo cáo giao ban tuần.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              {currentWeekDuty && (
                <button
                  type="button"
                  onClick={() => handleOpenEditDuty(currentWeekDuty)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 size={14} className="text-blue-600" />
                  <span>Điều chỉnh lớp trực tuần {selectedWeek}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGoToScoring}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <PenTool size={14} />
                <span>Nhập điểm tuần {selectedWeek}</span>
              </button>
            </div>
          </div>

          {/* Full Schedule Table: Weeks 1 to 35 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Calendar size={18} className="text-rose-600" />
                  <span>BẢNG PHÂN CÔNG LỚP TRỰC TUẦN NĂM HỌC 2026 - 2027</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Phân hiệu: <strong>{currentCampus.name}</strong> • Cấu trúc: <strong>Tuần → Phân hiệu → Lớp trực → GVCN</strong>
                </p>
              </div>

              <div className="text-xs text-slate-500 bg-blue-50 text-blue-900 p-2 rounded-xl border border-blue-100">
                💡 Khi lớp được phân công trực, GVCN lớp đó tự động được cấp quyền nhập điểm trong tuần đó.
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">Tuần</th>
                    <th className="py-2.5 px-3">Lớp trực</th>
                    <th className="py-2.5 px-3">GVCN lớp trực</th>
                    <th className="py-2.5 px-3">Quyền nhập điểm</th>
                    <th className="py-2.5 px-3">Hạn nộp giao ban</th>
                    <th className="py-2.5 px-3">Nhiệm vụ trực ban</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDutiesForCampus.map((duty) => {
                    const isSelected = duty.week === selectedWeek;
                    const isLockedWeek = isWeekLocked(duty.week);

                    return (
                      <tr
                        key={duty.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-amber-50/80 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                              isSelected
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Tuần {duty.week}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-blue-950">
                          Lớp {duty.className}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          {duty.homeroomTeacher}
                        </td>
                        <td className="py-2.5 px-3">
                          {isLockedWeek ? (
                            <span className="text-amber-700 text-[11px] font-bold flex items-center gap-1">
                              <Lock size={12} /> Đã chốt sổ
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Cấp quyền tuần {duty.week}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {duty.briefingDeadlineDay || 'Thứ 6'} – {duty.briefingDeadlineTime || '08:30'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">
                          {duty.dutyRoleDescription || duty.notes || 'Trực ban nề nếp toàn trường'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDuty(duty)}
                            className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                          >
                            Đổi lớp
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DANH SÁCH ĐỘI VIÊN CỜ ĐỎ */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Users2 size={18} className="text-rose-600" />
                  <span>DANH SÁCH ĐỘI VIÊN CỜ ĐỎ ({currentCampus.name})</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Lực lượng nòng cốt chấm chéo nề nếp, tác phong và kiểm soát an toàn trường học.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddMember}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Thêm đội viên mới</span>
              </button>
            </div>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-50/70 hover:bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-black text-slate-900 text-sm">{member.name}</h5>
                      <span className="text-[11px] text-slate-500 font-bold">Lớp {member.className}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        member.roleTitle === 'Đội trưởng'
                          ? 'bg-rose-600 text-white'
                          : member.roleTitle === 'Đội phó'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {member.roleTitle}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-rose-500 shrink-0" />
                      <span className="truncate">Khu vực: <strong>{member.assignedArea}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-indigo-500 shrink-0" />
                      <span className="truncate">Ca trực: {member.assignedShift}</span>
                    </div>
                    {member.phone && (
                      <div className="text-slate-400">ĐT: {member.phone}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditMember(member)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-[11px] cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(member)}
                      className="text-rose-600 hover:text-rose-800 font-bold text-[11px] cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CA TRỰC HÀNG NGÀY & KHU VỰC (Thứ 2 đến Thứ 7) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'daily_shifts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Clock size={18} className="text-rose-600" />
                  <span>PHÂN CÔNG CA TRỰC & KHU VỰC (TUẦN {selectedWeek} • {currentCampus.name})</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Lịch trực theo ngày trong tuần từ Thứ 2 đến Thứ 7, giám sát nề nếp cổng trường và các dãy hành lang.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddShift}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Thêm ca trực mới</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">Ngày trực</th>
                    <th className="py-2.5 px-3">Lớp phụ trách</th>
                    <th className="py-2.5 px-3">Học sinh / Đội viên trực</th>
                    <th className="py-2.5 px-3">Khu vực phân công</th>
                    <th className="py-2.5 px-3">Ca trực</th>
                    <th className="py-2.5 px-3">Nhiệm vụ cụ thể</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{shift.dayOfWeek}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-900">Lớp {shift.assignedClassName}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{shift.inspectorNames}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">{shift.dutyArea}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{shift.shiftName || 'Ca sáng'}</td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{shift.tasks || shift.notes || '--'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Xác nhận xóa ca trực này?')) {
                              deleteRedFlagDuty(shift.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredShifts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Chưa có lịch trực ngày nào trong Tuần {selectedWeek} tại phân hiệu này. Nhấn "Thêm ca trực mới" để thiết lập.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: THEO DÕI GIAO BAN TUẦN */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'briefings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <ClipboardList size={18} className="text-rose-600" />
                  <span>SỔ THEO DÕI HỌP GIAO BAN TUẦN ({currentCampus.name})</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Thời gian họp giao ban mặc định: <strong>Thứ Sáu – 08:30</strong>. Kiểm tra bàn giao sổ trực ban và chốt dữ liệu tuần.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBriefingModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Ghi biên bản giao ban tuần {selectedWeek}</span>
              </button>
            </div>

            <div className="space-y-3">
              {currentCampusBriefings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white space-y-2 text-xs transition-all shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">Giao ban Tuần {b.week}</span>
                      <span className="text-slate-500">• Ngày: {b.meetingDate} ({b.meetingTime})</span>
                      <span className="text-slate-500">• Chủ trì: <strong>{b.presidedBy}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.logBookHandedOver ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1">
                          <CheckCircle2 size={12} /> Đã nộp sổ trực
                        </span>
                      ) : (
                        <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                          Chưa nộp sổ trực
                        </span>
                      )}
                      <span className="text-slate-500 text-[11px]">Có mặt: {b.attendeesCount} ĐV & GV</span>
                    </div>
                  </div>

                  <div className="text-slate-700 leading-relaxed">
                    <strong>Kết luận giao ban:</strong> {b.conclusionSummary}
                  </div>

                  {b.notes && (
                    <div className="text-slate-500 text-[11px] italic">Ghi chú: {b.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: NHẬT KÝ HOẠT ĐỘNG */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'activity_log' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <FileText size={18} className="text-rose-600" />
                  <span>NHẬT KÝ HOẠT ĐỘNG ĐỘI CỜ ĐỎ (TUẦN {selectedWeek})</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Ghi chép các sự việc đột xuất, hoạt động hỗ trợ an toàn giao thông, sơ cứu, nhặt đồ thất lạc...
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowActivityModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Ghi nhật ký mới</span>
              </button>
            </div>

            <div className="space-y-3">
              {campusActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white space-y-2 text-xs transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                    <span className="font-black text-slate-900 text-sm">{act.title}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {act.date} {act.time} • {act.area}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{act.content}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Kết quả: <strong className="text-emerald-700">{act.result}</strong></span>
                    <span>Người ghi: {act.reporterName}</span>
                  </div>
                </div>
              ))}
              {campusActivities.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  Chưa có nhật ký hoạt động nào được ghi nhận cho Tuần {selectedWeek}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: BÁO CÁO & THỐNG KÊ HOẠT ĐỘNG */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <BarChart2 size={18} className="text-rose-600" />
              <span>BÁO CÁO HOẠT ĐỘNG & TỔNG KẾT NỀ NẾP (TUẦN {selectedWeek})</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-center space-y-1">
                <span className="text-xs text-blue-700 font-bold">Tổng số đội viên</span>
                <div className="text-2xl font-black text-blue-950">{filteredMembers.length}</div>
                <span className="text-[11px] text-blue-600">Đang hoạt động nền nếp</span>
              </div>
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 text-center space-y-1">
                <span className="text-xs text-emerald-700 font-bold">Ca trực trong tuần</span>
                <div className="text-2xl font-black text-emerald-950">{filteredShifts.length}</div>
                <span className="text-[11px] text-emerald-600">Phân công Thứ 2 - Thứ 7</span>
              </div>
              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 text-center space-y-1">
                <span className="text-xs text-purple-700 font-bold">Sự việc ghi nhận</span>
                <div className="text-2xl font-black text-purple-950">{campusActivities.length}</div>
                <span className="text-[11px] text-purple-600">Nhật ký xử lý tại chỗ</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <h5 className="font-extrabold text-slate-900">Đánh giá chung tuần {selectedWeek}:</h5>
              <p>
                Đội cờ đỏ duy trì nghiêm túc các ca trực đầu giờ và giờ ra chơi. Công tác an toàn giao thông trước cổng trường và nề nếp xếp hàng thể dục giữa giờ được thực hiện tốt.
              </p>
              <p>
                Toàn bộ dữ liệu chấm điểm vi phạm và cộng điểm khen thưởng đã được đồng bộ trực tiếp sang <strong>Module Nhập điểm Thi đua Thống nhất</strong> để tính điểm xếp hạng thi đua.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: NHẬT KÝ NỀ NẾP & ĐIỂM SỐ (NGUỒN DỮ LIỆU ĐIỂM CHUNG) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'unified_logs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    NHẬT KÝ NỀ NẾP & ĐIỂM THI ĐUA (NGUỒN DỮ LIỆU CHUNG DUY NHẤT)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Phân hiệu: <strong>{currentCampus.name}</strong> • Tuần: <strong>Tuần {selectedWeek}</strong> • Toàn bộ bản ghi được tính điểm tức thì vào bảng điểm lớp.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenQuickViolation()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Zap size={14} className="text-yellow-300" />
                  <span>Ghi nhận vi phạm nhanh</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoToScoring}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <PenTool size={14} />
                  <span>Mở Module Nhập điểm</span>
                </button>
              </div>
            </div>

            {/* Overview Stats for this campus and week */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 block">TỔNG BIÊN BẢN TUẦN</span>
                <span className="text-xl font-black text-slate-900">{campusWeekScoreLogs.length}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[11px] font-bold text-rose-700 block">TỔNG ĐIỂM TRỪ VI PHẠM</span>
                <span className="text-xl font-black text-rose-600">
                  -{campusWeekScoreLogs.filter(l => l.totalPoints < 0).reduce((acc, l) => acc + Math.abs(l.totalPoints), 0)}đ
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 block">TỔNG ĐIỂM CỘNG THƯỞNG</span>
                <span className="text-xl font-black text-emerald-600">
                  +{campusWeekScoreLogs.filter(l => l.totalPoints > 0).reduce((acc, l) => acc + l.totalPoints, 0)}đ
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[11px] font-bold text-blue-700 block">ĐIỂM CƠ SỞ TUẦN</span>
                <span className="text-xl font-black text-blue-800">100 điểm</span>
              </div>
            </div>

            {/* Score Logs Table */}
            {campusWeekScoreLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-600">Chưa có biên bản nề nếp nào trong Tuần {selectedWeek}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Tất cả các lớp tại {currentCampus.name} hiện đang duy trì trọn vẹn 100 điểm thi đua!
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenQuickViolation()}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:bg-rose-700"
                >
                  <Plus size={14} />
                  <span>Ghi nhận vi phạm đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Lớp</th>
                      <th className="p-2.5">Tiêu chí vi phạm / Khen thưởng</th>
                      <th className="p-2.5 text-center">Số lần</th>
                      <th className="p-2.5 text-center">Điểm ghi nhận</th>
                      <th className="p-2.5 text-center">Điểm tuần lớp</th>
                      <th className="p-2.5">Người ghi nhận</th>
                      <th className="p-2.5">Ngày</th>
                      <th className="p-2.5">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campusWeekScoreLogs.map((log) => {
                      const classScore = getClassWeeklyScore(log.classId, selectedWeek);
                      const isBonus = log.type === 'bonus' || log.totalPoints > 0;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-black text-slate-900">
                            Lớp {log.className}
                          </td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800">{log.criteriaName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">[{log.criteriaCode || log.category}]</span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-700">
                            {log.quantity}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                              isBonus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isBonus ? `+${log.totalPoints}` : log.totalPoints}đ
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-black text-blue-900 bg-blue-50/40 rounded-lg">
                            {classScore.finalScore}đ
                          </td>
                          <td className="p-2.5 text-slate-600">
                            <span className="font-semibold">{log.inspectorName || log.recordedBy}</span>
                          </td>
                          <td className="p-2.5 text-slate-500 whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="p-2.5 text-slate-500 max-w-xs truncate">
                            {log.note || '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ĐIỀU CHỈNH PHÂN CÔNG LỚP TRỰC TUẦN */}
      {/* ------------------------------------------------------------- */}
      {showDutyEditModal && editingDutyItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Calendar size={18} className="text-rose-600" />
                <span>Phân công Lớp trực Tuần {editingDutyItem.week}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDutyEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDutyAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Lớp trực ban Tuần {editingDutyItem.week} ({currentCampus.name}): *
                </label>
                <select
                  value={dutyClassSelectId}
                  onChange={(e) => setDutyClassSelectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-blue-500 cursor-pointer"
                >
                  {campusClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.name} (GVCN: {cls.homeroomTeacher})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  GVCN của lớp này sẽ tự động được cấp quyền nhập điểm thi đua trong Tuần {editingDutyItem.week}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạn giao ban (Thứ):</label>
                  <select
                    value={dutyDeadlineDay}
                    onChange={(e) => setDutyDeadlineDay(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-500 cursor-pointer"
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
                    value={dutyDeadlineTime}
                    onChange={(e) => setDutyDeadlineTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú nhiệm vụ:</label>
                <textarea
                  rows={2}
                  value={dutyNotes}
                  onChange={(e) => setDutyNotes(e.target.value)}
                  placeholder="Ghi chú phân công trực ban tuần..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDutyEditModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: THÊM / SỬA ĐỘI VIÊN CỜ ĐỎ */}
      {/* ------------------------------------------------------------- */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingMember ? 'Cập nhật đội viên cờ đỏ' : 'Thêm đội viên cờ đỏ mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ và tên học sinh: *</label>
                <input
                  type="text"
                  required
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  placeholder="Ví dụ: Em Nguyễn Văn An"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chi đội / Lớp: *</label>
                  <select
                    value={memberForm.classId}
                    onChange={(e) => setMemberForm({ ...memberForm, classId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500 cursor-pointer"
                  >
                    {campusClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Lớp {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chức vụ trong đội: *</label>
                  <select
                    value={memberForm.roleTitle}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, roleTitle: e.target.value as RedFlagMember['roleTitle'] })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500 cursor-pointer"
                  >
                    <option value="Đội trưởng">Đội trưởng</option>
                    <option value="Đội phó">Đội phó</option>
                    <option value="Ủy viên BCH">Ủy viên BCH</option>
                    <option value="Đội viên">Đội viên</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Khu vực thường trực phân công:</label>
                <input
                  type="text"
                  value={memberForm.assignedArea}
                  onChange={(e) => setMemberForm({ ...memberForm, assignedArea: e.target.value })}
                  placeholder="Ví dụ: Cổng trường & Dãy nhà A..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ca trực thường trực:</label>
                <input
                  type="text"
                  value={memberForm.assignedShift}
                  onChange={(e) => setMemberForm({ ...memberForm, assignedShift: e.target.value })}
                  placeholder="Ví dụ: Đầu giờ sáng & Ra chơi..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên lạc:</label>
                <input
                  type="text"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  placeholder="0912..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu đội viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: THÊM / SỬA CA TRỰC HÀNG NGÀY */}
      {/* ------------------------------------------------------------- */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingShiftId ? 'Cập nhật ca trực' : 'Thêm ca trực cờ đỏ mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày trực: *</label>
                  <select
                    value={shiftForm.dayOfWeek}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, dayOfWeek: e.target.value as RedFlagDuty['dayOfWeek'] })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500 cursor-pointer"
                  >
                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lớp trực: *</label>
                  <select
                    value={shiftForm.assignedClassId}
                    onChange={(e) => setShiftForm({ ...shiftForm, assignedClassId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500 cursor-pointer"
                  >
                    {campusClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Lớp {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ tên các học sinh trực: *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.inspectorNames}
                  onChange={(e) => setShiftForm({ ...shiftForm, inspectorNames: e.target.value })}
                  placeholder="Ví dụ: Lê Hải Đăng, Nguyễn Thu Hà..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Khu vực phân công: *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.dutyArea}
                  onChange={(e) => setShiftForm({ ...shiftForm, dutyArea: e.target.value })}
                  placeholder="Ví dụ: Khu phòng học Khối 8, 9 & Cổng trường..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhiệm vụ cụ thể:</label>
                <input
                  type="text"
                  value={shiftForm.tasks}
                  onChange={(e) => setShiftForm({ ...shiftForm, tasks: e.target.value })}
                  placeholder="Kiểm tra khăn quàng, sơ vin, trật tự..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu ca trực
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: BIÊN BẢN GIAO BAN TUẦN */}
      {/* ------------------------------------------------------------- */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Biên bản giao ban Tuần {selectedWeek}
              </h3>
              <button
                type="button"
                onClick={() => setShowBriefingModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBriefing} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày giao ban:</label>
                  <input
                    type="date"
                    value={briefingForm.meetingDate}
                    onChange={(e) => setBriefingForm({ ...briefingForm, meetingDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ giao ban:</label>
                  <input
                    type="time"
                    value={briefingForm.meetingTime}
                    onChange={(e) => setBriefingForm({ ...briefingForm, meetingTime: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chủ trì cuộc họp:</label>
                <input
                  type="text"
                  value={briefingForm.presidedBy}
                  onChange={(e) => setBriefingForm({ ...briefingForm, presidedBy: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kết luận giao ban tuần: *</label>
                <textarea
                  rows={3}
                  required
                  value={briefingForm.conclusionSummary}
                  onChange={(e) => setBriefingForm({ ...briefingForm, conclusionSummary: e.target.value })}
                  placeholder="Ghi nhận tổng kết nề nếp, tuyên dương hoặc nhắc nhở các chi đội..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="logBookHandedOver"
                  checked={briefingForm.logBookHandedOver}
                  onChange={(e) => setBriefingForm({ ...briefingForm, logBookHandedOver: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="logBookHandedOver" className="font-bold text-slate-800 cursor-pointer">
                  Đã bàn giao sổ theo dõi trực ban có chữ ký của GVCN
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBriefingModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu biên bản giao ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: GHI NHẬT KÝ HOẠT ĐỘNG */}
      {/* ------------------------------------------------------------- */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Ghi nhật ký hoạt động cờ đỏ</h3>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tiêu đề sự việc / hoạt động: *</label>
                <input
                  type="text"
                  required
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  placeholder="Ví dụ: Phân luồng giao thông cổng trường..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thời gian:</label>
                  <input
                    type="time"
                    value={activityForm.time}
                    onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khu vực:</label>
                  <input
                    type="text"
                    value={activityForm.area}
                    onChange={(e) => setActivityForm({ ...activityForm, area: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung chi tiết: *</label>
                <textarea
                  rows={3}
                  required
                  value={activityForm.content}
                  onChange={(e) => setActivityForm({ ...activityForm, content: e.target.value })}
                  placeholder="Mô tả diễn biến sự việc hoặc hoạt động..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kết quả xử lý:</label>
                <input
                  type="text"
                  value={activityForm.result}
                  onChange={(e) => setActivityForm({ ...activityForm, result: e.target.value })}
                  placeholder="Đã giải quyết ổn thỏa, giao ban báo cáo..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Lưu nhật ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: GHI NHẬN VI PHẠM NHANH (LƯU VÀO MODULE DUY NHẤT) */}
      {/* ------------------------------------------------------------- */}
      {showQuickViolationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    GHI NHẬN VI PHẠM NỀ NẾP (LƯU VÀO MODULE DUY NHẤT)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân hiệu: <strong>{currentCampus.name}</strong> • Tuần: <strong>Tuần {selectedWeek}</strong> • Lưu vào cùng cơ sở dữ liệu chung.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickViolationModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Class Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Chọn Lớp vi phạm ({campusClasses.length} lớp tại {currentCampus.name}): *
                </label>
                <select
                  value={quickClassId}
                  onChange={(e) => setQuickClassId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-blue-500 cursor-pointer"
                >
                  {campusClasses.map((cls) => {
                    const score = getClassWeeklyScore(cls.id, selectedWeek);
                    return (
                      <option key={cls.id} value={cls.id}>
                        Lớp {cls.name} (Điểm hiện tại: {score.finalScore}đ • GVCN: {cls.homeroomTeacher})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Criteria Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Chọn Tiêu chí vi phạm / Khen thưởng: *
                </label>
                <select
                  value={quickCriteriaId}
                  onChange={(e) => setQuickCriteriaId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-blue-500 cursor-pointer"
                >
                  {criteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} ({c.type === 'bonus' ? '+' : '-'}{c.points}đ/{c.unit})
                    </option>
                  ))}
                </select>
                {quickTargetCriteria?.description && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    ℹ️ {quickTargetCriteria.description}
                  </p>
                )}
              </div>

              {/* Quantity & Inspector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Số lần / Số học sinh ({quickTargetCriteria?.unit || 'lần'}): *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quickQuantity}
                    onChange={(e) => setQuickQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:bg-white focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người chấm / Đội cờ đỏ: *</label>
                  <input
                    type="text"
                    value={quickInspector}
                    onChange={(e) => setQuickInspector(e.target.value)}
                    placeholder="Tên đội viên cờ đỏ..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-blue-500"
                  />
                </div>
              </div>

              {/* Note & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú sự việc:</label>
                  <input
                    type="text"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Mô tả cụ thể hoặc tên học sinh..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày ghi nhận:</label>
                  <input
                    type="date"
                    value={quickDate}
                    onChange={(e) => setQuickDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-500"
                  />
                </div>
              </div>

              {/* REAL-TIME PREVIEW CARD */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-xs font-bold text-blue-200">
                  <span>DỰ TOÁN ĐIỂM SỐ LỚP {quickTargetClass?.name}</span>
                  <span className="px-2 py-0.5 bg-white/10 rounded-md">Tuần {selectedWeek}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/10">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-300 block">Điểm hiện tại</span>
                    <span className="text-base font-black text-white">{quickCurrentScore}đ</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-[10px] text-rose-300 block">Mức trừ / cộng</span>
                    <span className={`text-base font-black ${
                      (quickPreview?.totalPoints || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {(quickPreview?.totalPoints || 0) > 0 ? `+${quickPreview?.totalPoints}` : quickPreview?.totalPoints || 0}đ
                    </span>
                  </div>
                  <div className="bg-white/10 p-2 rounded-lg border border-yellow-400/30">
                    <span className="text-[10px] text-yellow-300 block font-bold">Điểm sau khi lưu</span>
                    <span className="text-base font-black text-yellow-300">{quickProjectedScore}đ</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 pt-1 text-center font-mono">
                  {quickPreview?.calculationDetail}
                </div>
              </div>

              {/* POTENTIAL DUPLICATE WARNING */}
              {quickPotentialDuplicate && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-amber-950">
                      CẢNH BÁO TRÙNG LẶP: Lớp {quickTargetClass?.name} đã có biên bản "{quickTargetCriteria?.name}" trong Tuần {selectedWeek}!
                    </p>
                    <p className="text-amber-800">
                      Ghi nhận trước đó bởi: <strong>{quickPotentialDuplicate.inspectorName || quickPotentialDuplicate.recordedBy}</strong> (Số lượng: {quickPotentialDuplicate.quantity} lần).
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowQuickViolationModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <div className="flex items-center gap-2">
                {quickPotentialDuplicate && (
                  <button
                    type="button"
                    onClick={() => handleSaveQuickViolation(true)}
                    className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs cursor-pointer"
                  >
                    Lưu riêng biệt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveQuickViolation(false)}
                  disabled={isLocked}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Xác nhận & Lưu vào Bảng điểm chung</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: XỬ LÝ TRÙNG LẶP (GỘP SỐ LƯỢNG HOẶC LƯU RIÊNG) */}
      {/* ------------------------------------------------------------- */}
      {quickDuplicateModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-700 pb-3 border-b border-amber-100">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">PHÁT HIỆN KHẢ NĂNG TRÙNG LẶP</h3>
                <p className="text-xs text-amber-800">Cùng lớp, cùng tiêu chí trong Tuần {selectedWeek}</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 space-y-2">
              <p>
                Lớp <strong>{quickDuplicateModal.existing.className}</strong> đã được ghi nhận lỗi{' '}
                <strong>"{quickDuplicateModal.existing.criteriaName}"</strong> trước đó với số lượng là{' '}
                <strong>{quickDuplicateModal.existing.quantity} lần</strong> (bởi{' '}
                {quickDuplicateModal.existing.inspectorName || quickDuplicateModal.existing.recordedBy}).
              </p>
              <p className="text-slate-500 italic">
                Để tránh trừ điểm hai lần cho cùng một sự việc, vui lòng chọn cách xử lý:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleMergeQuickDuplicate}
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs cursor-pointer transition-all"
              >
                <div className="font-extrabold text-blue-900 flex items-center justify-between">
                  <span>1. Gộp số lượng vào bản ghi hiện có</span>
                  <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">Khuyên dùng</span>
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">
                  Tăng từ {quickDuplicateModal.existing.quantity} lên {quickDuplicateModal.existing.quantity + quickQuantity} lần vi phạm. Không tạo bản ghi dư thừa.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuickViolation(true)}
                className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs cursor-pointer transition-all"
              >
                <div className="font-extrabold text-slate-900">
                  2. Lưu thành bản ghi riêng biệt
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Xác nhận đây là 2 sự việc vi phạm hoàn toàn khác nhau vào 2 thời điểm khác nhau.
                </div>
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setQuickDuplicateModal(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
              >
                Hủy bỏ thao tác
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
