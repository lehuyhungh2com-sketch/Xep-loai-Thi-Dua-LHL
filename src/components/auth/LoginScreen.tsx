import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  Lock,
  LogIn,
  AlertTriangle,
  Sparkles,
  Mail,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { settings, loginWithEmail } = useApp();

  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Authenticate user with both email and password against latest state/store
  const handleLogin = async (targetEmail: string, targetPassword: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const cleanPass = targetPassword.trim();

    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ Email đăng nhập.');
      return;
    }

    if (!cleanPass) {
      setErrorMessage('Vui lòng nhập mật khẩu đăng nhập.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await loginWithEmail(cleanEmail, cleanPass);
      if (!result.success) {
        setErrorMessage(
          result.message || 'Email hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.'
        );
        setIsSubmitting(false);
      } else {
        setSuccessMessage(result.message || 'Xác thực thành công! Đang chuyển hướng...');
      }
    } catch {
      setErrorMessage('Email hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.');
      setIsSubmitting(false);
    }
  };

  const handlePerformLogin = handleLogin;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(emailInput, passwordInput);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative background glow elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Branding */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between text-white/90 pb-4 border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 border border-blue-400/50 flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
            <Award size={26} className="text-amber-300" />
          </div>
          <div>
            {settings.governingBody && settings.governingBody.trim() ? (
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                {settings.governingBody.trim()}
              </div>
            ) : null}
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              {settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-3 py-1.5 rounded-full shadow-sm">
            <Sparkles size={14} className="text-amber-300" />
            Năm học {settings.academicYear}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-3 py-1.5 rounded-full">
            ● AN TOÀN BẢO MẬT
          </span>
        </div>
      </div>

      {/* Main Authentication Container - 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="max-w-5xl w-full mx-auto my-auto py-8 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: School Information & Mission */}
        <div className="lg:col-span-6 space-y-6 text-white text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/30">
            <ShieldCheck size={15} className="text-amber-300" />
            Hệ Thống Quản Lý Thi Đua Nề Nếp Trực Tuyến
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            HỆ THỐNG QUẢN LÝ THI ĐUA - <span className="text-amber-300">TRƯỜNG THCS LÊ HỮU LẬP</span>
          </h2>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Ứng dụng số hóa toàn diện công tác chấm điểm nề nếp, xếp hạng thi đua 6 phân hiệu, chốt sổ điểm tuần/tháng và quản lý minh chứng minh bạch, chính xác.
          </p>

          <div className="pt-2 grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
              <div className="text-amber-300 font-black text-xl">6 Phân Hiệu</div>
              <div className="text-xs text-blue-200 mt-1 font-medium">Đồng bộ dữ liệu thời gian thực</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
              <div className="text-emerald-300 font-black text-xl">Chính Xác 100%</div>
              <div className="text-xs text-blue-200 mt-1 font-medium">Báo cáo chuẩn văn bản hành chính</div>
            </div>
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Card Header */}
            <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 px-6 sm:px-8 py-6 text-white text-center relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30 mb-2">
                <Lock size={12} className="text-amber-300" />
                Xác Thực Giáo Viên & Quản Trị
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ĐĂNG NHẬP HỆ THỐNG
              </h3>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">
                Nhập email và mật khẩu được cấp để bắt đầu làm việc
              </p>
            </div>

            {/* Form Body */}
            <div className="p-6 sm:p-8 space-y-5">
              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <strong className="font-bold block text-rose-950 mb-0.5">Lỗi đăng nhập:</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Success Message Alert */}
              {successMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-center gap-3 animate-in fade-in">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">{successMessage}</span>
                </div>
              )}

              {/* Email + Password Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="user-email-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Địa chỉ Email <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      id="user-email-input"
                      type="email"
                      required
                      autoComplete="username"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Nhập email đăng nhập..."
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-blue-600 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="user-password-input"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Mật khẩu <span className="text-rose-500">*</span>:
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={18} />
                    </div>
                    <input
                      id="user-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-10 pr-11 py-3.5 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-blue-600 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button (To, màu xanh chủ đạo, có hiệu ứng loading xoay vòng tròn) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-base shadow-lg shadow-blue-700/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xử lý đăng nhập...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={20} className="text-amber-300" />
                      <span>ĐĂNG NHẬP HỆ THỐNG</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Forgot password instruction message */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Quên mật khẩu? Vui lòng liên hệ Admin (Thầy Hùng) để được cấp lại.
                </p>
              </div>
            </div>

            {/* Security Guarantee Notice */}
            <div className="px-6 sm:px-8 py-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-600">
              <p>
                🔒 <strong>Bảo mật phân quyền:</strong> Mọi thao tác được giám sát chặt chẽ theo vai trò.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-slate-400 text-xs pt-4 border-t border-white/10 z-10 space-y-1">
        <p className="font-medium text-slate-300">
          HỆ THỐNG QUẢN LÝ & XẾP LOẠI THI ĐUA NỀ NẾP CÁC LỚP • {settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}
        </p>
        <p className="text-xs text-amber-300 font-semibold">
          Phần mềm thiết kế bởi Lê Huy Hùng (GV trường THCS Lê Hữu Lập - Hậu Lộc - Thanh Hóa, SĐT: 0919709286)
        </p>
      </footer>
    </div>
  );
};
