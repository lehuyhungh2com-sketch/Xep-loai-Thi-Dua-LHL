import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Save,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Mail,
  GraduationCap,
  ShieldCheck,
  Award,
  Sparkles,
  Download,
  RotateCcw,
  UserCheck,
  Check,
  X,
  School,
  ExternalLink,
  HelpCircle,
  FileSpreadsheet,
  Pencil,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { canManageUsers } from '../../utils/rbac';
import { User, RoleType } from '../../types';

export const AccountEmailManager: React.FC = () => {
  const {
    users,
    currentUser,
    classes,
    campuses,
    updateUserEmail,
    batchUpdateUserEmails,
    updateUser,
    addUser,
    deleteUser,
    logAudit,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Editing state for leadership accounts
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormEmail, setEditFormEmail] = useState('');
  const [editFormRole, setEditFormRole] = useState<RoleType>('bgh');
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormPassword, setEditFormPassword] = useState('');
  const [editFormCampusId, setEditFormCampusId] = useState('');

  // Adding state for new leadership accounts
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormName, setAddFormName] = useState('');
  const [addFormEmail, setAddFormEmail] = useState('');
  const [addFormRole, setAddFormRole] = useState<RoleType>('bgh');
  const [addFormTitle, setAddFormTitle] = useState('');
  const [addFormPassword, setAddFormPassword] = useState('');
  const [addFormCampusId, setAddFormCampusId] = useState('');

  // Local draft emails map: key is classId or userId -> current email string
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>(() => {
    const draft: Record<string, string> = {};
    users.forEach((u) => {
      if (u.classId) {
        draft[u.classId] = u.email || '';
      }
      draft[u.id] = u.email || '';
    });
    return draft;
  });

  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Dynamic Leadership & BGH accounts directly from database (Role 1: Admin, Role 2: BGH)
  const leadershipUsers = useMemo(() => {
    return users.filter(
      (u) => u.role === 'super_admin' || u.role === 'admin' || u.role === 'bgh'
    );
  }, [users]);

  // Map 59 classes with their associated homeroom teacher user
  const teacherRows = useMemo(() => {
    return classes.map((cls, idx) => {
      // Find teacher user corresponding to this class
      const teacherUser = users.find(
        (u) => u.classId === cls.id || (u.role === 'gvcn' && u.name === cls.homeroomTeacher)
      );

      const campus = campuses.find((c) => c.id === cls.campusId);
      const draftEmail =
        emailDrafts[cls.id] !== undefined
          ? emailDrafts[cls.id]
          : teacherUser?.email || '';

      const isSavedMatch =
        teacherUser && teacherUser.email?.trim().toLowerCase() === draftEmail.trim().toLowerCase();

      const hasEmail = Boolean(draftEmail && draftEmail.trim().length > 0);

      return {
        stt: idx + 1,
        classItem: cls,
        teacherUser,
        campusName: campus?.name || cls.campusId,
        teacherName: cls.homeroomTeacher,
        currentEmail: draftEmail,
        isModified: !isSavedMatch,
        hasEmail,
      };
    });
  }, [classes, users, campuses, emailDrafts]);

  // Statistics
  const totalClasses = teacherRows.length;
  const assignedCount = teacherRows.filter((r) => r.hasEmail).length;
  const unassignedCount = totalClasses - assignedCount;
  const progressPercent = totalClasses > 0 ? Math.round((assignedCount / totalClasses) * 100) : 0;

  // Filtered rows
  const filteredTeacherRows = useMemo(() => {
    return teacherRows.filter((row) => {
      // Campus filter
      if (selectedCampusFilter !== 'all' && row.classItem.campusId !== selectedCampusFilter) {
        return false;
      }
      // Grade filter
      if (selectedGradeFilter !== 'all' && String(row.classItem.grade) !== selectedGradeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'assigned' && !row.hasEmail) return false;
      if (statusFilter === 'unassigned' && row.hasEmail) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchClass = row.classItem.name.toLowerCase().includes(term);
        const matchTeacher = row.teacherName.toLowerCase().includes(term);
        const matchEmail = row.currentEmail.toLowerCase().includes(term);
        const matchCampus = row.campusName.toLowerCase().includes(term);
        if (!matchClass && !matchTeacher && !matchEmail && !matchCampus) {
          return false;
        }
      }
      return true;
    });
  }, [teacherRows, selectedCampusFilter, selectedGradeFilter, statusFilter, searchTerm]);

  // Handle individual draft edit
  const handleEmailChange = (key: string, value: string) => {
    setEmailDrafts((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save single teacher row
  const handleSaveRow = async (classId: string, teacherUserId?: string) => {
    const emailToSave = emailDrafts[classId]?.trim() || '';
    const targetId = teacherUserId || `u_gvcn_${classId}`;

    setSavingRows((prev) => ({ ...prev, [classId]: true }));
    try {
      const res = await updateUserEmail(targetId, emailToSave);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Đã lưu email cho lớp ${classes.find((c) => c.id === classId)?.name || classId}: ${emailToSave || '(Trống)'}`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.message || 'Lỗi khi lưu địa chỉ email',
        });
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'Có lỗi xảy ra trong quá trình lưu',
      });
    } finally {
      setSavingRows((prev) => ({ ...prev, [classId]: false }));
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Open Edit User modal
  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditFormName(u.name);
    setEditFormEmail(u.email || '');
    setEditFormRole(u.role === 'admin' ? 'super_admin' : u.role);
    setEditFormTitle(u.title || '');
    setEditFormPassword('');
    setEditFormCampusId(u.campusId || '');
  };

  // Save changes to leadership user (Name, Email, Role, Title, Password, Campus)
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFormName.trim()) {
      alert('Vui lòng nhập Họ và tên!');
      return;
    }
    if (!editFormEmail.trim()) {
      alert('Vui lòng nhập Email đăng nhập!');
      return;
    }

    const cleanEmail = editFormEmail.trim().toLowerCase();
    const patch: Partial<User> = {
      name: editFormName.trim(),
      email: cleanEmail,
      role: editFormRole,
      title: editFormTitle.trim() || (editFormRole === 'bgh' ? '2. Ban Giám Hiệu' : '1. Quản trị viên'),
      campusId: editFormCampusId || undefined,
    };
    if (editFormPassword.trim()) {
      patch.password = editFormPassword.trim();
    }

    const res = updateUser(editingUser.id, patch);
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Đã cập nhật thông tin thành công cho: ${patch.name} (${patch.title})!`,
      });
      setEditingUser(null);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.message || 'Cập nhật tài khoản thất bại!',
      });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Add new leadership user
  const handleSaveAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormName.trim()) {
      alert('Vui lòng nhập Họ và tên!');
      return;
    }
    if (!addFormEmail.trim()) {
      alert('Vui lòng nhập Email đăng nhập!');
      return;
    }

    const cleanEmail = addFormEmail.trim().toLowerCase();
    const isSuper = addFormRole === 'super_admin' || addFormRole === 'admin';
    const defaultPassword = isSuper ? 'Admin@123' : 'Lhl@2026';

    const newUser: Omit<User, 'id'> = {
      name: addFormName.trim(),
      email: cleanEmail,
      role: addFormRole,
      title: addFormTitle.trim() || (addFormRole === 'bgh' ? '2. Ban Giám Hiệu' : '1. Quản trị viên'),
      password: addFormPassword.trim() || defaultPassword,
      scopeType: 'all',
      isLocked: false,
      campusId: addFormCampusId || undefined,
      customPermissions: {
        canInputScore: true,
        canEditScore: true,
        canDeleteScore: true,
        canLockData: true,
        canUnlockData: isSuper,
        canEditCriteria: isSuper,
        canManageUsers: isSuper,
        canManageCampuses: isSuper,
        canViewAllReports: true,
      },
    };

    const res = addUser(newUser);
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Đã tạo mới tài khoản thành công: ${newUser.name} (${newUser.title})!`,
      });
      setIsAddModalOpen(false);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.message || 'Thêm tài khoản thất bại!',
      });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Delete leadership user
  const handleDeleteLeadershipUser = (u: User) => {
    if (u.id === currentUser.id) {
      alert('Không thể xóa tài khoản của chính bạn đang đăng nhập!');
      return;
    }
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa tài khoản ${u.name} (${u.title}) khỏi hệ thống không?`
      )
    ) {
      return;
    }

    const res = deleteUser(u.id);
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Đã xóa tài khoản ${u.name} thành công.`,
      });
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.message || 'Xóa tài khoản thất bại!',
      });
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Save leadership user inline email
  const handleSaveLeadership = async (userId: string) => {
    const emailToSave = emailDrafts[userId]?.trim() || '';
    setSavingRows((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await updateUserEmail(userId, emailToSave);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Đã lưu email cho tài khoản lãnh đạo: ${emailToSave}`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.message || 'Lỗi khi cập nhật email',
        });
      }
    } finally {
      setSavingRows((prev) => ({ ...prev, [userId]: false }));
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Batch save all 59 classes
  const handleBatchSaveAll = async () => {
    setIsBatchSaving(true);
    try {
      const assignments = teacherRows.map((row) => ({
        classId: row.classItem.id,
        id: row.teacherUser?.id || `u_gvcn_${row.classItem.id}`,
        email: (emailDrafts[row.classItem.id] !== undefined ? emailDrafts[row.classItem.id] : row.currentEmail).trim(),
      }));

      const res = await batchUpdateUserEmails(assignments);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Đã lưu thành công địa chỉ email Google cho ${res.updatedCount || assignments.length} lớp học!`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.message || 'Có lỗi xảy ra khi lưu hàng loạt',
        });
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'Có lỗi xảy ra khi gửi dữ liệu lên máy chủ',
      });
    } finally {
      setIsBatchSaving(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Auto-fill template emails for empty classes
  const handleAutoFillTemplate = () => {
    if (
      !window.confirm(
        'Bạn có muốn tự động tạo định dạng email mẫu (gvcn.[lop]@gmail.com) cho các lớp chưa có email không?'
      )
    ) {
      return;
    }

    const newDrafts = { ...emailDrafts };
    let filled = 0;
    teacherRows.forEach((r) => {
      const current = newDrafts[r.classItem.id]?.trim() || '';
      if (!current) {
        const cleanClass = r.classItem.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanTeacher = r.teacherName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9]/g, '');
        newDrafts[r.classItem.id] = `${cleanTeacher}.gvcn${cleanClass}@gmail.com`;
        filled++;
      }
    });

    setEmailDrafts(newDrafts);
    setFeedbackMessage({
      type: 'success',
      text: `Đã tự động gợi ý email mẫu cho ${filled} lớp. Nhấn "Lưu tất cả thay đổi" để áp dụng lên hệ thống!`,
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['STT', 'Lớp', 'Khối', 'Phân hiệu', 'Họ tên GVCN', 'Email Google (Gmail)', 'Trạng thái'];
    const rows = teacherRows.map((r) => [
      r.stt,
      r.classItem.name,
      r.classItem.grade,
      `"${r.campusName}"`,
      `"${r.teacherName}"`,
      `"${r.currentEmail}"`,
      r.hasEmail ? 'Đã gán' : 'Chưa gán',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_sach_Email_59_GVCN_THCS_LeHuuLap_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!canManageUsers(currentUser)) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center">
        <AlertTriangle size={36} className="text-rose-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-950">Quyền truy cập bị giới hạn</h3>
        <p className="text-sm text-slate-600 mt-1">
          Chỉ Quản trị viên (Super Admin) mới có quyền truy cập màn hình Quản lý Tài khoản & Gán Email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30 mb-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            Cấu Hình Phân Quyền CHẾ ĐỘ THẬT (Production)
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-3">
            <Mail size={26} className="text-amber-300" />
            Quản Lý Tài Khoản Google & Gán Email Cho 59 Lớp Học
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-3xl leading-relaxed">
            Gán địa chỉ Email Google (Gmail) thực tế cho 59 Giáo viên chủ nhiệm và Ban Giám Hiệu.
            Khi người dùng đăng nhập bằng tài khoản Google, hệ thống sẽ đối chiếu với danh sách này
            để tự động cấp quyền và <strong>tự động điều hướng họ chỉ quản lý lớp được phân công</strong>.
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng số lớp</span>
            <GraduationCap size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalClasses} Lớp</div>
          <p className="text-[11px] text-slate-500 mt-1">Đủ 6 Phân hiệu • Năm học 2026-2027</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đã gán Email Google</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {assignedCount} / {totalClasses}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chưa gán Email</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{unassignedCount} Lớp</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {unassignedCount === 0 ? 'Hoàn tất 100%' : 'Cần bổ sung trước khi phát hành'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tài khoản Quản trị & BGH</span>
            <ShieldCheck size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700">
            {leadershipUsers.length} Tài khoản
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cấp toàn quyền quản lý hệ thống</p>
        </div>
      </div>

      {/* SECTION: Quản trị viên & Ban Giám Hiệu Accounts (Role 1 & Role 2) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-900">
                  1. Tài Khoản Quản Trị Viên & Ban Giám Hiệu
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  DỮ LIỆU ĐỘNG TỪ CSDL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh sách cán bộ Quản trị viên (Role 1) và Ban Giám Hiệu (Role 2). Nhấn <strong>'Sửa'</strong> để tự do thay đổi Họ tên, Email, Vai trò, Chức danh.
              </p>
            </div>
          </div>

          {canManageUsers(currentUser) && (
            <button
              onClick={() => {
                setAddFormName('');
                setAddFormEmail('');
                setAddFormRole('bgh');
                setAddFormTitle('Phó Hiệu trưởng');
                setAddFormPassword('Lhl@2026');
                setAddFormCampusId('');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <UserPlus size={15} />
              <span>+ Thêm Tài Khoản Quản Trị / BGH</span>
            </button>
          )}
        </div>

        {/* Dynamic Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {leadershipUsers.map((u) => {
            const isRole1 = u.role === 'super_admin' || u.role === 'admin';
            const roleBadgeClass = isRole1
              ? 'bg-purple-100 text-purple-800 border-purple-200'
              : 'bg-amber-100 text-amber-800 border-amber-200';
            const roleLabel = isRole1 ? 'Role 1: Quản trị viên' : 'Role 2: Ban Giám Hiệu';
            const campusObj = campuses.find((c) => c.id === u.campusId);

            return (
              <div
                key={u.id}
                className="p-4 rounded-xl border border-slate-200 bg-linear-to-b from-white to-slate-50/70 hover:shadow-sm transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                        isRole1 ? 'bg-purple-600 text-white shadow-xs' : 'bg-amber-500 text-white shadow-xs'
                      }`}>
                        {isRole1 ? <ShieldCheck size={18} /> : <Award size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 truncate" title={u.name}>
                          {u.name}
                        </div>
                        <div className="text-xs text-indigo-700 font-bold truncate" title={u.title}>
                          {u.title || roleLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canManageUsers(currentUser) && (
                        <>
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Sửa thông tin tài khoản (Họ tên, Email, Vai trò, Chức danh)"
                          >
                            <Pencil size={13} className="text-blue-600" />
                            <span>Sửa</span>
                          </button>

                          {u.id !== currentUser.id && u.id !== 'u_admin' && u.id !== 'u_admin_hung' && (
                            <button
                              onClick={() => handleDeleteLeadershipUser(u)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">Vai trò:</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${roleBadgeClass}`}>
                        {roleLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">Email Google:</span>
                      <span className="text-xs font-mono text-slate-900 truncate font-semibold" title={u.email}>
                        {u.email || <span className="text-amber-600 italic">Chưa có email</span>}
                      </span>
                    </div>

                    {campusObj && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400">Phân hiệu:</span>
                        <span className="text-xs font-medium text-slate-700">{campusObj.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono text-[10px]">ID: {u.id}</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <CheckCircle2 size={12} /> Đang hoạt động
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-linear-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">Chỉnh Sửa Tài Khoản Lãnh Đạo</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Cập nhật thông tin cho {editingUser.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Họ và tên <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  placeholder="Ví dụ: Thầy Nguyễn Văn Sơn"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Địa chỉ Email đăng nhập Google <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="email"
                  required
                  value={editFormEmail}
                  onChange={(e) => setEditFormEmail(e.target.value)}
                  placeholder="Ví dụ: nguyenvanson.hieutruong@lehuulap.edu.vn"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Vai trò hệ thống <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={editFormRole}
                    onChange={(e) => setEditFormRole(e.target.value as RoleType)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-indigo-500 cursor-pointer"
                  >
                    <option value="super_admin">Role 1: Quản trị viên (Super Admin)</option>
                    <option value="bgh">Role 2: Ban Giám Hiệu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chức danh / Chức vụ <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormTitle}
                    onChange={(e) => setEditFormTitle(e.target.value)}
                    placeholder="Ví dụ: Hiệu trưởng, Phó Hiệu trưởng..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Suggestions chips for title */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400 font-semibold">Gợi ý chức danh:</span>
                {['Hiệu trưởng', 'Phó Hiệu trưởng', 'Phó Hiệu trưởng phụ trách thi đua', 'Quản trị viên hệ thống'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditFormTitle(t)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {t}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mật khẩu mới (Tùy chọn - để trống nếu giữ nguyên):
                </label>
                <input
                  type="text"
                  value={editFormPassword}
                  onChange={(e) => setEditFormPassword(e.target.value)}
                  placeholder="Để trống để giữ nguyên mật khẩu cũ..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="bg-linear-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold leading-tight">Thêm Mới Tài Khoản Lãnh Đạo / BGH</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Tạo tài khoản quản trị viên (Role 1) hoặc Ban Giám Hiệu (Role 2)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Họ và tên <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={addFormName}
                  onChange={(e) => setAddFormName(e.target.value)}
                  placeholder="Ví dụ: Thầy Hoàng Văn Sơn"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Địa chỉ Email đăng nhập Google <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="email"
                  required
                  value={addFormEmail}
                  onChange={(e) => setAddFormEmail(e.target.value)}
                  placeholder="Ví dụ: hoangvanson.bgh@gmail.com"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Vai trò hệ thống <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={addFormRole}
                    onChange={(e) => setAddFormRole(e.target.value as RoleType)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-indigo-500 cursor-pointer"
                  >
                    <option value="bgh">Role 2: Ban Giám Hiệu</option>
                    <option value="super_admin">Role 1: Quản trị viên (Super Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chức danh / Chức vụ <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormTitle}
                    onChange={(e) => setAddFormTitle(e.target.value)}
                    placeholder="Ví dụ: Phó Hiệu trưởng, Hiệu trưởng..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Suggestions chips for title */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400 font-semibold">Gợi ý chức danh:</span>
                {['Phó Hiệu trưởng', 'Hiệu trưởng', 'Phó Hiệu trưởng phụ trách thi đua', 'Quản trị viên hệ thống'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAddFormTitle(t)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {t}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mật khẩu ban đầu:
                </label>
                <input
                  type="text"
                  value={addFormPassword}
                  onChange={(e) => setAddFormPassword(e.target.value)}
                  placeholder="Mặc định: Lhl@2026 (BGH) hoặc Admin@123 (Quản trị viên)"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Tạo Tài Khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION: 59 Homeroom Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <GraduationCap size={18} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                2. Danh Sách Gán Email Cho 59 Giáo Viên Chủ Nhiệm
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hiển thị đầy đủ 59 lớp học và tên Giáo viên chủ nhiệm đã được chốt. Nhập địa chỉ Gmail để cấp quyền.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAutoFillTemplate}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-600" />
              <span>Điền mẫu tự động</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Xuất Excel / CSV</span>
            </button>

            <button
              onClick={handleBatchSaveAll}
              disabled={isBatchSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isBatchSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu 59 lớp...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Lưu tất cả thay đổi</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Lớp, GVCN, Gmail..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Campus Filter */}
          <div>
            <select
              value={selectedCampusFilter}
              onChange={(e) => setSelectedCampusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">🏢 Tất cả 6 Phân hiệu</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">🎓 Tất cả các Khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-blue-500 cursor-pointer"
            >
              <option value="all">✨ Tất cả trạng thái ({teacherRows.length})</option>
              <option value="assigned">✅ Đã gán Gmail ({assignedCount})</option>
              <option value="unassigned">⚠️ Chưa gán Gmail ({unassignedCount})</option>
            </select>
          </div>
        </div>

        {/* 59 Classes Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 w-24">Lớp</th>
                <th className="py-3 px-3 w-40">Phân hiệu</th>
                <th className="py-3 px-3 w-52">Giáo viên chủ nhiệm</th>
                <th className="py-3 px-3 min-w-[280px]">Địa chỉ Email Google (Gmail)</th>
                <th className="py-3 px-3 text-center w-28">Trạng thái</th>
                <th className="py-3 px-3 text-center w-20">Lưu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeacherRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredTeacherRows.map((row) => {
                  const isRowSaving = savingRows[row.classItem.id];
                  const isModified = row.isModified;

                  return (
                    <tr
                      key={row.classItem.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isModified ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {row.stt}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-extrabold text-blue-900 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md">
                          {row.classItem.name}
                        </span>
                        <span className="ml-1 text-[10px] text-slate-500 font-medium">
                          Khối {row.classItem.grade}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-700 truncate max-w-[160px]">
                        {row.campusName}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900">
                        {row.teacherName}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="email"
                            value={row.currentEmail}
                            onChange={(e) =>
                              handleEmailChange(row.classItem.id, e.target.value)
                            }
                            placeholder="Nhập Gmail của GVCN..."
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono transition-all border ${
                              row.hasEmail
                                ? 'bg-white border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900'
                                : 'bg-amber-50/60 border-amber-300 text-amber-900 placeholder:text-amber-700/60'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {row.hasEmail ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check size={11} /> Đã kích hoạt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={11} /> Chưa có
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveRow(row.classItem.id, row.teacherUser?.id)
                          }
                          disabled={isRowSaving}
                          title="Lưu dòng này"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isRowSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info in Table */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div>
            Hiển thị <strong>{filteredTeacherRows.length}</strong> / <strong>{totalClasses}</strong> lớp học.
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Đã gán: {assignedCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Chưa gán: {unassignedCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
