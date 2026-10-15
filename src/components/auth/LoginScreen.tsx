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
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar Branding */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between text-white/90 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 border border-blue-400/50 flex items-center justify-center text-white shadow-md shadow-blue-900/40">
            <Award size={24} className="text-amber-300" />
          </div>
          <div>
            {settings.governingBody && settings.governingBody.trim() ? (
              <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                {settings.governingBody.trim()}
              </div>
            ) : null}
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              {settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full shadow-2xs">
            <Sparkles size={13} className="text-amber-300" />
            Năm học {settings.academicYear}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            ● BẢO MẬT XÁC THỰC
          </span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-lg w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-950 px-6 sm:px-8 py-7 text-white text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30 mb-2">
              <Lock size={12} className="text-amber-300" />
              Cổng Đăng Nhập Hệ Thống Thi Đua
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              ĐĂNG NHẬP TÀI KHOẢN
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-md mx-auto">
              Vui lòng nhập chính xác Email và Mật khẩu được cấp để truy cập đúng quyền hạn được phân công.
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
                  Địa chỉ Email đăng nhập <span className="text-rose-500">*</span>:
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
                    placeholder="Nhập địa chỉ email của bạn..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="user-password-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Mật khẩu <span className="text-rose-500">*</span>:
                </label>
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
                    placeholder="Nhập mật khẩu của bạn..."
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden transition-all shadow-2xs"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-linear-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-black text-sm sm:text-base shadow-lg shadow-indigo-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xác thực thông tin...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} className="text-amber-300" />
                    <span>XÁC THỰC & ĐĂNG NHẬP</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Guarantee Notice */}
          <div className="px-6 sm:px-8 py-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-600">
            <p>
              🔒 <strong>Bảo mật:</strong> Đăng nhập yêu cầu khớp chính xác cả Email và Mật khẩu trong cơ sở dữ liệu hệ thống.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-slate-400 text-xs pt-4 border-t border-white/10">
        <p className="font-medium text-slate-300">
          HỆ THỐNG QUẢN LÝ & XẾP LOẠI THI ĐUA NỀ NẾP CÁC LỚP • {settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Chế độ vận hành an toàn • Bản quyền thuộc Hội đồng thi đua nhà trường
        </p>
      </footer>
    </div>
  );
};
