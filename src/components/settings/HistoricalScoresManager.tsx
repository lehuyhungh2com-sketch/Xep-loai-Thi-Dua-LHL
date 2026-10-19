import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  History,
  Calendar,
  Save,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ClipboardPaste,
  Sparkles,
  RotateCcw,
  Search,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  X,
  FileText,
} from 'lucide-react';
import { canManageHistoricalScores } from '../../utils/rbac';
import { getWeekDateRange } from '../../utils/timeEngine';

export const HistoricalScoresManager: React.FC = () => {
  const {
    classes,
    campuses,
    settings,
    currentUser,
    maxWeeks,
    isWeekLocked,
    getClassWeeklyScore,
    historicalWeeklyScores,
    saveHistoricalScores,
    clearHistoricalScores,
  } = useApp();

  const canManage = canManageHistoricalScores(currentUser);

  // Dynamic week selection (From Week 1 to maxWeeks, default to a previous week or current week)
  const defaultWeek = useMemo(() => {
    const cur = settings.current_active_week || settings.currentWeek || 7;
    return cur > 1 ? cur - 1 : 1;
  }, [settings.current_active_week, settings.currentWeek]);

  const [selectedWeek, setSelectedWeek] = useState<number>(defaultWeek);
  const weekRange = useMemo(
    () => getWeekDateRange(selectedWeek, settings.start_date_of_week_1 || '2026-08-31'),
    [selectedWeek, settings.start_date_of_week_1]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampus, setFilterCampus] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');
  const [autoLockWeek, setAutoLockWeek] = useState<boolean>(true);

  // Excel paste modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteMode, setPasteMode] = useState<'single_column' | 'name_and_score'>('single_column');

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local state for class scores: Record<classId, { score: string; note: string }>
  // Using string for score to allow seamless typing and empty states without NaN issues
  const [scoresInput, setScoresInput] = useState<Record<string, { score: string; note: string }>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const prevSelectedWeekRef = useRef(selectedWeek);
  const getClassWeeklyScoreRef = useRef(getClassWeeklyScore);
  useEffect(() => {
    getClassWeeklyScoreRef.current = getClassWeeklyScore;
  });

  // Initialize or update scores input whenever selectedWeek changes or historicalWeeklyScores updates
  useEffect(() => {
    const weekChanged = prevSelectedWeekRef.current !== selectedWeek;
    if (weekChanged) {
      prevSelectedWeekRef.current = selectedWeek;
    }

    // CRITICAL FIX: Khi người dùng đang nhập liệu (isDirty === true) hoặc đang lưu (isSaving === true),
    // TUYỆT ĐỐI KHÔNG reset hay đè dữ liệu đang gõ bằng polling từ Database!
    if (!weekChanged && (isDirty || isSaving)) {
      return;
    }

    const weekNum = Number(selectedWeek);
    const existingWeekData = historicalWeeklyScores[weekNum] || (historicalWeeklyScores as any)[String(weekNum)];
    const initialMap: Record<string, { score: string; note: string }> = {};

    classes.forEach((cls) => {
      if (existingWeekData && existingWeekData[cls.id] !== undefined) {
        const item = existingWeekData[cls.id];
        let val: any = 100;
        let note = '';
        if (typeof item === 'number') {
          val = item;
        } else if (typeof item === 'string') {
          val = item;
        } else if (item && typeof item === 'object') {
          val = (item as any).finalScore ?? (item as any).score ?? 100;
          note = item.note || '';
        }
        initialMap[cls.id] = {
          score: String(val),
          note,
        };
      } else {
        // If no historical score exists, provide reference score (from logs) or default 100
        const refScore = getClassWeeklyScoreRef.current(cls.id, selectedWeek);
        initialMap[cls.id] = {
          score: String(refScore?.finalScore ?? 100),
          note: '',
        };
      }
    });

    setScoresInput(initialMap);
    setIsDirty(false);
  }, [selectedWeek, historicalWeeklyScores, classes]);

  // Check if current week has saved historical data
  const hasSavedHistoricalData = useMemo(() => {
    const weekData = historicalWeeklyScores[selectedWeek] || (historicalWeeklyScores as any)[String(selectedWeek)];
    return !!(weekData && Object.keys(weekData).length > 0);
  }, [historicalWeeklyScores, selectedWeek]);

  const historicalInfo = useMemo(() => {
    if (!hasSavedHistoricalData) return null;
    const weekData = historicalWeeklyScores[selectedWeek] || (historicalWeeklyScores as any)[String(selectedWeek)];
    if (!weekData) return null;
    const firstKey = Object.keys(weekData)[0];
    const sample = weekData[firstKey];
    return {
      classesCount: Object.keys(weekData).length,
      updatedBy: (sample as any)?.updatedBy || 'Quản trị viên / BGH',
      updatedAt: (sample as any)?.updatedAt || '',
    };
  }, [hasSavedHistoricalData, historicalWeeklyScores, selectedWeek]);

  const weekLocked = isWeekLocked(selectedWeek);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      if (filterCampus !== 'all' && cls.campusId !== filterCampus) return false;
      if (filterGrade !== 'all' && cls.grade !== filterGrade) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const campus = campuses.find((c) => c.id === cls.campusId);
        const matchName = cls.name.toLowerCase().includes(q);
        const matchTeacher = (cls.homeroomTeacher || '').toLowerCase().includes(q);
        const matchCampus = (campus?.name || '').toLowerCase().includes(q);
        if (!matchName && !matchTeacher && !matchCampus) return false;
      }
      return true;
    });
  }, [classes, filterCampus, filterGrade, searchQuery, campuses]);

  // Statistics across all classes for current inputs
  const currentStats = useMemo(() => {
    const scores = classes.map((c) => {
      const val = parseFloat(scoresInput[c.id]?.score);
      return isNaN(val) ? 100 : val;
    });

    const total = scores.reduce((sum, s) => sum + s, 0);
    const avg = classes.length > 0 ? (total / classes.length).toFixed(2) : '100.00';
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const validCount = classes.filter((c) => {
      const val = parseFloat(scoresInput[c.id]?.score);
      return !isNaN(val);
    }).length;

    return { avg, max, min, validCount };
  }, [classes, scoresInput]);

  // Handle single class input change
  const handleScoreChange = useCallback((classId: string, value: string) => {
    setScoresInput((prev) => ({
      ...prev,
      [classId]: {
        score: value,
        note: prev[classId]?.note || '',
      },
    }));
    setIsDirty(true);
  }, []);

  const handleNoteChange = useCallback((classId: string, value: string) => {
    setScoresInput((prev) => ({
      ...prev,
      [classId]: {
        score: prev[classId]?.score || '100',
        note: value,
      },
    }));
    setIsDirty(true);
  }, []);

  // Excel paste directly into input row
  const handleRowPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>, startClassIndex: number) => {
      const clipboardData = e.clipboardData.getData('text');
      if (!clipboardData || !clipboardData.includes('\n')) return;

      e.preventDefault();
      const lines = clipboardData
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) return;

      setScoresInput((prev) => {
        const next = { ...prev };
        lines.forEach((line, idx) => {
          const targetCls = filteredClasses[startClassIndex + idx];
          if (!targetCls) return;

          // Parse number from line (might be "98.5" or "6A1 \t 98.5")
          const parts = line.split('\t');
          let numStr = parts[parts.length - 1].replace(',', '.').trim();
          const parsed = parseFloat(numStr);
          if (!isNaN(parsed)) {
            next[targetCls.id] = {
              score: String(parsed),
              note: prev[targetCls.id]?.note || '',
            };
          }
        });
        return next;
      });

      setIsDirty(true);
      setStatusMsg({
        text: `Đã dán và điền tự động ${lines.length} điểm từ bảng tính Excel!`,
        type: 'success',
      });
      setTimeout(() => setStatusMsg(null), 3500);
    },
    [filteredClasses]
  );

  // Quick fill utilities
  const handleFillAll100 = () => {
    setScoresInput((prev) => {
      const next = { ...prev };
      classes.forEach((cls) => {
        next[cls.id] = {
          score: '100',
          note: prev[cls.id]?.note || '',
        };
      });
      return next;
    });
    setIsDirty(true);
  };

  const handleFillFromViolations = () => {
    setScoresInput((prev) => {
      const next = { ...prev };
      classes.forEach((cls) => {
        const refScore = getClassWeeklyScore(cls.id, selectedWeek);
        next[cls.id] = {
          score: String(refScore.finalScore),
          note: prev[cls.id]?.note || '',
        };
      });
      return next;
    });
    setIsDirty(true);
    setStatusMsg({
      text: 'Đã nạp điểm tính từ biên bản vi phạm chi tiết của tuần được chọn!',
      type: 'success',
    });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Process Excel Modal Paste
  const handleApplyPasteModal = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let filledCount = 0;

    setScoresInput((prev) => {
      const next = { ...prev };

      if (pasteMode === 'single_column') {
        // Mode 1: 1 column of numbers corresponding to filteredClasses order
        lines.forEach((line, idx) => {
          const targetCls = filteredClasses[idx];
          if (!targetCls) return;

          const cleanNum = line.replace(',', '.').trim();
          const parsed = parseFloat(cleanNum);
          if (!isNaN(parsed)) {
            next[targetCls.id] = {
              score: String(parsed),
              note: prev[targetCls.id]?.note || '',
            };
            filledCount++;
          }
        });
      } else {
        // Mode 2: 2 columns [Tên lớp, Điểm]
        lines.forEach((line) => {
          const parts = line.split(/[\t,;]/).map((p) => p.trim());
          if (parts.length < 2) return;

          const classNameInput = parts[0].toLowerCase().replace(/\s+/g, '');
          const scoreStr = parts[1].replace(',', '.').trim();
          const parsed = parseFloat(scoreStr);

          if (!isNaN(parsed)) {
            // Find class by name or code
            const matchedCls = classes.find(
              (c) =>
                c.name.toLowerCase().replace(/\s+/g, '') === classNameInput ||
                (c.code && c.code.toLowerCase().replace(/\s+/g, '') === classNameInput)
            );

            if (matchedCls) {
              next[matchedCls.id] = {
                score: String(parsed),
                note: prev[matchedCls.id]?.note || '',
              };
              filledCount++;
            }
          }
        });
      }

      return next;
    });

    setShowPasteModal(false);
    setPasteRawText('');
    setIsDirty(true);
    setStatusMsg({
      text: `Đã khớp và điền thành công ${filledCount} lớp từ dữ liệu Excel!`,
      type: 'success',
    });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // Save handler
  const handleSave = async () => {
    if (!canManage) {
      setStatusMsg({
        text: 'Chỉ Quản trị viên (Admin) và Ban Giám Hiệu mới có quyền lưu điểm bảo lưu lịch sử!',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Build scores map
      const payload: Record<string, { finalScore: number; note?: string }> = {};

      classes.forEach((cls) => {
        const inputObj = scoresInput[cls.id];
        let num = parseFloat(inputObj?.score);
        if (isNaN(num)) num = 100;
        payload[cls.id] = {
          finalScore: Number(num.toFixed(2)),
          note: inputObj?.note?.trim() || 'Điểm bảo lưu lịch sử (Hợp lệ)',
        };
      });

      const res = await saveHistoricalScores(selectedWeek, payload, autoLockWeek);

      if (res.success) {
        setIsDirty(false);
        setStatusMsg({
          text: res.message,
          type: 'success',
        });
      } else {
        setStatusMsg({
          text: res.message,
          type: 'error',
        });
      }
    } catch {
      setStatusMsg({
        text: 'Có lỗi xảy ra trong quá trình lưu dữ liệu bảo lưu!',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!canManage) return;
    setIsSaving(true);
    setShowDeleteConfirm(false);
    try {
      const res = await clearHistoricalScores(selectedWeek);
      if (res.success) {
        setIsDirty(false);
        setStatusMsg({
          text: res.message,
          type: 'success',
        });
      } else {
        setStatusMsg({
          text: res.message,
          type: 'error',
        });
      }
    } catch {
      setStatusMsg({
        text: 'Có lỗi xảy ra khi xóa điểm bảo lưu!',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const sem1WeeksCount = settings.totalWeeksSemester1 || 18;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 shadow-xs transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle size={20} className="shrink-0 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Header & Description Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
              <History size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Nhập Điểm Bảo Lưu Lịch Sử (Historical Data)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                  Admin & BGH
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Cung cấp điểm chốt tổng kết cho các tuần đã diễn ra trong quá khứ khi đưa hệ thống vào vận hành giữa chừng. Không bắt buộc phải có biên bản vi phạm chi tiết.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" />
              <span>Toàn trường ({classes.length} lớp)</span>
            </span>
          </div>
        </div>

        {/* Dynamic Week Selection Toolbar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
          {/* Week Selector Dropdown */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar size={14} className="text-amber-600" />
              <span>1. Chọn tuần trong quá khứ để nhập điểm:</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedWeek <= 1}
                onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
                className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                title="Tuần trước"
              >
                <ChevronLeft size={16} />
              </button>

              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="grow px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all shadow-xs cursor-pointer"
              >
                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => {
                  const isHK1 = w <= sem1WeeksCount;
                  const hasHistorical = !!historicalWeeklyScores[w];
                  const locked = isWeekLocked(w);
                  return (
                    <option key={w} value={w}>
                      Tuần {w} (Học kỳ {isHK1 ? 'I' : 'II'}) {hasHistorical ? '✓ Đã có điểm bảo lưu' : locked ? '🔒 Đã chốt' : '📝 Đang mở'}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                disabled={selectedWeek >= maxWeeks}
                onClick={() => setSelectedWeek((prev) => Math.min(maxWeeks, prev + 1))}
                className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                title="Tuần sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <p className="text-[11px] text-amber-900/80 font-medium pt-0.5">
              📅 {weekRange.label}
            </p>
          </div>

          {/* Week Status Badge Card */}
          <div className="lg:col-span-7 flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  Trạng thái Tuần {selectedWeek}:
                </span>
                {hasSavedHistoricalData ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 size={12} />
                    <span>Đã có điểm bảo lưu</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <span>Chưa có điểm bảo lưu</span>
                  </span>
                )}

                {weekLocked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Lock size={10} />
                    <span>Đã khóa</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Unlock size={10} />
                    <span>Đang mở</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {hasSavedHistoricalData && historicalInfo
                  ? `Cập nhật bởi ${historicalInfo.updatedBy} lúc ${historicalInfo.updatedAt ? new Date(historicalInfo.updatedAt).toLocaleTimeString('vi-VN') + ' ' + new Date(historicalInfo.updatedAt).toLocaleDateString('vi-VN') : 'vừa xong'}`
                  : 'Điểm bảo lưu sẽ thay thế và làm điểm tổng kết hợp lệ của tuần này mà không cần bản ghi lỗi.'}
              </p>
            </div>

            {/* Quick Actions Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ClipboardPaste size={14} />
                <span>Dán từ Excel</span>
              </button>

              <button
                type="button"
                onClick={handleFillAll100}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Gán tất cả 100 điểm"
              >
                Gán 100đ
              </button>

              <button
                type="button"
                onClick={handleFillFromViolations}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Lấy từ điểm vi phạm tuần này"
              >
                Lấy từ lỗi
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Số lớp đánh giá</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {currentStats.validCount} / {classes.length}
            </div>
          </div>
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
            <span className="text-[11px] font-bold text-indigo-700 uppercase">Điểm trung bình</span>
            <div className="text-xl font-black text-indigo-950 mt-0.5">
              {currentStats.avg}
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Điểm cao nhất</span>
            <div className="text-xl font-black text-emerald-950 mt-0.5">
              {currentStats.max}
            </div>
          </div>
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Điểm thấp nhất</span>
            <div className="text-xl font-black text-amber-950 mt-0.5">
              {currentStats.min}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 grow">
            {/* Search */}
            <div className="relative min-w-[200px] grow sm:grow-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm lớp, GVCN, phân hiệu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter by Campus */}
            <select
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-amber-600"
            >
              <option value="all">Tất cả phân hiệu ({campuses.length})</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filter by Grade */}
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:border-amber-600"
            >
              <option value="all">Tất cả các khối (6, 7, 8, 9)</option>
              <option value={6}>Khối 6</option>
              <option value={7}>Khối 7</option>
              <option value={8}>Khối 8</option>
              <option value={9}>Khối 9</option>
            </select>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoLockWeek}
                onChange={(e) => setAutoLockWeek(e.target.checked)}
                className="w-4 h-4 rounded-md text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <span>Tự động chốt (khóa) tuần này sau khi lưu</span>
            </label>

            {hasSavedHistoricalData && canManage && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Xóa điểm bảo lưu tuần này"
              >
                <Trash2 size={14} />
                <span>Xóa bảo lưu</span>
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Điểm Bảo Lưu & Áp Dụng'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Informational Guidance Tip */}
        <div className="px-4 py-2.5 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-amber-700 shrink-0" />
            <span>
              💡 <strong>Mẹo nhập liệu siêu tốc:</strong> Bạn có thể gõ trực tiếp điểm số vào ô, hoặc <strong>copy 1 cột điểm từ Excel</strong> rồi bấm vào ô đầu tiên và nhấn <strong>Ctrl + V</strong> để điền tự động xuống các hàng bên dưới!
            </span>
          </div>
          {isDirty && (
            <span className="text-amber-800 font-bold bg-amber-200/80 px-2 py-0.5 rounded-md">
              Có thay đổi chưa lưu
            </span>
          )}
        </div>

        {/* Classes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-black uppercase text-[11px] tracking-wide border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th className="py-3 px-4 min-w-[90px]">Lớp</th>
                <th className="py-3 px-4 min-w-[150px]">Phân hiệu</th>
                <th className="py-3 px-4 min-w-[140px]">GVCN</th>
                <th className="py-3 px-4 w-32 text-center">Điểm từ lỗi (TK)</th>
                <th className="py-3 px-4 w-48 text-left">
                  <span className="text-amber-950 font-black flex items-center gap-1">
                    <span>Tổng Điểm Chốt (Bảo lưu)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                </th>
                <th className="py-3 px-4 min-w-[200px]">Ghi chú bảo lưu</th>
                <th className="py-3 px-3 w-28 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, idx) => {
                  const campus = campuses.find((c) => c.id === cls.campusId);
                  const refScore = getClassWeeklyScore(cls.id, selectedWeek);
                  const currentVal = scoresInput[cls.id]?.score ?? '100';
                  const currentNote = scoresInput[cls.id]?.note ?? '';
                  const numVal = parseFloat(currentVal);
                  const isHistSaved = hasSavedHistoricalData && historicalWeeklyScores[selectedWeek]?.[cls.id] !== undefined;

                  return (
                    <tr
                      key={cls.id}
                      className="hover:bg-amber-50/30 transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-black text-slate-900 text-sm group-hover:text-amber-800 transition-colors">
                          {cls.name}
                        </span>
                        <span className="block text-[10px] text-slate-400">Khối {cls.grade}</span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            campus?.type === 'main'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {campus?.name || 'Chưa gán'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-700">
                        {cls.homeroomTeacher || 'Chưa phân công'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-500">
                        <span
                          className="px-2 py-1 bg-slate-100 rounded-lg text-xs"
                          title={`Tính từ ${refScore.logCount} lỗi vi phạm chi tiết`}
                        >
                          {refScore.finalScore.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="200"
                            disabled={!canManage}
                            value={currentVal}
                            onChange={(e) => handleScoreChange(cls.id, e.target.value)}
                            onPaste={(e) => handleRowPaste(e, idx)}
                            placeholder="100.00"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-black text-slate-900 focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all shadow-inner text-left"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          disabled={!canManage}
                          value={currentNote}
                          onChange={(e) => handleNoteChange(cls.id, e.target.value)}
                          placeholder="Ví dụ: Bảo lưu theo biên bản sơ kết..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:border-amber-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isHistSaved ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            Đã bảo lưu
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Mặc định
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị <strong>{filteredClasses.length}</strong> / <strong>{classes.length}</strong> lớp học tại Tuần {selectedWeek}.
          </div>

          <div className="flex items-center gap-3">
            {canManage && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Điểm Bảo Lưu & Áp Dụng Toàn Hệ Thống'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Paste from Excel */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-600 text-white">
                  <ClipboardPaste size={20} />
                </span>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Dán Dữ Liệu Điểm Từ Excel (Copy - Paste)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tuần {selectedWeek} — Tự động phân tách và điền vào bảng điểm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  Chế độ nhận diện dữ liệu:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPasteMode('single_column')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      pasteMode === 'single_column'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-black">Cột điểm đơn lẻ</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Copy 1 cột điểm từ Excel, điền tuần tự theo danh sách lớp hiện tại.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPasteMode('name_and_score')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      pasteMode === 'name_and_score'
                        ? 'border-amber-600 bg-amber-50/50 text-amber-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-black">2 Cột (Tên lớp + Điểm)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Copy 2 cột [Tên lớp, Điểm], hệ thống tự động khớp theo đúng tên lớp.
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  Dán nội dung từ clipboard (Ctrl + V vào ô bên dưới):
                </label>
                <textarea
                  rows={8}
                  value={pasteRawText}
                  onChange={(e) => setPasteRawText(e.target.value)}
                  placeholder={
                    pasteMode === 'single_column'
                      ? '98.5\n100\n97.0\n99.2\n...'
                      : '6A1\t98.5\n6A2\t100\n6A3\t97.0\n...'
                  }
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-amber-600 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Số dòng phát hiện:{' '}
                  <strong>
                    {
                      pasteRawText
                        .split(/\r?\n/)
                        .map((l) => l.trim())
                        .filter((l) => l.length > 0).length
                    }
                  </strong>{' '}
                  dòng.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyPasteModal}
                disabled={!pasteRawText.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
              >
                Điền Vào Bảng Điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 rounded-2xl bg-rose-100">
                <AlertTriangle size={24} />
              </span>
              <div>
                <h4 className="text-base font-black text-slate-900">
                  Xác nhận xóa điểm bảo lưu?
                </h4>
                <p className="text-xs text-slate-500">Tuần {selectedWeek}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ điểm bảo lưu của <strong>Tuần {selectedWeek}</strong>? Sau khi xóa, hệ thống sẽ tự động tính lại điểm tuần theo các bản ghi vi phạm chi tiết (nếu có) hoặc điểm gốc 100.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
