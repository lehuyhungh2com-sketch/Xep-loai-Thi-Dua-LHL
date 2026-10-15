import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));

// Persistence directory
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'server_db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory + persisted DB structure
interface ServerDB {
  auditLogs: any[];
  appeals: any[];
  lockedWeeks: number[];
  lockedMonths?: Record<string, any>;
  lockedSemesters?: Record<string, any>;
  lockedYear?: any;
  lockedTitles?: any;
  users: any[];
  classes: any[];
  campuses: any[];
  criteria: any[];
  grades?: any[];
  teachers?: any[];
  academicYears?: any[];
  scoreLogs: any[];
  bonus_monthly?: Record<string, number>;
  bonus_term?: Record<string, number>;
  bonus_yearly?: Record<string, number>;
  settings?: any;
  historicalWeeklyScores?: Record<string, any>;
  lastUpdated: string;
}

const DEFAULT_CORE_USERS = [
  // Role 1 - Quản trị viên
  {
    id: 'u_admin',
    name: 'Thầy Nguyễn Văn Sơn',
    role: 'super_admin',
    email: 'nguyenvanson.hieutruong@lehuulap.edu.vn',
    password: 'Admin@123',
    title: '1. Quản trị viên tối cao (Hiệu trưởng)',
    scopeType: 'all',
    isLocked: false,
  },
  {
    id: 'u_admin_hung',
    name: 'Lê Huy Hùng',
    role: 'super_admin',
    email: 'lehuyhung.h2com@gmail.com',
    password: 'Admin@123',
    title: '1. Quản trị viên hệ thống (Google Admin)',
    scopeType: 'all',
    isLocked: false,
  },
  // Role 2 - Ban Giám Hiệu
  {
    id: 'u_bgh',
    name: 'Thầy Hoàng Văn Sơn',
    role: 'bgh',
    email: 'hoangvanson.phohieutruong@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '2. Ban Giám Hiệu (Phó Hiệu trưởng)',
    scopeType: 'all',
    isLocked: false,
  },
  // Role 3 - Tổng Phụ Trách & Phụ trách phân hiệu
  {
    id: 'u_inspector',
    name: 'Cô Lê Thị Hoa',
    role: 'tpt_doi',
    email: 'hoa.gvdn@gmail.com',
    password: 'Lhl@2026',
    title: '3. Tổng Phụ Trách / Phụ trách thi đua toàn trường',
    scopeType: 'all',
    isLocked: false,
  },
  {
    id: 'u_lead_hl',
    name: 'Cô Phạm Thị Mai',
    role: 'campus_admin',
    campusId: 'hau_loc',
    allowedCampusIds: ['hau_loc'],
    scopeType: 'campus',
    email: 'mai.hl@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '3. Phụ trách thi đua Phân hiệu Hậu Lộc',
    isLocked: false,
  },
  {
    id: 'u_lead_tl',
    name: 'Cô Trần Bích Ngọc',
    role: 'campus_admin',
    campusId: 'thuan_loc',
    allowedCampusIds: ['thuan_loc'],
    scopeType: 'campus',
    email: 'ngoc.tl@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '3. Phụ trách thi đua Phân hiệu Thuần Lộc',
    isLocked: false,
  },
  {
    id: 'u_lead_lt',
    name: 'Thầy Đỗ Quốc Tuấn',
    role: 'campus_admin',
    campusId: 'loc_tan',
    allowedCampusIds: ['loc_tan'],
    scopeType: 'campus',
    email: 'tuan.lt@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '3. Phụ trách thi đua Phân hiệu Lộc Tân',
    isLocked: false,
  },
  {
    id: 'u_lead_ls',
    name: 'Cô Lê Thu Hằng',
    role: 'campus_admin',
    campusId: 'loc_son',
    allowedCampusIds: ['loc_son'],
    scopeType: 'campus',
    email: 'hang.ls@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '3. Phụ trách thi đua Phân hiệu Lộc Sơn',
    isLocked: false,
  },
  {
    id: 'u_lead_ml',
    name: 'Thầy Nguyễn Văn Hưng',
    role: 'campus_admin',
    campusId: 'my_loc',
    allowedCampusIds: ['my_loc'],
    scopeType: 'campus',
    email: 'hung.ml@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '3. Phụ trách thi đua Phân hiệu Mỹ Lộc',
    isLocked: false,
  },
  // Role 4 - Cờ đỏ & Role 5 - Người xem
  {
    id: 'u_redflag_long',
    name: 'Em Trịnh Hoàng Long',
    role: 'red_flag',
    campusId: 'lhl_main',
    allowedCampusIds: ['lhl_main'],
    classId: 'c_9a1',
    email: 'long.codo9a1@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '4. Đội cờ đỏ / Người chấm nề nếp ca trực',
    scopeType: 'campus',
    isLocked: false,
  },
  {
    id: 'u_guest',
    name: 'Bác Trần Văn Hùng (Đại diện CMHS)',
    role: 'viewer',
    email: 'cmhs@lehuulap.edu.vn',
    password: 'Lhl@2026',
    title: '5. Người xem (Phụ huynh / Khách)',
    scopeType: 'all',
    isLocked: false,
  },
  {
    id: 'u_user_hienhao',
    name: 'Cô Hiền Hảo',
    role: 'teacher',
    email: 'hienhao3010@gmail.com',
    password: 'Lhl@2026',
    title: '4. Giáo viên / Người nhập dữ liệu',
    scopeType: 'all',
    isLocked: false,
  },
];

