import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { TitleEvaluationRow, DisciplinaryRecord, ClassTitle } from '../../types';
import { canLockTitles, canUnlockTitles } from '../../utils/rbac';
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
  Settings,
  Plus,
  Trash2,
  Search,
  Sliders,
  HelpCircle,
  Eye,
  AlertOctagon,
} from 'lucide-react';

const getTitleBadge = (title: ClassTitle) => {
  switch (title) {
    case 'LỚP XUẤT SẮC':
      return {
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-xs',
        icon: <Trophy className="w-4 h-4 text-amber-600" />,
        label: 'LỚP XUẤT SẮC',
      };
    case 'LỚP TIÊN TIẾN':
      return {
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
        icon: <Award className="w-4 h-4 text-emerald-600" />,
        label: 'LỚP TIÊN TIẾN',
      };
    case 'KHÔNG ĐƯỢC XẾP LOẠI':
    default:
      return {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
        icon: <AlertTriangle className="w-4 h-4 text-slate-400" />,
        label: 'KHÔNG ĐƯỢC XẾP LOẠI',
      };
  }
};

export const ClassAwardsHub: React.FC = () => {
  const {
    campuses,
    classes,
    settings,
    updateSettings,
    currentUser,
    userRole,
    setCurrentTab,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    isYearLocked,
    getYearLockInfo,
    isTitleLocked,
    getTitleLockInfo,
    lockTitles,
    unlockTitles,
    disciplinaryRecords,
    addDisciplinaryRecord,
    removeDisciplinaryRecord,
    getTitleEvaluationData,
    applyTitleVerificationSample,
    exportTitleEvaluationExcel,
    getYearRankingData,
  } = useApp();

  // Local component state
  const [activeSubTab, setActiveSubTab] = useState<'awards' | 'config' | 'disciplinary'>('awards');
  const [filterTitle, setFilterTitle] = useState<'all' | ClassTitle>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Được xét' | 'Không được xét'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassDetail, setSelectedClassDetail] = useState<TitleEvaluationRow | null>(null);

  // Lock Action State
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockNotes, setLockNotes] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sample Data Confirmation Modal
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);

  // Disciplinary Input Form Modal
  const [showAddDiscModal, setShowAddDiscModal] = useState(false);
  const [discForm, setDiscForm] = useState({
    classId: classes[0]?.id || '',
    studentName: '',
    decisionNumber: '',
    decisionDate: new Date().toISOString().split('T')[0],
    reason: '',
    councilLevel: 'Hội đồng kỷ luật trường',
    notes: '',
  });

  // Config Form State
  const [configForm, setConfigForm] = useState({ ...(settings?.evaluationConfig || {}) });
  const [configSuccessMessage, setConfigSuccessMessage] = useState(false);

  // Calculate Data
  const titleData = useMemo(() => {
    return getTitleEvaluationData(selectedCampusId, selectedGrade);
  }, [getTitleEvaluationData, selectedCampusId, selectedGrade, disciplinaryRecords, settings.evaluationConfig, settings.lockedTitles, settings.lockedYear]);

  const yearLockInfo = getYearLockInfo();
  const titleLockInfo = getTitleLockInfo();
  const titlesAreLocked = isTitleLocked();
  const yearIsLocked = isYearLocked();

  const userCanLock = canLockTitles(currentUser);
  const userCanUnlock = canUnlockTitles(currentUser);

  // Filter rows for display
  const displayedRows = useMemo(() => {
    return titleData.rows.filter((row) => {
      if (filterTitle !== 'all' && row.title !== filterTitle) return false;
      if (filterStatus !== 'all' && row.evaluationStatus !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const className = row.classItem.name.toLowerCase();
        const teacherName = (row.classItem.homeroomTeacher || '').toLowerCase();
        const campusName = row.campus.name.toLowerCase();
        if (!className.includes(query) && !teacherName.includes(query) && !campusName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [titleData.rows, filterTitle, filterStatus, searchQuery]);

  // Selected Scope Name
  const selectedScopeName = useMemo(() => {
    const campusPart = selectedCampusId === 'all'
      ? 'Toàn trường (Tất cả 6 cơ sở)'
      : campuses.find((c) => c.id === selectedCampusId)?.name || 'Cơ sở';
    const gradePart = selectedGrade === 'all' ? 'Tất cả các khối' : `Khối ${selectedGrade}`;
    return `${campusPart} - ${gradePart}`;
  }, [selectedCampusId, selectedGrade, campuses]);

  // Handlers
  const handleLock = () => {
    const res = lockTitles(lockNotes);
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setShowLockModal(false);
      setLockNotes('');
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleUnlock = () => {
    if (!unlockReason.trim()) {
      setActionMessage({ type: 'error', text: 'Bắt buộc nhập lý do mở khóa bảng danh hiệu để lưu vết kiểm toán hệ thống!' });
      return;
    }
    const res = unlockTitles(unlockReason.trim());
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setShowUnlockModal(false);
      setUnlockReason('');
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleAddDisciplinary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discForm.studentName.trim() || !discForm.decisionNumber.trim() || !discForm.reason.trim()) {
      alert('Vui lòng điền đầy đủ: Tên học sinh, Số quyết định và Lý do xử lý kỷ luật!');
      return;
    }
    const targetClass = classes.find((c) => c.id === discForm.classId) || classes[0];
    const res = addDisciplinaryRecord({
      classId: targetClass.id,
      className: targetClass.name,
      studentName: discForm.studentName.trim(),
      decisionNumber: discForm.decisionNumber.trim(),
      decisionDate: discForm.decisionDate,
      reason: discForm.reason.trim(),
      councilLevel: discForm.councilLevel as 'Hội đồng kỷ luật trường' | 'Hội đồng kỷ luật' | 'Cấp trên',
      notes: discForm.notes.trim() || undefined,
    });
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      setShowAddDiscModal(false);
      setDiscForm({
        classId: classes[0]?.id || '',
        studentName: '',
        decisionNumber: '',
        decisionDate: new Date().toISOString().split('T')[0],
        reason: '',
        councilLevel: 'Hội đồng kỷ luật trường',
        notes: '',
      });
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleRemoveDisciplinary = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quyết định kỷ luật này? Lớp sẽ được xét lại theo điểm số.')) {
      const res = removeDisciplinaryRecord(id);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
      } else {
        setActionMessage({ type: 'error', text: res.message });
      }
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      evaluationConfig: { ...configForm },
    });
    setConfigSuccessMessage(true);
    setTimeout(() => setConfigSuccessMessage(false), 3000);
  };

  const handleApplySample = () => {
    const res = applyTitleVerificationSample();
    setActionMessage({ type: 'success', text: res.message });
    setShowSampleConfirm(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportTitleEvaluationExcel(selectedScopeName);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb Navigation Tabs between rankings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setCurrentTab('rankings')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Xếp hạng Tuần</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setCurrentTab('month_rankings')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Xếp hạng Tháng</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setCurrentTab('semester_rankings')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-purple-500" />
            <span>Xếp hạng Học kỳ</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setCurrentTab('year_rankings')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Medal className="w-3.5 h-3.5 text-blue-600" />
            <span>Xếp hạng Cả năm</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
            <span>XÉT DANH HIỆU LỚP</span>
          </div>
        </div>

        {/* View Switcher: Bảng danh hiệu / Cấu hình tỷ lệ / Quản lý kỷ luật */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('awards')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'awards'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Bảng Danh Hiệu</span>
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'config'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Cấu Hình Tỷ Lệ</span>
          </button>
          <button
            onClick={() => setActiveSubTab('disciplinary')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'disciplinary'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Hội Đồng Kỷ Luật ({disciplinaryRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Main Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Căn cứ văn bản: “Tiêu chí xếp loại lớp, năm học 2026-2027”</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
              <span>XÉT DANH HIỆU LỚP CẢ NĂM</span>
              <span className="text-amber-400 text-xl sm:text-2xl font-extrabold font-mono">
                {settings.academicYear}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 leading-relaxed max-w-3xl">
              ✓ <strong>Dữ liệu đầu vào:</strong> Sử dụng ĐIỂM XẾP HẠNG CẢ NĂM đã được Ban Giám Hiệu CHỐT KHÓA.
              <br />
              ✓ <strong>Quy chế xét danh hiệu:</strong> Phân bổ theo tỷ lệ cấu hình hệ thống: <strong>Lớp Xuất Sắc</strong> (mặc định Top {((settings.evaluationConfig?.excellentClassesRatio ?? 0.35) * 100).toFixed(0)}%), <strong>Lớp Tiên Tiến</strong> (mặc định Top {((settings.evaluationConfig?.advancedClassesRatio ?? 0.7) * 100).toFixed(0)}%).
              <br />
              ✓ <strong>Quy tắc loại trừ nghiêm ngặt:</strong> Lớp có học sinh bị <em>Hội đồng kỷ luật xử lý</em> thì <strong>KHÔNG ĐƯỢC XẾP LOẠI CẢ NĂM</strong>.
              <br />
              ✓ <strong>Trường chính:</strong> Xét riêng điều kiện đặc cách về thành tích Câu lạc bộ văn hóa và Học sinh giỏi cấp tỉnh.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
            {/* Verification Sample Generator (Requirement 13) */}
            <button
              onClick={() => setShowSampleConfirm(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nạp Dữ Liệu Mẫu Kiểm Thử</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Xuất Excel</span>
            </button>

            {/* Print / PDF Report */}
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              <span>In Báo Cáo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Year Ranking Status & Title Lock Status Card (Yêu cầu 1 & 11) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Data State: Year Ranking */}
        <div
          className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all ${
            yearIsLocked
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <span
              className={`p-2.5 rounded-xl shadow-xs flex-shrink-0 ${
                yearIsLocked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {yearIsLocked ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight">
                  {yearIsLocked
                    ? 'DỮ LIỆU ĐẦU VÀO: ĐÃ CHỐT XẾP HẠNG CẢ NĂM'
                    : 'CẢNH BÁO: CHƯA CHỐT XẾP HẠNG CẢ NĂM'}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    yearIsLocked ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {yearIsLocked ? 'Đủ điều kiện chốt danh hiệu' : 'Chế độ mô phỏng dự kiến'}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {yearIsLocked
                  ? `Dữ liệu điểm cả năm đã được chốt khóa chính thức bởi ${yearLockInfo?.lockedBy?.name || 'BGH'} lúc ${yearLockInfo?.lockedAt ? new Date(yearLockInfo.lockedAt).toLocaleString('vi-VN') : ''}.`
                  : 'Yêu cầu 1 quy định: Xét danh hiệu phải sử dụng điểm xếp hạng cả năm ĐÃ ĐƯỢC CHỐT. Kết quả hiện tại đang ở trạng thái Xem trước / Dự kiến. Cần chốt bảng xếp hạng cả năm trước khi chốt danh hiệu.'}
              </p>
            </div>
          </div>
          {!yearIsLocked && (
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentTab('year_rankings')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Đến Module Xếp Hạng Cả Năm để Chốt</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Title Lock State (Requirement 11) */}
        <div
          className={`rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all ${
            titlesAreLocked
              ? 'bg-purple-50/80 border-purple-200 text-purple-950'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <span
              className={`p-2.5 rounded-xl shadow-xs flex-shrink-0 ${
                titlesAreLocked ? 'bg-purple-700 text-white' : 'bg-slate-700 text-white'
              }`}
            >
              {titlesAreLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight">
                  {titlesAreLocked
                    ? 'KẾT QUẢ DANH HIỆU LỚP: ĐÃ ĐƯỢC CHỐT KHÓA'
                    : 'KẾT QUẢ DANH HIỆU: ĐANG MỞ (CHƯA CHỐT)'}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    titlesAreLocked ? 'bg-purple-200 text-purple-900' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {titlesAreLocked ? 'Bảo lưu & Đóng băng' : 'Có thể hiệu chỉnh'}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {titlesAreLocked
                  ? `Chốt bởi: ${titleLockInfo?.lockedBy?.name || 'BGH'} (${titleLockInfo?.lockedBy?.role || 'Quản trị'}) vào lúc ${titleLockInfo?.lockedAt ? new Date(titleLockInfo.lockedAt).toLocaleString('vi-VN') : ''}. Toàn bộ danh hiệu và ghi chú đã được đóng băng.`
                  : 'Ban Giám Hiệu có thể xem xét danh sách, điều chỉnh tỷ lệ cấu hình hoặc ghi nhận các trường hợp kỷ luật trước khi chốt kết quả danh hiệu chính thức.'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Chốt danh hiệu / Mở khóa danh hiệu */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
            {titlesAreLocked ? (
              userCanUnlock ? (
                <button
                  onClick={() => setShowUnlockModal(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở Khóa Danh Hiệu (Admin)</span>
                </button>
              ) : (
                <span className="text-[11px] text-purple-700 italic font-medium">
                  🔒 Dữ liệu đã đóng băng. Chỉ Super Admin mới có quyền mở khóa.
                </span>
              )
            ) : userCanLock ? (
              <button
                onClick={() => setShowLockModal(true)}
                disabled={!yearIsLocked}
                title={!yearIsLocked ? 'Phải chốt bảng xếp hạng cả năm trước' : 'Chốt khóa danh hiệu lớp'}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 ${
                  yearIsLocked
                    ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Chốt Kết Quả Danh Hiệu Cả Năm</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 italic">
                Chỉ BGH hoặc Admin mới có quyền chốt khóa danh hiệu.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổng số lớp</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {titleData.totalClasses}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {selectedScopeName}
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>Lớp Xuất Sắc</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {titleData.excellentCount}
          </div>
          <div className="text-[11px] text-amber-800 font-semibold mt-0.5">
            {titleData.evaluatedClassesCount > 0
              ? `${((titleData.excellentCount / titleData.evaluatedClassesCount) * 100).toFixed(1)}% dự xét`
              : '0%'}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-emerald-50/40 to-white">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Lớp Tiên Tiến</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {titleData.advancedCount}
          </div>
          <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
            {titleData.evaluatedClassesCount > 0
              ? `${((titleData.advancedCount / titleData.evaluatedClassesCount) * 100).toFixed(1)}% dự xét`
              : '0%'}
          </div>
        </div>

        <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-indigo-50/40 to-white">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-bold">
            <span>Tổng Đạt Khen Thưởng</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            {titleData.excellentCount + titleData.advancedCount}
          </div>
          <div className="text-[11px] text-indigo-800 font-semibold mt-0.5">
            Tỷ lệ: {titleData.evaluatedClassesCount > 0
              ? `${(((titleData.excellentCount + titleData.advancedCount) / titleData.evaluatedClassesCount) * 100).toFixed(1)}%`
              : '0%'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Không Xếp Loại</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-2">
            {titleData.unclassifiedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Lớp ngoài chỉ tiêu
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs bg-gradient-to-b from-rose-50/40 to-white">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Bị Kỷ Luật Loại</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {titleData.disqualifiedCount}
          </div>
          <div className="text-[11px] text-rose-800 font-semibold mt-0.5">
            Theo Yêu cầu #3
          </div>
        </div>
      </div>

      {/* Sub-view 1: BẢNG DANH HIỆU LỚP */}
      {activeSubTab === 'awards' && (
        <div className="space-y-4">
          {/* Controls: Scope Filter, Title Filter, Status Filter, Search (Yêu cầu 5) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>BỘ LỌC PHẠM VI XÉT DANH HIỆU (Yêu cầu #5):</span>
              </div>
              <div className="text-xs text-slate-500">
                Hiển thị <strong>{displayedRows.length}</strong> / <strong>{titleData.totalClasses}</strong> lớp
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Phân hiệu filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cơ sở / Phân hiệu:
                </label>
                <select
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-hidden"
                >
                  <option value="all">Toàn trường (Tất cả 6 cơ sở)</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.type === 'main' ? '(Trường chính)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Khối lớp filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Khối lớp:
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-hidden"
                >
                  <option value="all">Tất cả các khối (6, 7, 8, 9)</option>
                  <option value={6}>Khối 6</option>
                  <option value={7}>Khối 7</option>
                  <option value={8}>Khối 8</option>
                  <option value={9}>Khối 9</option>
                </select>
              </div>

              {/* Danh hiệu filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Danh hiệu:
                </label>
                <select
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value as any)}
                  className="w-full bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-hidden"
                >
                  <option value="all">Tất cả danh hiệu</option>
                  <option value="LỚP XUẤT SẮC">🏆 Lớp Xuất Sắc</option>
                  <option value="LỚP TIÊN TIẾN">🎖️ Lớp Tiên Tiến</option>
                  <option value="KHÔNG ĐƯỢC XẾP LOẠI">⚠️ Không được xếp loại</option>
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
                    className="w-full bg-slate-50 text-slate-800 text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 outline-hidden"
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

          {/* Table Container (Requirement 4) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <th className="py-3 px-3.5 text-center w-12">STT</th>
                    <th className="py-3 px-4 min-w-[130px]">Lớp</th>
                    <th className="py-3 px-4 min-w-[150px]">Phân hiệu</th>
                    <th className="py-3 px-3.5 text-center min-w-[110px]">Điểm Cả Năm</th>
                    <th className="py-3 px-3.5 text-center min-w-[120px]">Trạng Thái Xét</th>
                    <th className="py-3 px-4 text-center min-w-[160px]">Danh Hiệu</th>
                    <th className="py-3 px-4 min-w-[280px]">Ghi Chú & Lý Do</th>
                    <th className="py-3 px-3.5 text-center w-20">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-sm font-bold">Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.</p>
                        <p className="text-xs text-slate-400 mt-1">Hãy thay đổi phân hiệu, khối lớp hoặc xóa từ khóa tìm kiếm.</p>
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((row) => {
                      const titleBadge = getTitleBadge(row.title);
                      const isDisciplinary = row.hasDisciplinaryStudent;

                      return (
                        <tr
                          key={row.classItem.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isDisciplinary
                              ? 'bg-rose-50/40'
                              : row.title === 'LỚP XUẤT SẮC'
                              ? 'bg-amber-50/20'
                              : ''
                          }`}
                        >
                          {/* STT */}
                          <td className="py-3 px-3.5 text-center font-bold text-slate-600">
                            {row.stt}
                          </td>

                          {/* Lớp */}
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>Lớp {row.classItem.name}</span>
                              {row.rank && row.rank <= 3 && !isDisciplinary && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
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
                            <div className="text-[10px] text-slate-500">
                              {row.campus.type === 'main' ? 'Trường chính' : 'Phân hiệu vệ tinh'}
                            </div>
                          </td>

                          {/* Điểm cả năm */}
                          <td className="py-3 px-3.5 text-center">
                            {row.yearScore !== null ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="font-black text-slate-900 font-mono text-sm px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                  {row.yearScore.toFixed(2)}
                                </span>
                                {row.rank && (
                                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                    Hạng {row.rank}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400 italic">
                                Chưa đủ dữ liệu
                              </span>
                            )}
                          </td>

                          {/* Trạng thái xét */}
                          <td className="py-3 px-3.5 text-center">
                            {row.evaluationStatus === 'Được xét' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                <Check className="w-3 h-3 text-blue-600" />
                                <span>Được xét</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
                                <X className="w-3 h-3 text-rose-600" />
                                <span>Không được xét</span>
                              </span>
                            )}
                          </td>

                          {/* Danh hiệu */}
                          <td className="py-3 px-4 text-center">
                            <div
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs border ${titleBadge.badgeClass}`}
                            >
                              {titleBadge.icon}
                              <span>{titleBadge.label}</span>
                            </div>
                          </td>

                          {/* Ghi chú & Lý do (Requirement 4 & 9) */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {/* Reason for qualification / disqualification */}
                              <p className="text-xs text-slate-800 leading-snug">
                                {row.notes || row.quotaReason}
                              </p>

                              {/* If disciplinary */}
                              {isDisciplinary && (
                                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded border border-rose-300">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  <span>{row.disciplinaryDetails || 'Học sinh bị Hội đồng kỷ luật'}</span>
                                </div>
                              )}

                              {/* Special condition for Trường chính */}
                              {row.specialAchievementNote && (
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  <span>{row.specialAchievementNote}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Action detail */}
                          <td className="py-3 px-3.5 text-center">
                            <button
                              onClick={() => setSelectedClassDetail(row)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Xem chi tiết hành trình tính điểm và xét danh hiệu"
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
        </div>
      )}

      {/* Sub-view 2: CẤU HÌNH TỶ LỆ & QUY CHẾ (Yêu cầu 6, 7, 8) */}
      {activeSubTab === 'config' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <Sliders className="w-3.5 h-3.5" />
                <span>Yêu cầu #6 & #7: Tỷ lệ lấy từ cấu hình hệ thống, KHÔNG hard-code</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                CẤU HÌNH TỶ LỆ & HẠN NGẠCH XÉT DANH HIỆU LỚP
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Các quy định chưa xác định rõ trong văn bản gốc được quản trị viên chủ động thiết lập linh hoạt để phù hợp với đặc thù năm học của nhà trường.
              </p>
            </div>

            {configSuccessMessage && (
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-300 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã lưu cấu hình tỷ lệ thành công!</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Advanced Classes Ratio (70%) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  1. Tỷ lệ Lớp Tiên Tiến trở lên (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={Math.round(configForm.advancedClassesRatio * 100)}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        advancedClassesRatio: Number(e.target.value) / 100,
                      })
                    }
                    className="w-24 bg-white text-slate-900 font-bold px-3 py-2 rounded-xl border border-slate-300 text-center text-base"
                  />
                  <span className="text-xs text-slate-600">
                    % tổng số lớp dự xét (Mặc định: 70%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Chỉ các lớp trong nhóm tỷ lệ này mới được công nhận danh hiệu Lớp Tiên tiến hoặc Lớp Xuất sắc.
                </p>
              </div>

              {/* Excellent Classes Ratio (35%) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  2. Tỷ lệ Lớp Xuất Sắc (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={Math.round(configForm.excellentClassesRatio * 100)}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        excellentClassesRatio: Number(e.target.value) / 100,
                      })
                    }
                    className="w-24 bg-white text-slate-900 font-bold px-3 py-2 rounded-xl border border-slate-300 text-center text-base"
                  />
                  <span className="text-xs text-slate-600">
                    % dự xét (Mặc định: 35%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Lớp có thứ hạng cao nhất trong nhóm đủ điều kiện sẽ được công nhận Lớp Xuất Sắc.
                </p>
              </div>

              {/* Rounding Method */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  3. Phương thức làm tròn hạn ngạch
                </label>
                <select
                  value={configForm.roundingMethod}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      roundingMethod: e.target.value as any,
                    })
                  }
                  className="w-full bg-white text-slate-900 font-bold px-3 py-2 rounded-xl border border-slate-300 text-xs"
                >
                  <option value="round">Làm tròn tiêu chuẩn (Toán học 0.5)</option>
                  <option value="floor">Làm tròn xuống (Không vượt trần)</option>
                  <option value="ceil">Làm tròn lên (Ưu tiên quyền lợi lớp)</option>
                </select>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Xử lý khi phép nhân tỷ lệ ra số thập phân (Ví dụ 24 lớp x 35% = 8.4 lớp).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quota Basis */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  4. Cơ sở tính hạn ngạch Lớp Xuất sắc
                </label>
                <select
                  value={configForm.quotaBasis}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      quotaBasis: e.target.value as any,
                    })
                  }
                  className="w-full bg-white text-slate-900 font-bold px-3 py-2 rounded-xl border border-slate-300 text-xs"
                >
                  <option value="total_classes">Tính % trực tiếp trên tổng số lớp dự xét (Chuẩn)</option>
                  <option value="advanced_pool">Tính % trong nhóm 70% lớp tiên tiến</option>
                </select>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Lựa chọn cách hiểu hạn ngạch theo văn bản hướng dẫn thi đua của ngành.
                </p>
              </div>

              {/* Special Condition: Trường chính vượt trần 70% (Yêu cầu 8) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800 flex items-center justify-between">
                  <span>5. Quy chế đặc cách Trường chính (Yêu cầu #8)</span>
                  <input
                    type="checkbox"
                    checked={configForm.allowMainCampusExceed70}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        allowMainCampusExceed70: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </label>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Cho phép lớp tại Trường chính nếu có thành tích đặc biệt (CLB văn hóa hoặc HSG cấp tỉnh đạt tỷ lệ quy chế) được <strong>phê chuẩn vượt trần 70%</strong> để đạt danh hiệu Lớp Tiên Tiến.
                </p>
              </div>
            </div>

            {/* Save Config Button */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Lưu & Áp Dụng Cấu Hình Tỷ Lệ</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-view 3: QUẢN LÝ QUYẾT ĐỊNH HỘI ĐỒNG KỶ LUẬT (Yêu cầu 3) */}
      {activeSubTab === 'disciplinary' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Yêu cầu #3: Lớp có HS bị Hội đồng kỷ luật thì KHÔNG được xếp loại cả năm</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                SỔ THEO DÕI QUYẾT ĐỊNH HỘI ĐỒNG KỶ LUẬT
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Cập nhật các quyết định kỷ luật chính thức đối với học sinh trong năm học. Hệ thống sẽ tự động chuyển trạng thái của lớp tương ứng sang “Không được xếp loại”.
              </p>
            </div>

            {!titlesAreLocked && (
              <button
                onClick={() => setShowAddDiscModal(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ghi Nhận Quyết Định Kỷ Luật Mới</span>
              </button>
            )}
          </div>

          {/* List of Registered Disciplinary Records */}
          <div className="space-y-3">
            {disciplinaryRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  Không có học sinh nào bị Hội đồng kỷ luật trong năm học này.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tất cả các lớp đều đủ điều kiện về mặt tư cách nề nếp kỷ luật để tham gia xét danh hiệu.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">Lớp vi phạm</th>
                      <th className="py-3 px-4">Họ và tên học sinh</th>
                      <th className="py-3 px-4">Số QĐ & Ngày ban hành</th>
                      <th className="py-3 px-4">Nội dung vi phạm & Lý do</th>
                      <th className="py-3 px-4">Cấp quyết định</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {disciplinaryRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-black text-rose-700">
                          Lớp {rec.className}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {rec.studentName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {rec.decisionNumber} ({rec.decisionDate})
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {rec.reason}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {rec.councilLevel}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!titlesAreLocked ? (
                            <button
                              onClick={() => handleRemoveDisciplinary(rec.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa hồ sơ kỷ luật này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Đã khóa</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Chốt Kết Quả Danh Hiệu (Requirement 11) */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-purple-700">
              <span className="p-3 bg-purple-100 rounded-2xl">
                <Lock className="w-6 h-6 text-purple-700" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  CHỐT KHÓA DANH HIỆU LỚP
                </h3>
                <p className="text-xs text-slate-500">Năm học {settings.academicYear}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Quy tắc đóng băng dữ liệu (Yêu cầu #11):</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Sau khi chốt, toàn bộ danh hiệu thi đua và ghi chú sẽ không được sửa trực tiếp.</li>
                <li>Hệ thống lưu lại họ tên người chốt, vai trò và thời gian chốt chính xác.</li>
                <li>Chỉ Quản trị viên hệ thống (Super Admin) mới có quyền mở khóa.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Ghi chú chốt khóa (tùy chọn):
              </label>
              <textarea
                value={lockNotes || ''}
                onChange={(e) => setLockNotes(e.target.value)}
                placeholder="Ví dụ: Hội đồng thi đua nhà trường đã họp và thống nhất phê chuẩn danh hiệu năm học 2026-2027..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-purple-500 outline-hidden h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleLock}
                className="px-5 py-2 text-xs font-black bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Xác Nhận Chốt Khóa Danh Hiệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Mở Khóa Danh Hiệu (Admin Only) */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-700">
              <span className="p-3 bg-rose-100 rounded-2xl">
                <Unlock className="w-6 h-6 text-rose-700" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  MỞ KHÓA DANH HIỆU LỚP
                </h3>
                <p className="text-xs text-slate-500">Quyền hạn Quản Trị Viên (Super Admin)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn mở khóa bảng kết quả danh hiệu thi đua cả năm học <strong>{settings.academicYear}</strong>? Hành động này sẽ cho phép Ban Giám Hiệu cập nhật hoặc tái đánh giá danh hiệu. Toàn bộ hành động mở khóa sẽ được ghi vào Nhật ký kiểm toán.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                Lý do mở khóa <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={unlockReason || ''}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Nhập lý do mở khóa chính thức (Bắt buộc để ghi nhật ký)..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleUnlock}
                className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Xác Nhận Mở Khóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Ghi Nhận Quyết Định Kỷ Luật Mới */}
      {showAddDiscModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-black text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>GHI NHẬN QUYẾT ĐỊNH HỘI ĐỒNG KỶ LUẬT</span>
              </div>
              <button
                onClick={() => setShowAddDiscModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDisciplinary} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp vi phạm:
                </label>
                <select
                  value={discForm.classId || ''}
                  onChange={(e) => setDiscForm({ ...discForm, classId: e.target.value })}
                  className="w-full bg-slate-50 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Lớp {cls.name} ({campuses.find((c) => c.id === cls.campusId)?.name || 'Cơ sở'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên học sinh:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Lê Tuấn Kiệt"
                    value={discForm.studentName || ''}
                    onChange={(e) => setDiscForm({ ...discForm, studentName: e.target.value })}
                    className="w-full bg-slate-50 text-xs px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Quyết Định Kỷ Luật:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 12/QĐ-KL-LHL"
                    value={discForm.decisionNumber || ''}
                    onChange={(e) => setDiscForm({ ...discForm, decisionNumber: e.target.value })}
                    className="w-full bg-slate-50 text-xs px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày ban hành:
                  </label>
                  <input
                    type="date"
                    required
                    value={discForm.decisionDate || ''}
                    onChange={(e) => setDiscForm({ ...discForm, decisionDate: e.target.value })}
                    className="w-full bg-slate-50 text-xs px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cấp ban hành:
                  </label>
                  <input
                    type="text"
                    value={discForm.councilLevel || ''}
                    onChange={(e) => setDiscForm({ ...discForm, councilLevel: e.target.value })}
                    className="w-full bg-slate-50 text-xs px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung / Lý do kỷ luật:
                </label>
                <textarea
                  required
                  placeholder="Ví dụ: Sử dụng thuốc lá điện tử trong trường học, vi phạm nghiêm trọng nề nếp..."
                  value={discForm.reason || ''}
                  onChange={(e) => setDiscForm({ ...discForm, reason: e.target.value })}
                  className="w-full bg-slate-50 text-xs p-3 rounded-xl border border-slate-200 outline-hidden h-16"
                />
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-800 leading-relaxed">
                ⚠️ <strong>Cảnh báo quy chế:</strong> Khi thêm quyết định kỷ luật này, lớp tương ứng sẽ tự động bị loại sang trạng thái <strong>KHÔNG ĐƯỢC XẾP LOẠI CẢ NĂM</strong> theo Yêu cầu #3.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDiscModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Lưu Quyết Định Kỷ Luật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Xác Nhận Nạp Bộ Dữ Liệu Kiểm Tra Mẫu (Requirement 13) */}
      {showSampleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-amber-600">
              <span className="p-3 bg-amber-100 rounded-2xl">
                <Sparkles className="w-6 h-6 text-amber-600" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  NẠP DỮ LIỆU KIỂM TRA MẪU
                </h3>
                <p className="text-xs text-slate-500">Yêu cầu kiểm thử #13 & #14</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p className="font-bold text-slate-900">Hệ thống sẽ thiết lập kịch bản kiểm tra toàn diện:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                <li>Điểm cả năm được chốt khóa chính thức.</li>
                <li><strong>Lớp 7A2:</strong> Thêm quyết định kỷ luật học sinh Lê Tuấn Kiệt do Hội đồng kỷ luật xử lý -&gt; Tự động <strong>KHÔNG ĐƯỢC XẾP LOẠI</strong>.</li>
                <li><strong>Lớp 9A1 (Trường chính):</strong> Đạt điều kiện đặc cách CLB / HSG tỉnh cấp tỉnh theo tiêu chuẩn quy chế.</li>
                <li>Phân bổ hạn ngạch Lớp Xuất Sắc &amp; Lớp Tiên Tiến chính xác theo tỷ lệ cấu hình.</li>
                <li>Mở khóa danh hiệu để bạn có thể thử nghiệm tính năng Chốt kết quả.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowSampleConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleApplySample}
                className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Xác Nhận Nạp Kịch Bản Kiểm Tra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Chi Tiết Hành Trình Tính Điểm & Xét Danh Hiệu */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>CHI TIẾT XÉT DANH HIỆU LỚP {selectedClassDetail.classItem.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedClassDetail.campus.name} • GVCN: {selectedClassDetail.classItem.homeroomTeacher || 'Chưa phân công'}
                </p>
              </div>
              <button
                onClick={() => setSelectedClassDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title Badge Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Kết Quả Xét Danh Hiệu
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {selectedClassDetail.title}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Điểm Cả Năm
                </div>
                <div className="text-lg font-black font-mono text-blue-600 mt-0.5">
                  {selectedClassDetail.yearScore !== null ? `${selectedClassDetail.yearScore.toFixed(2)}đ` : 'Chưa đủ dữ liệu'}
                </div>
              </div>
            </div>

            {/* Reasons breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Căn cứ &amp; Lý do xét duyệt:</h4>
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl text-xs text-slate-800 leading-relaxed space-y-1.5">
                <p>✓ <strong>Trạng thái dự xét:</strong> {selectedClassDetail.evaluationStatus}</p>
                <p>✓ <strong>Căn cứ xếp hạng:</strong> {selectedClassDetail.quotaReason}</p>
                {selectedClassDetail.hasDisciplinaryStudent && (
                  <p className="text-rose-700 font-bold">
                    ⚠️ <strong>Vi phạm kỷ luật:</strong> {selectedClassDetail.disciplinaryDetails}
                  </p>
                )}
                {selectedClassDetail.specialAchievementNote && (
                  <p className="text-indigo-700 font-semibold">
                    ⭐ <strong>Thành tích đặc cách:</strong> {selectedClassDetail.specialAchievementNote}
                  </p>
                )}
              </div>
            </div>

            {/* Action button to jump to full Year Ranking Tree */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedClassDetail(null);
                  setCurrentTab('year_rankings');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Xem Cây Tính Điểm Cả Năm (HKI, HKII, Tháng, Tuần)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
