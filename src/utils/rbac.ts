import { User, RoleType, ViewTab, ClassItem, Campus, ScoreLog, CampusWeeklyDuty, normalizeRole } from '../types';

/**
 * RBAC Permission Control Engine for THCS Lê Hữu Lập
 * 
 * Roles:
 * 1. super_admin: Toàn quyền toàn hệ thống.
 * 2. bgh: Ban Giám Hiệu (Xem toàn trường, duyệt và chốt dữ liệu, xem báo cáo, xem audit log).
 * 3. campus_admin: Quản trị viên phân hiệu (Chỉ quản lý phân hiệu được phân công).
 * 4. tpt_doi: TPT Đội / Phụ trách Đội (Nhập và quản lý dữ liệu thi đua của phân hiệu được giao, duyệt phản hồi).
 * 5. gvcn: Giáo viên chủ nhiệm (Chỉ xem lớp mình phụ trách, gửi phản hồi/đề nghị điều chỉnh).
 * 6. red_flag: Đội cờ đỏ (Chỉ được nhập dữ liệu theo nhiệm vụ trực ban).
 * 7. viewer: Người xem (Chỉ được xem báo cáo/xếp hạng).
 */

export function getUserRole(user?: User | null): RoleType {
  if (!user) return 'viewer';
  return normalizeRole(user.role);
}

/** Helper check if current user is Role 4 (Giáo viên / GVCN) */
export function isRoleTeacher(user?: User | null): boolean {
  if (!user) return false;
  const role = getUserRole(user);
  return role === 'gvcn' || role === 'teacher' || (user.role as any) === 4 || (user.role as any) === '4';
}

/** Check if user can access a navigation tab */
export function canAccessTab(user?: User | null, tab?: ViewTab): boolean {
  if (!user || !tab) return false;
  const role = getUserRole(user);
  const isTeacher = isRoleTeacher(user);

  switch (tab) {
    case 'dashboard':
      // Ẩn menu 'Dashboard Toàn Trường' đối với Role 4 (Giáo viên)
      if (isTeacher) return false;
      return true;

    case 'criteria':
      // Ẩn menu 'Tiêu chí' đối với Role 4 (Giáo viên)
      if (isTeacher) return false;
      return true;

    case 'classes':
      // Ẩn menu 'Lớp' đối với Role 4 (Giáo viên)
      // Super Admin, BGH, Campus Admin, TPT Đội
      return ['super_admin', 'bgh', 'campus_admin', 'tpt_doi'].includes(role);

    case 'rankings':
    case 'month_rankings':
    case 'semester_rankings':
    case 'year_rankings':
    case 'title_evaluation':
    case 'reports':
      // Public / all roles can view
      return true;

    case 'campuses':
      // Super Admin, BGH, Campus Admin, TPT Đội
      return ['super_admin', 'bgh', 'campus_admin', 'tpt_doi'].includes(role);

    case 'academic_catalog':
      // Super Admin and BGH (BGH can view; Super Admin can edit)
      return ['super_admin', 'bgh'].includes(role);

    case 'redflag':
      // Super Admin, BGH, Campus Admin, TPT Đội, Red Flag
      return ['super_admin', 'bgh', 'campus_admin', 'tpt_doi', 'red_flag'].includes(role);

    case 'scoring':
      // Super Admin, BGH, Campus Admin, TPT Đội, Red Flag, and GVCN (lớp trực tuần)
      return ['super_admin', 'bgh', 'campus_admin', 'tpt_doi', 'red_flag', 'gvcn'].includes(role);

    case 'datalock':
      // Super Admin, BGH, and TPT Đội (Tổng phụ trách / Phụ trách thi đua)
      return ['super_admin', 'bgh', 'tpt_doi'].includes(role);

    case 'appeals':
      // GVCN submits appeals; Super Admin, BGH, TPT Đội, Campus Admin review
      return ['super_admin', 'bgh', 'campus_admin', 'tpt_doi', 'gvcn'].includes(role);

    case 'audit_logs':
      // ONLY Super Admin and BGH
      return ['super_admin', 'bgh'].includes(role);

    case 'users':
      // Super Admin and BGH (BGH can view/search accounts; Super Admin can edit/create)
      return ['super_admin', 'bgh'].includes(role);

    case 'settings':
      // Super Admin only (Quản trị viên)
      return ['super_admin', 'admin'].includes(role);

    default:
      return true;
  }
}

