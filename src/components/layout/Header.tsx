import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Award, 
  Menu, 
  X, 
  ShieldCheck, 
  UserCheck, 
  School, 
  GraduationCap, 
  Users, 
  ChevronDown,
  Calendar,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Scale,
  FileSpreadsheet,
  LogOut,
  KeyRound,
  Download,
  RefreshCw,
} from 'lucide-react';
import { RoleType } from '../../types';
import { ROLE_METADATA, isRoleTeacher } from '../../utils/rbac';
import { RegulationAuditModal } from '../compliance/RegulationAuditModal';
import { BackupExcelCenterModal } from '../backup/BackupExcelCenterModal';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { 
    currentUser, 
    userRole,
    users, 
    switchCurrentUser, 
    settings, 
    selectedWeek, 
    setSelectedWeek,
    maxWeeks,
    currentActiveWeek,
    isWeekLocked,
    downloadSourceCodeZip,
    loadDataFromFirebase,
    syncLatestCloudData,
    isSyncing,
    logout,
  } = useApp();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  if (!currentUser) return null;

  const isLocked = isWeekLocked(selectedWeek);
  const currentRoleMeta = ROLE_METADATA[userRole];

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

  const RoleIcon = getRoleIcon(userRole);

  const handlePrevWeek = () => {
    if (selectedWeek > 1) setSelectedWeek(selectedWeek - 1);
  };

  const handleNextWeek = () => {
    if (selectedWeek < maxWeeks) setSelectedWeek(selectedWeek + 1);
  };

  const sem1Limit = settings.totalWeeksSemester1 || 18;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Toggle & Brand Lockup */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Mở danh mục"
          >
            {isMobileSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex items-center gap-3 min-w-0">
            {/* School Emblem / Logo */}
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-sm shrink-0 border border-blue-600">
              <Award size={22} className="text-amber-300" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-blue-950 text-base sm:text-lg leading-tight tracking-tight truncate">
                  TRƯỜNG THCS LÊ HỮU LẬP
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                  NĂM HỌC {settings.academicYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
                Phần mềm quản lý & xếp loại thi đua nề nếp 6 phân hiệu
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Week Control & Role Profile */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Quick Week Navigator (Ít thao tác, trực quan cho giáo viên) */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={handlePrevWeek}
              disabled={selectedWeek <= 1}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar size={14} className="text-blue-600 shrink-0" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-bold text-blue-950 focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} {w <= sem1Limit ? '(HK1)' : '(HK2)'}{w === currentActiveWeek ? ' • [Hiện tại]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextWeek}
              disabled={selectedWeek >= maxWeeks}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Tuần kế tiếp"
            >
              <ChevronRight size={16} />
            </button>

            {/* Lock Status Pill */}
            <div className="hidden md:flex items-center pl-2 pr-1 border-l border-slate-200">
              {isLocked ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  <Lock size={12} className="text-amber-600" />
                  <span>Đã chốt sổ</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <Unlock size={12} className="text-emerald-600" />
                  <span>Đang mở ghi</span>
                </span>
              )}
            </div>
          </div>

          {/* NÚT ĐỒNG BỘ DỮ LIỆU TỪ MÁY CHỦ (Hiển thị cho TẤT CẢ các cấp độ tài khoản: Admin đến Giáo viên) */}
          <button
            onClick={() => syncLatestCloudData(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 shrink-0"
            title="Xóa bộ đệm và tải lại toàn bộ dữ liệu mới nhất từ Firestore (classes, scores, historical_scores, locked_weeks, settings)"
          >
            <RefreshCw size={15} className={`text-blue-600 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="font-extrabold tracking-tight">Đồng Bộ</span>
          </button>

          {/* Quick Compliance Audit & Standby Excel Buttons (Ẩn đối với Role 4: Giáo viên) */}
          {!isRoleTeacher(currentUser) && (
            <>
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  onClick={() => setShowAuditModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Rà soát đối chiếu toàn vẹn quy định công văn của Nhà trường"
                >
                  <Scale size={15} className="text-indigo-600" />
                  <span>Rà Soát Quy Chuẩn</span>
                </button>

                <button
                  onClick={() => setShowBackupModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Xuất bảng tính Excel dự phòng & sao lưu toàn bộ hệ thống"
                >
                  <FileSpreadsheet size={15} className="text-emerald-700" />
                  <span>Sao Lưu & Excel</span>
                </button>
              </div>

              {/* Tải Xuống Mã Nguồn (.ZIP) Export Project Button */}
              <button
                onClick={downloadSourceCodeZip}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-400 hover:border-amber-500 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                title="Tải xuống toàn bộ mã nguồn (.zip) dự án để triển khai độc lập lên Vercel / Netlify"
              >
                <Download size={15} className="shrink-0 animate-bounce" />
                <span className="hidden sm:inline font-extrabold tracking-wide">TẢI XUỐNG MÃ NGUỒN</span>
                <span className="sm:hidden font-extrabold">Tải ZIP</span>
              </button>
            </>
          )}

          {/* Quick Change Password Button for instant access */}
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-200 hover:border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Đổi mật khẩu cá nhân của tài khoản"
          >
            <KeyRound size={15} className="text-blue-600" />
            <span className="hidden sm:inline">Đổi Mật Khẩu</span>
          </button>

          {/* User Account Avatar Menu */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 text-left transition-all cursor-pointer shadow-2xs"
              title="Menu tài khoản cá nhân"
            >
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0">
                <RoleIcon size={16} />
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-black text-slate-900 leading-none truncate max-w-[140px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-blue-700 font-bold mt-0.5 leading-none truncate max-w-[140px]">
                  {currentRoleMeta ? currentRoleMeta.name : currentUser.role}
                </div>
              </div>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>

            {/* Backdrop to close menu */}
            {showRoleDropdown && (
              <div
                className="fixed inset-0 z-40 bg-black/5"
                onClick={() => setShowRoleDropdown(false)}
              />
            )}

            {/* Account Profile Dropdown */}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                {/* 1. User Profile Details */}
                <div className="p-3 bg-linear-to-br from-blue-50 via-indigo-50 to-slate-50 rounded-xl border border-blue-100 mb-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0">
                      <RoleIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {currentUser.name}
                      </h4>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {currentUser.title || (currentRoleMeta ? currentRoleMeta.name : currentUser.role)}
                      </p>
                      <div className="text-[11px] font-mono text-blue-700 truncate mt-0.5">
                        {currentUser.email || 'Chưa liên kết email Google'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500">Vai trò hệ thống:</span>
                    <span className={`font-bold px-2 py-0.5 rounded-md border text-[10px] ${currentRoleMeta?.badgeColor || 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                      {currentRoleMeta?.name || currentUser.role}
                    </span>
                  </div>
                </div>

                {/* 2. Primary Account Actions - Prominent Buttons */}
                <div className="space-y-1.5 mb-2">
                  {/* CHANGE PASSWORD BUTTON */}
                  <button
                    onClick={() => {
                      setShowRoleDropdown(false);
                      setShowChangePasswordModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <KeyRound size={15} className="text-amber-300" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-xs font-black tracking-wide">ĐỔI MẬT KHẨU CÁ NHÂN</div>
                      <div className="text-[10px] text-blue-100 font-medium">Cập nhật mật khẩu bảo mật tài khoản</div>
                    </div>
                  </button>

                  {/* LOGOUT BUTTON */}
                  <button
                    onClick={() => {
                      setShowRoleDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-rose-100 flex items-center justify-center shrink-0 text-slate-600 hover:text-rose-600">
                      <LogOut size={14} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-xs font-bold">Đăng xuất khỏi hệ thống</div>
                      <div className="text-[10px] text-slate-400 font-normal">Kết thúc phiên làm việc an toàn</div>
                    </div>
                  </button>
                </div>

                {/* 3. Super Admin RBAC testing simulator (ONLY visible to Super Admin / Admin) */}
                {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                  <div className="border-t border-slate-100 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                      Mô phỏng vai trò (Chỉ Quản trị viên)
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {users.map((u) => {
                        const isSelected = u.id === currentUser.id;
                        const uMeta = ROLE_METADATA[u.role] || { name: u.role, badgeColor: 'bg-slate-100 text-slate-700' };
                        const UIcon = getRoleIcon(u.role);
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              switchCurrentUser(u.id);
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                              isSelected ? 'bg-purple-100 text-purple-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <UIcon size={13} className="shrink-0 text-slate-500" />
                            <span className="truncate flex-1 font-medium">{u.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${uMeta.badgeColor}`}>
                              {uMeta.name.split('.')[1]?.trim() || uMeta.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Standalone Logout Button */}
          <button
            onClick={logout}
            className="p-2 rounded-xl border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
            title="Đăng xuất khỏi tài khoản (Trở về màn hình đăng nhập)"
            aria-label="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal isOpen={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} />

      {/* Compliance Audit Modal */}
      <RegulationAuditModal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} />

      {/* Backup & Standby Excel Center Modal */}
      <BackupExcelCenterModal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} />
    </header>
  );
};
