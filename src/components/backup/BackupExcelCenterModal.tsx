import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  Archive,
  Layers,
  Sparkles,
  Server,
  FileCheck,
  FileText,
  X,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { SystemFullBackupPayload } from '../../types';

interface BackupExcelCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupExcelCenterModal: React.FC<BackupExcelCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    classes,
    campuses,
    scoreLogs,
    selectedWeek,
    academicYearArchives,
    switchAcademicYear,
    createNewAcademicYear,
    deleteArchivedYear,
    exportOfflineStandbyWorkbook,
    exportCurrentRankingsExcel,
    exportCurrentScoreLogsExcel,
    exportCriteriaCatalogExcel,
    exportFullBackupPayload,
    restoreFullBackup,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'excel' | 'multiyear' | 'backup'>('excel');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Academic Year Form
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState('2027-2028');
  const [advanceGrades, setAdvanceGrades] = useState(true);
  const [archiveCurrent, setArchiveCurrent] = useState(true);
  const [resetScores, setResetScores] = useState(true);
  const [newYearNote, setNewYearNote] = useState('Khởi tạo năm học mới tự động chuyển tiếp khối');

  if (!isOpen) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createNewAcademicYear(newYearName, {
      advanceGrades,
      archiveCurrentYear: archiveCurrent,
      resetScores,
      note: newYearNote,
    });
    if (res.success) {
      showToast(res.message, 'success');
      setShowNewYearModal(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleSwitchYear = (targetYear: string) => {
    const res = switchAcademicYear(targetYear);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDownloadFullBackup = () => {
    try {
      const jsonStr = exportFullBackupPayload();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `SAO_LUU_TOAN_HE_THONG_THCS_LE_HUU_LAP_${settings.academicYear}_${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Đã xuất thành công tệp sao lưu dữ liệu toàn diện!', 'success');
    } catch {
      showToast('Lỗi khi xuất tệp sao lưu', 'error');
    }
  };

  const handleDownloadServerDb = () => {
    try {
      const dataStr = exportFullBackupPayload();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `server_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Đã tải tệp sao lưu dữ liệu thành công!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải bản sao lưu', 'error');
    }
  };

  const handleUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const payload: SystemFullBackupPayload = JSON.parse(content);
        if (
          window.confirm(
            `XÁC NHẬN PHỤC HỒI:\n\n• Phiên bản: ${payload.version || '2.0'}\n• Số lớp: ${payload.classes?.length || 0}\n• Số phân hiệu: ${payload.campuses?.length || 0}\n• Số bản ghi điểm: ${payload.scoreLogs?.length || 0}\n\nBạn có chắc chắn muốn nạp đè dữ liệu sao lưu này vào hệ thống?`
          )
        ) {
          const res = restoreFullBackup(payload);
          if (res.success) {
            showToast(res.message, 'success');
          } else {
            showToast(res.message, 'error');
          }
        }
      } catch {
        showToast('Tệp sao lưu bị hỏng hoặc không đúng định dạng JSON!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Trung Tâm Xuất Báo Cáo Excel & Sao Lưu Dự Phòng</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Hoạt động độc lập
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Đảm bảo Nhà trường luôn có dữ liệu đầy đủ đánh giá nề nếp thi đua trong mọi tình huống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast Alert */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab Headers */}
        <div className="px-6 pt-3 border-b border-slate-100 bg-white flex items-center gap-2">
          <button
            onClick={() => setActiveTab('excel')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'excel'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>1. Xuất Excel Báo Cáo & Bản Offline Dự Phòng</span>
          </button>
          <button
            onClick={() => setActiveTab('multiyear')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'multiyear'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar size={15} />
            <span>2. Quản Lý Đa Năm Học ({academicYearArchives.length} năm lưu trữ)</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Archive size={15} />
            <span>3. Sao Lưu & Phục Hồi Toàn Bộ Hệ Thống</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXCEL OFFLINE STANDBY & REPORTS */}
          {activeTab === 'excel' && (
            <div className="space-y-5">
              {/* Highlight Standby Excel Workbook */}
              <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-100 mb-1">
                      <Sparkles size={16} />
                      <span>Tính năng bảo hiểm tối cao cho Nhà trường</span>
                    </div>
                    <h4 className="text-lg font-black tracking-tight">
                      Sổ Chấm Điểm & Xếp Loại Nề Nếp Offline Dự Phòng (Tuần {selectedWeek})
                    </h4>
                    <p className="text-xs text-emerald-50 max-w-xl mt-1 leading-relaxed">
                      Tệp Excel độc lập chứa sẵn danh sách 59 lớp của 6 phân hiệu kèm <strong>dữ liệu điểm gốc, điểm thưởng, phạt, tổng điểm, thứ hạng và xếp loại đã được hệ thống tính toán chính xác 100%</strong>. Đảm bảo mở trên mọi phiên bản Microsoft Excel không bao giờ bị lỗi #VALUE!, tên lớp chuẩn văn bản không bị lỗi số khoa học.
                    </p>
                  </div>
                  <button
                    onClick={() => exportOfflineStandbyWorkbook(selectedWeek)}
                    className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                  >
                    <Download size={16} />
                    <span>Tải Bản Excel Dự Phòng (.xls)</span>
                  </button>
                </div>
              </div>

              {/* Grid of Other Excel Reports */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Danh Mục Báo Cáo Excel Phục Vụ Đánh Giá Toàn Diện:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Rankings */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                        <FileSpreadsheet size={18} />
                      </div>
                      <h5 className="font-bold text-slate-900 text-sm">Bảng Xếp Hạng Tuần {selectedWeek}</h5>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Toàn bộ 59 lớp, điểm chuẩn 100đ, tổng điểm cộng, điểm trừ, điểm tuần và xếp loại thi đua.
                      </p>
                    </div>
                    <button
                      onClick={() => exportCurrentRankingsExcel('week', 'Toàn trường')}
                      className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Xuất Bảng Xếp Hạng</span>
                    </button>
                  </div>

                  {/* Card 2: Detailed Logbook */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                        <FileCheck size={18} />
                      </div>
                      <h5 className="font-bold text-slate-900 text-sm">Sổ Nhật Ký Ghi Nhận Chi Tiết</h5>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Xuất toàn bộ {scoreLogs.length} bản ghi vi phạm và biểu dương (ngày, lớp, lỗi, điểm, người chấm).
                      </p>
                    </div>
                    <button
                      onClick={() => exportCurrentScoreLogsExcel()}
                      className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Xuất Sổ Nhật Ký ({scoreLogs.length})</span>
                    </button>
                  </div>

                  {/* Card 3: Criteria Catalog */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                        <FileText size={18} />
                      </div>
                      <h5 className="font-bold text-slate-900 text-sm">Quy Chuẩn 64 Tiêu Chí</h5>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Danh mục tiêu chuẩn thi đua chính thức của Nhà trường với mã tiêu chí, đơn vị và công thức.
                      </p>
                    </div>
                    <button
                      onClick={exportCriteriaCatalogExcel}
                      className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Xuất Danh Mục Tiêu Chí</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-YEAR MANAGEMENT */}
          {activeTab === 'multiyear' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <div>
                  <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">
                    Năm học đang hoạt động:
                  </div>
                  <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span>{settings.academicYear}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Đang sử dụng
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Quy mô hiện tại: {classes.length} lớp · {scoreLogs.length} bản ghi thi đua · {campuses.length} phân hiệu
                  </p>
                </div>

                <button
                  onClick={() => setShowNewYearModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <PlusCircle size={16} />
                  <span>Khởi Tạo Năm Học Mới</span>
                </button>
              </div>

              {/* Archived Years List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <History size={16} className="text-indigo-600" />
                  <span>Kho Lưu Trữ Lịch Sử Các Năm Học ({academicYearArchives.length}):</span>
                </h4>

                {academicYearArchives.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    Chưa có bản lưu trữ năm học nào. Khi bạn khởi tạo năm học mới, dữ liệu năm cũ sẽ tự động được lưu trữ tại đây để tra cứu vĩnh viễn.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {academicYearArchives.map((archive) => (
                      <div
                        key={archive.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{archive.year}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Lưu trữ ngày: {new Date(archive.archivedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div className="text-slate-500 mt-1">
                            {archive.totalClasses} lớp học · {archive.totalScoreLogs} bản ghi điểm · Người lưu: {archive.archivedBy}
                          </div>
                          {archive.note && <div className="text-slate-400 text-[11px] italic mt-0.5">{archive.note}</div>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleSwitchYear(archive.year)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Chuyển sang năm này
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Xóa bản lưu trữ năm học ${archive.year}?`)) {
                                deleteArchivedYear(archive.id);
                                showToast(`Đã xóa bản lưu trữ năm ${archive.year}`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa bản lưu trữ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FULL SYSTEM BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-5 text-xs text-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                    <Download size={18} className="text-indigo-600" />
                    <span>Sao Lưu Dữ Liệu Toàn Diện (.JSON)</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Xuất một tệp JSON duy nhất chứa 100% dữ liệu: 59 lớp, 6 phân hiệu, 64 tiêu chí, tất cả các tuần thi đua, tài khoản, nhật ký kiểm toán và các năm học đã lưu trữ.
                  </p>
                  <button
                    onClick={handleDownloadFullBackup}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download size={16} />
                    <span>Tải Tệp Sao Lưu Toàn Bộ Hệ Thống</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                    <Upload size={18} className="text-emerald-600" />
                    <span>Phục Hồi Dữ Liệu Từ Tệp Sao Lưu</span>
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Nạp lại dữ liệu từ tệp sao lưu JSON đã tải về trước đó. Hệ thống sẽ tự động kiểm tra tính tương thích và khôi phục an toàn.
                  </p>
                  <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer">
                    <Upload size={16} />
                    <span>Chọn Tệp JSON Để Phục Hồi</span>
                    <input type="file" accept=".json" onChange={handleUploadRestore} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Server-side DB Direct Backup */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <Server size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Bản Sao Lưu Máy Chủ Backend (server_db.json)</div>
                    <div className="text-slate-500 text-[11px]">
                      Tải trực tiếp cơ sở dữ liệu nhật ký kiểm toán và các tuần khóa được lưu trữ trên server.
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadServerDb}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer shrink-0"
                >
                  Tải server_db.json
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hệ thống hỗ trợ xuất bảng tính Microsoft Excel chuẩn (.xls) và tệp dữ liệu chuẩn JSON
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* SUB-MODAL: CREATE NEW ACADEMIC YEAR */}
      {showNewYearModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <span>Khởi Tạo Năm Học Mới</span>
              </h4>
              <button
                onClick={() => setShowNewYearModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Năm Học Mới:</label>
                <input
                  type="text"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  placeholder="Ví dụ: 2027-2028"
                  required
                />
              </div>

              <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={advanceGrades}
                    onChange={(e) => setAdvanceGrades(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Tự động chuyển tiếp khối (Khối 6 lên 7, 7 lên 8, 8 lên 9; Khối 9 tốt nghiệp và tuyển sinh Khối 6 mới)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={archiveCurrent}
                    onChange={(e) => setArchiveCurrent(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Tự động đóng gói và lưu trữ dữ liệu năm học {settings.academicYear} vào kho lịch sử</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={resetScores}
                    onChange={(e) => setResetScores(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Đặt lại điểm số thi đua về 100 điểm cho tuần 1 của năm học mới</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Năm Học:</label>
                <input
                  type="text"
                  value={newYearNote}
                  onChange={(e) => setNewYearNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ghi chú lưu vết..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewYearModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Khởi Tạo Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
