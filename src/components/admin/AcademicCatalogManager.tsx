import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  School,
  Layers,
  GraduationCap,
  Users,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Power,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowRight,
  Database,
  Info,
  Clock,
  Save,
  X,
  Sparkles,
  CalendarClock,
  Sliders,
} from 'lucide-react';
import {
  AcademicYear,
  GradeItem,
  TeacherItem,
  ClassItem,
  Campus,
  CalendarWeekConfig,
} from '../../types';
import { ClassExcelBatchImporter } from './ClassExcelBatchImporter';
import { generateClassExcelTemplateContent, runSystemDataIntegrityCheck } from '../../utils/academicCatalogEngine';
import { ComprehensiveTestSuiteView } from './ComprehensiveTestSuiteView';

type CatalogSubTab =
  | 'years'
  | 'campuses'
  | 'grades'
  | 'classes'
  | 'batch_import'
  | 'teachers'
  | 'calendar'
  | 'criteria_year'
  | 'integrity'
  | 'comprehensive_tests';

export const AcademicCatalogManager: React.FC = () => {
  const {
    userRole,
    currentUser,
    academicYears,
    activeAcademicYearId,
    addAcademicYear,
    updateAcademicYear,
    setActiveAcademicYear,
    campuses,
    addCampus,
    updateCampus,
    deleteCampus,
    toggleCampusStatus,
    grades,
    addGrade,
    updateGrade,
    deleteGrade,
    classes,
    addClass,
    updateClass,
    deleteClass,
    toggleClassStatus,
    batchImportClasses,
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    reassignHomeroomTeacher,
    calendarWeeks,
    updateCalendarWeek,
    resetCalendarWeeks,
    cloneCriteriaForAcademicYear,
    criteria,
    scoreLogs,
    settings,
    dataMode,
    setDataMode,
    purgeDemoData,
    checkDataIntegrity,
    maxWeeks,
    currentActiveWeek,
    activateManualWeek,
    updateTimeframeConfig,
  } = useApp();

  const [calSem1Weeks, setCalSem1Weeks] = useState<number>(settings.totalWeeksSemester1 || 18);
  const [calSem2Weeks, setCalSem2Weeks] = useState<number>(settings.totalWeeksSemester2 || 17);
  const [calStartDate, setCalStartDate] = useState<string>(settings.schoolStartDate || '2026-09-05');
  const [calManualWeek, setCalManualWeek] = useState<number>(settings.current_active_week || settings.currentWeek || 4);

  const [activeSubTab, setActiveSubTab] = useState<CatalogSubTab>('years');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Search & Filters for classes
  const [classSearch, setClassSearch] = useState('');
  const [classCampusFilter, setClassCampusFilter] = useState('all');
  const [classGradeFilter, setClassGradeFilter] = useState<number | 'all'>('all');
  const [classStatusFilter, setClassStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Search for teachers
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherCampusFilter, setTeacherCampusFilter] = useState('all');

  // Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearForm, setYearForm] = useState({
    id: '',
    name: '',
    startYear: 2026,
    endYear: 2027,
    startDate: '2026-09-01',
    endDate: '2027-05-31',
    status: 'active' as 'active' | 'archived' | 'upcoming',
    sem1Weeks: 19,
    sem2Weeks: 16,
    cloneCriteriaFrom: '2026-2027',
  });

  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusForm, setCampusForm] = useState({
    name: '',
    code: '',
    type: 'sub' as 'main' | 'sub',
    address: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null);
  const [gradeForm, setGradeForm] = useState({
    grade: 6,
    name: 'Khối 6',
    displayOrder: 1,
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classForm, setClassForm] = useState({
    code: '',
    name: '',
    grade: 6,
    campusId: campuses[0]?.id || 'camp_main',
    type: 'Standard' as 'Standard' | 'A1' | 'A2' | 'A3',
    homeroomTeacher: '',
    studentCount: 35,
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    code: '',
    fullName: '',
    campusId: campuses[0]?.id || 'camp_main',
    phone: '',
    email: '',
    homeroomClassId: '',
    status: 'active' as 'active' | 'inactive',
    academicYear: activeAcademicYearId,
  });

  // Calendar week edit
  const [editingWeek, setEditingWeek] = useState<CalendarWeekConfig | null>(null);
  const [weekForm, setWeekForm] = useState({
    startDate: '',
    endDate: '',
    month: 9,
    semester: 1 as 1 | 2,
  });

  // Criteria Clone Modal
  const [isCriteriaCloneModalOpen, setIsCriteriaCloneModalOpen] = useState(false);
  const [criteriaCloneTargetYear, setCriteriaCloneTargetYear] = useState('');

  // Integrity report state
  const [integrityReport, setIntegrityReport] = useState(() => checkDataIntegrity());

  // Notify helper
  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const isSuperAdmin = userRole === 'super_admin';

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (classCampusFilter !== 'all' && c.campusId !== classCampusFilter) return false;
      if (classGradeFilter !== 'all' && c.grade !== classGradeFilter) return false;
      if (classStatusFilter !== 'all' && c.status !== classStatusFilter) return false;
      if (classSearch.trim()) {
        const q = classSearch.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = (c.code || '').toLowerCase().includes(q);
        const matchGv = (c.homeroomTeacher || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchGv) return false;
      }
      return true;
    });
  }, [classes, classCampusFilter, classGradeFilter, classStatusFilter, classSearch]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (teacherCampusFilter !== 'all' && t.campusId !== teacherCampusFilter) return false;
      if (teacherSearch.trim()) {
        const q = teacherSearch.toLowerCase();
        const matchName = t.fullName.toLowerCase().includes(q);
        const matchCode = t.code.toLowerCase().includes(q);
        const matchClass = (t.homeroomClassName || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchClass) return false;
      }
      return true;
    });
  }, [teachers, teacherCampusFilter, teacherSearch]);

  // Handlers for Academic Year
  const handleOpenYearModal = (year?: AcademicYear) => {
    if (year) {
      setEditingYear(year);
      setYearForm({
        id: year.id,
        name: year.name,
        startYear: year.startYear,
        endYear: year.endYear,
        startDate: year.startDate,
        endDate: year.endDate,
        status: year.status,
        sem1Weeks: year.semester1.totalWeeks,
        sem2Weeks: year.semester2.totalWeeks,
        cloneCriteriaFrom: '2026-2027',
      });
    } else {
      setEditingYear(null);
      const nextStart = 2027;
      const nextEnd = 2028;
      setYearForm({
        id: `${nextStart}-${nextEnd}`,
        name: `Năm học ${nextStart}-${nextEnd}`,
        startYear: nextStart,
        endYear: nextEnd,
        startDate: `${nextStart}-09-01`,
        endDate: `${nextEnd}-05-31`,
        status: 'upcoming',
        sem1Weeks: 19,
        sem2Weeks: 16,
        cloneCriteriaFrom: activeAcademicYearId,
      });
    }
    setIsYearModalOpen(true);
  };

  const handleSaveYear = () => {
    if (!yearForm.id.trim() || !yearForm.name.trim()) {
      showNotice('error', 'Vui lòng nhập đầy đủ mã và tên năm học!');
      return;
    }

    if (editingYear) {
      const res = updateAcademicYear(editingYear.id, {
        name: yearForm.name,
        startYear: Number(yearForm.startYear),
        endYear: Number(yearForm.endYear),
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
        status: yearForm.status,
        semester1: {
          ...editingYear.semester1,
          totalWeeks: Number(yearForm.sem1Weeks),
        },
        semester2: {
          ...editingYear.semester2,
          totalWeeks: Number(yearForm.sem2Weeks),
        },
      });
      if (res.success) {
        showNotice('success', res.message);
        setIsYearModalOpen(false);
      } else {
        showNotice('error', res.message);
      }
    } else {
      const newYear: AcademicYear = {
        id: yearForm.id.trim(),
        name: yearForm.name.trim(),
        startYear: Number(yearForm.startYear),
        endYear: Number(yearForm.endYear),
        startDate: yearForm.startDate,
        endDate: yearForm.endDate,
        status: yearForm.status,
        semester1: {
          name: 'Học kỳ I',
          startDate: yearForm.startDate,
          endDate: `${yearForm.startYear}-12-31`,
          totalWeeks: Number(yearForm.sem1Weeks),
        },
        semester2: {
          name: 'Học kỳ II',
          startDate: `${yearForm.endYear}-01-05`,
          endDate: yearForm.endDate,
          totalWeeks: Number(yearForm.sem2Weeks),
        },
      };

      const res = addAcademicYear(newYear);
      if (res.success) {
        if (yearForm.cloneCriteriaFrom) {
          cloneCriteriaForAcademicYear(yearForm.cloneCriteriaFrom, newYear.id);
        }
        showNotice('success', `${res.message} ${yearForm.cloneCriteriaFrom ? '(Đã đồng bộ tiêu chí)' : ''}`);
        setIsYearModalOpen(false);
      } else {
        showNotice('error', res.message);
      }
    }
  };

  // Handlers for Campus
  const handleOpenCampusModal = (campus?: Campus) => {
    if (campus) {
      setEditingCampus(campus);
      setCampusForm({
        name: campus.name,
        code: campus.code || '',
        type: campus.type,
        address: campus.address || '',
        phone: campus.phone || '',
        status: campus.status || 'active',
      });
    } else {
      setEditingCampus(null);
      setCampusForm({
        name: '',
        code: '',
        type: 'sub',
        address: '',
        phone: '',
        status: 'active',
      });
    }
    setIsCampusModalOpen(true);
  };

  const handleSaveCampus = () => {
    if (!campusForm.name.trim()) {
      showNotice('error', 'Tên phân hiệu không được để trống!');
      return;
    }

    if (editingCampus) {
      const res = updateCampus(editingCampus.id, {
        name: campusForm.name.trim(),
        code: campusForm.code.trim().toUpperCase(),
        type: campusForm.type,
        address: campusForm.address.trim(),
        phone: campusForm.phone.trim(),
        status: campusForm.status,
      });
      if (res.success) {
        showNotice('success', 'Đã cập nhật phân hiệu thành công.');
        setIsCampusModalOpen(false);
      } else {
        showNotice('error', res.message || 'Lỗi cập nhật');
      }
    } else {
      const res = addCampus({
        name: campusForm.name.trim(),
        code: campusForm.code.trim().toUpperCase() || `PH_${Date.now()}`,
        type: campusForm.type,
        leaderName: '',
        colorTheme: 'blue',
        address: campusForm.address.trim(),
        phone: campusForm.phone.trim(),
        status: campusForm.status,
      });
      if (res.success) {
        showNotice('success', 'Đã thêm phân hiệu mới vào danh mục.');
        setIsCampusModalOpen(false);
      } else {
        showNotice('error', res.message || 'Lỗi thêm phân hiệu');
      }
    }
  };

  // Handlers for Grade
  const handleOpenGradeModal = (grade?: GradeItem) => {
    if (grade) {
      setEditingGrade(grade);
      setGradeForm({
        grade: grade.grade,
        name: grade.name,
        displayOrder: grade.displayOrder || grade.order || grade.grade,
        description: grade.description || '',
        status: grade.status || 'active',
      });
    } else {
      setEditingGrade(null);
      const nextGradeNum = Math.max(...grades.map((g) => g.grade), 9) + 1;
      setGradeForm({
        grade: nextGradeNum,
        name: `Khối ${nextGradeNum}`,
        displayOrder: nextGradeNum,
        description: '',
        status: 'active',
      });
    }
    setIsGradeModalOpen(true);
  };

  const handleSaveGrade = () => {
    if (editingGrade) {
      const res = updateGrade(editingGrade.id, {
        name: gradeForm.name.trim(),
        displayOrder: Number(gradeForm.displayOrder),
        description: gradeForm.description.trim(),
        status: gradeForm.status,
      });
      if (res.success) {
        showNotice('success', res.message);
        setIsGradeModalOpen(false);
      } else {
        showNotice('error', res.message);
      }
    } else {
      const res = addGrade({
        id: `grade_${gradeForm.grade}`,
        grade: Number(gradeForm.grade),
        name: gradeForm.name.trim(),
        displayOrder: Number(gradeForm.displayOrder),
        description: gradeForm.description.trim(),
        status: gradeForm.status,
      });
      if (res.success) {
        showNotice('success', res.message);
        setIsGradeModalOpen(false);
      } else {
        showNotice('error', res.message);
      }
    }
  };

  // Handlers for Class
  const handleOpenClassModal = (cls?: ClassItem) => {
    if (cls) {
      setEditingClass(cls);
      setClassForm({
        code: cls.code || '',
        name: cls.name,
        grade: cls.grade,
        campusId: cls.campusId,
        type: (cls.type as any) || 'Standard',
        homeroomTeacher: cls.homeroomTeacher || '',
        studentCount: cls.studentCount || 35,
        status: cls.status || 'active',
        notes: cls.notes || '',
      });
    } else {
      setEditingClass(null);
      setClassForm({
        code: '',
        name: '',
        grade: 6,
        campusId: campuses[0]?.id || 'camp_main',
        type: 'Standard',
        homeroomTeacher: '',
        studentCount: 35,
        status: 'active',
        notes: '',
      });
    }
    setIsClassModalOpen(true);
  };

  const handleSaveClass = () => {
    if (!classForm.name.trim()) {
      showNotice('error', 'Tên lớp không được để trống!');
      return;
    }
    const targetCampus = campuses.find((c) => c.id === classForm.campusId);
    if (!targetCampus) {
      showNotice('error', 'Phân hiệu đã chọn không hợp lệ!');
      return;
    }

    // Constraint: only main campus allowed A1/A2/A3
    let resolvedType = classForm.type;
    if (targetCampus.type !== 'main' && (resolvedType === 'A1' || resolvedType === 'A2' || resolvedType === 'A3')) {
      showNotice('error', 'Phân loại A1/A2/A3 chỉ được áp dụng duy nhất cho Phân hiệu Trường chính Lê Hữu Lập!');
      return;
    }

    const normalizedClassType = resolvedType === 'Standard' ? 'standard' : (resolvedType as 'A1' | 'A2' | 'A3' | 'standard');

    if (editingClass) {
      const res = updateClass(editingClass.id, {
        code: classForm.code.trim().toUpperCase() || editingClass.code,
        name: classForm.name.trim(),
        grade: Number(classForm.grade),
        campusId: classForm.campusId,
        classType: normalizedClassType,
        type: resolvedType,
        homeroomTeacher: classForm.homeroomTeacher.trim(),
        studentCount: Number(classForm.studentCount),
        status: classForm.status,
        notes: classForm.notes.trim(),
      });
      if (res.success) {
        showNotice('success', 'Đã cập nhật thông tin lớp học.');
        setIsClassModalOpen(false);
      } else {
        showNotice('error', res.message || 'Lỗi cập nhật');
      }
    } else {
      const res = addClass({
        code: classForm.code.trim().toUpperCase() || `${classForm.name.trim().replace(/\s+/g, '')}`,
        name: classForm.name.trim(),
        grade: Number(classForm.grade),
        campusId: classForm.campusId,
        classType: normalizedClassType,
        type: resolvedType,
        homeroomTeacher: classForm.homeroomTeacher.trim(),
        studentCount: Number(classForm.studentCount),
        status: classForm.status,
        notes: classForm.notes.trim(),
      });
      if (res.success) {
        showNotice('success', 'Đã tạo mới lớp học vào danh mục.');
        setIsClassModalOpen(false);
      } else {
        showNotice('error', res.message || 'Lỗi tạo lớp');
      }
    }
  };

  // Handlers for Teachers
  const handleOpenTeacherModal = (teacher?: TeacherItem) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherForm({
        code: teacher.code,
        fullName: teacher.fullName,
        campusId: teacher.campusId,
        phone: teacher.phone || '',
        email: teacher.email || '',
        homeroomClassId: teacher.homeroomClassId || '',
        status: teacher.status || 'active',
        academicYear: teacher.academicYear || activeAcademicYearId,
      });
    } else {
      setEditingTeacher(null);
      setTeacherForm({
        code: `GV${Math.floor(100 + Math.random() * 900)}`,
        fullName: '',
        campusId: campuses[0]?.id || 'camp_main',
        phone: '',
        email: '',
        homeroomClassId: '',
        status: 'active',
        academicYear: activeAcademicYearId,
      });
    }
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = () => {
    if (!teacherForm.fullName.trim() || !teacherForm.code.trim()) {
      showNotice('error', 'Họ tên và mã giáo viên không được để trống!');
      return;
    }

    const assignedClass = classes.find((c) => c.id === teacherForm.homeroomClassId);

    if (editingTeacher) {
      const res = updateTeacher(editingTeacher.id, {
        code: teacherForm.code.trim().toUpperCase(),
        fullName: teacherForm.fullName.trim(),
        campusId: teacherForm.campusId,
        phone: teacherForm.phone.trim(),
        email: teacherForm.email.trim(),
        homeroomClassId: teacherForm.homeroomClassId || undefined,
        homeroomClassName: assignedClass ? assignedClass.name : undefined,
        status: teacherForm.status,
        academicYear: teacherForm.academicYear,
      });
      if (res.success) {
        // Also update class homeroomTeacher if changed
        if (assignedClass) {
          updateClass(assignedClass.id, { homeroomTeacher: teacherForm.fullName.trim() });
        }
        showNotice('success', res.message);
        setIsTeacherModalOpen(false);
      } else {
        showNotice('error', res.message);
      }
    } else {
      const res = addTeacher({
        code: teacherForm.code.trim().toUpperCase(),
        fullName: teacherForm.fullName.trim(),
        campusId: teacherForm.campusId,
        phone: teacherForm.phone.trim(),
        email: teacherForm.email.trim(),
        homeroomClassId: teacherForm.homeroomClassId || undefined,
        homeroomClassName: assignedClass ? assignedClass.name : undefined,
        status: teacherForm.status,
        academicYear: teacherForm.academicYear,
      });
      if (res.success) {
        if (assignedClass) {
          updateClass(assignedClass.id, { homeroomTeacher: teacherForm.fullName.trim() });
        }
        showNotice('success', res.message);
        setIsTeacherModalOpen(false);
      } else {
        showNotice('error', res.message);
      }
    }
  };

  // Handlers for Calendar Week edit
  const handleOpenWeekEdit = (week: CalendarWeekConfig) => {
    setEditingWeek(week);
    setWeekForm({
      startDate: week.startDate,
      endDate: week.endDate,
      month: week.month,
      semester: week.semester,
    });
  };

  const handleSaveWeek = () => {
    if (!editingWeek) return;
    const res = updateCalendarWeek(editingWeek.week, {
      startDate: weekForm.startDate,
      endDate: weekForm.endDate,
      month: Number(weekForm.month),
      semester: weekForm.semester,
    });
    if (res.success) {
      showNotice('success', res.message);
      setEditingWeek(null);
    } else {
      showNotice('error', res.message);
    }
  };

  // Handlers for Data Mode Toggle
  const handleToggleDataMode = () => {
    const nextMode = dataMode === 'demo' ? 'production' : 'demo';
    const confirmMessage =
      nextMode === 'production'
        ? 'BẠN ĐANG CHUYỂN SANG CHẾ ĐỘ SỬ DỤNG THẬT:\n- Toàn bộ dữ liệu điểm thử nghiệm (Demo) sẽ bị tách biệt.\n- Bảng xếp hạng và danh hiệu sẽ chỉ tính dựa trên dữ liệu thi đua thực tế của năm học.\n\nBạn có chắc chắn muốn chuyển?'
        : 'Chuyển về chế độ Dữ liệu mẫu (Demo)?';

    if (window.confirm(confirmMessage)) {
      const res = setDataMode(nextMode);
      showNotice('success', res.message);
      setIntegrityReport(checkDataIntegrity());
    }
  };

  const handlePurgeDemo = () => {
    if (window.confirm('CẢNH BÁO QUAN TRỌNG:\nThao tác này sẽ xóa vĩnh viễn tất cả các bản ghi điểm có gắn nhãn Demo khỏi hệ thống.\n\nBạn có chắc chắn muốn dọn dẹp sạch dữ liệu mẫu?')) {
      const res = purgeDemoData();
      if (res.success) {
        showNotice('success', res.message);
        setIntegrityReport(checkDataIntegrity());
      } else {
        showNotice('error', res.message);
      }
    }
  };

  const handleRunAudit = () => {
    const report = checkDataIntegrity();
    setIntegrityReport(report);
    setActiveSubTab('integrity');
    showNotice('info', `Đã hoàn tất kiểm tra toàn vẹn: ${report.overallPassed ? 'Hệ thống đạt chuẩn 100%' : `Phát hiện ${report.totalErrors} vấn đề`}`);
  };

  const downloadSampleTemplate = () => {
    const csv = generateClassExcelTemplateContent();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_Nhap_Danh_Sach_Lop_THCS_Le_Huu_Lap.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('success', 'Đã tải xuống file mẫu Excel (CSV UTF-8).');
  };

  const handleSaveCalTimeframe = () => {
    const res = updateTimeframeConfig(calSem1Weeks, calSem2Weeks, calStartDate);
    if (res.success) showNotice('success', res.message);
    else showNotice('error', res.message);
  };

  const handleActivateCalManualWeek = () => {
    const res = activateManualWeek(calManualWeek);
    if (res.success) showNotice('success', res.message);
    else showNotice('error', res.message);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Mode & Breadcrumbs */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400/20 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider">
                Module Quản Trị Hệ Thống
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  dataMode === 'production'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                }`}
              >
                {dataMode === 'production' ? '● CHẾ ĐỘ SỬ DỤNG THẬT' : '○ CHẾ ĐỘ DỮ LIỆU MẪU (DEMO)'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Cấu Hình Năm Học & Danh Mục Quản Lý
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-3xl">
              Chuyển đổi linh hoạt giữa dữ liệu thử nghiệm và vận hành thực tế tại Trường THCS Lê Hữu Lập. Quản lý 6 phân hiệu, 4 khối, danh sách lớp động và cấu hình lịch 35 tuần theo quy định.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <>
                <button
                  onClick={handleToggleDataMode}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg transition-all ${
                    dataMode === 'demo'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {dataMode === 'demo' ? 'CHUYỂN SANG CHẾ ĐỘ THẬT' : 'CHUYỂN SANG CHẾ ĐỘ DEMO'}
                </button>

                {dataMode === 'demo' && (
                  <button
                    onClick={handlePurgeDemo}
                    className="px-3 py-2.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-sm font-medium transition-all shadow"
                    title="Dọn sạch dữ liệu Demo đã tạo"
                  >
                    Dọn Demo
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleRunAudit}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium flex items-center gap-2 border border-white/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Kiểm Tra Toàn Vẹn
            </button>
          </div>
        </div>
      </div>

      {/* Global Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-md border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {notification.type === 'error' && <XCircle className="w-5 h-5 text-rose-600" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveSubTab('years')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'years'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Năm Học ({academicYears.length})
          </button>

          <button
            onClick={() => setActiveSubTab('campuses')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'campuses'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <School className="w-4 h-4" />
            6 Phân Hiệu ({campuses.length})
          </button>

          <button
            onClick={() => setActiveSubTab('grades')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'grades'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Khối Lớp ({grades.length})
          </button>

          <button
            onClick={() => setActiveSubTab('classes')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'classes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Danh Sách Lớp ({classes.length})
          </button>

          <button
            onClick={() => setActiveSubTab('batch_import')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'batch_import'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            Nhập Lớp Từ Excel
          </button>

          <button
            onClick={() => setActiveSubTab('teachers')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'teachers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Giáo Viên Chủ Nhiệm ({teachers.length})
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Lịch {maxWeeks} Tuần
          </button>

          <button
            onClick={() => setActiveSubTab('criteria_year')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'criteria_year'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            Tiêu Chí Theo Năm
          </button>

          <button
            onClick={() => setActiveSubTab('integrity')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'integrity'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Kiểm Tra Toàn Vẹn
            {!integrityReport.overallPassed && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('comprehensive_tests')}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              activeSubTab === 'comprehensive_tests'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Kiểm Thử Toàn Diện (18 TC)
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs">
              100% ĐẠT
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: ACADEMIC YEARS */}
      {activeSubTab === 'years' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh Sách Năm Học</h2>
              <p className="text-sm text-slate-500">
                Quản lý niên khóa, phân kỳ Học kỳ I / Học kỳ II và xác định năm học vận hành mặc định.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => handleOpenYearModal()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Tạo Năm Học Mới
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {academicYears.map((year) => {
              const isActiveYear = year.id === activeAcademicYearId;
              return (
                <div
                  key={year.id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    isActiveYear
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg">{year.name}</h3>
                        {isActiveYear && (
                          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                            Đang sử dụng
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Khóa: {year.startYear} - {year.endYear} | Mã: <span className="font-mono">{year.id}</span>
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        year.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : year.status === 'upcoming'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {year.status === 'active' ? 'Hoạt động' : year.status === 'upcoming' ? 'Sắp diễn ra' : 'Đã kết thúc'}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời gian năm học:</span>
                      <span className="font-medium text-slate-800">{year.startDate} → {year.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Học kỳ I ({year.semester1.totalWeeks} tuần):</span>
                      <span className="font-medium text-slate-800">{year.semester1.startDate} → {year.semester1.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Học kỳ II ({year.semester2.totalWeeks} tuần):</span>
                      <span className="font-medium text-slate-800">{year.semester2.startDate} → {year.semester2.endDate}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isSuperAdmin && !isActiveYear && (
                      <button
                        onClick={() => {
                          const res = setActiveAcademicYear(year.id);
                          if (res.success) showNotice('success', res.message);
                        }}
                        className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-all"
                      >
                        Đặt làm năm vận hành
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleOpenYearModal(year)}
                        className="text-xs px-3 py-1.5 text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1 transition-all ml-auto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Sửa cấu hình
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CAMPUSES */}
      {activeSubTab === 'campuses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh Mục 6 Phân Hiệu</h2>
              <p className="text-sm text-slate-500">
                1 Trường chính Lê Hữu Lập và 5 điểm trường phân hiệu. Theo quy định, không cho phép xóa phân hiệu nếu đã phát sinh dữ liệu thi đua.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => handleOpenCampusModal()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Thêm Phân Hiệu Mới
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campuses.map((camp, index) => {
              const isMain = camp.type === 'main' || camp.id === 'camp_main';
              const classCount = classes.filter((c) => c.campusId === camp.id).length;
              const hasScores = scoreLogs.some((l) => l.campusId === camp.id);
              const isInactive = camp.status === 'inactive';

              return (
                <div
                  key={camp.id}
                  className={`bg-white rounded-2xl p-5 border transition-all ${
                    isMain
                      ? 'border-indigo-400 ring-2 ring-indigo-400/20 bg-gradient-to-b from-indigo-50/40 to-white'
                      : isInactive
                      ? 'border-slate-200 opacity-75 bg-slate-50/50'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
                          isMain ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{camp.name}</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">Mã: {camp.code || camp.id}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isMain && (
                        <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-200 uppercase">
                          TRƯỜNG CHÍNH
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isInactive
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isInactive ? 'Tạm ngừng sử dụng' : 'Đang hoạt động'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số lớp trực thuộc:</span>
                      <span className="font-semibold text-slate-900">{classCount} lớp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dữ liệu thi đua:</span>
                      <span className={hasScores ? 'font-medium text-emerald-600' : 'text-slate-400'}>
                        {hasScores ? 'Đã phát sinh điểm' : 'Chưa phát sinh điểm'}
                      </span>
                    </div>
                    {camp.address && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Địa chỉ:</span>
                        <span className="text-slate-700 truncate max-w-[200px]">{camp.address}</span>
                      </div>
                    )}
                  </div>

                  {isSuperAdmin && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          const res = toggleCampusStatus(camp.id);
                          if (res.success) showNotice('success', res.message);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                          isInactive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {isInactive ? 'Kích hoạt lại' : 'Tạm ngừng sử dụng'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenCampusModal(camp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa phân hiệu "${camp.name}"?`)) {
                              const res = deleteCampus(camp.id);
                              if (res.success) {
                                showNotice('success', 'Đã xóa phân hiệu thành công.');
                              } else {
                                showNotice('error', res.message || 'Không thể xóa phân hiệu!');
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Xóa phân hiệu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: GRADES */}
      {activeSubTab === 'grades' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh Mục Khối Lớp</h2>
              <p className="text-sm text-slate-500">
                Cấu hình các khối chuẩn (Khối 6, 7, 8, 9). Cho phép thêm khối mới trong tương lai nếu trường mở rộng.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => handleOpenGradeModal()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Thêm Khối Mới
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {grades.map((gradeItem) => {
              const classCount = classes.filter((c) => c.grade === gradeItem.grade).length;
              return (
                <div
                  key={gradeItem.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base">
                        K{gradeItem.grade}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Thứ tự: {gradeItem.displayOrder}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg mt-3">{gradeItem.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {gradeItem.description || `Các lớp thuộc khối ${gradeItem.grade} toàn trường`}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between">
                      <span className="text-slate-500">Tổng số lớp hiện có:</span>
                      <span className="font-bold text-slate-900">{classCount} lớp</span>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenGradeModal(gradeItem)}
                        className="text-xs text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Xóa khối ${gradeItem.name}?`)) {
                            const res = deleteGrade(gradeItem.id);
                            if (res.success) showNotice('success', res.message);
                            else showNotice('error', res.message);
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CLASSES */}
      {activeSubTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh Sách Lớp Học Toàn Trường ({classes.length})</h2>
              <p className="text-sm text-slate-500">
                Quản lý các lớp, phân công GVCN, gắn đúng phân hiệu và phân loại A1/A2/A3 duy nhất cho trường chính.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadSampleTemplate}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Tải File Mẫu
              </button>
              <button
                onClick={() => setActiveSubTab('batch_import')}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium flex items-center gap-1.5 border border-emerald-200 transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                Nhập Excel Hàng Loạt
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => handleOpenClassModal()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 shadow transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Thêm Lớp Mới
                </button>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên lớp, mã lớp hoặc tên giáo viên chủ nhiệm..."
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={classCampusFilter}
                onChange={(e) => setClassCampusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tất cả phân hiệu</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={classGradeFilter}
                onChange={(e) => setClassGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tất cả khối</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.grade}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={classStatusFilter}
                onChange={(e) => setClassStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Không hoạt động</option>
              </select>
            </div>
          </div>

          {/* Classes Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Mã Lớp</th>
                    <th className="px-4 py-3">Tên Lớp</th>
                    <th className="px-4 py-3">Khối</th>
                    <th className="px-4 py-3">Phân Hiệu</th>
                    <th className="px-4 py-3">Loại Lớp</th>
                    <th className="px-4 py-3">Giáo Viên Chủ Nhiệm</th>
                    <th className="px-4 py-3">Sĩ Số</th>
                    <th className="px-4 py-3">Trạng Thái</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        Không tìm thấy lớp học phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cls) => {
                      const camp = campuses.find((c) => c.id === cls.campusId);
                      const isMain = camp?.type === 'main';
                      const hasScores = scoreLogs.some((l) => l.classId === cls.id);
                      const isInactive = cls.status === 'inactive';

                      return (
                        <tr key={cls.id} className={`hover:bg-slate-50/80 transition-colors ${isInactive ? 'bg-slate-50/50 opacity-70' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{cls.code || cls.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{cls.name}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">
                              Khối {cls.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${isMain ? 'text-indigo-700 font-semibold' : 'text-slate-700'}`}>
                              {camp?.name || cls.campusId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cls.type && cls.type !== 'Standard' ? (
                              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded border border-amber-200">
                                {cls.type}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Chuẩn</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {cls.homeroomTeacher || <span className="text-slate-400 italic">Chưa phân công</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{cls.studentCount || 35} HS</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                isInactive
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isInactive ? 'Không hoạt động' : 'Hoạt động'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    const res = toggleClassStatus(cls.id);
                                    if (res.success) showNotice('success', res.message);
                                  }}
                                  className={`p-1.5 rounded-lg text-xs transition-all ${
                                    isInactive
                                      ? 'text-emerald-600 hover:bg-emerald-50'
                                      : 'text-amber-600 hover:bg-amber-50'
                                  }`}
                                  title={isInactive ? 'Kích hoạt lại lớp' : 'Chuyển sang không hoạt động'}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenClassModal(cls)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Sửa thông tin lớp"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => {
                                    if (hasScores) {
                                      alert('KHÔNG THỂ XÓA LỚP ĐÃ CÓ DỮ LIỆU THI ĐUA!\nNếu lớp không còn sử dụng, vui lòng chuyển trạng thái sang "Không hoạt động".');
                                      return;
                                    }
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa lớp "${cls.name}"?`)) {
                                      const res = deleteClass(cls.id);
                                      if (res.success) {
                                        showNotice('success', 'Đã xóa lớp.');
                                      } else {
                                        showNotice('error', res.message || 'Lỗi xóa lớp');
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Xóa lớp"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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

      {/* TAB 5: BATCH IMPORT FROM EXCEL */}
      {activeSubTab === 'batch_import' && (
        <div className="space-y-4">
          <ClassExcelBatchImporter
            isOpen={true}
            onClose={() => setActiveSubTab('classes')}
            onImportSuccess={(count) => {
              showNotice('success', `Đã nhập thành công ${count} lớp học vào hệ thống.`);
              setActiveSubTab('classes');
            }}
          />
        </div>
      )}

      {/* TAB 6: HOMEROOM TEACHERS */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh Mục Giáo Viên Chủ Nhiệm ({teachers.length})</h2>
              <p className="text-sm text-slate-500">
                Quản lý giáo viên, phân công lớp chủ nhiệm theo từng năm học mà không xóa lịch sử dữ liệu.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => handleOpenTeacherModal()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Thêm Giáo Viên Mới
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo họ tên giáo viên, mã GV, hoặc lớp chủ nhiệm..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <select
              value={teacherCampusFilter}
              onChange={(e) => setTeacherCampusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Tất cả phân hiệu</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teachers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachers.map((teacher) => {
              const camp = campuses.find((c) => c.id === teacher.campusId);
              const assignedClass = classes.find((c) => c.id === teacher.homeroomClassId || c.homeroomTeacher === teacher.fullName);

              return (
                <div key={teacher.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">
                          {teacher.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{teacher.fullName}</h3>
                          <p className="text-xs text-slate-500 font-mono">Mã GV: {teacher.code}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                        {teacher.status === 'active' ? 'Đang công tác' : 'Nghỉ'}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phân hiệu:</span>
                        <span className="font-medium text-slate-800">{camp?.name || 'Chưa gán'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lớp chủ nhiệm:</span>
                        <span className="font-bold text-blue-700">
                          {assignedClass ? `Lớp ${assignedClass.name}` : teacher.homeroomClassName || '(Chưa phân công)'}
                        </span>
                      </div>
                      {teacher.phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Điện thoại:</span>
                          <span className="text-slate-700 font-mono">{teacher.phone}</span>
                        </div>
                      )}
                      {teacher.email && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Email:</span>
                          <span className="text-slate-700 truncate max-w-[180px]">{teacher.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenTeacherModal(teacher)}
                        className="text-xs text-slate-600 hover:text-blue-600 font-medium flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Sửa thông tin
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa giáo viên ${teacher.fullName}?`)) {
                            const res = deleteTeacher(teacher.id);
                            if (res.success) showNotice('success', res.message);
                            else showNotice('error', res.message);
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: CALENDAR & TIMEFRAME */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Cấu Hình Lịch & Khung Thời Gian Thi Đua ({maxWeeks} Tuần)
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                  Năm học {settings.academicYear || '2026-2027'}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                  Tuần hiện tại: Tuần {currentActiveWeek}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Tự động nhảy tuần theo thời gian thực (chu kỳ 7 ngày). Cho phép tùy chỉnh tổng số tuần HK1/HK2 và kích hoạt tuần thủ công khi nghỉ Lễ/Tết.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  if (window.confirm(`Khôi phục toàn bộ lịch ${maxWeeks} tuần về cấu hình mặc định chuẩn?`)) {
                    const res = resetCalendarWeeks();
                    if (res.success) showNotice('success', res.message);
                  }
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
                Khôi Phục Lịch Mặc Định
              </button>
            )}
          </div>

          {/* Cấu hình Khung thời gian thi đua & Thiết lập tuần hiện tại */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Khung thời gian thi đua */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Khung Thời Gian Thi Đua (Tùy chỉnh HK1 & HK2)</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                  Tổng: {calSem1Weeks + calSem2Weeks} tuần
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số tuần đánh giá Học kỳ 1:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    disabled={!isSuperAdmin}
                    value={calSem1Weeks}
                    onChange={(e) => setCalSem1Weeks(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Mặc định: 18 tuần</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số tuần đánh giá Học kỳ 2:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    disabled={!isSuperAdmin}
                    value={calSem2Weeks}
                    onChange={(e) => setCalSem2Weeks(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Tùy chỉnh: 17, 15, 14...</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày bắt đầu năm học (Mặc định: 05/09):
                </label>
                <input
                  type="date"
                  disabled={!isSuperAdmin}
                  value={calStartDate}
                  onChange={(e) => setCalStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-500"
                />
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleSaveCalTimeframe}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Cập nhật Khung Thời Gian ({calSem1Weeks + calSem2Weeks} Tuần)</span>
                </button>
              )}
            </div>

            {/* Card 2: Thiết lập tuần hiện tại & mốc tự động chuyển tuần */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Thiết Lập Tuần Hiện Tại (Bỏ qua nghỉ Lễ/Tết)</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  Mốc Tuần 1: {settings.start_date_of_week_1 || '31/08/2026'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn tuần thi đua muốn kích hoạt (1 đến {maxWeeks}):
                </label>
                <select
                  disabled={!isSuperAdmin}
                  value={calManualWeek}
                  onChange={(e) => setCalManualWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-blue-500 cursor-pointer"
                >
                  {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w} {w <= (settings.totalWeeksSemester1 || 18) ? '(HK1)' : '(HK2)'}
                      {w === currentActiveWeek ? ' — [ĐANG HOẠT ĐỘNG]' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Khi kích hoạt: Ghi đè <code>start_date_of_week_1</code> để hệ thống tự động đếm tiếp từ tuần này.
                </span>
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleActivateCalManualWeek}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Kích hoạt Tuần {calManualWeek} Làm Tuần Hiện Tại</span>
                </button>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Thuật toán tính Tuần hiện tại chuẩn quy chế:</span>
                </div>
                <p>
                  Công thức: <code>Số Tuần Hiện Tại = Math.floor((Today - start_date_of_week_1) / 7 ngày) + 1</code>. <strong>Dừng hẳn khi chạm ngưỡng tối đa {maxWeeks} tuần.</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-white">
                  <tr>
                    <th className="px-4 py-3">Tuần</th>
                    <th className="px-4 py-3">Ngày Bắt Đầu</th>
                    <th className="px-4 py-3">Ngày Kết Thúc</th>
                    <th className="px-4 py-3">Thuộc Tháng</th>
                    <th className="px-4 py-3">Thuộc Học Kỳ</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calendarWeeks.map((w) => (
                    <tr key={w.week} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">Tuần {w.week}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{w.startDate}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{w.endDate}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded">
                          Tháng {w.month}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${w.semester === 1 ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}>
                          Học kỳ {w.semester === 1 ? 'I' : 'II'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleOpenWeekEdit(w)}
                            className="p-1 text-slate-500 hover:text-blue-600 font-medium text-xs flex items-center gap-1 ml-auto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Sửa lịch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: CRITERIA BY YEAR */}
      {activeSubTab === 'criteria_year' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bộ Tiêu Chí Theo Năm Học</h2>
              <p className="text-sm text-slate-500">
                Toàn bộ {criteria.length} tiêu chí hiện tại gắn với năm học {settings.academicYear || '2026-2027'}. Khi tạo năm học mới, sao chép bộ tiêu chí để bảo lưu trọn vẹn quy định năm cũ.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setCriteriaCloneTargetYear('2027-2028');
                  setIsCriteriaCloneModalOpen(true);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Sao Chép Tiêu Chí Sang Năm Mới
              </button>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700">
                Tổng số tiêu chí đang vận hành: <strong className="text-blue-600">{criteria.length} tiêu chí</strong>
              </span>
              <span className="text-xs text-slate-500">
                Gồm điểm trừ nền, các loại điểm cộng, giới hạn đặc thù A1/A2/A3 và bán trú
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100 border rounded-xl">
              {criteria.slice(0, 20).map((crit) => (
                <div key={crit.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {crit.code}
                      </span>
                      <span className="font-medium text-slate-800">{crit.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nhóm: {crit.category} | Chu kỳ: {crit.period || 'Tuần'} | Đơn vị: {crit.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        crit.type === 'bonus'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {crit.type === 'bonus' ? `+${crit.points}` : `-${crit.points}`} điểm
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {criteria.length > 20 && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                Và {criteria.length - 20} tiêu chí khác đang được đồng bộ theo năm học...
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: DATA INTEGRITY AUDIT */}
      {activeSubTab === 'integrity' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Báo Cáo Kiểm Tra Tính Toàn Vẹn Dữ Liệu</h2>
              <p className="text-sm text-slate-500">
                Tự động kiểm tra 7 quy định toàn vẹn cốt lõi theo tài liệu phân hiệu và xếp loại thi đua năm 2026-2027.
              </p>
            </div>
            <button
              onClick={() => {
                const report = checkDataIntegrity();
                setIntegrityReport(report);
                showNotice('info', 'Đã làm mới báo cáo kiểm tra toàn vẹn hệ thống.');
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow transition-all self-start sm:self-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Chạy Lại Kiểm Tra
            </button>
          </div>

          {/* Overview status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                    integrityReport.overallPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {integrityReport.overallPassed ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Kết luận hệ thống</p>
                  <h3 className="text-xl font-bold text-slate-900">
                    {integrityReport.overallPassed ? 'ĐẠT CHUẨN 100%' : 'CÓ VẤN ĐỀ CẦN XỬ LÝ'}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {integrityReport.totalErrors}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Số lỗi vi phạm (LỖI)</p>
                  <h3 className="text-xl font-bold text-slate-900">
                    {integrityReport.totalErrors === 0 ? '0 lỗi vi phạm' : `${integrityReport.totalErrors} lỗi cần sửa`}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
                  {integrityReport.totalWarnings}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Cảnh báo (CẦN LƯU Ý)</p>
                  <h3 className="text-xl font-bold text-slate-900">
                    {integrityReport.totalWarnings} mục cảnh báo
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* 7 Core Checklist Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {integrityReport.checks.map((check) => (
              <div key={check.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {check.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {check.status === 'fail' && <XCircle className="w-5 h-5 text-rose-500" />}
                    {check.status === 'warn' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{check.title}</h4>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          check.status === 'pass'
                            ? 'bg-emerald-100 text-emerald-800'
                            : check.status === 'fail'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {check.status === 'pass' ? 'ĐẠT' : check.status === 'fail' ? 'LỖI' : 'CẢNH BÁO'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{check.message}</p>

                    {check.errorDetails && check.errorDetails.length > 0 && (
                      <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                        <p className="font-semibold text-rose-900">Chi tiết vi phạm phát hiện:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {check.errorDetails.map((iss: string, idx: number) => (
                            <li key={idx}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: COMPREHENSIVE TEST SUITE (18 TEST CASES) */}
      {activeSubTab === 'comprehensive_tests' && (
        <ComprehensiveTestSuiteView />
      )}

      {/* MODAL: ACADEMIC YEAR */}
      {isYearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingYear ? 'Sửa Cấu Hình Năm Học' : 'Tạo Năm Học Mới'}
              </h3>
              <button onClick={() => setIsYearModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mã năm học (ID)</label>
                <input
                  type="text"
                  disabled={!!editingYear}
                  value={yearForm.id}
                  onChange={(e) => setYearForm({ ...yearForm, id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  placeholder="Ví dụ: 2027-2028"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên năm học</label>
                <input
                  type="text"
                  value={yearForm.name}
                  onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Năm học 2027-2028"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Năm bắt đầu</label>
                  <input
                    type="number"
                    value={yearForm.startYear}
                    onChange={(e) => setYearForm({ ...yearForm, startYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Năm kết thúc</label>
                  <input
                    type="number"
                    value={yearForm.endYear}
                    onChange={(e) => setYearForm({ ...yearForm, endYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ngày bắt đầu năm</label>
                  <input
                    type="date"
                    value={yearForm.startDate}
                    onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ngày kết thúc năm</label>
                  <input
                    type="date"
                    value={yearForm.endDate}
                    onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Số tuần Học kỳ I</label>
                  <input
                    type="number"
                    value={yearForm.sem1Weeks}
                    onChange={(e) => setYearForm({ ...yearForm, sem1Weeks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Số tuần Học kỳ II</label>
                  <input
                    type="number"
                    value={yearForm.sem2Weeks}
                    onChange={(e) => setYearForm({ ...yearForm, sem2Weeks: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trạng thái</label>
                <select
                  value={yearForm.status}
                  onChange={(e) => setYearForm({ ...yearForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Đang sử dụng</option>
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="archived">Đã kết thúc</option>
                </select>
              </div>

              {!editingYear && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sao chép tiêu chí từ năm</label>
                  <select
                    value={yearForm.cloneCriteriaFrom}
                    onChange={(e) => setYearForm({ ...yearForm, cloneCriteriaFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Không sao chép tiêu chí --</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} ({y.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsYearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveYear}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Lưu Năm Học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CAMPUS */}
      {isCampusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCampus ? 'Sửa Thông Tin Phân Hiệu' : 'Thêm Phân Hiệu Mới'}
              </h3>
              <button onClick={() => setIsCampusModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên phân hiệu</label>
                <input
                  type="text"
                  value={campusForm.name}
                  onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Phân hiệu Hậu Lộc"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mã phân hiệu</label>
                <input
                  type="text"
                  value={campusForm.code}
                  onChange={(e) => setCampusForm({ ...campusForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ví dụ: PH_HAULOC"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Loại phân hiệu</label>
                <select
                  value={campusForm.type}
                  onChange={(e) => setCampusForm({ ...campusForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sub">Điểm trường phân hiệu</option>
                  <option value="main">Trường chính Lê Hữu Lập</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={campusForm.address}
                  onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Xã/Thị trấn..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trạng thái</label>
                <select
                  value={campusForm.status}
                  onChange={(e) => setCampusForm({ ...campusForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm ngừng sử dụng</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCampusModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveCampus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Lưu Phân Hiệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GRADE */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingGrade ? 'Sửa Khối Lớp' : 'Thêm Khối Mới'}
              </h3>
              <button onClick={() => setIsGradeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Số khối (Grade)</label>
                <input
                  type="number"
                  disabled={!!editingGrade}
                  value={gradeForm.grade}
                  onChange={(e) => setGradeForm({ ...gradeForm, grade: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên khối</label>
                <input
                  type="text"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Khối 6"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Thứ tự hiển thị</label>
                <input
                  type="number"
                  value={gradeForm.displayOrder}
                  onChange={(e) => setGradeForm({ ...gradeForm, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả ghi chú</label>
                <input
                  type="text"
                  value={gradeForm.description}
                  onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsGradeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveGrade}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Lưu Khối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLASS */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingClass ? 'Sửa Lớp Học' : 'Thêm Lớp Học Mới'}
              </h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mã lớp</label>
                  <input
                    type="text"
                    value={classForm.code}
                    onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                    placeholder="Ví dụ: 6A1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tên lớp (*)</label>
                  <input
                    type="text"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: 6A1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Thuộc khối</label>
                  <select
                    value={classForm.grade}
                    onChange={(e) => setClassForm({ ...classForm, grade: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.grade}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phân hiệu (*)</label>
                  <select
                    value={classForm.campusId}
                    onChange={(e) => {
                      const newCampId = e.target.value;
                      const camp = campuses.find((c) => c.id === newCampId);
                      setClassForm({
                        ...classForm,
                        campusId: newCampId,
                        type: camp?.type !== 'main' ? 'Standard' : classForm.type,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.type === 'main' ? '(Trường chính)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Loại lớp {campuses.find((c) => c.id === classForm.campusId)?.type === 'main' ? '(A1, A2, A3)' : '(Chỉ Standard)'}
                  </label>
                  <select
                    value={classForm.type}
                    onChange={(e) => setClassForm({ ...classForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Standard">Chuẩn (Standard)</option>
                    {campuses.find((c) => c.id === classForm.campusId)?.type === 'main' && (
                      <>
                        <option value="A1">Lớp chọn A1 (Tiêu chí điểm tốt đặc thù)</option>
                        <option value="A2">Lớp A2</option>
                        <option value="A3">Lớp A3</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sĩ số học sinh</label>
                  <input
                    type="number"
                    value={classForm.studentCount}
                    onChange={(e) => setClassForm({ ...classForm, studentCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Giáo viên chủ nhiệm</label>
                <input
                  type="text"
                  value={classForm.homeroomTeacher}
                  onChange={(e) => setClassForm({ ...classForm, homeroomTeacher: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Họ và tên giáo viên..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Trạng thái</label>
                  <select
                    value={classForm.status}
                    onChange={(e) => setClassForm({ ...classForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Không hoạt động (Lưu trữ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={classForm.notes}
                    onChange={(e) => setClassForm({ ...classForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bán trú, chọn lọc..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveClass}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Lưu Lớp Học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TEACHER */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingTeacher ? 'Sửa Thông Tin Giáo Viên' : 'Thêm Giáo Viên Mới'}
              </h3>
              <button onClick={() => setIsTeacherModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mã GV (*)</label>
                  <input
                    type="text"
                    value={teacherForm.code}
                    onChange={(e) => setTeacherForm({ ...teacherForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm uppercase font-mono"
                    placeholder="GV01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Họ và tên (*)</label>
                  <input
                    type="text"
                    value={teacherForm.fullName}
                    onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="Thầy/Cô..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phân hiệu công tác</label>
                <select
                  value={teacherForm.campusId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, campusId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lớp chủ nhiệm (Năm {teacherForm.academicYear})</label>
                <select
                  value={teacherForm.homeroomClassId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, homeroomClassId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  <option value="">-- Chưa phân công chủ nhiệm --</option>
                  {classes
                    .filter((c) => c.campusId === teacherForm.campusId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name} (Khối {c.grade})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="09..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Trạng thái</label>
                  <select
                    value={teacherForm.status}
                    onChange={(e) => setTeacherForm({ ...teacherForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value="active">Đang công tác</option>
                    <option value="inactive">Nghỉ / Chuyển trường</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  placeholder="giaovien@lehuulap.edu.vn"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTeacher}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Lưu Giáo Viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WEEK EDIT */}
      {editingWeek && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Điều Chỉnh Lịch Tuần {editingWeek.week}
              </h3>
              <button onClick={() => setEditingWeek(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={weekForm.startDate}
                    onChange={(e) => setWeekForm({ ...weekForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={weekForm.endDate}
                    onChange={(e) => setWeekForm({ ...weekForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Thuộc tháng</label>
                  <select
                    value={weekForm.month}
                    onChange={(e) => setWeekForm({ ...weekForm, month: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Thuộc học kỳ</label>
                  <select
                    value={weekForm.semester}
                    onChange={(e) => setWeekForm({ ...weekForm, semester: Number(e.target.value) as 1 | 2 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value={1}>Học kỳ I</option>
                    <option value={2}>Học kỳ II</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingWeek(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveWeek}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRITERIA CLONE */}
      {isCriteriaCloneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Sao Chép Tiêu Chí Sang Năm Mới
              </h3>
              <button onClick={() => setIsCriteriaCloneModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-xs text-slate-500">
                Chức năng này sẽ nhân bản toàn bộ {criteria.length} tiêu chí thi đua của năm học <strong>{activeAcademicYearId}</strong> sang năm học đích, giúp quy định của năm cũ được lưu trữ nguyên vẹn.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mã năm học đích (*)</label>
                <input
                  type="text"
                  value={criteriaCloneTargetYear}
                  onChange={(e) => setCriteriaCloneTargetYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  placeholder="Ví dụ: 2027-2028"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCriteriaCloneModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!criteriaCloneTargetYear.trim()) {
                    showNotice('error', 'Vui lòng nhập mã năm học đích!');
                    return;
                  }
                  const res = cloneCriteriaForAcademicYear(activeAcademicYearId, criteriaCloneTargetYear.trim());
                  if (res.success) {
                    showNotice('success', res.message);
                    setIsCriteriaCloneModalOpen(false);
                  } else {
                    showNotice('error', res.message);
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow"
              >
                Bắt Đầu Sao Chép
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
