import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sliders,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Award,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  School,
  PlayCircle,
  Check,
  Zap,
  Lock,
  Unlock,
  GitBranch,
  Copy,
  History,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Settings as SettingsIcon,
  Eye,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import {
  Criteria,
  CriteriaCategory,
  CriteriaType,
  CriteriaPeriod,
  CriteriaScope,
  CalculationRuleType,
  CriteriaStatus,
  CriteriaVersionHistory,
  CriteriaAdjustmentRuleConfig,
} from '../../types';
import {
  getCriteriaEditRuleCase,
  isCriteriaUsedInScores,
  diffCriteriaVersions,
} from '../../utils/criteriaVersionEngine';
import { canModifyCriteria, canUnlockHistoricalData } from '../../utils/rbac';

export const CriteriaManager: React.FC = () => {
  const {
    criteria,
    addCriteria,
    updateCriteria,
    deleteCriteria,
    archiveCriteria,
    restoreCriteria,
    lockCriteria,
    unlockCriteria,
    createNewCriteriaVersion,
    duplicateCriteria,
    toggleCriteriaActive,
    criteriaVersionHistories,
    criteriaLockConfig,
    updateCriteriaLockConfig,
    campuses,
    classes,
    scoreLogs,
    lockedWeeks,
    currentUser,
    previewCriteriaCalculation,
    settings,
    maxWeeks,
  } = useApp();

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'super_admin';
  const canEdit = canModifyCriteria(currentUser);
  const canUnlock = canUnlockHistoricalData(currentUser);

  // Active View Tab: 'list' | 'history' | 'compare' | 'lock_rules' | 'sandbox'
  const [activeViewTab, setActiveViewTab] = useState<'list' | 'history' | 'compare' | 'lock_rules' | 'sandbox'>('list');

  // Filters for criteria list
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeType, setActiveType] = useState<'all' | 'bonus' | 'penalty'>('all');
  const [activePeriod, setActivePeriod] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [activeScope, setActiveScope] = useState<'all' | 'main_only' | 'sub_only'>('all');
  const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'inactive' | 'locked' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);
  const [editReason, setEditReason] = useState('');

  // Version Creation Modal
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [targetVersionCriteria, setTargetVersionCriteria] = useState<Criteria | null>(null);
  const [newVersionStartWeek, setNewVersionStartWeek] = useState<number>(settings.currentWeek || 9);
  const [newVersionPoints, setNewVersionPoints] = useState<number>(1);
  const [newVersionUnit, setNewVersionUnit] = useState<string>('lần');
  const [newVersionCondition, setNewVersionCondition] = useState<string>('');
  const [newVersionScope, setNewVersionScope] = useState<CriteriaScope>('all');
  const [newVersionReason, setNewVersionReason] = useState<string>('');
  const [versionConfirmUnderstood, setVersionConfirmUnderstood] = useState<boolean>(false);

  // Version Compare State
  const [compareCriteriaCode, setCompareCriteriaCode] = useState<string>('');
  const [compareOldVersionNum, setCompareOldVersionNum] = useState<number>(1);
  const [compareNewVersionNum, setCompareNewVersionNum] = useState<number>(2);

  // History Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');
  const [historyAuthorFilter, setHistoryAuthorFilter] = useState('all');

  // Add/Edit Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CriteriaCategory>('Chất lượng học tập');
  const [type, setType] = useState<CriteriaType>('penalty');
  const [points, setPoints] = useState<number>(2);
  const [unit, setUnit] = useState<string>('lần');
  const [period, setPeriod] = useState<CriteriaPeriod>('week');
  const [scope, setScope] = useState<CriteriaScope>('all');
  const [targetGrades, setTargetGrades] = useState<string>('');
  const [targetClassType, setTargetClassType] = useState<'all' | 'A1' | 'A2_A3'>('all');
  const [condition, setCondition] = useState('');
  const [maxCap, setMaxCap] = useState<string>('');
  const [calculationRule, setCalculationRule] = useState<CalculationRuleType>('standard');
  const [description, setDescription] = useState('');
  const [startWeek, setStartWeek] = useState<number>(1);
  const [endWeek, setEndWeek] = useState<number>(35);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Sandbox Tester State
  const [sandboxClassId, setSandboxClassId] = useState<string>(classes[0]?.id || '');
  const [sandboxCriteriaId, setSandboxCriteriaId] = useState<string>(criteria[0]?.id || '');
  const [sandboxQuantity, setSandboxQuantity] = useState<number>(1);
  const [sandboxWeek, setSandboxWeek] = useState<number>(settings.currentWeek || 1);

  // Criteria Lock Config local state
  const [localLockMode, setLocalLockMode] = useState<CriteriaAdjustmentRuleConfig['lockMode']>(
    criteriaLockConfig?.lockMode || 'before_week_lock'
  );
  const [localDeadlineDate, setLocalDeadlineDate] = useState<string>(
    criteriaLockConfig?.adjustmentDeadlineDate || ''
  );
  const [localConfigNotes, setLocalConfigNotes] = useState<string>(
    criteriaLockConfig?.notes || ''
  );

  const categories: CriteriaCategory[] = [
    'Chuyên cần',
    'Hành vi ứng xử',
    'Tác phong - Trang phục',
    'Sinh hoạt TT',
    'Lao động, vệ sinh',
    'Bảo vệ của công',
    'Trật tự ATGT',
    'Chất lượng học tập',
    'Quy chế thi',
    'Đóng góp – Sổ đầu bài',
    'Đội cờ đỏ',
    'Bán trú',
    'Học tập',
    'HS nhặt được của rơi',
    'Các hoạt động khác',
    'Lớp có HS đạt giải các kỳ thi',
  ];

  // Filtered criteria list
  const filteredCriteria = useMemo(() => {
    return criteria.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (activeType !== 'all' && item.type !== activeType) return false;
      if (activePeriod !== 'all' && item.period !== activePeriod) return false;
      if (activeScope !== 'all') {
        if (activeScope === 'main_only' && item.scope !== 'main_only') return false;
        if (activeScope === 'sub_only' && item.scope !== 'sub_only' && item.scope !== 'sub_with_badge')
          return false;
      }
      if (activeStatus !== 'all') {
        if (item.status && item.status !== activeStatus) return false;
        if (!item.status && activeStatus === 'active' && !item.isActive) return false;
        if (!item.status && activeStatus === 'inactive' && item.isActive) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.condition && item.condition.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [criteria, activeCategory, activeType, activePeriod, activeScope, activeStatus, searchQuery]);

  // Distinct criteria codes that have multiple versions
  const criteriaWithVersions = useMemo(() => {
    const codeMap = new Map<string, Criteria[]>();
    criteria.forEach((c) => {
      const arr = codeMap.get(c.code) || [];
      arr.push(c);
      codeMap.set(c.code, arr);
    });
    return Array.from(codeMap.entries())
      .filter(([_, list]) => list.length > 1)
      .map(([code, list]) => ({ code, list }));
  }, [criteria]);

  // Handle open Add Modal
  const handleOpenAddModal = () => {
    setEditingCriteria(null);
    setEditReason('');
    setCode(`TC${(criteria.length + 1).toString().padStart(2, '0')}`);
    setName('');
    setCategory('Chất lượng học tập');
    setType('bonus');
    setPoints(2);
    setUnit('tiết');
    setPeriod('week');
    setScope('all');
    setTargetGrades('');
    setTargetClassType('all');
    setCondition('');
    setMaxCap('');
    setCalculationRule('standard');
    setDescription('');
    setStartWeek(1);
    setEndWeek(35);
    setIsActive(true);
    setShowAddEditModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (crit: Criteria) => {
    const ruleCheck = getCriteriaEditRuleCase(crit, scoreLogs, lockedWeeks);
    if (ruleCheck.ruleCase === 3) {
      alert(
        `Tiêu chí "${crit.code}" đã được sử dụng trong kỳ ĐÃ CHỐT (hoặc đã bị chốt bảo vệ).\n\nQuy tắc hệ thống: KHÔNG được sửa trực tiếp để bảo vệ tính toàn vẹn của lịch sử thi đua.\nVui lòng bấm nút [Tạo phiên bản mới]!`
      );
      handleOpenNewVersionModal(crit);
      return;
    }

    setEditingCriteria(crit);
    setEditReason('');
    setCode(crit.code);
    setName(crit.name);
    setCategory(crit.category);
    setType(crit.type);
    setPoints(crit.points);
    setUnit(crit.unit);
    setPeriod(crit.period || 'week');
    setScope(crit.scope || 'all');
    setTargetGrades(crit.targetGrades ? crit.targetGrades.join(',') : '');
    setTargetClassType(crit.targetClassType || 'all');
    setCondition(crit.condition || '');
    setMaxCap(crit.maxCap !== undefined ? String(crit.maxCap) : '');
    setCalculationRule(crit.calculationRule || 'standard');
    setDescription(crit.description || '');
    setStartWeek(crit.startWeek || 1);
    setEndWeek(crit.endWeek || 35);
    setIsActive(crit.isActive);
    setShowAddEditModal(true);
  };

  // Handle open New Version Modal
  const handleOpenNewVersionModal = (crit: Criteria) => {
    setTargetVersionCriteria(crit);
    setNewVersionStartWeek(Math.min(maxWeeks, (settings.current_active_week || settings.currentWeek || 8) + 1));
    setNewVersionPoints(crit.points);
    setNewVersionUnit(crit.unit);
    setNewVersionCondition(crit.condition || '');
    setNewVersionScope(crit.scope || 'all');
    setNewVersionReason('');
    setVersionConfirmUnderstood(false);
    setShowNewVersionModal(true);
  };

  // Handle Submit Edit / Add Form
  const handleAddEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const parsedGrades = targetGrades
      .split(',')
      .map((g) => parseInt(g.trim(), 10))
      .filter((g) => !isNaN(g));
    const parsedCap = maxCap.trim() ? parseFloat(maxCap) : undefined;

    const payload: Partial<Criteria> = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      type,
      points: Math.max(0, Number(points)),
      unit: unit.trim(),
      period,
      scope,
      targetGrades: parsedGrades.length > 0 ? parsedGrades : undefined,
      targetClassType: targetClassType !== 'all' ? targetClassType : undefined,
      condition: condition.trim() || undefined,
      maxCap: parsedCap,
      calculationRule,
      description: description.trim() || undefined,
      startWeek: Number(startWeek) || 1,
      endWeek: Number(endWeek) || 35,
      isActive,
    };

    if (editingCriteria) {
      const res = updateCriteria(editingCriteria.id, payload, editReason);
      if (!res.success) {
        alert(res.message);
        return;
      }
    } else {
      addCriteria(payload as Omit<Criteria, 'id'>);
    }

    setShowAddEditModal(false);
  };

  // Handle Submit New Version Form
  const handleCreateVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVersionCriteria) return;

    if (!newVersionReason.trim()) {
      alert('Bắt buộc phải nhập Lý do điều chỉnh trước khi tạo phiên bản mới!');
      return;
    }

    if (!versionConfirmUnderstood) {
      alert('Bạn phải xác nhận đã hiểu nguyên tắc bảo vệ dữ liệu lịch sử trước khi tiếp tục!');
      return;
    }

    if (!createNewCriteriaVersion) {
      alert('Chức năng tạo phiên bản mới chưa khả dụng');
      return;
    }

    const res = createNewCriteriaVersion(
      targetVersionCriteria.id,
      {
        points: Number(newVersionPoints),
        unit: newVersionUnit.trim(),
        condition: newVersionCondition.trim() || undefined,
        scope: newVersionScope,
      },
      {
        newStartWeek: Number(newVersionStartWeek),
        changeReason: newVersionReason.trim(),
      }
    );

    if (res.success) {
      alert(res.message);
      setShowNewVersionModal(false);
    } else {
      alert(res.message);
    }
  };

  // Handle Save Criteria Lock Rules
  const handleSaveLockRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateCriteriaLockConfig) {
      alert('Chức năng cập nhật quy chế khóa chưa khả dụng');
      return;
    }
    const res = updateCriteriaLockConfig({
      lockMode: localLockMode,
      adjustmentDeadlineDate: localDeadlineDate || undefined,
      notes: localConfigNotes || undefined,
      allowSuperAdminOverride: true,
    });
    alert(res.message);
  };

  // Sandbox calculation preview
  const sandboxPreview = useMemo(() => {
    return previewCriteriaCalculation(sandboxCriteriaId, sandboxQuantity, sandboxClassId, sandboxWeek);
  }, [sandboxCriteriaId, sandboxQuantity, sandboxClassId, sandboxWeek, previewCriteriaCalculation]);

  // Selected criteria for comparison
  const compareDiffResult = useMemo(() => {
    if (!compareCriteriaCode) return null;
    const versions = criteria
      .filter((c) => c.code.toLowerCase() === compareCriteriaCode.toLowerCase())
      .sort((a, b) => (a.version || 1) - (b.version || 1));

    const oldCrit = versions.find((c) => (c.version || 1) === compareOldVersionNum);
    const newCrit = versions.find((c) => (c.version || 1) === compareNewVersionNum);

    if (!oldCrit || !newCrit) return null;

    const diffList = diffCriteriaVersions(oldCrit, newCrit);
    const isPointsChanged = diffList.some((d) => d.field === 'points' || d.field === 'unit');
    const isConditionChanged = diffList.some((d) => d.field === 'condition');
    const isScopeChanged = diffList.some((d) => d.field === 'scope');

    return {
      oldCrit,
      newCrit,
      diffs: {
        list: diffList,
        hasChanged: diffList.length > 0,
        changedFields: diffList.map((d) => d.field),
        isPointsChanged,
        isConditionChanged,
        isScopeChanged,
      },
    };
  }, [criteria, compareCriteriaCode, compareOldVersionNum, compareNewVersionNum]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return (criteriaVersionHistories || []).filter((h) => {
      if (historyCategoryFilter !== 'all') {
        const crit = criteria.find((c) => c.id === h.criteriaId);
        if (crit && crit.category !== historyCategoryFilter) return false;
      }
      if (historyAuthorFilter !== 'all' && h.changedBy !== historyAuthorFilter) return false;
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        return (
          (h.criteriaCode || '').toLowerCase().includes(q) ||
          (h.criteriaName || '').toLowerCase().includes(q) ||
          (h.changeReason || '').toLowerCase().includes(q) ||
          (h.changedBy || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [criteriaVersionHistories, historyCategoryFilter, historyAuthorFilter, historySearchQuery, criteria]);

  // Unique authors in history
  const historyAuthors = useMemo(() => {
    const set = new Set<string>();
    (criteriaVersionHistories || []).forEach((h) => {
      if (h.changedBy) set.add(h.changedBy);
    });
    return Array.from(set);
  }, [criteriaVersionHistories]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <GitBranch className="w-3.5 h-3.5 text-purple-300" />
              Quy Chế Phiên Bản Tiêu Chí • Niên Khóa 2026-2027
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Quản Lý Tiêu Chí Thi Đua Linh Hoạt & Phiên Bản
            </h1>
            <p className="text-sm text-purple-200/90 max-w-3xl leading-relaxed">
              Cho phép nhà trường điều chỉnh mức điểm, đơn vị và điều kiện áp dụng theo từng tuần học thực tế. Cơ chế phiên bản tự động bảo vệ dữ liệu lịch sử các tuần/kỳ đã chốt, tuyệt đối không làm sai lệch điểm số đã ban hành.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-950/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Thêm Tiêu Chí Mới
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/15">
          <button
            onClick={() => setActiveViewTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeViewTab === 'list'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Danh Mục Tiêu Chí ({criteria.length})
          </button>

          <button
            onClick={() => setActiveViewTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeViewTab === 'history'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Lịch Sử Thay Đổi ({criteriaVersionHistories?.length || 0})
          </button>

          <button
            onClick={() => {
              setActiveViewTab('compare');
              if (criteriaWithVersions.length > 0 && !compareCriteriaCode) {
                setCompareCriteriaCode(criteriaWithVersions[0].code);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeViewTab === 'compare'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            So Sánh Phiên Bản (Diff)
          </button>

          <button
            onClick={() => setActiveViewTab('lock_rules')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeViewTab === 'lock_rules'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            Cấu Hình Quy Tắc Chốt
          </button>

          <button
            onClick={() => setActiveViewTab('sandbox')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeViewTab === 'sandbox'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            Giả Lập Tính Điểm (Sandbox)
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: DANH MỤC TIÊU CHÍ (VERSIONED LIST)
      ======================================================== */}
      {activeViewTab === 'list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo mã (TC01), tên, nội dung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">Tất cả nhóm tiêu chí</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <select
                  value={activeType}
                  onChange={(e) => setActiveType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">Tất cả loại (Cộng/Trừ)</option>
                  <option value="penalty">Điểm trừ (Vi phạm)</option>
                  <option value="bonus">Điểm cộng (Khen thưởng)</option>
                </select>
              </div>

              {/* Scope */}
              <div>
                <select
                  value={activeScope}
                  onChange={(e) => setActiveScope(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">Tất cả phân hiệu</option>
                  <option value="main_only">Chỉ Trường chính</option>
                  <option value="sub_only">Chỉ 5 Phân hiệu phụ</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang áp dụng</option>
                  <option value="locked">Đã chốt (Khóa)</option>
                  <option value="inactive">Đã ngừng áp dụng</option>
                  <option value="draft">Bản nháp</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Hiển thị <strong className="text-slate-800">{filteredCriteria.length}</strong> / {criteria.length} tiêu chí
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đang áp dụng
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Đã chốt
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Ngừng áp dụng
                </span>
              </div>
            </div>
          </div>

          {/* Criteria Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCriteria.map((crit) => {
              const ruleCheck = getCriteriaEditRuleCase(crit, scoreLogs, lockedWeeks);
              const isLocked = crit.isLocked || crit.status === 'locked';
              const isInactive = crit.status === 'inactive' || !crit.isActive;

              return (
                <div
                  key={crit.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
                    isLocked
                      ? 'border-purple-200 bg-purple-50/10'
                      : isInactive
                      ? 'border-slate-200 bg-slate-50/50 opacity-75'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-sm">
                          {crit.code}
                        </span>
                        {crit.version && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            v{crit.version}
                          </span>
                        )}
                        {isLocked && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            <Lock className="w-2.5 h-2.5" /> Đã chốt
                          </span>
                        )}
                        {isInactive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            Ngừng áp dụng
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-sm font-black px-2.5 py-1 rounded-xl shrink-0 ${
                          crit.type === 'bonus'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {crit.type === 'bonus' ? `+${crit.points}đ` : `-${crit.points}đ`}/{crit.unit}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {crit.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {crit.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {crit.scope === 'main_only'
                          ? 'Chỉ TH chính'
                          : crit.scope === 'sub_only'
                          ? '5 Phân hiệu phụ'
                          : 'Toàn trường'}
                      </span>
                      {crit.startWeek && crit.endWeek && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                          Tuần {crit.startWeek} → {crit.endWeek}
                        </span>
                      )}
                    </div>

                    {crit.condition && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        Điều kiện: {crit.condition}
                      </p>
                    )}

                    {crit.changeReason && (
                      <p className="text-[11px] text-blue-700 bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                        <span className="font-semibold">Lý do phiên bản:</span> {crit.changeReason}
                      </p>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    {/* Status badge / Case indicator */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        ruleCheck.ruleCase === 1
                          ? 'text-emerald-700 bg-emerald-50'
                          : ruleCheck.ruleCase === 2
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-purple-700 bg-purple-50'
                      }`}
                      title={ruleCheck.reason}
                    >
                      {ruleCheck.ruleCase === 1
                        ? 'Chưa có điểm'
                        : ruleCheck.ruleCase === 2
                        ? 'Kỳ chưa chốt'
                        : 'Đã phát sinh kỳ chốt'}
                    </span>

                    {/* Button group */}
                    <div className="flex items-center gap-1">
                      {/* Duplicate */}
                      {canEdit && duplicateCriteria && (
                        <button
                          onClick={() => duplicateCriteria(crit.id)}
                          title="Sao chép tiêu chí"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Create New Version */}
                      {canEdit && (
                        <button
                          onClick={() => handleOpenNewVersionModal(crit)}
                          title="Tạo phiên bản mới (Áp dụng từ tuần chỉ định)"
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Bản mới</span>
                        </button>
                      )}

                      {/* Edit */}
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEditModal(crit)}
                          title="Sửa tiêu chí"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Lock / Unlock */}
                      {canEdit && !isLocked && lockCriteria && (
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn CHỐT tiêu chí "${crit.code}"? Tiêu chí sẽ được bảo vệ chống sửa trực tiếp.`)) {
                              lockCriteria(crit.id);
                            }
                          }}
                          title="Chốt tiêu chí (Bảo vệ)"
                          className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canUnlock && isLocked && unlockCriteria && (
                        <button
                          onClick={() => {
                            if (confirm(`Mở chốt tiêu chí "${crit.code}"? Thao tác sẽ được ghi vào nhật ký kiểm toán.`)) {
                              unlockCriteria(crit.id);
                            }
                          }}
                          title="Mở chốt tiêu chí (Super Admin)"
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Restore */}
                      {canEdit && isInactive && !isLocked && restoreCriteria && (
                        <button
                          onClick={() => restoreCriteria(crit.id)}
                          title="Khôi phục trạng thái đang áp dụng"
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete / Archive */}
                      {canEdit && !isInactive && (
                        <button
                          onClick={() => {
                            const isUsed = isCriteriaUsedInScores(crit.id, crit.code, scoreLogs);
                            const promptMsg = isUsed
                              ? `Tiêu chí "${crit.code}" đã từng phát sinh dữ liệu tính điểm. Để bảo vệ dữ liệu lịch sử thi đua, hệ thống sẽ chuyển sang trạng thái [NGỪNG ÁP DỤNG] thay vì xóa vật lý.\n\nXác nhận ngừng áp dụng?`
                              : `Xác nhận xóa tiêu chí "${crit.code}"?`;
                            if (confirm(promptMsg)) {
                              deleteCriteria(crit.id);
                            }
                          }}
                          title="Ngừng áp dụng hoặc xóa"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: LỊCH SỬ THAY ĐỔI TIÊU CHÍ (AUDIT TRAIL)
      ======================================================== */}
      {activeViewTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Nhật Ký Kiểm Toán Lịch Sử Thay Đổi Tiêu Chí
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi nhận mọi lần điều chỉnh điểm số, đơn vị, điều kiện và lý do thay đổi theo quy chế nhà trường.
              </p>
            </div>

            {/* History Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Lọc theo mã, tên, lý do..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />

              <select
                value={historyCategoryFilter}
                onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="all">Mọi nhóm tiêu chí</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={historyAuthorFilter}
                onChange={(e) => setHistoryAuthorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="all">Mọi người thay đổi</option>
                {historyAuthors.map((author) => (
                  <option key={author} value={author}>
                    {author}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Chưa có bản ghi lịch sử thay đổi tiêu chí nào.</p>
              <p className="text-xs text-slate-400 mt-1">
                Khi bạn chỉnh sửa tiêu chí hoặc tạo phiên bản mới, toàn bộ dữ liệu trước và sau sẽ được lưu tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12">STT</th>
                    <th className="px-3 py-2.5">Mã & Tên tiêu chí</th>
                    <th className="px-3 py-2.5 text-center">Phiên bản</th>
                    <th className="px-3 py-2.5 text-right">Giá trị cũ</th>
                    <th className="px-3 py-2.5 text-center w-8">→</th>
                    <th className="px-3 py-2.5 text-left">Giá trị mới</th>
                    <th className="px-3 py-2.5">Thời điểm thay đổi</th>
                    <th className="px-3 py-2.5">Người thực hiện</th>
                    <th className="px-3 py-2.5">Lý do điều chỉnh</th>
                    <th className="px-3 py-2.5">Phạm vi áp dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-slate-800 block">
                          {item.criteriaCode}
                        </span>
                        <span className="text-[11px] text-slate-600 block truncate max-w-[200px]" title={item.criteriaName}>
                          {item.criteriaName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px]">
                          v{item.version}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-rose-600">
                        {item.oldPoints}đ/{item.oldUnit || 'lần'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-400">
                        <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                      </td>
                      <td className="px-3 py-2.5 text-left font-mono font-bold text-emerald-600">
                        {item.newPoints}đ/{item.newUnit || 'lần'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        <span className="block font-medium">
                          {new Date(item.changedAt || item.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.changedAt || item.createdAt || Date.now()).toLocaleTimeString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-800 block">{item.changedBy}</span>
                        <span className="text-[10px] text-slate-500">{item.changedByRole}</span>
                      </td>
                      <td className="px-3 py-2.5 max-w-xs">
                        <span className="text-slate-700 bg-slate-50 p-1.5 rounded block border border-slate-100">
                          {item.changeReason}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600">
                        <span className="block">
                          Tuần {item.effectiveFromWeek || 1} → {item.effectiveToWeek || 35}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{item.scopeSummary || item.newScope}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: SO SÁNH PHIÊN BẢN (VERSION COMPARISON DIFF)
      ======================================================== */}
      {activeViewTab === 'compare' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                So Sánh Chi Tiết Giữa Hai Phiên Bản Tiêu Chí
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hiển thị sự khác biệt rõ ràng về điểm số, điều kiện, phạm vi và thời điểm áp dụng.
              </p>
            </div>

            {/* Select Criteria to Compare */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Chọn tiêu chí:</label>
              <select
                value={compareCriteriaCode}
                onChange={(e) => {
                  setCompareCriteriaCode(e.target.value);
                  setCompareOldVersionNum(1);
                  setCompareNewVersionNum(2);
                }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono font-bold text-purple-900 bg-purple-50/50"
              >
                {criteria.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.name} (v{c.version || 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Version 1 vs Version 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phiên bản cũ (Trước):
              </label>
              <select
                value={compareOldVersionNum}
                onChange={(e) => setCompareOldVersionNum(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    Phiên bản v{v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phiên bản mới (Sau):
              </label>
              <select
                value={compareNewVersionNum}
                onChange={(e) => setCompareNewVersionNum(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    Phiên bản v{v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff Content View */}
          {compareDiffResult ? (
            <div className="space-y-4">
              {/* Status summary */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
                <span>
                  Đang so sánh: <strong>{compareDiffResult.oldCrit.code}</strong> - {compareDiffResult.oldCrit.name}
                </span>
                <span className="font-semibold">
                  {compareDiffResult.diffs.hasChanged
                    ? `Phát hiện ${compareDiffResult.diffs.changedFields.length} điểm thay đổi`
                    : 'Hai phiên bản có thông số giống hệt nhau'}
                </span>
              </div>

              {/* Side by side comparison table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-1/4">Thuộc tính tiêu chí</th>
                      <th className="px-4 py-3 w-3/8 bg-rose-50/50 text-rose-900 border-r border-slate-200">
                        Phiên bản cũ (v{compareDiffResult.oldCrit.version || 1})
                      </th>
                      <th className="px-4 py-3 w-3/8 bg-emerald-50/50 text-emerald-900">
                        Phiên bản mới (v{compareDiffResult.newCrit.version || 2})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Points */}
                    <tr className={compareDiffResult.diffs.isPointsChanged ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-3 font-semibold text-slate-700">Mức điểm & Đơn vị</td>
                      <td className="px-4 py-3 border-r border-slate-200 font-mono text-rose-700 font-semibold">
                        {compareDiffResult.oldCrit.points}đ / {compareDiffResult.oldCrit.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-700 font-bold">
                        {compareDiffResult.newCrit.points}đ / {compareDiffResult.newCrit.unit}
                        {compareDiffResult.diffs.isPointsChanged && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-sans">
                            Đã thay đổi
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Condition */}
                    <tr className={compareDiffResult.diffs.isConditionChanged ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-3 font-semibold text-slate-700">Điều kiện áp dụng</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-slate-600">
                        {compareDiffResult.oldCrit.condition || '— Không quy định —'}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {compareDiffResult.newCrit.condition || '— Không quy định —'}
                        {compareDiffResult.diffs.isConditionChanged && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Đã thay đổi
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Scope */}
                    <tr className={compareDiffResult.diffs.isScopeChanged ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-3 font-semibold text-slate-700">Phạm vi phân hiệu</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-slate-600">
                        {compareDiffResult.oldCrit.scope}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {compareDiffResult.newCrit.scope}
                        {compareDiffResult.diffs.isScopeChanged && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Đã thay đổi
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Effective Week */}
                    <tr className="bg-slate-50/40">
                      <td className="px-4 py-3 font-semibold text-slate-700">Chu kỳ tuần áp dụng</td>
                      <td className="px-4 py-3 border-r border-slate-200 font-mono text-slate-600">
                        Tuần {compareDiffResult.oldCrit.startWeek || 1} → Tuần {compareDiffResult.oldCrit.endWeek || 35}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">
                        Tuần {compareDiffResult.newCrit.startWeek || 1} → Tuần {compareDiffResult.newCrit.endWeek || 35}
                      </td>
                    </tr>

                    {/* Change Reason */}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-700">Lý do điều chỉnh</td>
                      <td className="px-4 py-3 border-r border-slate-200 text-slate-500 italic">
                        {compareDiffResult.oldCrit.changeReason || 'Phiên bản ban đầu'}
                      </td>
                      <td className="px-4 py-3 text-blue-800 font-medium bg-blue-50/30">
                        {compareDiffResult.newCrit.changeReason || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm">Vui lòng chọn tiêu chí có ít nhất 2 phiên bản để thực hiện so sánh.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: CẤU HÌNH QUY TẮC CHỐT TIÊU CHÍ (ADMIN RULE)
      ======================================================== */}
      {activeViewTab === 'lock_rules' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-3xl mx-auto">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-600" />
              Cấu Hình Quy Tắc & Thời Điểm Cho Phép Điều Chỉnh Tiêu Chí
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy định rõ thời hạn tối đa nhà trường được phép sửa tiêu chí trước khi hệ thống kích hoạt cơ chế bảo vệ vĩnh viễn. Không hard-code quy tắc này.
            </p>
          </div>

          <form onSubmit={handleSaveLockRules} className="space-y-5">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Tiêu chí được phép điều chỉnh đến thời điểm:
              </label>

              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    localLockMode === 'before_week_lock'
                      ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="lockMode"
                    value="before_week_lock"
                    checked={localLockMode === 'before_week_lock'}
                    onChange={() => setLocalLockMode('before_week_lock')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block">Cho phép điều chỉnh đến trước khi chốt tuần</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Tiêu chí của tuần hiện tại có thể cập nhật cho đến khi Trưởng ban kiểm tra bấm &quot;Chốt sổ tuần&quot;.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    localLockMode === 'before_specific_date'
                      ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="lockMode"
                    value="before_specific_date"
                    checked={localLockMode === 'before_specific_date'}
                    onChange={() => setLocalLockMode('before_specific_date')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block">Cho phép điều chỉnh đến trước ngày cụ thể</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Khóa toàn bộ sửa trực tiếp sau ngày chỉ định (Ví dụ: Kết thúc tuần thứ 8 vào ngày 30/10).
                    </span>
                  </div>
                </label>

                {localLockMode === 'before_specific_date' && (
                  <div className="ml-7 pt-2">
                    <input
                      type="date"
                      value={localDeadlineDate}
                      onChange={(e) => setLocalDeadlineDate(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                )}

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    localLockMode === 'before_period_lock'
                      ? 'border-purple-500 bg-purple-50/50 text-purple-950 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="lockMode"
                    value="before_period_lock"
                    checked={localLockMode === 'before_period_lock'}
                    onChange={() => setLocalLockMode('before_period_lock')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block">Cho phép điều chỉnh đến trước khi kỳ tương ứng được chốt</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Tiêu chí tuần khóa khi chốt tuần; Tiêu chí tháng khóa khi chốt tháng; Tiêu chí học kỳ khóa khi chốt học kỳ.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú hoặc căn cứ quyết định của Ban Giám Hiệu:
              </label>
              <textarea
                rows={3}
                value={localConfigNotes}
                onChange={(e) => setLocalConfigNotes(e.target.value)}
                placeholder="Ví dụ: Theo Nghị quyết liên tịch Hội đồng sư phạm ngày 05/09/2026..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={!canEdit}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Lưu Cấu Hình Quy Tắc
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 5: GIẢ LẬP TÍNH ĐIỂM (SANDBOX TESTER)
      ======================================================== */}
      {activeViewTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-purple-600" />
              Thiết Lập Thử Nghiệm Tính Điểm
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn lớp học thử nghiệm:</label>
                <select
                  value={sandboxClassId}
                  onChange={(e) => setSandboxClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Khối {cls.grade} - {campuses.find((c) => c.id === cls.campusId)?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn tiêu chí thử nghiệm:</label>
                <select
                  value={sandboxCriteriaId}
                  onChange={(e) => setSandboxCriteriaId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                >
                  {criteria.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} ({c.type === 'bonus' ? '+' : '-'}{c.points}đ/{c.unit}) [v{c.version || 1}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số lượng:</label>
                  <input
                    type="number"
                    min="1"
                    value={sandboxQuantity}
                    onChange={(e) => setSandboxQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tuần áp dụng:</label>
                  <input
                    type="number"
                    min="1"
                    max={maxWeeks}
                    value={sandboxWeek}
                    onChange={(e) => setSandboxWeek(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Kết Quả Tính Điểm & Kiểm Tra Quy Chuẩn
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Khả năng áp dụng</span>
                <span
                  className={`text-sm font-bold flex items-center gap-1.5 mt-1 ${
                    sandboxPreview.applicable ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {sandboxPreview.applicable ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Hợp lệ
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Không áp dụng
                    </>
                  )}
                </span>
                {!sandboxPreview.applicable && (
                  <p className="text-[11px] text-rose-600 mt-1">{sandboxPreview.reason}</p>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Đơn giá tiêu chí</span>
                <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
                  {sandboxPreview.pointsPerUnit} điểm
                </span>
              </div>

              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-xs text-purple-700 font-semibold block">Tổng điểm quy đổi</span>
                <span className="text-2xl font-black font-mono text-purple-900 mt-1 block">
                  {sandboxPreview.totalPoints > 0 ? `+${sandboxPreview.totalPoints}` : sandboxPreview.totalPoints}đ
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">Diễn giải công thức tính:</span>
              <p className="text-xs font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                {sandboxPreview.calculationDetail}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TẠO PHIÊN BẢN MỚI CHO TIÊU CHÍ (VERSIONING)
      ======================================================== */}
      {showNewVersionModal && targetVersionCriteria && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-lg">
                <GitBranch className="w-5 h-5 text-purple-600" />
                Tạo Phiên Bản Mới Cho Tiêu Chí: {targetVersionCriteria.code}
              </div>
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MANDATORY WARNING REQUIRED BY SPEC */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Cảnh báo quan trọng về tính toàn vẹn dữ liệu
              </div>
              <p className="text-xs font-medium leading-relaxed">
                &ldquo;Thay đổi này sẽ áp dụng cho các dữ liệu từ thời điểm/tuần được lựa chọn trở đi. Dữ liệu các kỳ đã chốt sẽ không bị thay đổi.&rdquo;
              </p>
            </div>

            <form onSubmit={handleCreateVersionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tuần bắt đầu áp dụng phiên bản mới (*):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxWeeks}
                    value={newVersionStartWeek}
                    onChange={(e) => setNewVersionStartWeek(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Tuần 1 đến {newVersionStartWeek - 1} giữ nguyên bản cũ (v{targetVersionCriteria.version || 1})
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điểm mới (*):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newVersionPoints}
                    onChange={(e) => setNewVersionPoints(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-bold font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Điểm cũ: {targetVersionCriteria.points}đ/{targetVersionCriteria.unit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn vị tính mới:
                  </label>
                  <input
                    type="text"
                    value={newVersionUnit}
                    onChange={(e) => setNewVersionUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phạm vi áp dụng mới:
                  </label>
                  <select
                    value={newVersionScope}
                    onChange={(e) => setNewVersionScope(e.target.value as CriteriaScope)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="all">Toàn trường (Cả 6 điểm)</option>
                    <option value="main_only">Chỉ Trường chính</option>
                    <option value="sub_only">Chỉ 5 Phân hiệu phụ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điều kiện áp dụng mới:
                </label>
                <input
                  type="text"
                  value={newVersionCondition}
                  onChange={(e) => setNewVersionCondition(e.target.value)}
                  placeholder="Để trống nếu không có điều kiện riêng"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do thay đổi tiêu chí (*) (Bắt buộc):
                </label>
                <textarea
                  rows={2}
                  value={newVersionReason}
                  onChange={(e) => setNewVersionReason(e.target.value)}
                  placeholder="Ví dụ: Giảm mức trừ từ -1đ xuống -0.5đ từ tuần 9 theo chỉ đạo của BGH nhằm động viên học sinh..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/60 border border-purple-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={versionConfirmUnderstood}
                    onChange={(e) => setVersionConfirmUnderstood(e.target.checked)}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500 rounded"
                  />
                  <span className="text-xs text-purple-900 font-medium">
                    Tôi xác nhận: Phiên bản mới sẽ có hiệu lực từ Tuần {newVersionStartWeek} trở đi. Toàn bộ điểm số các tuần trước đó sẽ được giữ nguyên tuyệt đối.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={!newVersionReason.trim() || !versionConfirmUnderstood}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Xác Nhận Tạo Phiên Bản v{(targetVersionCriteria.version || 1) + 1}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: THÊM / SỬA TIÊU CHÍ (ADD / EDIT)
      ======================================================== */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {editingCriteria ? `Sửa Tiêu Chí: ${editingCriteria.code}` : 'Thêm Tiêu Chí Thi Đua Mới'}
              </h2>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã tiêu chí (*):</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="TC01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhóm tiêu chí (*):</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CriteriaCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên tiêu chí (*):</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Không sơ vin, trang phục sai quy định..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại điểm:</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CriteriaType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="penalty">Điểm trừ (Vi phạm)</option>
                    <option value="bonus">Điểm cộng (Thưởng)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điểm (*):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={points}
                    onChange={(e) => setPoints(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn vị tính:</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="lần, bạn, tiết..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân hiệu áp dụng:</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as CriteriaScope)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Toàn trường (Cả 6 điểm)</option>
                    <option value="main_only">Chỉ Trường chính</option>
                    <option value="sub_only">Chỉ 5 Phân hiệu phụ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chu kỳ áp dụng:</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as CriteriaPeriod)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="week">Theo tuần</option>
                    <option value="month">Theo tháng</option>
                    <option value="semester">Theo học kỳ</option>
                    <option value="year">Cả năm học</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Áp dụng từ tuần:</label>
                  <input
                    type="number"
                    min="1"
                    max={maxWeeks}
                    value={startWeek}
                    onChange={(e) => setStartWeek(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đến tuần:</label>
                  <input
                    type="number"
                    min="1"
                    max={maxWeeks}
                    value={endWeek}
                    onChange={(e) => setEndWeek(parseInt(e.target.value, 10) || maxWeeks)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Điều kiện áp dụng:</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Ví dụ: Chỉ tính trong giờ sinh hoạt..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {editingCriteria && (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <label className="block font-semibold text-blue-900 mb-1">
                    Lý do chỉnh sửa (Bắt buộc nếu tiêu chí đang dùng):
                  </label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Nhập lý do điều chỉnh..."
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingCriteria ? 'Lưu Thay Đổi' : 'Tạo Tiêu Chí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