const INITIAL_CLASSES_SUMMARY = [
  { id: 'c_6a1', name: '6A1', campusId: 'lhl_main', teacher: 'Thầy Bùi Văn Dũng' },
  { id: 'c_6a2', name: '6A2', campusId: 'lhl_main', teacher: 'Cô Phạm Thị Hồng Thúy' },
  { id: 'c_6a3', name: '6A3', campusId: 'lhl_main', teacher: 'Cô Lê Thị Hồng' },
  { id: 'c_7a1', name: '7A1', campusId: 'lhl_main', teacher: 'Vũ Đức Nam' },
  { id: 'c_7a2', name: '7A2', campusId: 'lhl_main', teacher: 'Hoàng Kim Chi' },
  { id: 'c_7a3', name: '7A3', campusId: 'lhl_main', teacher: 'Đinh Tiến Đạt' },
  { id: 'c_8a1', name: '8A1', campusId: 'lhl_main', teacher: 'Trịnh Thúy Nga' },
  { id: 'c_8a2', name: '8A2', campusId: 'lhl_main', teacher: 'Lý Quốc Cường' },
  { id: 'c_8a3', name: '8A3', campusId: 'lhl_main', teacher: 'Bùi Thị Hà' },
  { id: 'c_9a1', name: '9A1', campusId: 'lhl_main', teacher: 'Lê Thanh Hoa' },
  { id: 'c_9a2', name: '9A2', campusId: 'lhl_main', teacher: 'Ngô Văn Tùng' },
  { id: 'c_9a3', name: '9A3', campusId: 'lhl_main', teacher: 'Dương Thị Yến' },
  { id: 'c_6g1', name: '6G1', campusId: 'hau_loc', teacher: 'Đặng Thanh Tâm' },
  { id: 'c_6g2', name: '6G2', campusId: 'hau_loc', teacher: 'Trần Quốc Việt' },
  { id: 'c_6g3', name: '6G3', campusId: 'hau_loc', teacher: 'Nguyễn Văn Tiến' },
  { id: 'c_7g1', name: '7G1', campusId: 'hau_loc', teacher: 'Vũ Thị Minh' },
  { id: 'c_7g2', name: '7G2', campusId: 'hau_loc', teacher: 'Mai Văn Quân' },
  { id: 'c_8g1', name: '8G1', campusId: 'hau_loc', teacher: 'Nguyễn Thị Oanh' },
  { id: 'c_8g2', name: '8G2', campusId: 'hau_loc', teacher: 'Lê Hữu Trung' },
  { id: 'c_8g3', name: '8G3', campusId: 'hau_loc', teacher: 'Bùi Thị Hồng' },
  { id: 'c_9g1', name: '9G1', campusId: 'hau_loc', teacher: 'Phan Văn Bình' },
  { id: 'c_9g2', name: '9G2', campusId: 'hau_loc', teacher: 'Nguyễn Thị Dung' },
  { id: 'c_9g3', name: '9G3', campusId: 'hau_loc', teacher: 'Tạ Minh Dũng' },
  { id: 'c_6e1', name: '6E1', campusId: 'loc_tan', teacher: 'Hoàng Thị Thảo' },
  { id: 'c_6e2', name: '6E2', campusId: 'loc_tan', teacher: 'Lê Bá Chiến' },
  { id: 'c_7e1', name: '7E1', campusId: 'loc_tan', teacher: 'Nguyễn Văn Phúc' },
  { id: 'c_7e2', name: '7E2', campusId: 'loc_tan', teacher: 'Đỗ Thị Hạnh' },
  { id: 'c_8e1', name: '8E1', campusId: 'loc_tan', teacher: 'Trần Văn Tuyến' },
  { id: 'c_8e2', name: '8E2', campusId: 'loc_tan', teacher: 'Lê Thị Loan' },
  { id: 'c_9e1', name: '9E1', campusId: 'loc_tan', teacher: 'Phạm Văn Nam' },
  { id: 'c_9e2', name: '9E2', campusId: 'loc_tan', teacher: 'Vũ Thị Quyên' },
  { id: 'c_6c1', name: '6C1', campusId: 'loc_son', teacher: 'Nguyễn Thị Bích' },
  { id: 'c_6c2', name: '6C2', campusId: 'loc_son', teacher: 'Võ Minh Hải' },
  { id: 'c_7c1', name: '7C1', campusId: 'loc_son', teacher: 'Lê Thị Nga' },
  { id: 'c_7c2', name: '7C2', campusId: 'loc_son', teacher: 'Đinh Trọng Hào' },
  { id: 'c_8c1', name: '8C1', campusId: 'loc_son', teacher: 'Bùi Thị Lan' },
  { id: 'c_8c2', name: '8C2', campusId: 'loc_son', teacher: 'Trần Hữu Thắng' },
  { id: 'c_9c1', name: '9C1', campusId: 'loc_son', teacher: 'Phan Thị Hòa' },
  { id: 'c_9c2', name: '9C2', campusId: 'loc_son', teacher: 'Nguyễn Văn Đạt' },
  { id: 'c_6d1', name: '6D1', campusId: 'my_loc', teacher: 'Đỗ Thị Huệ' },
  { id: 'c_6d2', name: '6D2', campusId: 'my_loc', teacher: 'Lê Văn Khiêm' },
  { id: 'c_7d1', name: '7D1', campusId: 'my_loc', teacher: 'Hoàng Thị Phượng' },
  { id: 'c_7d2', name: '7D2', campusId: 'my_loc', teacher: 'Trần Văn Cảnh' },
  { id: 'c_8d1', name: '8D1', campusId: 'my_loc', teacher: 'Phạm Thị Thắm' },
  { id: 'c_8d2', name: '8D2', campusId: 'my_loc', teacher: 'Vũ Văn Hào' },
  { id: 'c_9d1', name: '9D1', campusId: 'my_loc', teacher: 'Nguyễn Thị Lương' },
  { id: 'c_9d2', name: '9D2', campusId: 'my_loc', teacher: 'Lê Đình Trung' },
  { id: 'c_6b1', name: '6B1', campusId: 'thuan_loc', teacher: 'Nguyễn Thị Mai Lan' },
  { id: 'c_6b2', name: '6B2', campusId: 'thuan_loc', teacher: 'Trần Đình Hiếu' },
  { id: 'c_6b3', name: '6B3', campusId: 'thuan_loc', teacher: 'Lê Thị Phương' },
  { id: 'c_7b1', name: '7B1', campusId: 'thuan_loc', teacher: 'Phạm Văn Khánh' },
  { id: 'c_7b2', name: '7B2', campusId: 'thuan_loc', teacher: 'Vũ Thị Thúy' },
  { id: 'c_7b3', name: '7B3', campusId: 'thuan_loc', teacher: 'Bùi Văn Hưng' },
  { id: 'c_8b1', name: '8B1', campusId: 'thuan_loc', teacher: 'Đỗ Thị Tuyết' },
  { id: 'c_8b2', name: '8B2', campusId: 'thuan_loc', teacher: 'Nguyễn Bá Long' },
  { id: 'c_8b3', name: '8B3', campusId: 'thuan_loc', teacher: 'Lê Thị Hải' },
  { id: 'c_9b1', name: '9B1', campusId: 'thuan_loc', teacher: 'Vũ Văn Quyết' },
  { id: 'c_9b2', name: '9B2', campusId: 'thuan_loc', teacher: 'Trịnh Thị Liên' },
  { id: 'c_9b3', name: '9B3', campusId: 'thuan_loc', teacher: 'Hoàng Văn Lộc' },
];

const DEFAULT_TEACHER_USERS = INITIAL_CLASSES_SUMMARY.map((c) => {
  const cleanTeacherName = c.teacher
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
  const cleanClassName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const email = c.id === 'c_8d1' ? 'thamhungml@gmail.com' : `gvcn.${cleanClassName}@gmail.com`;

  return {
    id: `u_gvcn_${c.id}`,
    name: c.teacher,
    role: 'gvcn',
    campusId: c.campusId,
    classId: c.id,
    email,
    password: 'Lhl@2026',
    title: `Giáo viên chủ nhiệm lớp ${c.name}`,
    isLocked: false,
  };
});

