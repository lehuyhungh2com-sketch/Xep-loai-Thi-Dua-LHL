import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Users,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Campus, ClassItem } from '../../types';

// Helper to determine the standard class suffix code for each campus
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

export const CampusManager: React.FC = () => {
  const {
    campuses,
    classes,
    addCampus,
    updateCampus,
    deleteCampus,
    addClass,
    setCurrentTab,
    setSelectedCampusId,
    currentUser,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);

  // Form states for Campus Add/Edit
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'main' | 'sub'>('sub');
  const [leaderName, setLeaderName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // States for Adding Class into a specific Campus
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [targetCampusForClass, setTargetCampusForClass] = useState<Campus | null>(null);
  const [classAddMode, setClassAddMode] = useState<'single' | 'batch'>('single');

  // Single Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<6 | 7 | 8 | 9>(6);
  const [newHomeroomTeacher, setNewHomeroomTeacher] = useState('');
  const [newMonitorName, setNewMonitorName] = useState('');
  const [newStudentCount, setNewStudentCount] = useState<number>(40);
  const [newRoomNumber, setNewRoomNumber] = useState('');

  // Batch Class Form
  const [batchClassInput, setBatchClassInput] = useState('');
  const [batchDefaultStudents, setBatchDefaultStudents] = useState<number>(40);

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingCampus(null);
    setName('');
    setCode(`PH${campuses.length + 1}`);
    setType('sub');
    setLeaderName('');
    setPhone('');
    setAddress('');
    setDescription('');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleOpenEdit = (camp: Campus) => {
    setEditingCampus(camp);
    setName(camp.name);
    setCode(camp.code);
    setType(camp.type);
    setLeaderName(camp.leaderName || '');
    setPhone(camp.phone || '');
    setAddress(camp.address || '');
    setDescription(camp.description || '');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSubmitCampus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (editingCampus) {
      updateCampus(editingCampus.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        leaderName: leaderName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        description: description.trim() || undefined,
      });
      showToast(`Đã cập nhật thông tin phân hiệu ${name.trim()}!`);
    } else {
      addCampus({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        leaderName: leaderName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        description: description.trim() || undefined,
        colorTheme: 'indigo',
      });
      showToast(`Đã thêm thành công phân hiệu mới: ${name.trim()}!`);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string, campName: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa phân hiệu "${campName}"?`)) {
      const res = deleteCampus(id);
      if (!res.success) {
        alert(res.message);
      } else {
        showToast(`Đã xóa phân hiệu ${campName}`);
      }
    }
  };

  const handleViewCampusClasses = (campId: string) => {
    setSelectedCampusId(campId);
    setCurrentTab('classes');
  };

  // Open modal to add class directly into a specific campus
  const handleOpenAddClassForCampus = (camp: Campus) => {
    setTargetCampusForClass(camp);
    setClassAddMode('single');

    // Count existing classes for grade 6 in this campus to suggest name
    const grade6Count = classes.filter((c) => c.campusId === camp.id && c.grade === 6).length;
    const suggested = getCampusClassPrefixSuggestion(camp.name, 6, grade6Count);

    setNewClassGrade(6);
    setNewClassName(suggested);
    setNewHomeroomTeacher('');
    setNewMonitorName('');
    setNewStudentCount(40);
    setNewRoomNumber('');
    setBatchClassInput('');
    setBatchDefaultStudents(40);
    setShowAddClassModal(true);
  };

  // Change grade in add class modal to auto update suggestion
  const handleGradeChange = (grade: 6 | 7 | 8 | 9) => {
    setNewClassGrade(grade);
    if (targetCampusForClass) {
      const count = classes.filter((c) => c.campusId === targetCampusForClass.id && c.grade === grade).length;
      const suggested = getCampusClassPrefixSuggestion(targetCampusForClass.name, grade, count);
      setNewClassName(suggested);
    }
  };

  // Handle submit adding class into campus
  const handleSubmitAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCampusForClass) return;

    if (classAddMode === 'single') {
      const trimmedName = newClassName.trim().toUpperCase();
      if (!trimmedName) {
        alert('Vui lòng nhập tên lớp học');
        return;
      }

      // Check duplicate class name in same campus
      const isDuplicate = classes.some(
        (c) => c.campusId === targetCampusForClass.id && c.name.toUpperCase() === trimmedName
      );
      if (isDuplicate) {
        alert(`Lớp ${trimmedName} đã tồn tại trong ${targetCampusForClass.name}. Vui lòng nhập tên lớp khác.`);
        return;
      }

      addClass({
        name: trimmedName,
        grade: newClassGrade,
        campusId: targetCampusForClass.id,
        homeroomTeacher: newHomeroomTeacher.trim() || 'Chưa phân công',
        monitorName: newMonitorName.trim() || 'Chưa bầu',
        studentCount: Math.max(1, Number(newStudentCount) || 40),
        roomNumber: newRoomNumber.trim() || undefined,
      });

      showToast(`Đã thêm thành công Lớp ${trimmedName} vào ${targetCampusForClass.name}!`);
      setShowAddClassModal(false);
    } else {
      // Batch mode: parse comma-separated class names
      const rawList = batchClassInput
        .split(/[,;\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      if (rawList.length === 0) {
        alert('Vui lòng nhập danh sách tên các lớp (cách nhau bằng dấu phẩy).');
        return;
      }

      let addedCount = 0;
      rawList.forEach((clsName) => {
        // Derive grade from first character if between 6-9, else default to 6
        const firstChar = parseInt(clsName[0], 10);
        const derivedGrade: 6 | 7 | 8 | 9 =
          firstChar === 6 || firstChar === 7 || firstChar === 8 || firstChar === 9 ? (firstChar as any) : 6;

        const isDuplicate = classes.some(
          (c) => c.campusId === targetCampusForClass.id && c.name.toUpperCase() === clsName
        );

        if (!isDuplicate) {
          addClass({
            name: clsName,
            grade: derivedGrade,
            campusId: targetCampusForClass.id,
            homeroomTeacher: 'Chưa phân công',
            monitorName: 'Chưa bầu',
            studentCount: batchDefaultStudents,
          });
          addedCount++;
        }
      });

      showToast(`Đã thêm nhanh ${addedCount} lớp mới vào ${targetCampusForClass.name}!`);
      setShowAddClassModal(false);
    }
  };

  const canManage = currentUser.role === 'admin' || currentUser.role === 'campus_lead';

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
            <School size={16} />
            <span>Mô hình 6 Phân hiệu trường học</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight">
            Quản Lý Phân Hiệu & Các Lớp Học
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gồm 1 cơ sở trường chính và 5 phân hiệu trực thuộc. Bạn có thể linh động thêm, sửa, phân lớp theo từng phân hiệu.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Thêm phân hiệu mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Campuses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {campuses.map((camp, index) => {
          const campClasses = classes.filter((c) => c.campusId === camp.id);
          const totalStudents = campClasses.reduce((sum, c) => sum + c.studentCount, 0);

          return (
            <div
              key={camp.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-blue-400 transition-all hover:shadow-md"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      Phân hiệu #{index + 1} · {camp.code}
                    </span>
                    <h3 className="text-lg font-black text-blue-950 mt-1 leading-tight">
                      {camp.name}
                    </h3>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(camp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Chỉnh sửa phân hiệu"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(camp.id, camp.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa phân hiệu"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {camp.description && (
                  <p className="text-xs text-slate-500 mb-4">{camp.description}</p>
                )}

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-400 shrink-0" />
                    <span>Phụ trách: <strong className="text-slate-800">{camp.leaderName}</strong></span>
                  </div>
                  {camp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>SĐT: <span className="font-mono text-slate-700">{camp.phone}</span></span>
                    </div>
                  )}
                  {camp.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{camp.address}</span>
                    </div>
                  )}
                </div>

                {/* Class list badges */}
                <div className="mt-4">
                  <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center justify-between">
                    <span>Danh sách lớp ({campClasses.length} lớp · {totalStudents} HS):</span>
                    {canManage && (
                      <button
                        onClick={() => handleOpenAddClassForCampus(camp)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        title={`Thêm lớp mới cho ${camp.name}`}
                      >
                        <Plus size={12} />
                        <span>Thêm lớp</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {campClasses.map((cls) => (
                      <span
                        key={cls.id}
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors cursor-pointer border border-slate-200/60"
                        onClick={() => handleViewCampusClasses(camp.id)}
                        title={`Xem chi tiết lớp ${cls.name} (Khối ${cls.grade} · GVCN: ${cls.homeroomTeacher})`}
                      >
                        {cls.name}
                      </span>
                    ))}
                    {campClasses.length === 0 && (
                      <span className="text-xs text-slate-400 italic">Chưa có lớp nào</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {canManage ? (
                  <button
                    onClick={() => handleOpenAddClassForCampus(camp)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>+ Thêm lớp vào {camp.name}</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">
                    {camp.type === 'main' ? 'Trường cơ sở chính' : 'Cơ sở phân hiệu'}
                  </span>
                )}

                <button
                  onClick={() => handleViewCampusClasses(camp.id)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem {campClasses.length} lớp</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Add / Edit Campus */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingCampus ? `Chỉnh sửa phân hiệu: ${editingCampus.name}` : 'Thêm phân hiệu mới'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCampus} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã phân hiệu *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: LHL, HL, LT..."
                    className="w-full text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại cơ sở *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'main' | 'sub')}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 cursor-pointer"
                  >
                    <option value="main">Trường chính</option>
                    <option value="sub">Phân hiệu trực thuộc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên phân hiệu *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Thuần Lộc, Mỹ Lộc..."
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Người phụ trách *</label>
                  <input
                    type="text"
                    required
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="VD: Thầy Hoàng Văn Sơn..."
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ / Khu vực</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Khu 2, Thị trấn Hậu Lộc, Thanh Hóa..."
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú mô tả</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu phân hiệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Dedicated Add Class into Specific Campus */}
      {showAddClassModal && targetCampusForClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">
                  {targetCampusForClass.type === 'main' ? 'Trường cơ sở chính' : 'Phân hiệu trực thuộc'}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                  <Plus size={18} className="text-emerald-600" />
                  <span>Thêm Lớp Mới Vào {targetCampusForClass.name}</span>
                </h3>
              </div>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
              <button
                type="button"
                onClick={() => setClassAddMode('single')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  classAddMode === 'single'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Thêm 1 lớp học
              </button>
              <button
                type="button"
                onClick={() => setClassAddMode('batch')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                  classAddMode === 'batch'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Thêm nhanh nhiều lớp</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAddClass} className="flex-1 overflow-y-auto p-5 space-y-4">
              {classAddMode === 'single' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Grade Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Khối học *
                      </label>
                      <select
                        value={newClassGrade}
                        onChange={(e) => handleGradeChange(Number(e.target.value) as 6 | 7 | 8 | 9)}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 cursor-pointer focus:outline-indigo-500"
                      >
                        <option value={6}>Khối 6</option>
                        <option value={7}>Khối 7</option>
                        <option value={8}>Khối 8</option>
                        <option value={9}>Khối 9</option>
                      </select>
                    </div>

                    {/* Class Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tên lớp *
                      </label>
                      <input
                        type="text"
                        required
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value.toUpperCase())}
                        placeholder="VD: 6G3, 7A4..."
                        className="w-full text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    💡 Quy ước ký hiệu phân hiệu: <strong>Lê Hữu Lập</strong> (A1, A2, A3),{' '}
                    <strong>Hậu Lộc</strong> (G1, G2, G3), <strong>Lộc Tân</strong> (E1, E2),{' '}
                    <strong>Lộc Sơn</strong> (C1, C2), <strong>Mỹ Lộc</strong> (D1, D2),{' '}
                    <strong>Thuần Lộc</strong> (B1, B2, B3).
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Giáo viên chủ nhiệm (GVCN)
                      </label>
                      <input
                        type="text"
                        value={newHomeroomTeacher}
                        onChange={(e) => setNewHomeroomTeacher(e.target.value)}
                        placeholder="VD: Cô Mai Lan..."
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lớp trưởng
                      </label>
                      <input
                        type="text"
                        value={newMonitorName}
                        onChange={(e) => setNewMonitorName(e.target.value)}
                        placeholder="VD: Nguyễn Văn A..."
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sĩ số học sinh
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={newStudentCount}
                        onChange={(e) => setNewStudentCount(Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phòng học
                      </label>
                      <input
                        type="text"
                        value={newRoomNumber}
                        onChange={(e) => setNewRoomNumber(e.target.value)}
                        placeholder="VD: P.102..."
                        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-indigo-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Batch Class Add Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nhập danh sách tên các lớp cần thêm vào {targetCampusForClass.name} *
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

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>Xác nhận thêm vào {targetCampusForClass.name}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
