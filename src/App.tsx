import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { RankingsHub } from './components/rankings/RankingsHub';
import { RedFlagHub } from './components/redflag/RedFlagHub';
import { WeeklyScoring } from './components/scoring/WeeklyScoring';
import { CriteriaManager } from './components/criteria/CriteriaManager';
import { CampusManager } from './components/campuses/CampusManager';
import { ClassManager } from './components/classes/ClassManager';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { DataLockManager } from './components/datalock/DataLockManager';
import { UserManager } from './components/users/UserManager';
import { SettingsManager } from './components/settings/SettingsManager';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { AppealsManager } from './components/appeals/AppealsManager';
import { MonthlyRankingsHub } from './components/rankings/MonthlyRankingsHub';
import { SemesterRankingsHub } from './components/rankings/SemesterRankingsHub';
import { YearRankingsHub } from './components/rankings/YearRankingsHub';
import { ClassAwardsHub } from './components/rankings/ClassAwardsHub';
import { AcademicCatalogManager } from './components/admin/AcademicCatalogManager';
import { LoginScreen } from './components/auth/LoginScreen';

const MainLayout: React.FC = () => {
  const { currentTab, setCurrentTab, isAuthenticated, currentUser, canAccessTab } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tự động chuyển hướng sang Bảng Xếp Hạng nếu tab hiện tại bị chặn theo phân quyền (ví dụ Role 4 Giáo viên)
  useEffect(() => {
    if (isAuthenticated && currentUser && currentTab !== 'rankings' && !canAccessTab(currentTab)) {
      setCurrentTab('rankings');
    }
  }, [isAuthenticated, currentUser, currentTab, canAccessTab, setCurrentTab]);

  // Strictly block unauthenticated access: No Dashboard, no sidebar, no data
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderActiveView = () => {
    if (!canAccessTab(currentTab)) {
      return <RankingsHub />;
    }
    switch (currentTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'campuses':
        return <CampusManager />;
      case 'classes':
        return <ClassManager />;
      case 'redflag':
        return <RedFlagHub />;
      case 'scoring':
        return <WeeklyScoring />;
      case 'appeals':
        return <AppealsManager />;
      case 'criteria':
        return <CriteriaManager />;
      case 'rankings':
        return <RankingsHub />;
      case 'month_rankings':
        return <MonthlyRankingsHub />;
      case 'semester_rankings':
        return <SemesterRankingsHub />;
      case 'year_rankings':
        return <YearRankingsHub />;
      case 'title_evaluation':
        return <ClassAwardsHub />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'datalock':
        return <DataLockManager />;
      case 'audit_logs':
        return <AuditLogViewer />;
      case 'users':
        return <UserManager />;
      case 'academic_catalog':
        return <AcademicCatalogManager />;
      case 'settings':
        return <SettingsManager />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        onToggleMobileSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isSidebarOpen}
      />

      {/* Main Body Area: Sidebar + Scrollable Content */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic Content Pane */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lỗi giao diện ứng dụng (ErrorBoundary):', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800">Hệ thống đang phục hồi giao diện</h2>
            <p className="text-sm text-slate-600">
              Đã phát hiện lỗi tải trang. Vui lòng nhấn nút bên dưới để khôi phục và tiếp tục sử dụng:
            </p>
            <div className="text-xs text-red-700 bg-red-50 p-3 rounded-xl font-mono text-left break-all max-h-32 overflow-y-auto">
              {this.state.error?.message || 'Lỗi không xác định'}
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-md"
              >
                Tải lại trang
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('lhl_settings');
                  } catch {}
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                Xóa cache & Tải lại
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