function loadDB(): ServerDB {
  const allInitialUsers = [...DEFAULT_CORE_USERS, ...DEFAULT_TEACHER_USERS];

  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      let modified = false;

      if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = allInitialUsers;
        modified = true;
      } else {

        // Ensure all core system users exist (BGH, TPT hoa.gvdn@gmail.com, Campus Admins, etc.)
        for (const coreUser of DEFAULT_CORE_USERS) {
          const idx = parsed.users.findIndex(
            (u: any) =>
              u.id === coreUser.id ||
              (u.email && coreUser.email && u.email.trim().toLowerCase() === coreUser.email.trim().toLowerCase())
          );
          if (idx === -1) {
            parsed.users.push({ ...coreUser });
            modified = true;
          } else {
            // Update email for u_inspector if needed
            if (coreUser.id === 'u_inspector') {
              if (parsed.users[idx].email !== 'hoa.gvdn@gmail.com') {
                parsed.users[idx].email = 'hoa.gvdn@gmail.com';
                modified = true;
              }
            }
            if (!parsed.users[idx].password || !parsed.users[idx].password.trim()) {
              parsed.users[idx].password = coreUser.password || 'Lhl@2026';
              modified = true;
            }
          }
        }

        // Ensure all 59 teacher users exist with predictable emails
        for (const tUser of DEFAULT_TEACHER_USERS) {
          const idx = parsed.users.findIndex(
            (u: any) => u.id === tUser.id || (u.classId && u.classId === tUser.classId)
          );
          if (idx === -1) {
            parsed.users.push({ ...tUser });
            modified = true;
          } else {
            // Ensure 8D1 has thamhungml@gmail.com
            if (tUser.id === 'u_gvcn_c_8d1' || tUser.classId === 'c_8d1') {
              if (parsed.users[idx].email !== 'thamhungml@gmail.com') {
                parsed.users[idx].email = 'thamhungml@gmail.com';
                modified = true;
              }
            } else if (!parsed.users[idx].email || !parsed.users[idx].email.trim()) {
              parsed.users[idx].email = tUser.email;
              modified = true;
            }
            if (!parsed.users[idx].password || !parsed.users[idx].password.trim()) {
              parsed.users[idx].password = 'Lhl@2026';
              modified = true;
            }
          }
        }

        // Ensure all users have passwords populated based on role (Role 1: Admin@123, Role 2, 3, 4, 5: Lhl@2026)
        parsed.users = parsed.users.map((u: any) => {
          const isAdmin =
            u.role === 'super_admin' ||
            u.role === 'admin' ||
            u.id === 'u_admin' ||
            u.id === 'u_admin_hung' ||
            (u.email && u.email.toLowerCase() === 'lehuyhung.h2com@gmail.com');
          const defaultPassword = isAdmin ? 'Admin@123' : 'Lhl@2026';
          if (!u.password || typeof u.password !== 'string' || !u.password.trim()) {
            modified = true;
            return { ...u, password: defaultPassword };
          }
          return u;
        });
      }

      // 2. Ensure classes list is populated with array
      if (!parsed.classes || !Array.isArray(parsed.classes)) {
        parsed.classes = [];
        modified = true;
      }

      // 3. Ensure campuses list is populated
      if (!parsed.campuses || !Array.isArray(parsed.campuses)) {
        parsed.campuses = [];
        modified = true;
      }

      // 4. Ensure criteria list is populated
      if (!parsed.criteria || !Array.isArray(parsed.criteria)) {
        parsed.criteria = [];
        modified = true;
      }

      // 4b. Ensure grades list is populated
      if (!parsed.grades || !Array.isArray(parsed.grades) || parsed.grades.length === 0) {
        parsed.grades = [
          { id: 'grade_6', grade: 6, name: 'Khối 6', order: 1, displayOrder: 1, status: 'active' },
          { id: 'grade_7', grade: 7, name: 'Khối 7', order: 2, displayOrder: 2, status: 'active' },
          { id: 'grade_8', grade: 8, name: 'Khối 8', order: 3, displayOrder: 3, status: 'active' },
          { id: 'grade_9', grade: 9, name: 'Khối 9', order: 4, displayOrder: 4, status: 'active' },
        ];
        modified = true;
      }

      // 5. Ensure scoreLogs is an array
      if (!parsed.scoreLogs || !Array.isArray(parsed.scoreLogs)) {
        parsed.scoreLogs = [];
        modified = true;
      }

      // 6. Ensure settings is initialized
      if (!parsed.settings) {
        parsed.settings = {
          schoolName: 'Trường THCS Lê Hữu Lập',
          governingBody: '',
          academicYear: '2026-2027',
          dataMode: 'production',
          current_active_week: 4,
          currentWeek: 4,
          totalWeeks: 35,
          totalWeeksSemester1: 18,
          totalWeeksSemester2: 17,
          max_weeks: 35,
        };
        modified = true;
      }

      if (!parsed.lockedWeeks) {
        parsed.lockedWeeks = [];
        modified = true;
      }

      if (!parsed.lockedMonths) {
        parsed.lockedMonths = {};
        modified = true;
      }

      if (!parsed.lockedSemesters) {
        parsed.lockedSemesters = {};
        modified = true;
      }

      if (!parsed.appeals) {
        parsed.appeals = [];
        modified = true;
      }

      if (!parsed.auditLogs) {
        parsed.auditLogs = [];
        modified = true;
      }

      if (!parsed.historicalWeeklyScores) {
        parsed.historicalWeeklyScores = {};
        modified = true;
      }

      if (!parsed.bonus_monthly) {
        parsed.bonus_monthly = {};
        modified = true;
      }
      if (!parsed.bonus_term) {
        parsed.bonus_term = {};
        modified = true;
      }
      if (!parsed.bonus_yearly) {
        parsed.bonus_yearly = {};
        modified = true;
      }

      if (modified) saveDB(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Error reading server DB:', err);
  }

  const fallback: ServerDB = {
    auditLogs: [],
    appeals: [],
    lockedWeeks: [],
    lockedMonths: {},
    lockedSemesters: {},
    lockedYear: null,
    lockedTitles: null,
    historicalWeeklyScores: {},
    bonus_monthly: {},
    bonus_term: {},
    bonus_yearly: {},
    users: allInitialUsers,
    classes: [],
    campuses: [],
    criteria: [],
    grades: [
      { id: 'grade_6', grade: 6, name: 'Khối 6', order: 1, displayOrder: 1, status: 'active' },
      { id: 'grade_7', grade: 7, name: 'Khối 7', order: 2, displayOrder: 2, status: 'active' },
      { id: 'grade_8', grade: 8, name: 'Khối 8', order: 3, displayOrder: 3, status: 'active' },
      { id: 'grade_9', grade: 9, name: 'Khối 9', order: 4, displayOrder: 4, status: 'active' },
    ],
    scoreLogs: [],
    settings: {
      schoolName: 'Trường THCS Lê Hữu Lập',
      governingBody: '',
      academicYear: '2026-2027',
      dataMode: 'production',
      current_active_week: 4,
      currentWeek: 4,
      totalWeeks: 35,
      totalWeeksSemester1: 18,
      totalWeeksSemester2: 17,
      max_weeks: 35,
    },
    lastUpdated: new Date().toISOString(),
  };
  saveDB(fallback);
  return fallback;
}

function saveDB(data: ServerDB) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving server DB:', err);
  }
}

let db = loadDB();

// RBAC Middleware Helper
interface AuthUser {
  id: string;
  name: string;
  role: string;
  campusId?: string;
  classId?: string;
}

function extractUser(req: Request): AuthUser {
  const id = (req.headers['x-user-id'] as string) || 'u_admin';
  const name = (req.headers['x-user-name'] as string) || 'Thầy Nguyễn Văn Sơn';
  let role = (req.headers['x-user-role'] as string) || 'super_admin';
  const campusId = req.headers['x-user-campus'] as string;
  const classId = req.headers['x-user-class'] as string;

  // Normalize roles
  if (role === 'admin') role = 'super_admin';
  if (role === 'inspector') role = 'tpt_doi';
  if (role === 'campus_lead') role = 'campus_admin';
  if (role === 'teacher') role = 'gvcn';
  if (role === 'public') role = 'viewer';

  return { id, name, role, campusId, classId };
}

function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = extractUser(req);
    if (user.role === 'super_admin') {
      return next(); // Super admin bypass
    }
    if (allowedRoles.includes(user.role)) {
      return next();
    }
    res.status(403).json({
      success: false,
      message: `Quyền truy cập bị từ chối. Thao tác này yêu cầu quyền: ${allowedRoles.join(', ')}`,
    });
  };
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    auditLogCount: db.auditLogs.length,
    appealCount: db.appeals.length,
    lockedWeeks: db.lockedWeeks,
    userCount: db.users.length,
    classesCount: db.classes ? db.classes.length : 0,
    scoreLogsCount: db.scoreLogs ? db.scoreLogs.length : 0,
  });
});

// ---------------- 1. CENTRAL BOOTSTRAP API ----------------
// Single endpoint to load the entire central database on app startup and for real-time polling
app.get('/api/bootstrap', (_req: Request, res: Response) => {
  res.json({
    success: true,
    users: db.users,
    classes: db.classes,
    campuses: db.campuses,
    criteria: db.criteria,
    grades: db.grades || [],
    teachers: db.teachers || [],
    academicYears: db.academicYears || [],
    scoreLogs: db.scoreLogs || [],
    bonus_monthly: db.bonus_monthly || {},
    bonus_term: db.bonus_term || {},
    bonus_yearly: db.bonus_yearly || {},
    settings: db.settings,
    historicalWeeklyScores: db.historicalWeeklyScores || {},
    lockedWeeks: db.lockedWeeks || [],
    lockedMonths: db.lockedMonths || {},
    lockedSemesters: db.lockedSemesters || {},
    lockedYear: db.lockedYear || null,
    lockedTitles: db.lockedTitles || null,
    appeals: db.appeals || [],
    auditLogs: db.auditLogs || [],
    lastUpdated: db.lastUpdated,
  });
});

// ---------------- 2. CLASSES CRUD APIS ----------------
app.get('/api/classes', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: db.classes ? db.classes.length : 0,
    data: db.classes || [],
    classes: db.classes || [],
  });
});

app.post('/api/classes', (req: Request, res: Response) => {
  const newClass = req.body;
  if (!newClass || !newClass.name) {
    res.status(400).json({ success: false, message: 'Tên lớp học không được để trống' });
    return;
  }
  const id = newClass.id || `cls_${Date.now()}`;
  const classItem = { ...newClass, id };
  if (!db.classes) db.classes = [];
  db.classes.push(classItem);
  saveDB(db);
  res.json({ success: true, data: classItem, classes: db.classes });
});

app.put('/api/classes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const patch = req.body;
  if (!db.classes) db.classes = [];
  const idx = db.classes.findIndex((c: any) => c.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    return;
  }
  db.classes[idx] = { ...db.classes[idx], ...patch };
  saveDB(db);
  res.json({ success: true, data: db.classes[idx], classes: db.classes });
});

app.delete('/api/classes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db.classes) db.classes = [];
  const prevLen = db.classes.length;
  db.classes = db.classes.filter((c: any) => c.id !== id);
  if (db.classes.length !== prevLen) {
    saveDB(db);
  }
  res.json({ success: true, message: 'Đã xóa lớp học', classes: db.classes });
});

