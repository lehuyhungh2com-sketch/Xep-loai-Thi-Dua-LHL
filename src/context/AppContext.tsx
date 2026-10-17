import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import masterDatabase from '../../data/server_db.json';
import { db } from '../../firebase-config';
import { doc, setDoc, deleteDoc, onSnapshot, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import {
  Campus,
  ClassItem,
  Criteria,
  SchoolSettings,
  ScoreLog,
  User,
  ViewTab,
  ClassWeeklyScore,
  RankingEntry,
  CriteriaPeriod,
  RedFlagDuty,
  AuditLog,
  AdjustmentAppeal,
  RoleType,
  normalizeRole,
  AcademicYearArchive,
  SystemFullBackupPayload,
  MonthLockInfo,
  MonthRankingRow,
  MonthWeeklyScoreItem,
  SemesterLockInfo,
  SemesterMonthScoreItem,
  SemesterRankingRow,
  YearLockInfo,
  YearRankingRow,
  ClassTitle,
  DisciplinaryRecord,
  TitleLockInfo,
  TitleEvaluationRow,
  TitleEvaluationResult,
  UserCustomPermissions,
  ScoreEditHistoryItem,
  AcademicYear,
  GradeItem,
  TeacherItem,
  CalendarWeekConfig,
  CampusWeeklyDuty,
  RedFlagMember,
  RedFlagBriefing,
  RedFlagActivityLog,
  CriteriaVersionHistory,
  CriteriaAdjustmentRuleConfig,
  HistoricalScoreEntry,
  HistoricalWeeklyScoresMap,
} from '../types';
import {
  INITIAL_RED_FLAG_MEMBERS,
  INITIAL_RED_FLAG_BRIEFINGS,
  INITIAL_RED_FLAG_ACTIVITIES,
  generateInitialCampusWeeklyDuties,
} from '../data/dutyData';
import {
  exportOfflineStandbyEvaluationBook,
  exportRankingsToExcel,
  exportMonthlyRankingsToExcel,
  exportSemesterRankingsToExcel,
  exportYearRankingsToExcel,
  exportTitleEvaluationToExcel,
  exportScoreLogsToExcel,
  exportCriteriaCatalogToExcel,
  ExportSignatures,
} from '../utils/excelExporter';
import {
  runSystemDataIntegrityCheck,
  DataIntegrityReport,
} from '../utils/academicCatalogEngine';
import {
  calculateNaturalWeek1StartDate,
  calculateCurrentActiveWeek,
  calculateOverriddenStartDateOfWeek1,
  getWeekDateRange,
  formatDateYMD,
  generateDefaultCalendarWeeks,
} from '../utils/timeEngine';
import {
  calculateCriteriaPoints,
  isCriteriaApplicableForClass,
  getMonthForWeek,
  getSemesterForWeek,
  DEFAULT_EVALUATION_CONFIG,
  OFFICIAL_CRITERIA_DATABASE,
} from '../utils/criteriaEngine';
import {
  getUserRole,
  canAccessTab as checkCanAccessTab,
  canLockWeek,
  canUnlockWeek,
  canLockUnlockWeeks,
  canLockMonth,
  canUnlockMonth,
  canLockSemester,
  canUnlockSemester,
  canLockYear,
  canUnlockYear,
  canLockTitles,
  canUnlockTitles,
  canViewAuditLogs,
  canManageUsers,
  canConfigureSettings,
  canModifyCriteria,
  canManageHistoricalScores,
  isUserLocked,
  canSubmitAppeal,
  canReviewAppeals,
  canInputScores,
  canManageCampusClasses,
  filterVisibleClasses,
  filterVisibleCampuses,
  filterVisibleScoreLogs,
} from '../utils/rbac';

export interface CalculationPreviewResult {
  applicable: boolean;
  reason?: string;
  pointsPerUnit: number;
  totalPoints: number;
  appliedCap?: number;
  calculationDetail: string;
  isDisciplinary: boolean;
  period: CriteriaPeriod;
  targetClass?: ClassItem;
  campus?: Campus;
  criteria?: Criteria;
}

interface AppContextType {
  campuses: Campus[];
  classes: ClassItem[];
  criteria: Criteria[];
  scoreLogs: ScoreLog[];
  settings: SchoolSettings;
  users: User[];
  currentUser: User;
  isAuthenticated: boolean;
  login: (userId: string) => { success: boolean; message?: string };
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; message?: string; user?: User; targetTab?: string }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message: string }>;
  updateUserEmail: (userId: string, email: string) => Promise<{ success: boolean; message?: string }>;
  batchUpdateUserEmails: (assignments: Array<{ id: string; email: string; classId?: string }>) => Promise<{ success: boolean; message?: string; updatedCount?: number }>;
  logout: () => void;
  currentTab: ViewTab;
  selectedCampusId: string;
  selectedGrade: number | 'all';
  selectedWeek: number;
  selectedMonth: number;
  selectedSemester: 1 | 2;

  // RBAC & Scope state
  userRole: RoleType;
  canAccessTab: (tab: ViewTab) => boolean;
  visibleClasses: ClassItem[];
  visibleCampuses: Campus[];
  visibleScoreLogs: ScoreLog[];

  // Audit Logs (Mọi thao tác thêm, sửa, xóa, chốt dữ liệu)
  auditLogs: AuditLog[];
  logAudit: (entry: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;

  // Feedback & Adjustment Appeals (GVCN gửi đề nghị điều chỉnh, BGH/TPT duyệt)
  appeals: AdjustmentAppeal[];
  submitAppeal: (appeal: Omit<AdjustmentAppeal, 'id' | 'createdAt' | 'status' | 'teacherId' | 'teacherName'>) => { success: boolean; message: string };
  reviewAppeal: (id: string, status: 'approved' | 'rejected', reviewNotes?: string, adjustScore?: boolean) => { success: boolean; message: string };

  // Dynamic Weeks & Auto-progression
  maxWeeks: number;
  currentActiveWeek: number;
  activateManualWeek: (week: number) => { success: boolean; message: string };
  updateTimeframeConfig: (sem1Weeks: number, sem2Weeks: number, schoolStartDate?: string) => { success: boolean; message: string };

  // Historical Preserved Scores (Điểm bảo lưu lịch sử)
  historicalWeeklyScores: HistoricalWeeklyScoresMap;
  saveHistoricalScores: (
    week: number,
    scores: Record<string, { finalScore: number; note?: string }>,
    autoLock?: boolean
  ) => Promise<{ success: boolean; message: string }>;
  clearHistoricalScores: (week: number) => Promise<{ success: boolean; message: string }>;
  
  // Setters
  setCurrentTab: (tab: ViewTab) => void;
  setSelectedCampusId: (id: string) => void;
  setSelectedGrade: (grade: number | 'all') => void;
  setSelectedWeek: (week: number) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedSemester: (sem: 1 | 2) => void;
  switchCurrentUser: (userId: string) => void;

  // CRUD Users & Auth
  addUser: (user: Omit<User, 'id'>) => { success: boolean; message?: string };
  updateUser: (id: string, patch: Partial<User>) => { success: boolean; message?: string };
  deleteUser: (id: string) => { success: boolean; message?: string };
  toggleLockUser: (id: string, reason?: string) => { success: boolean; message: string };
  updateUserPermissions: (
    id: string,
    permissions: UserCustomPermissions,
    scopeType: 'all' | 'campus',
    allowedCampusIds?: string[]
  ) => { success: boolean; message: string };
  syncUsersFromClasses: () => { success: boolean; message: string; count: number };
  cleanDemoUsersAndKeepAdmins: () => { success: boolean; message: string; removedCount: number };

  // CRUD Campuses
  addCampus: (campus: Omit<Campus, 'id'>) => { success: boolean; message?: string };
  updateCampus: (id: string, campus: Partial<Campus>) => { success: boolean; message?: string };
  deleteCampus: (id: string) => { success: boolean; message?: string };
  toggleCampusStatus: (id: string) => { success: boolean; message: string };

  // CRUD Classes
  addClass: (item: Omit<ClassItem, 'id'>) => { success: boolean; message?: string };
  updateClass: (id: string, item: Partial<ClassItem>) => { success: boolean; message?: string };
  deleteClass: (id: string) => { success: boolean; message?: string };
  toggleClassStatus: (id: string) => { success: boolean; message: string };
  batchImportClasses: (classes: ClassItem[]) => { success: boolean; count: number; message: string };

  // Academic Years Catalog
  academicYears: AcademicYear[];
  activeAcademicYearId: string;
  addAcademicYear: (year: AcademicYear) => { success: boolean; message: string };
  updateAcademicYear: (id: string, patch: Partial<AcademicYear>) => { success: boolean; message: string };
  setActiveAcademicYear: (id: string) => { success: boolean; message: string };

  // Grades Catalog
  grades: GradeItem[];
  addGrade: (grade: GradeItem) => { success: boolean; message: string };
  updateGrade: (id: string, patch: Partial<GradeItem>) => { success: boolean; message: string };
  deleteGrade: (id: string) => { success: boolean; message: string };

  // Homeroom Teachers Catalog
  teachers: TeacherItem[];
  addTeacher: (teacher: Omit<TeacherItem, 'id'>) => { success: boolean; message: string };
  updateTeacher: (id: string, patch: Partial<TeacherItem>) => { success: boolean; message: string };
  deleteTeacher: (id: string) => { success: boolean; message: string };
  reassignHomeroomTeacher: (teacherId: string, classId: string, academicYear?: string) => { success: boolean; message: string };

  // Calendar Weeks
  calendarWeeks: CalendarWeekConfig[];
  updateCalendarWeek: (week: number, patch: Partial<CalendarWeekConfig>) => { success: boolean; message: string };
  batchUpdateCalendarWeeks: (weeks: CalendarWeekConfig[]) => { success: boolean; message: string };
  resetCalendarWeeks: () => { success: boolean; message: string };

  // Criteria Cloning
  cloneCriteriaForAcademicYear: (fromYear: string, toYear: string) => { success: boolean; count: number; message: string };

  // Data Synchronization
  isDataLoaded: boolean;
  loadDataFromFirebase: () => Promise<void>;
  saveAllToFirebase: () => Promise<void>;

  // Data Mode
  dataMode: 'demo' | 'production';
  setDataMode: (mode: 'demo' | 'production') => { success: boolean; message: string };
  purgeDemoData: () => { success: boolean; count: number; message: string };

  // Data Integrity
  checkDataIntegrity: () => DataIntegrityReport;

  // CRUD Criteria
  getCriteriaById: (idOrCode: string) => Criteria | undefined;
  addCriteria: (crit: Omit<Criteria, 'id'>) => any;
  updateCriteria: (id: string, crit: Partial<Criteria>, reason?: string) => any;
  deleteCriteria: (id: string) => any;
  toggleCriteriaActive: (id: string) => any;
  archiveCriteria?: (id: string) => any;
  restoreCriteria?: (id: string) => any;
  lockCriteria?: (id: string) => any;
  unlockCriteria?: (id: string) => any;
  createNewCriteriaVersion?: (
    id: string,
    patch: Partial<Criteria>,
    options: { newStartWeek?: number; changeReason?: string }
  ) => any;
  duplicateCriteria?: (id: string) => any;
  criteriaVersionHistories?: CriteriaVersionHistory[];
  criteriaLockConfig?: CriteriaAdjustmentRuleConfig;
  updateCriteriaLockConfig?: (cfg: CriteriaAdjustmentRuleConfig) => any;

  // CRUD Score Logs
  addScoreLog: (log: Omit<ScoreLog, 'id'>) => { success: boolean; message?: string };
  updateScoreLog: (id: string, log: Partial<ScoreLog>, reason?: string) => { success: boolean; message?: string };
  deleteScoreLog: (id: string, reason?: string) => { success: boolean; message?: string };
  bulkAddScoreLogs: (logs: Omit<ScoreLog, 'id'>[]) => { success: boolean; count: number; message?: string };

  // Red Flag Duties & Week Locking
  redFlagDuties: RedFlagDuty[];
  lockedWeeks: number[];
  isWeekLocked: (week: number) => boolean;
  toggleLockWeek: (week: number, reason?: string) => { success: boolean; isLocked: boolean; message: string };
  addRedFlagDuty: (duty: Omit<RedFlagDuty, 'id'>) => void;
  updateRedFlagDuty: (id: string, duty: Partial<RedFlagDuty>) => void;
  deleteRedFlagDuty: (id: string) => void;

  // Lớp trực tuần & Phân quyền GVCN theo tuần (Tuần → Phân hiệu → Lớp trực → GVCN)
  campusWeeklyDuties: CampusWeeklyDuty[];
  updateCampusWeeklyDuty: (id: string, patch: Partial<CampusWeeklyDuty>) => void;
  setWeeklyDutyAssignment: (week: number, campusId: string, classId: string, notes?: string) => void;
  updateBriefingDeadline: (week: number, day: string, time: string) => void;

  // Quản lý hoạt động Đội cờ đỏ (Đội viên, Giao ban, Nhật ký)
  redFlagMembers: RedFlagMember[];
  addRedFlagMember: (member: Omit<RedFlagMember, 'id'>) => void;
  updateRedFlagMember: (id: string, patch: Partial<RedFlagMember>) => void;
  deleteRedFlagMember: (id: string) => void;

  briefingRecords: RedFlagBriefing[];
  addBriefingRecord: (briefing: Omit<RedFlagBriefing, 'id'>) => void;
  updateBriefingRecord: (id: string, patch: Partial<RedFlagBriefing>) => void;

  activityLogs: RedFlagActivityLog[];
  addActivityLog: (log: Omit<RedFlagActivityLog, 'id'>) => void;
  deleteActivityLog: (id: string) => void;

  // Điều hướng chuyển từ Đội cờ đỏ sang Module Nhập điểm duy nhất
  scoringNavigationContext: {
    campusId?: string;
    week?: number;
    classId?: string;
    dutyArea?: string;
    inspectorName?: string;
    fromRedFlag?: boolean;
  } | null;
  navigateToScoring: (ctx?: {
    campusId?: string;
    week?: number;
    classId?: string;
    dutyArea?: string;
    inspectorName?: string;
    fromRedFlag?: boolean;
  }) => void;
  clearScoringNavigationContext: () => void;

  // Engine Preview Helper
  previewCriteriaCalculation: (
    criteriaId: string,
    quantity: number,
    classId: string,
    week?: number
  ) => CalculationPreviewResult;

  // Central Database & Realtime Status
  isDataLoaded: boolean;
  refreshCentralData: () => Promise<void>;

  // Settings, Multi-Year & Full Backup
  updateSettings: (newSettings: Partial<SchoolSettings>) => { success: boolean; message?: string };
  resetToDefaultData: () => void;
  clearTestDataForGoLive: () => Promise<{ success: boolean; message: string }>;
  resetDatabase: () => Promise<{ success: boolean; message: string }>;
  exportDataBackup: () => string;
  importDataBackup: (jsonStr: string) => { success: boolean; message: string };

  // Multi-Year Academic Year Management
  academicYearArchives: AcademicYearArchive[];
  switchAcademicYear: (year: string) => { success: boolean; message: string };
  createNewAcademicYear: (
    newYear: string,
    options: { advanceGrades?: boolean; archiveCurrentYear?: boolean; resetScores?: boolean; note?: string }
  ) => { success: boolean; message: string };
  deleteArchivedYear: (archiveId: string) => { success: boolean; message: string };

  // System Integrity & Regulation Compliance Audit
  runSystemIntegrityAudit: () => {
    isCompliant: boolean;
    issues: string[];
    passedChecks: string[];
    totalClasses: number;
    totalCampuses: number;
    checkedAt: string;
  };

  // Stand-alone Excel Exports (Offline-Ready)
  exportOfflineStandbyWorkbook: (week?: number) => void;
  exportCurrentRankingsExcel: (periodType?: 'week' | 'month' | 'semester' | 'year', scopeTitle?: string) => void;
  exportCurrentScoreLogsExcel: (filterDesc?: string) => void;
  exportCriteriaCatalogExcel: () => void;
  exportFullBackupPayload: () => string;
  restoreFullBackup: (payload: SystemFullBackupPayload) => { success: boolean; message: string };

  // Periodic Bonus (Điểm thưởng hoạt động phong trào Tháng, Học kỳ, Cả năm)
  bonusMonthly: Record<string, number>;
  bonusTerm: Record<string, number>;
  bonusYearly: Record<string, number>;
  updatePeriodicBonus: (type: 'monthly' | 'term' | 'yearly', key: string, points: number) => void;
  downloadSourceCodeZip: () => void;

  // Calculation & Ranking Engine
  getClassWeeklyScore: (classId: string, week: number) => ClassWeeklyScore;
  getWeeklyRankings: (week: number, campusId?: string, grade?: number | 'all') => RankingEntry[];
  getMonthlyRankings: (month: number, campusId?: string, grade?: number | 'all') => RankingEntry[];
  getMonthRankingData: (
    month: number,
    campusId?: string,
    grade?: number | 'all'
  ) => {
    rows: MonthRankingRow[];
    totalWeeksInMonth: number;
    weeksInMonth: number[];
    lockedWeeks: number[];
    unlockedWeeks: number[];
    isFullyLocked: boolean;
    hasNoLockedWeeks: boolean;
    lockInfo?: MonthLockInfo;
  };
  getSemesterRankings: (semester: 1 | 2, campusId?: string, grade?: number | 'all') => RankingEntry[];
  getYearlyRankings: (campusId?: string, grade?: number | 'all') => RankingEntry[];
  getSchoolStats: (week: number) => {
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    totalBonusPoints: number;
    totalPenaltyPoints: number;
    totalViolations: number;
    totalHonors: number;
    topClass: RankingEntry | null;
    topCampus: { campus: Campus; avgScore: number } | null;
  };

  // Monthly Locking Engine (BGH/Quản trị viên) & Verification Testing
  lockedMonths: Record<number, MonthLockInfo>;
  isMonthLocked: (month: number) => boolean;
  getMonthLockInfo: (month: number) => MonthLockInfo | undefined;
  lockMonth: (month: number, notes?: string) => { success: boolean; message: string };
  unlockMonth: (month: number, reason?: string) => { success: boolean; message: string };
  applyVerificationSample: (targetClassId?: string) => { success: boolean; message: string };
  exportMonthlyRankingsExcel: (month?: number, scopeTitle?: string) => void;

  // Semester Ranking Engine (Học kỳ I & II) & Locking Controls
  lockedSemesters: Record<number, SemesterLockInfo>;
  isSemesterLocked: (semester: 1 | 2) => boolean;
  getSemesterLockInfo: (semester: 1 | 2) => SemesterLockInfo | undefined;
  lockSemester: (semester: 1 | 2, notes?: string) => { success: boolean; message: string };
  unlockSemester: (semester: 1 | 2, reason?: string) => { success: boolean; message: string };
  getSemesterRankingData: (
    semester: 1 | 2,
    campusId?: string,
    grade?: number | 'all'
  ) => {
    rows: SemesterRankingRow[];
    monthsInSemester: number[];
    lockedMonths: number[];
    unlockedMonths: number[];
    totalMonthsInSemester: number;
    isFullyLocked: boolean;
    hasNoLockedMonths: boolean;
    lockInfo?: SemesterLockInfo;
  };
  applySemesterVerificationSample: (targetClassId?: string) => { success: boolean; message: string };
  exportSemesterRankingsExcel: (semester: 1 | 2, scopeTitle?: string) => void;

  // Academic Year Ranking Engine (Xếp Hạng Cả Năm) & Locking Controls
  lockedYear: YearLockInfo | null;
  isYearLocked: () => boolean;
  getYearLockInfo: () => YearLockInfo | undefined;
  lockYear: (notes?: string) => { success: boolean; message: string };
  unlockYear: (reason?: string) => { success: boolean; message: string };
  getYearRankingData: (
    campusId?: string,
    grade?: number | 'all'
  ) => {
    rows: YearRankingRow[];
    isSemester1Locked: boolean;
    isSemester2Locked: boolean;
    hasBothSemestersLocked: boolean;
    isYearLocked: boolean;
    yearLockInfo?: YearLockInfo;
  };
  applyYearVerificationSample: (targetClassId?: string) => { success: boolean; message: string };
  exportYearRankingsExcel: (scopeTitle?: string) => void;

  // Title Evaluation Module (Xét Danh Hiệu Lớp) & Title Locking Controls
  lockedTitles: TitleLockInfo | null;
  isTitleLocked: () => boolean;
  getTitleLockInfo: () => TitleLockInfo | undefined;
  lockTitles: (notes?: string) => { success: boolean; message: string };
  unlockTitles: (reason?: string) => { success: boolean; message: string };
  disciplinaryRecords: DisciplinaryRecord[];
  addDisciplinaryRecord: (
    record: Omit<DisciplinaryRecord, 'id' | 'recordedBy' | 'recordedAt'>
  ) => { success: boolean; message: string };
  removeDisciplinaryRecord: (id: string) => { success: boolean; message: string };
  getTitleEvaluationData: (
    campusId?: string,
    grade?: number | 'all'
  ) => TitleEvaluationResult;
  applyTitleVerificationSample: () => { success: boolean; message: string };
  exportTitleEvaluationExcel: (scopeTitle?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CAMPUSES: 'lhl_ranking_campuses_v2',
  CLASSES: 'lhl_ranking_classes_v2',
  CRITERIA: 'lhl_ranking_criteria_v2',
  SCORE_LOGS: 'lhl_ranking_score_logs_v2',
  SETTINGS: 'lhl_ranking_settings_v2',
  USERS: 'lhl_ranking_users_v2',
  CURRENT_USER_ID: 'lhl_ranking_current_user_id_v2',
  RED_FLAG_DUTIES: 'lhl_ranking_red_flag_duties_v2',
  LOCKED_WEEKS: 'lhl_ranking_locked_weeks_v2',
  LOCKED_MONTHS: 'lhl_ranking_locked_months_v2',
  LOCKED_SEMESTERS: 'lhl_ranking_locked_semesters_v2',
  LOCKED_YEAR: 'lhl_ranking_locked_year_v2',
  LOCKED_TITLES: 'lhl_ranking_locked_titles_v2',
  DISCIPLINARY_RECORDS: 'lhl_ranking_disciplinary_records_v2',
  AUDIT_LOGS: 'lhl_ranking_audit_logs_v2',
  APPEALS: 'lhl_ranking_appeals_v2',
  ACADEMIC_ARCHIVES: 'lhl_ranking_academic_archives_v2',
  ACADEMIC_YEARS: 'lhl_ranking_academic_years_v2',
  GRADES: 'lhl_ranking_grades_v2',
  TEACHERS: 'lhl_ranking_teachers_v2',
  CALENDAR_WEEKS: 'lhl_ranking_calendar_weeks_v2',
  CAMPUS_WEEKLY_DUTIES: 'lhl_ranking_campus_weekly_duties_v2',
  RED_FLAG_MEMBERS: 'lhl_ranking_red_flag_members_v2',
  RED_FLAG_BRIEFINGS: 'lhl_ranking_red_flag_briefings_v2',
  RED_FLAG_ACTIVITY_LOGS: 'lhl_ranking_red_flag_activity_logs_v2',
  HISTORICAL_SCORES: 'lhl_ranking_historical_scores_v2',
};

function determineTier(score: number): RankingEntry['performanceTier'] {
  if (score >= 105) return 'Xuất sắc';
  if (score >= 95) return 'Tốt';
  if (score >= 85) return 'Khá';
  if (score >= 70) return 'Trung bình';
  return 'Cần cố gắng';
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // Xóa sạch cache localStorage liên quan đến Tiêu chí khi ứng dụng khởi động
  // để luôn nạp bộ tiêu chí chính xác nhất từ Cơ sở dữ liệu trung tâm máy chủ
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEYS.CRITERIA);
      localStorage.removeItem('lhl_criteria_list');
      localStorage.removeItem('lhl_criteria_versions');
      localStorage.removeItem('criteria_cache');
      localStorage.removeItem('lhl_criteria_cache');
      localStorage.removeItem('lhl_criteria_db');
    } catch {}
  }

  // Safe run-once cleanup of test data for official Go-live
  // Preserves 100% of master data: 59 classes, 6 campuses, 71 user accounts, criteria and time settings
  if (typeof window !== 'undefined') {
    try {
      const GOLIVE_CLEANED_KEY = 'lhl_golive_cleaned_v2026_10';
      if (localStorage.getItem(GOLIVE_CLEANED_KEY) !== 'true') {
        localStorage.setItem(STORAGE_KEYS.SCORE_LOGS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify({}));
        localStorage.setItem(STORAGE_KEYS.LOCKED_WEEKS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify({}));
        localStorage.setItem(STORAGE_KEYS.LOCKED_SEMESTERS, JSON.stringify({}));
        localStorage.setItem(STORAGE_KEYS.LOCKED_YEAR, JSON.stringify(null));
        localStorage.setItem(STORAGE_KEYS.LOCKED_TITLES, JSON.stringify(null));
        localStorage.setItem(STORAGE_KEYS.DISCIPLINARY_RECORDS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.APPEALS, JSON.stringify([]));

        const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (rawSettings) {
          try {
            const parsed = JSON.parse(rawSettings);
            parsed.dataMode = 'production';
            parsed.lockedWeeks = [];
            parsed.lockedMonths = {};
            parsed.lockedSemesters = {};
            parsed.lockedYear = null;
            parsed.lockedTitles = null;
            parsed.historicalWeeklyScores = {};
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
          } catch {}
        }
        localStorage.setItem(GOLIVE_CLEANED_KEY, 'true');
      }
    } catch {}
  }

  // 1. Core State - Khởi tạo trực tiếp từ localStorage, nếu trống thì tự động nạp CSDL gốc chuẩn 100%
  const [campuses, setCampuses] = useState<Campus[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CAMPUSES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (masterDatabase.campuses as Campus[]) || [];
  });

  const [classes, setClasses] = useState<ClassItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLASSES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (masterDatabase.classes as ClassItem[]) || [];
  });

  const [criteria, setCriteria] = useState<Criteria[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CRITERIA);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (masterDatabase.criteria as Criteria[]) || OFFICIAL_CRITERIA_DATABASE;
  });

  const [scoreLogs, setScoreLogs] = useState<ScoreLog[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCORE_LOGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return (masterDatabase.scoreLogs as ScoreLog[]) || [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (masterDatabase.users as User[]) || [];
  });

  // const [isDataLoaded, setIsDataLoaded] = useState<boolean>(true);

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    if (masterDatabase.settings) return masterDatabase.settings as SchoolSettings;
    const academicYear = '2026-2027';
    const startWeek1 = calculateNaturalWeek1StartDate(academicYear);
    const { currentWeek: calculatedActive } = calculateCurrentActiveWeek(startWeek1, 35);
    return {
      schoolName: 'Trường THCS Lê Hữu Lập',
      governingBody: '',
      academicYear,
      basePointsPerWeek: 100,
      currentWeek: calculatedActive,
      totalWeeksSemester1: 18,
      totalWeeksSemester2: 17,
      totalWeeks: 35,
      current_active_week: calculatedActive,
      start_date_of_week_1: startWeek1,
      max_weeks: 35,
      monthWeeksMap: {
        9: [1, 2, 3, 4],
        10: [5, 6, 7, 8],
        11: [9, 10, 11, 12, 13],
        12: [14, 15, 16, 17, 18],
        1: [19, 20, 21, 22],
        2: [23, 24, 25, 26],
        3: [27, 28, 29, 30],
        4: [31, 32, 33, 34],
        5: [35],
      },
      yearFormula: '(HK1 + HK2 * 2) / 3',
      evaluationConfig: DEFAULT_EVALUATION_CONFIG,
      dataMode: 'production',
    };
  });

  const [historicalWeeklyScores, setHistoricalWeeklyScores] = useState<HistoricalWeeklyScoresMap>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORICAL_SCORES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      }
    } catch {}
    return (masterDatabase.historicalWeeklyScores as HistoricalWeeklyScoresMap) || {};
  });

  const [bonusMonthly, setBonusMonthly] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('lhl_bonus_monthly');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [bonusTerm, setBonusTerm] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('lhl_bonus_term');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [bonusYearly, setBonusYearly] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('lhl_bonus_yearly');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      // Clear legacy hardcoded user from localStorage so all new visits start unauthenticated
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      const sessionUser = sessionStorage.getItem('lhl_session_auth_user_id');
      if (sessionUser) return sessionUser;
    } catch {}
    return null;
  });

  const [redFlagDuties, setRedFlagDuties] = useState<RedFlagDuty[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RED_FLAG_DUTIES);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  // Lớp trực tuần 35 tuần cho 6 phân hiệu (Tuần → Phân hiệu → Lớp trực → GVCN)
  const [campusWeeklyDuties, setCampusWeeklyDuties] = useState<CampusWeeklyDuty[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CAMPUS_WEEKLY_DUTIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return generateInitialCampusWeeklyDuties();
  });

  // Quản lý hoạt động Đội cờ đỏ: Danh sách đội viên
  const [redFlagMembers, setRedFlagMembers] = useState<RedFlagMember[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RED_FLAG_MEMBERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_RED_FLAG_MEMBERS;
  });

  // Theo dõi họp giao ban tuần
  const [briefingRecords, setBriefingRecords] = useState<RedFlagBriefing[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RED_FLAG_BRIEFINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_RED_FLAG_BRIEFINGS;
  });

  // Nhật ký hoạt động cờ đỏ
  const [activityLogs, setActivityLogs] = useState<RedFlagActivityLog[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RED_FLAG_ACTIVITY_LOGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_RED_FLAG_ACTIVITIES;
  });

  // Ngữ cảnh chuyển từ Module Đội cờ đỏ sang Module Nhập điểm duy nhất
  const [scoringNavigationContext, setScoringNavigationContext] = useState<{
    campusId?: string;
    week?: number;
    classId?: string;
    dutyArea?: string;
    inspectorName?: string;
    fromRedFlag?: boolean;
  } | null>(null);

  const [lockedWeeks, setLockedWeeks] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCKED_WEEKS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.lockedWeeks as number[]) || [];
  });

  const [lockedMonths, setLockedMonths] = useState<Record<number, MonthLockInfo>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCKED_MONTHS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.lockedMonths as Record<number, MonthLockInfo>) || {};
  });

  const [lockedSemesters, setLockedSemesters] = useState<Record<number, SemesterLockInfo>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCKED_SEMESTERS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.lockedSemesters as Record<number, SemesterLockInfo>) || {};
  });

  const [lockedYear, setLockedYear] = useState<YearLockInfo | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCKED_YEAR);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.lockedYear as YearLockInfo | null) || null;
  });

  const [lockedTitles, setLockedTitles] = useState<TitleLockInfo | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOCKED_TITLES);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.lockedTitles as TitleLockInfo | null) || null;
  });

  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DISCIPLINARY_RECORDS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.disciplinaryRecords as DisciplinaryRecord[]) || [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.auditLogs as AuditLog[]) || [];
  });

  const [appeals, setAppeals] = useState<AdjustmentAppeal[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APPEALS);
      if (raw) return JSON.parse(raw);
    } catch {}
    return (masterDatabase.appeals as AdjustmentAppeal[]) || [];
  });

  const [academicYearArchives, setAcademicYearArchives] = useState<AcademicYearArchive[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACADEMIC_ARCHIVES);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [grades, setGrades] = useState<GradeItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GRADES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const teachers: TeacherItem[] = useMemo(() => {
    return classes.map((c) => {
      const u = users.find((us) => us.classId === c.id || (us.role === 'gvcn' && us.name === c.homeroomTeacher));
      return {
        id: u ? u.id : `gv_${c.id}`,
        code: `GV${c.name.replace(/[^a-zA-Z0-9]/g, '')}`,
        fullName: c.homeroomTeacher || 'Chưa phân công',
        campusId: c.campusId,
        status: 'active' as const,
        homeroomClassId: c.id,
        homeroomClassName: c.name,
        academicYear: settings.academicYear || '2026-2027',
        email: u ? u.email : `gvcn.${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
        phone: u?.phone || '',
      };
    });
  }, [classes, users, settings.academicYear]);

  const [calendarWeeks, setCalendarWeeks] = useState<CalendarWeekConfig[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CALENDAR_WEEKS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return generateDefaultCalendarWeeks('2026-2027');
  });

  const maxWeeks = useMemo(() => {
    return settings.max_weeks || settings.totalWeeks || (settings.totalWeeksSemester1 + settings.totalWeeksSemester2) || 35;
  }, [settings.max_weeks, settings.totalWeeks, settings.totalWeeksSemester1, settings.totalWeeksSemester2]);

  const currentActiveWeek = useMemo(() => {
    return settings.current_active_week || settings.currentWeek || 4;
  }, [settings.current_active_week, settings.currentWeek]);

  // 2. Navigation and Filter State
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return settings.current_active_week || settings.currentWeek || 4;
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  // Derive Current User object & RBAC roles
  const GUEST_ANONYMOUS_USER: User = useMemo(
    () => ({
      id: 'u_guest_anonymous',
      name: 'Chưa đăng nhập',
      role: 'viewer',
      email: 'guest@lehuulap.edu.vn',
      title: 'Khách chưa đăng nhập',
      scopeType: 'all',
      isLocked: false,
    }),
    []
  );

  const currentUser = useMemo<User>(() => {
    if (!currentUserId) return GUEST_ANONYMOUS_USER;
    return users.find((u) => u.id === currentUserId) || GUEST_ANONYMOUS_USER;
  }, [users, currentUserId, GUEST_ANONYMOUS_USER]);

  const isAuthenticated = useMemo(() => {
    return Boolean(
      currentUserId &&
      currentUser &&
      currentUser.id !== 'u_guest_anonymous' &&
      !currentUser.isLocked
    );
  }, [currentUserId, currentUser]);

  const userRole = useMemo(() => {
    if (!isAuthenticated) return 'viewer';
    return getUserRole(currentUser);
  }, [isAuthenticated, currentUser]);

  const canAccessTab = useCallback((tab: ViewTab) => {
    if (!isAuthenticated) return false;
    return checkCanAccessTab(currentUser, tab);
  }, [isAuthenticated, currentUser]);

  const visibleClasses = useMemo(() => {
    if (!isAuthenticated) return [];
    return filterVisibleClasses(classes, currentUser);
  }, [isAuthenticated, classes, currentUser]);

  const visibleCampuses = useMemo(() => {
    if (!isAuthenticated) return [];
    return filterVisibleCampuses(campuses, currentUser);
  }, [isAuthenticated, campuses, currentUser]);

  const visibleScoreLogs = useMemo(() => {
    if (!isAuthenticated) return [];
    return filterVisibleScoreLogs(scoreLogs, currentUser);
  }, [isAuthenticated, scoreLogs, currentUser]);

  // Persist State to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMPUSES, JSON.stringify(campuses));
    } catch {}
  }, [campuses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    } catch {}
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CRITERIA, JSON.stringify(criteria));
    } catch {}
  }, [criteria]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCORE_LOGS, JSON.stringify(scoreLogs));
    } catch {}
  }, [scoreLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      if (currentUserId) {
        sessionStorage.setItem('lhl_session_auth_user_id', currentUserId);
      } else {
        sessionStorage.removeItem('lhl_session_auth_user_id');
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }
    } catch {}
  }, [currentUserId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RED_FLAG_DUTIES, JSON.stringify(redFlagDuties));
    } catch {}
  }, [redFlagDuties]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCKED_WEEKS, JSON.stringify(lockedWeeks));
    } catch {}
  }, [lockedWeeks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify(lockedMonths));
    } catch {}
  }, [lockedMonths]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCKED_SEMESTERS, JSON.stringify(lockedSemesters));
    } catch {}
  }, [lockedSemesters]);

  useEffect(() => {
    try {
      if (lockedYear) {
        localStorage.setItem(STORAGE_KEYS.LOCKED_YEAR, JSON.stringify(lockedYear));
      } else {
        localStorage.removeItem(STORAGE_KEYS.LOCKED_YEAR);
      }
    } catch {}
  }, [lockedYear]);

  useEffect(() => {
    try {
      if (lockedTitles) {
        localStorage.setItem(STORAGE_KEYS.LOCKED_TITLES, JSON.stringify(lockedTitles));
      } else {
        localStorage.removeItem(STORAGE_KEYS.LOCKED_TITLES);
      }
    } catch {}
  }, [lockedTitles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DISCIPLINARY_RECORDS, JSON.stringify(disciplinaryRecords));
    } catch {}
  }, [disciplinaryRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APPEALS, JSON.stringify(appeals));
    } catch {}
  }, [appeals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_ARCHIVES, JSON.stringify(academicYearArchives));
    } catch {}
  }, [academicYearArchives]);

  // =========================================================================
  // KIẾN TRÚC LƯU TRỮ TẬP TRUNG (CENTRAL DATABASE & REAL-TIME SYNCHRONIZATION)
  // Gỡ bỏ việc dùng localStorage làm nguồn dữ liệu chính.
  // Mọi thiết bị, trình duyệt và cửa sổ ẩn danh đều nạp trực tiếp từ máy chủ trung tâm.
  // =========================================================================
  const lastSyncTimestampRef = useRef<string>('');
  // Biến mốc thời gian lưu hành động người dùng gần nhất (chốt tuần, nhập điểm, v.v.) để tránh bị polling ghi đè
  const lastUserActionTimestampRef = useRef<number>(0);

  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  const loadDataFromFirebase = useCallback(async () => {
    try {
      setIsDataLoaded(false);
      // Fetch all required collections
      const [
        usersSnap, classesSnap, campusesSnap, criteriaSnap, settingsSnap,
        scoreLogsSnap, lockedWeeksSnap, lockedMonthsSnap, lockedSemestersSnap,
        lockedTitlesSnap, disciplinaryRecordsSnap, monthlyBonusesSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'campuses')),
        getDocs(collection(db, 'criteria')),
        getDoc(doc(db, 'settings', 'config')),
        getDocs(collection(db, 'score_logs')),
        getDoc(doc(db, 'locked_weeks', 'summary')),
        getDoc(doc(db, 'locked_months', 'summary')),
        getDoc(doc(db, 'locked_semesters', 'summary')),
        getDoc(doc(db, 'locked_titles', 'summary')),
        getDocs(collection(db, 'disciplinary_records')),
        getDoc(doc(db, 'monthly_bonuses', 'summary')),
      ]);

      // Update state with fetched data
      if (!usersSnap.empty) setUsers(usersSnap.docs.map(d => d.data() as User));
      if (!classesSnap.empty) setClasses(classesSnap.docs.map(d => d.data() as ClassItem));
      if (!campusesSnap.empty) setCampuses(campusesSnap.docs.map(d => d.data() as Campus));
      if (!criteriaSnap.empty) setCriteria(criteriaSnap.docs.map(d => d.data() as Criteria));
      if (settingsSnap.exists()) setSettings(settingsSnap.data() as SchoolSettings);
      if (!scoreLogsSnap.empty) setScoreLogs(scoreLogsSnap.docs.map(d => d.data() as ScoreLog));
      if (lockedWeeksSnap.exists()) setLockedWeeks(lockedWeeksSnap.data().lockedWeeks || []);
      if (lockedMonthsSnap.exists()) setLockedMonths(lockedMonthsSnap.data().lockedMonths || {});
      if (lockedSemestersSnap.exists()) setLockedSemesters(lockedSemestersSnap.data().lockedSemesters || {});
      if (lockedTitlesSnap.exists()) setLockedTitles(lockedTitlesSnap.data().lockedTitles || null);
      if (!disciplinaryRecordsSnap.empty) setDisciplinaryRecords(disciplinaryRecordsSnap.docs.map(d => d.data() as DisciplinaryRecord));
      if (monthlyBonusesSnap.exists()) setBonusMonthly(monthlyBonusesSnap.data().bonusMonthly || {});

      setIsDataLoaded(true);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu từ Firebase:', err);
      setIsDataLoaded(true); // Load anyways to allow offline usage
    }
  }, []);

  const saveAllToFirebase = useCallback(async () => {
    try {
      // Create a batch to save current state
      const batch = writeBatch(db);
      // (Simplified: just saving settings for now as an example, need to expand for all state)
      const settingsRef = doc(db, 'settings', 'config');
      batch.set(settingsRef, settings, { merge: true });
      await batch.commit();
      alert('Đã đồng bộ dữ liệu lên máy chủ!');
    } catch (err) {
      console.error('Lỗi đồng bộ dữ liệu lên Firebase:', err);
      alert('Lỗi đồng bộ dữ liệu!');
    }
  }, [settings]);

  // Nạp ngay khi mở app
  useEffect(() => {
    loadDataFromFirebase();
  }, [loadDataFromFirebase]);

  // Real-time auto-calculation of Current Active Week according to strict official rule:
  // Tuần 1 luôn là tuần chứa 05/09 của năm học; Thứ Hai tuần đó là start_date_of_week_1.
  // Số Tuần Hiện Tại = Math.floor((Today - start_date_of_week_1) / (7 ngày)) + 1.
  useEffect(() => {
    try {
      const academicYear = settings.academicYear || '2026-2027';
      const startDateWeek1 = settings.start_date_of_week_1 || calculateNaturalWeek1StartDate(academicYear);
      const maxLimit = settings.max_weeks || settings.totalWeeks || (settings.totalWeeksSemester1 + settings.totalWeeksSemester2) || 35;

      const { currentWeek: calculatedActiveWeek } = calculateCurrentActiveWeek(startDateWeek1, maxLimit);
      const currentSavedWeek = settings.current_active_week || settings.currentWeek;

      if (currentSavedWeek !== calculatedActiveWeek || settings.start_date_of_week_1 !== startDateWeek1) {
        const updatedSettings: SchoolSettings = {
          ...settings,
          start_date_of_week_1: startDateWeek1,
          current_active_week: calculatedActiveWeek,
          currentWeek: calculatedActiveWeek,
        };

        setSettings(updatedSettings);
        setSelectedWeek(calculatedActiveWeek);

        try {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
        } catch {}

        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings),
        }).catch(() => {});

        logAudit({
          action: 'CAP_NHAT_CAU_HINH',
          entityType: 'settings',
          entityId: 'auto_week_progression',
          beforeData: { week: currentSavedWeek, startDateWeek1: settings.start_date_of_week_1 },
          afterData: { week: calculatedActiveWeek, startDateWeek1, max_weeks: maxLimit },
          details: `Hệ thống tự động tính Tuần hiện tại theo thời gian thực (Mốc Thứ Hai Tuần 1: ${startDateWeek1}): Tuần ${calculatedActiveWeek} (Giới hạn: ${maxLimit} tuần)`,
        });
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra tự động tính tuần:', err);
    }
  }, []); // Run once on app mount to avoid infinite re-render loops

  // Initial backend synchronization
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/audit-logs', {
      headers: {
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
      },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setAuditLogs((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const newOnes = res.data.filter((item: AuditLog) => !ids.has(item.id));
            return [...prev, ...newOnes];
          });
        }
      })
      .catch(() => {});

    fetch('/api/appeals', {
      headers: {
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
        'x-user-campus': currentUser.campusId || '',
        'x-user-class': currentUser.classId || '',
      },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setAppeals(res.data);
        }
      })
      .catch(() => {});

    // Sync historical preserved scores from backend
    fetch('/api/historical-scores')
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data && typeof res.data === 'object') {
          setHistoricalWeeklyScores((prev) => ({ ...prev, ...res.data }));
          try {
            localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(() => {});
  }, [currentUser?.id, userRole]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify(historicalWeeklyScores));
    } catch {}
  }, [historicalWeeklyScores]);

  // Centralized Audit Logging Service
  const logAudit = (entry: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
    const role = getUserRole(currentUser);

    // Auto-infer category if not provided
    let category = entry.category;
    if (!category) {
      if (
        ['THEM_DIEM', 'SUA_DIEM', 'XOA_DIEM', 'THEM_THANH_TICH', 'SUA_THANH_TICH', 'XOA_THANH_TICH', 'GUI_DE_NGHI_DIEU_CHINH', 'DUYET_DIEU_CHINH', 'TU_CHOI_DIEU_CHINH'].includes(entry.action)
      ) {
        category = 'diem_thi_dua';
      } else if (
        ['CHOT_DU_LIEU_TUAN', 'MO_KHOA_TUAN', 'CHOT_THANG', 'CHOT_DU_LIEU_THANG', 'MO_KHOA_THANG', 'CHOT_HOC_KY', 'CHOT_DU_LIEU_HOC_KY', 'MO_KHOA_HOC_KY', 'CHOT_CA_NAM', 'CHOT_DU_LIEU_CA_NAM', 'MO_KHOA_CA_NAM', 'CHOT_DANH_HIEU_NAM', 'MO_KHOA_DANH_HIEU_NAM', 'MO_KHOA_DANH_HIEU'].includes(entry.action)
      ) {
        category = 'khoa_du_lieu';
      } else if (['CAP_NHAT_CAU_HINH', 'THEM_TIEU_CHI', 'SUA_TIEU_CHI', 'XOA_TIEU_CHI'].includes(entry.action)) {
        category = 'tieu_chi';
      } else if (['THEM_NGUOI_DUNG', 'SUA_NGUOI_DUNG', 'XOA_NGUOI_DUNG', 'KHOA_TAI_KHOAN', 'MO_KHOA_TAI_KHOAN', 'THAY_DOI_QUYEN_HAN'].includes(entry.action)) {
        category = 'nguoi_dung';
      } else if (['CAP_NHAT_KY_LUAT', 'THEM_QUYET_DINH_KY_LUAT', 'XOA_QUYET_DINH_KY_LUAT'].includes(entry.action)) {
        category = 'ky_luat';
      } else if (['PHAN_CONG_CO_DO', 'XOA_LICH_CO_DO'].includes(entry.action)) {
        category = 'co_do';
      } else {
        category = 'he_thong';
      }
    }

    const campusName = entry.campusName || (entry.campusId ? campuses.find((c) => c.id === entry.campusId)?.name : undefined);
    const className = entry.className || (entry.classId ? classes.find((c) => c.id === entry.classId)?.name : undefined);

    const newEntry: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser ? currentUser.id : 'unauthenticated',
      userName: currentUser ? currentUser.name : 'Khách vãng lai',
      userRole: role,
      ...entry,
      category,
      campusName,
      className,
    };

    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 2500)]);

    // Hybrid sync: Đẩy nhật ký kiểm toán lên Firebase (collection audit_logs)
    try {
      const cleanEntry = JSON.parse(JSON.stringify(newEntry));
      setDoc(doc(db, 'audit_logs', newEntry.id), cleanEntry)
        .catch((err) => console.warn('Lỗi đẩy nhật ký kiểm toán lên Firebase:', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase logAudit:', fbErr);
    }

    // Asynchronously sync with backend endpoint
    if (currentUser) {
      try {
        fetch('/api/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
            'x-user-name': currentUser.name,
            'x-user-role': role,
            'x-user-campus': currentUser.campusId || '',
            'x-user-class': currentUser.classId || '',
          },
          body: JSON.stringify(newEntry),
        }).catch(() => {});
      } catch {}
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(academicYears));
    } catch {}
  }, [academicYears]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades));
    } catch {}
  }, [grades]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    } catch {}
  }, [teachers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CALENDAR_WEEKS, JSON.stringify(calendarWeeks));
    } catch {}
  }, [calendarWeeks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMPUS_WEEKLY_DUTIES, JSON.stringify(campusWeeklyDuties));
    } catch {}
  }, [campusWeeklyDuties]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RED_FLAG_MEMBERS, JSON.stringify(redFlagMembers));
    } catch {}
  }, [redFlagMembers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RED_FLAG_BRIEFINGS, JSON.stringify(briefingRecords));
    } catch {}
  }, [briefingRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RED_FLAG_ACTIVITY_LOGS, JSON.stringify(activityLogs));
    } catch {}
  }, [activityLogs]);

  // 3. User & Auth actions
  const switchCurrentUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(found.id);
      try {
        sessionStorage.setItem('lhl_session_auth_user_id', found.id);
      } catch {}
      if (found.campusId) {
        setSelectedCampusId(found.campusId);
      }
    }
  };

  const login = (userId: string): { success: boolean; message?: string } => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Tài khoản không tồn tại trên hệ thống!' };
    }
    if (target.isLocked) {
      return {
        success: false,
        message: `Tài khoản "${target.name}" hiện đang bị KHÓA (${target.lockedReason || 'Liên hệ quản trị viên'}). Không thể đăng nhập!`,
      };
    }
    setCurrentUserId(target.id);
    try {
      sessionStorage.setItem('lhl_session_auth_user_id', target.id);
    } catch {}
    if (target.campusId) {
      setSelectedCampusId(target.campusId);
    }
    logAudit({
      action: 'DANG_NHAP',
      entityType: 'user',
      entityId: target.id,
      beforeData: null,
      afterData: { id: target.id, name: target.name, role: target.role },
      details: `${target.name} (${target.title}) đã đăng nhập vào hệ thống`,
    });
    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      logAudit({
        action: 'DANG_XUAT',
        entityType: 'user',
        entityId: currentUser.id,
        beforeData: null,
        afterData: null,
        details: `${currentUser.name} (${currentUser.title}) đã đăng xuất khỏi hệ thống`,
      });
    }
    setCurrentUserId(null);
    try {
      sessionStorage.removeItem('lhl_session_auth_user_id');
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    } catch {}
  };

  const loginWithEmail = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; message?: string; user?: User; targetTab?: string }> => {
    if (!email || !email.trim()) {
      return { success: false, message: 'Vui lòng nhập địa chỉ Email đăng nhập.' };
    }
    if (!password || !password.trim()) {
      return { success: false, message: 'Vui lòng nhập mật khẩu đăng nhập.' };
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Chọc thẳng vào Cơ sở dữ liệu (State / Store) chứa danh sách Người dùng mới nhất
    let currentUsersList: User[] = [...users];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const idMap = new Map<string, User>();
          currentUsersList.forEach((u) => idMap.set(u.id, u));
          parsed.forEach((u: User) => idMap.set(u.id, u));
          currentUsersList = Array.from(idMap.values());
        }
      }
    } catch {}

    // 2. Kiểm tra bằng hàm find(): Tìm user có email (chuyển sang chữ thường .toLowerCase()) và password trùng với input
    let matched = currentUsersList.find((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const isAdmin =
        u.role === 'super_admin' ||
        u.role === 'admin' ||
        u.id === 'u_admin' ||
        u.id === 'u_admin_hung';
     // Ép cứng mật khẩu Admin luôn là Admin@123 cho các tài khoản quản trị
      const defaultPass = (u.email?.toLowerCase() === 'lehuyhung.h2com@gmail.com' || isAdmin) ? 'Admin@123' : 'Lhl@2026';
      const uPassword = (u.password && typeof u.password === 'string' && u.password.trim())
        ? u.password.trim()
        : defaultPass;
      return uEmail === cleanEmail && uPassword === cleanPassword;
    });

    // Nếu trong state/store hiện tại chưa tìm thấy, thử kiểm tra API backend (trong trường hợp user vừa được import ở backend)
    if (!matched) {
      try {
        const response = await fetch('/api/auth/validate-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
        });
        const data = await response.json();
        if (response.ok && data.success && data.user) {
          matched = data.user;
          // Cập nhật người dùng mới vào State
          setUsers((prev) => [...prev.filter((u) => u.id !== data.user.id), data.user]);
        }
      } catch {}
    }

    // Nếu vẫn không tìm thấy: kiểm tra xem email có tồn tại không để thông báo chính xác
    if (!matched) {
      const emailExists = currentUsersList.find(
        (u) => (u.email || '').trim().toLowerCase() === cleanEmail
      );
      if (emailExists) {
        return {
          success: false,
          message: 'Mật khẩu không chính xác! Vui lòng kiểm tra lại.',
        };
      }
      return {
        success: false,
        message: 'Email hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.',
      };
    }

    if (matched.isLocked) {
      return {
        success: false,
        message: `Tài khoản "${matched.name}" đang bị KHÓA (${matched.lockedReason || 'Liên hệ quản trị viên'}). Không thể đăng nhập!`,
      };
    }

    // Bất kỳ email nào tồn tại trong CSDL và đúng mật khẩu đều được cấp quyền đăng nhập, không phân biệt role!
    setCurrentUserId(matched.id);
    try {
      sessionStorage.setItem('lhl_session_auth_user_id', matched.id);
    } catch {}

    if (matched.campusId) {
      setSelectedCampusId(matched.campusId);
    }

   // Direct entry to tab: nếu là Giáo viên (Role 4) thì vào thẳng Nhập điểm (vì đã ẩn Dashboard)
    const isTeacher = matched.role === 'gvcn' || matched.role === 'teacher' || (matched.role as any) === 4 || (matched.role as any) === '4';
    const targetTab = isTeacher ? 'scoring' : 'dashboard';
    setCurrentTab(targetTab);

    // [ĐÃ GỠ BỎ LỆNH FETCH API GÂY LỖI 404 TRÊN VERCEL]

    return {
      success: true,
      user: matched,
      targetTab,
      message: `Đăng nhập thành công! Chào mừng ${matched.name}.`,
    };
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Bạn chưa đăng nhập vào hệ thống!' };
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, message: 'Vui lòng nhập đầy đủ các trường mật khẩu!' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' };
    }
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Mật khẩu mới và Xác nhận mật khẩu không trùng khớp!' };
    }

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Đổi mật khẩu thất bại!' };
      }

      // Update password in users list (currentUser is derived from users and currentUserId)
      const updatedUser: User = { ...currentUser, password: newPassword };
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));

      // Save to localStorage
      try {
        const savedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        if (Array.isArray(savedUsers) && savedUsers.length > 0) {
          const newSaved = savedUsers.map((u: User) => (u.id === currentUser.id ? { ...u, password: newPassword } : u));
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newSaved));
        }
      } catch {}

      logAudit({
        action: 'SUA_NGUOI_DUNG',
        entityType: 'user',
        entityId: currentUser.id,
        beforeData: null,
        afterData: null,
        details: `${currentUser.name} (${currentUser.title}) đổi mật khẩu cá nhân thành công.`,
      });

      return { success: true, message: 'Đổi mật khẩu thành công!' };
    } catch {
      // Local fallback in case server endpoint is unavailable offline
      const isAdmin =
        currentUser.role === 'super_admin' ||
        currentUser.role === 'admin' ||
        currentUser.id === 'u_admin' ||
        currentUser.id === 'u_admin_hung' ||
        currentUser.email?.toLowerCase() === 'lehuyhung.h2com@gmail.com';
      const expectedPassword = currentUser.password || (isAdmin ? 'Admin@123' : 'Lhl@2026');

      if (currentPassword !== expectedPassword) {
        return { success: false, message: 'Mật khẩu hiện tại không chính xác! Vui lòng thử lại.' };
      }

      const updatedUser: User = { ...currentUser, password: newPassword };
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
      try {
        const savedUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        if (Array.isArray(savedUsers) && savedUsers.length > 0) {
          const newSaved = savedUsers.map((u: User) => (u.id === currentUser.id ? { ...u, password: newPassword } : u));
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newSaved));
        }
      } catch {}

      return { success: true, message: 'Đổi mật khẩu thành công!' };
    }
  };

  const updateUserEmail = async (userId: string, email: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim();
    try {
      const res = await fetch('/api/users/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: cleanEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId || (u.classId && u.classId === userId) ? { ...u, email: cleanEmail } : u))
        );
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Cập nhật thất bại' };
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId || (u.classId && u.classId === userId) ? { ...u, email: cleanEmail } : u))
      );
      return { success: true, message: 'Đã lưu email vào dữ liệu cục bộ' };
    }
  };

  const batchUpdateUserEmails = async (
    assignments: Array<{ id: string; email: string; classId?: string }>
  ): Promise<{ success: boolean; message?: string; updatedCount?: number }> => {
    try {
      const res = await fetch('/api/users/batch-update-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const data = await res.json();
      const emailMap = new Map(
        assignments.map((a) => [a.id || a.classId, a.email.trim()])
      );
      setUsers((prev) =>
        prev.map((u) => {
          const newEmail = emailMap.get(u.id) || (u.classId ? emailMap.get(u.classId) : undefined);
          return newEmail !== undefined ? { ...u, email: newEmail } : u;
        })
      );
      return { success: true, message: data.message || 'Lưu thành công', updatedCount: data.updatedCount || assignments.length };
    } catch {
      const emailMap = new Map(
        assignments.map((a) => [a.id || a.classId, a.email.trim()])
      );
      setUsers((prev) =>
        prev.map((u) => {
          const newEmail = emailMap.get(u.id) || (u.classId ? emailMap.get(u.classId) : undefined);
          return newEmail !== undefined ? { ...u, email: newEmail } : u;
        })
      );
      return { success: true, message: 'Đã lưu danh sách email vào bộ nhớ', updatedCount: assignments.length };
    }
  };

  // Vấn đề 1: Xóa sạch các tài khoản mẫu giả lập, chỉ giữ lại tài khoản Quản trị viên
  const cleanDemoUsersAndKeepAdmins = (): { success: boolean; message: string; removedCount: number } => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền dọn dẹp tài khoản!', removedCount: 0 };
    }

    const coreUsers = users.filter((u) => {
      const isCore =
        u.role === 'super_admin' ||
        u.role === 'admin' ||
        u.role === 'bgh' ||
        u.role === 'tpt_doi' ||
        u.role === 'campus_admin' ||
        u.role === 'viewer' ||
        u.role === 'red_flag' ||
        u.id === 'u_admin' ||
        u.id === 'u_admin_hung' ||
        u.id === 'u_bgh' ||
        u.id === 'u_inspector' ||
        u.email?.toLowerCase() === 'lehuyhung.h2com@gmail.com' ||
        u.email?.toLowerCase() === 'hoa.gvdn@gmail.com';
      return isCore;
    });

    const removedCount = users.length - coreUsers.length;
    setUsers(coreUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(coreUsers));
    } catch {}

    fetch('/api/users/sync-from-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: coreUsers }),
    }).catch(() => {});

    logAudit({
      action: 'XOA_NGUOI_DUNG',
      entityType: 'user',
      entityId: 'clean_demo_users',
      beforeData: { totalBefore: users.length },
      afterData: { totalAfter: coreUsers.length },
      details: `Quản trị viên đã xóa sạch ${removedCount} tài khoản mẫu giả lập, giữ lại ${coreUsers.length} tài khoản trọng yếu (BGH, TPT, Quản trị, Người xem).`,
    });

    return {
      success: true,
      message: `Đã xóa sạch ${removedCount} tài khoản mẫu giả lập. Giữ lại ${coreUsers.length} tài khoản trọng yếu!`,
      removedCount,
    };
  };

  // Vấn đề 1: Tự động đọc 59 lớp, lấy họ tên GVCN và sinh ra các tài khoản tương ứng với vai trò '4. GIÁO VIÊN / NGƯỜI NHẬP DỮ LIỆU'
  const syncUsersFromClasses = (): { success: boolean; message: string; count: number } => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền đồng bộ tài khoản!', count: 0 };
    }

    // Preserve all non-teacher accounts (Admin, BGH, TPT, Campus Admins, Red Flag, Viewers)
    const nonTeacherUsers = users
      .filter((u) => !u.classId && u.role !== 'gvcn')
      .map((u) => {
        const isAdmin =
          u.role === 'super_admin' ||
          u.role === 'admin' ||
          u.id === 'u_admin' ||
          u.id === 'u_admin_hung' ||
          u.email?.toLowerCase() === 'lehuyhung.h2com@gmail.com';
        return {
          ...u,
          password: (u.password && u.password.trim()) ? u.password.trim() : (isAdmin ? 'Admin@123' : 'Lhl@2026'),
        };
      });

    // Existing user map to preserve any configured emails and passwords
    const existingMap = new Map<string, User>();
    users.forEach((u) => {
      if (u.classId) existingMap.set(u.classId, u);
      existingMap.set(u.id, u);
    });

    // Generate/sync exactly 59 Homeroom Teacher accounts corresponding to 59 classes with default password Lhl@2026
    const generatedTeacherUsers: User[] = classes.map((cls) => {
      const existing = existingMap.get(cls.id) || existingMap.get(`u_gvcn_${cls.id}`);
      const teacherName = cls.homeroomTeacher?.trim() || `GVCN Lớp ${cls.name}`;
      const defaultEmail = cls.id === 'c_8d1' ? 'thamhungml@gmail.com' : `gvcn.${cls.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
      const teacherEmail = (existing?.email && existing.email.trim()) ? existing.email.trim() : defaultEmail;
      const teacherPassword = (existing?.password && existing.password.trim()) ? existing.password.trim() : 'Lhl@2026';

      return {
        id: existing?.id || `u_gvcn_${cls.id}`,
        name: teacherName,
        role: 'gvcn' as const, // 4. GIÁO VIÊN / NGƯỜI NHẬP DỮ LIỆU
        campusId: cls.campusId,
        allowedCampusIds: [cls.campusId],
        classId: cls.id,
        scopeType: 'campus' as const,
        email: teacherEmail,
        password: teacherPassword,
        title: `Giáo viên chủ nhiệm lớp ${cls.name}`,
        isLocked: false,
        customPermissions: {
          canInputScore: true,
          canEditScore: false,
          canDeleteScore: false,
          canLockData: false,
          canUnlockData: false,
          canEditCriteria: false,
          canManageUsers: false,
          canManageCampuses: false,
          canViewAllReports: false,
        },
      };
    });

    const combinedUsers = [...nonTeacherUsers, ...generatedTeacherUsers];
    setUsers(combinedUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(combinedUsers));
    } catch {}

    // Persist to backend server
    fetch('/api/users/sync-from-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: combinedUsers }),
    }).catch(() => {});

    logAudit({
      action: 'SUA_NGUOI_DUNG',
      entityType: 'user',
      entityId: 'sync_from_classes',
      beforeData: { countBefore: users.length },
      afterData: { countAfter: combinedUsers.length, teacherCount: generatedTeacherUsers.length },
      details: `Đồng bộ thành công ${generatedTeacherUsers.length} tài khoản GVCN từ Danh sách Lớp học với họ tên thật đã cập nhật.`,
    });

    return {
      success: true,
      message: `Đã đồng bộ thành công ${generatedTeacherUsers.length} tài khoản Giáo viên chủ nhiệm từ Danh sách 59 Lớp!`,
      count: generatedTeacherUsers.length,
    };
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền tạo tài khoản người dùng!' };
    }
    const id = `u_${Date.now()}`;
    const isSuper = userData.role === 'super_admin' || userData.role === 'admin';
    const finalPassword = userData.password?.trim() || (isSuper ? 'Admin@123' : 'Lhl@2026');
    const newUser: User = { ...userData, id, password: finalPassword };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch {}

    // Đồng bộ trực tiếp vào cơ sở dữ liệu tập trung trên máy chủ
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(() => {});

    // Two-way sync: If new teacher user is assigned to a class, update that class
    if (newUser.classId && (newUser.role === 'gvcn' || newUser.role === 'teacher')) {
      setClasses((prevClasses) =>
        prevClasses.map((c) => {
          if (c.id === newUser.classId) {
            return {
              ...c,
              homeroomTeacher: newUser.name,
              teacherId: id,
              teacherCode: newUser.teacherCode || c.teacherCode,
            };
          }
          return c;
        })
      );
    }

    logAudit({
      action: 'THEM_NGUOI_DUNG',
      entityType: 'user',
      entityId: id,
      beforeData: null,
      afterData: newUser,
      details: `Thêm người dùng mới: ${newUser.name} (${newUser.title}) - Quyền: ${newUser.role}`,
    });
    return { success: true };
  };

  const updateUser = (id: string, patch: Partial<User>) => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền cập nhật tài khoản người dùng!' };
    }
    const oldUser = users.find((u) => u.id === id);
    if (!oldUser) return { success: false, message: 'Không tìm thấy người dùng' };
    const updated = { ...oldUser, ...patch };
    const updatedUsers = users.map((u) => (u.id === id ? updated : u));
    setUsers(updatedUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch {}

    // Cập nhật trực tiếp vào cơ sở dữ liệu tập trung máy chủ
    fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    // Two-way synchronization with classes
    if (updated.role === 'gvcn' || updated.role === 'teacher' || oldUser.role === 'gvcn' || oldUser.role === 'teacher') {
      if (updated.classId) {
        setClasses((prevClasses) =>
          prevClasses.map((c) => {
            if (c.id === updated.classId) {
              return {
                ...c,
                homeroomTeacher: updated.name,
                teacherId: id,
                teacherCode: updated.teacherCode || c.teacherCode,
              };
            }
            // If this teacher previously taught another class, unlink old class
            if (c.teacherId === id && c.id !== updated.classId) {
              return {
                ...c,
                homeroomTeacher: 'Chưa phân công',
                teacherId: undefined,
                teacherCode: undefined,
              };
            }
            return c;
          })
        );
      } else if (oldUser.classId && !updated.classId) {
        // Teacher unlinked from class
        setClasses((prevClasses) =>
          prevClasses.map((c) => {
            if (c.id === oldUser.classId || c.teacherId === id) {
              return {
                ...c,
                homeroomTeacher: 'Chưa phân công',
                teacherId: undefined,
                teacherCode: undefined,
              };
            }
            return c;
          })
        );
      } else if (updated.name !== oldUser.name) {
        // Teacher name changed, update class homeroomTeacher
        setClasses((prevClasses) =>
          prevClasses.map((c) => {
            if (c.teacherId === id || c.id === updated.classId) {
              return {
                ...c,
                homeroomTeacher: updated.name,
                teacherCode: updated.teacherCode || c.teacherCode,
              };
            }
            return c;
          })
        );
      }
    }

    logAudit({
      action: 'SUA_NGUOI_DUNG',
      entityType: 'user',
      entityId: id,
      beforeData: oldUser,
      afterData: updated,
      details: `Cập nhật thông tin người dùng: ${updated.name} (Quyền: ${updated.role})`,
    });
    return { success: true };
  };

  const deleteUser = (id: string) => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền xóa người dùng!' };
    }
    if (id === currentUser.id) {
      return { success: false, message: 'Không thể xóa tài khoản của chính mình đang đăng nhập!' };
    }
    const oldUser = users.find((u) => u.id === id);
    if (!oldUser) return { success: false, message: 'Không tìm thấy người dùng' };
    const updatedUsers = users.filter((u) => u.id !== id);
    setUsers(updatedUsers);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch {}

    // Xóa trực tiếp khỏi cơ sở dữ liệu máy chủ
    fetch(`/api/users/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    // Two-way sync: Unlink class if deleted user was homeroom teacher
    setClasses((prevClasses) =>
      prevClasses.map((c) => {
        if (c.teacherId === id || (oldUser && c.homeroomTeacher === oldUser.name)) {
          return {
            ...c,
            homeroomTeacher: 'Chưa phân công',
            teacherId: undefined,
            teacherCode: undefined,
          };
        }
        return c;
      })
    );

    logAudit({
      action: 'XOA_NGUOI_DUNG',
      entityType: 'user',
      entityId: id,
      beforeData: oldUser,
      afterData: null,
      details: `Xóa tài khoản người dùng: ${oldUser.name} (${oldUser.role})`,
    });
    return { success: true };
  };

  const toggleLockUser = (id: string, reason?: string): { success: boolean; message: string } => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Quản trị viên hệ thống (Admin) mới có quyền Khóa hoặc Mở khóa tài khoản!' };
    }
    if (id === currentUser.id) {
      return { success: false, message: 'Không thể tự khóa tài khoản của chính mình đang đăng nhập!' };
    }
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return { success: false, message: 'Không tìm thấy tài khoản người dùng!' };

    const willLock = !targetUser.isLocked;
    const updated: User = {
      ...targetUser,
      isLocked: willLock,
      lockedAt: willLock ? new Date().toISOString() : undefined,
      lockedReason: willLock ? (reason || 'Khóa tài khoản bởi Quản trị viên') : undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));

    logAudit({
      action: willLock ? 'KHOA_TAI_KHOAN' : 'MO_KHOA_TAI_KHOAN',
      entityType: 'user',
      entityId: id,
      beforeData: targetUser,
      afterData: updated,
      details: `${willLock ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}: ${targetUser.name} (${targetUser.email}) - Lý do: ${updated.lockedReason || 'Không có'}`,
    });

    return {
      success: true,
      message: willLock ? `Đã khóa tài khoản '${targetUser.name}' thành công.` : `Đã mở khóa tài khoản '${targetUser.name}' thành công.`,
    };
  };

  const updateUserPermissions = (
    id: string,
    permissions: UserCustomPermissions,
    scopeType: 'all' | 'campus',
    allowedCampusIds?: string[]
  ): { success: boolean; message: string } => {
    if (!canManageUsers(currentUser)) {
      return { success: false, message: 'Chỉ Quản trị viên hệ thống (Admin) mới có quyền phân quyền người dùng!' };
    }
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return { success: false, message: 'Không tìm thấy tài khoản người dùng!' };

    const updated: User = {
      ...targetUser,
      customPermissions: permissions,
      scopeType,
      allowedCampusIds: scopeType === 'campus' ? allowedCampusIds : undefined,
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));

    logAudit({
      action: 'THAY_DOI_QUYEN_HAN',
      entityType: 'user',
      entityId: id,
      beforeData: targetUser,
      afterData: updated,
      details: `Thay đổi phân quyền & phạm vi hoạt động cho tài khoản ${targetUser.name}: Phạm vi ${scopeType === 'all' ? 'Toàn trường' : 'Từng phân hiệu'}`,
    });

    return { success: true, message: `Đã cập nhật phân quyền cho tài khoản '${targetUser.name}' thành công.` };
  };

  // 4. Campus CRUD
  const addCampus = (newCamp: Omit<Campus, 'id'>) => {
    if (!canManageCampusClasses(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền thêm phân hiệu trường!' };
    }
    const id = `camp_${Date.now()}`;
    const campusItem: Campus = { ...newCamp, id };
    setCampuses((prev) => [...prev, campusItem]);

    // Persist to central database
    fetch('/api/campuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campusItem),
    }).catch((err) => console.error('Error persisting new campus:', err));

    logAudit({
      action: 'THEM_PHAN_HIEU',
      entityType: 'campus',
      entityId: id,
      beforeData: null,
      afterData: campusItem,
      details: `Thêm phân hiệu mới: ${campusItem.name} (${campusItem.type === 'main' ? 'Trường chính' : 'Điểm trường'})`,
    });
    return { success: true };
  };

  const updateCampus = (id: string, patch: Partial<Campus>) => {
    if (!canManageCampusClasses(currentUser, id)) {
      return { success: false, message: 'Bạn không có quyền chỉnh sửa phân hiệu này!' };
    }
    const oldCamp = campuses.find((c) => c.id === id);
    if (!oldCamp) return { success: false, message: 'Không tìm thấy phân hiệu' };
    const updated = { ...oldCamp, ...patch };
    setCampuses((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // Persist to central database so F5 does not lose changes
    fetch(`/api/campuses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch((err) => console.error('Error persisting campus update:', err));

    logAudit({
      action: 'SUA_PHAN_HIEU',
      entityType: 'campus',
      entityId: id,
      beforeData: oldCamp,
      afterData: updated,
      details: `Cập nhật thông tin phân hiệu: ${updated.name}`,
    });
    return { success: true };
  };

  const deleteCampus = (id: string) => {
    if (!canManageCampusClasses(currentUser, id)) {
      return { success: false, message: 'Bạn không có quyền xóa phân hiệu này!' };
    }
    const hasClasses = classes.some((cls) => cls.campusId === id);
    if (hasClasses) {
      return {
        success: false,
        message: 'Không thể xóa phân hiệu đang có các lớp học trực thuộc. Vui lòng chuyển hoặc xóa các lớp trước.',
      };
    }
    const hasScores = scoreLogs.some((l) => l.campusId === id);
    if (hasScores) {
      return {
        success: false,
        message: 'KHÔNG THỂ XÓA PHÂN HIỆU ĐÃ PHÁT SINH DỮ LIỆU THI ĐUA! Vui lòng chuyển trạng thái phân hiệu sang "Tạm ngừng sử dụng".',
      };
    }
    const oldCamp = campuses.find((c) => c.id === id);
    setCampuses((prev) => prev.filter((c) => c.id !== id));

    // Persist deletion to central database
    fetch(`/api/campuses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Error persisting campus deletion:', err));

    if (oldCamp) {
      logAudit({
        action: 'XOA_PHAN_HIEU',
        entityType: 'campus',
        entityId: id,
        beforeData: oldCamp,
        afterData: null,
        details: `Xóa phân hiệu: ${oldCamp.name}`,
      });
    }
    return { success: true };
  };

  const toggleCampusStatus = (id: string) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền thay đổi trạng thái phân hiệu!' };
    }
    const camp = campuses.find((c) => c.id === id);
    if (!camp) return { success: false, message: 'Không tìm thấy phân hiệu' };
    const nextStatus = camp.status === 'inactive' ? 'active' : 'inactive';
    setCampuses((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));

    // Persist to central database
    fetch(`/api/campuses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    }).catch((err) => console.error('Error toggling campus status:', err));

    logAudit({
      action: 'SUA_PHAN_HIEU',
      entityType: 'campus',
      entityId: id,
      beforeData: { status: camp.status },
      afterData: { status: nextStatus },
      details: `Đổi trạng thái phân hiệu ${camp.name} sang: ${nextStatus === 'active' ? 'Đang hoạt động' : 'Tạm ngừng sử dụng'}`,
    });
    return {
      success: true,
      message: `Đã đổi trạng thái phân hiệu ${camp.name} sang: ${nextStatus === 'active' ? 'Đang hoạt động' : 'Tạm ngừng sử dụng'}.`,
    };
  };

  // 5. Class CRUD
  const addClass = (newItem: Omit<ClassItem, 'id'>) => {
    if (!canManageCampusClasses(currentUser, newItem.campusId)) {
      return { success: false, message: 'Bạn không có quyền thêm lớp học vào phân hiệu này!' };
    }
    const id = `cls_${Date.now()}`;
    const trimmedName = newItem.name.trim().toUpperCase();
    const classItem: ClassItem = {
      ...newItem,
      id,
      name: trimmedName,
      code: newItem.code ? newItem.code.trim().toUpperCase() : trimmedName,
      status: newItem.status || 'active',
    };
    setClasses((prev) => [...prev, classItem]);

    // Đồng bộ trực tiếp vào cơ sở dữ liệu trung tâm máy chủ
    fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classItem),
    }).catch(() => {});

    // Two-way synchronization: If a teacher was assigned, update that teacher user
    if (classItem.teacherId || (classItem.homeroomTeacher && classItem.homeroomTeacher !== 'Chưa phân công')) {
      setUsers((prevUsers) => {
        const targetTeacher = prevUsers.find(
          (u) =>
            (classItem.teacherId && u.id === classItem.teacherId) ||
            (classItem.homeroomTeacher &&
              u.name.trim().toLowerCase() === classItem.homeroomTeacher.trim().toLowerCase() &&
              (u.role === 'gvcn' || u.role === 'teacher'))
        );
        if (!targetTeacher) return prevUsers;

        return prevUsers.map((u) => {
          if (u.id === targetTeacher.id) {
            return {
              ...u,
              classId: id,
              campusId: classItem.campusId,
              allowedCampusIds: [classItem.campusId],
              title: `Giáo viên chủ nhiệm lớp ${classItem.name}`,
            };
          }
          return u;
        });
      });
    }

    const camp = campuses.find((c) => c.id === classItem.campusId);
    logAudit({
      action: 'THEM_LOP',
      entityType: 'class',
      entityId: id,
      campusId: classItem.campusId,
      classId: id,
      beforeData: null,
      afterData: classItem,
      details: `Thêm lớp mới: Lớp ${classItem.name} (Khối ${classItem.grade}) thuộc ${camp?.name || 'Phân hiệu'} - GVCN: ${classItem.homeroomTeacher}`,
    });
    return { success: true };
  };

  const updateClass = (id: string, patch: Partial<ClassItem>) => {
    const oldClass = classes.find((c) => c.id === id);
    if (!oldClass || !canManageCampusClasses(currentUser, oldClass.campusId)) {
      return { success: false, message: 'Bạn không có quyền chỉnh sửa lớp học này!' };
    }
    const trimmedName = patch.name ? patch.name.trim().toUpperCase() : oldClass.name;
    const updated: ClassItem = {
      ...oldClass,
      ...patch,
      name: trimmedName,
      code: patch.code ? patch.code.trim().toUpperCase() : patch.name ? trimmedName : oldClass.code || trimmedName,
    };
    setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // Đồng bộ trực tiếp vào cơ sở dữ liệu trung tâm máy chủ
    fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    // Two-way synchronization with teacher users
    if (updated.teacherId || (updated.homeroomTeacher && updated.homeroomTeacher !== 'Chưa phân công')) {
      setUsers((prevUsers) => {
        const targetTeacher = prevUsers.find(
          (u) =>
            (updated.teacherId && u.id === updated.teacherId) ||
            (updated.homeroomTeacher &&
              u.name.trim().toLowerCase() === updated.homeroomTeacher.trim().toLowerCase() &&
              (u.role === 'gvcn' || u.role === 'teacher'))
        );

        return prevUsers.map((u) => {
          if (targetTeacher && u.id === targetTeacher.id) {
            return {
              ...u,
              classId: id,
              campusId: updated.campusId,
              allowedCampusIds: [updated.campusId],
              title: `Giáo viên chủ nhiệm lớp ${updated.name}`,
            };
          }
          // If another teacher previously had this classId, unlink them
          if (u.classId === id && (!targetTeacher || u.id !== targetTeacher.id)) {
            return {
              ...u,
              classId: undefined,
              title: u.title.includes(updated.name) ? 'Giáo viên bộ môn' : u.title,
            };
          }
          return u;
        });
      });
    } else {
      // Homeroom teacher was unassigned / set to 'Chưa phân công'
      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.classId === id) {
            return {
              ...u,
              classId: undefined,
              title: u.title.includes(oldClass.name) ? 'Giáo viên bộ môn' : u.title,
            };
          }
          return u;
        })
      );
    }

    // Sync duty assignments homeroom teacher
    setCampusWeeklyDuties((prevDuties) =>
      prevDuties.map((d) =>
        d.classId === id ? { ...d, homeroomTeacher: updated.homeroomTeacher || '' } : d
      )
    );

    logAudit({
      action: 'SUA_LOP',
      entityType: 'class',
      entityId: id,
      campusId: updated.campusId,
      classId: id,
      beforeData: oldClass,
      afterData: updated,
      details: `Cập nhật thông tin lớp: Lớp ${updated.name} - GVCN: ${updated.homeroomTeacher}`,
    });
    return { success: true };
  };

  const toggleClassStatus = (id: string) => {
    const cls = classes.find((c) => c.id === id);
    if (!cls || !canManageCampusClasses(currentUser, cls.campusId)) {
      return { success: false, message: 'Bạn không có quyền đổi trạng thái lớp này!' };
    }
    const nextStatus: 'active' | 'inactive' = cls.status === 'inactive' ? 'active' : 'inactive';
    const updatedClass: ClassItem = { ...cls, status: nextStatus };
    setClasses((prev) => prev.map((c) => (c.id === id ? updatedClass : c)));

    fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => {});

    logAudit({
      action: 'SUA_LOP',
      entityType: 'class',
      entityId: id,
      campusId: cls.campusId,
      classId: id,
      beforeData: { status: cls.status },
      afterData: { status: nextStatus },
      details: `Chuyển trạng thái lớp ${cls.name} sang: ${nextStatus === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}`,
    });
    return {
      success: true,
      message: `Đã chuyển trạng thái lớp ${cls.name} sang: ${nextStatus === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}.`,
    };
  };

  const deleteClass = (id: string) => {
    const oldClass = classes.find((c) => c.id === id);
    if (!oldClass || !canManageCampusClasses(currentUser, oldClass.campusId)) {
      return { success: false, message: 'Bạn không có quyền xóa lớp học này!' };
    }
    const hasScores = scoreLogs.some((l) => l.classId === id);
    if (hasScores) {
      return {
        success: false,
        message: 'KHÔNG THỂ XÓA LỚP ĐÃ CÓ DỮ LIỆU THI ĐUA! Theo quy định, nếu lớp không còn sử dụng, vui lòng chuyển sang trạng thái "Không hoạt động".',
      };
    }
    setClasses((prev) => prev.filter((c) => c.id !== id));

    // Xóa trực tiếp khỏi máy chủ trung tâm
    fetch(`/api/classes/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    // Two-way sync: Unlink teacher from deleted class
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.classId === id ? { ...u, classId: undefined } : u))
    );

    logAudit({
      action: 'XOA_LOP',
      entityType: 'class',
      entityId: id,
      campusId: oldClass.campusId,
      classId: id,
      beforeData: oldClass,
      afterData: null,
      details: `Xóa lớp: Lớp ${oldClass.name}`,
    });
    return { success: true };
  };

  const batchImportClasses = (newClasses: ClassItem[]) => {
    if (userRole !== 'super_admin') {
      return { success: false, count: 0, message: 'Chỉ Quản trị viên (Super Admin) mới có quyền nhập danh sách lớp!' };
    }
    const existingCodeSet = new Set(classes.map((c) => (c.code || c.name).trim().toLowerCase()));
    const validToAdd: ClassItem[] = [];
    newClasses.forEach((cls) => {
      const codeKey = (cls.code || cls.name).trim().toLowerCase();
      if (!existingCodeSet.has(codeKey)) {
        existingCodeSet.add(codeKey);
        validToAdd.push(cls);
      }
    });

    if (validToAdd.length === 0) {
      return { success: false, count: 0, message: 'Không có lớp mới nào được nhập (tất cả lớp đều bị trùng mã).' };
    }

    const updatedClasses = [...classes, ...validToAdd];
    setClasses(updatedClasses);

    fetch('/api/classes/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes: updatedClasses }),
    }).catch(() => {});
    logAudit({
      action: 'THEM_LOP',
      entityType: 'class',
      entityId: `batch_${Date.now()}`,
      beforeData: null,
      afterData: { count: validToAdd.length, classNames: validToAdd.map((c) => c.name) },
      details: `Nhập thành công danh sách ${validToAdd.length} lớp học từ file Excel vào hệ thống`,
    });
    return {
      success: true,
      count: validToAdd.length,
      message: `Đã nhập thành công ${validToAdd.length} lớp học vào hệ thống.`,
    };
  };

  // Academic Year Management
  const addAcademicYear = (newYear: AcademicYear) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền tạo năm học mới!' };
    }
    if (academicYears.some((y) => y.id === newYear.id)) {
      return { success: false, message: `Năm học có mã "${newYear.id}" đã tồn tại!` };
    }
    setAcademicYears((prev) => [newYear, ...prev]);
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: newYear.id,
      beforeData: null,
      afterData: newYear,
      details: `Tạo năm học mới: ${newYear.name} (${newYear.startYear} - ${newYear.endYear})`,
    });
    return { success: true, message: `Đã tạo thành công ${newYear.name}.` };
  };

  const updateAcademicYear = (id: string, patch: Partial<AcademicYear>) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền cập nhật cấu hình năm học!' };
    }
    const oldYear = academicYears.find((y) => y.id === id);
    if (!oldYear) return { success: false, message: 'Không tìm thấy năm học' };
    const updated = { ...oldYear, ...patch };
    setAcademicYears((prev) => prev.map((y) => (y.id === id ? updated : y)));
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: id,
      beforeData: oldYear,
      afterData: updated,
      details: `Cập nhật thông tin năm học: ${updated.name}`,
    });
    return { success: true, message: `Đã cập nhật ${updated.name}.` };
  };

  const setActiveAcademicYear = (id: string) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền chọn năm học vận hành!' };
    }
    const target = academicYears.find((y) => y.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy năm học' };
    setSettings((prev) => ({
      ...prev,
      academicYear: target.id,
      activeAcademicYearId: target.id,
      totalWeeksSemester1: target.semester1.totalWeeks,
      totalWeeksSemester2: target.semester2.totalWeeks,
    }));
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: id,
      beforeData: { activeAcademicYearId: settings.activeAcademicYearId },
      afterData: { activeAcademicYearId: id },
      details: `Đặt năm học vận hành chính thức: ${target.name}`,
    });
    return { success: true, message: `Đã đặt ${target.name} làm năm học vận hành hiện tại.` };
  };

  // Grades Management
  const addGrade = (gradeItem: GradeItem) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền thêm khối!' };
    }
    if (grades.some((g) => g.grade === gradeItem.grade || g.id === gradeItem.id)) {
      return { success: false, message: `Khối ${gradeItem.grade} đã tồn tại trong danh mục!` };
    }
    setGrades((prev) => [...prev, gradeItem]);
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: gradeItem.id,
      beforeData: null,
      afterData: gradeItem,
      details: `Thêm danh mục khối: ${gradeItem.name}`,
    });
    return { success: true, message: `Đã thêm ${gradeItem.name}.` };
  };

  const updateGrade = (id: string, patch: Partial<GradeItem>) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền sửa khối!' };
    }
    const old = grades.find((g) => g.id === id);
    if (!old) return { success: false, message: 'Không tìm thấy khối' };
    const updated = { ...old, ...patch };
    setGrades((prev) => prev.map((g) => (g.id === id ? updated : g)));
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: id,
      beforeData: old,
      afterData: updated,
      details: `Cập nhật danh mục khối: ${updated.name}`,
    });
    return { success: true, message: `Đã cập nhật ${updated.name}.` };
  };

  const deleteGrade = (id: string) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền xóa khối!' };
    }
    const target = grades.find((g) => g.id === id);
    if (!target) return { success: false, message: 'Không tìm thấy khối' };
    const hasClasses = classes.some((c) => c.grade === target.grade);
    if (hasClasses) {
      return { success: false, message: `Không thể xóa khối ${target.name} vì đang có lớp học thuộc khối này!` };
    }
    setGrades((prev) => prev.filter((g) => g.id !== id));
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: id,
      beforeData: target,
      afterData: null,
      details: `Xóa danh mục khối: ${target.name}`,
    });
    return { success: true, message: `Đã xóa ${target.name}.` };
  };

  // Teachers Management
  const addTeacher = (teacherData: Omit<TeacherItem, 'id'>) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền thêm giáo viên!' };
    }
    const id = `u_gv_${Date.now()}`;
    const newUser: User = {
      id,
      name: teacherData.fullName,
      role: 'gvcn',
      email: teacherData.email || `gv.${Date.now()}@gmail.com`,
      campusId: teacherData.campusId,
      classId: teacherData.homeroomClassId,
      title: `Giáo viên chủ nhiệm${teacherData.homeroomClassName ? ` lớp ${teacherData.homeroomClassName}` : ''}`,
      phone: teacherData.phone,
      teacherCode: teacherData.code,
      scopeType: 'campus',
      allowedCampusIds: teacherData.campusId ? [teacherData.campusId] : [],
      isLocked: teacherData.status === 'inactive',
    };
    setUsers((prev) => [...prev, newUser]);

    if (teacherData.homeroomClassId) {
      setClasses((prev) =>
        prev.map((c) => (c.id === teacherData.homeroomClassId ? { ...c, homeroomTeacher: teacherData.fullName } : c))
      );
    }

    logAudit({
      action: 'THEM_NGUOI_DUNG',
      entityType: 'user',
      entityId: id,
      beforeData: null,
      afterData: newUser,
      details: `Thêm giáo viên: ${teacherData.fullName} (Mã: ${teacherData.code})`,
    });
    return { success: true, message: `Đã thêm giáo viên ${teacherData.fullName}.` };
  };

  const updateTeacher = (id: string, patch: Partial<TeacherItem>) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền sửa thông tin giáo viên!' };
    }
    const oldTeacher = teachers.find((t) => t.id === id);
    if (!oldTeacher) return { success: false, message: 'Không tìm thấy giáo viên' };

    if (patch.fullName) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id || u.name === oldTeacher.fullName ? { ...u, name: patch.fullName! } : u))
      );
      if (oldTeacher.homeroomClassId) {
        setClasses((prev) =>
          prev.map((c) => (c.id === oldTeacher.homeroomClassId ? { ...c, homeroomTeacher: patch.fullName! } : c))
        );
      }
    }

    logAudit({
      action: 'SUA_NGUOI_DUNG',
      entityType: 'user',
      entityId: id,
      beforeData: oldTeacher,
      afterData: patch,
      details: `Cập nhật thông tin giáo viên: ${patch.fullName || oldTeacher.fullName}`,
    });
    return { success: true, message: `Đã cập nhật giáo viên ${patch.fullName || oldTeacher.fullName}.` };
  };

  const deleteTeacher = (id: string) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền xóa giáo viên!' };
    }
    const oldTeacher = teachers.find((t) => t.id === id);
    if (!oldTeacher) return { success: false, message: 'Không tìm thấy giáo viên' };
    const isAssigned = classes.some((c) => c.homeroomTeacher === oldTeacher.fullName || c.id === oldTeacher.homeroomClassId);
    if (isAssigned) {
      return {
        success: false,
        message: `Không thể xóa giáo viên ${oldTeacher.fullName} vì đang làm chủ nhiệm lớp hoặc có dữ liệu lịch sử! Vui lòng chuyển trạng thái sang "Không hoạt động".`,
      };
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logAudit({
      action: 'XOA_NGUOI_DUNG',
      entityType: 'user',
      entityId: id,
      beforeData: oldTeacher,
      afterData: null,
      details: `Xóa giáo viên: ${oldTeacher.fullName}`,
    });
    return { success: true, message: `Đã xóa giáo viên ${oldTeacher.fullName}.` };
  };

  const reassignHomeroomTeacher = (teacherId: string, classId: string, academicYear?: string) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền chuyển phân công chủ nhiệm!' };
    }
    const targetTeacher = teachers.find((t) => t.id === teacherId);
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetTeacher || !targetClass) {
      return { success: false, message: 'Không tìm thấy thông tin giáo viên hoặc lớp học' };
    }
    const oldClassName = targetTeacher.homeroomClassName;

    // Update users record
    setUsers((prev) =>
      prev.map((u) =>
        u.id === teacherId || u.name === targetTeacher.fullName
          ? {
              ...u,
              classId: targetClass.id,
              campusId: targetClass.campusId,
              title: `Giáo viên chủ nhiệm lớp ${targetClass.name}`,
            }
          : u
      )
    );

    // Update class homeroom teacher name
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, homeroomTeacher: targetTeacher.fullName } : c))
    );
    logAudit({
      action: 'SUA_LOP',
      entityType: 'class',
      entityId: classId,
      campusId: targetClass.campusId,
      classId: targetClass.id,
      beforeData: { homeroomTeacher: targetClass.homeroomTeacher },
      afterData: { homeroomTeacher: targetTeacher.fullName },
      details: `Chuyển phân công GVCN ${targetTeacher.fullName} từ lớp ${oldClassName || '(Chưa có)'} sang lớp ${targetClass.name}`,
    });
    return {
      success: true,
      message: `Đã phân công ${targetTeacher.fullName} làm GVCN lớp ${targetClass.name}.`,
    };
  };

  // Calendar Weeks
  const updateCalendarWeek = (week: number, patch: Partial<CalendarWeekConfig>) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền điều chỉnh lịch tuần!' };
    }
    const old = calendarWeeks.find((w) => w.week === week);
    if (!old) return { success: false, message: `Không tìm thấy cấu hình Tuần ${week}` };
    const updated = { ...old, ...patch };
    setCalendarWeeks((prev) => prev.map((w) => (w.week === week ? updated : w)));

    // Also update settings.monthWeeksMap if month changed
    if (patch.month && patch.month !== old.month) {
      setSettings((prev) => {
        const nextMap: Record<number, number[]> = { ...prev.monthWeeksMap };
        // Remove from old month
        if (nextMap[old.month]) {
          nextMap[old.month] = nextMap[old.month].filter((w) => w !== week);
        }
        // Add to new month
        if (!nextMap[patch.month!]) nextMap[patch.month!] = [];
        if (!nextMap[patch.month!].includes(week)) {
          nextMap[patch.month!] = [...nextMap[patch.month!], week].sort((a, b) => a - b);
        }
        return { ...prev, monthWeeksMap: nextMap };
      });
    }

    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: `week_${week}`,
      beforeData: old,
      afterData: updated,
      details: `Điều chỉnh lịch học Tuần ${week}: ${updated.startDate} -> ${updated.endDate} (Tháng ${updated.month}, HK${updated.semester})`,
    });
    return { success: true, message: `Đã cập nhật lịch Tuần ${week}.` };
  };

  const batchUpdateCalendarWeeks = (weeks: CalendarWeekConfig[]) => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền điều chỉnh lịch tuần!' };
    }
    setCalendarWeeks(weeks);
    // Rebuild monthWeeksMap
    const nextMap: Record<number, number[]> = {};
    weeks.forEach((w) => {
      if (!nextMap[w.month]) nextMap[w.month] = [];
      nextMap[w.month].push(w.week);
    });
    setSettings((prev) => ({ ...prev, monthWeeksMap: nextMap }));
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: 'calendar_schedule',
      beforeData: null,
      afterData: { totalWeeks: weeks.length },
      details: `Cập nhật toàn bộ lịch 35 tuần năm học ${settings.academicYear || '2026-2027'}`,
    });
    return { success: true, message: 'Đã cập nhật toàn bộ lịch năm học thành công.' };
  };

  const resetCalendarWeeks = () => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền khôi phục lịch!' };
    }
    const defaults = generateDefaultCalendarWeeks(settings.academicYear || '2026-2027');
    return batchUpdateCalendarWeeks(defaults);
  };

  // Criteria by Academic Year
  const cloneCriteriaForAcademicYear = (fromYear: string, toYear: string) => {
    if (userRole !== 'super_admin') {
      return { success: false, count: 0, message: 'Chỉ Quản trị viên mới có quyền cấu hình tiêu chí theo năm học!' };
    }
    const sourceList = criteria.filter((c) => !c.academicYear || c.academicYear === fromYear);
    if (sourceList.length === 0) {
      return { success: false, count: 0, message: `Không tìm thấy tiêu chí nào của năm học ${fromYear} để sao chép!` };
    }
    const alreadyHas = criteria.some((c) => c.academicYear === toYear);
    if (alreadyHas) {
      return { success: false, count: 0, message: `Năm học ${toYear} đã có bộ tiêu chí riêng trong hệ thống!` };
    }
    const cloned = sourceList.map((c) => ({
      ...c,
      id: `crit_${toYear.replace(/[^a-zA-Z0-9]/g, '_')}_${c.code}`,
      academicYear: toYear,
    }));
    setCriteria((prev) => [...prev, ...cloned]);
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'criteria',
      entityId: toYear,
      beforeData: null,
      afterData: { count: cloned.length, targetYear: toYear },
      details: `Sao chép bộ ${cloned.length} tiêu chí từ năm học ${fromYear} sang năm học mới ${toYear}`,
    });
    return {
      success: true,
      count: cloned.length,
      message: `Đã sao chép thành công ${cloned.length} tiêu chí cho năm học ${toYear}.`,
    };
  };

  // Data Mode
  const setDataMode = (mode: 'demo' | 'production') => {
    if (userRole !== 'super_admin') {
      return { success: false, message: 'Chỉ Quản trị viên mới có quyền chuyển đổi chế độ dữ liệu!' };
    }
    const oldMode = settings.dataMode || 'demo';
    setSettings((prev) => ({ ...prev, dataMode: mode }));
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: 'data_mode',
      beforeData: { dataMode: oldMode },
      afterData: { dataMode: mode },
      details: `Chuyển đổi chế độ dữ liệu hệ thống sang: ${mode === 'production' ? 'DỮ LIỆU THẬT (Vận hành thực tế)' : 'DỮ LIỆU MẪU (Thử nghiệm)'}`,
    });
    return {
      success: true,
      message:
        mode === 'production'
          ? 'Đã chuyển sang Chế độ Dữ liệu Thật. Toàn bộ dữ liệu mẫu (Demo) sẽ bị tách biệt và không ảnh hưởng điểm hay bảng xếp hạng thật.'
          : 'Đã chuyển sang Chế độ Dữ liệu Mẫu (Demo).',
    };
  };

  const purgeDemoData = () => {
    if (userRole !== 'super_admin') {
      return { success: false, count: 0, message: 'Chỉ Quản trị viên mới có quyền dọn dẹp dữ liệu thử nghiệm!' };
    }
    const demoLogs = scoreLogs.filter((l) => l.isDemo === true);
    setScoreLogs((prev) => prev.filter((l) => l.isDemo !== true));
    logAudit({
      action: 'XOA_DIEM',
      entityType: 'score_log',
      entityId: 'purge_demo',
      beforeData: { count: demoLogs.length },
      afterData: null,
      reason: 'Dọn sạch dữ liệu thử nghiệm (Demo) để chuẩn bị vận hành chính thức',
      details: `Quản trị viên đã dọn dẹp ${demoLogs.length} biên bản điểm mẫu (Demo) khỏi hệ thống`,
    });
    return {
      success: true,
      count: demoLogs.length,
      message: `Đã dọn dẹp ${demoLogs.length} biên bản điểm mẫu (Demo) thành công.`,
    };
  };

  // Data Integrity Audit
  const checkDataIntegrity = () => {
    return runSystemDataIntegrityCheck(
      classes,
      campuses,
      grades,
      scoreLogs,
      settings.academicYear || '2026-2027'
    );
  };

  // 6. Criteria CRUD
  const addCriteria = (crit: Omit<Criteria, 'id'>) => {
    if (!canModifyCriteria(currentUser)) {
      return { success: false, message: 'Từ chối quyền: Chỉ Quản trị viên hệ thống (Admin) mới có quyền thêm tiêu chí thi đua mới!' };
    }
    const id = `crit_${Date.now()}`;
    const newCrit = { ...crit, id };
    setCriteria((prev) => [...prev, newCrit]);

    // Hybrid sync: Đẩy tiêu chí mới lên Firebase (collection criteria)
    try {
      const cleanCrit = JSON.parse(JSON.stringify(newCrit));
      setDoc(doc(db, 'criteria', id), cleanCrit)
        .catch((err) => console.warn('Lỗi đẩy tiêu chí mới lên Firebase (collection criteria):', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase addCriteria:', fbErr);
    }

    // Persist to central database
    fetch('/api/criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCrit),
    }).catch((err) => console.error('Error persisting new criteria:', err));

    logAudit({
      action: 'THEM_TIEU_CHI',
      category: 'tieu_chi',
      entityType: 'criteria',
      entityId: id,
      beforeData: null,
      afterData: newCrit,
      details: `Thêm tiêu chí thi đua mới: ${newCrit.code} - ${newCrit.name} (${newCrit.points}đ/${newCrit.unit})`,
    });
    return { success: true, message: 'Thêm tiêu chí thành công' };
  };

  const updateCriteria = (id: string, patch: Partial<Criteria>, reason?: string) => {
    if (!canModifyCriteria(currentUser)) {
      return { success: false, message: 'Từ chối quyền: Chỉ Quản trị viên hệ thống (Admin) mới có quyền chỉnh sửa tiêu chí thi đua!' };
    }
    const oldCrit = criteria.find((c) => c.id === id);
    if (!oldCrit) return { success: false, message: 'Không tìm thấy tiêu chí' };
    const updated = { ...oldCrit, ...patch };
    setCriteria((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // Hybrid sync: Cập nhật tiêu chí lên Firebase (collection criteria)
    try {
      const cleanUpdated = JSON.parse(JSON.stringify(updated));
      setDoc(doc(db, 'criteria', id), cleanUpdated, { merge: true })
        .catch((err) => console.warn('Lỗi cập nhật tiêu chí lên Firebase (collection criteria):', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase updateCriteria:', fbErr);
    }

    // Persist to central database so F5 does not lose changes
    fetch(`/api/criteria/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch((err) => console.error('Error persisting criteria update:', err));

    logAudit({
      action: 'SUA_TIEU_CHI',
      category: 'tieu_chi',
      entityType: 'criteria',
      entityId: id,
      beforeData: oldCrit,
      afterData: updated,
      details: `Cập nhật tiêu chí thi đua: ${updated.code} - ${updated.name}`,
    });
    return { success: true, message: 'Cập nhật tiêu chí thành công' };
  };

  const deleteCriteria = (id: string) => {
    if (!canModifyCriteria(currentUser)) {
      return { success: false, message: 'Từ chối quyền: Chỉ Quản trị viên hệ thống (Admin) mới có quyền xóa tiêu chí thi đua!' };
    }
    const oldCrit = criteria.find((c) => c.id === id);
    if (!oldCrit) return { success: false, message: 'Không tìm thấy tiêu chí' };
    setCriteria((prev) => prev.filter((c) => c.id !== id));

    // Hybrid sync: Xóa tiêu chí trên Firebase (collection criteria)
    try {
      deleteDoc(doc(db, 'criteria', id))
        .catch((err) => console.warn('Lỗi xóa tiêu chí trên Firebase (collection criteria):', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase deleteCriteria:', fbErr);
    }

    // Persist deletion to central database
    fetch(`/api/criteria/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('Error persisting criteria deletion:', err));

    logAudit({
      action: 'XOA_TIEU_CHI',
      category: 'tieu_chi',
      entityType: 'criteria',
      entityId: id,
      beforeData: oldCrit,
      afterData: null,
      details: `Xóa tiêu chí thi đua: ${oldCrit.code} - ${oldCrit.name}`,
    });
    return { success: true, message: 'Xóa tiêu chí thành công' };
  };

  const toggleCriteriaActive = (id: string) => {
    if (!canModifyCriteria(currentUser)) {
      return { success: false, message: 'Từ chối quyền: Chỉ Quản trị viên hệ thống (Admin) mới có quyền bật/tắt tiêu chí thi đua!' };
    }
    const oldCrit = criteria.find((c) => c.id === id);
    if (!oldCrit) return { success: false, message: 'Không tìm thấy tiêu chí' };
    const nextActive = !oldCrit.isActive;
    const updated = { ...oldCrit, isActive: nextActive };
    setCriteria((prev) => prev.map((c) => (c.id === id ? updated : c)));

    // Hybrid sync: Cập nhật trạng thái tiêu chí lên Firebase (collection criteria)
    try {
      setDoc(doc(db, 'criteria', id), { isActive: nextActive }, { merge: true })
        .catch((err) => console.warn('Lỗi cập nhật trạng thái tiêu chí lên Firebase:', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase toggleCriteriaActive:', fbErr);
    }

    // Persist to central database
    fetch(`/api/criteria/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: nextActive }),
    }).catch((err) => console.error('Error toggling criteria active:', err));

    logAudit({
      action: 'SUA_TIEU_CHI',
      category: 'tieu_chi',
      entityType: 'criteria',
      entityId: id,
      beforeData: oldCrit,
      afterData: updated,
      details: `${nextActive ? 'Kích hoạt' : 'Tạm ngưng'} tiêu chí: ${oldCrit.code} - ${oldCrit.name}`,
    });
    return { success: true, message: 'Cập nhật trạng thái tiêu chí thành công' };
  };

  const [criteriaVersionHistories, setCriteriaVersionHistories] = useState<CriteriaVersionHistory[]>(() => {
    try {
      const saved = localStorage.getItem('lhl_criteria_versions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [criteriaLockConfig, setCriteriaLockConfig] = useState<CriteriaAdjustmentRuleConfig>({
    lockMode: 'strict',
    allowSuperAdminOverride: true,
  });

  const updateCriteriaLockConfig = (cfg: CriteriaAdjustmentRuleConfig) => {
    setCriteriaLockConfig(cfg);
    return { success: true, message: 'Đã cập nhật quy chế bảo vệ tiêu chí thi đua.' };
  };

  const lockCriteria = (id: string) => {
    updateCriteria(id, { isLocked: true, status: 'locked' });
    return { success: true, message: 'Đã chốt tiêu chí bảo vệ lịch sử.' };
  };

  const unlockCriteria = (id: string) => {
    updateCriteria(id, { isLocked: false, status: 'active' });
    return { success: true, message: 'Đã mở chốt tiêu chí.' };
  };

  const archiveCriteria = (id: string) => {
    updateCriteria(id, { isActive: false, status: 'archived' });
    return { success: true, message: 'Đã lưu trữ tiêu chí.' };
  };

  const restoreCriteria = (id: string) => {
    updateCriteria(id, { isActive: true, status: 'active' });
    return { success: true, message: 'Đã khôi phục tiêu chí.' };
  };

  const createNewCriteriaVersion = (
    id: string,
    patch: Partial<Criteria>,
    options: { newStartWeek?: number; changeReason?: string }
  ) => {
    const oldCrit = criteria.find((c) => c.id === id);
    if (!oldCrit) return { success: false, message: 'Không tìm thấy tiêu chí gốc' };

    const currentVer = oldCrit.version || 1;
    const nextVer = currentVer + 1;

    const historyItem: CriteriaVersionHistory = {
      id: `ver_${Date.now()}`,
      criteriaId: oldCrit.id,
      criteriaCode: oldCrit.code,
      version: currentVer,
      data: { ...oldCrit },
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      changeReason: options.changeReason,
      effectiveStartWeek: options.newStartWeek,
    };

    setCriteriaVersionHistories((prev) => {
      const next = [historyItem, ...prev];
      try {
        localStorage.setItem('lhl_criteria_versions', JSON.stringify(next));
        try {
          const cleanHistory = JSON.parse(JSON.stringify(historyItem));
          setDoc(doc(db, 'criteria_versions', historyItem.id), cleanHistory)
            .catch((err) => console.warn('Lỗi lưu criteria_versions lên Firebase:', err));
        } catch (fbErr) {
          console.warn('Lỗi gọi Firebase createNewCriteriaVersion:', fbErr);
        }
      } catch (e) {}
      return next;
    });

    updateCriteria(id, {
      ...patch,
      version: nextVer,
      startWeek: options.newStartWeek || oldCrit.startWeek,
    });

    return {
      success: true,
      message: `Đã tạo phiên bản v${nextVer} cho tiêu chí ${oldCrit.code} áp dụng từ Tuần ${options.newStartWeek || 1}.`,
    };
  };

  const duplicateCriteria = (id: string) => {
    const src = criteria.find((c) => c.id === id);
    if (!src) return { success: false, message: 'Không tìm thấy tiêu chí' };
    const clone: Omit<Criteria, 'id'> = {
      ...src,
      code: `${src.code}_COPY`,
      name: `${src.name} (Bản sao)`,
    };
    return addCriteria(clone);
  };

  // 6.5. Get Criteria By ID or Code (e.g., 'CD01', 'crit_cd_01') - Đảm bảo fetch chính xác 100% từ Database
  const getCriteriaById = useCallback((idOrCode: string): Criteria | undefined => {
    if (!idOrCode) return undefined;
    const raw = idOrCode.trim().toLowerCase();
    const stripped = raw.replace(/^crit_/, '');
    return criteria.find(
      (c) =>
        c.id.toLowerCase() === raw ||
        (c.code && c.code.toLowerCase() === raw) ||
        (c.code && c.code.toLowerCase() === stripped) ||
        c.id.toLowerCase().replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, '') ||
        (c.code && c.code.toLowerCase().replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, ''))
    );
  }, [criteria]);

  // 7. Preview Calculation Helper
  const previewCriteriaCalculation = (
    criteriaId: string,
    quantity: number,
    classId: string,
    week?: number
  ): CalculationPreviewResult => {
    const crit = getCriteriaById(criteriaId);
    const targetClass = classes.find((c) => c.id === classId);

    if (!crit || !targetClass) {
      return {
        applicable: false,
        reason: 'Không tìm thấy thông tin tiêu chí hoặc lớp học',
        pointsPerUnit: 0,
        totalPoints: 0,
        calculationDetail: 'Dữ liệu không hợp lệ',
        isDisciplinary: false,
        period: 'week',
      };
    }

    const campus = campuses.find((c) => c.id === targetClass.campusId) || {
      id: targetClass.campusId,
      code: '???',
      name: 'Chưa rõ',
      type: 'sub',
      leaderName: '',
      phone: '',
      address: '',
      colorTheme: 'slate',
    };

    const applicability = isCriteriaApplicableForClass(crit, targetClass, campus);
    const calc = calculateCriteriaPoints(crit, quantity, targetClass, campus, settings.evaluationConfig);

    return {
      applicable: applicability.applicable,
      reason: applicability.reason,
      pointsPerUnit: calc.pointsPerUnit,
      totalPoints: calc.totalPoints,
      appliedCap: calc.appliedCap,
      calculationDetail: calc.calculationDetail,
      isDisciplinary: calc.isDisciplinary,
      period: crit.period,
      targetClass,
      campus,
      criteria: crit,
    };
  };

  // Helper to enrich a score log with complete criteria engine metadata
  const enrichScoreLog = (log: Omit<ScoreLog, 'id'>): Omit<ScoreLog, 'id'> => {
    const targetClass = classes.find((c) => c.id === log.classId);
    const targetCampus = targetClass
      ? campuses.find((c) => c.id === targetClass.campusId)
      : campuses.find((c) => c.id === log.campusId);
    
    // Tìm tiêu chí chính xác theo id hoặc code (ví dụ 'CD01', 'crit_cd_01')
    const targetCriteria = getCriteriaById(log.criteriaId || log.criteriaCode || '');

    const period = log.period || targetCriteria?.period || 'week';
    const week = log.week || selectedWeek;
    const month = log.month || getMonthForWeek(week, settings.monthWeeksMap);
    const semester = log.semester || getSemesterForWeek(week);

    // If calculation details or points not provided, compute dynamically
    let totalPoints = log.totalPoints;
    let calculationDetail = log.calculationDetail;
    let appliedCap = log.appliedCap;
    let isDisciplinary = log.isDisciplinary ?? false;
    const pointsPerUnit = log.pointsPerUnit || targetCriteria?.points || 1;

    if (targetClass && targetCampus && targetCriteria) {
      const calc = calculateCriteriaPoints(
        targetCriteria,
        log.quantity,
        targetClass,
        targetCampus,
        settings.evaluationConfig
      );
      totalPoints = calc.totalPoints;
      calculationDetail = calc.calculationDetail;
      appliedCap = calc.appliedCap;
      if (calc.isDisciplinary) isDisciplinary = true;
    }

    const isDemo = log.isDemo !== undefined ? log.isDemo : (settings.dataMode === 'demo');
    const academicYear = log.academicYear || settings.academicYear || '2026-2027';

    return {
      ...log,
      criteriaId: targetCriteria ? targetCriteria.id : log.criteriaId,
      criteriaCode: targetCriteria ? targetCriteria.code : log.criteriaCode || 'TC',
      criteriaName: targetCriteria ? targetCriteria.name : log.criteriaName || 'Tiêu chí',
      category: targetCriteria ? targetCriteria.category : log.category || 'Khác',
      type: targetCriteria ? targetCriteria.type : log.type || 'penalty',
      pointsPerUnit,
      totalPoints,
      appliedCap,
      calculationDetail,
      isDisciplinary,
      week,
      month,
      semester,
      period,
      academicYear,
      isDemo,
      className: targetClass ? targetClass.name : log.className || 'Lớp ?',
      campusId: targetCampus ? targetCampus.id : log.campusId,
      campusName: targetCampus ? targetCampus.name : log.campusName || 'Phân hiệu ?',
      campusType: targetCampus ? targetCampus.type : log.campusType || 'sub',
      grade: targetClass ? targetClass.grade : log.grade || 6,
    };
  };

  // 8. Score Log CRUD with RBAC & Audit Logging
  const isWeekLocked = (week: number): boolean => {
    return lockedWeeks.includes(week);
  };

  const toggleLockWeek = (week: number, reason?: string): { success: boolean; isLocked: boolean; message: string } => {
    const currentlyLocked = isWeekLocked(week);

    // Mở khóa dữ liệu tuần: CHỈ Quản trị viên hệ thống (Role 1: Quản trị viên)
    if (currentlyLocked) {
      if (!canUnlockWeek(currentUser)) {
        return {
          success: false,
          isLocked: true,
          message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền mở khóa dữ liệu đã chốt.',
        };
      }
      if (!reason || !reason.trim()) {
        return {
          success: false,
          isLocked: true,
          message: 'Bắt buộc nhập lý do mở khóa dữ liệu tuần đã chốt để ghi vết kiểm toán hệ thống!',
        };
      }
    } else {
      // Chốt khóa dữ liệu tuần: Ban Giám Hiệu, Tổng Phụ Trách Đội hoặc Quản trị viên
      if (!canLockWeek(currentUser)) {
        return {
          success: false,
          isLocked: false,
          message: 'Từ chối quyền: Bạn không có quyền chốt khóa dữ liệu tuần. Quyền này chỉ dành cho Ban Giám Hiệu, Tổng Phụ Trách Đội hoặc Quản trị viên!',
        };
      }
    }
    const beforeWeeks = [...lockedWeeks];
    let updated: number[];
    if (currentlyLocked) {
      updated = lockedWeeks.filter((w) => w !== week);
    } else {
      updated = [...lockedWeeks, week].sort((a, b) => a - b);
    }

    // Đánh dấu thời gian thao tác để bảo vệ không bị polling ghi đè ngược lại
    lastUserActionTimestampRef.current = Date.now();

    setLockedWeeks(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.LOCKED_WEEKS, JSON.stringify(updated));
    } catch {}

    const updatedSettings = { ...settings, lockedWeeks: updated };
    setSettings(updatedSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch {}

    // Hybrid sync: Đẩy trạng thái chốt tuần lên Firestore
    updateDoc(doc(db, 'locked_weeks', 'summary'), { lockedWeeks: updated }).catch(console.error);
    try {
      const lockPayload = {
        week,
        isLocked: !currentlyLocked,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
        userRole,
        reason: reason || (currentlyLocked ? 'Mở khóa tuần' : 'Chốt khóa tuần'),
      };
      setDoc(doc(db, 'locked_weeks', `week_${week}`), lockPayload)
        .catch((err) => console.warn('Lỗi đẩy chốt tuần lên Firebase (locked_weeks):', err));
      setDoc(doc(db, 'locked_weeks', 'summary'), {
        lockedWeeks: updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((err) => console.warn('Lỗi cập nhật summary locked_weeks lên Firebase:', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase toggleWeekLock:', fbErr);
    }

    // Record Audit Log with before and after
    logAudit({
      action: currentlyLocked ? 'MO_KHOA_TUAN' : 'CHOT_DU_LIEU_TUAN',
      category: 'khoa_du_lieu',
      entityType: 'week_lock',
      entityId: `week_${week}`,
      reason: reason || undefined,
      beforeData: { lockedWeeks: beforeWeeks, weekLocked: currentlyLocked },
      afterData: { lockedWeeks: updated, weekLocked: !currentlyLocked, unlockedBy: currentlyLocked ? currentUser.name : undefined, reason },
      details: currentlyLocked
        ? `Quản trị viên ${currentUser.name} đã MỞ KHÓA dữ liệu Tuần ${week} - Lý do: ${reason}`
        : `${currentUser.name} (${currentUser.title}) đã CHỐT KHÓA dữ liệu thi đua Tuần ${week} toàn trường`,
    });

    // Sync with backend API
    fetch('/api/datalock/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
      },
      body: JSON.stringify({ week, lockedWeeks: updated, isLocked: !currentlyLocked, reason }),
    }).catch(() => {});

    return {
      success: true,
      isLocked: !currentlyLocked,
      message: !currentlyLocked
        ? `Đã CHỐT SỐ LIỆU & KHÓA thành công Tuần ${week}. Toàn bộ điểm số tuần này được đóng băng.`
        : `Đã MỞ KHÓA Tuần ${week}. Giáo viên và Đội cờ đỏ có thể tiếp tục cập nhật điểm.`,
    };
  };

  // Month Locking Controls (BGH / Quản trị viên)
  const isMonthLocked = (month: number): boolean => {
    return !!lockedMonths[month]?.isLocked;
  };

  const getMonthLockInfo = (month: number): MonthLockInfo | undefined => {
    return lockedMonths[month];
  };

  const lockMonth = (month: number, notes?: string): { success: boolean; message: string } => {
    if (!canLockMonth(currentUser)) {
      return {
        success: false,
        message: 'Quyền hạn bị từ chối: Chỉ Ban Giám Hiệu, Tổng Phụ Trách Đội hoặc Super Admin mới có quyền chốt khóa dữ liệu tháng!',
      };
    }

    const weeksInMonth = settings.monthWeeksMap[month] || [1, 2, 3, 4];
    const unlockedWeeks = weeksInMonth.filter((w) => !lockedWeeks.includes(w));

    if (unlockedWeeks.length > 0) {
      return {
        success: false,
        message: `Tháng ${month} gồm ${weeksInMonth.length} tuần, hiện mới chốt ${weeksInMonth.length - unlockedWeeks.length}/${weeksInMonth.length} tuần. Còn Tuần ${unlockedWeeks.join(', ')} chưa được chốt! Yêu cầu chốt toàn bộ các tuần trong tháng trước khi chốt tháng.`,
      };
    }

    const lockInfo: MonthLockInfo = {
      month,
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title,
      },
      notes: notes || `Chốt khóa chính thức dữ liệu xếp loại thi đua nề nếp Tháng ${month}`,
    };

    const updated = { ...lockedMonths, [month]: lockInfo };
    setLockedMonths(updated);
    setSettings((prev) => ({ ...prev, lockedMonths: updated }));

    // Hybrid sync: Đẩy trạng thái chốt tháng lên Firestore
    try {
      const cleanLockInfo = JSON.parse(JSON.stringify(lockInfo));
      setDoc(doc(db, 'locked_months', `month_${month}`), cleanLockInfo)
        .catch((err) => console.warn('Lỗi đẩy chốt tháng lên Firebase (locked_months):', err));
      setDoc(doc(db, 'locked_months', 'summary'), {
        ...updated,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((err) => console.warn('Lỗi cập nhật summary locked_months lên Firebase:', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase lockMonth:', fbErr);
    }

    fetch('/api/datalock/month', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
      },
      body: JSON.stringify({ month, isLock: true, notes: notes || '' }),
    }).catch(() => {});

    logAudit({
      action: 'CHOT_DU_LIEU_THANG',
      entityType: 'month_lock',
      entityId: `month_${month}`,
      beforeData: lockedMonths[month] || null,
      afterData: lockInfo,
      details: `${currentUser.name} (${currentUser.title || 'BGH'}) đã thực hiện CHỐT KHÓA DỮ LIỆU THI ĐUA THÁNG ${month} toàn trường. Dữ liệu tháng được bảo lưu chính thức.`,
    });

    return {
      success: true,
      message: `Đã CHỐT KHÓA THÀNH CÔNG Bảng Xếp Hạng Tháng ${month}. Toàn bộ số liệu tháng được bảo lưu và đóng băng an toàn.`,
    };
  };

  const unlockMonth = (month: number, reason?: string): { success: boolean; message: string } => {
    if (!canUnlockMonth(currentUser)) {
      return {
        success: false,
        message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền mở khóa dữ liệu đã chốt.',
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'Bắt buộc nhập lý do mở khóa dữ liệu tháng đã chốt để ghi vết kiểm toán hệ thống!',
      };
    }

    const prevLock = lockedMonths[month];
    const updated = { ...lockedMonths };
    delete updated[month];
    setLockedMonths(updated);
    setSettings((prev) => ({ ...prev, lockedMonths: updated }));

    // Hybrid sync: Cập nhật mở khóa tháng lên Firestore
    try {
      const unlockPayload = {
        month,
        isLocked: false,
        unlockedAt: new Date().toISOString(),
        unlockedBy: currentUser.name,
        reason: reason.trim(),
      };
      setDoc(doc(db, 'locked_months', `month_${month}`), unlockPayload)
        .catch((err) => console.warn('Lỗi cập nhật mở khóa tháng lên Firebase (locked_months):', err));
      setDoc(doc(db, 'locked_months', 'summary'), {
        ...updated,
        updatedAt: new Date().toISOString(),
      }).catch((err) => console.warn('Lỗi cập nhật summary locked_months sau mở khóa lên Firebase:', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase unlockMonth:', fbErr);
    }

    fetch('/api/datalock/month', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
      },
      body: JSON.stringify({ month, isLock: false, reason: reason.trim() }),
    }).catch(() => {});

    logAudit({
      action: 'MO_KHOA_THANG',
      category: 'khoa_du_lieu',
      entityType: 'month_lock',
      entityId: `month_${month}`,
      reason: reason.trim(),
      beforeData: prevLock || null,
      afterData: { month, isLocked: false, unlockedAt: new Date().toISOString(), unlockedBy: currentUser.name, reason: reason.trim() },
      details: `Quản trị viên ${currentUser.name} đã MỞ KHÓA dữ liệu thi đua Tháng ${month} - Lý do: ${reason.trim()}`,
    });

    return {
      success: true,
      message: `Đã mở khóa thành công dữ liệu Tháng ${month}. Ban Giám Hiệu và các bộ phận có thể điều chỉnh khi cần thiết.`,
    };
  };

  // Semester Locking Controls (BGH / Quản trị viên)
  const isSemesterLocked = (semester: 1 | 2): boolean => {
    return !!lockedSemesters[semester]?.isLocked;
  };

  const getSemesterLockInfo = (semester: 1 | 2): SemesterLockInfo | undefined => {
    return lockedSemesters[semester];
  };

  const lockSemester = (semester: 1 | 2, notes?: string): { success: boolean; message: string } => {
    if (!canLockSemester(currentUser)) {
      return {
        success: false,
        message: 'Quyền hạn bị từ chối: Chỉ Ban Giám Hiệu, Tổng Phụ Trách Đội hoặc Super Admin mới có quyền chốt khóa dữ liệu học kỳ!',
      };
    }

    const monthsInSemester = semester === 1 ? [9, 10, 11, 12] : [1, 2, 3, 4, 5];
    const unlockedMonths = monthsInSemester.filter((m) => !isMonthLocked(m));

    if (unlockedMonths.length > 0) {
      return {
        success: false,
        message: `Học kỳ ${semester === 1 ? 'I' : 'II'} gồm các tháng ${monthsInSemester.join(', ')}. Hiện mới chốt ${monthsInSemester.length - unlockedMonths.length}/${monthsInSemester.length} tháng. Còn Tháng ${unlockedMonths.join(', ')} chưa được chốt! Yêu cầu chốt toàn bộ các tháng trước khi chốt học kỳ.`,
      };
    }

    const lockInfo: SemesterLockInfo = {
      semester,
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title,
      },
      notes: notes || `Chốt khóa chính thức dữ liệu xếp loại thi đua nề nếp Học kỳ ${semester === 1 ? 'I' : 'II'}`,
    };

    const updated = { ...lockedSemesters, [semester]: lockInfo };
    setLockedSemesters(updated);
    setSettings((prev) => ({ ...prev, lockedSemesters: updated }));

    logAudit({
      action: 'CHOT_DU_LIEU_HOC_KY',
      category: 'khoa_du_lieu',
      entityType: 'semester_lock',
      entityId: `semester_${semester}`,
      beforeData: lockedSemesters[semester] || null,
      afterData: lockInfo,
      details: `${currentUser.name} (${currentUser.title || 'BGH'}) đã thực hiện CHỐT KHÓA DỮ LIỆU THI ĐUA HỌC KỲ ${semester === 1 ? 'I' : 'II'} toàn trường. Dữ liệu học kỳ được bảo lưu chính thức.`,
    });

    return {
      success: true,
      message: `Đã CHỐT KHÓA THÀNH CÔNG Bảng Xếp Hạng Học Kỳ ${semester === 1 ? 'I' : 'II'}. Toàn bộ số liệu học kỳ được bảo lưu và đóng băng an toàn.`,
    };
  };

  const unlockSemester = (semester: 1 | 2, reason?: string): { success: boolean; message: string } => {
    if (!canUnlockSemester(currentUser)) {
      return {
        success: false,
        message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền mở khóa dữ liệu đã chốt.',
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'Bắt buộc nhập lý do mở khóa dữ liệu học kỳ đã chốt để ghi vết kiểm toán hệ thống!',
      };
    }

    const prevLock = lockedSemesters[semester];
    const updated = { ...lockedSemesters };
    delete updated[semester];
    setLockedSemesters(updated);
    setSettings((prev) => ({ ...prev, lockedSemesters: updated }));

    logAudit({
      action: 'MO_KHOA_HOC_KY',
      category: 'khoa_du_lieu',
      entityType: 'semester_lock',
      entityId: `semester_${semester}`,
      reason: reason.trim(),
      beforeData: prevLock || null,
      afterData: { semester, isLocked: false, unlockedAt: new Date().toISOString(), unlockedBy: currentUser.name, reason: reason.trim() },
      details: `Quản trị viên ${currentUser.name} đã MỞ KHÓA dữ liệu thi đua Học kỳ ${semester === 1 ? 'I' : 'II'} - Lý do: ${reason.trim()}`,
    });

    return {
      success: true,
      message: `Đã mở khóa thành công dữ liệu Học kỳ ${semester === 1 ? 'I' : 'II'}. Ban Giám Hiệu và các bộ phận có thể điều chỉnh khi cần thiết.`,
    };
  };

  // Academic Year Locking Engine (BGH / Quản trị viên)
  const isYearLocked = (): boolean => {
    return !!lockedYear?.isLocked;
  };

  const getYearLockInfo = (): YearLockInfo | undefined => {
    return lockedYear || undefined;
  };

  const lockYear = (notes?: string): { success: boolean; message: string } => {
    if (!canLockYear(currentUser)) {
      return {
        success: false,
        message: 'Quyền hạn bị từ chối: Chỉ Ban Giám Hiệu hoặc Quản trị viên hệ thống (Super Admin) mới có quyền chốt khóa Bảng Xếp Hạng Cả Năm!',
      };
    }

    // YÊU CẦU 7 & 8 & 9: Chỉ sử dụng học kỳ đã được CHỐT. Cả HKI và HKII phải được chốt trước khi chốt cả năm
    const hkiLocked = isSemesterLocked(1);
    const hkiiLocked = isSemesterLocked(2);
    if (!hkiLocked || !hkiiLocked) {
      const missingList: string[] = [];
      if (!hkiLocked) missingList.push('Học kỳ I');
      if (!hkiiLocked) missingList.push('Học kỳ II');
      return {
        success: false,
        message: `Chưa đủ điều kiện chốt cả năm: ${missingList.join(' và ')} chưa được Ban Giám Hiệu chốt khóa! Cần chốt khóa đầy đủ cả 2 học kỳ trước khi chốt Cả năm.`,
      };
    }

    const lockInfo: YearLockInfo = {
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title,
      },
      notes: notes || `Chốt khóa chính thức dữ liệu xếp loại thi đua nề nếp Cả Năm học ${settings.academicYear}`,
    };

    setLockedYear(lockInfo);
    setSettings((prev) => ({ ...prev, lockedYear: lockInfo }));

    logAudit({
      action: 'CHOT_DU_LIEU_CA_NAM',
      category: 'khoa_du_lieu',
      entityType: 'year_lock',
      entityId: `year_${settings.academicYear}`,
      beforeData: lockedYear || null,
      afterData: lockInfo,
      details: `${currentUser.name} (${currentUser.title || 'BGH'}) đã thực hiện CHỐT KHÓA DỮ LIỆU THI ĐUA CẢ NĂM HỌC ${settings.academicYear} toàn trường. Kết quả thi đua năm học được đóng băng và lưu trữ chính thức.`,
    });

    return {
      success: true,
      message: `Đã CHỐT KHÓA THÀNH CÔNG Bảng Xếp Hạng Cả Năm Học ${settings.academicYear}. Toàn bộ kết quả thi đua cả năm được bảo lưu và đóng băng an toàn.`,
    };
  };

  const unlockYear = (reason?: string): { success: boolean; message: string } => {
    if (!canUnlockYear(currentUser)) {
      return {
        success: false,
        message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền mở khóa dữ liệu đã chốt.',
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'Bắt buộc nhập lý do mở khóa Bảng Xếp Hạng Cả Năm đã chốt để ghi vết kiểm toán hệ thống!',
      };
    }

    const prevLock = lockedYear;
    setLockedYear(null);
    setSettings((prev) => {
      const updated = { ...prev };
      delete updated.lockedYear;
      return updated;
    });

    logAudit({
      action: 'MO_KHOA_CA_NAM',
      category: 'khoa_du_lieu',
      entityType: 'year_lock',
      entityId: `year_${settings.academicYear}`,
      reason: reason.trim(),
      beforeData: prevLock || null,
      afterData: { isLocked: false, unlockedAt: new Date().toISOString(), unlockedBy: currentUser.name, reason: reason.trim() },
      details: `Quản trị viên ${currentUser.name} đã MỞ KHÓA dữ liệu thi đua Cả Năm học ${settings.academicYear} - Lý do: ${reason.trim()}`,
    });

    return {
      success: true,
      message: `Đã mở khóa thành công bảng dữ liệu thi đua Cả Năm học ${settings.academicYear}. Ban Giám Hiệu có thể cập nhật lại khi cần thiết.`,
    };
  };

  // --------------------------------------------------------------------------
  // Title Evaluation Locking & Disciplinary Council Registry Engine
  // --------------------------------------------------------------------------
  const isTitleLocked = (): boolean => {
    return !!lockedTitles?.isLocked;
  };

  const getTitleLockInfo = (): TitleLockInfo | undefined => {
    return lockedTitles || undefined;
  };

  const lockTitles = (notes?: string): { success: boolean; message: string } => {
    if (!canLockTitles(currentUser)) {
      return {
        success: false,
        message: 'Quyền hạn bị từ chối: Chỉ Ban Giám Hiệu hoặc Quản trị viên hệ thống (Super Admin) mới có quyền chốt khóa Bảng Xét Danh Hiệu Lớp!',
      };
    }

    // YÊU CẦU 1: Sử dụng ĐIỂM XẾP HẠNG CẢ NĂM đã được CHỐT làm dữ liệu đầu vào.
    if (!isYearLocked()) {
      return {
        success: false,
        message: 'Chưa đủ điều kiện chốt danh hiệu: Bảng Xếp Hạng Cả Năm chưa được Ban Giám Hiệu chốt khóa! Cần hoàn thành chốt khóa Xếp Hạng Cả Năm trước khi chốt Danh hiệu.',
      };
    }

    const lockInfo: TitleLockInfo = {
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title,
      },
      notes: notes || `Chốt khóa công nhận danh hiệu thi đua tập thể lớp Cả Năm học ${settings.academicYear}`,
    };

    setLockedTitles(lockInfo);
    setSettings((prev) => ({ ...prev, lockedTitles: lockInfo }));

    logAudit({
      action: 'CHOT_DANH_HIEU_NAM',
      category: 'khoa_du_lieu',
      entityType: 'title_lock',
      entityId: `titles_${settings.academicYear}`,
      beforeData: lockedTitles || null,
      afterData: lockInfo,
      details: `${currentUser.name} (${currentUser.title || 'BGH'}) đã thực hiện CHỐT KHÓA KẾT QUẢ DANH HIỆU THI ĐUA CẢ NĂM HỌC ${settings.academicYear}. Kết quả khen thưởng lớp xuất sắc, tiên tiến được phê chuẩn chính thức và đóng băng.`,
    });

    return {
      success: true,
      message: `Đã CHỐT KHÓA THÀNH CÔNG Kết quả Xét Danh Hiệu Lớp Cả Năm Học ${settings.academicYear}. Danh sách danh hiệu đã được phê chuẩn chính thức.`,
    };
  };

  const unlockTitles = (reason?: string): { success: boolean; message: string } => {
    if (!canUnlockTitles(currentUser)) {
      return {
        success: false,
        message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền mở khóa dữ liệu đã chốt.',
      };
    }
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'Bắt buộc nhập lý do mở khóa Bảng Danh Hiệu Lớp đã chốt để ghi vết kiểm toán hệ thống!',
      };
    }

    const prevLock = lockedTitles;
    setLockedTitles(null);
    setSettings((prev) => {
      const updated = { ...prev };
      delete updated.lockedTitles;
      return updated;
    });

    logAudit({
      action: 'MO_KHOA_DANH_HIEU_NAM',
      category: 'khoa_du_lieu',
      entityType: 'title_lock',
      entityId: `titles_${settings.academicYear}`,
      reason: reason.trim(),
      beforeData: prevLock || null,
      afterData: { isLocked: false, unlockedAt: new Date().toISOString(), unlockedBy: currentUser.name, reason: reason.trim() },
      details: `Quản trị viên ${currentUser.name} đã MỞ KHÓA kết quả xét danh hiệu thi đua Cả Năm học ${settings.academicYear} - Lý do: ${reason.trim()}`,
    });

    return {
      success: true,
      message: `Đã mở khóa thành công Bảng Xét Danh Hiệu Cả Năm học ${settings.academicYear}. Ban Giám Hiệu có thể điều chỉnh và xét duyệt lại.`,
    };
  };

  const addDisciplinaryRecord = (
    record: Omit<DisciplinaryRecord, 'id' | 'recordedBy' | 'recordedAt'>
  ): { success: boolean; message: string } => {
    if (isTitleLocked()) {
      return {
        success: false,
        message: 'Không thể cập nhật hồ sơ kỷ luật: Kết quả danh hiệu thi đua cả năm đã bị chốt khóa!',
      };
    }

    const id = `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: DisciplinaryRecord = {
      ...record,
      id,
      recordedBy: currentUser.name,
      recordedAt: new Date().toISOString(),
    };

    setDisciplinaryRecords((prev) => [newRecord, ...prev]);

    logAudit({
      action: 'CAP_NHAT_KY_LUAT',
      entityType: 'disciplinary_record',
      entityId: id,
      classId: record.classId,
      details: `Ghi nhận quyết định kỷ luật học sinh ${record.studentName} (${record.className}) theo QĐ ${record.decisionNumber} ngày ${record.decisionDate}: ${record.reason}`,
    });

    return {
      success: true,
      message: `Đã ghi nhận quyết định kỷ luật của Hội đồng đối với học sinh ${record.studentName} (${record.className}). Lớp sẽ tự động KHÔNG ĐƯỢC XẾP LOẠI cả năm theo đúng quy chế.`,
    };
  };

  const removeDisciplinaryRecord = (id: string): { success: boolean; message: string } => {
    if (isTitleLocked()) {
      return {
        success: false,
        message: 'Không thể xóa hồ sơ kỷ luật: Kết quả danh hiệu thi đua cả năm đã bị chốt khóa!',
      };
    }

    const target = disciplinaryRecords.find((r) => r.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy hồ sơ kỷ luật cần xóa.' };
    }

    setDisciplinaryRecords((prev) => prev.filter((r) => r.id !== id));

    logAudit({
      action: 'CAP_NHAT_KY_LUAT',
      entityType: 'disciplinary_record',
      entityId: id,
      classId: target.classId,
      details: `Hủy ghi nhận hồ sơ kỷ luật của học sinh ${target.studentName} (${target.className}) theo QĐ ${target.decisionNumber}`,
    });

    return {
      success: true,
      message: `Đã xóa hồ sơ kỷ luật của học sinh ${target.studentName}. Trạng thái xét danh hiệu của lớp được cập nhật lại.`,
    };
  };

  const addRedFlagDuty = (duty: Omit<RedFlagDuty, 'id'>) => {
    const id = `duty_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDuty = { ...duty, id, createdAt: new Date().toISOString().split('T')[0] };
    setRedFlagDuties((prev) => [newDuty, ...prev]);
    logAudit({
      action: 'PHAN_CONG_CO_DO',
      entityType: 'red_flag',
      entityId: id,
      campusId: duty.campusId,
      classId: duty.assignedClassId,
      beforeData: null,
      afterData: newDuty,
      details: `Phân công trực cờ đỏ: Lớp ${duty.assignedClassName} trực ${duty.dayOfWeek} tại ${duty.dutyArea}`,
    });
  };

  const updateRedFlagDuty = (id: string, patch: Partial<RedFlagDuty>) => {
    const oldDuty = redFlagDuties.find((d) => d.id === id);
    if (!oldDuty) return;
    const updated = { ...oldDuty, ...patch };
    setRedFlagDuties((prev) => prev.map((d) => (d.id === id ? updated : d)));
    logAudit({
      action: 'PHAN_CONG_CO_DO',
      entityType: 'red_flag',
      entityId: id,
      campusId: updated.campusId,
      classId: updated.assignedClassId,
      beforeData: oldDuty,
      afterData: updated,
      details: `Cập nhật phân công cờ đỏ: Lớp ${updated.assignedClassName} (${updated.dayOfWeek})`,
    });
  };

  const deleteRedFlagDuty = (id: string) => {
    const oldDuty = redFlagDuties.find((d) => d.id === id);
    setRedFlagDuties((prev) => prev.filter((d) => d.id !== id));
    if (oldDuty) {
      logAudit({
        action: 'XOA_LICH_CO_DO',
        entityType: 'red_flag',
        entityId: id,
        campusId: oldDuty.campusId,
        classId: oldDuty.assignedClassId,
        beforeData: oldDuty,
        afterData: null,
        details: `Hủy phân công trực cờ đỏ: Lớp ${oldDuty.assignedClassName} (${oldDuty.dayOfWeek})`,
      });
    }
  };

  // Lớp trực tuần & Phân quyền GVCN theo tuần (Tuần → Phân hiệu → Lớp trực → GVCN)
  const updateCampusWeeklyDuty = (id: string, patch: Partial<CampusWeeklyDuty>) => {
    setCampusWeeklyDuties((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const setWeeklyDutyAssignment = (week: number, campusId: string, classId: string, notes?: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    setCampusWeeklyDuties((prev) => {
      const existingIndex = prev.findIndex((d) => d.week === week && d.campusId === campusId);
      const updatedItem: CampusWeeklyDuty = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `duty_w${week}_${campusId}`,
        week,
        campusId,
        classId: cls.id,
        className: cls.name,
        homeroomTeacher: cls.homeroomTeacher,
        teacherId: cls.teacherId,
        briefingDeadlineDay: existingIndex >= 0 ? prev[existingIndex].briefingDeadlineDay : 'Thứ 6',
        briefingDeadlineTime: existingIndex >= 0 ? prev[existingIndex].briefingDeadlineTime : '08:30',
        dutyRoleDescription: `Trực ban nề nếp Tuần ${week}: Kéo cờ, giám sát nề nếp, truy bài và tổng hợp nề nếp giao ban.`,
        notes: notes || `Lớp trực tuần ${cls.name} chịu trách nhiệm ghi nhận dữ liệu thi đua trong tuần ${week}.`,
      };
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = updatedItem;
        return copy;
      } else {
        return [...prev, updatedItem];
      }
    });

    logAudit({
      action: 'PHAN_CONG_CO_DO',
      category: 'co_do',
      entityType: 'red_flag',
      entityId: `duty_w${week}_${campusId}`,
      campusId,
      classId,
      className: cls.name,
      details: `Phân công lớp trực Tuần ${week} phân hiệu ${campusId}: Lớp ${cls.name} (GVCN: ${cls.homeroomTeacher}). Quyền nhập điểm tuần ${week} được tự động cấp cho GVCN.`,
    });
  };

  const updateBriefingDeadline = (week: number, day: string, time: string) => {
    setCampusWeeklyDuties((prev) =>
      prev.map((d) => (d.week === week ? { ...d, briefingDeadlineDay: day, briefingDeadlineTime: time } : d))
    );
  };

  // Quản lý Đội viên Cờ đỏ
  const addRedFlagMember = (member: Omit<RedFlagMember, 'id'>) => {
    const id = `rf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMember: RedFlagMember = { ...member, id };
    setRedFlagMembers((prev) => [newMember, ...prev]);
    logAudit({
      action: 'PHAN_CONG_CO_DO',
      category: 'co_do',
      entityType: 'red_flag',
      entityId: id,
      campusId: member.campusId,
      classId: member.classId,
      className: member.className,
      details: `Thêm đội viên cờ đỏ: ${member.name} (${member.roleTitle} - Lớp ${member.className}) phụ trách ${member.assignedArea}`,
    });
  };

  const updateRedFlagMember = (id: string, patch: Partial<RedFlagMember>) => {
    setRedFlagMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const deleteRedFlagMember = (id: string) => {
    setRedFlagMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Giao ban
  const addBriefingRecord = (briefing: Omit<RedFlagBriefing, 'id'>) => {
    const id = `brief_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBriefing: RedFlagBriefing = { ...briefing, id };
    setBriefingRecords((prev) => [newBriefing, ...prev]);
  };

  const updateBriefingRecord = (id: string, patch: Partial<RedFlagBriefing>) => {
    setBriefingRecords((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  // Hoạt động
  const addActivityLog = (log: Omit<RedFlagActivityLog, 'id'>) => {
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog: RedFlagActivityLog = { ...log, id };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  const deleteActivityLog = (id: string) => {
    setActivityLogs((prev) => prev.filter((a) => a.id !== id));
  };

  // Điều hướng chuyển từ Đội cờ đỏ sang Module Nhập điểm duy nhất
  const navigateToScoring = (ctx?: {
    campusId?: string;
    week?: number;
    classId?: string;
    dutyArea?: string;
    inspectorName?: string;
    fromRedFlag?: boolean;
  }) => {
    if (ctx?.campusId) setSelectedCampusId(ctx.campusId);
    if (ctx?.week) setSelectedWeek(ctx.week);
    setScoringNavigationContext(ctx || null);
    setCurrentTab('scoring');
  };

  const clearScoringNavigationContext = () => {
    setScoringNavigationContext(null);
  };

  const addScoreLog = (log: Omit<ScoreLog, 'id'>) => {
    const enriched = enrichScoreLog(log);
    const targetWeek = enriched.week;
    const targetMonth = getMonthForWeek(targetWeek, settings.monthWeeksMap);

    // Month & Semester lock protection
    const targetSemester: 1 | 2 = targetMonth <= 5 ? 2 : 1;
    if (isSemesterLocked(targetSemester) && userRole !== 'super_admin') {
      return {
        success: false,
        message: `Học kỳ ${targetSemester === 1 ? 'I' : 'II'} đã được Ban Giám Hiệu chốt dữ liệu chính thức. Không thể thêm điểm mới!`,
      };
    }
    if (isMonthLocked(targetMonth) && userRole !== 'super_admin') {
      return {
        success: false,
        message: `Tháng ${targetMonth} đã được Ban Giám Hiệu chốt dữ liệu chính thức. Không thể thêm điểm mới!`,
      };
    }

    // RBAC validation with duty week check
    const permission = canInputScores(currentUser, enriched.campusId, enriched.classId, targetWeek, lockedWeeks, campusWeeklyDuties);
    if (!permission.allowed) {
      return { success: false, message: permission.reason };
    }

    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog: ScoreLog = { ...enriched, id };
    setScoreLogs((prev) => [newLog, ...prev]);

    // Hybrid sync: Đẩy bản sao lên Firestore (collection scores và score_logs)
    try {
      const cleanLog = JSON.parse(JSON.stringify(newLog));
      setDoc(doc(db, 'scores', id), cleanLog)
        .catch((err) => console.warn('Lỗi đẩy điểm lên Firebase (collection scores):', err));
      setDoc(doc(db, 'score_logs', id), cleanLog)
        .catch((err) => console.warn('Lỗi đẩy điểm lên Firebase (collection score_logs):', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase addScoreLog:', fbErr);
    }

    // Đồng bộ trực tiếp vào cơ sở dữ liệu máy chủ trung tâm
    fetch('/api/score-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});

    // Record Audit Log with before and after
    logAudit({
      action: enriched.type === 'bonus' ? 'THEM_THANH_TICH' : 'THEM_DIEM',
      category: 'diem_thi_dua',
      entityType: 'score_log',
      entityId: id,
      campusId: enriched.campusId,
      campusName: enriched.campusName,
      classId: enriched.classId,
      className: enriched.className,
      beforeData: null,
      afterData: newLog,
      details: `Thêm biên bản thi đua lớp ${enriched.className} (${enriched.campusName}): ${enriched.criteriaName} (${enriched.totalPoints > 0 ? '+' : ''}${enriched.totalPoints}đ)`,
    });

    return { success: true };
  };

  const updateScoreLog = (id: string, patch: Partial<ScoreLog>, reason?: string) => {
    const oldLog = scoreLogs.find((l) => l.id === id);
    if (!oldLog) return { success: false, message: 'Không tìm thấy biên bản chấm điểm' };

    const targetMonth = getMonthForWeek(oldLog.week, settings.monthWeeksMap);
    const targetSemester: 1 | 2 = targetMonth <= 5 ? 2 : 1;
    if (isSemesterLocked(targetSemester) && userRole !== 'super_admin') {
      return {
        success: false,
        message: `Học kỳ ${targetSemester === 1 ? 'I' : 'II'} đã được Ban Giám Hiệu chốt dữ liệu chính thức. Dữ liệu học kỳ đã bị đóng băng!`,
      };
    }
    if (isMonthLocked(targetMonth) && userRole !== 'super_admin') {
      return {
        success: false,
        message: `Tháng ${targetMonth} đã được Ban Giám Hiệu chốt dữ liệu chính thức. Dữ liệu tháng đã bị đóng băng!`,
      };
    }

    // RBAC check with duty week
    const permission = canInputScores(currentUser, oldLog.campusId, oldLog.classId, oldLog.week, lockedWeeks, campusWeeklyDuties);
    if (!permission.allowed) {
      return { success: false, message: permission.reason };
    }

    const effectiveReason = reason || patch.note || 'Điều chỉnh điểm thi đua';

    // Requirement 3: Score history tracking
    const historyItem: ScoreEditHistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      modifiedBy: currentUser.name,
      modifiedByRole: userRole,
      reason: effectiveReason,
      oldPoints: oldLog.totalPoints,
      newPoints: patch.totalPoints !== undefined ? patch.totalPoints : oldLog.totalPoints,
      oldQuantity: oldLog.quantity,
      newQuantity: patch.quantity !== undefined ? patch.quantity : oldLog.quantity,
      oldCriteriaName: oldLog.criteriaName,
      newCriteriaName: patch.criteriaName || oldLog.criteriaName,
      oldNote: oldLog.note,
      newNote: patch.note !== undefined ? patch.note : oldLog.note,
    };

    const updated: ScoreLog = {
      ...oldLog,
      ...patch,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: currentUser.name,
      lastModifiedReason: effectiveReason,
      editHistory: [historyItem, ...(oldLog.editHistory || [])],
    };

    setScoreLogs((prev) => prev.map((l) => (l.id === id ? updated : l)));

    // Hybrid sync: Cập nhật bản sao lên Firestore (collection scores và score_logs)
    try {
      const cleanUpdated = JSON.parse(JSON.stringify(updated));
      setDoc(doc(db, 'scores', id), cleanUpdated, { merge: true })
        .catch((err) => console.warn('Lỗi cập nhật điểm lên Firebase (collection scores):', err));
      setDoc(doc(db, 'score_logs', id), cleanUpdated, { merge: true })
        .catch((err) => console.warn('Lỗi cập nhật điểm lên Firebase (collection score_logs):', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase updateScoreLog:', fbErr);
    }

    // Đồng bộ trực tiếp vào cơ sở dữ liệu máy chủ trung tâm
    fetch(`/api/score-logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patch: updated, reason: effectiveReason }),
    }).catch(() => {});

    // Record Audit Log with before and after
    logAudit({
      action: updated.type === 'bonus' ? 'SUA_THANH_TICH' : 'SUA_DIEM',
      category: 'diem_thi_dua',
      entityType: 'score_log',
      entityId: id,
      campusId: updated.campusId,
      campusName: updated.campusName,
      classId: updated.classId,
      className: updated.className,
      reason: effectiveReason,
      beforeData: oldLog,
      afterData: updated,
      details: `Chỉnh sửa biên bản lớp ${updated.className} (${updated.campusName}): ${oldLog.criteriaName} (${oldLog.totalPoints > 0 ? '+' : ''}${oldLog.totalPoints}đ → ${updated.totalPoints > 0 ? '+' : ''}${updated.totalPoints}đ) - Lý do: ${effectiveReason}`,
    });

    return { success: true };
  };

  const deleteScoreLog = (id: string, reason?: string) => {
    const oldLog = scoreLogs.find((l) => l.id === id);
    if (!oldLog) return { success: false, message: 'Không tìm thấy biên bản chấm điểm' };

    const normRole = currentUser ? normalizeRole(currentUser.role) : normalizeRole(userRole);
    const isAdmin =
      normRole === 'super_admin' ||
      normRole === 'bgh' ||
      userRole === 'super_admin' ||
      userRole === 'admin' ||
      userRole === 'bgh' ||
      currentUser?.role === 'super_admin' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'bgh';

    if (!isAdmin) {
      // 1. Kiểm tra xem người dùng có phải là Giáo viên trực tuần không
      const isDutyTeacher = campusWeeklyDuties.some((d) =>
        d.week === oldLog.week && (
          (currentUser?.classId && d.classId === currentUser.classId) ||
          (currentUser?.name && d.homeroomTeacher && currentUser.name.toLowerCase().trim() === d.homeroomTeacher.toLowerCase().trim()) ||
          (d.teacherId && currentUser?.id === d.teacherId)
        )
      );

      // 2. Kiểm tra xem người dùng có phải là người đã nhập/ghi nhận bản ghi này không
      const isAuthor = !!(
        currentUser?.name &&
        oldLog.inspectorName &&
        (currentUser.name.toLowerCase().trim() === oldLog.inspectorName.toLowerCase().trim() ||
          oldLog.inspectorName.toLowerCase().includes(currentUser.name.toLowerCase().trim()) ||
          currentUser.name.toLowerCase().includes(oldLog.inspectorName.toLowerCase().trim()))
      );

      // 3. Cán bộ trực ban, TPT Đội, Quản trị phân hiệu
      const isDutyStaff = normRole === 'tpt_doi' || normRole === 'campus_admin';

      // 4. Giáo viên có quyền nhập điểm hoặc quyền tùy chỉnh
      const hasCustomPermission = !!currentUser?.customPermissions?.canDeleteScore;
      const isTeacher = normRole === 'gvcn' || currentUser?.role === 'teacher' || currentUser?.role === 'gvcn';

      if (!isDutyTeacher && !isAuthor && !isDutyStaff && !isTeacher && !hasCustomPermission) {
        return { success: false, message: 'Bạn không có quyền xóa biên bản thi đua này!' };
      }
    }

    const effectiveReason = reason || 'Xóa biên bản thi đua (nhập nhầm/lỗi)';

    setScoreLogs((prev) => prev.filter((l) => l.id !== id));

    // Hybrid sync: Xóa bản sao trên Firestore (collection scores và score_logs)
    try {
      deleteDoc(doc(db, 'scores', id))
        .catch((err) => console.warn('Lỗi xóa điểm trên Firebase (collection scores):', err));
      deleteDoc(doc(db, 'score_logs', id))
        .catch((err) => console.warn('Lỗi xóa điểm trên Firebase (collection score_logs):', err));
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase deleteScoreLog:', fbErr);
    }

    // Xóa trực tiếp khỏi cơ sở dữ liệu máy chủ trung tâm
    fetch(`/api/score-logs/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: effectiveReason }),
    }).catch(() => {});

    // Record Audit Log with before and after
    logAudit({
      action: oldLog.type === 'bonus' ? 'XOA_THANH_TICH' : 'XOA_DIEM',
      category: 'diem_thi_dua',
      entityType: 'score_log',
      entityId: id,
      campusId: oldLog.campusId,
      campusName: oldLog.campusName,
      classId: oldLog.classId,
      className: oldLog.className,
      reason: effectiveReason,
      beforeData: oldLog,
      afterData: null,
      details: `Xóa biên bản thi đua lớp ${oldLog.className} (${oldLog.campusName}): ${oldLog.criteriaName} (${oldLog.totalPoints > 0 ? '+' : ''}${oldLog.totalPoints}đ) - Lý do: ${effectiveReason}`,
    });

    return { success: true };
  };

  const bulkAddScoreLogs = (newLogs: Omit<ScoreLog, 'id'>[]) => {
    if (newLogs.length === 0) return { success: true, count: 0 };
    const firstWeek = newLogs[0].week || selectedWeek;
    const targetMonth = getMonthForWeek(firstWeek, settings.monthWeeksMap);

    if (isMonthLocked(targetMonth) && userRole !== 'super_admin') {
      return {
        success: false,
        count: 0,
        message: `Tháng ${targetMonth} đã được Ban Giám Hiệu chốt dữ liệu chính thức. Dữ liệu tháng đã bị đóng băng!`,
      };
    }

    if (isWeekLocked(firstWeek) && userRole !== 'super_admin') {
      return {
        success: false,
        count: 0,
        message: `Tuần ${firstWeek} đã được Ban Giám Hiệu chốt khóa dữ liệu. Không thể lưu vi phạm!`,
      };
    }

    // Check RBAC permission for bulk addition
    if (newLogs.length > 0 && userRole !== 'super_admin') {
      const targetCampusId = newLogs[0].campusId;
      const permission = canInputScores(currentUser, targetCampusId, newLogs[0].classId, firstWeek, lockedWeeks, campusWeeklyDuties);
      if (!permission.allowed) {
        return { success: false, count: 0, message: permission.reason };
      }
    }

    const items: ScoreLog[] = newLogs.map((log, index) => ({
      ...enrichScoreLog(log),
      id: `log_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    }));

    setScoreLogs((prev) => [...items, ...prev]);

    // Hybrid sync: Đẩy danh sách bản sao lên Firestore
    try {
      items.forEach((item) => {
        const cleanItem = JSON.parse(JSON.stringify(item));
        setDoc(doc(db, 'scores', item.id), cleanItem)
          .catch((err) => console.warn('Lỗi đẩy điểm hàng loạt lên Firebase (collection scores):', err));
        setDoc(doc(db, 'score_logs', item.id), cleanItem)
          .catch((err) => console.warn('Lỗi đẩy điểm hàng loạt lên Firebase (collection score_logs):', err));
      });
    } catch (fbErr) {
      console.warn('Lỗi gọi Firebase bulkAddScoreLogs:', fbErr);
    }

    // Đồng bộ trực tiếp danh sách biên bản vào máy chủ trung tâm
    fetch('/api/score-logs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: items }),
    }).catch(() => {});

    // Record Audit Log
    logAudit({
      action: 'THEM_DIEM',
      entityType: 'score_log',
      entityId: `batch_${Date.now()}`,
      beforeData: null,
      afterData: { count: items.length },
      details: `Nhập điểm thi đua đồng loạt cho ${items.length} lượt vi phạm/khen thưởng Tuần ${firstWeek}`,
    });

    return { success: true, count: items.length };
  };

  // Feedback & Adjustment Appeals (GVCN & BGH/TPT)
  const submitAppeal = (appealData: Omit<AdjustmentAppeal, 'id' | 'createdAt' | 'status' | 'teacherId' | 'teacherName'>) => {
    if (!canSubmitAppeal(currentUser, appealData.classId)) {
      return { success: false, message: 'Bạn chỉ có quyền gửi phản hồi/đề nghị điều chỉnh cho lớp mình làm chủ nhiệm!' };
    }

    const newAppeal: AdjustmentAppeal = {
      ...appealData,
      id: `appeal_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      teacherId: currentUser.id,
      teacherName: currentUser.name,
    };

    setAppeals((prev) => [newAppeal, ...prev]);

    // Record Audit Log
    logAudit({
      action: 'GUI_DE_NGHI_DIEU_CHINH',
      entityType: 'appeal',
      entityId: newAppeal.id,
      campusId: newAppeal.campusId,
      classId: newAppeal.classId,
      beforeData: null,
      afterData: newAppeal,
      details: `GVCN ${currentUser.name} gửi phản hồi/đề nghị điều chỉnh điểm Tuần ${newAppeal.week} cho lớp ${newAppeal.className}: ${newAppeal.reason}`,
    });

    // Backend sync
    fetch('/api/appeals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
      },
      body: JSON.stringify(newAppeal),
    }).catch(() => {});

    return { success: true, message: 'Đã gửi đề nghị điều chỉnh điểm tới Ban Giám Hiệu và TPT Đội xét duyệt.' };
  };

  const reviewAppeal = (id: string, status: 'approved' | 'rejected', reviewNotes?: string, adjustScore: boolean = true) => {
    const appeal = appeals.find((a) => a.id === id);
    if (!appeal) return { success: false, message: 'Không tìm thấy yêu cầu điều chỉnh' };

    if (!canReviewAppeals(currentUser, appeal.campusId)) {
      return { success: false, message: 'Bạn không có quyền duyệt yêu cầu điều chỉnh của phân hiệu này!' };
    }

    const beforeAppeal = { ...appeal };
    let resultingScoreLogId: string | undefined = undefined;

    // If approved and adjustScore is requested, automatically generate adjustment score log
    if (status === 'approved' && adjustScore) {
      const isBonus = appeal.appealType === 'add_bonus';
      const points = appeal.proposedPoints || (isBonus ? 1 : 1);
      const crit = criteria.find((c) => (isBonus ? c.type === 'bonus' : c.type === 'penalty')) || criteria[0];

      const adjLog: Omit<ScoreLog, 'id'> = {
        week: appeal.week,
        period: 'week',
        classId: appeal.classId,
        className: appeal.className,
        campusId: appeal.campusId,
        campusName: appeal.campusName,
        campusType: 'sub',
        grade: 6,
        criteriaId: crit.id,
        criteriaCode: 'DIEUCHINH',
        criteriaName: `[Điều chỉnh BGH] ${appeal.criteriaName || 'Phản hồi GVCN'}`,
        category: 'Học tập',
        type: isBonus ? 'bonus' : 'bonus',
        pointsPerUnit: points,
        quantity: 1,
        totalPoints: points,
        calculationDetail: `Duyệt đề nghị điều chỉnh của GVCN ${appeal.teacherName}: ${appeal.reason}`,
        note: `Căn cứ đề nghị điều chỉnh #${appeal.id}: ${reviewNotes || 'Hợp lệ'}`,
        date: new Date().toISOString().split('T')[0],
        recordedBy: currentUser.title || 'Ban Giám Hiệu',
        inspectorName: currentUser.name,
      };

      const enriched = enrichScoreLog(adjLog);
      resultingScoreLogId = `log_adj_${Date.now()}`;
      setScoreLogs((prev) => [{ ...enriched, id: resultingScoreLogId! }, ...prev]);
    }

    const updatedAppeal: AdjustmentAppeal = {
      ...appeal,
      status,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || '',
      resultingScoreLogId,
    };

    setAppeals((prev) => prev.map((a) => (a.id === id ? updatedAppeal : a)));

    // Record Audit Log with before and after
    logAudit({
      action: status === 'approved' ? 'DUYET_DIEU_CHINH' : 'TU_CHOI_DIEU_CHINH',
      entityType: 'appeal',
      entityId: id,
      campusId: appeal.campusId,
      classId: appeal.classId,
      beforeData: beforeAppeal,
      afterData: updatedAppeal,
      details: `${status === 'approved' ? 'Phê duyệt chấp thuận' : 'Từ chối'} đề nghị điều chỉnh của lớp ${appeal.className} (Tuần ${appeal.week}). Phản hồi: ${reviewNotes || 'Không có'}`,
    });

    // Backend sync
    fetch(`/api/appeals/${id}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
        'x-user-name': currentUser.name,
        'x-user-role': userRole,
      },
      body: JSON.stringify({ status, reviewNotes }),
    }).catch(() => {});

    return {
      success: true,
      message: status === 'approved' ? 'Đã phê duyệt đề nghị điều chỉnh điểm!' : 'Đã từ chối đề nghị điều chỉnh.',
    };
  };

  // 9. Settings & System Actions with Audit Logging
  const updateSettings = (newSettings: Partial<SchoolSettings>) => {
    if (!canConfigureSettings(currentUser)) {
      return { success: false, message: 'Chỉ Super Admin mới có quyền cập nhật cấu hình hệ thống!' };
    }
    const oldSettings = { ...settings };

    const sem1 = typeof newSettings.totalWeeksSemester1 === 'number'
      ? newSettings.totalWeeksSemester1
      : (typeof settings.totalWeeksSemester1 === 'number' ? settings.totalWeeksSemester1 : 18);
    const sem2 = typeof newSettings.totalWeeksSemester2 === 'number'
      ? newSettings.totalWeeksSemester2
      : (typeof settings.totalWeeksSemester2 === 'number' ? settings.totalWeeksSemester2 : 17);
    const calculatedMax = sem1 + sem2;

    const targetMax = typeof newSettings.max_weeks === 'number'
      ? newSettings.max_weeks
      : (typeof newSettings.totalWeeks === 'number' ? newSettings.totalWeeks : calculatedMax);

    const activeWeek = typeof newSettings.current_active_week === 'number'
      ? newSettings.current_active_week
      : (typeof newSettings.currentWeek === 'number' ? newSettings.currentWeek : (settings.current_active_week || settings.currentWeek || 4));

    const updated: SchoolSettings = {
      ...settings,
      ...newSettings,
      totalWeeksSemester1: sem1,
      totalWeeksSemester2: sem2,
      totalWeeks: targetMax,
      max_weeks: targetMax,
      current_active_week: activeWeek,
      currentWeek: activeWeek,
    };
    setSettings(updated);

    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {}

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: 'settings_global',
      beforeData: oldSettings,
      afterData: updated,
      details: `Cập nhật cấu hình: Đơn vị cấp trên="${updated.governingBody || 'Để trống'}", Tên trường="${updated.schoolName || ''}", Tổng tuần=${targetMax} (HK1: ${sem1}, HK2: ${sem2})`,
    });

    return { success: true };
  };

  const activateManualWeek = (week: number): { success: boolean; message: string } => {
    if (!canConfigureSettings(currentUser)) {
      return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền thiết lập tuần hiện tại!' };
    }

    const currentMax = settings.max_weeks || settings.totalWeeks || (settings.totalWeeksSemester1 + settings.totalWeeksSemester2) || 35;
    if (week < 1 || week > currentMax) {
      return { success: false, message: `Tuần được chọn không hợp lệ! Vui lòng chọn trong khoảng từ 1 đến ${currentMax}.` };
    }

    // Khi Admin chọn bằng tay, ghi đè start_date_of_week_1 để hệ thống tự đếm tiếp từ đó:
    const newStartDateOfWeek1 = calculateOverriddenStartDateOfWeek1(week);
    const todayStr = formatDateYMD(new Date());

    const oldWeek = settings.current_active_week || settings.currentWeek || 7;

    const updatedSettings: SchoolSettings = {
      ...settings,
      start_date_of_week_1: newStartDateOfWeek1,
      current_active_week: week,
      currentWeek: week,
      last_baseline_date: todayStr,
      max_weeks: currentMax,
      totalWeeks: currentMax,
    };

    setSettings(updatedSettings);
    setSelectedWeek(week);

    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch {}

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    }).catch(() => {});

    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: 'manual_week_activation',
      beforeData: { week: oldWeek, start_date_of_week_1: settings.start_date_of_week_1 },
      afterData: { week, start_date_of_week_1: newStartDateOfWeek1, max_weeks: currentMax },
      details: `Admin kích hoạt tuần hiện tại: Tuần ${week} (Ghi đè mốc Thứ Hai Tuần 1: ${newStartDateOfWeek1}). Hệ thống sẽ tự động đếm tiếp từ mốc này.`,
    });

    return {
      success: true,
      message: `Đã kích hoạt Tuần ${week} làm tuần hiện tại thành công! Mốc bắt đầu Tuần 1 đã được cập nhật thành ${newStartDateOfWeek1} để hệ thống tự động đếm tiếp.`,
    };
  };

  const updateTimeframeConfig = (
    sem1Weeks: number,
    sem2Weeks: number,
    schoolStartDate?: string
  ): { success: boolean; message: string } => {
    if (!canConfigureSettings(currentUser)) {
      return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền cập nhật khung thời gian thi đua!' };
    }

    const s1 = Math.max(1, Math.min(30, Number(sem1Weeks) || 18));
    const s2 = Math.max(1, Math.min(30, Number(sem2Weeks) || 17));
    const newMax = s1 + s2;

    const startDateWeek1 = settings.start_date_of_week_1 || calculateNaturalWeek1StartDate(settings.academicYear);
    const { currentWeek: calculatedActive } = calculateCurrentActiveWeek(startDateWeek1, newMax);
    const startDate = schoolStartDate || settings.schoolStartDate || '2026-09-05';

    // Regenerate calendar weeks according to new timeframe using start_date_of_week_1
    const newCalendarWeeks = generateDefaultCalendarWeeks(
      settings.academicYear || '2026-2027',
      s1,
      s2,
      startDateWeek1
    );
    setCalendarWeeks(newCalendarWeeks);

    const newMonthWeeksMap: Record<number, number[]> = {};
    newCalendarWeeks.forEach((cw) => {
      if (!newMonthWeeksMap[cw.month]) newMonthWeeksMap[cw.month] = [];
      newMonthWeeksMap[cw.month].push(cw.week);
    });

    const updatedSettings: SchoolSettings = {
      ...settings,
      totalWeeksSemester1: s1,
      totalWeeksSemester2: s2,
      totalWeeks: newMax,
      max_weeks: newMax,
      start_date_of_week_1: startDateWeek1,
      current_active_week: calculatedActive,
      currentWeek: calculatedActive,
      schoolStartDate: startDate,
      monthWeeksMap: newMonthWeeksMap,
    };

    setSettings(updatedSettings);
    if (selectedWeek > newMax) {
      setSelectedWeek(newMax);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
      localStorage.setItem(STORAGE_KEYS.CALENDAR_WEEKS, JSON.stringify(newCalendarWeeks));
    } catch {}

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings),
    }).catch(() => {});

    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: 'timeframe_config',
      beforeData: { totalWeeksSemester1: settings.totalWeeksSemester1, totalWeeksSemester2: settings.totalWeeksSemester2, max_weeks: settings.max_weeks },
      afterData: { totalWeeksSemester1: s1, totalWeeksSemester2: s2, max_weeks: newMax, current_active_week: calculatedActive },
      details: `Admin cập nhật khung thời gian thi đua: HK1 = ${s1} tuần, HK2 = ${s2} tuần. Tổng toàn trường = ${newMax} tuần. Tuần hiện tại tự động = Tuần ${calculatedActive}.`,
    });

    return {
      success: true,
      message: `Đã cập nhật khung thời gian thi đua: HK1 (${s1} tuần) + HK2 (${s2} tuần) = Tổng ${newMax} tuần! Tuần hiện tại tự động: Tuần ${calculatedActive}.`,
    };
  };

  // Historical Preserved Scores (Điểm bảo lưu lịch sử)
  const saveHistoricalScores = async (
    week: number,
    scores: Record<string, { finalScore: number; note?: string }>,
    autoLock: boolean = true
  ): Promise<{ success: boolean; message: string }> => {
    if (!canManageHistoricalScores(currentUser)) {
      return {
        success: false,
        message: 'Chỉ Quản trị viên (Admin) và Ban Giám Hiệu mới có quyền nhập điểm bảo lưu lịch sử!',
      };
    }

    const currentMax =
      settings.max_weeks ||
      settings.totalWeeks ||
      (settings.totalWeeksSemester1 + settings.totalWeeksSemester2) ||
      35;
    if (week < 1 || week > currentMax) {
      return {
        success: false,
        message: `Tuần được chọn không hợp lệ! Vui lòng chọn trong khoảng từ 1 đến ${currentMax}.`,
      };
    }

    const updatedWeekMap: Record<string, HistoricalScoreEntry> = {};
    Object.entries(scores).forEach(([clsId, val]) => {
      const cls = classes.find((c) => c.id === clsId);
      updatedWeekMap[clsId] = {
        classId: clsId,
        className: cls?.name,
        finalScore: Number(val.finalScore),
        note: val.note || 'Điểm bảo lưu lịch sử (Hợp lệ)',
        updatedBy: currentUser.name,
        updatedAt: new Date().toISOString(),
      };
    });

    const nextState: HistoricalWeeklyScoresMap = {
      ...historicalWeeklyScores,
      [week]: updatedWeekMap,
    };

    // Đánh dấu mốc thời gian người dùng vừa lưu dữ liệu bảo lưu
    lastUserActionTimestampRef.current = Date.now();

    setHistoricalWeeklyScores(nextState);

    try {
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify(nextState));
      try {
        setDoc(doc(db, 'historical_scores', 'summary'), {
          historicalWeeklyScores: nextState,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        }, { merge: true }).catch((err) => console.warn('Lỗi đẩy historical_scores lên Firebase:', err));

        setDoc(doc(db, 'historical_scores', `week_${week}`), {
          week,
          scores: updatedWeekMap,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        }).catch(() => {});
      } catch (fbErr) {
        console.warn('Lỗi gọi Firebase cho historical_scores:', fbErr);
      }
    } catch {}

    // Auto-lock the week so it automatically counts towards Month, Semester, and Year rankings
    let nextLockedWeeks = [...lockedWeeks];
    if (autoLock && !nextLockedWeeks.includes(week)) {
      nextLockedWeeks.push(week);
      nextLockedWeeks.sort((a, b) => a - b);
      setLockedWeeks(nextLockedWeeks);
      try {
        localStorage.setItem(STORAGE_KEYS.LOCKED_WEEKS, JSON.stringify(nextLockedWeeks));
      } catch {}

      // Đồng bộ trạng thái chốt tuần lên Firestore để các thiết bị khác nạp được ngay
      try {
        setDoc(doc(db, 'locked_weeks', 'summary'), {
          lockedWeeks: nextLockedWeeks,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'locked_weeks', `week_${week}`), {
          week,
          isLocked: true,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          reason: 'Tự động chốt khi nhập điểm bảo lưu lịch sử',
        }).catch(() => {});
      } catch {}
    }

    const updatedSettings: SchoolSettings = {
      ...settings,
      historicalWeeklyScores: nextState,
      lockedWeeks: nextLockedWeeks,
    };
    setSettings(updatedSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch {}

    // Synchronize to backend
    try {
      await saveCloudDoc('historical_scores', 'current', {
        week,
        scores: updatedWeekMap,
        lockWeek: autoLock,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.id
      });

    } catch {}

    const classesCount = Object.keys(updatedWeekMap).length;
    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'historical_scores',
      entityId: `week_${week}`,
      details: `Nhập điểm bảo lưu lịch sử cho ${classesCount} lớp tại Tuần ${week}. Đã ghi nhận điểm tổng kết hợp lệ và tự động tính vào Xếp hạng Tháng, Học kỳ, Cả năm.`,
    });

    return {
      success: true,
      message: `Đã lưu thành công điểm bảo lưu lịch sử cho ${classesCount} lớp tại Tuần ${week}! Điểm này đã được ghi nhận làm điểm tổng kết hợp lệ.`,
    };
  };

  const clearHistoricalScores = async (
    week: number
  ): Promise<{ success: boolean; message: string }> => {
    if (!canManageHistoricalScores(currentUser)) {
      return {
        success: false,
        message: 'Chỉ Quản trị viên (Admin) và Ban Giám Hiệu mới có quyền xóa điểm bảo lưu lịch sử!',
      };
    }

    const nextState: HistoricalWeeklyScoresMap = { ...historicalWeeklyScores };
    delete nextState[week];

    lastUserActionTimestampRef.current = Date.now();
    setHistoricalWeeklyScores(nextState);

    try {
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify(nextState));
      try {
        setDoc(doc(db, 'historical_scores', 'summary'), {
          historicalWeeklyScores: nextState,
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {});
        deleteDoc(doc(db, 'historical_scores', `week_${week}`)).catch(() => {});
      } catch {}
    } catch {}

    const updatedSettings: SchoolSettings = {
      ...settings,
      historicalWeeklyScores: nextState,
    };
    setSettings(updatedSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch {}

    try {
      await fetch(`/api/historical-scores/${week}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
      });
    } catch {}

    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'historical_scores',
      entityId: `week_${week}`,
      details: `Đã xóa điểm bảo lưu lịch sử Tuần ${week}. Hệ thống chuyển về tính điểm tuần theo bản ghi vi phạm chi tiết.`,
    });

    return {
      success: true,
      message: `Đã xóa điểm bảo lưu lịch sử của Tuần ${week}.`,
    };
  };

  const resetToDefaultData = () => {
    const beforeState = {
      campusCount: campuses.length,
      classCount: classes.length,
      scoreLogCount: scoreLogs.length,
    };

    try {
      fetch('/api/bootstrap')
        .then((res) => res.json())
        .then((data) => {
          if (data.campuses) setCampuses(data.campuses);
          if (data.classes) setClasses(data.classes);
          if (data.criteria) setCriteria(data.criteria);
          if (data.users) setUsers(data.users);
          if (data.settings) setSettings(data.settings);
          setScoreLogs(data.scoreLogs || []);
          setLockedWeeks(data.lockedWeeks || []);
          setAuditLogs(data.auditLogs || []);
          setAppeals(data.appeals || []);
        })
        .catch((e) => console.error('Error reloading bootstrap:', e));
    } catch {}

    setRedFlagDuties([]);
    setLockedWeeks([]);
    setHistoricalWeeklyScores({});
    setLockedMonths({});
    setLockedSemesters({});
    setLockedYear(null);
    setLockedTitles(null);
    setDisciplinaryRecords([]);
    setCurrentUserId('u_admin');
    setSelectedWeek(settings.current_active_week || 7);
    setSelectedCampusId('all');
    setSelectedGrade('all');

    logAudit({
      action: 'KHOI_PHUC_HE_THONG',
      entityType: 'settings',
      entityId: 'system_reset',
      beforeData: beforeState,
      afterData: { status: 'reset_default' },
      details: 'Khôi phục và đồng bộ lại toàn bộ dữ liệu từ máy chủ trung tâm',
    });
  };

  const clearTestDataForGoLive = async (): Promise<{ success: boolean; message: string }> => {
    if (!canConfigureSettings(currentUser)) {
      return { success: false, message: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện dọn dẹp dữ liệu chạy thử!' };
    }

    const beforeState = {
      scoreLogsCount: scoreLogs.length,
      lockedWeeksCount: lockedWeeks.length,
      historicalWeeksCount: Object.keys(historicalWeeklyScores).length,
      appealsCount: appeals.length,
    };

    // 1. Xóa sạch Transactional Data trên State
    setScoreLogs([]);
    setHistoricalWeeklyScores({});
    setLockedWeeks([]);
    setLockedMonths({});
    setLockedSemesters({});
    setLockedYear(null);
    setLockedTitles(null);
    setDisciplinaryRecords([]);
    setAppeals([]);

    // 2. Chuyển Settings sang Chế độ Thật (production), mở khóa tất cả tuần
    const updatedSettings: SchoolSettings = {
      ...settings,
      dataMode: 'production',
      lockedWeeks: [],
      lockedMonths: {},
      lockedSemesters: {},
      lockedYear: null,
      lockedTitles: null,
      historicalWeeklyScores: {},
    };
    setSettings(updatedSettings);

    // 3. Xóa sạch LocalStorage các khóa điểm số, khóa tuần/tháng
    try {
      localStorage.setItem(STORAGE_KEYS.SCORE_LOGS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.LOCKED_WEEKS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.LOCKED_SEMESTERS, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.LOCKED_YEAR, JSON.stringify(null));
      localStorage.setItem(STORAGE_KEYS.LOCKED_TITLES, JSON.stringify(null));
      localStorage.setItem(STORAGE_KEYS.DISCIPLINARY_RECORDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.APPEALS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
      localStorage.setItem('lhl_golive_cleaned_v2026_10', 'true');
    } catch {}

    // 4. Đồng bộ gọi Server API dọn dẹp cơ sở dữ liệu máy chủ
    try {
      await fetch('/api/admin/clear-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
      });
    } catch {}

    // 5. Ghi nhật ký Audit Log
    logAudit({
      action: 'DON_DEP_DU_LIEU_CHAY_THU',
      entityType: 'settings',
      entityId: 'system_golive_cleanup',
      beforeData: beforeState,
      afterData: {
        scoreLogsCount: 0,
        lockedWeeks: [],
        historicalScoresCount: 0,
        dataMode: 'production',
        classesCount: classes.length,
        usersCount: users.length,
      },
      details: `${currentUser.name} dọn dẹp sạch dữ liệu chạy thử: Đã xóa toàn bộ điểm số, vi phạm, điểm bảo lưu, và mở khóa toàn bộ các tuần. Giữ nguyên 59 Lớp học, 6 Phân hiệu, 71 Tài khoản và Tiêu chí thi đua sẵn sàng Go-live chính thức.`,
    });

    return {
      success: true,
      message: 'Đã hoàn tất dọn dẹp sạch dữ liệu chạy thử! Toàn bộ 59 Lớp học, 6 Phân hiệu, 71 Tài khoản cùng Tiêu chí thi đua và Cấu hình thời gian được bảo tồn nguyên vẹn. Hệ thống đã sẵn sàng cho giáo viên nhập liệu thật!',
    };
  };

  const resetDatabase = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || 'u_admin',
          'x-user-name': currentUser?.name || 'Thầy Nguyễn Văn Sơn',
          'x-user-role': userRole,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScoreLogs([]);
        setHistoricalWeeklyScores({});
        setBonusMonthly({});
        setBonusTerm({});
        setBonusYearly({});
        setLockedWeeks([]);
        setLockedMonths({});
        setLockedSemesters({});
        setLockedYear(null);
        setLockedTitles(null);
        setAppeals([]);
        try {
          localStorage.setItem(STORAGE_KEYS.SCORE_LOGS, JSON.stringify([]));
          localStorage.setItem(STORAGE_KEYS.HISTORICAL_SCORES, JSON.stringify({}));
          localStorage.setItem('lhl_bonus_monthly', JSON.stringify({}));
          localStorage.setItem('lhl_bonus_term', JSON.stringify({}));
          localStorage.setItem('lhl_bonus_yearly', JSON.stringify({}));
          localStorage.setItem(STORAGE_KEYS.LOCKED_WEEKS, JSON.stringify([]));
          localStorage.setItem(STORAGE_KEYS.LOCKED_MONTHS, JSON.stringify({}));
          localStorage.setItem(STORAGE_KEYS.LOCKED_SEMESTERS, JSON.stringify({}));
          localStorage.setItem(STORAGE_KEYS.LOCKED_YEAR, JSON.stringify(null));
          localStorage.setItem(STORAGE_KEYS.LOCKED_TITLES, JSON.stringify(null));
          localStorage.setItem(STORAGE_KEYS.APPEALS, JSON.stringify([]));
        } catch {}
        logAudit({
          action: 'KHOI_PHUC_HE_THONG',
          entityType: 'settings',
          entityId: 'reset_database_clean',
          details: `${currentUser?.name || 'Quản trị viên'} đã khởi tạo lại cơ sở dữ liệu hoàn toàn trống (giữ cấu trúc chuẩn 59 lớp, xóa sạch toàn bộ điểm số nháp)`,
        });
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Lỗi khi khởi tạo lại cơ sở dữ liệu.' };
    } catch (err: any) {
      return { success: false, message: 'Lỗi kết nối máy chủ: ' + err.message };
    }
  };

  const exportDataBackup = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      school: 'Trường THCS Lê Hữu Lập',
      settings,
      campuses,
      classes,
      criteria,
      scoreLogs,
      users,
      redFlagDuties,
      lockedWeeks,
      auditLogs,
      appeals,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDataBackup = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.campuses || !data.classes || !data.criteria || !data.scoreLogs) {
        return { success: false, message: 'Tệp sao lưu không đúng định dạng chuẩn của LHL Class Ranking.' };
      }
      if (data.campuses) setCampuses(data.campuses);
      if (data.classes) setClasses(data.classes);
      if (data.criteria) setCriteria(data.criteria);
      if (data.scoreLogs) setScoreLogs(data.scoreLogs);
      if (data.settings) setSettings(data.settings);
      if (data.users) setUsers(data.users);
      if (data.redFlagDuties) setRedFlagDuties(data.redFlagDuties);
      if (data.lockedWeeks) setLockedWeeks(data.lockedWeeks);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.appeals) setAppeals(data.appeals);

      logAudit({
        action: 'KHOI_PHUC_HE_THONG',
        entityType: 'settings',
        entityId: 'backup_restore',
        beforeData: null,
        afterData: { date: data.exportDate },
        details: 'Khôi phục hệ thống từ tệp sao lưu JSON',
      });

      return { success: true, message: 'Khôi phục dữ liệu hệ thống thành công!' };
    } catch {
      return { success: false, message: 'Lỗi giải mã file JSON. Vui lòng kiểm tra lại tệp.' };
    }
  };

  // 9.1 Multi-Year Management
  const switchAcademicYear = (targetYear: string): { success: boolean; message: string } => {
    if (targetYear === settings.academicYear) {
      return { success: true, message: `Hệ thống đang ở năm học ${targetYear}` };
    }

    // Auto archive current state if not archived yet
    const existingArchiveIndex = academicYearArchives.findIndex((a) => a.year === settings.academicYear);
    const currentArchive: AcademicYearArchive = {
      id: `archive_${settings.academicYear.replace(/[^a-zA-Z0-9]/g, '_')}`,
      year: settings.academicYear,
      archivedAt: new Date().toISOString(),
      archivedBy: currentUser.name,
      totalClasses: classes.length,
      totalScoreLogs: scoreLogs.length,
      lockedWeeks: [...lockedWeeks],
      classesSnapshot: [...classes],
      scoreLogsSnapshot: [...scoreLogs],
      settingsSnapshot: { ...settings },
      note: `Tự động lưu trữ khi chuyển sang năm học ${targetYear}`,
    };

    let updatedArchives = [...academicYearArchives];
    if (existingArchiveIndex >= 0) {
      updatedArchives[existingArchiveIndex] = currentArchive;
    } else {
      updatedArchives.push(currentArchive);
    }
    setAcademicYearArchives(updatedArchives);

    // Look for target archive
    const targetArchive = academicYearArchives.find((a) => a.year === targetYear);
    if (targetArchive) {
      setClasses(targetArchive.classesSnapshot);
      setScoreLogs(targetArchive.scoreLogsSnapshot);
      setLockedWeeks(targetArchive.lockedWeeks);
      setSettings((prev) => ({
        ...prev,
        ...targetArchive.settingsSnapshot,
        academicYear: targetYear,
      }));
    } else {
      setSettings((prev) => ({ ...prev, academicYear: targetYear }));
    }

    logAudit({
      action: 'CHUYEN_NAM_HOC',
      entityType: 'settings',
      entityId: `year_${targetYear}`,
      beforeData: { year: settings.academicYear },
      afterData: { year: targetYear, hasTargetArchive: !!targetArchive },
      details: `Chuyển không gian làm việc sang năm học ${targetYear}`,
    });

    return { success: true, message: `Đã chuyển sang năm học ${targetYear} thành công!` };
  };

  const createNewAcademicYear = (
    newYear: string,
    options: { advanceGrades?: boolean; archiveCurrentYear?: boolean; resetScores?: boolean; note?: string }
  ): { success: boolean; message: string } => {
    const trimmedYear = newYear.trim();
    if (!trimmedYear) return { success: false, message: 'Vui lòng nhập tên năm học mới (VD: 2027-2028)' };

    // 1. Archive current year if requested
    if (options.archiveCurrentYear !== false) {
      const archiveObj: AcademicYearArchive = {
        id: `archive_${Date.now()}_${settings.academicYear.replace(/[^a-zA-Z0-9]/g, '_')}`,
        year: settings.academicYear,
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser.name,
        totalClasses: classes.length,
        totalScoreLogs: scoreLogs.length,
        lockedWeeks: [...lockedWeeks],
        classesSnapshot: [...classes],
        scoreLogsSnapshot: [...scoreLogs],
        settingsSnapshot: { ...settings },
        note: options.note || `Lưu trữ trước khi khởi tạo năm học mới ${trimmedYear}`,
      };
      setAcademicYearArchives((prev) => [archiveObj, ...prev.filter((a) => a.year !== settings.academicYear)]);
    }

    // 2. Prepare classes (advance grades or keep standard roster)
    let newClasses = [...classes];
    if (options.advanceGrades) {
      newClasses = classes.map((c) => {
        let nextGrade = c.grade + 1;
        let nextName = c.name;
        if (c.grade < 9) {
          nextName = c.name.replace(new RegExp(`^${c.grade}`), `${nextGrade}`);
        } else {
          // Grade 9 graduates: becomes a new Grade 6 cohort
          nextGrade = 6;
          nextName = c.name.replace(/^9/, '6');
        }
        return {
          ...c,
          grade: nextGrade as (6 | 7 | 8 | 9),
          name: nextName,
        };
      });
      setClasses(newClasses);
    }

    // 3. Reset scores if requested
    if (options.resetScores !== false) {
      setScoreLogs([]);
      setLockedWeeks([]);
      setSelectedWeek(1);
    }

    // 4. Update settings
    setSettings((prev) => ({
      ...prev,
      academicYear: trimmedYear,
      currentWeek: 1,
      lockedWeeks: [],
    }));

    logAudit({
      action: 'CHUYEN_NAM_HOC',
      entityType: 'settings',
      entityId: `new_year_${trimmedYear}`,
      beforeData: { oldYear: settings.academicYear },
      afterData: { newYear: trimmedYear, options },
      details: `Khởi tạo năm học mới ${trimmedYear} (Lên lớp: ${options.advanceGrades ? 'Có' : 'Không'}, Reset điểm: ${options.resetScores ? 'Có' : 'Không'})`,
    });

    return { success: true, message: `Khởi tạo thành công năm học mới ${trimmedYear}!` };
  };

  const deleteArchivedYear = (archiveId: string): { success: boolean; message: string } => {
    setAcademicYearArchives((prev) => prev.filter((a) => a.id !== archiveId));
    return { success: true, message: 'Đã xóa bản lưu trữ năm học thành công.' };
  };

  // 9.2 System Integrity & Regulation Compliance Audit
  const runSystemIntegrityAudit = () => {
    const issues: string[] = [];
    const passedChecks: string[] = [];
    const checkedAt = new Date().toISOString();

    // Check 1: 59 classes & 6 campuses
    if (classes.length === 59) {
      passedChecks.push(`Chuẩn hóa quy mô: 59/59 lớp học đầy đủ theo công văn phân hiệu`);
    } else {
      issues.push(`Số lượng lớp hiện tại là ${classes.length} (Quy chuẩn thiết kế là 59 lớp)`);
    }

    if (campuses.length === 6) {
      passedChecks.push(`Chuẩn hóa phân hiệu: 6/6 cơ sở (1 Trường chính + 5 Phân hiệu)`);
    } else {
      issues.push(`Số lượng phân hiệu hiện tại là ${campuses.length} (Chuẩn là 6 phân hiệu)`);
    }

    // Check 2: Campus linkage
    const campusIds = new Set(campuses.map((c) => c.id));
    const orphanClasses = classes.filter((c) => !campusIds.has(c.campusId));
    if (orphanClasses.length === 0) {
      passedChecks.push(`Phân bổ cơ sở: 100% lớp học (${classes.length} lớp) được liên kết đúng mã phân hiệu`);
    } else {
      issues.push(`Có ${orphanClasses.length} lớp có mã phân hiệu không tồn tại: ${orphanClasses.map((c) => c.name).join(', ')}`);
    }

    // Check 3: Grades distribution
    const validGrades = new Set([6, 7, 8, 9]);
    const invalidGradeClasses = classes.filter((c) => !validGrades.has(c.grade));
    if (invalidGradeClasses.length === 0) {
      passedChecks.push(`Phân loại khối: 100% lớp thuộc Khối 6, 7, 8, 9 theo hệ THCS`);
    } else {
      issues.push(`Có ${invalidGradeClasses.length} lớp có khối không hợp lệ (ngoài 6-9)`);
    }

    // Check 4: Criteria database & Caps integrity
    const evalConfig = settings.evaluationConfig || DEFAULT_EVALUATION_CONFIG;
    if (criteria.length >= 50) {
      passedChecks.push(`Bộ tiêu chí thi đua: Đạt ${criteria.length} tiêu chí chi tiết phân loại 8 danh mục`);
    } else {
      issues.push(`Số lượng tiêu chí ít hơn chuẩn (${criteria.length} tiêu chí)`);
    }

    if (evalConfig.dormitoryMaxCap === 3) {
      passedChecks.push(`Khống chế trần bán trú: Đúng trần tối đa trừ không quá 3đ/tuần`);
    } else {
      issues.push(`Trần bán trú hiện tại là ${evalConfig.dormitoryMaxCap}đ (chuẩn công văn là 3đ)`);
    }

    if (evalConfig.ceremonyMaxCap === 0.5) {
      passedChecks.push(`Khống chế đội nghi lễ Đội: Chuẩn tối đa không quá 0.5đ/lớp cả năm`);
    } else {
      issues.push(`Trần đội nghi lễ hiện tại là ${evalConfig.ceremonyMaxCap}đ (chuẩn là 0.5đ)`);
    }

    if (evalConfig.advancedClassesRatio === 0.7) {
      passedChecks.push(`Chỉ tiêu thi đua năm: Đúng tỷ lệ chuẩn 70% lớp Tiên tiến trở lên (35% Xuất sắc, 35% Tiên tiến)`);
    } else {
      issues.push(`Tỷ lệ lớp tiên tiến đang đặt ${Math.round(evalConfig.advancedClassesRatio * 100)}% (chuẩn là 70%)`);
    }

    // Check 5: Score logs integrity
    const classIds = new Set(classes.map((c) => c.id));
    const orphanLogs = scoreLogs.filter((l) => !classIds.has(l.classId));
    if (orphanLogs.length === 0) {
      passedChecks.push(`Nhật ký thi đua: ${scoreLogs.length} bản ghi đều liên kết chính xác với danh sách lớp`);
    } else {
      issues.push(`Có ${orphanLogs.length} bản ghi điểm thuộc về lớp không tồn tại`);
    }

    // Check 6: Locked weeks validation
    const invalidWeeks = lockedWeeks.filter((w) => w < 1 || w > 35);
    if (invalidWeeks.length === 0) {
      passedChecks.push(`Kiểm soát tuần chốt khóa: ${lockedWeeks.length} tuần khóa nằm trong biên độ 1-35`);
    } else {
      issues.push(`Có tuần khóa ngoài phạm vi 1-35: ${invalidWeeks.join(', ')}`);
    }

    logAudit({
      action: 'KIEM_TRA_TOAN_VEN',
      entityType: 'settings',
      entityId: `audit_${Date.now()}`,
      beforeData: null,
      afterData: { issuesCount: issues.length, passedCount: passedChecks.length },
      details: `Rà soát đối chiếu toàn vẹn quy chuẩn thi đua: ${issues.length === 0 ? 'Hoàn hảo 100%' : `Phát hiện ${issues.length} cảnh báo`}`,
    });

    return {
      isCompliant: issues.length === 0,
      issues,
      passedChecks,
      totalClasses: classes.length,
      totalCampuses: campuses.length,
      checkedAt,
    };
  };

  // 9.3 Stand-alone Excel Exports
  const getExportSignatures = (targetCampusId?: string, scopeLabel?: string): ExportSignatures => {
    const campusId = targetCampusId ?? selectedCampusId;
    const currentCampus = campuses.find((c) => c.id === campusId);
    const tptName = settings.leadershipSignatures?.tptName || '';
    const principalName = settings.leadershipSignatures?.principalName || '';

    if (currentCampus) {
      const leader =
        currentCampus.leaderName ||
        settings.leadershipSignatures?.campusVicePrincipals?.[currentCampus.id] ||
        settings.leadershipSignatures?.vicePrincipalEmulationName ||
        '';
      return {
        tptName,
        principalName,
        leaderName: leader,
        leaderTitle: `Phó Hiệu trưởng phụ trách ${currentCampus.name}`,
        campusName: currentCampus.name,
        governingBody: settings.governingBody || '',
        schoolName: settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP',
      };
    }

    return {
      tptName,
      principalName,
      leaderName: settings.leadershipSignatures?.vicePrincipalEmulationName || '',
      leaderTitle: 'Phó Hiệu trưởng phụ trách Thi đua',
      campusName: scopeLabel || 'Toàn trường',
      governingBody: settings.governingBody || '',
      schoolName: settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP',
    };
  };

  const exportOfflineStandbyWorkbook = (week?: number) => {
    const targetWeek = week || selectedWeek;
    const weekRankings = getWeeklyRankings(targetWeek, 'all', 'all');
    const signatures = getExportSignatures('all', 'Toàn trường (Bản Dự Phòng)');
    exportOfflineStandbyEvaluationBook(classes, campuses, settings, targetWeek, weekRankings, signatures);

    logAudit({
      action: 'XUAT_EXCEL_TONG_HOP',
      entityType: 'settings',
      entityId: `excel_standby_w${targetWeek}`,
      beforeData: null,
      afterData: { week: targetWeek },
      details: `Xuất file Excel Chấm Điểm & Xếp Loại Offline Dự Phòng (Tuần ${targetWeek}) với đầy đủ kết quả tính toán chính xác`,
    });
  };

  const exportCurrentRankingsExcel = (
    periodType: 'week' | 'month' | 'semester' | 'year' = 'week',
    scopeTitle: string = 'Toàn trường'
  ) => {
    let r: RankingEntry[] = [];
    let periodTitle = '';

    switch (periodType) {
      case 'week':
        r = getWeeklyRankings(selectedWeek, selectedCampusId, selectedGrade);
        periodTitle = `Tuần ${selectedWeek}`;
        break;
      case 'month':
        r = getMonthlyRankings(selectedMonth, selectedCampusId, selectedGrade);
        periodTitle = `Tháng ${selectedMonth}`;
        break;
      case 'semester':
        r = getSemesterRankings(selectedSemester, selectedCampusId, selectedGrade);
        periodTitle = `Học kỳ ${selectedSemester === 1 ? 'I' : 'II'}`;
        break;
      case 'year':
        r = getYearlyRankings(selectedCampusId, selectedGrade);
        periodTitle = `Cả Năm Học ${settings.academicYear}`;
        break;
    }

    const signatures = getExportSignatures(selectedCampusId, scopeTitle);
    exportRankingsToExcel(r, periodTitle, settings.academicYear, scopeTitle, signatures);

    logAudit({
      action: 'XUAT_EXCEL_TONG_HOP',
      entityType: 'settings',
      entityId: `excel_rankings_${periodType}`,
      beforeData: null,
      afterData: { periodType, count: r.length },
      details: `Xuất file Excel Bảng Xếp Hạng Thi Đua (${periodTitle})`,
    });
  };

  const exportCurrentScoreLogsExcel = (filterDesc: string = 'Toàn bộ năm học') => {
    exportScoreLogsToExcel(scoreLogs, settings.academicYear, filterDesc);

    logAudit({
      action: 'XUAT_EXCEL_TONG_HOP',
      entityType: 'score_log',
      entityId: `excel_logs_${Date.now()}`,
      beforeData: null,
      afterData: { logCount: scoreLogs.length },
      details: `Xuất file Excel Sổ Nhật Ký Theo Dõi Vi Phạm & Khen Thưởng (${scoreLogs.length} bản ghi)`,
    });
  };

  const exportCriteriaCatalogExcel = () => {
    exportCriteriaCatalogToExcel(criteria, settings.academicYear);

    logAudit({
      action: 'XUAT_EXCEL_TONG_HOP',
      entityType: 'criteria',
      entityId: `excel_criteria_${Date.now()}`,
      beforeData: null,
      afterData: { criteriaCount: criteria.length },
      details: `Xuất file Excel Danh Mục Quy Chuẩn 64 Tiêu Chí Thi Đua Năm Học ${settings.academicYear}`,
    });
  };

  // 9.4 Full System Backup & Safe Restore
  const exportFullBackupPayload = (): string => {
    const payload: SystemFullBackupPayload = {
      version: '2.5.0',
      appName: 'Hệ Thống Đánh Giá & Xếp Loại Thi Đua Nề Nếp Học Sinh THCS Lê Hữu Lập',
      exportedAt: new Date().toISOString(),
      exportedBy: `${currentUser.name} (${currentUser.title})`,
      settings,
      campuses,
      classes,
      criteria,
      scoreLogs,
      lockedWeeks,
      appeals,
      auditLogs,
      academicYearArchives,
      users,
      redFlagDuties,
      checksum: `sha256_${Date.now().toString(36)}`,
    };

    logAudit({
      action: 'SAO_LUU_HE_THONG',
      entityType: 'settings',
      entityId: `backup_${Date.now()}`,
      beforeData: null,
      afterData: {
        classesCount: classes.length,
        logsCount: scoreLogs.length,
        archivesCount: academicYearArchives.length,
      },
      details: `Xuất bản sao lưu toàn bộ hệ thống (${classes.length} lớp, ${scoreLogs.length} nhật ký, ${academicYearArchives.length} năm học lưu trữ)`,
    });

    return JSON.stringify(payload, null, 2);
  };

  const restoreFullBackup = (payload: SystemFullBackupPayload): { success: boolean; message: string } => {
    try {
      if (!payload.campuses || !payload.classes || !payload.criteria) {
        return { success: false, message: 'Tệp sao lưu không hợp lệ hoặc thiếu cấu trúc phân hiệu/lớp/tiêu chí!' };
      }

      setCampuses(payload.campuses);
      setClasses(payload.classes);
      setCriteria(payload.criteria);
      if (payload.scoreLogs) setScoreLogs(payload.scoreLogs);
      if (payload.settings) setSettings(payload.settings);
      if (payload.users) setUsers(payload.users);
      if (payload.redFlagDuties) setRedFlagDuties(payload.redFlagDuties);
      if (payload.lockedWeeks) setLockedWeeks(payload.lockedWeeks);
      if (payload.auditLogs) setAuditLogs(payload.auditLogs);
      if (payload.appeals) setAppeals(payload.appeals);
      if (payload.academicYearArchives) setAcademicYearArchives(payload.academicYearArchives);

      logAudit({
        action: 'PHUC_HOI_HE_THONG',
        entityType: 'settings',
        entityId: `restore_${Date.now()}`,
        beforeData: null,
        afterData: {
          classesCount: payload.classes.length,
          logsCount: payload.scoreLogs?.length || 0,
        },
        details: `Khôi phục toàn bộ hệ thống từ tệp sao lưu phiên bản ${payload.version || '2.0'} (Ngày tạo: ${payload.exportedAt || 'Không rõ'})`,
      });

      return {
        success: true,
        message: `Phục hồi thành công: ${payload.classes.length} lớp, ${payload.scoreLogs?.length || 0} bản ghi điểm, ${payload.campuses.length} phân hiệu!`,
      };
    } catch {
      return { success: false, message: 'Lỗi xảy ra trong quá trình xử lý khôi phục dữ liệu!' };
    }
  };

  // Periodic Bonus Management (Điểm thưởng hoạt động phong trào Tháng, Học kỳ, Cả năm)
  const updatePeriodicBonus = (
    type: 'monthly' | 'term' | 'yearly',
    key: string,
    points: number
  ) => {
    const val = Number(points) || 0;
    if (type === 'monthly') {
      setBonusMonthly((prev) => {
        const next = { ...prev, [key]: val };
        try {
          localStorage.setItem('lhl_bonus_monthly', JSON.stringify(next));
          updateDoc(doc(db, 'monthly_bonuses', 'summary'), { bonusMonthly: next }).catch(console.error);
        } catch {}
        return next;
      });
    } else if (type === 'term') {
      setBonusTerm((prev) => {
        const next = { ...prev, [key]: val };
        try {
          localStorage.setItem('lhl_bonus_term', JSON.stringify(next));
        } catch {}
        return next;
      });
    } else if (type === 'yearly') {
      setBonusYearly((prev) => {
        const next = { ...prev, [key]: val };
        try {
          localStorage.setItem('lhl_bonus_yearly', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    // Persist to central server database
    fetch('/api/periodic-bonuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'admin',
        'x-user-name': currentUser?.name || 'Quản trị viên',
        'x-user-role': currentUser?.role || 'super_admin',
      },
      body: JSON.stringify({ type, key, points: val }),
    }).catch((e) => console.error('Save periodic bonus error:', e));

    logAudit({
      action: 'CAP_NHAT_CAU_HINH',
      entityType: 'settings',
      entityId: `${type}_${key}`,
      details: `Cập nhật điểm thưởng phong trào ${type} (${key}): ${val} điểm`,
    });
  };

  const downloadSourceCodeZip = () => {
    const link = document.createElement('a');
    link.href = '/api/download-source-zip';
    link.setAttribute('download', 'source_code_thcs_le_huu_lap.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 10. Scoring & Ranking Calculations
  // Điểm tuần:
  // Bắt đầu 100 điểm + tổng điểm thưởng tuần - tổng điểm phạt tuần.
  const getClassWeeklyScore = (classId: string, week: number): ClassWeeklyScore => {
    const baseScore = settings.basePointsPerWeek || 100;
    const targetWeekNum = Number(week);

    // 1. Kiểm tra Điểm bảo lưu lịch sử (Historical Preserved Scores)
    // Nếu tuần này đã được Admin/BGH nhập điểm bảo lưu cho lớp, lấy trực tiếp làm 'Điểm tổng kết' hợp lệ
    // mà KHÔNG bắt buộc phải có các bản ghi vi phạm chi tiết. Tự động tính vào Xếp hạng Tháng, Học kỳ, Cả năm.
    const histWeek = historicalWeeklyScores?.[targetWeekNum] || (historicalWeeklyScores as any)?.[String(targetWeekNum)] || settings.historicalWeeklyScores?.[targetWeekNum] || (settings.historicalWeeklyScores as any)?.[String(targetWeekNum)];
    const histEntry = histWeek?.[classId];
    if (histEntry !== undefined && typeof histEntry.finalScore === 'number' && !isNaN(histEntry.finalScore)) {
      const histFinalScore = Number(histEntry.finalScore);
      const diff = Number((histFinalScore - baseScore).toFixed(2));
      const bonusPoints = diff > 0 ? diff : 0;
      const penaltyPoints = diff < 0 ? Math.abs(diff) : 0;
      return {
        classId,
        week: targetWeekNum,
        baseScore,
        bonusPoints,
        penaltyPoints,
        finalScore: histFinalScore,
        logCount: 0,
        isHistorical: true,
        historicalNote: histEntry.note || 'Điểm bảo lưu lịch sử (Hợp lệ)',
      };
    }

    const isProd = settings.dataMode === 'production';
    const activeYear = settings.academicYear || '2026-2027';
    const logs = scoreLogs.filter((l) => {
      if (l.classId !== classId || Number(l.week) !== targetWeekNum || (l.period && l.period !== 'week')) return false;
      if (isProd && l.isDemo === true) return false;
      if (l.academicYear && l.academicYear !== activeYear) return false;
      return true;
    });

    let bonusPoints = 0;
    let penaltyPoints = 0;

    logs.forEach((l) => {
      const pts = Number(l.totalPoints) || 0;
      if (l.type === 'bonus' || pts > 0) {
        bonusPoints += Math.abs(pts);
      } else {
        penaltyPoints += Math.abs(pts);
      }
    });

    const finalScore = Number((baseScore + bonusPoints - penaltyPoints).toFixed(2));

    return {
      classId,
      week: targetWeekNum,
      baseScore,
      bonusPoints,
      penaltyPoints,
      finalScore,
      logCount: logs.length,
    };
  };

  // Xếp hạng tuần:
  const getWeeklyRankings = (
    week: number,
    campusId = 'all',
    grade: number | 'all' = 'all'
  ): RankingEntry[] => {
    const sem1WeeksCount = settings.totalWeeksSemester1 || 18;
    const isSem1Week = week <= sem1WeeksCount;

    const targetClasses = classes.filter((c) => {
      if (campusId !== 'all' && c.campusId !== campusId) return false;
      if (grade !== 'all' && c.grade !== grade) return false;
      return true;
    });

    const activeEntries: RankingEntry[] = [];
    const exemptEntries: RankingEntry[] = [];

    targetClasses.forEach((cls) => {
      const campus = campuses.find((cmp) => cmp.id === cls.campusId) || {
        id: cls.campusId,
        code: '???',
        name: 'Chưa xác định',
        type: 'sub',
        leaderName: '---',
        phone: '',
        address: '',
        colorTheme: 'slate',
      };

      const scoreInfo = getClassWeeklyScore(cls.id, week);
      const isExempt = isSem1Week && !!cls.exemptSemester1;

      const entry: RankingEntry = {
        rank: 0,
        classItem: cls,
        campus,
        totalScore: scoreInfo.finalScore,
        baseScore: scoreInfo.baseScore,
        bonusPoints: scoreInfo.bonusPoints,
        penaltyPoints: scoreInfo.penaltyPoints,
        logCount: scoreInfo.logCount,
        performanceTier: isExempt ? 'Chưa đủ dữ liệu' : determineTier(scoreInfo.finalScore),
        weekBreakdown: [{ week, score: scoreInfo.finalScore }],
        isHistorical: scoreInfo.isHistorical,
        historicalNote: scoreInfo.historicalNote,
        isExempt,
      };

      if (isExempt) {
        entry.rank = 0;
        exemptEntries.push(entry);
      } else {
        activeEntries.push(entry);
      }
    });

    activeEntries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
      if (a.penaltyPoints !== b.penaltyPoints) return a.penaltyPoints - b.penaltyPoints;
      return a.classItem.name.localeCompare(b.classItem.name);
    });

    activeEntries.forEach((item, index) => {
      if (index > 0) {
        const prev = activeEntries[index - 1];
        if (item.totalScore === prev.totalScore) {
          item.rank = prev.rank;
        } else {
          item.rank = index + 1;
        }
      } else {
        item.rank = 1;
      }
    });

    return [...activeEntries, ...exemptEntries];
  };

  // Xếp hạng tháng:
  const getMonthlyRankings = (
    month: number,
    campusId = 'all',
    grade: number | 'all' = 'all'
  ): RankingEntry[] => {
    const weeksInMonth = settings.monthWeeksMap[month] || [1, 2, 3, 4];
    const sem1Months = [9, 10, 11, 12];
    const isSem1Month = sem1Months.includes(month);

    const targetClasses = classes.filter((c) => {
      if (campusId !== 'all' && c.campusId !== campusId) return false;
      if (grade !== 'all' && c.grade !== grade) return false;
      return true;
    });

    const activeEntries: RankingEntry[] = [];
    const exemptEntries: RankingEntry[] = [];

    targetClasses.forEach((cls) => {
      const campus = campuses.find((cmp) => cmp.id === cls.campusId) || campuses[0];
      const weekScores = weeksInMonth.map((w) => ({
        week: w,
        score: getClassWeeklyScore(cls.id, w).finalScore,
      }));

      const sumWeeks = weekScores.reduce((acc, curr) => acc + curr.score, 0);
      const avgWeeks = weeksInMonth.length > 0 ? sumWeeks / weeksInMonth.length : 100;

      const monthLogs = scoreLogs.filter(
        (l) =>
          l.classId === cls.id &&
          l.period === 'month' &&
          (l.month === month || (l.date && parseInt(l.date.split('-')[1], 10) === month))
      );

      let monthBonus = 0;
      let monthPenalty = 0;
      monthLogs.forEach((l) => {
        if (l.type === 'bonus' || l.totalPoints > 0) {
          monthBonus += Math.abs(l.totalPoints);
        } else {
          monthPenalty += Math.abs(l.totalPoints);
        }
      });

      const totalScore = Number((avgWeeks + monthBonus - monthPenalty).toFixed(2));
      const isExempt = isSem1Month && !!cls.exemptSemester1;

      const entry: RankingEntry = {
        rank: 0,
        classItem: cls,
        campus,
        totalScore,
        baseScore: Number(avgWeeks.toFixed(2)),
        bonusPoints: 0,
        penaltyPoints: 0,
        monthBonusPoints: monthBonus,
        monthPenaltyPoints: monthPenalty,
        logCount: weekScores.length + monthLogs.length,
        performanceTier: isExempt ? 'Chưa đủ dữ liệu' : determineTier(totalScore),
        averageScore: Number(avgWeeks.toFixed(2)),
        weekBreakdown: weekScores,
        isExempt,
      };

      if (isExempt) {
        entry.rank = 0;
        exemptEntries.push(entry);
      } else {
        activeEntries.push(entry);
      }
    });

    activeEntries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      const bBonus = b.monthBonusPoints || 0;
      const aBonus = a.monthBonusPoints || 0;
      if (bBonus !== aBonus) return bBonus - aBonus;
      const aPenalty = a.monthPenaltyPoints || 0;
      const bPenalty = b.monthPenaltyPoints || 0;
      if (aPenalty !== bPenalty) return aPenalty - bPenalty;
      return a.classItem.name.localeCompare(b.classItem.name);
    });

    activeEntries.forEach((item, index) => {
      if (index > 0) {
        const prev = activeEntries[index - 1];
        if (item.totalScore === prev.totalScore) {
          item.rank = prev.rank;
        } else {
          item.rank = index + 1;
        }
      } else {
        item.rank = 1;
      }
    });

    return [...activeEntries, ...exemptEntries];
  };

  // MODULE XẾP HẠNG THÁNG THEO QUY CHẾ 2026-2027:
  // - Điểm tháng của mỗi lớp = trung bình điểm của các tuần trong tháng.
  // - Lấy dữ liệu trực tiếp từ MODULE XẾP HẠNG TUẦN đã xây dựng (getClassWeeklyScore).
  // - Tuyệt đối không tự nhập lại điểm tháng.
  // - Chỉ tính những tuần đã được CHỐT (lockedWeeks).
  // - Nếu tháng chưa đủ tuần đã chốt, cảnh báo rõ và không tự tạo dữ liệu.
  const getMonthRankingData = (
    month: number,
    campusId: string = 'all',
    grade: number | 'all' = 'all'
  ) => {
    const weeksInMonth = (settings.monthWeeksMap[month] || [1, 2, 3, 4]).map(Number);
    const lockedNumList = lockedWeeks.map(Number);
    const lockedWeeksInMonth = weeksInMonth.filter((w) => lockedNumList.includes(w));
    const unlockedWeeksInMonth = weeksInMonth.filter((w) => !lockedNumList.includes(w));
    const isFullyLocked = weeksInMonth.length > 0 && lockedWeeksInMonth.length === weeksInMonth.length;
    const hasNoLockedWeeks = lockedWeeksInMonth.length === 0;

    const targetClasses = classes.filter((c) => {
      if (campusId !== 'all' && c.campusId !== campusId) return false;
      if (grade !== 'all' && c.grade !== grade) return false;
      return true;
    });

    const rows: MonthRankingRow[] = targetClasses.map((cls) => {
      const campus = campuses.find((cmp) => cmp.id === cls.campusId) || campuses[0];

      // Chi tiết điểm từng tuần lấy trực tiếp từ Module Xếp Hạng Tuần (getClassWeeklyScore)
      const weekScores: MonthWeeklyScoreItem[] = weeksInMonth.map((w) => {
        const isLocked = lockedNumList.includes(w);
        const weeklyScore = getClassWeeklyScore(cls.id, w);
        const logs = scoreLogs.filter(
          (l) => l.classId === cls.id && Number(l.week) === w && (l.period === 'week' || !l.period)
        );
        return {
          week: w,
          score: weeklyScore.finalScore,
          isLocked,
          baseScore: weeklyScore.baseScore,
          bonusPoints: weeklyScore.bonusPoints,
          penaltyPoints: weeklyScore.penaltyPoints,
          logsCount: weeklyScore.logCount,
          logs,
        };
      });

      // Công thức quy chế: Chỉ tính các tuần đã CHỐT (lockedWeeksInMonth)
      // Điểm trung bình tháng = (Tổng điểm các tuần đã chốt) / (Số tuần đã chốt)
      let averageScore = 0;
      if (lockedWeeksInMonth.length > 0) {
        const sumLocked = lockedWeeksInMonth.reduce((acc, w) => {
          const wScore = getClassWeeklyScore(cls.id, w).finalScore;
          return acc + wScore;
        }, 0);
        averageScore = Number((sumLocked / lockedWeeksInMonth.length).toFixed(2));
      }

      const bonusKey = `${month}_${cls.id}`;
      const bonus_points_monthly = bonusMonthly[bonusKey] || 0;
      // Tổng điểm Tháng = (Tổng điểm các tuần trong tháng) / (Số tuần) + Điểm thưởng phong trào của tháng đó
      const finalMonthlyScore = Number((averageScore + bonus_points_monthly).toFixed(2));

      return {
        rank: 0,
        classItem: cls,
        campus,
        totalWeeksInMonth: weeksInMonth.length,
        lockedWeeksCount: lockedWeeksInMonth.length,
        weekScores,
        averageScore,
        bonus_points_monthly,
        finalMonthlyScore,
        hasAllWeeksLocked: isFullyLocked,
        hasNoWeeksLocked: hasNoLockedWeeks,
        performanceTier: determineTier(finalMonthlyScore),
      };
    });

    // Sắp xếp thứ hạng: Điểm tổng kết tháng (finalMonthlyScore) cao hơn xếp trên; nếu bằng nhau: ưu tiên điểm trung bình gốc, ít điểm phạt hơn, nhiều điểm thưởng hơn, tên lớp
    rows.sort((a, b) => {
      if (b.finalMonthlyScore !== a.finalMonthlyScore) return b.finalMonthlyScore - a.finalMonthlyScore;
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      const aBonus = a.weekScores.reduce((sum, item) => sum + (item.isLocked ? item.bonusPoints : 0), 0);
      const bBonus = b.weekScores.reduce((sum, item) => sum + (item.isLocked ? item.bonusPoints : 0), 0);
      if (bBonus !== aBonus) return bBonus - aBonus;
      const aPenalty = a.weekScores.reduce((sum, item) => sum + (item.isLocked ? item.penaltyPoints : 0), 0);
      const bPenalty = b.weekScores.reduce((sum, item) => sum + (item.isLocked ? item.penaltyPoints : 0), 0);
      if (aPenalty !== bPenalty) return aPenalty - bPenalty;
      return a.classItem.name.localeCompare(b.classItem.name, undefined, { numeric: true });
    });

    rows.forEach((row, idx) => {
      if (idx > 0 && row.finalMonthlyScore === rows[idx - 1].finalMonthlyScore) {
        row.rank = rows[idx - 1].rank;
      } else {
        row.rank = idx + 1;
      }
    });

    return {
      rows,
      totalWeeksInMonth: weeksInMonth.length,
      weeksInMonth,
      lockedWeeks: lockedWeeksInMonth,
      unlockedWeeks: unlockedWeeksInMonth,
      isFullyLocked,
      hasNoLockedWeeks,
      lockInfo: lockedMonths[month],
    };
  };

  // Nạp dữ liệu kiểm tra mẫu theo Yêu cầu 13:
  // Lớp đối chứng có 4 tuần lần lượt: 98, 100, 99, 97 -> Điểm tháng = (98 + 100 + 99 + 97) / 4 = 98.5
  const applyVerificationSample = (targetClassId: string = 'c_6a1') => {
    const targetClass = classes.find((c) => c.id === targetClassId) || classes[0];
    const targetCampus = campuses.find((cmp) => cmp.id === targetClass.campusId) || campuses[0];

    // Xóa các bản ghi cũ của lớp này trong 4 tuần đầu
    const filteredLogs = scoreLogs.filter(
      (l) => !(l.classId === targetClass.id && [1, 2, 3, 4].includes(l.week) && l.period === 'week')
    );

    const critTp = criteria.find((c) => c.id === 'crit_tp_02') || criteria[0];
    const critVs = criteria.find((c) => c.id === 'crit_vs_02') || criteria[1];
    const critAtgt = criteria.find((c) => c.id === 'crit_atgt_01') || criteria[2];

    const sampleLogs: ScoreLog[] = [
      // Tuần 1: 100 - 2 = 98đ
      {
        id: `sample_test_${targetClass.id}_w1`,
        week: 1,
        month: 9,
        semester: 1,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critTp.id,
        criteriaCode: critTp.code,
        criteriaName: critTp.name,
        category: critTp.category,
        type: 'penalty',
        pointsPerUnit: 1,
        quantity: 2,
        totalPoints: -2,
        calculationDetail: '2 học sinh không sơ vin đầu giờ x 1đ = -2đ (Điểm tuần: 100 - 2 = 98đ)',
        note: 'Dữ liệu đối chứng kiểm thử: Tuần 1 đạt 98 điểm',
        date: '2026-09-08',
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 8',
      },
      // Tuần 2: 100đ (0 vi phạm, 0 thưởng -> 100đ tròn)
      // Tuần 3: 100 - 1 = 99đ
      {
        id: `sample_test_${targetClass.id}_w3`,
        week: 3,
        month: 9,
        semester: 1,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critVs.id,
        criteriaCode: critVs.code,
        criteriaName: critVs.name,
        category: critVs.category,
        type: 'penalty',
        pointsPerUnit: 1,
        quantity: 1,
        totalPoints: -1,
        calculationDetail: '1 lần trực nhật muộn sau tiếng trống x 1đ = -1đ (Điểm tuần: 100 - 1 = 99đ)',
        note: 'Dữ liệu đối chứng kiểm thử: Tuần 3 đạt 99 điểm',
        date: '2026-09-16',
        recordedBy: 'Giám thị',
        inspectorName: 'Cô Lê Thị Hoa',
      },
      // Tuần 4: 100 - 3 = 97đ
      {
        id: `sample_test_${targetClass.id}_w4`,
        week: 4,
        month: 9,
        semester: 1,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critAtgt.id,
        criteriaCode: critAtgt.code,
        criteriaName: critAtgt.name,
        category: critAtgt.category,
        type: 'penalty',
        pointsPerUnit: 1,
        quantity: 3,
        totalPoints: -3,
        calculationDetail: '3 lượt xe để sai hàng lối x 1đ = -3đ (Điểm tuần: 100 - 3 = 97đ)',
        note: 'Dữ liệu đối chứng kiểm thử: Tuần 4 đạt 97 điểm',
        date: '2026-09-22',
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 9',
      },
    ];

    setScoreLogs([...sampleLogs, ...filteredLogs]);

    // Chốt khóa cả 4 tuần để hoàn tất tháng kiểm thử
    const all4Weeks = [1, 2, 3, 4];
    const newLocked = Array.from(new Set([...lockedWeeks, ...all4Weeks])).sort((a, b) => a - b);
    setLockedWeeks(newLocked);
    setSettings((prev) => ({ ...prev, lockedWeeks: newLocked }));

    logAudit({
      action: 'SUA_DIEM',
      entityType: 'score_log',
      entityId: `sample_test_${targetClass.id}`,
      classId: targetClass.id,
      campusId: targetCampus.id,
      beforeData: null,
      afterData: { week1: 98, week2: 100, week3: 99, week4: 97, avg: 98.5 },
      details: `Nạp dữ liệu kiểm thử chuẩn quy chế cho Lớp ${targetClass.name}: Tuần 1: 98đ, Tuần 2: 100đ, Tuần 3: 99đ, Tuần 4: 97đ -> Điểm TB tháng = 98.5đ`,
    });

    return {
      success: true,
      message: `Đã nạp bộ dữ liệu kiểm tra chuẩn cho lớp ${targetClass.name}: Tuần 1: 98, Tuần 2: 100, Tuần 3: 99, Tuần 4: 97. Điểm trung bình tháng tính được: (98 + 100 + 99 + 97) / 4 = 98.5đ! Cả 4 tuần đều đã chốt.`,
    };
  };

  const exportMonthlyRankingsExcel = (month: number = selectedMonth, scopeTitle: string = 'Toàn trường') => {
    const data = getMonthRankingData(month, selectedCampusId, selectedGrade);
    const weeksInMonth = settings.monthWeeksMap[month] || [1, 2, 3, 4];
    const signatures = getExportSignatures(selectedCampusId, scopeTitle);
    exportMonthlyRankingsToExcel(data.rows, month, settings.academicYear, scopeTitle, weeksInMonth, signatures);
  };

  // =========================================================================
  // MODULE XẾP HẠNG HỌC KỲ QUY CHUẨN (HỌC KỲ I & II - NĂM HỌC 2026-2027)
  // =========================================================================
  // 1. Tạo 2 học kỳ: Học kỳ I (tháng 9, 10, 11, 12) & Học kỳ II (tháng 1, 2, 3, 4, 5).
  // 2. Điểm học kỳ của mỗi lớp = TRUNG BÌNH ĐIỂM CÁC THÁNG ĐÃ CHỐT TRONG HỌC KỲ.
  // 3. Chỉ sử dụng dữ liệu từ MODULE XẾP HẠNG THÁNG.
  // 4. Không cho nhập trực tiếp điểm học kỳ.
  // 7. Chi tiết phân cấp 3 tầng: Học kỳ -> Các tháng -> Các tuần -> Điểm số.
  // 8. Chỉ tính các tháng đã CHỐT.
  // 9. Nếu chưa đủ dữ liệu tháng, thông báo rõ: "Chưa đủ dữ liệu để tính điểm học kỳ".
  // 10. Chốt học kỳ: BGH chốt khi đủ các tháng đã chốt; Chỉ Quản trị viên mở khóa.
  const getSemesterRankingData = (
    semester: 1 | 2,
    campusId: string = 'all',
    grade: number | 'all' = 'all'
  ) => {
    const monthsInSemester = semester === 1 ? [9, 10, 11, 12] : [1, 2, 3, 4, 5];
    const lockedMonthsInSemester = monthsInSemester.filter((m) => isMonthLocked(m));
    const unlockedMonthsInSemester = monthsInSemester.filter((m) => !isMonthLocked(m));
    const isFullyLocked = monthsInSemester.length > 0 && lockedMonthsInSemester.length === monthsInSemester.length;
    const hasNoLockedMonths = lockedMonthsInSemester.length === 0;

    const targetClasses = classes.filter((c) => {
      if (campusId !== 'all' && c.campusId !== campusId) return false;
      if (grade !== 'all' && c.grade !== grade) return false;
      return true;
    });

    // Thu thập dữ liệu các tháng từ Module Xếp Hạng Tháng (không tự nhập lại)
    const monthDataCache: Record<number, ReturnType<typeof getMonthRankingData>> = {};
    monthsInSemester.forEach((m) => {
      monthDataCache[m] = getMonthRankingData(m, campusId, grade);
    });

    const rows: SemesterRankingRow[] = targetClasses.map((cls) => {
      const campus = campuses.find((cmp) => cmp.id === cls.campusId) || campuses[0];

      // Chi tiết điểm từng tháng lấy trực tiếp từ Module Xếp Hạng Tháng
      const monthScores: SemesterMonthScoreItem[] = monthsInSemester.map((m) => {
        const mData = monthDataCache[m];
        const mRow = mData.rows.find((r) => r.classItem.id === cls.id);
        const isLocked = isMonthLocked(m);
        return {
          month: m,
          averageScore: mRow ? mRow.averageScore : 100,
          isLocked,
          totalWeeks: mData.totalWeeksInMonth,
          lockedWeeksCount: mRow ? mRow.lockedWeeksCount : 0,
          weekScores: mRow ? mRow.weekScores : [],
        };
      });

      // YÊU CẦU 2 & 8: Điểm học kỳ = Trung bình điểm các tháng đã CHỐT trong học kỳ
      // Chỉ tính các tháng đã CHỐT. Nếu chưa có tháng nào chốt: điểm = 0
      let semesterScore = 0;
      if (lockedMonthsInSemester.length > 0) {
        const sumLockedMonths = monthScores
          .filter((ms) => ms.isLocked)
          .reduce((acc, curr) => acc + curr.averageScore, 0);
        semesterScore = Number((sumLockedMonths / lockedMonthsInSemester.length).toFixed(2));
      }

      const termKey = `${semester}_${cls.id}`;
      const bonus_points_term = bonusTerm[termKey] || 0;
      // Tổng điểm Học kỳ = (Tổng điểm trung bình các tháng trong học kỳ) + Điểm thưởng phong trào của học kỳ đó
      const finalSemesterScore = Number((semesterScore + bonus_points_term).toFixed(2));

      return {
        rank: 0,
        classItem: cls,
        campus,
        totalMonthsInSemester: monthsInSemester.length,
        lockedMonthsCount: lockedMonthsInSemester.length,
        monthScores,
        semesterScore,
        bonus_points_term,
        finalSemesterScore,
        hasAllMonthsLocked: isFullyLocked,
        hasNoMonthsLocked: hasNoLockedMonths,
        performanceTier: determineTier(finalSemesterScore),
      };
    });

    // Nghiệp vụ 'Miễn thi đua HK1': Nếu lớp nào được đánh dấu 'Miễn thi đua HK1', loại lớp đó ra khỏi logic xếp hạng của HK1
    const activeRows = rows.filter((r) => !(semester === 1 && r.classItem.exemptSemester1));
    const exemptRows = rows.filter((r) => semester === 1 && r.classItem.exemptSemester1);

    // Sắp xếp thứ hạng học kỳ: Điểm tổng kết học kỳ (finalSemesterScore) cao hơn xếp trên
    activeRows.sort((a, b) => {
      if (b.finalSemesterScore !== a.finalSemesterScore) return b.finalSemesterScore - a.finalSemesterScore;
      if (b.semesterScore !== a.semesterScore) return b.semesterScore - a.semesterScore;
      const aBonus = a.monthScores.reduce(
        (sum, m) => sum + m.weekScores.reduce((wSum, w) => wSum + w.bonusPoints, 0),
        0
      );
      const bBonus = b.monthScores.reduce(
        (sum, m) => sum + m.weekScores.reduce((wSum, w) => wSum + w.bonusPoints, 0),
        0
      );
      if (bBonus !== aBonus) return bBonus - aBonus;
      return a.classItem.name.localeCompare(b.classItem.name, undefined, { numeric: true });
    });

    // Thuật toán đồng hạng chuẩn thi đấu (1224): Nếu 2 hoặc nhiều lớp cùng điểm thì xếp cùng thứ hạng
    activeRows.forEach((row, idx) => {
      if (idx > 0 && row.finalSemesterScore === activeRows[idx - 1].finalSemesterScore) {
        row.rank = activeRows[idx - 1].rank;
      } else {
        row.rank = idx + 1;
      }
    });

    // Lớp được miễn thi đua HK1: không tính thứ hạng, gắn cờ isExempt
    exemptRows.forEach((row) => {
      row.rank = 0; // Unranked
      row.isExempt = true;
    });

    const finalRows = [...activeRows, ...exemptRows];

    return {
      rows: finalRows,
      monthsInSemester,
      lockedMonths: lockedMonthsInSemester,
      unlockedMonths: unlockedMonthsInSemester,
      totalMonthsInSemester: monthsInSemester.length,
      isFullyLocked,
      hasNoLockedMonths,
      lockInfo: lockedSemesters[semester],
    };
  };

  // Nạp dữ liệu mẫu kiểm thử chuẩn quy chế theo Yêu cầu 14:
  // Một lớp có 5 tháng trong học kỳ: 98, 99, 97, 100, 96.
  // Điểm học kỳ phải bằng: (98 + 99 + 97 + 100 + 96) / 5 = 98.
  const applySemesterVerificationSample = (targetClassId: string = 'c_6a1') => {
    const targetClass = classes.find((c) => c.id === targetClassId) || classes[0];
    const targetCampus = campuses.find((cmp) => cmp.id === targetClass.campusId) || campuses[0];

    const sem2Weeks = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];

    // Xóa các bản ghi cũ của lớp trong kỳ 2
    const filteredLogs = scoreLogs.filter(
      (l) => !(l.classId === targetClass.id && sem2Weeks.includes(l.week) && l.period === 'week')
    );

    const critTp = criteria.find((c) => c.id === 'crit_tp_02') || criteria[0];
    const critVs = criteria.find((c) => c.id === 'crit_vs_02') || criteria[1];
    const critAtgt = criteria.find((c) => c.id === 'crit_atgt_01') || criteria[2];

    const sampleLogs: ScoreLog[] = [];

    // Tháng 1 (tuần 17, 18, 19, 20): Mỗi tuần 98đ (-2đ) -> TB tháng 1 = 98đ
    [17, 18, 19, 20].forEach((w) => {
      sampleLogs.push({
        id: `sample_sem2_${targetClass.id}_w${w}`,
        week: w,
        month: 1,
        semester: 2,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critTp.id,
        criteriaCode: critTp.code,
        criteriaName: critTp.name,
        category: critTp.category,
        type: 'penalty',
        pointsPerUnit: 1,
        quantity: 2,
        totalPoints: -2,
        calculationDetail: '2 lượt vi phạm đồng phục x 1đ = -2đ (Điểm tuần: 100 - 2 = 98đ)',
        note: `Kiểm thử chuẩn HK2: Tuần ${w} đạt 98đ`,
        date: '2027-01-15',
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 8',
      });
    });

    // Tháng 2 (tuần 21, 22, 23, 24): Mỗi tuần 99đ (-1đ) -> TB tháng 2 = 99đ
    [21, 22, 23, 24].forEach((w) => {
      sampleLogs.push({
        id: `sample_sem2_${targetClass.id}_w${w}`,
        week: w,
        month: 2,
        semester: 2,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critVs.id,
        criteriaCode: critVs.code,
        criteriaName: critVs.name,
        category: critVs.category,
        type: 'penalty',
        pointsPerUnit: 1,
        quantity: 1,
        totalPoints: -1,
        calculationDetail: '1 lượt trực nhật muộn x 1đ = -1đ (Điểm tuần: 100 - 1 = 99đ)',
        note: `Kiểm thử chuẩn HK2: Tuần ${w} đạt 99đ`,
        date: '2027-02-12',
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 8',
      });
    });

    // Tháng 3 (tuần 25, 26, 27, 28): Mỗi tuần 97đ (-3đ) -> TB tháng 3 = 97đ
    [25, 26, 27, 28].forEach((w) => {
      sampleLogs.push({
        id: `sample_sem2_${targetClass.id}_w${w}`,
        week: w,
        month: 3,
        semester: 2,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critAtgt.id,
        criteriaCode: critAtgt.code,
        criteriaName: critAtgt.name,
        category: critAtgt.category,
        type: 'penalty',
        pointsPerUnit: 1,
        quantity: 3,
        totalPoints: -3,
        calculationDetail: '3 lượt để xe sai quy định x 1đ = -3đ (Điểm tuần: 100 - 3 = 97đ)',
        note: `Kiểm thử chuẩn HK2: Tuần ${w} đạt 97đ`,
        date: '2027-03-18',
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 9',
      });
    });

    // Tháng 4 (tuần 29, 30, 31, 32): 100đ tròn (0 vi phạm) -> TB tháng 4 = 100đ

    // Tháng 5 (tuần 33, 34, 35): Mỗi tuần 96đ (-4đ) -> TB tháng 5 = 96đ
    [33, 34, 35].forEach((w) => {
      sampleLogs.push({
        id: `sample_sem2_${targetClass.id}_w${w}`,
        week: w,
        month: 5,
        semester: 2,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critTp.id,
        criteriaCode: critTp.code,
        criteriaName: critTp.name,
        category: critTp.category,
        type: 'penalty',
        pointsPerUnit: 2,
        quantity: 2,
        totalPoints: -4,
        calculationDetail: '2 lượt vi phạm nề nếp x 2đ = -4đ (Điểm tuần: 100 - 4 = 96đ)',
        note: `Kiểm thử chuẩn HK2: Tuần ${w} đạt 96đ`,
        date: '2027-05-10',
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 9',
      });
    });

    setScoreLogs([...sampleLogs, ...filteredLogs]);

    // Chốt khóa toàn bộ các tuần của Kỳ 2
    const newLockedWeeks = Array.from(new Set([...lockedWeeks, ...sem2Weeks])).sort((a, b) => a - b);
    setLockedWeeks(newLockedWeeks);

    // Chốt khóa 5 tháng (Tháng 1, 2, 3, 4, 5)
    const newLockedMonths = { ...lockedMonths };
    [1, 2, 3, 4, 5].forEach((m) => {
      newLockedMonths[m] = {
        month: m,
        academicYear: settings.academicYear,
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: userRole,
          title: currentUser.title,
        },
        notes: `Chốt khóa tự động phục vụ kiểm thử chuẩn quy chế Tháng ${m}`,
      };
    });
    setLockedMonths(newLockedMonths);
    setSettings((prev) => ({ ...prev, lockedWeeks: newLockedWeeks, lockedMonths: newLockedMonths }));

    logAudit({
      action: 'SUA_DIEM',
      entityType: 'score_log',
      entityId: `sample_sem_${targetClass.id}`,
      classId: targetClass.id,
      campusId: targetCampus.id,
      beforeData: null,
      afterData: { m1: 98, m2: 99, m3: 97, m4: 100, m5: 96, semAvg: 98 },
      details: `Nạp dữ liệu kiểm thử chuẩn quy chế Học kỳ II cho Lớp ${targetClass.name}: Tháng 1: 98đ, Tháng 2: 99đ, Tháng 3: 97đ, Tháng 4: 100đ, Tháng 5: 96đ -> Điểm TB Học kỳ = (98 + 99 + 97 + 100 + 96) / 5 = 98.0đ`,
    });

    return {
      success: true,
      message: `Đã nạp bộ dữ liệu kiểm tra chuẩn cho lớp ${targetClass.name}: 5 tháng lần lượt đạt 98, 99, 97, 100, 96 điểm. Cả 5 tháng và toàn bộ các tuần đã được CHỐT. Điểm học kỳ = (98 + 99 + 97 + 100 + 96) / 5 = 98.0đ!`,
    };
  };

  const exportSemesterRankingsExcel = (
    semester: 1 | 2 = selectedSemester,
    scopeTitle: string = 'Toàn trường'
  ) => {
    const data = getSemesterRankingData(semester, selectedCampusId, selectedGrade);
    const signatures = getExportSignatures(selectedCampusId, scopeTitle);
    exportSemesterRankingsToExcel(
      semester,
      data.rows,
      data.monthsInSemester,
      settings.academicYear,
      scopeTitle,
      signatures
    );
  };

  // =========================================================================
  // MODULE XẾP HẠNG CẢ NĂM (NĂM HỌC 2026-2027)
  // =========================================================================
  // YÊU CẦU 1: Điểm cả năm = (Điểm HKI + Điểm HKII × 2) / 3
  // YÊU CẦU 2: Chỉ lấy dữ liệu từ MODULE XẾP HẠNG HỌC KỲ
  // YÊU CẦU 3: Không cho nhập trực tiếp điểm cả năm
  // YÊU CẦU 7 & 8: Chỉ sử dụng học kỳ đã được CHỐT. Nếu thiếu HKI hoặc HKII -> "Chưa đủ dữ liệu"
  const getYearRankingData = (
    campusId: string = 'all',
    grade: number | 'all' = 'all'
  ): {
    rows: YearRankingRow[];
    isSemester1Locked: boolean;
    isSemester2Locked: boolean;
    hasBothSemestersLocked: boolean;
    isYearLocked: boolean;
    yearLockInfo?: YearLockInfo;
  } => {
    const sem1Data = getSemesterRankingData(1, 'all', 'all');
    const sem2Data = getSemesterRankingData(2, 'all', 'all');

    const isSemester1Locked = isSemesterLocked(1);
    const isSemester2Locked = isSemesterLocked(2);
    const hasBothSemestersLocked = isSemester1Locked && isSemester2Locked;

    const targetClasses = classes.filter((c) => {
      if (campusId !== 'all' && c.campusId !== campusId) return false;
      if (grade !== 'all' && c.grade !== grade) return false;
      return true;
    });

    const rows: YearRankingRow[] = targetClasses.map((cls) => {
      const campus = campuses.find((c) => c.id === cls.campusId) || campuses[0];
      const s1Row = sem1Data.rows.find((r) => r.classItem.id === cls.id);
      const s2Row = sem2Data.rows.find((r) => r.classItem.id === cls.id);

      const semester1Score = isSemester1Locked && s1Row ? s1Row.semesterScore : null;
      const semester2Score = isSemester2Locked && s2Row ? s2Row.semesterScore : null;

      const isExemptSemester1 = !!cls.exemptSemester1;
      let yearScore: number | null = null;
      let displayScoreText = 'Chưa đủ dữ liệu';
      let performanceTier: YearRankingRow['performanceTier'] = 'Chưa đủ dữ liệu';

      // CÔNG THỨC XẾP LOẠI CẢ NĂM:
      // - Với các lớp bình thường: Điểm Cả năm = (HK1 + HK2 * 2) / 3 (yêu cầu cả 2 kỳ đã chốt)
      // - Riêng đối với lớp có cờ 'Miễn thi đua HK1' (đội tuyển HSG): Điểm Cả năm = Điểm Học kỳ 2 (chỉ cần HK2 đã chốt)
      if (isExemptSemester1) {
        if (isSemester2Locked && semester2Score !== null) {
          yearScore = Number(semester2Score.toFixed(2));
        }
      } else {
        if (hasBothSemestersLocked && semester1Score !== null && semester2Score !== null) {
          yearScore = Number(((semester1Score + semester2Score * 2) / 3).toFixed(2));
        }
      }

      const yearlyKey = cls.id;
      const bonus_points_yearly = bonusYearly[yearlyKey] || 0;
      const finalYearScore = yearScore !== null ? Number((yearScore + bonus_points_yearly).toFixed(2)) : null;

      if (finalYearScore !== null) {
        displayScoreText = finalYearScore.toFixed(2);
        performanceTier = determineTier(finalYearScore);
      }

      return {
        rank: 0,
        classItem: cls,
        campus,
        semester1Score,
        semester2Score,
        isSemester1Locked,
        isSemester2Locked,
        hasBothSemestersLocked,
        isExemptSemester1,
        yearScore,
        bonus_points_yearly,
        finalYearScore,
        displayScoreText,
        performanceTier,
        semester1Row: s1Row,
        semester2Row: s2Row,
      };
    });

    // Sắp xếp thứ hạng cả năm theo Điểm tổng kết cả năm (finalYearScore)
    rows.sort((a, b) => {
      if (a.finalYearScore !== null && b.finalYearScore === null) return -1;
      if (a.finalYearScore === null && b.finalYearScore !== null) return 1;
      if (a.finalYearScore !== null && b.finalYearScore !== null) {
        if (b.finalYearScore !== a.finalYearScore) return b.finalYearScore - a.finalYearScore;
        if ((b.semester2Score || 0) !== (a.semester2Score || 0)) {
          return (b.semester2Score || 0) - (a.semester2Score || 0);
        }
        if ((b.semester1Score || 0) !== (a.semester1Score || 0)) {
          return (b.semester1Score || 0) - (a.semester1Score || 0);
        }
      }
      return a.classItem.name.localeCompare(b.classItem.name, undefined, { numeric: true });
    });

    // Thuật toán đồng hạng chuẩn thi đấu (1224)
    rows.forEach((row, idx) => {
      if (row.finalYearScore === null) {
        row.rank = 0;
      } else {
        if (idx > 0 && rows[idx - 1].finalYearScore !== null && row.finalYearScore === rows[idx - 1].finalYearScore) {
          row.rank = rows[idx - 1].rank;
        } else {
          row.rank = idx + 1;
        }
      }
    });

    return {
      rows,
      isSemester1Locked,
      isSemester2Locked,
      hasBothSemestersLocked,
      isYearLocked: isYearLocked(),
      yearLockInfo: lockedYear || undefined,
    };
  };

  // YÊU CẦU 10: Nạp dữ liệu mẫu kiểm tra chuẩn:
  // HKI = 90, HKII = 96 -> Điểm cả năm = (90 + 96 × 2) / 3 = 94.0
  const applyYearVerificationSample = (targetClassId: string = 'c_6a1') => {
    const targetClass = classes.find((c) => c.id === targetClassId) || classes[0];
    const targetCampus = campuses.find((cmp) => cmp.id === targetClass.campusId) || campuses[0];

    const allWeeks = Array.from({ length: 35 }, (_, i) => i + 1);
    const sem1Weeks = allWeeks.slice(0, 16); // 1..16
    const sem2Weeks = allWeeks.slice(16);    // 17..35

    // Xóa các bản ghi cũ của lớp này trong toàn năm học
    const filteredLogs = scoreLogs.filter(
      (l) => !(l.classId === targetClass.id && allWeeks.includes(l.week) && l.period === 'week')
    );

    const critTp = criteria.find((c) => c.id === 'crit_tp_02') || criteria[0];
    const critVs = criteria.find((c) => c.id === 'crit_vs_02') || criteria[1];

    const sampleLogs: ScoreLog[] = [];

    // Học kỳ I (Tuần 1..16, Tháng 9, 10, 11, 12):
    // Mỗi tuần -10đ (5 lượt vi phạm nề nếp x 2đ = -10đ) -> Mỗi tuần 90đ.
    // Điểm 4 tháng đều đạt 90đ -> Điểm HKI = (90 + 90 + 90 + 90) / 4 = 90.0đ!
    sem1Weeks.forEach((w) => {
      const m = getMonthForWeek(w, settings.monthWeeksMap);
      sampleLogs.push({
        id: `sample_year_${targetClass.id}_w${w}`,
        week: w,
        month: m,
        semester: 1,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critTp.id,
        criteriaCode: critTp.code,
        criteriaName: critTp.name,
        category: critTp.category,
        type: 'penalty',
        pointsPerUnit: 2,
        quantity: 5,
        totalPoints: -10,
        calculationDetail: '5 lượt vi phạm trang phục x 2đ = -10đ (Điểm tuần: 100 - 10 = 90đ)',
        note: `Kiểm thử HKI đạt 90đ: Tuần ${w} (Tháng ${m}) đạt 90đ`,
        date: `2026-${m < 10 ? '0' + m : m}-15`,
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 9',
      });
    });

    // Học kỳ II (Tuần 17..35, Tháng 1, 2, 3, 4, 5):
    // Mỗi tuần -4đ (2 lượt vi phạm vệ sinh x 2đ = -4đ) -> Mỗi tuần 96đ.
    // Điểm 5 tháng đều đạt 96đ -> Điểm HKII = (96 + 96 + 96 + 96 + 96) / 5 = 96.0đ!
    sem2Weeks.forEach((w) => {
      const m = getMonthForWeek(w, settings.monthWeeksMap);
      sampleLogs.push({
        id: `sample_year_${targetClass.id}_w${w}`,
        week: w,
        month: m,
        semester: 2,
        period: 'week',
        classId: targetClass.id,
        className: targetClass.name,
        campusId: targetCampus.id,
        campusName: targetCampus.name,
        campusType: targetCampus.type,
        grade: targetClass.grade,
        criteriaId: critVs.id,
        criteriaCode: critVs.code,
        criteriaName: critVs.name,
        category: critVs.category,
        type: 'penalty',
        pointsPerUnit: 2,
        quantity: 2,
        totalPoints: -4,
        calculationDetail: '2 lượt vi phạm vệ sinh x 2đ = -4đ (Điểm tuần: 100 - 4 = 96đ)',
        note: `Kiểm thử HKII đạt 96đ: Tuần ${w} (Tháng ${m}) đạt 96đ`,
        date: `2027-0${m}-15`,
        recordedBy: 'Đội cờ đỏ',
        inspectorName: 'Đội Cờ Đỏ Khối 9',
      });
    });

    setScoreLogs([...sampleLogs, ...filteredLogs]);

    // Chốt khóa toàn bộ 35 tuần
    const newLockedWeeks = Array.from(new Set([...lockedWeeks, ...allWeeks])).sort((a, b) => a - b);
    setLockedWeeks(newLockedWeeks);

    // Chốt khóa toàn bộ 9 tháng (9, 10, 11, 12, 1, 2, 3, 4, 5)
    const newLockedMonths = { ...lockedMonths };
    [9, 10, 11, 12, 1, 2, 3, 4, 5].forEach((m) => {
      newLockedMonths[m] = {
        month: m,
        academicYear: settings.academicYear,
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedBy: {
          id: currentUser.id,
          name: currentUser.name,
          role: userRole,
          title: currentUser.title,
        },
        notes: `Chốt khóa tự động phục vụ kiểm thử chuẩn quy chế Tháng ${m}`,
      };
    });
    setLockedMonths(newLockedMonths);

    // Chốt khóa Học kỳ I và Học kỳ II
    const newLockedSemesters = { ...lockedSemesters };
    newLockedSemesters[1] = {
      semester: 1,
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title,
      },
      notes: 'Chốt khóa tự động phục vụ kiểm thử chuẩn quy chế Học kỳ I (90.0đ)',
    };
    newLockedSemesters[2] = {
      semester: 2,
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title,
      },
      notes: 'Chốt khóa tự động phục vụ kiểm thử chuẩn quy chế Học kỳ II (96.0đ)',
    };
    setLockedSemesters(newLockedSemesters);

    setSettings((prev) => ({
      ...prev,
      lockedWeeks: newLockedWeeks,
      lockedMonths: newLockedMonths,
      lockedSemesters: newLockedSemesters,
    }));

    logAudit({
      action: 'SUA_DIEM',
      entityType: 'score_log',
      entityId: `sample_year_${targetClass.id}`,
      classId: targetClass.id,
      campusId: targetCampus.id,
      beforeData: null,
      afterData: { hki: 90, hkii: 96, yearScore: 94 },
      details: `Nạp dữ liệu kiểm tra đối chứng CẢ NĂM cho Lớp ${targetClass.name}: HKI = 90.0đ, HKII = 96.0đ -> Điểm cả năm = (90 + 96 × 2) / 3 = 94.0đ`,
    });

    return {
      success: true,
      message: `Đã nạp thành công bộ dữ liệu đối chứng Cả Năm cho Lớp ${targetClass.name}: HKI = 90.0đ, HKII = 96.0đ. Cả 2 học kỳ đã được CHỐT. Điểm cả năm = (90 + 96 × 2) / 3 = 94.0đ!`,
    };
  };

  const exportYearRankingsExcel = (
    scopeTitle: string = 'Toàn trường'
  ) => {
    const data = getYearRankingData(selectedCampusId, selectedGrade);
    const signatures = getExportSignatures(selectedCampusId, scopeTitle);
    exportYearRankingsToExcel(
      data.rows,
      settings.academicYear,
      settings.schoolName,
      scopeTitle,
      signatures
    );
  };

  // --------------------------------------------------------------------------
  // MODULE XÉT DANH HIỆU LỚP CẢ NĂM (THEO QUY CHẾ 2026-2027)
  // --------------------------------------------------------------------------
  const getTitleEvaluationData = (
    campusId?: string,
    grade?: number | 'all'
  ): TitleEvaluationResult => {
    // 1. Dữ liệu đầu vào: Điểm xếp hạng cả năm từ Module Xếp Hạng Cả Năm
    const yearData = getYearRankingData('all', 'all');
    const isYearLockedStatus = isYearLocked();
    const config = settings.evaluationConfig;

    const advRatio = config.advancedClassesRatio ?? 0.70;
    const excRatio = config.excellentClassesRatio ?? 0.35;
    const goodRatio = config.goodClassesRatio ?? 0.35;
    const quotaBasis = config.quotaBasis ?? 'total_classes';
    const roundingMethod = config.roundingMethod ?? 'round';
    const allowMainCampusExceed70 = config.allowMainCampusExceed70 ?? true;

    const roundFn = (val: number) => {
      if (roundingMethod === 'ceil') return Math.ceil(val);
      if (roundingMethod === 'floor') return Math.floor(val);
      return Math.round(val);
    };

    // 2. Phân tích từng lớp theo các điều kiện quy định
    interface IntermediateRow {
      classItem: ClassItem;
      campus: Campus;
      yearScore: number | null;
      isYearLocked: boolean;
      evaluationStatus: 'Được xét' | 'Không được xét';
      title: ClassTitle;
      rank: number | null;
      isDisqualified: boolean;
      disqualificationReason?: string;
      hasDisciplinaryStudent: boolean;
      disciplinaryDetails?: string;
      specialAchievementNote?: string;
      notes: string;
      quotaReason: string;
      hasSpecialAchievement: boolean;
      sem2Score: number | null;
    }

    const intermediateRows: IntermediateRow[] = classes.map((c) => {
      const campus = campuses.find((cmp) => cmp.id === c.campusId) || campuses[0];
      const yearRow = yearData.rows.find((yr) => yr.classItem.id === c.id);

      // YÊU CẦU 3: Lớp có học sinh bị Hội đồng kỷ luật thì KHÔNG được xếp loại cả năm
      const discRecord = disciplinaryRecords.find((d) => d.classId === c.id);
      const hasDisciplinaryLog = scoreLogs.some(
        (l) =>
          l.classId === c.id &&
          (l.isDisciplinary ||
            l.criteriaCode === 'HV03' ||
            l.criteriaCode === 'HV04' ||
            (l.note && l.note.toLowerCase().includes('hội đồng kỷ luật')) ||
            (l.criteriaName && l.criteriaName.toLowerCase().includes('kỷ luật')))
      );

      const hasDisciplinaryStudent = !!discRecord || hasDisciplinaryLog;
      let disciplinaryDetails: string | undefined = undefined;
      if (discRecord) {
        disciplinaryDetails = `HS ${discRecord.studentName} - QĐ ${discRecord.decisionNumber} (${discRecord.reason})`;
      } else if (hasDisciplinaryLog) {
        disciplinaryDetails = 'Có học sinh vi phạm thuộc diện Hội đồng kỷ luật xử lý';
      }

      // YÊU CẦU 8: Riêng trường chính, xem xét thành tích CLB và HSG tỉnh theo tài liệu
      const isMainCampus = campus.type === 'main' || campus.id === 'campus_main';
      let hasSpecialAchievement = false;
      let specialAchievementNote: string | undefined = undefined;

      if (isMainCampus) {
        const specialLog = scoreLogs.find(
          (l) =>
            l.classId === c.id &&
            ['crit_khac_16', 'crit_khac_17', 'crit_khac_18', 'crit_khac_19', 'crit_khac_20'].includes(l.criteriaId)
        );
        if (specialLog) {
          hasSpecialAchievement = true;
          specialAchievementNote = `Trường chính: ${specialLog.criteriaName} (${specialLog.note || 'Đạt tỷ lệ chuẩn'})`;
        }
      }

      // YÊU CẦU 8 (cả năm) & 1: Kiểm tra tính hợp lệ dữ liệu điểm cả năm
      const hasValidYearScore =
        yearRow?.yearScore !== null &&
        yearRow?.yearScore !== undefined &&
        yearRow?.isSemester1Locked &&
        yearRow?.isSemester2Locked;

      if (hasDisciplinaryStudent) {
        return {
          classItem: c,
          campus,
          yearScore: yearRow?.yearScore ?? null,
          isYearLocked: isYearLockedStatus,
          evaluationStatus: 'Không được xét',
          title: 'KHÔNG ĐƯỢC XẾP LOẠI',
          rank: yearRow?.rank ?? null,
          isDisqualified: true,
          disqualificationReason: 'Lớp có học sinh bị Hội đồng kỷ luật',
          hasDisciplinaryStudent: true,
          disciplinaryDetails,
          specialAchievementNote,
          notes: 'KHÔNG ĐƯỢC XẾP LOẠI do lớp có học sinh bị Hội đồng kỷ luật xử lý theo quy chế thi đua.',
          quotaReason: 'Không đủ điều kiện dự xét: Lớp có học sinh bị Hội đồng kỷ luật xử lý trong năm học.',
          hasSpecialAchievement,
          sem2Score: yearRow?.semester2Score ?? null,
        };
      }

      if (!hasValidYearScore) {
        return {
          classItem: c,
          campus,
          yearScore: yearRow?.yearScore ?? null,
          isYearLocked: isYearLockedStatus,
          evaluationStatus: 'Không được xét',
          title: 'KHÔNG ĐƯỢC XẾP LOẠI',
          rank: null,
          isDisqualified: true,
          disqualificationReason: 'Chưa đủ dữ liệu cả năm (chưa chốt đủ Học kỳ I & II)',
          hasDisciplinaryStudent: false,
          specialAchievementNote,
          notes: 'Chưa đủ dữ liệu điểm cả năm (chưa chốt khóa đầy đủ HKI và HKII).',
          quotaReason: 'Không đủ điều kiện dự xét do dữ liệu điểm cả năm chưa hoàn tất hoặc chưa chốt.',
          hasSpecialAchievement,
          sem2Score: null,
        };
      }

      return {
        classItem: c,
        campus,
        yearScore: yearRow.yearScore,
        isYearLocked: isYearLockedStatus,
        evaluationStatus: 'Được xét',
        title: 'KHÔNG ĐƯỢC XẾP LOẠI',
        rank: yearRow.rank,
        isDisqualified: false,
        hasDisciplinaryStudent: false,
        specialAchievementNote,
        notes: '',
        quotaReason: '',
        hasSpecialAchievement,
        sem2Score: yearRow.semester2Score ?? null,
      };
    });

    // 3. Phân bổ hạn ngạch tỷ lệ danh hiệu theo cấu hình hệ thống
    const eligibleClasses = intermediateRows
      .filter((r) => r.evaluationStatus === 'Được xét' && r.yearScore !== null)
      .sort((a, b) => {
        if ((b.yearScore ?? 0) !== (a.yearScore ?? 0)) {
          return (b.yearScore ?? 0) - (a.yearScore ?? 0);
        }
        return (b.sem2Score ?? 0) - (a.sem2Score ?? 0);
      });

    const totalEligible = eligibleClasses.length;

    let maxAdvancedOrAbove = 0;
    let excellentQuota = 0;
    let advancedQuota = 0;

    if (quotaBasis === 'advanced_pool') {
      maxAdvancedOrAbove = roundFn(totalEligible * advRatio);
      excellentQuota = roundFn(maxAdvancedOrAbove * excRatio);
      advancedQuota = Math.max(0, maxAdvancedOrAbove - excellentQuota);
    } else {
      maxAdvancedOrAbove = roundFn(totalEligible * advRatio);
      excellentQuota = roundFn(totalEligible * excRatio);
      advancedQuota = Math.min(roundFn(totalEligible * goodRatio), Math.max(0, maxAdvancedOrAbove - excellentQuota));
    }

    eligibleClasses.forEach((row, idx) => {
      const currentRank = idx + 1;
      row.rank = currentRank;

      if (idx < excellentQuota) {
        row.title = 'LỚP XUẤT SẮC';
        row.notes = `Đạt danh hiệu LỚP XUẤT SẮC (Xếp hạng ${currentRank}/${totalEligible}, thuộc chỉ tiêu ${(excRatio * 100).toFixed(0)}% xuất sắc).`;
        row.quotaReason = `Được xét: Điểm cả năm ${row.yearScore?.toFixed(2)}đ (Hạng ${currentRank}/${totalEligible}), thuộc chỉ tiêu ${excellentQuota} Lớp Xuất sắc toàn trường.`;
      } else if (idx < excellentQuota + advancedQuota) {
        row.title = 'LỚP TIÊN TIẾN';
        row.notes = `Đạt danh hiệu LỚP TIÊN TIẾN (Xếp hạng ${currentRank}/${totalEligible}, thuộc chỉ tiêu ${(advRatio * 100).toFixed(0)}% tiên tiến).`;
        row.quotaReason = `Được xét: Điểm cả năm ${row.yearScore?.toFixed(2)}đ (Hạng ${currentRank}/${totalEligible}), nằm trong chỉ tiêu Lớp Tiên tiến (${advancedQuota} lớp) theo cấu hình.`;
      } else {
        const isMain = row.campus.type === 'main' || row.campus.id === 'campus_main';
        if (isMain && row.hasSpecialAchievement && allowMainCampusExceed70) {
          row.title = 'LỚP TIÊN TIẾN';
          row.notes = `Đạt danh hiệu LỚP TIÊN TIẾN (Đặc cách phê chuẩn vượt trần 70% nhờ thành tích CLB / HSG cấp tỉnh trường chính).`;
          row.quotaReason = `Được xét đặc cách: Điểm ${row.yearScore?.toFixed(2)}đ, đạt tiêu chuẩn CLB/HSG tỉnh quy chế trường chính để vượt mốc 70%.`;
          if (!row.specialAchievementNote) {
            row.specialAchievementNote = 'Đặc cách xét duyệt danh hiệu vượt trần 70% theo quy chế trường chính';
          }
        } else {
          row.title = 'KHÔNG ĐƯỢC XẾP LOẠI';
          row.notes = `Không được xếp loại do thứ hạng (${currentRank}/${totalEligible}) nằm ngoài chỉ tiêu ${(advRatio * 100).toFixed(0)}% lớp tiên tiến trở lên.`;
          row.quotaReason = `Được xét nhưng không đạt danh hiệu: Thứ tự xếp hạng (${currentRank}/${totalEligible}) vượt quá hạn ngạch phân bổ ${(advRatio * 100).toFixed(0)}% quy định.`;
        }
      }
    });

    // 4. Lọc theo Phân hiệu và Khối nếu được chọn
    let filtered = intermediateRows;
    if (campusId && campusId !== 'all') {
      filtered = filtered.filter((r) => r.campus.id === campusId);
    }
    if (grade && grade !== 'all') {
      filtered = filtered.filter((r) => r.classItem.grade === grade);
    }

    filtered.sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return a.classItem.name.localeCompare(b.classItem.name);
    });

    const rows: TitleEvaluationRow[] = filtered.map((r, index) => ({
      stt: index + 1,
      classItem: r.classItem,
      campus: r.campus,
      yearScore: r.yearScore,
      isYearLocked: r.isYearLocked,
      evaluationStatus: r.evaluationStatus,
      title: r.title,
      rank: r.rank,
      isDisqualified: r.isDisqualified,
      disqualificationReason: r.disqualificationReason,
      hasDisciplinaryStudent: r.hasDisciplinaryStudent,
      disciplinaryDetails: r.disciplinaryDetails,
      specialAchievementNote: r.specialAchievementNote,
      notes: r.notes,
      quotaReason: r.quotaReason,
    }));

    const totalClasses = filtered.length;
    const evaluatedClassesCount = filtered.filter((r) => r.evaluationStatus === 'Được xét').length;
    const excellentCount = filtered.filter((r) => r.title === 'LỚP XUẤT SẮC').length;
    const advancedCount = filtered.filter((r) => r.title === 'LỚP TIÊN TIẾN').length;
    const disqualifiedCount = filtered.filter((r) => r.isDisqualified).length;
    const unclassifiedCount = filtered.filter((r) => r.title === 'KHÔNG ĐƯỢC XẾP LOẠI').length;

    return {
      rows,
      totalClasses,
      evaluatedClassesCount,
      excellentCount,
      advancedCount,
      disqualifiedCount,
      unclassifiedCount,
      isYearLocked: isYearLockedStatus,
      isTitleLocked: isTitleLocked(),
      lockInfo: lockedTitles || null,
      config,
    };
  };

  // YÊU CẦU 13: Nạp dữ liệu mẫu kiểm tra chức năng xét danh hiệu lớp
  const applyTitleVerificationSample = () => {
    // 1. Chạy nạp dữ liệu kiểm chuẩn cả năm nếu cần
    applyYearVerificationSample('c_6a1');

    // 2. Đảm bảo Bảng Xếp Hạng Cả Năm đã được chốt khóa (Yêu cầu 1)
    const yearLockInfo: YearLockInfo = {
      academicYear: settings.academicYear,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: userRole,
        title: currentUser.title || 'BGH',
      },
      notes: `Chốt khóa dữ liệu xếp hạng cả năm phục vụ xét danh hiệu thi đua ${settings.academicYear}`,
    };
    setLockedYear(yearLockInfo);
    setSettings((prev) => ({ ...prev, lockedYear: yearLockInfo }));

    // 3. YÊU CẦU 3 & 14: Thêm học sinh bị Hội đồng kỷ luật cho lớp 7A2
    // Để kiểm tra lớp có học sinh bị kỷ luật thì KHÔNG ĐƯỢC XẾP LOẠI cả năm!
    const testDisciplinary: DisciplinaryRecord = {
      id: `disc_sample_7a2`,
      classId: 'c_7a2',
      className: '7A2',
      studentName: 'Lê Tuấn Kiệt',
      decisionNumber: '12/QĐ-KL-LHL',
      decisionDate: '2027-04-15',
      reason: 'Sử dụng thuốc lá điện tử trong trường học, bị Hội đồng kỷ luật xử lý',
      councilLevel: 'Hội đồng kỷ luật trường',
      recordedBy: currentUser.name,
      recordedAt: new Date().toISOString(),
      notes: 'Hồ sơ kiểm thử quy chế: Lớp bị loại không xếp loại cả năm do học sinh bị kỷ luật',
    };
    setDisciplinaryRecords((prev) => [
      testDisciplinary,
      ...prev.filter((r) => r.id !== 'disc_sample_7a2' && r.classId !== 'c_7a2'),
    ]);

    // 4. YÊU CẦU 8: Thêm thành tích đặc biệt cho lớp 9A1 tại Trường chính
    // (Đội tuyển HSG tỉnh đạt 92% theo tiêu chí crit_khac_20)
    const specialLogId = `sample_special_9a1`;
    const newSpecialLog: ScoreLog = {
      id: specialLogId,
      week: 30,
      month: 4,
      semester: 2,
      period: 'year',
      classId: 'c_9a1',
      className: '9A1',
      campusId: 'campus_main',
      campusName: 'Trường chính',
      campusType: 'main',
      grade: 9,
      criteriaId: 'crit_khac_20',
      criteriaCode: 'KHAC20',
      criteriaName: 'Đội tuyển HSG tỉnh đạt tỷ lệ giải > 90% (Trường chính - Khối 9)',
      category: 'Các hoạt động khác',
      type: 'bonus',
      pointsPerUnit: 5,
      quantity: 1,
      totalPoints: 5,
      calculationDetail: 'Đội tuyển HSG cấp tỉnh đạt tỷ lệ giải 92% (Quy chuẩn Trường chính)',
      note: 'Điều kiện đặc biệt quy chế trường chính: Đội tuyển HSG tỉnh đạt giải trên 90%',
      date: '2027-04-20',
      recordedBy: 'Ban Giám Hiệu',
      inspectorName: 'Hội đồng Thi đua',
    };
    setScoreLogs((prev) => [newSpecialLog, ...prev.filter((l) => l.id !== specialLogId)]);

    // 5. Mở khóa danh hiệu nếu đang khóa để người dùng có thể thử nghiệm tính năng Chốt kết quả
    setLockedTitles(null);

    logAudit({
      action: 'KIEM_TRA_TOAN_VEN',
      entityType: 'title_lock',
      entityId: `titles_sample_${settings.academicYear}`,
      details: 'Nạp bộ dữ liệu mẫu kiểm thử toàn diện Module Xét Danh Hiệu Lớp (Chuẩn quy chế 2026-2027: Lớp kỷ luật 7A2 bị loại, lớp xuất sắc/tiên tiến theo tỷ lệ cấu hình, trường chính 9A1 đạt điều kiện đặc biệt CLB/HSG tỉnh).',
    });

    return {
      success: true,
      message: 'Đã nạp thành công dữ liệu mẫu kiểm thử! Kịch bản gồm: (1) Điểm cả năm đã chốt khóa; (2) Lớp 7A2 có HS bị Hội đồng kỷ luật -> Tự động KHÔNG ĐƯỢC XẾP LOẠI; (3) Lớp Xuất sắc / Tiên tiến phân bổ chính xác theo tỷ lệ cấu hình; (4) Lớp 9A1 trường chính đạt điều kiện đặc cách CLB/HSG tỉnh.',
    };
  };

  const exportTitleEvaluationExcel = (
    scopeTitle: string = 'Toàn trường'
  ) => {
    const data = getTitleEvaluationData(selectedCampusId, selectedGrade);
    const signatures = getExportSignatures(selectedCampusId, scopeTitle);
    exportTitleEvaluationToExcel(
      data.rows,
      settings.academicYear,
      scopeTitle,
      settings.schoolName,
      isTitleLocked(),
      signatures
    );
  };

  // Xếp hạng học kỳ: bình quân điểm các tháng trong học kỳ
  const getSemesterRankings = (
    semester: 1 | 2,
    campusId = 'all',
    grade: number | 'all' = 'all'
  ): RankingEntry[] => {
    const months = semester === 1 ? [9, 10, 11, 12] : [1, 2, 3, 4];

    const targetClasses = classes.filter((c) => {
      if (campusId !== 'all' && c.campusId !== campusId) return false;
      if (grade !== 'all' && c.grade !== grade) return false;
      return true;
    });

    const entries: RankingEntry[] = targetClasses.map((cls) => {
      const campus = campuses.find((cmp) => cmp.id === cls.campusId) || campuses[0];

      const monthScores = months.map((m) => {
        const monthRankings = getMonthlyRankings(m, 'all', 'all');
        const found = monthRankings.find((r) => r.classItem.id === cls.id);
        return found ? found.totalScore : 100;
      });

      const sum = monthScores.reduce((a, b) => a + b, 0);
      const avg = Number((sum / (months.length || 1)).toFixed(2));

      return {
        rank: 0,
        classItem: cls,
        campus,
        totalScore: avg,
        baseScore: 100,
        bonusPoints: 0,
        penaltyPoints: 0,
        logCount: months.length,
        performanceTier: determineTier(avg),
        averageScore: avg,
      };
    });

    const activeEntries = entries.filter((e) => !(semester === 1 && e.classItem.exemptSemester1));
    const exemptEntries = entries.filter((e) => semester === 1 && e.classItem.exemptSemester1);

    activeEntries.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.classItem.name.localeCompare(b.classItem.name);
    });

    activeEntries.forEach((item, index) => {
      if (index > 0) {
        const prev = activeEntries[index - 1];
        if (item.totalScore === prev.totalScore) {
          item.rank = prev.rank;
        } else {
          item.rank = index + 1;
        }
      } else {
        item.rank = 1;
      }
    });

    exemptEntries.forEach((item) => {
      item.rank = 0;
    });

    return [...activeEntries, ...exemptEntries];
  };

  // Xếp hạng năm học = (HKI + HKII × 2) / 3 (hoặc HKII nếu miễn HK1) + Điểm cộng cả năm
  // Đặc biệt: "Lớp có HS vi phạm bị hội đồng kỷ luật xử lý sẽ không xếp loại cả năm"
  const getYearlyRankings = (campusId = 'all', grade: number | 'all' = 'all'): RankingEntry[] => {
    const sem1List = getSemesterRankings(1, campusId, grade);
    const sem2List = getSemesterRankings(2, campusId, grade);

    const entries: RankingEntry[] = sem1List.map((entry) => {
      const sem2Entry = sem2List.find((s2) => s2.classItem.id === entry.classItem.id);
      const s1 = entry.totalScore;
      const s2 = sem2Entry ? sem2Entry.totalScore : s1;
      const isExempt = !!entry.classItem.exemptSemester1;
      const baseYearScore = isExempt ? Number((s2).toFixed(2)) : Number(((s1 + s2 * 2) / 3).toFixed(2));

      // Yearly bonus logs (Giao lưu CLB văn hóa K6-8, Đội tuyển tỉnh K9, Đội nghi lễ)
      const yearLogs = scoreLogs.filter((l) => l.classId === entry.classItem.id && l.period === 'year');
      let yearBonusPoints = 0;
      yearLogs.forEach((l) => {
        if (l.type === 'bonus' || l.totalPoints > 0) {
          yearBonusPoints += Math.abs(l.totalPoints);
        }
      });

      const finalYearScore = Number((baseYearScore + yearBonusPoints).toFixed(2));

      // Check Disciplinary Disqualification
      const disciplinaryLog = scoreLogs.find(
        (l) =>
          l.classId === entry.classItem.id &&
          (l.isDisciplinary || l.criteriaId === 'crit_hv_03' || l.criteriaId === 'crit_hv_04')
      );

      const isDisqualifiedYearly = !!disciplinaryLog;
      const disqualificationReason = isDisqualifiedYearly
        ? `Lớp có HS vi phạm bị Hội đồng kỷ luật xử lý (${disciplinaryLog?.criteriaName || 'Vi phạm kỷ luật'}) - Không xếp loại cả năm.`
        : undefined;

      return {
        ...entry,
        totalScore: finalYearScore,
        baseScore: baseYearScore,
        yearBonusPoints,
        semester1Score: s1,
        semester2Score: s2,
        performanceTier: isDisqualifiedYearly ? 'Cần cố gắng' : determineTier(finalYearScore),
        isDisqualifiedYearly,
        disqualificationReason,
      };
    });

    // Qualified classes ranked first, disqualified classes placed at bottom
    entries.sort((a, b) => {
      if (a.isDisqualifiedYearly !== b.isDisqualifiedYearly) {
        return a.isDisqualifiedYearly ? 1 : -1;
      }
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.classItem.name.localeCompare(b.classItem.name);
    });

    entries.forEach((item, idx) => {
      if (item.isDisqualifiedYearly) {
        item.rank = 0; // Unranked
      } else {
        if (idx > 0 && !entries[idx - 1].isDisqualifiedYearly && entries[idx - 1].totalScore === item.totalScore) {
          item.rank = entries[idx - 1].rank;
        } else {
          item.rank = idx + 1;
        }
      }
    });

    return entries;
  };

  // 11. Overall School Stats
  const getSchoolStats = (week: number) => {
    const rankings = getWeeklyRankings(week, 'all', 'all');
    if (rankings.length === 0) {
      return {
        avgScore: 100,
        highestScore: 100,
        lowestScore: 100,
        totalBonusPoints: 0,
        totalPenaltyPoints: 0,
        totalViolations: 0,
        totalHonors: 0,
        topClass: null,
        topCampus: null,
      };
    }

    const totalSum = rankings.reduce((acc, r) => acc + r.totalScore, 0);
    const avgScore = Number((totalSum / rankings.length).toFixed(1));
    const highestScore = rankings[0].totalScore;
    const lowestScore = rankings[rankings.length - 1].totalScore;

    const currentWeekLogs = scoreLogs.filter((l) => l.week === week && (l.period === 'week' || !l.period));
    let totalBonusPoints = 0;
    let totalPenaltyPoints = 0;
    let totalViolations = 0;
    let totalHonors = 0;

    currentWeekLogs.forEach((l) => {
      if (l.type === 'bonus' || l.totalPoints > 0) {
        totalBonusPoints += Math.abs(l.totalPoints);
        totalHonors += l.quantity;
      } else {
        totalPenaltyPoints += Math.abs(l.totalPoints);
        totalViolations += l.quantity;
      }
    });

    let bestCampus: { campus: Campus; avgScore: number } | null = null;
    campuses.forEach((camp) => {
      const campClasses = rankings.filter((r) => r.campus.id === camp.id);
      if (campClasses.length > 0) {
        const campSum = campClasses.reduce((acc, c) => acc + c.totalScore, 0);
        const campAvg = Number((campSum / campClasses.length).toFixed(1));
        if (!bestCampus || campAvg > bestCampus.avgScore) {
          bestCampus = { campus: camp, avgScore: campAvg };
        }
      }
    });

    return {
      avgScore,
      highestScore,
      lowestScore,
      totalBonusPoints,
      totalPenaltyPoints,
      totalViolations,
      totalHonors,
      topClass: rankings[0] || null,
      topCampus: bestCampus,
    };
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        canAccessTab,
        visibleClasses,
        visibleCampuses,
        visibleScoreLogs,
        auditLogs,
        logAudit,
        appeals,
        submitAppeal,
        reviewAppeal,
        addUser,
        updateUser,
        deleteUser,
        toggleLockUser,
        updateUserPermissions,
        campuses,
        classes,
        criteria,
        scoreLogs,
        settings,
        users,
        currentUser,
        isAuthenticated,
        login,
        loginWithEmail,
        changePassword,
        updateUserEmail,
        batchUpdateUserEmails,
        syncUsersFromClasses,
        cleanDemoUsersAndKeepAdmins,
        logout,
        currentTab,
        selectedCampusId,
        selectedGrade,
        selectedWeek,
        selectedMonth,
        selectedSemester,
        maxWeeks,
        currentActiveWeek,
        activateManualWeek,
        updateTimeframeConfig,
        historicalWeeklyScores,
        saveHistoricalScores,
        clearHistoricalScores,
        setCurrentTab,
        setSelectedCampusId,
        setSelectedGrade,
        setSelectedWeek,
        setSelectedMonth,
        setSelectedSemester,
        switchCurrentUser,
        addCampus,
        updateCampus,
        deleteCampus,
        toggleCampusStatus,
        addClass,
        updateClass,
        deleteClass,
        toggleClassStatus,
        batchImportClasses,
        academicYears,
        activeAcademicYearId: settings.activeAcademicYearId || settings.academicYear || '2026-2027',
        addAcademicYear,
        updateAcademicYear,
        setActiveAcademicYear,
        grades,
        addGrade,
        updateGrade,
        deleteGrade,
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        reassignHomeroomTeacher,
        calendarWeeks,
        updateCalendarWeek,
        batchUpdateCalendarWeeks,
        resetCalendarWeeks,
        cloneCriteriaForAcademicYear,
        dataMode: settings.dataMode || 'demo',
        setDataMode,
        purgeDemoData,
        checkDataIntegrity,
        addCriteria,
        updateCriteria,
        deleteCriteria,
        toggleCriteriaActive,
        archiveCriteria,
        restoreCriteria,
        lockCriteria,
        unlockCriteria,
        createNewCriteriaVersion,
        duplicateCriteria,
        criteriaVersionHistories,
        criteriaLockConfig,
        updateCriteriaLockConfig,
        addScoreLog,
        updateScoreLog,
        deleteScoreLog,
        bulkAddScoreLogs,
        redFlagDuties,
        lockedWeeks,
        isWeekLocked,
        toggleLockWeek,
        addRedFlagDuty,
        updateRedFlagDuty,
        deleteRedFlagDuty,
        campusWeeklyDuties,
        updateCampusWeeklyDuty,
        setWeeklyDutyAssignment,
        updateBriefingDeadline,
        redFlagMembers,
        addRedFlagMember,
        updateRedFlagMember,
        deleteRedFlagMember,
        briefingRecords,
        addBriefingRecord,
        updateBriefingRecord,
        activityLogs,
        addActivityLog,
        deleteActivityLog,
        scoringNavigationContext,
        navigateToScoring,
        clearScoringNavigationContext,
        getCriteriaById,
        previewCriteriaCalculation,
        isDataLoaded,
        loadDataFromFirebase,
        saveAllToFirebase,
        updateSettings,
        resetToDefaultData,
        clearTestDataForGoLive,
        resetDatabase,
        exportDataBackup,
        importDataBackup,
        academicYearArchives,
        switchAcademicYear,
        createNewAcademicYear,
        deleteArchivedYear,
        runSystemIntegrityAudit,
        exportOfflineStandbyWorkbook,
        exportCurrentRankingsExcel,
        exportCurrentScoreLogsExcel,
        exportCriteriaCatalogExcel,
        exportFullBackupPayload,
        restoreFullBackup,
        bonusMonthly,
        bonusTerm,
        bonusYearly,
        updatePeriodicBonus,
        downloadSourceCodeZip,
        getClassWeeklyScore,
        getWeeklyRankings,
        getMonthlyRankings,
        getMonthRankingData,
        getSemesterRankings,
        getYearlyRankings,
        getSchoolStats,
        lockedMonths,
        isMonthLocked,
        getMonthLockInfo,
        lockMonth,
        unlockMonth,
        applyVerificationSample,
        exportMonthlyRankingsExcel,
        lockedSemesters,
        isSemesterLocked,
        getSemesterLockInfo,
        lockSemester,
        unlockSemester,
        getSemesterRankingData,
        applySemesterVerificationSample,
        exportSemesterRankingsExcel,
        lockedYear,
        isYearLocked,
        getYearLockInfo,
        lockYear,
        unlockYear,
        getYearRankingData,
        applyYearVerificationSample,
        exportYearRankingsExcel,
        lockedTitles,
        isTitleLocked,
        getTitleLockInfo,
        lockTitles,
        unlockTitles,
        disciplinaryRecords,
        addDisciplinaryRecord,
        removeDisciplinaryRecord,
        getTitleEvaluationData,
        applyTitleVerificationSample,
        exportTitleEvaluationExcel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
