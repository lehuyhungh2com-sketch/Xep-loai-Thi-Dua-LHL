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
    if (isAuthenticated && currentUser && !canAccessTab(currentTab)) {
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

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
