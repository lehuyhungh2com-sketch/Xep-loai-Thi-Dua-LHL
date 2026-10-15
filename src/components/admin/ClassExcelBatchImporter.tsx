import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Search,
  School,
  BookOpen,
} from 'lucide-react';
import {
  generateClassExcelTemplateContent,
  parseClassImportFileText,
  ClassImportValidationSummary,
  ClassImportRow,
} from '../../utils/academicCatalogEngine';
import { ClassItem } from '../../types';

interface ClassExcelBatchImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (count: number) => void;
}

export const ClassExcelBatchImporter: React.FC<ClassExcelBatchImporterProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { campuses, classes, batchImportClasses, userRole } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [validationResult, setValidationResult] = useState<ClassImportValidationSummary | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'valid_only' | 'error_only'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const isAdmin = userRole === 'super_admin';

  // Handle template download
  const handleDownloadTemplate = () => {
    const csvContent = generateClassExcelTemplateContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Mau_Danh_Sach_Lop_THCS_Le_Huu_Lap.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage('');
    setSuccessMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        const result = parseClassImportFileText(content, campuses, classes);
        setValidationResult(result);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Không thể đọc file. Vui lòng thử lại với file .csv hoặc .txt UTF-8.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Handle direct paste/input change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    if (text.trim()) {
      const result = parseClassImportFileText(text, campuses, classes);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  };

  // Execute import of valid classes
  const handleExecuteImport = () => {
    if (!validationResult || validationResult.validRows === 0) {
      setErrorMessage('Không có dòng dữ liệu hợp lệ nào để nhập.');
      return;
    }

    if (!isAdmin) {
      setErrorMessage('Chỉ Quản trị viên (Super Admin) mới có quyền nhập danh sách lớp.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const validRows = validationResult.rows.filter((r) => r.isValid);
    const classesToCreate: ClassItem[] = validRows.map((r, idx) => ({
      id: `cls_${r.matchedCampus?.code || 'c'}_${r.code.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}_${idx}`,
      code: r.code,
      name: r.name,
      grade: r.grade as 6 | 7 | 8 | 9,
      campusId: r.matchedCampus ? r.matchedCampus.id : campuses[0].id,
      classType: r.classType,
      homeroomTeacher: r.homeroomTeacher,
      monitorName: r.monitorName || 'Chưa cập nhật',
      studentCount: r.studentCount || 40,
      roomNumber: r.roomNumber || '',
      status: r.status,
      notes: r.notes || '',
      academicYear: '2026-2027',
    }));

    const result = batchImportClasses(classesToCreate);
    setIsProcessing(false);

    if (result.success) {
      setSuccessMessage(`Đã nhập thành công ${result.count} lớp vào hệ thống!`);
      if (onImportSuccess) {
        onImportSuccess(result.count);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setErrorMessage(result.message);
    }
  };

  // Filter preview rows
  const displayRows = (validationResult?.rows || []).filter((row) => {
    if (filterMode === 'valid_only' && !row.isValid) return false;
    if (filterMode === 'error_only' && row.isValid) return false;
    if (searchFilter) {
      const s = searchFilter.toLowerCase();
      const match =
        row.code.toLowerCase().includes(s) ||
        row.name.toLowerCase().includes(s) ||
        row.campusName.toLowerCase().includes(s) ||
        row.homeroomTeacher.toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">NHẬP DANH SÁCH LỚP TỪ EXCEL</h3>
              <p className="text-xs text-blue-100">
                Tải lên file danh sách lớp học theo mẫu quy chuẩn Trường THCS Lê Hữu Lập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Download template + Upload File */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>TẢI FILE MẪU EXCEL</span>
              </button>
              <span className="text-xs text-slate-500">
                (Định dạng CSV UTF-8 hỗ trợ tiếng Việt có dấu, mở tốt trên Excel)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>CHỌN FILE EXCEL/CSV ĐỂ TẢI LÊN</span>
              </button>
            </div>
          </div>

          {fileName && (
            <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
              <span className="font-medium text-blue-700">File đã chọn: {fileName}</span>
              <button
                onClick={() => {
                  setFileName('');
                  setRawText('');
                  setValidationResult(null);
                }}
                className="text-rose-600 hover:underline"
              >
                Hủy chọn
              </button>
            </div>
          )}

          {/* Quy định nhập liệu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-blue-50/70 p-3 rounded-lg border border-blue-100 text-slate-700">
            <div>
              <span className="font-semibold text-blue-900">1. Cột dữ liệu bắt buộc:</span> Mã lớp, Tên lớp, Khối (6, 7, 8, 9), Phân hiệu, GVCN.
            </div>
            <div>
              <span className="font-semibold text-blue-900">2. Quy định loại lớp:</span> A1, A2, A3 chỉ áp dụng cho Trường chính Lê Hữu Lập.
            </div>
            <div>
              <span className="font-semibold text-blue-900">3. Kiểm tra trùng lặp:</span> Hệ thống tự động chặn các mã lớp đã tồn tại.
            </div>
          </div>
        </div>

        {/* Validation Summary Cards */}
        {validationResult && (
          <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-sm">
              <div>
                <span className="text-slate-500">Tổng số dòng: </span>
                <span className="font-bold text-slate-800">{validationResult.totalRows}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hợp lệ: </span>
                <span className="font-bold">{validationResult.validRows}</span>
              </div>
              <div className="flex items-center space-x-1.5 text-rose-700">
                <AlertCircle className="w-4 h-4" />
                <span>Lỗi: </span>
                <span className="font-bold">{validationResult.errorRows}</span>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm lớp..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 text-xs rounded font-medium ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({validationResult.totalRows})
              </button>
              <button
                onClick={() => setFilterMode('valid_only')}
                className={`px-2.5 py-1 text-xs rounded font-medium ${
                  filterMode === 'valid_only'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Hợp lệ ({validationResult.validRows})
              </button>
              <button
                onClick={() => setFilterMode('error_only')}
                className={`px-2.5 py-1 text-xs rounded font-medium ${
                  filterMode === 'error_only'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Có lỗi ({validationResult.errorRows})
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-sm text-rose-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-sm text-emerald-700">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Preview Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {!validationResult ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50">
              <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-700">Chưa có dữ liệu tải lên</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Vui lòng nhấn "TẢI FILE MẪU EXCEL" để xem cấu trúc chuẩn, sau đó tải file lên để hệ thống tự động kiểm tra cú pháp và tính toàn vẹn.
              </p>
              <div className="mt-4 flex justify-center space-x-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
                >
                  Tải mẫu Excel
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Chọn file từ máy
                </button>
              </div>

              {/* Or paste directly */}
              <div className="mt-6 max-w-lg mx-auto text-left">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Hoặc dán trực tiếp nội dung CSV / Excel vào đây:
                </label>
                <textarea
                  value={rawText}
                  onChange={handleTextChange}
                  rows={3}
                  placeholder="Dán nội dung các dòng dữ liệu vào đây..."
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Mã lớp</th>
                    <th className="py-2.5 px-3">Tên lớp</th>
                    <th className="py-2.5 px-3 w-16 text-center">Khối</th>
                    <th className="py-2.5 px-3">Phân hiệu</th>
                    <th className="py-2.5 px-3">Loại lớp</th>
                    <th className="py-2.5 px-3">GVCN</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Kết quả kiểm tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Không có dòng nào khớp với điều kiện lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 transition-colors ${
                          !row.isValid ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-500">{row.stt}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.code}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                            K.{row.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {row.matchedCampus ? (
                            <span className="inline-flex items-center text-slate-800 font-medium">
                              <School className="w-3 h-3 mr-1 text-slate-400" />
                              {row.matchedCampus.name}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium">{row.campusName} (Không tìm thấy)</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.classType !== 'standard' ? (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Lớp {row.classType}
                            </span>
                          ) : (
                            <span className="text-slate-500">Đại trà</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">{row.homeroomTeacher}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              row.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {row.status === 'active' ? 'Hoạt động' : 'Không HĐ'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center text-emerald-700 font-medium space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hợp lệ</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5 text-rose-700 text-[11px]">
                              {row.errors.map((err, eIdx) => (
                                <div key={eIdx} className="flex items-start space-x-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-500 mt-0.5 flex-shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {validationResult && (
              <span>
                Sẵn sàng nhập: <strong>{validationResult.validRows}</strong> lớp hợp lệ vào năm học 2026-2027.
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold rounded-lg transition"
            >
              Đóng
            </button>
            {validationResult && validationResult.validRows > 0 && (
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing || !isAdmin}
                className="flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nhập...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>XÁC NHẬN NHẬP {validationResult.validRows} LỚP VÀO HỆ THỐNG</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
