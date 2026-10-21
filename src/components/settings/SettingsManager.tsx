import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings as SettingsIcon,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  School,
  Calculator,
  Calendar,
  Clock,
  CalendarClock,
  Sliders,
  Sparkles,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
  UserCheck,
  Users,
  Mail,
  Building2,
  History,
} from 'lucide-react';
import { EvaluationConfig } from '../../types';
import { RegulationAuditModal } from '../compliance/RegulationAuditModal';
import { BackupExcelCenterModal } from '../backup/BackupExcelCenterModal';
import { AccountEmailManager } from './AccountEmailManager';
import { HistoricalScoresManager } from './HistoricalScoresManager';
import { canManageHistoricalScores } from '../../utils/rbac';
import { calculateWeek1StartDateByMode } from '../../utils/timeEngine';

export const SettingsManager: React.FC = () => {
  const {
    settings,
    classes,
    campuses,
    updateCampus,
    updateSettings,
    resetToDefaultData,
    clearTestDataForGoLive,
    resetDatabase,
    exportDataBackup,
    importDataBackup,
    currentUser,
    academicYearArchives,
    maxWeeks,
    currentActiveWeek,
    activateManualWeek,
    updateTimeframeConfig,
    exportOfflineStandbyWorkbook,
  } = useApp();

  const handleSnapshotBackup = () => {
    exportOfflineStandbyWorkbook(settings.currentWeek || 4);
    setMessage({ text: 'Đã xuất bản sao lưu dữ liệu tổng hợp (Snapshot) thành công!', type: 'success' });
    setTimeout(() => setMessage(null), 4000);
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState<'rules' | 'organization' | 'accounts' | 'historical'>('rules');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Basic settings
  const [governingBody, setGoverningBody] = useState(settings.governingBody || '');
  const [schoolName, setSchoolName] = useState(settings.schoolName || 'Trường THCS Lê Hữu Lập');
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [basePoints, setBasePoints] = useState(settings.basePointsPerWeek);
  const [currentWeek, setCurrentWeek] = useState(settings.current_active_week || settings.currentWeek || 4);
  const [formula, setFormula] = useState(settings.yearFormula);

  // Timeframe and Auto-progression settings
  const [sem1Weeks, setSem1Weeks] = useState(settings.totalWeeksSemester1 || 18);
  const [sem2Weeks, setSem2Weeks] = useState(settings.totalWeeksSemester2 || 17);
  const [schoolStartDate, setSchoolStartDate] = useState(settings.schoolStartDate || '2026-09-05');
  const [week1Mode, setWeek1Mode] = useState<'contains_sep_5' | 'after_sep_5' | 'custom'>(
    settings.week_1_mode || 'after_sep_5'
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    settings.start_date_of_week_1 || '2026-09-07'
  );
  const [manualWeekChoice, setManualWeekChoice] = useState(settings.current_active_week || settings.currentWeek || 4);
  const [timeframeMsg, setTimeframeMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [manualWeekMsg, setManualWeekMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Leadership & Signatures (Hệ thống -> Cấu hình -> Ban giám hiệu -> Phó hiệu trưởng phụ trách phân hiệu)
  const [principalName, setPrincipalName] = useState(
    settings.leadershipSignatures?.principalName || 'Thầy Nguyễn Văn Sơn'
  );
  const [vicePrincipalEmulationName, setVicePrincipalEmulationName] = useState(
    settings.leadershipSignatures?.vicePrincipalEmulationName || 'Thầy Hoàng Văn Sơn'
  );
  const [tptName, setTptName] = useState(
    settings.leadershipSignatures?.tptName || 'Cô Lê Thị Hoa'
  );
  const [campusLeaders, setCampusLeaders] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    campuses.forEach((c) => {
      map[c.id] =
        c.leaderName ||
        settings.leadershipSignatures?.campusVicePrincipals?.[c.id] ||
        '';
    });
    return map;
  });

  // Evaluation Rule Configs
  const [evalConfig, setEvalConfig] = useState<EvaluationConfig>(
    settings.evaluationConfig || {
      advancedClassesRatio: 0.7,
      excellentClassesRatio: 0.35,
      goodClassesRatio: 0.35,
      allowMainCampusExceed70: true,
      mainWeakBaseThreshold: 2,
      mainWeakBasePoints: 1,
      mainWeakStepPoints: 0.5,
      subWeakThreshold: 5,
      subWeakPenalty: 2,
      subWeakMaxCap: 2,
      mainA1GoodThreshold: 13,
      mainA2A3GoodThreshold: 10,
      subGoodThreshold: 5,
      goodScoreBonus: 2,
      goodScoreMaxCap: 2,
      dormitoryMaxCap: 3,
      ceremonyMaxCap: 0.5,
      lostFoundValueThreshold: 200000,
    }
  );

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSaveTimeframe = () => {
    const calculatedStartDate = calculateWeek1StartDateByMode(
      settings.academicYear,
      week1Mode,
      customStartDate
    );
    updateSettings({
      week_1_mode: week1Mode,
      start_date_of_week_1: calculatedStartDate,
      schoolStartDate,
    });
    const res = updateTimeframeConfig(sem1Weeks, sem2Weeks, schoolStartDate);
    if (res.success) {
      setTimeframeMsg({ text: res.message, type: 'success' });
    } else {
      setTimeframeMsg({ text: res.message, type: 'error' });
    }
    setTimeout(() => setTimeframeMsg(null), 4000);
  };

  const handleActivateManualWeek = () => {
    const res = activateManualWeek(manualWeekChoice);
    if (res.success) {
      setManualWeekMsg({ text: res.message, type: 'success' });
      setCurrentWeek(manualWeekChoice);
    } else {
      setManualWeekMsg({ text: res.message, type: 'error' });
    }
    setTimeout(() => setManualWeekMsg(null), 4000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const totalW = Number(sem1Weeks) + Number(sem2Weeks);
    updateSettings({
      governingBody: governingBody.trim(),
      schoolName: schoolName.trim(),
      academicYear: academicYear.trim(),
      basePointsPerWeek: Number(basePoints),
      currentWeek: Number(currentWeek),
      current_active_week: Number(currentWeek),
      totalWeeksSemester1: Number(sem1Weeks),
      totalWeeksSemester2: Number(sem2Weeks),
      totalWeeks: totalW,
      max_weeks: totalW,
      schoolStartDate,
      yearFormula: formula.trim(),
      evaluationConfig: evalConfig,
      leadershipSignatures: {
        principalName: principalName.trim(),
        vicePrincipalEmulationName: vicePrincipalEmulationName.trim(),
        tptName: tptName.trim(),
        campusVicePrincipals: campusLeaders,
      },
    });

    // Synchronize each campus leaderName
    Object.entries(campusLeaders).forEach(([cId, leader]) => {
      if (leader.trim()) {
        updateCampus(cId, { leaderName: leader.trim() });
      }
    });

    setMessage({ text: 'Cấu hình hệ thống, Khung thời gian thi đua, Ban Giám Hiệu và Phó Hiệu Trưởng các phân hiệu đã được cập nhật thành công!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveOrganization = () => {
    updateSettings({
      governingBody: governingBody.trim(),
      schoolName: schoolName.trim(),
    });
    setMessage({
      text: 'Đã lưu Thông tin Đơn vị thành công! Tiêu đề biên bản PDF và file Excel sẽ hiển thị theo cơ cấu mới.',
      type: 'success',
    });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDownloadBackup = () => {
    const dataStr = exportDataBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LHL_Ranking_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage({ text: 'Đã xuất tệp sao lưu dữ liệu toàn hệ thống!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importDataBackup(content);
        if (res.success) {
          setMessage({ text: res.message, type: 'success' });
        } else {
          setMessage({ text: res.message, type: 'error' });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn đặt lại dữ liệu về cấu hình và dữ liệu mẫu gốc chuẩn PDF? Mọi dữ liệu mới thêm sẽ bị làm mới.'
      )
    ) {
      resetToDefaultData();
      setMessage({ text: 'Đã khôi phục toàn bộ dữ liệu mẫu gốc chuẩn 59 lớp thi đua!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const [showClearTestDataModal, setShowClearTestDataModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearScoresOpt, setClearScoresOpt] = useState(true);
  const [clearClassesOpt, setClearClassesOpt] = useState(false);
  const [clearTeachersOpt, setClearTeachersOpt] = useState(false);
  const [purgeOtherCampusesOnlyOpt, setPurgeOtherCampusesOnlyOpt] = useState(true);

  const handleClearTestData = async () => {
    setIsClearing(true);
    try {
      const res = await clearTestDataForGoLive({
        clearScores: clearScoresOpt,
        clearClasses: clearClassesOpt,
        clearTeachers: clearTeachersOpt,
        purgeOtherCampusesOnly: purgeOtherCampusesOnlyOpt,
      });
      if (res.success) {
        setMessage({ text: res.message, type: 'success' });
        setShowClearTestDataModal(false);
      } else {
        setMessage({ text: res.message, type: 'error' });
      }
    } catch {
      setMessage({ text: 'Có lỗi xảy ra khi dọn dẹp dữ liệu.', type: 'error' });
    } finally {
      setIsClearing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleResetDatabase = () => {
    setClearScoresOpt(true);
    setClearClassesOpt(true);
    setClearTeachersOpt(true);
    setShowClearTestDataModal(true);
  };


  const canManage = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const canManageHistorical = canManageHistoricalScores(currentUser);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            <SettingsIcon size={16} />
            <span>Cài đặt hệ thống & Cấu hình Quy chế</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Cấu Hình Hệ Thống & Quản Lý Phân Quyền
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị quy chế thi đua 6 phân hiệu và gán địa chỉ Email Google thực tế cho 59 Giáo viên chủ nhiệm.
          </p>
        </div>

        {canManage && activeSettingsTab === 'rules' && (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Save size={16} />
            <span>Lưu tất cả cấu hình quy chế</span>
          </button>
        )}

        {canManage && activeSettingsTab === 'organization' && (
          <button
            onClick={handleSaveOrganization}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Save size={16} />
            <span>Lưu Thông Tin Đơn Vị</span>
          </button>
        )}
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="flex items-center flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setActiveSettingsTab('organization')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'organization'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Building2 size={16} className={activeSettingsTab === 'organization' ? 'text-indigo-600' : 'text-slate-500'} />
          <span>1. Thông Tin Đơn Vị</span>
        </button>

        <button
          onClick={() => setActiveSettingsTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'rules'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Sliders size={16} className={activeSettingsTab === 'rules' ? 'text-indigo-600' : 'text-slate-500'} />
          <span>2. Cấu Hình Thi Đua & Quy Chế</span>
        </button>

        <button
          onClick={() => setActiveSettingsTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSettingsTab === 'accounts'
              ? 'bg-white text-indigo-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Mail size={16} className={activeSettingsTab === 'accounts' ? 'text-indigo-600' : 'text-slate-500'} />
          <span>3. Quản Lý Tài Khoản Google (59 GVCN)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
            CHẾ ĐỘ THẬT
          </span>
        </button>

        {canManageHistorical && (
          <button
            onClick={() => setActiveSettingsTab('historical')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSettingsTab === 'historical'
                ? 'bg-white text-amber-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <History size={16} className={activeSettingsTab === 'historical' ? 'text-amber-600' : 'text-slate-500'} />
            <span>4. Điểm Bảo Lưu (Lịch Sử)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-850">
              QUÁ KHỨ
            </span>
          </button>
        )}
      </div>

      {/* Render sub-tabs */}
      {activeSettingsTab === 'organization' ? (
        <div className="space-y-6">
          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            {/* Snapshot Backup Card */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">Xuất bản sao lưu dữ liệu (Snapshot)</h4>
                <p className="text-xs text-emerald-700 mt-0.5">Tổng hợp dữ liệu điểm số, xếp hạng và minh chứng offline hàng tuần/tháng cho Ban Giám hiệu lưu trữ.</p>
              </div>
              <button
                type="button"
                onClick={handleSnapshotBackup}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              >
                <FileSpreadsheet size={16} />
                <span>Xuất bản sao lưu dữ liệu</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                  <Building2 size={22} />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Cấu Hình Thông Tin Đơn Vị & Tiêu Đề Báo Cáo
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tùy chỉnh Đơn vị cấp trên và Tên trường để tự động in lên tiêu đề Biên bản PDF và file Excel xuất ra.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                Áp dụng động toàn hệ thống
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Input Column */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    1. Đơn vị cấp trên / Chủ quản (Cho phép để trống)
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={governingBody}
                    onChange={(e) => setGoverningBody(e.target.value)}
                    placeholder="Ví dụ: PHÒNG GIÁO DỤC VÀ ĐÀO TẠO... (để trống nếu không áp dụng)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    💡 <em>Lưu ý:</em> Dòng này được in ở dòng đầu tiên góc trái trên cùng của biên bản PDF và file Excel. <strong>Nếu để trống</strong>, hệ thống sẽ bỏ qua dòng này và chỉ in Tên trường.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    2. Tên trường <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canManage}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ví dụ: TRƯỜNG THCS LÊ HỮU LẬP"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    💡 <em>Lưu ý:</em> Dòng này được in ở dòng thứ hai góc trái trên cùng (in hoa đậm) của biên bản PDF và file Excel.
                  </p>
                </div>

                {canManage && (
                  <button
                    onClick={handleSaveOrganization}
                    className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save size={16} />
                    <span>Lưu Thông Tin Đơn Vị</span>
                  </button>
                )}
              </div>

              {/* Live Preview Column */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Xem trước tiêu đề văn bản hành chính (Biên bản PDF & Excel):
                </label>
                <div className="p-6 bg-white border-2 border-dashed border-slate-300 rounded-2xl shadow-inner font-serif text-slate-900 min-h-[220px] flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-300 text-center text-xs">
                    {/* Header Left */}
                    <div className="space-y-1">
                      {governingBody.trim() ? (
                        <div className="font-semibold text-xs text-slate-800 uppercase tracking-wide">
                          {governingBody.trim()}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">
                          (Đơn vị cấp trên để trống - Không in)
                        </div>
                      )}
                      <div className="font-bold text-xs sm:text-sm uppercase tracking-wide text-slate-900">
                        {schoolName.trim() || 'TÊN TRƯỜNG HỌC'}
                      </div>
                      <div className="text-[11px] text-slate-500 italic">Số: 26/BC-TĐ-LHL</div>
                    </div>

                    {/* Header Right */}
                    <div className="space-y-1">
                      <div className="font-bold text-xs uppercase tracking-wide">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </div>
                      <div className="font-semibold text-xs underline underline-offset-4 decoration-slate-400">
                        Độc lập – Tự do – Hạnh phúc
                      </div>
                      <div className="text-[11px] text-slate-500 italic pt-1">
                        Hậu Lộc, ngày ..... tháng ..... năm 2026
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                      BIÊN BẢN TỔNG HỢP XẾP LOẠI THI ĐUA CÁC LỚP
                    </h4>
                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                      Kỳ đánh giá: Tuần 4 — Phạm vi: Toàn trường (59 lớp)
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Tiêu đề này sẽ được áp dụng tự động 100% khi bạn bấm <strong>Xuất PDF</strong> hoặc <strong>Xuất Excel</strong>.
                  </span>
                </div>

                {/* Copyright & Author Box */}
                <div className="p-4 bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-2xl border border-blue-700 text-white shadow-md space-y-1">
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Thông tin bản quyền & Tác giả phần mềm
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    Phần mềm thiết kế bởi Lê Huy Hùng
                  </div>
                  <div className="text-xs text-blue-100">
                    Giáo viên trường THCS Lê Hữu Lập - Hậu Lộc - Thanh Hóa
                  </div>
                  <div className="text-xs text-emerald-300 font-mono font-bold pt-0.5">
                    Số điện thoại liên hệ: 0919709286
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeSettingsTab === 'accounts' ? (
        <AccountEmailManager />
      ) : activeSettingsTab === 'historical' ? (
        <HistoricalScoresManager />
      ) : (
        <>
          {/* Notification Message */}
          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

      {/* SECTION 1: Evaluation Rules & Thresholds */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base">
            <Sliders size={18} className="text-indigo-600" />
            <span>1. Tỷ Lệ Xếp Loại Thi Đua & Định Mức Điểm Cấu Hình Động</span>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            Quyết định năm học {settings.academicYear}
          </span>
        </div>

        {/* 1.1 Classification Ratios */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            a. Tỷ lệ khống chế xếp loại thi đua cả năm (Theo Mục II Quyết định)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Tỷ lệ Lớp Tiên Tiến trở lên
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  disabled={!canManage}
                  value={Math.round(evalConfig.advancedClassesRatio * 100)}
                  onChange={(e) =>
                    setEvalConfig({
                      ...evalConfig,
                      advancedClassesRatio: Number(e.target.value) / 100,
                    })
                  }
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-indigo-700 focus:outline-indigo-500"
                />
                <span className="text-xs font-bold text-slate-500">% tổng số lớp</span>
              </div>
              <p className="text-[11px] text-slate-500">Mặc định: 70% / tổng số lớp toàn trường</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Tỷ lệ Lớp Xuất Sắc
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  disabled={!canManage}
                  value={Math.round(evalConfig.excellentClassesRatio * 100)}
                  onChange={(e) =>
                    setEvalConfig({
                      ...evalConfig,
                      excellentClassesRatio: Number(e.target.value) / 100,
                    })
                  }
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-emerald-700 focus:outline-indigo-500"
                />
                <span className="text-xs font-bold text-slate-500">% trong chỉ tiêu</span>
              </div>
              <p className="text-[11px] text-slate-500">Mặc định: 35% của 70% lớp tiên tiến</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Tỷ lệ Lớp Tiên Tiến
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  disabled={!canManage}
                  value={Math.round(evalConfig.goodClassesRatio * 100)}
                  onChange={(e) =>
                    setEvalConfig({
                      ...evalConfig,
                      goodClassesRatio: Number(e.target.value) / 100,
                    })
                  }
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-blue-700 focus:outline-indigo-500"
                />
                <span className="text-xs font-bold text-slate-500">% trong chỉ tiêu</span>
              </div>
              <p className="text-[11px] text-slate-500">Mặc định: 35% của 70% lớp tiên tiến</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="allowExceed"
              disabled={!canManage}
              checked={evalConfig.allowMainCampusExceed70}
              onChange={(e) =>
                setEvalConfig({ ...evalConfig, allowMainCampusExceed70: e.target.checked })
              }
              className="w-4 h-4 text-indigo-600 rounded-sm cursor-pointer"
            />
            <label htmlFor="allowExceed" className="text-xs font-bold text-slate-700 cursor-pointer">
              Riêng trường chính: Cho phép xem xét tỷ lệ HSG tỉnh và CLB để vượt mốc 70% nếu đạt chuẩn.
            </label>
          </div>
        </div>

        {/* 1.2 Good Score & Weak Score Dynamic Thresholds */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            b. Định mức Điểm Tốt & Điểm Yếu theo Trường chính vs Phân hiệu
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Lớp A1 Trường chính */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 block">Trường chính: Lớp chọn A1</span>
              <label className="block text-xs font-bold text-slate-800">
                Định mức Điểm tốt (9-10đ)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  disabled={!canManage}
                  value={evalConfig.mainA1GoodThreshold}
                  onChange={(e) =>
                    setEvalConfig({ ...evalConfig, mainA1GoodThreshold: Number(e.target.value) })
                  }
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-indigo-500"
                />
                <span className="text-xs text-slate-600 font-semibold">con điểm tốt / tuần</span>
              </div>
              <p className="text-[10px] text-slate-500">Lớp A1 đạt từ 13 con mới được cộng 2đ (max 2đ)</p>
            </div>

            {/* Lớp A2, A3 Trường chính */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 block">Trường chính: Lớp A2, A3</span>
              <label className="block text-xs font-bold text-slate-800">
                Định mức Điểm tốt (9-10đ)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  disabled={!canManage}
                  value={evalConfig.mainA2A3GoodThreshold}
                  onChange={(e) =>
                    setEvalConfig({ ...evalConfig, mainA2A3GoodThreshold: Number(e.target.value) })
                  }
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-indigo-500"
                />
                <span className="text-xs text-slate-600 font-semibold">con điểm tốt / tuần</span>
              </div>
              <p className="text-[10px] text-slate-500">Lớp A2, A3 đạt từ 10 con mới được cộng 2đ (max 2đ)</p>
            </div>

            {/* Các Phân hiệu */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-teal-600 block">Các Phân hiệu</span>
              <label className="block text-xs font-bold text-slate-800">
                Định mức Điểm tốt (9-10đ)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  disabled={!canManage}
                  value={evalConfig.subGoodThreshold}
                  onChange={(e) =>
                    setEvalConfig({ ...evalConfig, subGoodThreshold: Number(e.target.value) })
                  }
                  className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-indigo-500"
                />
                <span className="text-xs text-slate-600 font-semibold">con điểm tốt / tuần</span>
              </div>
              <p className="text-[10px] text-slate-500">Phân hiệu đạt từ 5 con được cộng 2đ</p>
            </div>

            {/* Điểm yếu trường chính */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-rose-600 block">Trường chính: Điểm yếu</span>
              <label className="block text-xs font-bold text-slate-800">
                Bậc phạt điểm yếu
              </label>
              <div className="text-xs space-y-1 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span>Chạm mốc:</span>
                  <input
                    type="number"
                    min="1"
                    disabled={!canManage}
                    value={evalConfig.mainWeakBaseThreshold}
                    onChange={(e) =>
                      setEvalConfig({ ...evalConfig, mainWeakBaseThreshold: Number(e.target.value) })
                    }
                    className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                  />
                  <span>con trừ:</span>
                  <input
                    type="number"
                    step="0.5"
                    disabled={!canManage}
                    value={evalConfig.mainWeakBasePoints}
                    onChange={(e) =>
                      setEvalConfig({ ...evalConfig, mainWeakBasePoints: Number(e.target.value) })
                    }
                    className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                  />
                  <span>đ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Mỗi con tiếp theo trừ thêm:</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canManage}
                    value={evalConfig.mainWeakStepPoints}
                    onChange={(e) =>
                      setEvalConfig({ ...evalConfig, mainWeakStepPoints: Number(e.target.value) })
                    }
                    className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                  />
                  <span>đ</span>
                </div>
              </div>
            </div>

            {/* Điểm yếu phân hiệu */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-rose-600 block">Phân hiệu: Điểm yếu</span>
              <label className="block text-xs font-bold text-slate-800">
                Ngưỡng phạt & Trần phạt
              </label>
              <div className="text-xs space-y-1 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <span>Ngưỡng trừ: Từ</span>
                  <input
                    type="number"
                    min="1"
                    disabled={!canManage}
                    value={evalConfig.subWeakThreshold}
                    onChange={(e) =>
                      setEvalConfig({ ...evalConfig, subWeakThreshold: Number(e.target.value) })
                    }
                    className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                  />
                  <span>con trở lên</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Trừ:</span>
                  <input
                    type="number"
                    disabled={!canManage}
                    value={evalConfig.subWeakPenalty}
                    onChange={(e) =>
                      setEvalConfig({ ...evalConfig, subWeakPenalty: Number(e.target.value) })
                    }
                    className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                  />
                  <span>đ (Trần: {evalConfig.subWeakMaxCap}đ)</span>
                </div>
              </div>
            </div>

            {/* Bán trú & Đội nghi lễ */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-amber-600 block">Trần điểm đặc thù</span>
              <label className="block text-xs font-bold text-slate-800">
                Giới hạn Bán trú & Nghi lễ
              </label>
              <div className="text-xs space-y-1 text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Trần trừ Bán trú:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      disabled={!canManage}
                      value={evalConfig.dormitoryMaxCap}
                      onChange={(e) =>
                        setEvalConfig({ ...evalConfig, dormitoryMaxCap: Number(e.target.value) })
                      }
                      className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                    />
                    <span>đ</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trần Đội nghi lễ LĐ:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canManage}
                      value={evalConfig.ceremonyMaxCap}
                      onChange={(e) =>
                        setEvalConfig({ ...evalConfig, ceremonyMaxCap: Number(e.target.value) })
                      }
                      className="w-14 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md font-bold text-center"
                    />
                    <span>đ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Leadership & Vice Principals Configuration (Requirement XI) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base">
            <UserCheck size={18} className="text-indigo-600" />
            <span>2. Cấu Hình Ban Giám Hiệu & Phó Hiệu Trưởng Phụ Trách Phân Hiệu</span>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
            Người ký biên bản & báo cáo
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Cấu hình thông tin Lãnh đạo Nhà trường và <strong>Phó Hiệu trưởng phụ trách từng phân hiệu</strong>. Dữ liệu này được tự động trích xuất vào phần chữ ký trên Biên bản tổng hợp thi đua, bản in xem trước, tệp Excel và tệp PDF. Khi thay đổi tại đây, toàn bộ biên bản của phân hiệu tương ứng sẽ tự động hiển thị người ký mới nhất.
        </p>

        {/* General Leadership */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users size={14} className="text-indigo-600" />
            <span>a. Ban Lãnh Đạo Nhà Trường & Tổng Phụ Trách</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Hiệu trưởng nhà trường
              </label>
              <input
                type="text"
                disabled={!canManage}
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="VD: Thầy Nguyễn Văn Sơn"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-indigo-500"
              />
              <p className="text-[11px] text-slate-500">Ký duyệt và đóng dấu văn bản hành chính</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Phó Hiệu trưởng phụ trách Thi đua
              </label>
              <input
                type="text"
                disabled={!canManage}
                value={vicePrincipalEmulationName}
                onChange={(e) => setVicePrincipalEmulationName(e.target.value)}
                placeholder="VD: Thầy Hoàng Văn Sơn"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-indigo-700 focus:outline-indigo-500"
              />
              <p className="text-[11px] text-slate-500">Ký xác nhận báo cáo quy mô Toàn trường</p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Tổng phụ trách Đội
              </label>
              <input
                type="text"
                disabled={!canManage}
                value={tptName}
                onChange={(e) => setTptName(e.target.value)}
                placeholder="VD: Cô Lê Thị Hoa"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-emerald-700 focus:outline-indigo-500"
              />
              <p className="text-[11px] text-slate-500">Người lập biểu / Ban thi đua thiếu nhi</p>
            </div>
          </div>
        </div>

        {/* Vice Principals by Campus */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <School size={14} className="text-indigo-600" />
            <span>b. Phó Hiệu Trưởng Phụ Trách Từng Phân Hiệu (Ký Biên Bản Xếp Loại)</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campuses.map((campus) => (
              <div
                key={campus.id}
                className="p-3.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">{campus.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {classes.filter((c) => c.campusId === campus.id).length} lớp
                  </span>
                </div>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Phó Hiệu trưởng phụ trách:
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={campusLeaders[campus.id] || ''}
                  onChange={(e) =>
                    setCampusLeaders({
                      ...campusLeaders,
                      [campus.id]: e.target.value,
                    })
                  }
                  placeholder={`Phó HT phụ trách ${campus.name}`}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-indigo-500"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Chức danh ký: Phó Hiệu trưởng phụ trách {campus.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {canManage && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSave()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save size={16} />
              <span>Lưu danh sách Ban Giám Hiệu & Phó Hiệu Trưởng</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: General School Settings */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-slate-900 font-black text-base border-b border-slate-100 pb-3">
          <School size={18} className="text-indigo-600" />
          <span>3. Thông Tin Chung & Niên Khóa</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tên trường học</label>
            <input
              type="text"
              disabled={!canManage}
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
            <input
              type="text"
              disabled={!canManage}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Điểm gốc mỗi tuần (Base score)
            </label>
            <input
              type="number"
              disabled={!canManage}
              value={basePoints}
              onChange={(e) => setBasePoints(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-indigo-500"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Mặc định: 100 điểm khởi đầu mỗi tuần cho mỗi lớp
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tuần thi đua hiện tại (Hoạt động)</label>
            <div className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold text-indigo-900 flex items-center justify-between">
              <span>Tuần {currentActiveWeek} / {maxWeeks} tuần</span>
              <span className="text-[10px] bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-md font-extrabold">
                {currentActiveWeek <= (settings.totalWeeksSemester1 || 18) ? 'Học kỳ 1' : 'Học kỳ 2'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tự động nhảy sau 7 ngày hoặc điều chỉnh nhanh ở mục Khung Thời Gian bên dưới
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calculator size={14} className="text-indigo-600" />
              <span>Công thức tính điểm cả năm</span>
            </label>
            <input
              type="text"
              disabled={!canManage}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-indigo-800 focus:outline-indigo-500"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Quy chuẩn: (HK1 + HK2 * 2) / 3 + Điểm cộng cả năm (CLB văn hóa, Giải tỉnh K9, Đội nghi lễ).
            </span>
          </div>
        </div>

        {canManage && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save size={16} />
              <span>Lưu thông tin cấu hình</span>
            </button>
          </div>
        )}
      </form>

      {/* SECTION 3B: Emulation Timeframe & Auto Week Progression (Requirement 3) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CalendarClock size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Khung Thời Gian Thi Đua & Tự Động Chuyển Tuần
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh số tuần HK1 & HK2, tự động tính tổng số tuần toàn hệ thống và kiểm soát mốc thời gian thực
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
              Tổng số tuần: {sem1Weeks + sem2Weeks} tuần
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              Tuần hiện tại: Tuần {currentActiveWeek}
            </span>
          </div>
        </div>

        {/* Part 1: Cấu hình Khung thời gian thi đua */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Clock size={16} className="text-indigo-600" />
              <span>1. Cấu hình Tổng số tuần thi đua (Khung thời gian thi đua)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Cuối năm có thể dừng thi đua sớm: Tùy chỉnh HK2 thành 15, 14... tuần
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số tuần đánh giá Học kỳ 1
              </label>
              <input
                type="number"
                min="1"
                max="25"
                disabled={!canManage}
                value={sem1Weeks}
                onChange={(e) => setSem1Weeks(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-indigo-900 focus:outline-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mặc định: 18 tuần
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số tuần đánh giá Học kỳ 2
              </label>
              <input
                type="number"
                min="1"
                max="25"
                disabled={!canManage}
                value={sem2Weeks}
                onChange={(e) => setSem2Weeks(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-indigo-900 focus:outline-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mặc định 17 tuần (cho phép chỉnh 15, 14, ...)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tổng số tuần tối đa (max_weeks)
              </label>
              <div className="px-3 py-2 bg-indigo-100/70 border border-indigo-200 rounded-xl text-sm font-black text-indigo-900 flex items-center justify-between">
                <span>{sem1Weeks + sem2Weeks} tuần</span>
                <span className="text-[10px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-md">Tự động tính</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                = {sem1Weeks} (HK1) + {sem2Weeks} (HK2)
              </span>
            </div>
          </div>

          {/* Quy tắc tính Ngày bắt đầu Tuần 1 */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Mô hình quy tắc xác định Ngày bắt đầu Tuần 1:
            </label>
            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="week_1_mode"
                  disabled={!canManage}
                  checked={week1Mode === 'after_sep_5'}
                  onChange={() => {
                    setWeek1Mode('after_sep_5');
                    const computed = calculateWeek1StartDateByMode(settings.academicYear, 'after_sep_5');
                    setCustomStartDate(computed);
                  }}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-indigo-950">
                    Chế độ 1 (Linh hoạt / Khuyên dùng): Tuần 1 tính từ Thứ Hai đầu tiên của tuần thi đua nề nếp thực tế sau 05/09
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ví dụ năm học 2026-2027: Ngày 05/09/2026 rơi vào Thứ Bảy, nên Tuần 1 thi đua nề nếp thực tế chính thức bắt đầu từ <strong>Thứ Hai 07/09/2026</strong>.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="week_1_mode"
                  disabled={!canManage}
                  checked={week1Mode === 'contains_sep_5'}
                  onChange={() => {
                    setWeek1Mode('contains_sep_5');
                    const computed = calculateWeek1StartDateByMode(settings.academicYear, 'contains_sep_5');
                    setCustomStartDate(computed);
                  }}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900">
                    Chế độ 2: Tuần 1 tính từ Thứ Hai của tuần chứa ngày 05/09
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ví dụ năm học 2026-2027: Lùi lại tìm Thứ Hai của tuần chứa ngày 05/09 -&gt; <strong>Thứ Hai 31/08/2026</strong>.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="week_1_mode"
                  disabled={!canManage}
                  checked={week1Mode === 'custom'}
                  onChange={() => setWeek1Mode('custom')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1 space-y-1">
                  <span className="font-bold text-slate-900">
                    Chế độ 3: Tùy chỉnh ngày Thứ Hai bắt đầu Tuần 1 thủ công
                  </span>
                  {week1Mode === 'custom' && (
                    <input
                      type="date"
                      disabled={!canManage}
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="mt-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ngày bắt đầu năm học (Mặc định: 05/09)
              </label>
              <input
                type="date"
                disabled={!canManage}
                value={schoolStartDate}
                onChange={(e) => setSchoolStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-indigo-500"
              />
            </div>
            
            <div className="flex items-end">
              {canManage && (
                <button
                  type="button"
                  onClick={handleSaveTimeframe}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={15} />
                  <span>Lưu Cấu Hình Khung Thời Gian Thi Đua</span>
                </button>
              )}
            </div>
          </div>

          {timeframeMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              timeframeMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {timeframeMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{timeframeMsg.text}</span>
            </div>
          )}
        </div>

        {/* Part 2: Thiết lập Tuần hiện tại (Điều chỉnh thủ công / Bỏ qua nghỉ Lễ, Tết) */}
        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
              <Sliders size={16} className="text-blue-600" />
              <span>2. Công cụ 'Thiết lập Tuần hiện tại' (Bỏ qua nghỉ Lễ / Tết)</span>
            </div>
            <span className="text-[11px] text-blue-800 font-semibold bg-blue-100/70 px-2.5 py-0.5 rounded-lg border border-blue-200">
              Mốc Thứ Hai Tuần 1: {settings.start_date_of_week_1 || '31/08/2026'}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Dùng khi trường nghỉ Tết, nghỉ Lễ hoặc điều chỉnh nhịp thi đua. Khi Admin chọn một tuần bất kỳ và bấm <strong className="text-blue-900">Kích hoạt</strong>, hệ thống gán <strong className="text-blue-900">current_active_week</strong> = số tuần vừa chọn, đồng thời <strong className="text-blue-900">GHI ĐÈ start_date_of_week_1</strong> để hệ thống tự động đếm tiếp chuẩn xác từ mốc tuần này trở đi.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chọn tuần thi đua muốn kích hoạt (từ 1 đến {maxWeeks}):
              </label>
              <select
                disabled={!canManage}
                value={manualWeekChoice}
                onChange={(e) => setManualWeekChoice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-blue-950 focus:outline-blue-500 cursor-pointer"
              >
                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w <= (settings.totalWeeksSemester1 || 18) ? '(Học kỳ 1)' : '(Học kỳ 2)'}
                    {w === currentActiveWeek ? ' — [ĐANG HOẠT ĐỘNG]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {canManage && (
              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleActivateManualWeek}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>Kích hoạt Tuần {manualWeekChoice}</span>
                </button>
              </div>
            )}
          </div>

          {manualWeekMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              manualWeekMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {manualWeekMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{manualWeekMsg.text}</span>
            </div>
          )}

          {/* Logic tự động nhảy tuần info card */}
          <div className="p-3.5 bg-white rounded-xl border border-blue-200/70 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Thuật toán tính Tuần hiện tại chuẩn quy chế (Tự động & Chính xác):</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
              <li>Tuần 1 của năm học LUÔN LÀ tuần chứa ngày 05/09 của năm đó; ngày bắt đầu của Tuần 1 luôn là ngày Thứ Hai của tuần đó (<code>start_date_of_week_1</code>: {settings.start_date_of_week_1 || '31/08/2026'}).</li>
              <li>Công thức tính toán thời gian thực: <code>Số Tuần Hiện Tại = Làm tròn xuống ((Today - start_date_of_week_1) / 7 ngày) + 1</code>.</li>
              <li>Khi Admin thiết lập tuần bằng tay: Hệ thống ghi đè <code>start_date_of_week_1</code> tương ứng để từ tuần này tự động đếm tiếp khi sang tuần mới.</li>
              <li><strong className="text-rose-700">ĐIỀU KIỆN DỪNG:</strong> Quá trình tự động nhảy tuần bị chặn lại và dừng hẳn khi <code>current_active_week</code> chạm ngưỡng <code>max_weeks</code> ({maxWeeks} tuần).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 4: Multi-Year, Standby Excel, Backup & Restore */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base">
            <ShieldCheck size={18} className="text-indigo-600" />
            <span>4. Bảo Hiểm Dữ Liệu, Đa Năm Học & Rà Soát Quy Chuẩn</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
            Hoạt động độc lập
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Đảm bảo công tác thi đua nề nếp của Nhà trường diễn ra thông suốt qua nhiều năm học. Hỗ trợ tạo năm học mới tự động chuyển tiếp khối, lưu trữ lịch sử, xuất sổ tính điểm tự động bằng Excel phòng ngừa mất mạng hoặc sự cố phần mềm.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <FileSpreadsheet size={16} className="text-emerald-700" />
                  <span>Trung Tâm Xuất Excel & Đa Năm Học</span>
                </span>
                <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  {academicYearArchives.length} năm lưu trữ
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Xuất sổ chấm điểm & xếp loại offline độc lập với dữ liệu số và thứ hạng chuẩn xác 100%, quản lý chuyển tiếp năm học mới, sao lưu toàn bộ cơ sở dữ liệu.
              </p>
            </div>
            <button
              onClick={() => setShowBackupModal(true)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={15} />
              <span>Mở Trung Tâm Xuất Excel & Đa Năm Học</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Scale size={16} className="text-indigo-700" />
                  <span>Rà Soát Công Văn & Tính Toàn Vẹn</span>
                </span>
                <span className="text-[10px] font-bold bg-white text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                  Chuẩn 100%
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Tự động kiểm toán toàn vẹn 59 lớp của 6 phân hiệu, đối chiếu công văn trần bán trú ≤ 3đ, trần nghi lễ ≤ 0.5đ, quy tắc điểm yếu và các điều khoản kỷ luật.
              </p>
            </div>
            <button
              onClick={() => setShowAuditModal(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Scale size={15} />
              <span>Kiểm Tra Quy Chuẩn & Rà Soát Công Văn</span>
            </button>
          </div>
        </div>

        {/* Go-Live Data Cleanup Card */}
        {canManage && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white uppercase tracking-wider">
                    SẴN SÀNG VẬN HÀNH (GO-LIVE)
                  </span>
                  <span className="text-xs font-bold text-emerald-800">Dọn dẹp an toàn dữ liệu chạy thử</span>
                </div>
                <h4 className="text-base font-black text-slate-900">
                  Chuẩn Bị Hệ Thống Cho Giáo Viên Nhập Liệu Thật
                </h4>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Xóa sạch <strong>toàn bộ bản ghi chấm điểm, lỗi vi phạm, điểm bảo lưu thử nghiệm</strong> và <strong>mở khóa toàn bộ các tuần</strong>.
                  Tuyệt đối <strong>bảo tồn nguyên vẹn 59 Lớp học, 6 Phân hiệu, 71 Tài khoản người dùng (mật khẩu giữ nguyên), Tiêu chí thi đua và Cấu hình thời gian</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowClearTestDataModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition-all cursor-pointer shrink-0"
              >
                <Sparkles size={16} />
                <span>Dọn Dẹp Dữ Liệu Chạy Thử (Go-Live)</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Legacy Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Download size={15} />
            <span>Tải tệp JSON sao lưu</span>
          </button>

          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs">
            <Upload size={15} />
            <span>Phục hồi từ tệp JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          {canManage && (
            <>
              <button
                onClick={handleResetData}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Khôi phục dữ liệu mẫu gốc</span>
              </button>
              <button
                onClick={handleResetDatabase}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm col-span-full sm:col-span-3"
              >
                <RotateCcw size={15} />
                <span>Khởi tạo Cơ sở dữ liệu Trống (Sẵn sàng nhập liệu thật)</span>
              </button>
            </>
          )}
        </div>
      </div>
      </>
      )}

      {/* Compliance Audit Modal */}
      <RegulationAuditModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />

      {/* Backup & Standby Excel Center Modal */}
      <BackupExcelCenterModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />

      {/* Modal xác nhận dọn dẹp dữ liệu chạy thử Go-live */}
      {showClearTestDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shrink-0">
                <Sparkles size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Làm Sạch Dữ Liệu & Chuẩn Bị Nhập Liệu Thật
                </h3>
                <p className="text-xs text-slate-500">
                  Chọn các phạm vi dữ liệu bạn muốn dọn sạch trên Firebase Firestore và bộ nhớ để bắt đầu nhập chính thức.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option: Dọn dẹp phân hiệu thử nghiệm */}
              <label className="flex items-start gap-3 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl cursor-pointer hover:bg-indigo-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={purgeOtherCampusesOnlyOpt}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setPurgeOtherCampusesOnlyOpt(nextVal);
                    if (nextVal) {
                      setClearClassesOpt(false);
                      setClearTeachersOpt(false);
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-indigo-900">
                    Dọn sạch lớp & tài khoản của 5 phân hiệu chạy thử (Thuần Lộc, Lộc Sơn, Mỹ Lộc, Lộc Tân, Hậu Lộc)
                  </div>
                  <div className="text-indigo-700 mt-0.5 leading-relaxed">
                    Xóa sạch toàn bộ các lớp và tài khoản giáo viên mẫu của 5 phân hiệu thử nghiệm. <strong>BẢO TỒN 100%</strong> 12 lớp và danh sách giáo viên chính thức của phân hiệu Lê Hữu Lập cùng tài khoản Super Admin.
                  </div>
                </div>
              </label>

              {/* Option 1: Xóa toàn bộ điểm số */}
              <label className="flex items-start gap-3 p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl cursor-pointer hover:bg-rose-100/50 transition-colors">
                <input
                  type="checkbox"
                  checked={clearScoresOpt}
                  onChange={(e) => setClearScoresOpt(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <div className="font-bold text-rose-900">
                    Xóa sạch 100% Điểm thi đua & Vi phạm (Tuần 1 - 35)
                  </div>
                  <div className="text-rose-700 mt-0.5 leading-relaxed">
                    Xóa vĩnh viễn trên Firebase Firestore & Máy chủ: xóa cả điểm bảo lưu tuần 1-4 và toàn bộ biên bản nhập tuần 5-9; mở khóa lại tất cả các tuần, tháng, học kỳ.
                  </div>
                </div>
              </label>

              {!purgeOtherCampusesOnlyOpt && (
                <>
                  {/* Option 2: Xóa toàn bộ lớp học */}
                  <label className="flex items-start gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl cursor-pointer hover:bg-amber-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={clearClassesOpt}
                      onChange={(e) => setClearClassesOpt(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-amber-900">
                        Xóa toàn bộ Lớp học của tất cả phân hiệu (bao gồm cả Lê Hữu Lập)
                      </div>
                      <div className="text-amber-700 mt-0.5 leading-relaxed">
                        Xóa trắng toàn bộ danh sách lớp học để bắt đầu nhập lại từ file Excel.
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Xóa toàn bộ giáo viên */}
                  <label className="flex items-start gap-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-100/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={clearTeachersOpt}
                      onChange={(e) => setClearTeachersOpt(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-blue-900">
                        Xóa toàn bộ Giáo viên (chỉ giữ Quản trị viên Super Admin)
                      </div>
                      <div className="text-blue-700 mt-0.5 leading-relaxed">
                        Xóa trắng danh sách người dùng, chỉ giữ tài khoản Super Admin của thầy Lê Huy Hùng.
                      </div>
                    </div>
                  </label>
                </>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
                <span>
                  <strong>Bảo tồn:</strong> Cấu trúc 6 Phân hiệu, Tiêu chí thi đua và Cấu hình năm học luôn được giữ an toàn 100%.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearTestDataModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isClearing || (!clearScoresOpt && !purgeOtherCampusesOnlyOpt && !clearClassesOpt && !clearTeachersOpt)}
                onClick={handleClearTestData}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40"
              >
                {isClearing ? (
                  <span>Đang dọn dẹp trên Firebase...</span>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Xác Nhận & Làm Sạch Ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