/** Check if user is locked */
export function isUserLocked(user?: User | null): boolean {
  return !!user?.isLocked;
}

/** Check if user has permission to lock weekly data (BGH, TPT Đội, and Super Admin) */
export function canLockWeek(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'bgh' || role === 'tpt_doi' || !!user.customPermissions?.canLockData;
}

/** Check if user has permission to unlock weekly data (CHỈ CHO PHÉP Role 1: Quản trị viên; Chặn Role 2 BGH & Role 3 TPT) */
export function canUnlockWeek(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'bgh' || role === 'tpt_doi' || role === 'campus_admin') {
    return false;
  }
  return role === 'super_admin';
}

/** Check if user has permission to lock or unlock weekly data (legacy compat) */
export function canLockUnlockWeeks(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin';
}

/** Check if user has permission to lock monthly data (BGH, TPT Đội, and Super Admin) */
export function canLockMonth(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'bgh' || role === 'tpt_doi' || !!user.customPermissions?.canLockData;
}

/** Check if user has permission to unlock monthly data (CHỈ CHO PHÉP Role 1: Quản trị viên) */
export function canUnlockMonth(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'bgh' || role === 'tpt_doi' || role === 'campus_admin') {
    return false;
  }
  return role === 'super_admin';
}

/** Check if user has permission to lock semester data (BGH, TPT Đội, and Super Admin) */
export function canLockSemester(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'bgh' || role === 'tpt_doi' || !!user.customPermissions?.canLockData;
}

/** Check if user has permission to unlock semester data (CHỈ CHO PHÉP Role 1: Quản trị viên) */
export function canUnlockSemester(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'bgh' || role === 'tpt_doi' || role === 'campus_admin') {
    return false;
  }
  return role === 'super_admin';
}

/** Check if user has permission to lock academic year data (BGH, TPT Đội, and Super Admin) */
export function canLockYear(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'bgh' || role === 'tpt_doi' || !!user.customPermissions?.canLockData;
}

/** Check if user has permission to unlock academic year data (CHỈ CHO PHÉP Role 1: Quản trị viên) */
export function canUnlockYear(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'bgh' || role === 'tpt_doi' || role === 'campus_admin') {
    return false;
  }
  return role === 'super_admin';
}

/** Check if user has permission to lock title evaluation results (BGH, TPT Đội, and Super Admin) */
export function canLockTitles(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'bgh' || role === 'tpt_doi' || !!user.customPermissions?.canLockData;
}

/** Check if user has permission to unlock title evaluation results (CHỈ CHO PHÉP Role 1: Quản trị viên) */
export function canUnlockTitles(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'bgh' || role === 'tpt_doi' || role === 'campus_admin') {
    return false;
  }
  return role === 'super_admin';
}

/** Check if user can view audit logs */
export function canViewAuditLogs(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin' || role === 'bgh';
}

/** Check if user can manage users */
export function canManageUsers(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin';
}

/** Check if user can configure school settings or modify criteria (ONLY Super Admin) */
export function canConfigureSettings(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin';
}

export function canModifyCriteria(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin';
}

export function canUnlockHistoricalData(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin';
}

/** Check if user can input and manage historical preserved scores (Super Admin and BGH) */
export function canManageHistoricalScores(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return ['super_admin', 'bgh', 'admin'].includes(role);
}

export function canManageCampuses(user?: User | null): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  return role === 'super_admin';
}

/** Check if user can submit adjustment appeal (GVCN) */
export function canSubmitAppeal(user?: User | null, classId?: string): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'super_admin') return true;
  if (role === 'gvcn') {
    if (!classId || !user.classId) return true;
    return user.classId === classId;
  }
  return false;
}