app.post('/api/classes/batch', (req: Request, res: Response) => {
  const { classes } = req.body;
  if (!Array.isArray(classes)) {
    res.status(400).json({ success: false, message: 'Dữ liệu lớp học phải là một mảng' });
    return;
  }
  db.classes = classes;
  saveDB(db);
  res.json({ success: true, count: db.classes.length, classes: db.classes });
});

// ---------------- 3. SCORE LOGS (ĐIỂM THI ĐUA) CRUD APIS ----------------
app.get('/api/score-logs', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: db.scoreLogs ? db.scoreLogs.length : 0,
    data: db.scoreLogs || [],
    scoreLogs: db.scoreLogs || [],
  });
});

app.post('/api/score-logs', (req: Request, res: Response) => {
  const logData = req.body;
  if (!logData || !logData.classId || !logData.criteriaId) {
    res.status(400).json({ success: false, message: 'Thông tin biên bản thi đua không hợp lệ' });
    return;
  }
  const id = logData.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newLog = { ...logData, id };
  if (!db.scoreLogs) db.scoreLogs = [];
  db.scoreLogs.unshift(newLog);
  saveDB(db);
  res.json({ success: true, data: newLog, scoreLogs: db.scoreLogs });
});

app.put('/api/score-logs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { patch, ...directPatch } = req.body;
  const updates = patch || directPatch;
  if (!db.scoreLogs) db.scoreLogs = [];
  const idx = db.scoreLogs.findIndex((l: any) => l.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy biên bản chấm điểm' });
    return;
  }
  db.scoreLogs[idx] = { ...db.scoreLogs[idx], ...updates, lastModifiedAt: new Date().toISOString() };
  saveDB(db);
  res.json({ success: true, data: db.scoreLogs[idx], scoreLogs: db.scoreLogs });
});

app.delete('/api/score-logs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db.scoreLogs) db.scoreLogs = [];
  const prevLen = db.scoreLogs.length;
  db.scoreLogs = db.scoreLogs.filter((l: any) => l.id !== id);
  if (db.scoreLogs.length !== prevLen) {
    saveDB(db);
  }
  res.json({ success: true, message: 'Đã xóa biên bản thi đua', scoreLogs: db.scoreLogs });
});

