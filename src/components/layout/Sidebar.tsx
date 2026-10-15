import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewTab } from '../../types';
import { ROLE_METADATA, isRoleTeacher } from '../../utils/rbac';
import {
  LayoutDashboard,
  School,
  BookOpen,
  Flag,
  PenTool,
  Sliders,
  Trophy,
  Calendar,
  Award,
  Medal,
  BarChart3,
  Lock,
  Users2,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  FileQuestion,
  History,
  Sparkles,
  Database,
  LogOut,
  Download,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    currentTab,
    setCurrentTab,
    campuses,
    classes,
    currentUser,
    userRole,
    canAccessTab,
    lockedWeeks,
    selectedWeek,
    selectedMonth,
    selectedSemester,
    isMonthLocked,
    isSemesterLocked,
    isYearLocked,
    isTitleLocked,
    appeals,
    auditLogs,
    downloadSourceCodeZip,
    logout,
  } = useApp();

  if (!currentUser) return null;

  const isCurrentWeekLocked = lockedWeeks.includes(selectedWeek);
  const isCurrentMonthLocked = isMonthLocked(selectedMonth);
  const isCurrentSemesterLocked = isSemesterLocked(selectedSemester);
  const pendingAppealsCount = appeals.filter((a) => a.status === 'pending').length;
  const roleMeta = ROLE_METADATA[userRole];

  // Core navigation items including standard sidebar items plus appeals & audit logs
  const allNavItems: {
    id: ViewTab;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard Toàn trường', icon: LayoutDashboard, badge: '6 Phân hiệu', badgeColor: 'bg-blue-500/20 text-blue-300' },
    { id: 'campuses', label: 'Phân hiệu', icon: School, badge: `${campuses.length} cơ sở`, badgeColor: 'bg-emerald-500/20 text-emerald-300' },
    { id: 'classes', label: 'Lớp', icon: BookOpen, badge: `${classes.length} lớp` },
    { id: 'redflag', label: 'Đội cờ đỏ', icon: Flag, badge: 'Trực tuần', badgeColor: 'bg-rose-500/20 text-rose-300' },
    { id: 'scoring', label: 'Nhập điểm', icon: PenTool },
    {
      id: 'appeals',
      label: 'Phản hồi & Khiếu nại',
      icon: FileQuestion,
      badge: pendingAppealsCount > 0 ? `${pendingAppealsCount} chờ duyệt` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300',
    },
    { id: 'criteria', label: 'Tiêu chí', icon: Sliders },
    { id: 'rankings', label: 'Xếp hạng tuần', icon: Trophy, badge: `T${selectedWeek}`, badgeColor: 'bg-amber-500/20 text-amber-300' },
    {
      id: 'month_rankings',
      label: 'Xếp hạng tháng',
      icon: Calendar,
      badge: isCurrentMonthLocked ? `Th.${selectedMonth} 🔒` : `Th.${selectedMonth}`,
      badgeColor: isCurrentMonthLocked ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300',
    },
    {
      id: 'semester_rankings',
      label: 'Xếp hạng học kỳ',
      icon: Award,
      badge: isCurrentSemesterLocked ? `HK${selectedSemester === 1 ? 'I' : 'II'} 🔒` : `HK${selectedSemester === 1 ? 'I' : 'II'}`,
      badgeColor: isCurrentSemesterLocked ? 'bg-rose-500/20 text-rose-300' : 'bg-purple-500/20 text-purple-300',
    },
    {
      id: 'year_rankings',
      label: 'Xếp hạng cả năm',
      icon: Medal,
      badge: isYearLocked() ? '🔒 Đã chốt' : '2026-2027',
      badgeColor: isYearLocked() ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300',
    },
    {
      id: 'title_evaluation',
      label: 'Xét danh hiệu lớp',
      icon: Sparkles,
      badge: isTitleLocked() ? '🔒 Đã chốt' : 'Danh hiệu',
      badgeColor: isTitleLocked() ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300',
    },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    {
      id: 'datalock',
      label: 'Chốt dữ liệu',
      icon: Lock,
      badge: isCurrentWeekLocked ? 'T' + selectedWeek + ' Đã khóa' : 'T' + selectedWeek + ' Đang mở',
      badgeColor: isCurrentWeekLocked ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300',
    },
    {
      id: 'audit_logs',
      label: 'Nhật ký kiểm toán',
      icon: History,
      badge: auditLogs.length > 0 ? `${auditLogs.length}` : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300',
    },
    { id: 'users', label: 'Người dùng', icon: Users2 },
    {
      id: 'academic_catalog',
      label: 'Cấu hình năm học & Danh mục',
      icon: Database,
      badge: 'Thực tế / Mẫu',
      badgeColor: 'bg-emerald-500/20 text-emerald-300',
    },
    { id: 'settings', label: 'Cấu hình', icon: SettingsIcon },
  ];

  // RBAC filter: only display tabs that current user role has permission to access
  const visibleNavItems = allNavItems.filter((item) => canAccessTab(item.id));

  const handleSelectTab = (tab: ViewTab) => {
    setCurrentTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0c2340] text-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static border-r border-[#16365c] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="p-4 border-b border-[#16365c] bg-[#091b31]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shrink-0 border border-blue-400/30">
              LHL
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white leading-tight truncate">
                THCS LÊ HỮU LẬP
              </div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Năm học 2026 - 2027</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hệ thống quản lý giáo dục
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/30'
                    : 'text-slate-300 hover:bg-[#133054] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    className={`shrink-0 ${isActive ? 'text-white' : 'text-blue-300'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 border ${
                      isActive
                        ? 'bg-blue-700/80 text-white border-blue-500/40'
                        : item.badgeColor || 'bg-[#15345a] text-slate-300 border-transparent'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Export / Download Source Code ZIP (Ẩn đối với Role 4: Giáo viên) */}
        {!isRoleTeacher(currentUser) && (
          <div className="px-3 py-2 border-t border-[#16365c] bg-[#071629]">
            <button
              onClick={downloadSourceCodeZip}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-98"
              title="Tải toàn bộ mã nguồn (.zip) dự án về máy tính để đưa lên Vercel / Netlify"
            >
              <Download size={15} className="animate-bounce" />
              <span>TẢI XUỐNG MÃ NGUỒN (.ZIP)</span>
            </button>
          </div>
        )}

        {/* User Card & RBAC Badge */}
        <div className="p-3 border-t border-[#16365c] bg-[#091b31]">
          <div className="p-2.5 rounded-lg bg-[#112d4e] border border-[#1d4370]">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Vai trò</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${roleMeta.badgeColor}`}>
                {roleMeta.name}
              </span>
            </div>
            <div className="text-xs font-bold text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-blue-300 truncate mt-0.5">
              {currentUser.title}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1d4370]">
              <span className="text-[10px] text-slate-400">Phiên làm việc</span>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut size={12} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