/** Check if user can review / approve adjustment appeals */
export function canReviewAppeals(user?: User | null, appealCampusId?: string): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'super_admin' || role === 'bgh') return true;
  if (role === 'tpt_doi') return true;
  if (role === 'campus_admin') {
    if (!appealCampusId || !user.campusId) return true;
    return user.campusId === appealCampusId;
  }
  return false;
}

/** Check if user can input scores for a target campus and class in a specific week */
export function canInputScores(
  user?: User | null,
  targetCampusId?: string,
  targetClassId?: string,
  week?: number,
  lockedWeeks: number[] = [],
  weeklyDutyAssignments: CampusWeeklyDuty[] = []
): { allowed: boolean; reason?: string; isDutyTeacher?: boolean } {
  if (!user) {
    return {
      allowed: false,
      reason: 'Bạn chưa đăng nhập vào hệ thống!',
    };
  }

  // Check if account is locked
  if (isUserLocked(user)) {
    return {
      allowed: false,
      reason: `Tài khoản '${user.name}' đang bị KHÓA. Bạn không có quyền thực hiện bất kỳ thao tác nào trên hệ thống!`,
    };
  }

  const role = getUserRole(user);

  // Super Admin (Admin) has full authority to input, edit and delete scores to correct errors
  if (role === 'super_admin') {
    return { allowed: true };
  }

  // Check week lock for non-admin roles
  if (week !== undefined && lockedWeeks.includes(week)) {
    return {
      allowed: false,
      reason: `Tuần ${week} đã được Ban Giám Hiệu khóa chốt dữ liệu thi đua. Dữ liệu đã chốt được bảo vệ nghiêm ngặt, không thể nhập hoặc chỉnh sửa điểm!`,
    };
  }

  // Check campus scope restriction
  if (user.scopeType === 'campus' && user.allowedCampusIds && user.allowedCampusIds.length > 0) {
    if (!targetCampusId || !user.allowedCampusIds.includes(targetCampusId)) {
      return {
        allowed: false,
        reason: 'Tài khoản của bạn chỉ được phân quyền quản lý và nhập điểm trong các phân hiệu được chỉ định.',
      };
    }
  }

  switch (role) {
    case 'bgh':
      // Ban Giám Hiệu có toàn quyền nhập và duyệt sửa điểm
      return { allowed: true };

    case 'campus_admin':
      if (user.campusId && user.campusId !== targetCampusId) {
        return {
          allowed: false,
          reason: 'Quản trị viên phân hiệu chỉ có quyền quản lý và nhập điểm cho phân hiệu được phân công.',
        };
      }
      return { allowed: true };

    case 'tpt_doi':
      if (user.campusId && user.campusId !== targetCampusId) {
        return {
          allowed: false,
          reason: 'Tổng phụ trách chỉ được giao quản lý phân hiệu được phân công phụ trách.',
        };
      }
      return { allowed: true };

    case 'red_flag':
      // Red flag members are allowed to record duties for their campus in open weeks
      if (user.campusId && user.campusId !== targetCampusId) {
        return {
          allowed: false,
          reason: 'Đội viên cờ đỏ chỉ được chấm điểm vi phạm tại phân hiệu được phân công.',
        };
      }
      return { allowed: true };

    case 'gvcn': {
      if (user.campusId && user.campusId !== targetCampusId) {
        return {
          allowed: false,
          reason: 'Giáo viên chỉ được nhập điểm cho phân hiệu được phân công.',
        };
      }

      // 1. Kiểm tra xem GVCN này có phải là GVCN của LỚP TRỰC TUẦN này hay không
      const dutyAssignment = week !== undefined
        ? weeklyDutyAssignments.find((d) => d.week === week && d.campusId === targetCampusId)
        : undefined;

      const isDutyTeacherThisWeek = !!dutyAssignment && (
        (user.classId && dutyAssignment.classId === user.classId) ||
        (user.name && dutyAssignment.homeroomTeacher && user.name.toLowerCase().trim() === dutyAssignment.homeroomTeacher.toLowerCase().trim()) ||
        (dutyAssignment.teacherId && user.id === dutyAssignment.teacherId)
      );

      if (isDutyTeacherThisWeek) {
        return {
          allowed: true,
          isDutyTeacher: true,
          reason: `Lớp ${dutyAssignment.className} của bạn được phân công trực ban Tuần ${week} tại phân hiệu này. Bạn có quyền ghi nhận dữ liệu thi đua cho toàn phân hiệu.`,
        };
      }

      // 2. Nếu lớp này có lịch trực ở tuần khác, thông báo rõ quyền đã hết hạn hoặc chưa tới
      const dutyInOtherWeek = weeklyDutyAssignments.find((d) =>
        (user.classId && d.classId === user.classId) ||
        (user.name && d.homeroomTeacher && user.name.toLowerCase().trim() === d.homeroomTeacher.toLowerCase().trim())
      );

      if (dutyInOtherWeek && week !== undefined) {
        return {
          allowed: false,
          reason: `Lớp ${dutyInOtherWeek.className} của bạn được phân công trực ban trong Tuần ${dutyInOtherWeek.week}. Trong Tuần ${week}, quyền chấm điểm nề nếp thuộc về GVCN lớp trực tuần ${dutyAssignment ? dutyAssignment.className : '(được phân công)'}. Quyền chấm điểm của tuần khác đã hết hiệu lực theo quy định.`,
        };
      }

      // 3. Fallback: Nếu được cấp quyền riêng theo cấu hình
      if (user.customPermissions?.canInputScore) {
        return {
          allowed: true,
          reason: 'Được cấp quyền ghi nhận điểm theo phân quyền quản trị.',
        };
      }

      return {
        allowed: false,
        reason: 'Giáo viên chủ nhiệm chỉ được nhập dữ liệu thi đua trong tuần mà lớp mình được phân công trực tuần. Lớp của bạn hiện không phải là lớp trực tuần này.',
      };
    }

    case 'viewer':
    default:
      return {
        allowed: false,
        reason: 'Tài khoản Người xem chỉ có quyền xem Dashboard và báo cáo, không được phép nhập hoặc chỉnh sửa dữ liệu.',
      };
  }
}