app.post('/api/score-logs/batch', (req: Request, res: Response) => {
  const { logs } = req.body;
  if (!Array.isArray(logs)) {
    res.status(400).json({ success: false, message: 'Dữ liệu biên bản phải là mảng' });
    return;
  }
  if (!db.scoreLogs) db.scoreLogs = [];
  const enriched = logs.map((log: any, idx: number) => ({
    ...log,
    id: log.id || `log_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
  }));
  db.scoreLogs = [...enriched, ...db.scoreLogs];
  saveDB(db);
  res.json({ success: true, count: enriched.length, scoreLogs: db.scoreLogs });
});

// ---------------- 4. LOCKS & EMULATION STATUS API ----------------
app.post('/api/locks', (req: Request, res: Response) => {
  const { lockedWeeks, lockedMonths, lockedSemesters, lockedYear, lockedTitles } = req.body;
  if (Array.isArray(lockedWeeks)) db.lockedWeeks = lockedWeeks;
  if (lockedMonths !== undefined) db.lockedMonths = lockedMonths;
  if (lockedSemesters !== undefined) db.lockedSemesters = lockedSemesters;
  if (lockedYear !== undefined) db.lockedYear = lockedYear;
  if (lockedTitles !== undefined) db.lockedTitles = lockedTitles;
  saveDB(db);
  res.json({
    success: true,
    lockedWeeks: db.lockedWeeks,
    lockedMonths: db.lockedMonths,
    lockedSemesters: db.lockedSemesters,
    lockedYear: db.lockedYear,
    lockedTitles: db.lockedTitles,
  });
});

// ---------------- 5. CAMPUSES & CRITERIA APIS ----------------
app.get('/api/campuses', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.campuses || [] });
});

app.post('/api/campuses', (req: Request, res: Response) => {
  const newCampus = req.body;
  if (!db.campuses) db.campuses = [];
  const id = newCampus.id || `camp_${Date.now()}`;
  db.campuses.push({ ...newCampus, id });
  saveDB(db);
  res.json({ success: true, data: db.campuses });
});

app.put('/api/campuses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const patch = req.body;
  if (!db.campuses) db.campuses = [];
  const idx = db.campuses.findIndex((c: any) => c.id === id);
  if (idx !== -1) {
    db.campuses[idx] = { ...db.campuses[idx], ...patch };
    saveDB(db);
  }
  res.json({ success: true, data: db.campuses });
});

app.delete('/api/campuses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db.campuses) db.campuses = [];
  db.campuses = db.campuses.filter((c: any) => c.id !== id);
  saveDB(db);
  res.json({ success: true, data: db.campuses });
});

app.get('/api/criteria', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.criteria || [] });
});

app.post('/api/criteria', (req: Request, res: Response) => {
  const newCriteria = req.body;
  if (!db.criteria) db.criteria = [];
  const id = newCriteria.id || `crit_${Date.now()}`;
  db.criteria.push({ ...newCriteria, id });
  saveDB(db);
  res.json({ success: true, data: db.criteria });
});

app.put('/api/criteria/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const patch = req.body;
  if (!db.criteria) db.criteria = [];
  const idx = db.criteria.findIndex((c: any) => c.id === id);
  if (idx !== -1) {
    db.criteria[idx] = { ...db.criteria[idx], ...patch };
    saveDB(db);
  }
  res.json({ success: true, data: db.criteria });
});

app.delete('/api/criteria/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db.criteria) db.criteria = [];
  db.criteria = db.criteria.filter((c: any) => c.id !== id);
  saveDB(db);
  res.json({ success: true, data: db.criteria });
});

// Periodic Bonus APIs (Điểm thưởng hoạt động phong trào theo Tháng, Học kỳ, Cả năm)
app.get('/api/periodic-bonuses', (_req: Request, res: Response) => {
  res.json({
    success: true,
    bonus_monthly: db.bonus_monthly || {},
    bonus_term: db.bonus_term || {},
    bonus_yearly: db.bonus_yearly || {},
  });
});

app.post('/api/periodic-bonuses', requireRole(['super_admin', 'bgh', 'tpt_doi', 'admin']), (req: Request, res: Response) => {
  const { type, key, points } = req.body;
  if (!type || !key) {
    res.status(400).json({ success: false, message: 'Thiếu thông tin loại hoặc khóa điểm thưởng' });
    return;
  }
  const numericPoints = Number(points) || 0;
  if (!db.bonus_monthly) db.bonus_monthly = {};
  if (!db.bonus_term) db.bonus_term = {};
  if (!db.bonus_yearly) db.bonus_yearly = {};

  if (type === 'monthly') {
    db.bonus_monthly[key] = numericPoints;
  } else if (type === 'term') {
    db.bonus_term[key] = numericPoints;
  } else if (type === 'yearly') {
    db.bonus_yearly[key] = numericPoints;
  }

  const user = extractUser(req);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CAP_NHAT_CAU_HINH',
    entityType: 'periodic_bonus',
    entityId: `${type}_${key}`,
    details: `Cập nhật điểm thưởng phong trào ${type} (${key}): ${numericPoints} điểm`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: 'Đã lưu điểm thưởng phong trào thành công',
    bonus_monthly: db.bonus_monthly,
    bonus_term: db.bonus_term,
    bonus_yearly: db.bonus_yearly,
  });
});

// ---------------- AUTHENTICATION & GOOGLE LOGIN ----------------

// Validate login with Email and Password
app.post('/api/auth/validate-login', (req: Request, res: Response) => {
  const { email, password, name, avatar } = req.body;
  if (!email || typeof email !== 'string' || !email.trim()) {
    res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp địa chỉ Email đăng nhập.',
    });
    return;
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    res.status(400).json({
      success: false,
      message: 'Vui lòng nhập mật khẩu.',
    });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const inputPassword = password.trim();

  // Find user directly in database using find() matching lowercase trimmed email
  const matchedUser = db.users.find(
    (u) => (u.email || '').trim().toLowerCase() === cleanEmail
  );

  // If not found in users database
  if (!matchedUser) {
    const failedLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'unauthorized',
      userName: name || cleanEmail,
      userRole: 'guest',
      action: 'DANG_NHAP_THAT_BAI',
      entityType: 'user',
      entityId: cleanEmail,
      beforeData: null,
      afterData: null,
      details: `Đăng nhập bị từ chối: Email [${cleanEmail}] chưa được đăng ký trong hệ thống.`,
    };
    db.auditLogs.unshift(failedLog);
    saveDB(db);

    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED_EMAIL',
      message: 'Email hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.',
    });
    return;
  }

  // If account is locked
  if (matchedUser.isLocked) {
    res.status(403).json({
      success: false,
      code: 'ACCOUNT_LOCKED',
      message: `Tài khoản "${matchedUser.name}" đang bị KHÓA (${matchedUser.lockedReason || 'Liên hệ quản trị viên'}). Không thể đăng nhập!`,
    });
    return;
  }

  // Determine expected password with guaranteed fallbacks (Admin@123 for admins, Lhl@2026 for teachers)
  const isAdmin =
    matchedUser.role === 'super_admin' ||
    matchedUser.role === 'admin' ||
    matchedUser.id === 'u_admin' ||
    matchedUser.id === 'u_admin_hung' ||
    cleanEmail === 'lehuyhung.h2com@gmail.com';
  const expectedPassword = matchedUser.password || (isAdmin ? 'Admin@123' : 'Lhl@2026');

  // Verify password strictly
  if (inputPassword !== expectedPassword) {
    const failedPassLog = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: matchedUser.id,
      userName: matchedUser.name,
      userRole: matchedUser.role,
      action: 'DANG_NHAP_THAT_BAI',
      entityType: 'user',
      entityId: matchedUser.id,
      beforeData: null,
      afterData: null,
      details: `Đăng nhập thất bại: Sai mật khẩu cho tài khoản [${cleanEmail}].`,
    };
    db.auditLogs.unshift(failedPassLog);
    saveDB(db);

    res.status(401).json({
      success: false,
      code: 'INCORRECT_PASSWORD',
      message: 'Email hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.',
    });
    return;
  }

  // Update password if it was missing in record
  if (!matchedUser.password) {
    matchedUser.password = expectedPassword;
  }

  // Update lastLoginAt
  matchedUser.lastLoginAt = new Date().toISOString();
  if (name && (!matchedUser.name || matchedUser.name.includes('Thầy/Cô'))) {
    matchedUser.name = name;
  }
  if (avatar && !matchedUser.avatar) {
    matchedUser.avatar = avatar;
  }

  // Record successful login in audit trail
  const successLog = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: matchedUser.id,
    userName: matchedUser.name,
    userRole: matchedUser.role,
    action: 'DANG_NHAP',
    entityType: 'user',
    entityId: matchedUser.id,
    campusId: matchedUser.campusId,
    classId: matchedUser.classId,
    beforeData: null,
    afterData: { email: cleanEmail, name: matchedUser.name, role: matchedUser.role },
    details: `${matchedUser.name} (${matchedUser.title}) đã xác thực đăng nhập thành công [${cleanEmail}].`,
  };
  db.auditLogs.unshift(successLog);
  saveDB(db);

  res.json({
    success: true,
    message: `Xác thực thành công! Chào mừng ${matchedUser.name}.`,
    user: matchedUser,
    targetTab: 'dashboard',
  });
});

// GET list of authorized users (for Admin & email management)
app.get('/api/users', (req: Request, res: Response) => {
  res.json({
    success: true,
    total: db.users.length,
    data: db.users,
  });
});

// Update email for a single user/homeroom teacher
app.post('/api/users/update-email', (req: Request, res: Response) => {
  const { userId, classId, email } = req.body;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Email không được để trống' });
    return;
  }

  const cleanEmail = email.trim();
  const idx = db.users.findIndex(
    (u) => (userId && u.id === userId) || (classId && u.classId === classId)
  );

  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng hoặc lớp học tương ứng' });
    return;
  }

  const user = db.users[idx];
  const oldEmail = user.email;
  user.email = cleanEmail;

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: 'admin',
    userName: 'Quản trị viên',
    userRole: 'super_admin',
    action: 'SUA_NGUOI_DUNG',
    entityType: 'user',
    entityId: user.id,
    beforeData: { email: oldEmail },
    afterData: { email: cleanEmail },
    details: `Admin cập nhật email Google cho ${user.name} (${user.title}): ${oldEmail || 'Chưa có'} -> ${cleanEmail}`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: `Đã cập nhật email cho ${user.name} thành công.`,
    user,
  });
});

// Change user password API
app.post('/api/users/change-password', (req: Request, res: Response) => {
  const { userId, email, currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ: Mật khẩu hiện tại, Mật khẩu mới và Xác nhận mật khẩu mới!',
    });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!',
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({
      success: false,
      message: 'Mật khẩu mới và Xác nhận mật khẩu mới không trùng khớp nhau!',
    });
    return;
  }

  // Find user by userId or email
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const user = db.users.find(
    (u) => (userId && u.id === userId) || (cleanEmail && u.email?.trim().toLowerCase() === cleanEmail)
  );

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'Không tìm thấy tài khoản người dùng trong hệ thống!',
    });
    return;
  }

  // Expected password with defaults fallback
  const isAdmin =
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    user.id === 'u_admin' ||
    user.id === 'u_admin_hung' ||
    user.email?.toLowerCase() === 'lehuyhung.h2com@gmail.com';
  const expectedPassword = user.password || (isAdmin ? 'Admin@123' : 'Lhl@2026');

  if (currentPassword !== expectedPassword) {
    res.status(400).json({
      success: false,
      message: 'Mật khẩu hiện tại không chính xác! Vui lòng thử lại.',
    });
    return;
  }

  // Update password in database
  user.password = newPassword;

  // Add audit log
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SUA_NGUOI_DUNG',
    entityType: 'user',
    entityId: user.id,
    beforeData: null,
    afterData: null,
    details: `${user.name} (${user.title}) đã thực hiện đổi mật khẩu cá nhân thành công.`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: 'Đổi mật khẩu thành công!',
    user,
  });
});


// Batch update emails for 59 homeroom teachers
app.post('/api/users/batch-update-emails', (req: Request, res: Response) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments)) {
    res.status(400).json({ success: false, message: 'Dữ liệu không đúng định dạng danh sách' });
    return;
  }

  let updatedCount = 0;
  assignments.forEach((item: { classId?: string; id?: string; email: string }) => {
    if (!item.email) return;
    const cleanEmail = item.email.trim();
    const targetUser = db.users.find(
      (u) => (item.id && u.id === item.id) || (item.classId && u.classId === item.classId)
    );
    if (targetUser) {
      targetUser.email = cleanEmail;
      updatedCount++;
    }
  });

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: 'admin',
    userName: 'Quản trị viên',
    userRole: 'super_admin',
    action: 'SUA_NGUOI_DUNG',
    entityType: 'user',
    entityId: 'batch_update_emails',
    details: `Admin đã lưu cấu hình email Google cho ${updatedCount} Giáo viên chủ nhiệm`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    updatedCount,
    message: `Đã lưu thành công địa chỉ email cho ${updatedCount} tài khoản!`,
    data: db.users,
  });
});

// Full sync of users (e.g. from 59 classes sync or cleaning demo accounts)
app.post('/api/users/sync-from-classes', (req: Request, res: Response) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    res.status(400).json({ success: false, message: 'Danh sách người dùng không hợp lệ' });
    return;
  }

  // Ensure every user in sync has a valid default password and proper email
  db.users = users.map((u: any) => {
    const isAdmin =
      u.role === 'super_admin' ||
      u.role === 'admin' ||
      u.id === 'u_admin' ||
      u.id === 'u_admin_hung' ||
      (u.email && u.email.toLowerCase() === 'lehuyhung.h2com@gmail.com');
    const defaultPass = isAdmin ? 'Admin@123' : 'Lhl@2026';
    const password = (u.password && typeof u.password === 'string' && u.password.trim())
      ? u.password.trim()
      : defaultPass;
    const email = (u.id === 'u_gvcn_c_8d1' || u.classId === 'c_8d1')
      ? (u.email && !u.email.includes('gvcn.8d1') ? u.email : 'thamhungml@gmail.com')
      : u.email;

    return {
      ...u,
      email,
      password,
    };
  });
  saveDB(db);

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: 'admin',
    userName: 'Quản trị viên',
    userRole: 'super_admin',
    action: 'SUA_NGUOI_DUNG',
    entityType: 'user',
    entityId: 'sync_users',
    details: `Đã đồng bộ lại danh sách ${users.length} tài khoản người dùng từ hệ thống với mật khẩu đầy đủ`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    total: db.users.length,
    message: `Đã lưu danh sách ${db.users.length} tài khoản thành công!`,
    data: db.users,
  });
});

// Update single user in server database
app.post('/api/users/update', (req: Request, res: Response) => {
  const { id, patch } = req.body;
  if (!id) {
    res.status(400).json({ success: false, message: 'Thiếu ID người dùng' });
    return;
  }
  const idx = db.users.findIndex((u: any) => u.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return;
  }
  db.users[idx] = { ...db.users[idx], ...patch };
  saveDB(db);
  res.json({ success: true, user: db.users[idx], users: db.users });
});

// Standard REST PUT for updating user by id
app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const patch = req.body;
  const idx = db.users.findIndex((u: any) => u.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return;
  }
  db.users[idx] = { ...db.users[idx], ...patch };
  saveDB(db);
  res.json({ success: true, user: db.users[idx], users: db.users });
});

// Standard REST DELETE user by id
app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const prevLen = db.users.length;
  db.users = db.users.filter((u: any) => u.id !== id);
  if (db.users.length !== prevLen) {
    saveDB(db);
  }
  res.json({ success: true, message: 'Đã xóa người dùng thành công', users: db.users });
});

// Add new user to server database (both POST /api/users and POST /api/users/add)
app.post('/api/users', (req: Request, res: Response) => {
  const user = req.body;
  if (!user || !user.name || !user.email) {
    res.status(400).json({ success: false, message: 'Thông tin người dùng không đầy đủ' });
    return;
  }
  const id = user.id || `u_${Date.now()}`;
  const newUser = { ...user, id };
  const existingIdx = db.users.findIndex((u: any) => u.id === id);
  if (existingIdx !== -1) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...newUser };
  } else {
    db.users.push(newUser);
  }
  saveDB(db);
  res.json({ success: true, user: newUser, users: db.users });
});

app.post('/api/users/add', (req: Request, res: Response) => {
  const user = req.body;
  if (!user || !user.name || !user.email) {
    res.status(400).json({ success: false, message: 'Thông tin người dùng không đầy đủ' });
    return;
  }
  const id = user.id || `u_${Date.now()}`;
  const newUser = { ...user, id };
  db.users.push(newUser);
  saveDB(db);
  res.json({ success: true, user: newUser, users: db.users });
});

app.post('/api/users/batch', (req: Request, res: Response) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    res.status(400).json({ success: false, message: 'Danh sách người dùng phải là mảng' });
    return;
  }
  db.users = users;
  saveDB(db);
  res.json({ success: true, count: db.users.length, users: db.users });
});

// Background endpoint: ensure all users in DB have valid passwords (Role 4, Role 5, etc.)
app.post('/api/users/ensure-passwords', (_req: Request, res: Response) => {
  let updatedCount = 0;
  db.users = db.users.map((u: any) => {
    const isAdmin =
      u.role === 'super_admin' ||
      u.role === 'admin' ||
      u.id === 'u_admin' ||
      u.id === 'u_admin_hung' ||
      (u.email && u.email.toLowerCase() === 'lehuyhung.h2com@gmail.com');
    const defaultPass = isAdmin ? 'Admin@123' : 'Lhl@2026';
    if (!u.password || typeof u.password !== 'string' || !u.password.trim()) {
      u.password = defaultPass;
      updatedCount++;
    }
    if (u.id === 'u_gvcn_c_8d1' || u.classId === 'c_8d1') {
      if (!u.email || u.email.includes('gvcn.8d1')) {
        u.email = 'thamhungml@gmail.com';
      }
    }
    return u;
  });
  if (updatedCount > 0) {
    saveDB(db);
  }
  res.json({
    success: true,
    updatedCount,
    total: db.users.length,
    users: db.users,
  });
});

// Reset demo users, preserving all official school accounts
app.post('/api/users/clean-demo', (req: Request, res: Response) => {
  const allInitialUsers = [...DEFAULT_CORE_USERS, ...DEFAULT_TEACHER_USERS];
  const prevCount = db.users.length;
  db.users = allInitialUsers;
  saveDB(db);
  const removedCount = Math.max(0, prevCount - allInitialUsers.length);

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: 'admin',
    userName: 'Quản trị viên',
    userRole: 'super_admin',
    action: 'XOA_NGUOI_DUNG',
    entityType: 'user',
    entityId: 'clean_demo_users',
    details: `Admin đã hoàn tác và làm sạch tài khoản mẫu, bảo toàn ${allInitialUsers.length} tài khoản cán bộ và giáo viên chính thức`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    removedCount,
    total: allInitialUsers.length,
    message: `Đã làm sạch tài khoản mẫu. Giữ lại ${allInitialUsers.length} tài khoản cán bộ và giáo viên chính thức!`,
    data: allInitialUsers,
  });
});

// Dọn dẹp dữ liệu chạy thử an toàn trước khi Go-live
app.post('/api/admin/clear-test-data', requireRole(['super_admin', 'admin', 'bgh']), (req: Request, res: Response) => {
  const user = (req as any).user || { name: 'Quản trị viên', role: 'super_admin' };
  const prevLockedWeeks = db.lockedWeeks || [];
  const prevAppealsCount = Array.isArray(db.appeals) ? db.appeals.length : 0;
  const prevHistoricalWeeks = db.historicalWeeklyScores ? Object.keys(db.historicalWeeklyScores).length : 0;

  db.lockedWeeks = [];
  db.appeals = [];
  db.historicalWeeklyScores = {};

  if (db.settings) {
    db.settings.lockedWeeks = [];
    db.settings.lockedMonths = {};
    db.settings.lockedSemesters = {};
    db.settings.lockedYear = null;
    db.settings.lockedTitles = null;
    db.settings.historicalWeeklyScores = {};
    db.settings.dataMode = 'production';
    db.settings.start_date_of_week_1 = '2026-08-31';
    db.settings.currentWeek = 7;
    db.settings.current_active_week = 7;
  }

  const auditEntry = {
    id: `audit_golive_clean_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id || 'admin',
    userName: user.name || 'Quản trị viên',
    userRole: user.role || 'super_admin',
    action: 'DON_DEP_DU_LIEU_CHAY_THU',
    entityType: 'settings',
    entityId: 'system_cleanup_golive',
    beforeData: {
      lockedWeeks: prevLockedWeeks,
      appealsCount: prevAppealsCount,
      historicalWeeksCount: prevHistoricalWeeks,
    },
    afterData: {
      lockedWeeks: [],
      appealsCount: 0,
      historicalScoresCount: 0,
      dataMode: 'production',
      status: 'go_live_ready',
    },
    details: `${user.name} đã thực hiện dọn dẹp sạch dữ liệu chạy thử: Xóa toàn bộ điểm số, vi phạm, điểm bảo lưu, và mở khóa toàn bộ các tuần. Giữ nguyên 59 Lớp học, 6 Phân hiệu, 71 Tài khoản và Danh mục tiêu chí thi đua sẵn sàng cho vận hành thật.`,
  };

  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: 'Đã dọn dẹp sạch toàn bộ dữ liệu chạy thử! Hệ thống đã sẵn sàng 100% cho giáo viên vào nhập liệu thật.',
    db: {
      lockedWeeks: db.lockedWeeks,
      usersCount: db.users.length,
      appealsCount: db.appeals.length,
      historicalScoresCount: Object.keys(db.historicalWeeklyScores).length,
      dataMode: db.settings?.dataMode || 'production',
    },
  });
});

