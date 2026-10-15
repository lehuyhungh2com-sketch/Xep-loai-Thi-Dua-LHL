import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  FileText,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  Campus,
  ClassItem,
  Criteria,
  SchoolSettings,
  ScoreLog,
  User,
  CalendarWeekConfig,
} from '../../types';
import {
  parseWeeklyScoringExcel,
  ExcelImportValidationResult,
  ValidatedImportRow,
  InvalidImportRow,
} from '../../utils/excelTemplateManager';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeek: number;
  selectedCampusId: string;
  currentCampus: Campus;
  campuses: Campus[];
  classes: ClassItem[];
  criteria: Criteria[];
  scoreLogs: ScoreLog[];
  settings: SchoolSettings;
  calendarWeeks: CalendarWeekConfig[];
  currentUser: User;
  previewCriteriaCalculation: (
    criteriaId: string,
    quantity: number,
    classId: string
  ) => {
    pointsPerUnit: number;
    totalPoints: number;
    appliedCap?: number;
    calculationDetail: string;
    isDisciplinary?: boolean;
    period: any;
    campus?: any;
  };
  isWeekLocked: (week: number) => boolean;
  bulkAddScoreLogs: (logs: Omit<ScoreLog, 'id'>[]) => { success: boolean; count: number; message?: string };
  updateScoreLog: (id: string, log: Partial<ScoreLog>, reason?: string) => { success: boolean; message?: string };
  logAudit: (entry: any) => void;
  onSuccess: (message: string) => void;
  onDownloadTemplate: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  selectedWeek,
  selectedCampusId,
  currentCampus,
  campuses,
  classes,
  criteria,
  scoreLogs,
  settings,
  calendarWeeks,
  currentUser,
  previewCriteriaCalculation,
  isWeekLocked,
  bulkAddScoreLogs,
  updateScoreLog,
  logAudit,
  onSuccess,
  onDownloadTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ExcelImportValidationResult | null>(null);
  const [rowFilter, setRowFilter] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentIsLocked = isWeekLocked(selectedWeek);

  // Handle file selection (.xlsx, .xls, .csv)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const result = parseWeeklyScoringExcel(buffer, {
          currentWeek: selectedWeek,
          selectedCampusId,
          academicYear: settings.academicYear,
          campuses,
          classes,
          criteria,
          existingLogs: scoreLogs,
          previewCriteriaCalculation,
          currentUser,
          isWeekLocked,
        });

        setValidationResult(result);
        if (result.invalidRows.length > 0 && result.validRows.length === 0) {
          setRowFilter('invalid');
        } else if (result.duplicateRows.length > 0 && result.validRows.length === result.duplicateRows.length) {
          setRowFilter('duplicate');
        } else {
          setRowFilter('all');
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Có lỗi khi đọc nội dung tệp Excel. Vui lòng kiểm tra lại định dạng tệp!');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle pasted text parsing
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      alert('Vui lòng dán dữ liệu từ bảng tính vào ô nhập liệu!');
      return;
    }

    setIsProcessing(true);
    setFileName('Dữ liệu dán trực tiếp từ bảng tính');

    try {
      const result = parseWeeklyScoringExcel(pastedText, {
        currentWeek: selectedWeek,
        selectedCampusId,
        academicYear: settings.academicYear,
        campuses,
        classes,
        criteria,
        existingLogs: scoreLogs,
        previewCriteriaCalculation,
        currentUser,
        isWeekLocked,
      });

      setValidationResult(result);
      if (result.invalidRows.length > 0 && result.validRows.length === 0) {
        setRowFilter('invalid');
      } else {
        setRowFilter('all');
      }
    } catch (err) {
      console.error('Pasted text parse error:', err);
      alert('Có lỗi khi phân tích dữ liệu bảng tính dán vào!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection of a valid row
  const toggleSelectRow = (index: number) => {
    if (!validationResult) return;
    setValidationResult({
      ...validationResult,
      validRows: validationResult.validRows.map((r) =>
        r.index === index ? { ...r, selectedToImport: !r.selectedToImport } : r
      ),
    });
  };

  // Select all or deselect all valid rows
  const toggleSelectAll = (select: boolean) => {
    if (!validationResult) return;
    setValidationResult({
      ...validationResult,
      validRows: validationResult.validRows.map((r) => ({ ...r, selectedToImport: select })),
    });
  };

  // Change duplicate action for a specific row
  const changeDuplicateAction = (
    index: number,
    action: 'merge' | 'replace' | 'add_new' | 'skip'
  ) => {
    if (!validationResult) return;
    setValidationResult({
      ...validationResult,
      validRows: validationResult.validRows.map((r) =>
        r.index === index ? { ...r, duplicateAction: action } : r
      ),
    });
  };

  // Batch set duplicate action for all duplicates
  const setAllDuplicatesAction = (action: 'merge' | 'replace' | 'add_new' | 'skip') => {
    if (!validationResult) return;
    setValidationResult({
      ...validationResult,
      validRows: validationResult.validRows.map((r) =>
        r.status === 'duplicate' ? { ...r, duplicateAction: action } : r
      ),
    });
  };

  // Statistics
  const selectedValidRows = useMemo(() => {
    if (!validationResult) return [];
    return validationResult.validRows.filter((r) => r.selectedToImport);
  }, [validationResult]);

  const totalProjectedBonus = useMemo(() => {
    return selectedValidRows
      .filter((r) => r.criteriaType === 'bonus' && r.duplicateAction !== 'skip')
      .reduce((sum, r) => sum + Math.abs(r.totalPoints), 0);
  }, [selectedValidRows]);

  const totalProjectedPenalty = useMemo(() => {
    return selectedValidRows
      .filter((r) => r.criteriaType === 'penalty' && r.duplicateAction !== 'skip')
      .reduce((sum, r) => sum + Math.abs(r.totalPoints), 0);
  }, [selectedValidRows]);

  // Execute Import & Database update (Requirements 12 - 17)
  const handleConfirmImport = async () => {
    if (!validationResult) return;

    const targetWeek = validationResult.fileMetadata.week || selectedWeek;
    if (isWeekLocked(targetWeek)) {
      alert(`Tuần ${targetWeek} đã được Ban Giám Hiệu khóa sổ. Không thể nạp dữ liệu!`);
      return;
    }

    if (selectedValidRows.length === 0) {
      alert('Không có bản ghi hợp lệ nào được chọn để nạp!');
      return;
    }

    setIsSubmitting(true);

    try {
      const itemsToAdd: Omit<ScoreLog, 'id'>[] = [];
      let mergedCount = 0;
      let replacedCount = 0;
      let skippedCount = 0;

      for (const row of selectedValidRows) {
        if (row.status === 'duplicate' && row.duplicateLog) {
          if (row.duplicateAction === 'skip') {
            skippedCount++;
            continue;
          }

          if (row.duplicateAction === 'replace') {
            // Replace existing log with Excel data
            const calc = previewCriteriaCalculation(row.criteriaId, row.quantity, row.classId);
            updateScoreLog(
              row.duplicateLog.id,
              {
                quantity: row.quantity,
                totalPoints: calc.totalPoints,
                pointsPerUnit: calc.pointsPerUnit,
                appliedCap: calc.appliedCap,
                calculationDetail: calc.calculationDetail,
                isDisciplinary: calc.isDisciplinary,
                date: row.date,
                inspectorName: row.inspectorName,
                note: row.note || `Thay thế từ Excel (${row.quantity} lần)`,
              },
              `Cập nhật thay thế từ tệp Excel (${fileName})`
            );
            replacedCount++;
            continue;
          }

          if (row.duplicateAction === 'merge') {
            // Combine quantities
            const oldQty = row.duplicateLog.quantity || 0;
            const combinedQty = oldQty + row.quantity;
            const calc = previewCriteriaCalculation(row.criteriaId, combinedQty, row.classId);

            const combinedNote = row.duplicateLog.note
              ? `${row.duplicateLog.note} + Thêm ${row.quantity} lần từ Excel`
              : row.note || `Cộng dồn thêm ${row.quantity} lần từ Excel`;

            updateScoreLog(
              row.duplicateLog.id,
              {
                quantity: combinedQty,
                totalPoints: calc.totalPoints,
                pointsPerUnit: calc.pointsPerUnit,
                appliedCap: calc.appliedCap,
                calculationDetail: calc.calculationDetail,
                isDisciplinary: calc.isDisciplinary,
                note: combinedNote,
              },
              `Cộng dồn số lượng từ tệp Excel (${fileName}): ${oldQty} + ${row.quantity} = ${combinedQty}`
            );
            mergedCount++;
            continue;
          }

          // If 'add_new', fall through to itemsToAdd
        }

        // Add as a new ScoreLog
        const targetClass = classes.find((c) => c.id === row.classId);
        const targetCrit = criteria.find((c) => c.id === row.criteriaId);

        itemsToAdd.push({
          week: targetWeek,
          period: targetCrit?.period || 'week',
          classId: row.classId,
          className: row.className,
          campusId: row.campusId,
          campusName: row.campusName,
          campusType: currentCampus.type || 'sub',
          grade: row.grade,
          criteriaId: row.criteriaId,
          criteriaCode: row.criteriaCode,
          criteriaName: row.criteriaName,
          category: (targetCrit?.category || row.criteriaCategory) as any,
          type: row.criteriaType,
          pointsPerUnit: row.pointsPerUnit,
          quantity: row.quantity,
          totalPoints: row.totalPoints,
          appliedCap: row.appliedCap,
          calculationDetail: row.calculationDetail,
          note: row.note || 'Nhập từ file Excel',
          date: row.date,
          recordedBy: `${currentUser.name} (Import Excel)`,
          inspectorName: row.inspectorName,
          isDisciplinary: row.isDisciplinary,
        });
      }

      let addedCount = 0;
      if (itemsToAdd.length > 0) {
        const res = bulkAddScoreLogs(itemsToAdd);
        if (!res.success) {
          alert(res.message || 'Lỗi khi nạp dữ liệu đồng loạt');
          setIsSubmitting(false);
          return;
        }
        addedCount = res.count;
      }

      // Record detailed Audit Log (Requirement 17)
      logAudit({
        action: 'NHAP_EXCEL_DIEM',
        category: 'diem_thi_dua',
        entityType: 'score_log',
        entityId: `excel_import_${Date.now()}`,
        campusId: selectedCampusId,
        campusName: currentCampus.name,
        beforeData: null,
        afterData: {
          addedCount,
          mergedCount,
          replacedCount,
          skippedCount,
          totalProcessed: addedCount + mergedCount + replacedCount,
          sourceFile: fileName,
          targetWeek,
        },
        details: `Nạp dữ liệu thi đua từ tệp Excel "${fileName}" cho Phân hiệu ${currentCampus.name} (Tuần ${targetWeek}): ${addedCount} bản ghi thêm mới, ${mergedCount} cộng dồn, ${replacedCount} thay thế${skippedCount > 0 ? `, ${skippedCount} bỏ qua` : ''}.`,
      });

      onSuccess(
        `✅ Nạp thành công: ${addedCount} biên bản mới, ${mergedCount} cộng dồn, ${replacedCount} thay thế cho ${currentCampus.name} (Tuần ${targetWeek})!`
      );
      onClose();
    } catch (err) {
      console.error('Import execution error:', err);
      alert('Có lỗi xảy ra trong quá trình nạp dữ liệu. Vui lòng kiểm tra lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 animate-scaleUp overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  NHẬP ĐIỂM THI ĐUA TỪ EXCEL (TUẦN {selectedWeek})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                  {currentCampus.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hệ thống tự động kiểm tra cú pháp, tra cứu mức điểm quy chế và ngăn chặn nhập trùng lặp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Tải tệp Excel mẫu chuẩn của Tuần này"
            >
              <Download size={14} className="text-emerald-700" />
              <span>Tải Excel mẫu Tuần {selectedWeek}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 font-sans">
          {/* Locked Week Alert */}
          {currentIsLocked && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-900">
              <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-black">Tuần {selectedWeek} đã được Ban Giám Hiệu khóa sổ thi đua!</strong>
                <p className="mt-1 leading-relaxed text-rose-800">
                  Dữ liệu của tuần này đã được đóng băng. Bạn có thể xem kiểm tra trước nội dung tệp Excel, nhưng không thể nạp điểm vào hệ thống trừ khi quản trị viên mở khóa sổ.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Upload / Input Mode Switcher */}
          {!validationResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Upload size={14} />
                  <span>Cách 1: Chọn file Excel (.xlsx, .xls, .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'paste'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText size={14} />
                  <span>Cách 2: Dán trực tiếp từ bảng tính</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer space-y-3"
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                    <FileSpreadsheet size={28} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                      Nhấn vào đây để chọn tệp Excel từ máy tính của bạn
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      Hỗ trợ tệp <strong>.xlsx</strong>, <strong>.xls</strong> hoặc <strong>.csv</strong> tải từ mẫu của hệ thống.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50">
                      <Upload size={14} className="text-indigo-600" />
                      <span>Chọn file từ thư mục máy tính...</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Dán toàn bộ các cột từ bảng tính Excel vào ô dưới đây:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Định dạng tab, dấu phẩy hoặc dấu chấm phẩy
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Ví dụ dán:&#10;Mã lớp&#9;Mã tiêu chí&#9;Số lần&#9;Ghi chú&#10;6A1&#9;TP02&#9;2&#9;Không sơ vin đầu giờ&#10;6A1&#9;HT01&#9;8&#9;Điểm tốt 9-10"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-indigo-500 leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      disabled={!pastedText.trim() || isProcessing}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                      <span>Phân tích dữ liệu vừa dán</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Validation Results & Preview */}
          {validationResult && (
            <div className="space-y-5">
              {/* File Info & Change File Action */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>Tệp đã nạp: {fileName}</span>
                      {validationResult.fileMetadata.hasSystemMetadataSheet && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          ✓ Mẫu chuẩn hệ thống
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-3">
                      <span>Năm học: <strong>{validationResult.fileMetadata.academicYear || settings.academicYear}</strong></span>
                      <span>•</span>
                      <span>Tuần: <strong>Tuần {validationResult.fileMetadata.week || selectedWeek}</strong></span>
                      <span>•</span>
                      <span>Phân hiệu: <strong>{validationResult.fileMetadata.campusName || currentCampus.name}</strong></span>
                      <span>•</span>
                      <span>Tổng số dòng: <strong>{validationResult.totalRowsFound} dòng</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setValidationResult(null);
                    setFileName('');
                    setPastedText('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Chọn tệp khác
                </button>
              </div>

              {/* Mismatch Warning Banners */}
              {validationResult.mismatchWarnings.length > 0 && (
                <div className="space-y-2">
                  {validationResult.mismatchWarnings.map((warn, i) => (
                    <div
                      key={i}
                      className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5"
                    >
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-relaxed">{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION: Invalid Rows (Requirement 13) */}
              {validationResult.invalidRows.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-900 font-black text-xs sm:text-sm">
                      <XCircle size={18} className="text-rose-600 shrink-0" />
                      <span>
                        Phát hiện {validationResult.invalidRows.length} dòng bị lỗi dữ liệu (Không thể nạp vào hệ thống):
                      </span>
                    </div>
                    <span className="text-[11px] font-bold bg-white text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200">
                      Bắt buộc kiểm tra
                    </span>
                  </div>

                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Theo quy chuẩn an toàn, các dòng dưới đây sẽ bị bỏ qua hoặc bạn có thể chỉnh sửa tệp Excel rồi tải lại:
                  </p>

                  <div className="border border-rose-200 rounded-xl overflow-x-auto bg-white max-h-48">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-rose-100/70 text-rose-900 font-extrabold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-16">Dòng</th>
                          <th className="py-2 px-3 w-28">Lớp đã nhập</th>
                          <th className="py-2 px-3 w-36">Tiêu chí đã nhập</th>
                          <th className="py-2 px-3 w-20 text-center">Số lượng</th>
                          <th className="py-2 px-3">Lý do lỗi</th>
                          <th className="py-2 px-3">Cách khắc phục</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {validationResult.invalidRows.map((inv) => (
                          <tr key={inv.index} className="hover:bg-rose-50/50">
                            <td className="py-2 px-3 font-bold text-slate-500">Dòng {inv.rowNumber}</td>
                            <td className="py-2 px-3 font-bold text-rose-900">{inv.rawClass}</td>
                            <td className="py-2 px-3 text-slate-700">{inv.rawCriteria}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                              {inv.rawValue}
                            </td>
                            <td className="py-2 px-3 text-rose-800 font-semibold">{inv.reason}</td>
                            <td className="py-2 px-3 text-slate-600 italic text-[11px]">{inv.howToFix}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION: Duplicate Handling Options (Requirement 14) */}
              {validationResult.duplicateRows.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                      <span>
                        Phát hiện {validationResult.duplicateRows.length} bản ghi đã có dữ liệu thi đua trong tuần:
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <span>Chọn nhanh cho tất cả:</span>
                      <button
                        type="button"
                        onClick={() => setAllDuplicatesAction('merge')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 cursor-pointer shadow-2xs"
                      >
                        Cộng dồn số lượng
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllDuplicatesAction('replace')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-blue-900 cursor-pointer shadow-2xs"
                      >
                        Ghi đè thay thế
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllDuplicatesAction('skip')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Hệ thống bảo vệ tuyệt đối không cộng trùng lặp ngầm. Bạn có thể chọn cách thức xử lý riêng cho từng bản ghi tại danh sách bên dưới.
                  </p>
                </div>
              )}

              {/* SECTION: Valid Rows Preview Table */}
              <div className="space-y-3">
                {/* Stats & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Xem theo danh mục:</span>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs">
                      <button
                        type="button"
                        onClick={() => setRowFilter('all')}
                        className={`px-3 py-1 font-bold cursor-pointer transition-colors ${
                          rowFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Tất cả ({validationResult.validRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowFilter('valid')}
                        className={`px-3 py-1 font-bold cursor-pointer transition-colors ${
                          rowFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Mới ({validationResult.validRows.filter((r) => r.status === 'valid').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRowFilter('duplicate')}
                        className={`px-3 py-1 font-bold cursor-pointer transition-colors ${
                          rowFilter === 'duplicate' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Trùng lặp ({validationResult.duplicateRows.length})
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
                    <span className="text-emerald-700">Thưởng dự kiến: +{totalProjectedBonus}đ</span>
                    <span>•</span>
                    <span className="text-rose-700">Phạt dự kiến: -{totalProjectedPenalty}đ</span>
                    <span>•</span>
                    <span className="text-indigo-700">Đã chọn nạp: {selectedValidRows.length} dòng</span>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedValidRows.length === validationResult.validRows.length && validationResult.validRows.length > 0}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="rounded text-indigo-600 cursor-pointer"
                            title="Chọn tất cả / Bỏ chọn tất cả"
                          />
                        </th>
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-3 w-28">Lớp</th>
                        <th className="py-2.5 px-3">Tiêu chí thi đua</th>
                        <th className="py-2.5 px-3 w-20 text-center">Số lần</th>
                        <th className="py-2.5 px-3 w-24 text-right">Điểm tính</th>
                        <th className="py-2.5 px-3 w-48">Trạng thái & Xử lý</th>
                        <th className="py-2.5 px-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.validRows
                        .filter((r) => {
                          if (rowFilter === 'valid') return r.status === 'valid';
                          if (rowFilter === 'duplicate') return r.status === 'duplicate';
                          return true;
                        })
                        .map((row) => (
                          <tr
                            key={row.index}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              !row.selectedToImport
                                ? 'opacity-40 bg-slate-50'
                                : row.status === 'duplicate'
                                ? 'bg-amber-50/40'
                                : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.selectedToImport}
                                onChange={() => toggleSelectRow(row.index)}
                                className="rounded text-indigo-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500 font-mono">
                              {row.index}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-extrabold text-slate-900">
                                Lớp {row.className}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Khối {row.grade}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                                  {row.criteriaCode}
                                </span>
                                <span>{row.criteriaName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500">
                                  Nhóm: {row.criteriaCategory}
                                </span>
                                {row.tableSource === 'table_a' && (
                                  <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                                    Bảng A (Vi phạm)
                                  </span>
                                )}
                                {row.tableSource === 'table_b' && (
                                  <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                                    Bảng B (Thành tích)
                                  </span>
                                )}
                                {row.tableSource === 'matrix' && (
                                  <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                                    Ma trận
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-black text-sm">
                              {row.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-black">
                              <span
                                className={`text-xs ${
                                  row.criteriaType === 'bonus' ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {row.totalPoints > 0 ? `+${row.totalPoints}` : `${row.totalPoints}`}đ
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {row.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 size={12} /> Hợp lệ (Mới)
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                                    <AlertTriangle size={11} /> Đã có {row.duplicateLog?.quantity || 1} lần
                                  </span>
                                  <select
                                    value={row.duplicateAction}
                                    onChange={(e) =>
                                      changeDuplicateAction(row.index, e.target.value as any)
                                    }
                                    className="block w-full text-[11px] font-bold bg-white border border-amber-300 rounded-md px-1.5 py-0.5 text-slate-800 cursor-pointer outline-none"
                                  >
                                    <option value="merge">Cộng dồn (+{row.quantity})</option>
                                    <option value="replace">Ghi đè ({row.quantity})</option>
                                    <option value="add_new">Thêm mới độc lập</option>
                                    <option value="skip">Bỏ qua dòng này</option>
                                  </select>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                              {row.note || '---'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {validationResult ? (
              <span>
                Đã chọn <strong>{selectedValidRows.length}</strong> / {validationResult.validRows.length} bản ghi hợp lệ.
              </span>
            ) : (
              <span>Tải file Excel để hệ thống tự động kiểm tra và phân tích trước khi nạp.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>

            {validationResult && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedValidRows.length === 0 || currentIsLocked || isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-xs transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>Xác nhận nạp {selectedValidRows.length} bản ghi vào hệ thống</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