/** Check if user can manage campus/class metadata (add, edit, delete) */
export function canManageCampusClasses(user?: User | null, targetCampusId?: string): boolean {
  if (!user || isUserLocked(user)) return false;
  const role = getUserRole(user);
  if (role === 'super_admin') return true;
  if (role === 'campus_admin') {
    if (!targetCampusId) return true;
    return user.campusId === targetCampusId;
  }
  return false;
}

/** Scope classes visible to user */
export function filterVisibleClasses(classes: ClassItem[], user?: User | null): ClassItem[] {
  if (!user) return [];
  const role = getUserRole(user);
  if (role === 'gvcn' && user.classId) {
    return classes.filter((c) => c.id === user.classId);
  }
  if ((role === 'campus_admin' || role === 'gvcn') && user.campusId) {
    return classes.filter((c) => c.campusId === user.campusId);
  }
  return classes;
}

/** Scope campuses visible to user */
export function filterVisibleCampuses(campuses: Campus[], user?: User | null): Campus[] {
  if (!user) return [];
  const role = getUserRole(user);
  if ((role === 'campus_admin' || role === 'gvcn') && user.campusId) {
    return campuses.filter((c) => c.id === user.campusId);
  }
  return campuses;
}

/** Scope score logs visible to user */
export function filterVisibleScoreLogs(logs: ScoreLog[], user?: User | null): ScoreLog[] {
  if (!user) return [];
  const role = getUserRole(user);
  if (role === 'gvcn' && user.classId) {
    return logs.filter((l) => l.classId === user.classId);
  }
  if ((role === 'campus_admin' || role === 'gvcn') && user.campusId) {
    return logs.filter((l) => l.campusId === user.campusId);
  }
  return logs;
}