// Settings API (Governing Body, School Name, Rules)
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: db.settings || null,
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const settingsData = req.body;
  if (!settingsData || typeof settingsData !== 'object') {
    res.status(400).json({ success: false, message: 'Dữ liệu cấu hình không hợp lệ' });
    return;
  }

  db.settings = { ...(db.settings || {}), ...settingsData };
  saveDB(db);

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: 'admin',
    userName: 'Quản trị viên',
    userRole: 'super_admin',
    action: 'CAP_NHAT_CAU_HINH',
    entityType: 'system_settings',
    entityId: 'settings',
    details: `Admin cập nhật thông tin đơn vị & cấu hình hệ thống: Đơn vị cấp trên="${db.settings.governingBody || 'Để trống'}", Trường="${db.settings.schoolName || ''}"`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: 'Đã lưu cấu hình hệ thống thành công!',
    data: db.settings,
  });
});

// Historical Preserved Scores API (Nhập điểm bảo lưu tuần quá khứ)
app.get('/api/historical-scores', (_req: Request, res: Response) => {
  const scores = db.historicalWeeklyScores || db.settings?.historicalWeeklyScores || {};
  res.json({
    success: true,
    data: scores,
  });
});

app.post('/api/historical-scores', requireRole(['super_admin', 'bgh', 'admin']), (req: Request, res: Response) => {
  const { week, scores, lockWeek = true } = req.body;
  if (!week || typeof week !== 'number' || !scores || typeof scores !== 'object') {
    res.status(400).json({ success: false, message: 'Dữ liệu điểm bảo lưu không hợp lệ' });
    return;
  }

  if (!db.historicalWeeklyScores) {
    db.historicalWeeklyScores = {};
  }
  db.historicalWeeklyScores[week] = scores;

  // Also synchronize to db.settings.historicalWeeklyScores for single-snapshot backups
  if (db.settings) {
    db.settings.historicalWeeklyScores = db.historicalWeeklyScores;
  }

  // Auto lock week if requested
  if (lockWeek && Array.isArray(db.lockedWeeks)) {
    if (!db.lockedWeeks.includes(week)) {
      db.lockedWeeks.push(week);
      db.lockedWeeks.sort((a, b) => a - b);
    }
  }

  const classesCount = Object.keys(scores).length;
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.header('x-user-id') || 'admin',
    userName: req.header('x-user-name') || 'Quản trị viên / BGH',
    userRole: req.header('x-user-role') || 'super_admin',
    action: 'CAP_NHAT_CAU_HINH',
    entityType: 'historical_scores',
    entityId: `week_${week}`,
    details: `Nhập điểm bảo lưu lịch sử cho ${classesCount} lớp tại Tuần ${week}. Đã ghi nhận làm điểm tổng kết hợp lệ và tự động tính vào Xếp hạng Tháng, Học kỳ, Cả năm.`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: `Đã lưu thành công điểm bảo lưu lịch sử cho ${classesCount} lớp tại Tuần ${week}!`,
    data: db.historicalWeeklyScores,
    lockedWeeks: db.lockedWeeks,
  });
});

