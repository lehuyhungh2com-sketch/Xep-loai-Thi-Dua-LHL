import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  School,
  UserCheck,
  Users,
  PenTool,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ClassItem } from '../../types';
import { canManageCampusClasses } from '../../utils/rbac';

function getCampusClassPrefixSuggestion(campusName: string, grade: number, existingCountForGrade: number): string {
  const norm = campusName.toLowerCase();
  let letter = 'A';
  if (norm.includes('hậu lộc')) letter = 'G';
  else if (norm.includes('lộc tân')) letter = 'E';
  else if (norm.includes('lộc sơn')) letter = 'C';
  else if (norm.includes('mỹ lộc')) letter = 'D';
  else if (norm.includes('thuần lộc')) letter = 'B';
  else if (norm.includes('lê hữu lập')) letter = 'A';

  return `${grade}${letter}${existingCountForGrade + 1}`;
}

export const ClassManager: React.FC = () => {
  const {
    classes,
    campuses,
    users,
    addClass,
    updateClass,
    deleteClass,
    selectedCampusId,
    setSelectedCampusId,
    selectedGrade,
    setSelectedGrade,
    setCurrentTab,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [modalMode, setModalMode] = useState<'single' | 'batch'>('single');

  // Form states for Single Class
  const [name, setName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [grade, setGrade] = useState<number>(6);
  const [campusId, setCampusId] = useState<string>(campuses[0]?.id || 'lhl_main');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [homeroomTeacher, setHomeroomTeacher] = useState('');
  const [monitorName, setMonitorName] = useState('');
  const [studentCount, setStudentCount] = useState<number>(40);
  const [roomNumber, setRoomNumber] = useState('');
  const [exemptSemester1, setExemptSemester1] = useState<boolean>(false);

  // Form states for Batch Add
  const [batchClassInput, setBatchClassInput] = useState('');
  const [batchDefaultStudents, setBatchDefaultStudents] = useState<number>(40);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedCampusObj = campuses.find((c) => c.id === selectedCampusId);

  // List of teachers from users
  const teacherUsers = useMemo(() => {
    return users.filter((u) => {
      const isTeacherRole =
        u.role === 'gvcn' ||
        u.role === 'teacher' ||
        u.role === 'tpt_doi' ||
        (u.title && (u.title.toLowerCase().includes('giáo viên') || u.title.toLowerCase().includes('gvcn')));
      const isCurrent = editingClass && (u.id === editingClass.teacherId || u.classId === editingClass.id);
      return isTeacherRole || isCurrent;
    });
  }, [users, editingClass]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (selectedCampusId !== 'all' && c.campusId !== selectedCampusId) return false;
      if (selectedGrade !== 'all' && c.grade !== selectedGrade) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.homeroomTeacher.toLowerCase().includes(q) ||
          (c.monitorName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [classes, selectedCampusId, selectedGrade, searchQuery]);

  const handleNameChange = (val: string) => {
    const upper = val.toUpperCase();
    setName(upper);
    setClassCode(upper); // Tự động copy giá trị Tên lớp vào Mã lớp
  };

  const handleTeacherSelect = (tId: string) => {
    setSelectedTeacherId(tId);
    if (!tId) {
      setHomeroomTeacher('Chưa phân công');
    } else {
      const matched = users.find((u) => u.id === tId);
      setHomeroomTeacher(matched ? matched.name : 'Chưa phân công');
    }
  };

  const handleOpenAdd = (preferredCampusId?: string) => {
    setEditingClass(null);
    setModalMode('single');
    const targetCId = preferredCampusId || (selectedCampusId !== 'all' ? selectedCampusId : campuses[0]?.id || 'lhl_main');
    setCampusId(targetCId);

    const cObj = campuses.find((c) => c.id === targetCId);
    const existingCount = classes.filter((c) => c.campusId === targetCId && c.grade === 6).length;
    const suggested = cObj ? getCampusClassPrefixSuggestion(cObj.name, 6, existingCount) : '6A1';

    setGrade(6);
    setName(suggested);
    setClassCode(suggested); // Tự động copy giá trị Tên lớp vào Mã lớp
    setSelectedTeacherId('');
    setHomeroomTeacher('Chưa phân công');
    setMonitorName('');
    setStudentCount(40);
    setRoomNumber('');
    setExemptSemester1(false);
    setBatchClassInput('');
    setBatchDefaultStudents(40);
    setShowModal(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setModalMode('single');
    setName(cls.name);
    setClassCode(cls.code || cls.name);
    setGrade(cls.grade);
    setCampusId(cls.campusId);
    setExemptSemester1(!!cls.exemptSemester1);

    // Find teacher in users by teacherId, classId, or matching name
    const matched = users.find(
      (u) =>
        (cls.teacherId && u.id === cls.teacherId) ||
        (u.classId && u.classId === cls.id) ||
        (cls.homeroomTeacher &&
          cls.homeroomTeacher !== 'Chưa phân công' &&
          u.name.trim().toLowerCase() === cls.homeroomTeacher.trim().toLowerCase() &&
          (u.role === 'gvcn' || u.role === 'teacher' || u.title?.toLowerCase().includes('giáo viên')))
    );

    if (matched) {
      setSelectedTeacherId(matched.id);
      setHomeroomTeacher(matched.name);
    } else {
      setSelectedTeacherId('');
      setHomeroomTeacher(cls.homeroomTeacher || 'Chưa phân công');
    }

    setMonitorName(cls.monitorName || '');
    setStudentCount(cls.studentCount);
    setRoomNumber(cls.roomNumber || '');
    setShowModal(true);
  };

  const handleCampusChangeInModal = (newCId: string) => {
    setCampusId(newCId);
    const cObj = campuses.find((c) => c.id === newCId);
    if (cObj && !editingClass) {
      const existingCount = classes.filter((c) => c.campusId === newCId && c.grade === grade).length;
      const suggested = getCampusClassPrefixSuggestion(cObj.name, grade, existingCount);
      setName(suggested);
      setClassCode(suggested);
    }
  };

  const handleGradeChangeInModal = (newGrade: 6 | 7 | 8 | 9) => {
    setGrade(newGrade);
    const cObj = campuses.find((c) => c.id === campusId);
    if (cObj && !editingClass) {
      const existingCount = classes.filter((c) => c.campusId === campusId && c.grade === newGrade).length;
      const suggested = getCampusClassPrefixSuggestion(cObj.name, newGrade, existingCount);
      setName(suggested);
      setClassCode(suggested);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cObj = campuses.find((c) => c.id === campusId);
    const campusName = cObj?.name || 'Phân hiệu';

    if (modalMode === 'single') {
      const trimmedName = name.trim().toUpperCase();
      if (!trimmedName) return;
      const finalCode = (classCode.trim() || trimmedName).toUpperCase();

      const selectedTeacher = users.find((u) => u.id === selectedTeacherId);
      const finalTeacherName = selectedTeacher ? selectedTeacher.name : homeroomTeacher.trim() || 'Chưa phân công';
      const finalTeacherId = selectedTeacher?.id || undefined;
      const finalTeacherCode = selectedTeacher?.teacherCode || undefined;

      if (editingClass) {
        const res = updateClass(editingClass.id, {
          name: trimmedName,
          code: finalCode,
          grade,
          campusId,
          homeroomTeacher: finalTeacherName,
          teacherId: finalTeacherId,
          teacherCode: finalTeacherCode,
          monitorName: monitorName.trim() || 'Chưa bầu',
          studentCount: Math.max(1, Number(studentCount) || 40),
          roomNumber: roomNumber.trim() || undefined,
          exemptSemester1: !!exemptSemester1,
        });
        if (!res.success) {
          showToast(res.message || 'Không thể cập nhật thông tin lớp', 'error');
          return;
        }
        showToast(`Đã cập nhật thông tin lớp ${trimmedName}!`);
      } else {
        const isDuplicate = classes.some(
          (c) => c.campusId === campusId && c.name.toUpperCase() === trimmedName
        );
        if (isDuplicate) {
          alert(`Lớp ${trimmedName} đã tồn tại trong ${campusName}. Vui lòng nhập tên lớp khác.`);
          return;
        }

        const res = addClass({
          name: trimmedName,
          code: finalCode,
          grade,
          campusId,
          homeroomTeacher: finalTeacherName,
          teacherId: finalTeacherId,
          teacherCode: finalTeacherCode,
          monitorName: monitorName.trim() || 'Chưa bầu',
          studentCount: Math.max(1, Number(studentCount) || 40),
          roomNumber: roomNumber.trim() || undefined,
          exemptSemester1: !!exemptSemester1,
        });
        if (!res.success) {
          showToast(res.message || 'Không thể thêm lớp học mới', 'error');
          return;
        }
        showToast(`Đã thêm thành công Lớp ${trimmedName} vào ${campusName}!`);
      }
      setShowModal(false);
    } else {
      // Batch mode
      const rawList = batchClassInput
        .split(/[,;\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      if (rawList.length === 0) {
        alert('Vui lòng nhập danh sách tên các lớp (phân cách bằng dấu phẩy).');
        return;
      }

      let addedCount = 0;
      for (const clsName of rawList) {
        const firstChar = parseInt(clsName[0], 10);
        const derivedGrade: 6 | 7 | 8 | 9 =
          firstChar === 6 || firstChar === 7 || firstChar === 8 || firstChar === 9 ? (firstChar as any) : 6;

        const isDuplicate = classes.some(
          (c) => c.campusId === campusId && c.name.toUpperCase() === clsName
        );

        if (!isDuplicate) {
          const res = addClass({
            name: clsName,
            grade: derivedGrade,
            campusId,
            homeroomTeacher: 'Chưa phân công',
            monitorName: 'Chưa bầu',
            studentCount: batchDefaultStudents,
          });
          if (res.success) {
            addedCount++;
          }
        }
      }

      showToast(`Đã thêm nhanh ${addedCount} lớp mới vào ${campusName}!`);
      setShowModal(false);
    }
  };

  const handleDelete = (id: string, className: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa lớp ${className}? Mọi dữ liệu thi đua của lớp sẽ bị xóa.`)) {
      const res = deleteClass(id);
      if (!res.success) {
        showToast(res.message || 'Không thể xóa lớp học', 'error');
        return;
      }
      showToast(`Đã xóa lớp ${className}`);
    }
  };

  const handleToggleExemptSemester1 = (cls: ClassItem) => {
    const nextVal = !cls.exemptSemester1;
    const res = updateClass(cls.id, { exemptSemester1: nextVal });
    if (res && !res.success) {
      showToast(res.message || 'Không thể cập nhật trạng thái miễn thi đua', 'error');
      return;
    }
    showToast(`Đã ${nextVal ? 'BẬT' : 'TẮT'} miễn thi đua HK1 cho Lớp ${cls.name}`);
  };

  const canManage = canManageCampusClasses(currentUser, selectedCampusId !== 'all' ? selectedCampusId : undefined);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all border animate-in slide-in-from-top-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <BookOpen size={16} />
            <span>Cơ sở dữ liệu Lớp học</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
            Quản Lý Lớp Học ({classes.length} Lớp Toàn Trường)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách tất cả các lớp thuộc Khối 6, 7, 8, 9 của 6 phân hiệu. Cho phép linh động thêm mới lớp trong từng phân hiệu.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenAdd(selectedCampusId !== 'all' ? selectedCampusId : undefined)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>
                {selectedCampusObj ? `+ Thêm lớp cho ${selectedCampusObj.name}` : 'Thêm lớp mới'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Campus Filter */}
          <div className="flex items-center gap-1.5">
            <School size={15} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Phân hiệu:</span>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-indigo-500"
            >
              <option value="all">Tất cả 6 Phân hiệu</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Khối:</span>
            <select
              value={selectedGrade}
              onChange={(e) =>
                setSelectedGrade(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 6 | 7 | 8 | 9))
              }
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-indigo-500"
            >
              <option value="all">Tất cả Khối (6, 7, 8, 9)</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>

          {/* Quick campus add class button inside filter bar if campus is selected */}
          {selectedCampusObj && canManage && (
            <button
              onClick={() => handleOpenAdd(selectedCampusObj.id)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Thêm lớp vào {selectedCampusObj.name}</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên lớp, GVCN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Tên lớp</th>
                <th className="py-3 px-4">Khối</th>
                <th className="py-3 px-4">Phân hiệu</th>
                <th className="py-3 px-4">Giáo viên chủ nhiệm</th>
                <th className="py-3 px-4">Lớp trưởng</th>
                <th className="py-3 px-4 text-center">Sĩ số</th>
                <th className="py-3 px-4 text-center">Phòng học</th>
                <th className="py-3 px-3 text-center">Thi đua HK1</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, index) => {
                  const campus = campuses.find((c) => c.id === cls.campusId);
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 tabular-nums font-semibold">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm">
                          Lớp {cls.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                          Khối {cls.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {campus?.name || '---'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {cls.homeroomTeacher}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {cls.monitorName}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 tabular-nums">
                        {cls.studentCount} HS
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {cls.roomNumber || '---'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleToggleExemptSemester1(cls)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                              cls.exemptSemester1
                                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={cls.exemptSemester1 ? 'Đang miễn thi đua HK1 (Đội tuyển HSG). Bấm để chuyển sang bình thường.' : 'Bấm để bật miễn thi đua HK1 cho lớp này'}
                          >
                            {cls.exemptSemester1 ? '🏆 Miễn HK1' : 'Bình thường'}
                          </button>
                        ) : cls.exemptSemester1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                            🏆 Miễn HK1
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">---</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedCampusId(cls.campusId);
                              setCurrentTab('scoring');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Chấm điểm tuần cho lớp này"
                          >
                            <PenTool size={14} />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(cls)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Chỉnh sửa thông tin lớp"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(cls.id, cls.name)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa lớp"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
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

        <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <span>Tổng số hiển thị: <strong className="text-slate-800">{filteredClasses.length}</strong> / {classes.length} lớp</span>
          <span>Tổng số học sinh: <strong className="text-slate-800">{filteredClasses.reduce((acc, c) => acc + c.studentCount, 0)}</strong> HS</span>
        </div>
      </div>

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-indigo-600" />
                  <span>
                    {editingClass ? `Chỉnh sửa Lớp: ${editingClass.name}` : 'Thêm Lớp Học Mới'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingClass
                    ? 'Cập nhật giáo viên chủ nhiệm, sĩ số và thông tin phòng học.'
                    : 'Thêm lớp học vào phân hiệu được chỉ định.'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode selection if adding new */}
            {!editingClass && (
              <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode('single')}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    modalMode === 'single'
                      ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Thêm 1 lớp học
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('batch')}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                    modalMode === 'batch'
                      ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Thêm nhanh nhiều lớp</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Campus Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Phân hiệu trực thuộc *
                </label>
                <select
                  value={campusId}
                  onChange={(e) => handleCampusChangeInModal(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer focus:outline-indigo-500"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'main' ? 'Trường chính' : 'Phân hiệu'})
                    </option>
                  ))}
                </select>
              </div>

              {modalMode === 'single' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Khối lớp *</label>
                      <select
                        value={grade}
                        onChange={(e) => handleGradeChangeInModal(Number(e.target.value) as 6 | 7 | 8 | 9)}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer focus:outline-indigo-500"
                      >
                        <option value={6}>Khối 6</option>
                        <option value={7}>Khối 7</option>
                        <option value={8}>Khối 8</option>
                        <option value={9}>Khối 9</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tên lớp *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="VD: 6A1, 9B2..."
                        className="w-full text-xs font-bold text-indigo-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Mã lớp (Tự động theo tên lớp)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Chỉ đọc</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={classCode}
                        placeholder="Tự động đồng bộ theo tên lớp..."
                        tabIndex={-1}
                        className="w-full text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl p-2.5 cursor-not-allowed select-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Giáo viên chủ nhiệm *</span>
                        <span className="text-[10px] text-indigo-600 font-medium">Danh sách GV</span>
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => handleTeacherSelect(e.target.value)}
                        className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl p-2.5 cursor-pointer focus:outline-indigo-500"
                      >
                        <option value="">-- Chưa phân công --</option>
                        {teacherUsers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.teacherCode ? `[${t.teacherCode}] ` : ''}{t.name} {t.email ? `(${t.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp trưởng</label>
                      <input
                        type="text"
                        value={monitorName}
                        onChange={(e) => setMonitorName(e.target.value)}
                        placeholder="VD: Lê Thị B..."
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng học</label>
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        placeholder="VD: P.201..."
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sĩ số học sinh *</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={studentCount}
                      onChange={(e) => setStudentCount(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                    />
                  </div>

                  {/* Tuỳ chọn Nghiệp vụ: Miễn thi đua Học kỳ 1 (Cho đội tuyển HSG) */}
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                          🏆 Miễn thi đua Học kỳ 1
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-extrabold uppercase">
                          Đặc thù Đội tuyển HSG
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
                        Áp dụng cho <strong>Lớp 9A1</strong> hoặc lớp bồi dưỡng đội tuyển HSG của nhà trường. Lớp sẽ được loại khỏi bảng xếp hạng HK1 và Điểm Cả năm sẽ tính bằng <strong>100% Điểm Học kỳ 2</strong>.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={exemptSemester1}
                        onChange={(e) => setExemptSemester1(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                </>
              ) : (
                /* Batch Class Add Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nhập danh sách tên các lớp cần thêm *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={batchClassInput}
                      onChange={(e) => setBatchClassInput(e.target.value)}
                      placeholder="VD: 6G3, 7G3, 8G4, 9G4 (phân cách bằng dấu phẩy hoặc xuống dòng)"
                      className="w-full text-xs font-mono font-bold text-indigo-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Khối học sẽ được tự động nhận biết qua chữ số đầu tiên (6, 7, 8, 9).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sĩ số mặc định mỗi lớp
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={batchDefaultStudents}
                      onChange={(e) => setBatchDefaultStudents(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>{editingClass ? 'Lưu thay đổi' : 'Xác nhận thêm lớp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