export interface RoleMetadataItem {
  id: RoleType;
  name: string;
  badgeColor: string;
  description: string;
  level: number;
}

export const ROLE_METADATA: Record<string, RoleMetadataItem> = {
  super_admin: {
    id: 'super_admin',
    name: '1. QUẢN TRỊ VIÊN',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Toàn quyền hệ thống: người dùng, 6 phân hiệu, lớp, tiêu chí, nhập/sửa dữ liệu, mở khóa dữ liệu đã chốt, báo cáo.',
    level: 1,
  },
  admin: {
    id: 'super_admin',
    name: '1. QUẢN TRỊ VIÊN',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Toàn quyền hệ thống: người dùng, 6 phân hiệu, lớp, tiêu chí, nhập/sửa dữ liệu, mở khóa dữ liệu đã chốt, báo cáo.',
    level: 1,
  },
  bgh: {
    id: 'bgh',
    name: '2. BAN GIÁM HIỆU',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Xem toàn trường, 6 phân hiệu, tất cả báo cáo, chi tiết điểm. Chốt tuần, tháng, học kỳ, cả năm. Không sửa tiêu chí, không mở khóa.',
    level: 2,
  },
  tpt_doi: {
    id: 'tpt_doi',
    name: '3. TỔNG PHỤ TRÁCH / PHỤ TRÁCH THI ĐUA',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'Nhập dữ liệu thi đua, xem các lớp trong phạm vi được giao, xem BXH. Không sửa tiêu chí, không tự ý mở khóa dữ liệu đã chốt.',
    level: 3,
  },
  inspector: {
    id: 'tpt_doi',
    name: '3. TỔNG PHỤ TRÁCH / PHỤ TRÁCH THI ĐUA',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'Nhập dữ liệu thi đua, xem các lớp trong phạm vi được giao, xem BXH. Không sửa tiêu chí, không tự ý mở khóa dữ liệu đã chốt.',
    level: 3,
  },
  campus_admin: {
    id: 'campus_admin',
    name: '3. PHỤ TRÁCH THI ĐUA PHÂN HIỆU',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Quản lý thi đua của phân hiệu được phân công (Nhập dữ liệu, quản lý lớp, duyệt đề nghị).',
    level: 3,
  },
  campus_lead: {
    id: 'campus_admin',
    name: '3. PHỤ TRÁCH THI ĐUA PHÂN HIỆU',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Quản lý thi đua của phân hiệu được phân công (Nhập dữ liệu, quản lý lớp, duyệt đề nghị).',
    level: 3,
  },
  gvcn: {
    id: 'gvcn',
    name: '4. GIÁO VIÊN / NGƯỜI NHẬP DỮ LIỆU',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Chỉ nhập dữ liệu được phân công, chỉ xem trong phạm vi cấp quyền. Không sửa tiêu chí, không chốt dữ liệu, không mở khóa.',
    level: 4,
  },
  teacher: {
    id: 'gvcn',
    name: '4. GIÁO VIÊN / NGƯỜI NHẬP DỮ LIỆU',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Chỉ nhập dữ liệu được phân công, chỉ xem trong phạm vi cấp quyền. Không sửa tiêu chí, không chốt dữ liệu, không mở khóa.',
    level: 4,
  },
  red_flag: {
    id: 'red_flag',
    name: '4. ĐỘI CỜ ĐỎ / CHẤM CA TRỰC',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Chỉ được nhập dữ liệu nề nếp theo ca trực tuần được phân công.',
    level: 4,
  },
  viewer: {
    id: 'viewer',
    name: '5. NGƯỜI XEM',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Chỉ được xem Dashboard và báo cáo được cấp quyền. Không được nhập hoặc sửa dữ liệu.',
    level: 5,
  },
  public: {
    id: 'viewer',
    name: '5. NGƯỜI XEM',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Chỉ được xem Dashboard và báo cáo được cấp quyền. Không được nhập hoặc sửa dữ liệu.',
    level: 5,
  },
};