app.delete('/api/historical-scores/:week', requireRole(['super_admin', 'bgh', 'admin']), (req: Request, res: Response) => {
  const week = parseInt(req.params.week, 10);
  if (!week || isNaN(week)) {
    res.status(400).json({ success: false, message: 'Tuần không hợp lệ' });
    return;
  }

  if (db.historicalWeeklyScores && db.historicalWeeklyScores[week]) {
    delete db.historicalWeeklyScores[week];
    if (db.settings?.historicalWeeklyScores) {
      delete db.settings.historicalWeeklyScores[week];
    }
  }

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.header('x-user-id') || 'admin',
    userName: req.header('x-user-name') || 'Quản trị viên / BGH',
    userRole: req.header('x-user-role') || 'super_admin',
    action: 'CAP_NHAT_CAU_HINH',
    entityType: 'historical_scores',
    entityId: `week_${week}`,
    details: `Đã xóa điểm bảo lưu lịch sử của Tuần ${week}. Hệ thống sẽ quay về tính điểm theo biên bản vi phạm chi tiết (nếu có).`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: `Đã xóa điểm bảo lưu Tuần ${week}!`,
    data: db.historicalWeeklyScores || {},
  });
});

// Audit Logs API
app.get('/api/audit-logs', requireRole(['super_admin', 'bgh']), (req: Request, res: Response) => {
  const { action, role, userId, entityType, limit = '200' } = req.query;
  let logs = [...db.auditLogs];

  if (action) {
    logs = logs.filter((l) => l.action === action);
  }
  if (role) {
    logs = logs.filter((l) => l.userRole === role);
  }
  if (userId) {
    logs = logs.filter((l) => l.userId === userId);
  }
  if (entityType) {
    logs = logs.filter((l) => l.entityType === entityType);
  }

  // Sort descending by timestamp
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    success: true,
    total: logs.length,
    data: logs.slice(0, Number(limit)),
  });
});

app.post('/api/audit-logs', (req: Request, res: Response) => {
  const user = extractUser(req);
  const logItem = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: req.body.action || 'THAO_TAC_HE_THONG',
    entityType: req.body.entityType || 'score_log',
    entityId: req.body.entityId || 'none',
    campusId: req.body.campusId || user.campusId,
    classId: req.body.classId || user.classId,
    beforeData: req.body.beforeData ?? null,
    afterData: req.body.afterData ?? null,
    details: req.body.details || '',
  };

  db.auditLogs.unshift(logItem);
  // Cap at 2000 logs to manage file size
  if (db.auditLogs.length > 2000) {
    db.auditLogs = db.auditLogs.slice(0, 2000);
  }
  saveDB(db);

  res.json({ success: true, data: logItem });
});

// Appeals API (GVCN đề nghị điều chỉnh)
app.get('/api/appeals', (req: Request, res: Response) => {
  const user = extractUser(req);
  let appeals = [...db.appeals];

  // GVCN can only view appeals for their class
  if (user.role === 'gvcn' && user.classId) {
    appeals = appeals.filter((a) => a.classId === user.classId);
  } else if (user.role === 'campus_admin' && user.campusId) {
    appeals = appeals.filter((a) => a.campusId === user.campusId);
  }

  appeals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: appeals });
});

app.post('/api/appeals', requireRole(['gvcn', 'super_admin']), (req: Request, res: Response) => {
  const user = extractUser(req);
  const appeal = {
    id: `appeal_${Date.now()}`,
    createdAt: new Date().toISOString(),
    classId: req.body.classId,
    className: req.body.className,
    campusId: req.body.campusId,
    campusName: req.body.campusName,
    teacherId: user.id,
    teacherName: user.name,
    week: Number(req.body.week),
    scoreLogId: req.body.scoreLogId || null,
    criteriaName: req.body.criteriaName || 'Điểm thi đua',
    appealType: req.body.appealType || 'adjust_score',
    reason: req.body.reason,
    evidenceNotes: req.body.evidenceNotes || '',
    proposedPoints: req.body.proposedPoints !== undefined ? Number(req.body.proposedPoints) : 0,
    status: 'pending',
  };

  db.appeals.unshift(appeal);

  // Auto record Audit Log
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'GUI_DE_NGHI_DIEU_CHINH',
    entityType: 'appeal',
    entityId: appeal.id,
    campusId: appeal.campusId,
    classId: appeal.classId,
    beforeData: null,
    afterData: appeal,
    details: `GVCN ${user.name} gửi phản hồi/đề nghị điều chỉnh điểm Tuần ${appeal.week} cho lớp ${appeal.className}: ${appeal.reason}`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({ success: true, data: appeal });
});

app.put('/api/appeals/:id/review', requireRole(['super_admin', 'bgh', 'tpt_doi', 'campus_admin']), (req: Request, res: Response) => {
  const user = extractUser(req);
  const { id } = req.params;
  const { status, reviewNotes } = req.body;

  const idx = db.appeals.findIndex((a) => a.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu điều chỉnh' });
    return;
  }

  const beforeAppeal = { ...db.appeals[idx] };
  db.appeals[idx] = {
    ...db.appeals[idx],
    status,
    reviewerId: user.id,
    reviewerName: user.name,
    reviewedAt: new Date().toISOString(),
    reviewNotes: reviewNotes || '',
  };

  const action = status === 'approved' ? 'DUYET_DIEU_CHINH' : 'TU_CHOI_DIEU_CHINH';
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType: 'appeal',
    entityId: id,
    campusId: db.appeals[idx].campusId,
    classId: db.appeals[idx].classId,
    beforeData: beforeAppeal,
    afterData: db.appeals[idx],
    details: `${status === 'approved' ? 'Chấp thuận' : 'Từ chối'} đề nghị điều chỉnh của lớp ${db.appeals[idx].className} (Tuần ${db.appeals[idx].week}). Ghi chú: ${reviewNotes || 'Không có'}`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({ success: true, data: db.appeals[idx] });
});

