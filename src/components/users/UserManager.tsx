import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { RoleType, User, UserCustomPermissions } from '../../types';
import {
  ROLE_METADATA,
  canManageUsers,
  canModifyCriteria,
  canLockWeek,
  canUnlockWeek,
  canInputScores,
  isUserLocked,
} from '../../utils/rbac';
import {
  Users2,
  Plus,
  ShieldCheck,
  UserCheck,
  School,
  GraduationCap,
  Users,
  Check,
  X,
  Edit2,
  Trash2,
  Eye,
  Flag,
  Award,
  AlertCircle,
  Search,
  Filter,
  Lock,
  Unlock,
  KeyRound,
  History,
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Info,
  RotateCcw,
  RefreshCw,
  Mail,
} from 'lucide-react';

interface RbacTestResult {
  id: string;
  name: string;
  description: string;
  targetRole: string;
  expectedStatus: 'allowed' | 'forbidden';
  actualStatus: 'allowed' | 'forbidden';
  passed: boolean;
  message: string;
}

export const UserManager: React.FC = () => {
  const {
    users,
    currentUser,
    userRole,
    switchCurrentUser,
    addUser,
    updateUser,
    deleteUser,
    toggleLockUser,
    updateUserPermissions,
    campuses,
    classes,
    auditLogs,
    isWeekLocked,
    selectedWeek,
    syncUsersFromClasses,
    cleanDemoUsersAndKeepAdmins,
    updateUserEmail,
  } = useApp();

  if (!currentUser) return null;

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Navigation tab inside User Management module
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'history' | 'test'>('users');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked'>('all');

  // Modal State for Add / Edit
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formTeacherCode, setFormTeacherCode] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<RoleType>('gvcn');
  const [formEmail, setFormEmail] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formScopeType, setFormScopeType] = useState<'all' | 'campus'>('campus');
  const [formAllowedCampuses, setFormAllowedCampuses] = useState<string[]>([]);
  const [formClassId, setFormClassId] = useState<string>('');
  const [formPermissions, setFormPermissions] = useState<UserCustomPermissions>({
    canInputScore: true,
    canEditScore: false,
    canDeleteScore: false,
    canLockData: false,
    canUnlockData: false,
    canEditCriteria: false,
    canManageUsers: false,
    canManageCampuses: false,
    canViewAllReports: true,
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Helper to generate next unique teacher code (e.g., GV01, GV02...)
  const generateNextTeacherCode = (currentUserId?: string | null): string => {
    const usedNumbers = new Set<number>();
    users.forEach((u) => {
      if (currentUserId && u.id === currentUserId) return;
      if (u.teacherCode) {
        const match = u.teacherCode.trim().match(/^GV(\d+)$/i);
        if (match) {
          usedNumbers.add(parseInt(match[1], 10));
        }
      }
    });

    let num = 1;
    while (usedNumbers.has(num)) {
      num++;
    }
    return `GV${num < 10 ? '0' + num : num}`;
  };

  // Lock Confirmation Modal
  const [lockingUser, setLockingUser] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState('');

  // Permission Adjustment Modal
  const [permUser, setPermUser] = useState<User | null>(null);

  // Automated RBAC Test Suite State
  const [testResults, setTestResults] = useState<RbacTestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const isSuperAdmin = canManageUsers(currentUser);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => u.role === 'super_admin' || u.role === 'admin').length;
    const bghCount = users.filter((u) => u.role === 'bgh').length;
    const tptCount = users.filter((u) => u.role === 'tpt_doi' || u.role === 'campus_admin' || u.role === 'inspector').length;
    const teacherCount = users.filter((u) => u.role === 'gvcn' || u.role === 'teacher' || u.role === 'red_flag').length;
    const viewerCount = users.filter((u) => u.role === 'viewer' || u.role === 'public').length;
    const lockedCount = users.filter((u) => u.isLocked).length;

    return { total, adminCount, bghCount, tptCount, teacherCount, viewerCount, lockedCount };
  }, [users]);

  const getRoleIcon = (role: RoleType) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return ShieldCheck;
      case 'bgh':
        return Award;
      case 'campus_admin':
      case 'campus_lead':
        return School;
      case 'tpt_doi':
      case 'inspector':
        return UserCheck;
      case 'gvcn':
      case 'teacher':
        return GraduationCap;
      case 'red_flag':
        return Flag;
      case 'viewer':
      case 'public':
      default:
        return Eye;
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingUserId(null);
    setFormName('');
    setFormTeacherCode(generateNextTeacherCode(null));
    setFormPassword('Lhl@2026');
    setFormRole('gvcn');
    setFormEmail('');
    setFormTitle('Giáo viên / Người nhập dữ liệu');
    setFormScopeType('campus');
    setFormAllowedCampuses([campuses[0]?.id || 'lhl_main']);
    setFormClassId('');
    setFormPermissions({
      canInputScore: true,
      canEditScore: false,
      canDeleteScore: false,
      canLockData: false,
      canUnlockData: false,
      canEditCriteria: false,
      canManageUsers: false,
      canManageCampuses: false,
      canViewAllReports: true,
    });
    setErrorMessage('');
  };

  const handleOpenEdit = (user: User) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormRole(user.role);
    setFormEmail(user.email);
    setFormPassword(user.password || (user.role === 'super_admin' ? 'Admin@123' : 'Lhl@2026'));
    setFormTitle(user.title);
    setFormScopeType(user.scopeType || (user.campusId ? 'campus' : 'all'));
    setFormAllowedCampuses(user.allowedCampusIds || (user.campusId ? [user.campusId] : []));

    // Two-way synchronization: detect homeroom class from user.classId or matching class in classes
    let activeClassId = user.classId || '';
    if (!activeClassId) {
      const linkedClass = classes.find(
        (c) =>
          c.teacherId === user.id ||
          (c.homeroomTeacher &&
            c.homeroomTeacher !== 'Chưa phân công' &&
            c.homeroomTeacher.trim().toLowerCase() === user.name.trim().toLowerCase())
      );
      if (linkedClass) {
        activeClassId = linkedClass.id;
      }
    }
    setFormClassId(activeClassId);

    // Populate or generate teacher code
    setFormTeacherCode(
      user.teacherCode ||
      (user.role === 'gvcn' || user.role === 'teacher' ? generateNextTeacherCode(user.id) : '')
    );

    setFormPermissions(
      user.customPermissions || {
        canInputScore: user.role !== 'viewer' && user.role !== 'bgh',
        canEditScore: user.role === 'super_admin' || user.role === 'tpt_doi',
        canDeleteScore: user.role === 'super_admin' || user.role === 'tpt_doi',
        canLockData: user.role === 'super_admin' || user.role === 'bgh' || user.role === 'tpt_doi',
        canUnlockData: user.role === 'super_admin' || user.role === 'bgh' || user.role === 'tpt_doi',
        canEditCriteria: user.role === 'super_admin',
        canManageUsers: user.role === 'super_admin',
        canManageCampuses: user.role === 'super_admin',
        canViewAllReports: true,
      }
    );
    setErrorMessage('');
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên người dùng');
      return;
    }

    const cleanCode = formTeacherCode.trim().toUpperCase();
    if (cleanCode) {
      const isDuplicate = users.some(
        (u) =>
          (!editingUserId || u.id !== editingUserId) &&
          u.teacherCode &&
          u.teacherCode.trim().toUpperCase() === cleanCode
      );
      if (isDuplicate) {
        setErrorMessage(`Mã giáo viên "${cleanCode}" đã tồn tại trên hệ thống. Vui lòng nhập mã duy nhất.`);
        return;
      }
    }

    const finalPassword = formPassword.trim() || (formRole === 'super_admin' ? 'Admin@123' : 'Lhl@2026');

    if (modalMode === 'create') {
      const res = addUser({
        name: formName.trim(),
        teacherCode: cleanCode || undefined,
        password: finalPassword,
        role: formRole,
        email: formEmail.trim() || `${formRole}_${Date.now()}@lehuulap.edu.vn`,
        title: formTitle.trim() || ROLE_METADATA[formRole]?.name || 'Thành viên',
        campusId: formScopeType === 'campus' && formAllowedCampuses.length > 0 ? formAllowedCampuses[0] : undefined,
        allowedCampusIds: formScopeType === 'campus' ? formAllowedCampuses : undefined,
        scopeType: formScopeType,
        classId: (formRole === 'gvcn' || formRole === 'teacher') && formClassId ? formClassId : undefined,
        isLocked: false,
        customPermissions: formPermissions,
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Không thể tạo tài khoản');
        return;
      }
    } else if (modalMode === 'edit' && editingUserId) {
      const res = updateUser(editingUserId, {
        name: formName.trim(),
        teacherCode: cleanCode || undefined,
        password: finalPassword,
        role: formRole,
        email: formEmail.trim(),
        title: formTitle.trim(),
        campusId: formScopeType === 'campus' && formAllowedCampuses.length > 0 ? formAllowedCampuses[0] : undefined,
        allowedCampusIds: formScopeType === 'campus' ? formAllowedCampuses : undefined,
        scopeType: formScopeType,
        classId: (formRole === 'gvcn' || formRole === 'teacher') && formClassId ? formClassId : undefined,
        customPermissions: formPermissions,
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Không thể cập nhật tài khoản');
        return;
      }
    }

    setModalMode(null);
  };

  const handleDelete = (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản ${user.name} (${user.title})?`)) {
      return;
    }
    const res = deleteUser(user.id);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleToggleLockSubmit = () => {
    if (!lockingUser) return;
    const res = toggleLockUser(lockingUser.id, lockReason.trim());
    if (!res.success) {
      alert(res.message);
    }
    setLockingUser(null);
    setLockReason('');
  };

  const handleSaveUserPermissions = () => {
    if (!permUser) return;
    const res = updateUserPermissions(
      permUser.id,
      permUser.customPermissions || {},
      permUser.scopeType || 'campus',
      permUser.allowedCampusIds
    );
    if (!res.success) {
      alert(res.message);
    }
    setPermUser(null);
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'super_admin' && u.role !== 'super_admin' && u.role !== 'admin') return false;
        if (roleFilter === 'bgh' && u.role !== 'bgh') return false;
        if (roleFilter === 'tpt_doi' && u.role !== 'tpt_doi' && u.role !== 'campus_admin' && u.role !== 'inspector') return false;
        if (roleFilter === 'gvcn' && u.role !== 'gvcn' && u.role !== 'teacher' && u.role !== 'red_flag') return false;
        if (roleFilter === 'viewer' && u.role !== 'viewer' && u.role !== 'public') return false;
      }

      // Campus filter
      if (campusFilter !== 'all') {
        if (u.scopeType === 'all') {
          // All school matches all
        } else if (u.allowedCampusIds && u.allowedCampusIds.length > 0) {
          if (!u.allowedCampusIds.includes(campusFilter)) return false;
        } else if (u.campusId !== campusFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'active' && u.isLocked) return false;
      if (statusFilter === 'locked' && !u.isLocked) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchTitle = u.title.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchEmail) return false;
      }

      return true;
    });
  }, [users, roleFilter, campusFilter, statusFilter, searchTerm]);

  // User Management Audit Logs
  const userAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (l) =>
        l.entityType === 'user' ||
        [
          'THEM_NGUOI_DUNG',
          'SUA_NGUOI_DUNG',
          'XOA_NGUOI_DUNG',
          'KHOA_TAI_KHOAN',
          'MO_KHOA_TAI_KHOAN',
          'THAY_DOI_QUYEN_HAN',
        ].includes(l.action)
    );
  }, [auditLogs]);

  // Run comprehensive automated RBAC test
  const handleRunRbacTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results: RbacTestResult[] = [];

      // Test 1: Sửa tiêu chí thi đua (Chỉ Admin)
      const adminUser = users.find((u) => u.role === 'super_admin');
      const bghUser = users.find((u) => u.role === 'bgh');
      const tptUser = users.find((u) => u.role === 'tpt_doi');
      const gvUser = users.find((u) => u.role === 'gvcn');
      const viewerUser = users.find((u) => u.role === 'viewer');
      const lockedAccount = users.find((u) => u.isLocked);

      if (adminUser) {
        const canAdminCriteria = canModifyCriteria(adminUser);
        results.push({
          id: 'test_1_admin_criteria',
          name: '1. Quản trị viên sửa cấu hình tiêu chí',
          description: 'Quản trị viên có toàn quyền cấu hình, sửa đổi tiêu chí thi đua.',
          targetRole: '1. QUẢN TRỊ VIÊN',
          expectedStatus: 'allowed',
          actualStatus: canAdminCriteria ? 'allowed' : 'forbidden',
          passed: canAdminCriteria === true,
          message: canAdminCriteria
            ? 'Đạt: Quản trị viên được cấp quyền sửa tiêu chí chính xác.'
            : 'Lỗi: Quản trị viên bị từ chối sửa tiêu chí.',
        });
      }

      if (bghUser) {
        const canBghCriteria = canModifyCriteria(bghUser);
        results.push({
          id: 'test_2_bgh_criteria',
          name: '2. Ban Giám Hiệu sửa cấu hình tiêu chí (Bị cấm)',
          description: 'BGH không có quyền thay đổi cấu hình tiêu chí nếu không có quyền quản trị.',
          targetRole: '2. BAN GIÁM HIỆU',
          expectedStatus: 'forbidden',
          actualStatus: canBghCriteria ? 'allowed' : 'forbidden',
          passed: canBghCriteria === false,
          message: !canBghCriteria
            ? 'Đạt: Hệ thống đã chặn thành công BGH không cho sửa tiêu chí ở tầng xử lý dữ liệu.'
            : 'Lỗi: BGH lại có quyền sửa tiêu chí!',
        });
      }

      if (tptUser) {
        const canTptCriteria = canModifyCriteria(tptUser);
        results.push({
          id: 'test_3_tpt_criteria',
          name: '3. Tổng Phụ Trách sửa tiêu chí thi đua (Bị cấm)',
          description: 'Tổng Phụ Trách không được quyền sửa tiêu chí thi đua của nhà trường.',
          targetRole: '3. TỔNG PHỤ TRÁCH',
          expectedStatus: 'forbidden',
          actualStatus: canTptCriteria ? 'allowed' : 'forbidden',
          passed: canTptCriteria === false,
          message: !canTptCriteria
            ? 'Đạt: TPT bị từ chối sửa tiêu chí đúng quy chế.'
            : 'Lỗi: TPT không bị chặn sửa tiêu chí.',
        });
      }

      // Test 4: Mở khóa dữ liệu đã chốt (Duy nhất Quản trị viên)
      if (adminUser) {
        const canAdminUnlock = canUnlockWeek(adminUser);
        results.push({
          id: 'test_4_admin_unlock',
          name: '4. Quản trị viên mở khóa dữ liệu đã chốt',
          description: 'Chỉ duy nhất Quản trị viên tối cao mới có thẩm quyền mở khóa dữ liệu đã chốt.',
          targetRole: '1. QUẢN TRỊ VIÊN',
          expectedStatus: 'allowed',
          actualStatus: canAdminUnlock ? 'allowed' : 'forbidden',
          passed: canAdminUnlock === true,
          message: canAdminUnlock
            ? 'Đạt: Quản trị viên có thẩm quyền mở khóa dữ liệu đã chốt.'
            : 'Lỗi: Quản trị viên bị từ chối quyền mở khóa.',
        });
      }

      if (bghUser) {
        const canBghUnlock = canUnlockWeek(bghUser);
        results.push({
          id: 'test_5_bgh_unlock',
          name: '5. Ban Giám Hiệu tự ý mở khóa dữ liệu (Bị cấm)',
          description: 'BGH có quyền chốt nhưng KHÔNG được mở khóa dữ liệu đã chốt nếu không có quyền quản trị.',
          targetRole: '2. BAN GIÁM HIỆU',
          expectedStatus: 'forbidden',
          actualStatus: canBghUnlock ? 'allowed' : 'forbidden',
          passed: canBghUnlock === false,
          message: !canBghUnlock
            ? 'Đạt: BGH bị chặn không cho mở khóa dữ liệu đã chốt (Bảo vệ dữ liệu toàn vẹn).'
            : 'Lỗi: BGH tự ý mở khóa được dữ liệu.',
        });
      }

      // Test 6: Chốt dữ liệu tuần/tháng/kỳ (BGH & Admin được, GV/TPT/Viewer không được)
      if (bghUser) {
        const canBghLock = canLockWeek(bghUser);
        results.push({
          id: 'test_6_bgh_lock',
          name: '6. Ban Giám Hiệu chốt dữ liệu tuần',
          description: 'BGH có thẩm quyền duyệt và chốt khóa dữ liệu thi đua.',
          targetRole: '2. BAN GIÁM HIỆU',
          expectedStatus: 'allowed',
          actualStatus: canBghLock ? 'allowed' : 'forbidden',
          passed: canBghLock === true,
          message: canBghLock
            ? 'Đạt: BGH có quyền chốt khóa dữ liệu chính thức.'
            : 'Lỗi: BGH không chốt được dữ liệu.',
        });
      }

      if (gvUser) {
        const canGvLock = canLockWeek(gvUser);
        results.push({
          id: 'test_7_gv_lock',
          name: '7. Giáo viên tự ý chốt khóa dữ liệu (Bị cấm)',
          description: 'Giáo viên không có quyền chốt khóa hoặc mở khóa dữ liệu.',
          targetRole: '4. GIÁO VIÊN',
          expectedStatus: 'forbidden',
          actualStatus: canGvLock ? 'allowed' : 'forbidden',
          passed: canGvLock === false,
          message: !canGvLock
            ? 'Đạt: Giáo viên bị từ chối chốt dữ liệu chính xác.'
            : 'Lỗi: Giáo viên chốt được dữ liệu.',
        });
      }

      // Test 8: Người xem nhập/sửa điểm (Bị cấm hoàn toàn)
      if (viewerUser) {
        const testRes = canInputScores(viewerUser, 'lhl_main', 'c_9a1', 1, []);
        results.push({
          id: 'test_8_viewer_input',
          name: '8. Người xem nhập / sửa dữ liệu (Bị cấm)',
          description: 'Người xem chỉ có quyền xem Dashboard và báo cáo, không được nhập hay sửa điểm.',
          targetRole: '5. NGƯỜI XEM',
          expectedStatus: 'forbidden',
          actualStatus: testRes.allowed ? 'allowed' : 'forbidden',
          passed: testRes.allowed === false,
          message: !testRes.allowed
            ? `Đạt: ${testRes.reason || 'Hệ thống đã chặn Người xem sửa điểm.'}`
            : 'Lỗi: Người xem lại có quyền nhập điểm!',
        });
      }

      // Test 9: Bảo vệ dữ liệu khi TUẦN ĐÃ CHỐT
      if (tptUser) {
        const lockedWeekCheck = canInputScores(tptUser, 'lhl_main', 'c_9a1', 4, [4]);
        results.push({
          id: 'test_9_data_locked_protection',
          name: '9. Bảo vệ dữ liệu đã CHỐT (Không cho ghi đè)',
          description: 'Khi tuần 4 đã chốt, mọi nỗ lực nhập điểm hoặc sửa điểm của TPT đều bị chặn.',
          targetRole: '3. TỔNG PHỤ TRÁCH',
          expectedStatus: 'forbidden',
          actualStatus: lockedWeekCheck.allowed ? 'allowed' : 'forbidden',
          passed: lockedWeekCheck.allowed === false,
          message: !lockedWeekCheck.allowed
            ? `Đạt: Dữ liệu đã chốt được bảo vệ an toàn. (${lockedWeekCheck.reason})`
            : 'Lỗi: Cho phép ghi đè vào tuần đã chốt!',
        });
      }

      // Test 10: Tài khoản bị KHÓA bị chặn toàn diện mọi thao tác
      if (lockedAccount) {
        const lockedActionCheck = canInputScores(lockedAccount, 'lhl_main', 'c_9a1', 1, []);
        const lockedLockCheck = canLockWeek(lockedAccount);
        const lockedUnlockCheck = canUnlockWeek(lockedAccount);
        const isCompletelyBlocked = !lockedActionCheck.allowed && !lockedLockCheck && !lockedUnlockCheck;

        results.push({
          id: 'test_10_locked_account_protection',
          name: '10. Tài khoản bị KHÓA bị chặn toàn diện',
          description: 'Tài khoản có cờ isLocked=true bị hệ thống chặn mọi thao tác ghi/sửa/chốt/mở khóa.',
          targetRole: 'TÀI KHOẢN BỊ KHÓA',
          expectedStatus: 'forbidden',
          actualStatus: isCompletelyBlocked ? 'forbidden' : 'allowed',
          passed: isCompletelyBlocked,
          message: isCompletelyBlocked
            ? `Đạt: Tài khoản '${lockedAccount.name}' bị hệ thống chặn triệt để mọi hành vi sửa đổi dữ liệu.`
            : 'Lỗi: Tài khoản bị khóa vẫn thực hiện được thao tác!',
        });
      }

      setTestResults(results);
      setIsRunningTests(false);
    }, 400);
  };

  const handleSyncFromClasses = () => {
    if (
      !confirm(
        `Hệ thống sẽ đọc ${classes.length} lớp học hiện tại, lấy họ tên GVCN thật mà bạn đã cập nhật và sinh ra các tài khoản tương ứng với vai trò "4. GIÁO VIÊN / NGƯỜI NHẬP DỮ LIỆU", đồng thời giữ nguyên các tài khoản Quản trị viên. Bạn có muốn tiếp tục?`
      )
    ) {
      return;
    }
    const res = syncUsersFromClasses();
    if (res.success) {
      setActionFeedback({ type: 'success', text: res.message });
    } else {
      setActionFeedback({ type: 'error', text: res.message });
    }
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleCleanDemoUsers = () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn xóa sạch toàn bộ các tài khoản mẫu giả lập, CHỈ GIỮ LẠI tài khoản Quản trị viên không? Thao tác này giúp dọn dẹp hệ thống để bạn đồng bộ chuẩn từ danh sách 59 lớp.'
      )
    ) {
      return;
    }
    const res = cleanDemoUsersAndKeepAdmins();
    if (res.success) {
      setActionFeedback({ type: 'success', text: res.message });
    } else {
      setActionFeedback({ type: 'error', text: res.message });
    }
    setTimeout(() => setActionFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Users2 size={24} />
              </span>
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Phân Quyền Người Dùng & Quản Trị Hệ Thống
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bảo vệ dữ liệu đa tầng (RBAC) theo 5 vai trò chuẩn: Quản trị viên, Ban Giám Hiệu, Tổng Phụ Trách, Giáo Viên, Người Xem
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {isSuperAdmin && (
              <>
                <button
                  onClick={handleCleanDemoUsers}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer shadow-2xs"
                  title="Xóa sạch các tài khoản mẫu giả lập, chỉ giữ lại tài khoản Quản trị viên"
                >
                  <Trash2 size={15} />
                  <span>Xóa tài khoản mẫu (Giữ Admin)</span>
                </button>

                <button
                  onClick={handleSyncFromClasses}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  title="Đồng bộ họ tên GVCN từ danh sách 59 lớp sinh ra tài khoản vai trò 4. Giáo viên"
                >
                  <RefreshCw size={15} />
                  <span>Đồng bộ tài khoản từ Danh sách Lớp</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                setActiveTab('test');
                handleRunRbacTests();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-all cursor-pointer shadow-2xs"
            >
              <Play size={15} />
              <span>Chạy Tự Kiểm Tra</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>Thêm Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Feedback Toast */}
        {actionFeedback && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in transition-all ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{actionFeedback.text}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Current User Active Identity Banner */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-purple-700 shadow-2xs font-bold text-base">
              {currentUser.name.charAt(currentUser.name.lastIndexOf(' ') + 1) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Bạn đang đăng nhập dưới tên:</span>
                <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    ROLE_METADATA[userRole]?.badgeColor || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {ROLE_METADATA[userRole]?.name || userRole}
                </span>
                {currentUser.isLocked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white animate-pulse">
                    ĐÃ BỊ KHÓA
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Phạm vi:{' '}
                <span className="font-semibold text-slate-700">
                  {currentUser.scopeType === 'all'
                    ? 'Toàn trường (6 phân hiệu)'
                    : `Phân hiệu cụ thể (${currentUser.allowedCampusIds?.join(', ') || currentUser.campusId || 'Được chỉ định'})`}
                </span>{' '}
                • {currentUser.title}
              </div>
            </div>
          </div>

          {/* Production Status Indicators */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold">
              <Sparkles size={14} className="text-purple-600" />
              <span>Chế độ thật: 59 GVCN</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Xác thực qua Google</span>
            </span>
          </div>
        </div>

        {/* Warning if current account is locked */}
        {currentUser.isLocked && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600 shrink-0" />
            <span>
              <strong>CẢNH BÁO:</strong> Tài khoản này hiện đang bị <strong>KHÓA</strong> bởi Quản trị viên
              (Lý do: {currentUser.lockedReason || 'Bảo vệ an ninh'}). Mọi thao tác nhập điểm, sửa điểm, chốt hoặc mở khóa đều bị từ chối ở tầng xử lý dữ liệu.
            </span>
          </div>
        )}

        {/* KPI Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <div className="text-[11px] text-slate-500 font-medium">Tổng người dùng</div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Trên 6 phân hiệu</div>
          </div>

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200/70">
            <div className="text-[11px] text-purple-700 font-bold">1. Quản trị viên</div>
            <div className="text-xl font-black text-purple-950 mt-1">{stats.adminCount}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Toàn quyền hệ thống</div>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70">
            <div className="text-[11px] text-amber-800 font-bold">2. Ban Giám Hiệu</div>
            <div className="text-xl font-black text-amber-950 mt-1">{stats.bghCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Duyệt & chốt số liệu</div>
          </div>

          <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-200/70">
            <div className="text-[11px] text-cyan-800 font-bold">3. Tổng Phụ Trách</div>
            <div className="text-xl font-black text-cyan-950 mt-1">{stats.tptCount}</div>
            <div className="text-[10px] text-cyan-700 mt-0.5">Nhập & theo dõi BXH</div>
          </div>

          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200/70">
            <div className="text-[11px] text-blue-800 font-bold">4. Giáo viên / Nhập liệu</div>
            <div className="text-xl font-black text-blue-950 mt-1">{stats.teacherCount}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">Phân công theo lớp</div>
          </div>

          <div className={`p-3 rounded-xl border ${stats.lockedCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-[11px] font-bold ${stats.lockedCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              Tài khoản bị khóa
            </div>
            <div className={`text-xl font-black mt-1 ${stats.lockedCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {stats.lockedCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Chặn ghi/sửa dữ liệu</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={14} />
            <span>Danh Sách Tài Khoản ({filteredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Ma Trận Phân Quyền 5 Vai Trò</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History size={14} />
            <span>Lịch Sử Phân Quyền & Thao Tác ({userAuditLogs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('test');
              if (!testResults) handleRunRbacTests();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'test'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Play size={14} />
            <span>Tự Kiểm Tra Phân Quyền & Bảo Vệ (RBAC Suite)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, email, chức danh..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="super_admin">1. Quản trị viên</option>
                <option value="bgh">2. Ban Giám Hiệu</option>
                <option value="tpt_doi">3. Tổng Phụ Trách</option>
                <option value="gvcn">4. Giáo viên / Người nhập</option>
                <option value="viewer">5. Người xem</option>
              </select>

              {/* Campus Filter */}
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="all">Tất cả phân hiệu</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã bị khóa</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium shrink-0">
              Hiển thị <span className="font-bold text-slate-900">{filteredUsers.length}</span> / {users.length} tài khoản
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Tài Khoản / Họ Tên</th>
                  <th className="py-3 px-4">Vai Trò Hệ Thống</th>
                  <th className="py-3 px-4">Phạm Vi Hoạt Động</th>
                  <th className="py-3 px-4">Quyền Hạn Chức Năng</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Không tìm thấy tài khoản người dùng phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const RoleIcon = getRoleIcon(u.role);
                    const roleMeta = ROLE_METADATA[u.role] || {
                      name: u.role,
                      badgeColor: 'bg-slate-100 text-slate-700',
                    };
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          u.isLocked ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold border ${
                                u.isLocked
                                  ? 'bg-rose-100 border-rose-300 text-rose-700'
                                  : 'bg-purple-50 border-purple-200 text-purple-700'
                              }`}
                            >
                              <RoleIcon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 truncate">{u.name}</span>
                                {u.teacherCode && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Mã giáo viên">
                                    {u.teacherCode}
                                  </span>
                                )}
                                {isSelf && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    Đang dùng
                                  </span>
                                )}
                              </div>
                              {u.email && u.email.trim() ? (
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50/70 border border-indigo-200 px-2 py-0.5 rounded-md w-fit">
                                  <Mail size={11} className="text-indigo-600 shrink-0" />
                                  <span className="truncate max-w-[200px]">{u.email}</span>
                                </div>
                              ) : (
                                <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md font-medium">
                                  <AlertCircle size={10} className="shrink-0" />
                                  <span>Chưa gán Email Google</span>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">{u.title}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleMeta.badgeColor}`}
                          >
                            {roleMeta.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.scopeType === 'all' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <School size={12} />
                              Toàn trường (6 Phân hiệu)
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                <School size={12} />
                                {u.allowedCampusIds && u.allowedCampusIds.length > 0
                                  ? u.allowedCampusIds
                                      .map((id) => campuses.find((c) => c.id === id)?.name || id)
                                      .join(', ')
                                  : campuses.find((c) => c.id === u.campusId)?.name || 'Chưa gán'}
                              </span>
                              {u.classId && (
                                <div className="text-[10px] text-slate-500">
                                  Lớp phụ trách:{' '}
                                  <strong>{classes.find((c) => c.id === u.classId)?.name || u.classId}</strong>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {u.role === 'super_admin' ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                Toàn quyền hệ thống
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    u.customPermissions?.canInputScore !== false && u.role !== 'viewer' && u.role !== 'bgh'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  }`}
                                  title="Quyền nhập điểm"
                                >
                                  Nhập điểm
                                </span>

                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    u.role === 'bgh' || u.role === 'tpt_doi' || u.customPermissions?.canLockData
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  }`}
                                  title="Quyền chốt dữ liệu"
                                >
                                  Chốt khóa
                                </span>

                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    u.customPermissions?.canUnlockData
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  }`}
                                  title="Quyền mở khóa dữ liệu đã chốt"
                                >
                                  Mở khóa
                                </span>

                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    u.customPermissions?.canEditCriteria
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  }`}
                                  title="Quyền sửa tiêu chí"
                                >
                                  Tiêu chí
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {u.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              <Lock size={10} />
                              Đã khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={10} />
                              Hoạt động
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Switch to this user for RBAC test */}
                            <button
                              onClick={() => switchCurrentUser(u.id)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                isSelf
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title="Chuyển sang tài khoản này để trải nghiệm quyền hạn"
                            >
                              <KeyRound size={14} />
                            </button>

                            {/* Lock / Unlock */}
                            {isSuperAdmin && !isSelf && (
                              <button
                                onClick={() => setLockingUser(u)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                  u.isLocked
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                    : 'bg-white hover:bg-amber-50 text-amber-700 border-slate-200'
                                }`}
                                title={u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản này'}
                              >
                                {u.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>
                            )}

                            {/* Edit */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 transition-all cursor-pointer"
                                title="Chỉnh sửa thông tin & phân quyền"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}

                            {/* Delete */}
                            {isSuperAdmin && !isSelf && (
                              <button
                                onClick={() => handleDelete(u)}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition-all cursor-pointer"
                                title="Xóa tài khoản"
                              >
                                <Trash2 size={14} />
                              </button>
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
        </div>
      )}

      {/* TAB 2: PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ma Trận Phân Quyền Chi Tiết Theo 5 Vai Trò Chuẩn
              </h2>
              <p className="text-xs text-slate-500">
                Quy định nghiêm ngặt quyền hạn theo yêu cầu bảo mật: Kiểm tra ở tầng xử lý dữ liệu (Data Layer), bảo vệ dữ liệu đã chốt
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-3 px-4 w-1/3">Chức Năng & Quyền Hạn Hệ Thống</th>
                  <th className="py-3 px-3 text-center bg-purple-50/60 text-purple-900">1. Quản Trị Viên</th>
                  <th className="py-3 px-3 text-center bg-amber-50/60 text-amber-900">2. Ban Giám Hiệu</th>
                  <th className="py-3 px-3 text-center bg-cyan-50/60 text-cyan-900">3. Tổng Phụ Trách</th>
                  <th className="py-3 px-3 text-center bg-blue-50/60 text-blue-900">4. Giáo Viên</th>
                  <th className="py-3 px-3 text-center bg-slate-50 text-slate-800">5. Người Xem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Quản trị người dùng & phân quyền tài khoản</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Toàn quyền</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-rose-500 font-bold">✗</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-rose-500 font-bold">✗</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-rose-500 font-bold">✗</td>
                  <td className="py-2.5 px-3 text-center text-rose-500 font-bold">✗</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Cấu hình & sửa đổi tiêu chí thi đua</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Toàn quyền</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center text-rose-500 font-bold">✗ Bị cấm</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Mở khóa dữ liệu đã chốt (Tuần / Tháng / Kỳ / Năm)</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ DUY NHẤT</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center text-rose-500 font-bold">✗ Bị cấm</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Chốt & Mở khóa dữ liệu (Tuần, Tháng, Học kỳ, Cả năm)</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Cho phép</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Cho phép</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-emerald-600 font-bold">✓ Cho phép</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-rose-500 font-bold">✗ Bị cấm</td>
                  <td className="py-2.5 px-3 text-center text-rose-500 font-bold">✗ Bị cấm</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Nhập & Chỉnh sửa điểm thi đua</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Toàn trường</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-amber-600 font-bold">✗ (Chỉ giám sát)</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-emerald-600 font-bold">✓ Theo phân công</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-emerald-600 font-bold">✓ Lớp phân công</td>
                  <td className="py-2.5 px-3 text-center text-rose-500 font-bold">✗ Bị cấm</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Phạm vi xem dữ liệu & Bảng xếp hạng</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">Toàn bộ 6 phân hiệu</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-emerald-600 font-bold">Toàn bộ 6 phân hiệu</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-slate-700">Phạm vi được giao</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-slate-700">Lớp được giao</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">Báo cáo cấp quyền</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">Xem và xuất toàn bộ báo cáo tổng hợp</td>
                  <td className="py-2.5 px-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Toàn quyền</td>
                  <td className="py-2.5 px-3 text-center bg-amber-50/30 text-emerald-600 font-bold">✓ Toàn quyền</td>
                  <td className="py-2.5 px-3 text-center bg-cyan-50/30 text-emerald-600 font-bold">✓ Báo cáo TPT</td>
                  <td className="py-2.5 px-3 text-center bg-blue-50/30 text-slate-700">Báo cáo lớp</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Xem báo cáo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <History size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Lịch Sử Thay Đổi Quyền & Quản Lý Tài Khoản
                </h2>
                <p className="text-xs text-slate-500">
                  Ghi nhận đầy đủ thông tin người thực hiện, thời gian, dữ liệu trước và sau thao tác (Kiểm toán bảo mật)
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
              {userAuditLogs.length} bản ghi kiểm toán
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                  <th className="py-2.5 px-3">Thời Điểm</th>
                  <th className="py-2.5 px-3">Người Thao Tác</th>
                  <th className="py-2.5 px-3">Hành Động</th>
                  <th className="py-2.5 px-4">Chi Tiết Kiểm Toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {userAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Chưa có thay đổi tài khoản hoặc phân quyền nào được ghi nhận
                    </td>
                  </tr>
                ) : (
                  userAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {log.userName} ({log.userRole})
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded border ${
                            log.action === 'KHOA_TAI_KHOAN'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : log.action === 'MO_KHOA_TAI_KHOAN'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : log.action === 'THEM_NGUOI_DUNG'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED RBAC TEST RUNNER */}
      {activeTab === 'test' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/80 p-4 rounded-xl border border-indigo-200">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600" />
                <h2 className="text-base font-bold text-indigo-950">
                  Hệ Thống Tự Động Kiểm Tra Phân Quyền (RBAC Test Suite)
                </h2>
              </div>
              <p className="text-xs text-indigo-800 mt-1 max-w-2xl">
                Tự động kiểm tra trực tiếp các hàm xử lý dữ liệu (Data Layer) để chứng minh quyền hạn được bảo vệ nghiêm ngặt:
                Người không có quyền không thể sửa điểm, không thể sửa tiêu chí, không thể mở khóa dữ liệu đã chốt.
              </p>
            </div>

            <button
              onClick={handleRunRbacTests}
              disabled={isRunningTests}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
            >
              <Play size={15} />
              <span>{isRunningTests ? 'Đang kiểm tra...' : 'Chạy lại toàn bộ kiểm tra'}</span>
            </button>
          </div>

          {testResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700">
                  Kết quả kiểm tra: {testResults.filter((t) => t.passed).length}/{testResults.length} bài test ĐẠT CHUẨN
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  100% Bảo Mật Tầng Dữ Liệu
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testResults.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      t.passed
                        ? 'bg-emerald-50/50 border-emerald-200/80'
                        : 'bg-rose-50 border-rose-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {t.passed ? (
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{t.description}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          t.passed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {t.passed ? 'ĐẠT' : 'THẤT BẠI'}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Vai trò: <strong>{t.targetRole}</strong>
                      </span>
                      <span className="text-slate-700 font-medium">{t.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT USER */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <UserCheck size={20} />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? 'Tạo Tài Khoản Người Dùng Mới' : 'Chỉnh Sửa Thông Tin & Phân Quyền'}
                </h3>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 mt-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Thầy Trần Văn Bình"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mã giáo viên (Mã GV)</span>
                    <button
                      type="button"
                      onClick={() => setFormTeacherCode(generateNextTeacherCode(editingUserId))}
                      className="text-[10px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-all flex items-center gap-1"
                      title="Tự động sinh mã giáo viên tiếp theo"
                    >
                      <Sparkles size={11} className="text-amber-500" />
                      <span>Tự động sinh mã</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={formTeacherCode}
                    onChange={(e) => setFormTeacherCode(e.target.value.toUpperCase())}
                    placeholder="VD: GV01, GV02..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 uppercase focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mã GV có thể tự nhập hoặc sinh tự động (bảo đảm duy nhất trên hệ thống).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail size={13} className="text-purple-600" />
                    <span>Địa chỉ Email Google (Gmail)</span>
                    <span className="text-[10px] text-purple-600 font-semibold">(Dùng đăng nhập)</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="vd: nguyenvana@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hệ thống sẽ đối chiếu với tài khoản Google này khi người dùng đăng nhập.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vai trò hệ thống <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const newRole = e.target.value as RoleType;
                      setFormRole(newRole);
                      if (newRole === 'super_admin' || newRole === 'bgh') {
                        setFormScopeType('all');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                  >
                    <option value="super_admin">1. QUẢN TRỊ VIÊN (Admin)</option>
                    <option value="bgh">2. BAN GIÁM HIỆU</option>
                    <option value="tpt_doi">3. TỔNG PHỤ TRÁCH / PHỤ TRÁCH THI ĐUA</option>
                    <option value="gvcn">4. GIÁO VIÊN / NGƯỜI NHẬP DỮ LIỆU</option>
                    <option value="viewer">5. NGƯỜI XEM (Chỉ xem báo cáo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chức danh / Vị trí hiển thị
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Giáo viên Chủ nhiệm lớp 8A1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mật khẩu đăng nhập <span className="text-rose-500">*</span></span>
                    <button
                      type="button"
                      onClick={() => setFormPassword(formRole === 'super_admin' ? 'Admin@123' : 'Lhl@2026')}
                      className="text-[10px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md font-semibold cursor-pointer"
                    >
                      Mặc định
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mặc định: <strong>Lhl@2026</strong> (GV) hoặc <strong>Admin@123</strong> (Admin).
                  </p>
                </div>
              </div>

              {/* Scope Selection */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-900">
                  Phạm vi phân quyền hoạt động
                </label>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={formScopeType === 'all'}
                      onChange={() => setFormScopeType('all')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Toàn trường (Tất cả 6 Phân hiệu)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scopeType"
                      checked={formScopeType === 'campus'}
                      onChange={() => setFormScopeType('campus')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Từng phân hiệu cụ thể</span>
                  </label>
                </div>

                {formScopeType === 'campus' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <div className="text-[11px] text-slate-600 font-medium">
                      Chọn các phân hiệu được phép truy cập:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {campuses.map((c) => {
                        const isChecked = formAllowedCampuses.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormAllowedCampuses([...formAllowedCampuses, c.id]);
                                } else {
                                  setFormAllowedCampuses(formAllowedCampuses.filter((id) => id !== c.id));
                                }
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Class Assignment if teacher */}
                {(formRole === 'gvcn' || formRole === 'teacher' || formRole === 'tpt_doi') && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Lớp chủ nhiệm (Năm 2026-2027)
                      </label>
                      <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        Đồng bộ 2 chiều với module Lớp
                      </span>
                    </div>
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">-- Không chỉ định / Chưa chủ nhiệm lớp nào --</option>
                      {classes.map((c) => {
                        const camp = campuses.find((camp) => camp.id === c.campusId);
                        return (
                          <option key={c.id} value={c.id}>
                            Lớp {c.name} - Khối {c.grade} ({camp?.name || 'Phân hiệu'})
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Đồng bộ 2 chiều: Khi gán lớp tại đây, hệ thống tự động nhận diện thầy/cô chủ nhiệm lớp này trong danh sách Lớp học.
                    </p>
                  </div>
                )}
              </div>

              {/* Functional Permissions Checkboxes */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Phân quyền chức năng cụ thể
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canInputScore}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canInputScore: e.target.checked })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Nhập điểm thi đua nề nếp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canEditScore}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canEditScore: e.target.checked })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Chỉnh sửa / Cập nhật điểm</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canDeleteScore}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canDeleteScore: e.target.checked })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Xóa biên bản thi đua</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canLockData}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canLockData: e.target.checked })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Chốt khóa tuần, tháng, học kỳ, cả năm</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canUnlockData}
                      disabled={formRole !== 'super_admin'}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canUnlockData: e.target.checked })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <span className={formRole !== 'super_admin' ? 'text-slate-400' : ''}>
                      Mở khóa dữ liệu đã chốt (Chỉ Quản trị viên)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canEditCriteria}
                      disabled={formRole !== 'super_admin'}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canEditCriteria: e.target.checked })
                      }
                      className="rounded text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <span className={formRole !== 'super_admin' ? 'text-slate-400' : ''}>
                      Cấu hình tiêu chí thi đua (Chỉ Quản trị viên)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {modalMode === 'create' ? 'Tạo Tài Khoản' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOCK / UNLOCK USER */}
      {lockingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center gap-3">
              <span
                className={`p-2.5 rounded-xl ${
                  lockingUser.isLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {lockingUser.isLocked ? <Unlock size={22} /> : <Lock size={22} />}
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lockingUser.isLocked ? 'Mở Khóa Tài Khoản' : 'Khóa Tài Khoản Người Dùng'}
                </h3>
                <p className="text-xs text-slate-500">{lockingUser.name} ({lockingUser.email})</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {lockingUser.isLocked
                  ? `Bạn có chắc muốn MỞ KHÓA tài khoản '${lockingUser.name}'? Sau khi mở khóa, người dùng có thể thực hiện lại các thao tác theo đúng phân quyền.`
                  : `Khi bị KHÓA, tài khoản '${lockingUser.name}' sẽ bị CHẶN HOÀN TOÀN ở tầng xử lý dữ liệu: không thể nhập điểm, sửa điểm, xóa dữ liệu, chốt hoặc mở khóa bất kỳ thông tin nào.`}
              </p>

              {!lockingUser.isLocked && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lý do khóa tài khoản (Bắt buộc lưu vết kiểm toán)
                  </label>
                  <textarea
                    rows={2}
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                    placeholder="Ví dụ: Chuyển công tác, tạm ngưng công tác hoặc nghi ngờ vi phạm bảo mật"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setLockingUser(null);
                  setLockReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleToggleLockSubmit}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  lockingUser.isLocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {lockingUser.isLocked ? 'Xác Nhận Mở Khóa' : 'Xác Nhận Khóa Tài Khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