// Week Data Lock API (Super Admin, BGH, and TPT Đội)
app.post('/api/datalock/toggle', requireRole(['super_admin', 'bgh', 'tpt_doi']), (req: Request, res: Response) => {
  const user = extractUser(req);
  const week = Number(req.body.week);

  if (!week || week < 1 || week > 35) {
    res.status(400).json({ success: false, message: 'Số tuần không hợp lệ (1 - 35)' });
    return;
  }

  const isCurrentlyLocked = db.lockedWeeks.includes(week);
  const beforeWeeks = [...db.lockedWeeks];

  if (isCurrentlyLocked) {
    // Mở khóa dữ liệu (Unlock data): CHỈ CHO PHÉP tài khoản có role === 1 (Quản trị viên)
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Từ chối truy cập: Chỉ Quản trị viên hệ thống mới có quyền mở khóa dữ liệu đã chốt.',
      });
      return;
    }
    db.lockedWeeks = db.lockedWeeks.filter((w) => w !== week);
  } else {
    // Chốt dữ liệu (Lock data): Giữ nguyên cho phép Role 1, Role 2, Role 3
    db.lockedWeeks = [...db.lockedWeeks, week].sort((a, b) => a - b);
  }

  const action = isCurrentlyLocked ? 'MO_KHOA_TUAN' : 'CHOT_DU_LIEU_TUAN';
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType: 'week_lock',
    entityId: `week_${week}`,
    beforeData: { lockedWeeks: beforeWeeks, weekLocked: isCurrentlyLocked },
    afterData: { lockedWeeks: db.lockedWeeks, weekLocked: !isCurrentlyLocked },
    details: `${!isCurrentlyLocked ? 'Khóa chốt dữ liệu thi đua' : 'Mở khóa sửa đổi dữ liệu'} Tuần ${week}`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    lockedWeeks: db.lockedWeeks,
    isLocked: !isCurrentlyLocked,
    message: !isCurrentlyLocked ? `Đã chốt khóa dữ liệu Tuần ${week}` : `Đã mở khóa dữ liệu Tuần ${week}`,
  });
});

// Month Data Lock API (Super Admin, BGH, and TPT Đội)
app.post('/api/datalock/month', requireRole(['super_admin', 'bgh', 'tpt_doi']), (req: Request, res: Response) => {
  const user = extractUser(req);
  const month = Number(req.body.month);
  const isLock = !!req.body.isLock;
  const notes = req.body.notes || '';
  const reason = req.body.reason || '';

  if (!month || month < 1 || month > 12) {
    res.status(400).json({ success: false, message: 'Tháng không hợp lệ (1 - 12)' });
    return;
  }

  if (!db.lockedMonths) db.lockedMonths = {};

  const beforeLock = db.lockedMonths[month] || null;

  if (!isLock) {
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Chỉ Quản trị viên hệ thống mới có quyền mở khóa tháng đã chốt.' });
      return;
    }
    delete db.lockedMonths[month];
  } else {
    db.lockedMonths[month] = {
      month,
      academicYear: db.settings?.academicYear || '2026-2027',
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: { id: user.id, name: user.name, role: user.role, title: user.title },
      notes,
    };
  }

  if (db.settings) {
    db.settings.lockedMonths = db.lockedMonths;
  }

  const action = isLock ? 'CHOT_DU_LIEU_THANG' : 'MO_KHOA_THANG';
  db.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType: 'month_lock',
    entityId: `month_${month}`,
    reason: isLock ? undefined : reason,
    beforeData: beforeLock,
    afterData: db.lockedMonths[month] || { month, isLocked: false },
    details: isLock ? `${user.name} đã CHỐT KHÓA dữ liệu Tháng ${month}` : `${user.name} đã MỞ KHÓA dữ liệu Tháng ${month} - Lý do: ${reason}`,
  });

  saveDB(db);
  res.json({
    success: true,
    lockedMonths: db.lockedMonths,
    message: isLock ? `Đã chốt khóa dữ liệu Tháng ${month}` : `Đã mở khóa dữ liệu Tháng ${month}`,
  });
});

// Server-side Backup & Restore APIs
app.get('/api/backup/download', requireRole(['super_admin', 'bgh']), (req: Request, res: Response) => {
  const user = extractUser(req);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SAO_LUU_HE_THONG',
    entityType: 'settings',
    entityId: `server_backup_${Date.now()}`,
    beforeData: null,
    afterData: { appealsCount: db.appeals.length, auditLogsCount: db.auditLogs.length },
    details: `${user.name} tải tệp sao lưu dữ liệu máy chủ server_db.json`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.setHeader('Content-Disposition', `attachment; filename=server_db_backup_${new Date().toISOString().split('T')[0]}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db, null, 2));
});

// Reset Database API (Clean zero scores, keep structure)
app.post('/api/reset-database', requireRole(['super_admin']), (req: Request, res: Response) => {
  const user = extractUser(req);
  db.scoreLogs = [];
  db.historicalWeeklyScores = {};
  db.bonus_monthly = {};
  db.bonus_term = {};
  db.bonus_yearly = {};
  db.lockedWeeks = [];
  db.lockedMonths = {};
  db.lockedSemesters = {};
  db.lockedYear = null;
  db.lockedTitles = null;
  db.appeals = [];
  db.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'KHOI_PHUC_HE_THONG',
    entityType: 'settings',
    entityId: `reset_db_${Date.now()}`,
    details: `${user.name} đã khởi tạo lại cơ sở dữ liệu hoàn toàn trống (giữ cấu trúc chuẩn 59 lớp, xóa toàn bộ điểm số nháp)`,
  });
  saveDB(db);
  res.json({
    success: true,
    message: 'Đã khởi tạo lại cơ sở dữ liệu hoàn toàn TRỐNG (về điểm số và chốt khóa), sẵn sàng nhập liệu thực tế chuẩn 59 lớp!',
  });
});

// Export Full Source Code ZIP using archiver
const handleExportZip = async (_req: Request, res: Response) => {
  try {
    res.setHeader('Content-Disposition', 'attachment; filename="source_code_thcs_le_huu_lap.zip"');
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err: any) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi nén mã nguồn: ' + err.message });
      }
    });

    archive.pipe(res);

    const rootDir = path.resolve(__dirname);
    archive.glob('**/*', {
      cwd: rootDir,
      ignore: [
        'node_modules/**',
        'dist/**',
        '.git/**',
        '.aistudio/**',
        '.cache/**',
        'server.js',
        '*.zip',
        '.DS_Store'
      ]
    });

    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Lỗi nén mã nguồn: ' + err.message });
    }
  }
};

app.get('/api/export-zip', handleExportZip);
app.get('/api/download-source-zip', handleExportZip);

app.post('/api/backup/restore', requireRole(['super_admin']), (req: Request, res: Response) => {
  const user = extractUser(req);
  const backupData = req.body;

  if (!backupData || typeof backupData !== 'object') {
    res.status(400).json({ success: false, message: 'Dữ liệu sao lưu không hợp lệ!' });
    return;
  }

  // Backup current state to emergency snapshot file
  try {
    const backupDir = path.resolve(DATA_DIR, 'snapshots');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.resolve(backupDir, `pre_restore_${Date.now()}.json`), JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error creating pre-restore snapshot:', err);
  }

  const beforeLogs = db.auditLogs.length;
  if (Array.isArray(backupData.auditLogs)) db.auditLogs = backupData.auditLogs;
  if (Array.isArray(backupData.appeals)) db.appeals = backupData.appeals;
  if (Array.isArray(backupData.lockedWeeks)) db.lockedWeeks = backupData.lockedWeeks;

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'PHUC_HOI_HE_THONG',
    entityType: 'settings',
    entityId: `server_restore_${Date.now()}`,
    beforeData: { auditLogsCount: beforeLogs },
    afterData: { auditLogsCount: db.auditLogs.length, appealsCount: db.appeals.length },
    details: `Super Admin ${user.name} khôi phục dữ liệu máy chủ từ tệp sao lưu`,
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);

  res.json({
    success: true,
    message: 'Khôi phục dữ liệu máy chủ thành công!',
    auditLogsCount: db.auditLogs.length,
    appealsCount: db.appeals.length,
    lockedWeeks: db.lockedWeeks,
  });
});

// ---------------- VITE / STATIC SERVING ----------------
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (isProd && hasDist) {
    console.log(`[Production] Serving pre-built static bundle from: ${distPath}`);
    app.use(express.static(distPath));
    // SPA catch-all fallback for client-side routing
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Development] Initializing Vite middleware for dev mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`THCS Lê Hữu Lập Full-Stack RBAC server listening on http://${HOST}:${PORT}`);
  });

  // Graceful shutdown handling for Cloud Run container lifecycle
  process.on('SIGTERM', () => {
    console.log('SIGTERM received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
