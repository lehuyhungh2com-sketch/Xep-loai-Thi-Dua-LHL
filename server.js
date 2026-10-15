import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
const HOST = "0.0.0.0";
app.use(express.json({ limit: "15mb" }));
const DATA_DIR = path.resolve(__dirname, "data");
const DB_FILE = path.resolve(DATA_DIR, "server_db.json");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DEFAULT_CORE_USERS = [
  // Role 1 - Quản trị viên
  {
    id: "u_admin",
    name: "Th\u1EA7y Nguy\u1EC5n V\u0103n S\u01A1n",
    role: "super_admin",
    email: "nguyenvanson.hieutruong@lehuulap.edu.vn",
    password: "Admin@123",
    title: "1. Qu\u1EA3n tr\u1ECB vi\xEAn t\u1ED1i cao (Hi\u1EC7u tr\u01B0\u1EDFng)",
    scopeType: "all",
    isLocked: false
  },
  {
    id: "u_admin_hung",
    name: "L\xEA Huy H\xF9ng",
    role: "super_admin",
    email: "lehuyhung.h2com@gmail.com",
    password: "Admin@123",
    title: "1. Qu\u1EA3n tr\u1ECB vi\xEAn h\u1EC7 th\u1ED1ng (Google Admin)",
    scopeType: "all",
    isLocked: false
  },
  // Role 2 - Ban Giám Hiệu
  {
    id: "u_bgh",
    name: "Th\u1EA7y Ho\xE0ng V\u0103n S\u01A1n",
    role: "bgh",
    email: "hoangvanson.phohieutruong@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "2. Ban Gi\xE1m Hi\u1EC7u (Ph\xF3 Hi\u1EC7u tr\u01B0\u1EDFng)",
    scopeType: "all",
    isLocked: false
  },
  // Role 3 - Tổng Phụ Trách & Phụ trách phân hiệu
  {
    id: "u_inspector",
    name: "C\xF4 L\xEA Th\u1ECB Hoa",
    role: "tpt_doi",
    email: "hoa.gvdn@gmail.com",
    password: "Lhl@2026",
    title: "3. T\u1ED5ng Ph\u1EE5 Tr\xE1ch / Ph\u1EE5 tr\xE1ch thi \u0111ua to\xE0n tr\u01B0\u1EDDng",
    scopeType: "all",
    isLocked: false
  },
  {
    id: "u_lead_hl",
    name: "C\xF4 Ph\u1EA1m Th\u1ECB Mai",
    role: "campus_admin",
    campusId: "hau_loc",
    allowedCampusIds: ["hau_loc"],
    scopeType: "campus",
    email: "mai.hl@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "3. Ph\u1EE5 tr\xE1ch thi \u0111ua Ph\xE2n hi\u1EC7u H\u1EADu L\u1ED9c",
    isLocked: false
  },
  {
    id: "u_lead_tl",
    name: "C\xF4 Tr\u1EA7n B\xEDch Ng\u1ECDc",
    role: "campus_admin",
    campusId: "thuan_loc",
    allowedCampusIds: ["thuan_loc"],
    scopeType: "campus",
    email: "ngoc.tl@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "3. Ph\u1EE5 tr\xE1ch thi \u0111ua Ph\xE2n hi\u1EC7u Thu\u1EA7n L\u1ED9c",
    isLocked: false
  },
  {
    id: "u_lead_lt",
    name: "Th\u1EA7y \u0110\u1ED7 Qu\u1ED1c Tu\u1EA5n",
    role: "campus_admin",
    campusId: "loc_tan",
    allowedCampusIds: ["loc_tan"],
    scopeType: "campus",
    email: "tuan.lt@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "3. Ph\u1EE5 tr\xE1ch thi \u0111ua Ph\xE2n hi\u1EC7u L\u1ED9c T\xE2n",
    isLocked: false
  },
  {
    id: "u_lead_ls",
    name: "C\xF4 L\xEA Thu H\u1EB1ng",
    role: "campus_admin",
    campusId: "loc_son",
    allowedCampusIds: ["loc_son"],
    scopeType: "campus",
    email: "hang.ls@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "3. Ph\u1EE5 tr\xE1ch thi \u0111ua Ph\xE2n hi\u1EC7u L\u1ED9c S\u01A1n",
    isLocked: false
  },
  {
    id: "u_lead_ml",
    name: "Th\u1EA7y Nguy\u1EC5n V\u0103n H\u01B0ng",
    role: "campus_admin",
    campusId: "my_loc",
    allowedCampusIds: ["my_loc"],
    scopeType: "campus",
    email: "hung.ml@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "3. Ph\u1EE5 tr\xE1ch thi \u0111ua Ph\xE2n hi\u1EC7u M\u1EF9 L\u1ED9c",
    isLocked: false
  },
  // Role 4 - Cờ đỏ & Role 5 - Người xem
  {
    id: "u_redflag_long",
    name: "Em Tr\u1ECBnh Ho\xE0ng Long",
    role: "red_flag",
    campusId: "lhl_main",
    allowedCampusIds: ["lhl_main"],
    classId: "c_9a1",
    email: "long.codo9a1@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "4. \u0110\u1ED9i c\u1EDD \u0111\u1ECF / Ng\u01B0\u1EDDi ch\u1EA5m n\u1EC1 n\u1EBFp ca tr\u1EF1c",
    scopeType: "campus",
    isLocked: false
  },
  {
    id: "u_guest",
    name: "B\xE1c Tr\u1EA7n V\u0103n H\xF9ng (\u0110\u1EA1i di\u1EC7n CMHS)",
    role: "viewer",
    email: "cmhs@lehuulap.edu.vn",
    password: "Lhl@2026",
    title: "5. Ng\u01B0\u1EDDi xem (Ph\u1EE5 huynh / Kh\xE1ch)",
    scopeType: "all",
    isLocked: false
  },
  {
    id: "u_user_hienhao",
    name: "C\xF4 Hi\u1EC1n H\u1EA3o",
    role: "teacher",
    email: "hienhao3010@gmail.com",
    password: "Lhl@2026",
    title: "4. Gi\xE1o vi\xEAn / Ng\u01B0\u1EDDi nh\u1EADp d\u1EEF li\u1EC7u",
    scopeType: "all",
    isLocked: false
  }
];
const INITIAL_CLASSES_SUMMARY = [
  { id: "c_6a1", name: "6A1", campusId: "lhl_main", teacher: "Th\u1EA7y B\xF9i V\u0103n D\u0169ng" },
  { id: "c_6a2", name: "6A2", campusId: "lhl_main", teacher: "C\xF4 Ph\u1EA1m Th\u1ECB H\u1ED3ng Th\xFAy" },
  { id: "c_6a3", name: "6A3", campusId: "lhl_main", teacher: "C\xF4 L\xEA Th\u1ECB H\u1ED3ng" },
  { id: "c_7a1", name: "7A1", campusId: "lhl_main", teacher: "V\u0169 \u0110\u1EE9c Nam" },
  { id: "c_7a2", name: "7A2", campusId: "lhl_main", teacher: "Ho\xE0ng Kim Chi" },
  { id: "c_7a3", name: "7A3", campusId: "lhl_main", teacher: "\u0110inh Ti\u1EBFn \u0110\u1EA1t" },
  { id: "c_8a1", name: "8A1", campusId: "lhl_main", teacher: "Tr\u1ECBnh Th\xFAy Nga" },
  { id: "c_8a2", name: "8A2", campusId: "lhl_main", teacher: "L\xFD Qu\u1ED1c C\u01B0\u1EDDng" },
  { id: "c_8a3", name: "8A3", campusId: "lhl_main", teacher: "B\xF9i Th\u1ECB H\xE0" },
  { id: "c_9a1", name: "9A1", campusId: "lhl_main", teacher: "L\xEA Thanh Hoa" },
  { id: "c_9a2", name: "9A2", campusId: "lhl_main", teacher: "Ng\xF4 V\u0103n T\xF9ng" },
  { id: "c_9a3", name: "9A3", campusId: "lhl_main", teacher: "D\u01B0\u01A1ng Th\u1ECB Y\u1EBFn" },
  { id: "c_6g1", name: "6G1", campusId: "hau_loc", teacher: "\u0110\u1EB7ng Thanh T\xE2m" },
  { id: "c_6g2", name: "6G2", campusId: "hau_loc", teacher: "Tr\u1EA7n Qu\u1ED1c Vi\u1EC7t" },
  { id: "c_6g3", name: "6G3", campusId: "hau_loc", teacher: "Nguy\u1EC5n V\u0103n Ti\u1EBFn" },
  { id: "c_7g1", name: "7G1", campusId: "hau_loc", teacher: "V\u0169 Th\u1ECB Minh" },
  { id: "c_7g2", name: "7G2", campusId: "hau_loc", teacher: "Mai V\u0103n Qu\xE2n" },
  { id: "c_8g1", name: "8G1", campusId: "hau_loc", teacher: "Nguy\u1EC5n Th\u1ECB Oanh" },
  { id: "c_8g2", name: "8G2", campusId: "hau_loc", teacher: "L\xEA H\u1EEFu Trung" },
  { id: "c_8g3", name: "8G3", campusId: "hau_loc", teacher: "B\xF9i Th\u1ECB H\u1ED3ng" },
  { id: "c_9g1", name: "9G1", campusId: "hau_loc", teacher: "Phan V\u0103n B\xECnh" },
  { id: "c_9g2", name: "9G2", campusId: "hau_loc", teacher: "Nguy\u1EC5n Th\u1ECB Dung" },
  { id: "c_9g3", name: "9G3", campusId: "hau_loc", teacher: "T\u1EA1 Minh D\u0169ng" },
  { id: "c_6e1", name: "6E1", campusId: "loc_tan", teacher: "Ho\xE0ng Th\u1ECB Th\u1EA3o" },
  { id: "c_6e2", name: "6E2", campusId: "loc_tan", teacher: "L\xEA B\xE1 Chi\u1EBFn" },
  { id: "c_7e1", name: "7E1", campusId: "loc_tan", teacher: "Nguy\u1EC5n V\u0103n Ph\xFAc" },
  { id: "c_7e2", name: "7E2", campusId: "loc_tan", teacher: "\u0110\u1ED7 Th\u1ECB H\u1EA1nh" },
  { id: "c_8e1", name: "8E1", campusId: "loc_tan", teacher: "Tr\u1EA7n V\u0103n Tuy\u1EBFn" },
  { id: "c_8e2", name: "8E2", campusId: "loc_tan", teacher: "L\xEA Th\u1ECB Loan" },
  { id: "c_9e1", name: "9E1", campusId: "loc_tan", teacher: "Ph\u1EA1m V\u0103n Nam" },
  { id: "c_9e2", name: "9E2", campusId: "loc_tan", teacher: "V\u0169 Th\u1ECB Quy\xEAn" },
  { id: "c_6c1", name: "6C1", campusId: "loc_son", teacher: "Nguy\u1EC5n Th\u1ECB B\xEDch" },
  { id: "c_6c2", name: "6C2", campusId: "loc_son", teacher: "V\xF5 Minh H\u1EA3i" },
  { id: "c_7c1", name: "7C1", campusId: "loc_son", teacher: "L\xEA Th\u1ECB Nga" },
  { id: "c_7c2", name: "7C2", campusId: "loc_son", teacher: "\u0110inh Tr\u1ECDng H\xE0o" },
  { id: "c_8c1", name: "8C1", campusId: "loc_son", teacher: "B\xF9i Th\u1ECB Lan" },
  { id: "c_8c2", name: "8C2", campusId: "loc_son", teacher: "Tr\u1EA7n H\u1EEFu Th\u1EAFng" },
  { id: "c_9c1", name: "9C1", campusId: "loc_son", teacher: "Phan Th\u1ECB H\xF2a" },
  { id: "c_9c2", name: "9C2", campusId: "loc_son", teacher: "Nguy\u1EC5n V\u0103n \u0110\u1EA1t" },
  { id: "c_6d1", name: "6D1", campusId: "my_loc", teacher: "\u0110\u1ED7 Th\u1ECB Hu\u1EC7" },
  { id: "c_6d2", name: "6D2", campusId: "my_loc", teacher: "L\xEA V\u0103n Khi\xEAm" },
  { id: "c_7d1", name: "7D1", campusId: "my_loc", teacher: "Ho\xE0ng Th\u1ECB Ph\u01B0\u1EE3ng" },
  { id: "c_7d2", name: "7D2", campusId: "my_loc", teacher: "Tr\u1EA7n V\u0103n C\u1EA3nh" },
  { id: "c_8d1", name: "8D1", campusId: "my_loc", teacher: "Ph\u1EA1m Th\u1ECB Th\u1EAFm" },
  { id: "c_8d2", name: "8D2", campusId: "my_loc", teacher: "V\u0169 V\u0103n H\xE0o" },
  { id: "c_9d1", name: "9D1", campusId: "my_loc", teacher: "Nguy\u1EC5n Th\u1ECB L\u01B0\u01A1ng" },
  { id: "c_9d2", name: "9D2", campusId: "my_loc", teacher: "L\xEA \u0110\xECnh Trung" },
  { id: "c_6b1", name: "6B1", campusId: "thuan_loc", teacher: "Nguy\u1EC5n Th\u1ECB Mai Lan" },
  { id: "c_6b2", name: "6B2", campusId: "thuan_loc", teacher: "Tr\u1EA7n \u0110\xECnh Hi\u1EBFu" },
  { id: "c_6b3", name: "6B3", campusId: "thuan_loc", teacher: "L\xEA Th\u1ECB Ph\u01B0\u01A1ng" },
  { id: "c_7b1", name: "7B1", campusId: "thuan_loc", teacher: "Ph\u1EA1m V\u0103n Kh\xE1nh" },
  { id: "c_7b2", name: "7B2", campusId: "thuan_loc", teacher: "V\u0169 Th\u1ECB Th\xFAy" },
  { id: "c_7b3", name: "7B3", campusId: "thuan_loc", teacher: "B\xF9i V\u0103n H\u01B0ng" },
  { id: "c_8b1", name: "8B1", campusId: "thuan_loc", teacher: "\u0110\u1ED7 Th\u1ECB Tuy\u1EBFt" },
  { id: "c_8b2", name: "8B2", campusId: "thuan_loc", teacher: "Nguy\u1EC5n B\xE1 Long" },
  { id: "c_8b3", name: "8B3", campusId: "thuan_loc", teacher: "L\xEA Th\u1ECB H\u1EA3i" },
  { id: "c_9b1", name: "9B1", campusId: "thuan_loc", teacher: "V\u0169 V\u0103n Quy\u1EBFt" },
  { id: "c_9b2", name: "9B2", campusId: "thuan_loc", teacher: "Tr\u1ECBnh Th\u1ECB Li\xEAn" },
  { id: "c_9b3", name: "9B3", campusId: "thuan_loc", teacher: "Ho\xE0ng V\u0103n L\u1ED9c" }
];
const DEFAULT_TEACHER_USERS = INITIAL_CLASSES_SUMMARY.map((c) => {
  const cleanTeacherName = c.teacher.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
  const cleanClassName = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = c.id === "c_8d1" ? "thamhungml@gmail.com" : `gvcn.${cleanClassName}@gmail.com`;
  return {
    id: `u_gvcn_${c.id}`,
    name: c.teacher,
    role: "gvcn",
    campusId: c.campusId,
    classId: c.id,
    email,
    password: "Lhl@2026",
    title: `Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m l\u1EDBp ${c.name}`,
    isLocked: false
  };
});
function loadDB() {
  const allInitialUsers = [...DEFAULT_CORE_USERS, ...DEFAULT_TEACHER_USERS];
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      let modified = false;
      if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = allInitialUsers;
        modified = true;
      } else {
        for (const coreUser of DEFAULT_CORE_USERS) {
          const idx = parsed.users.findIndex(
            (u) => u.id === coreUser.id || u.email && coreUser.email && u.email.trim().toLowerCase() === coreUser.email.trim().toLowerCase()
          );
          if (idx === -1) {
            parsed.users.push({ ...coreUser });
            modified = true;
          } else {
            if (coreUser.id === "u_inspector") {
              if (parsed.users[idx].email !== "hoa.gvdn@gmail.com") {
                parsed.users[idx].email = "hoa.gvdn@gmail.com";
                modified = true;
              }
            }
            if (!parsed.users[idx].password || !parsed.users[idx].password.trim()) {
              parsed.users[idx].password = coreUser.password || "Lhl@2026";
              modified = true;
            }
          }
        }
        for (const tUser of DEFAULT_TEACHER_USERS) {
          const idx = parsed.users.findIndex(
            (u) => u.id === tUser.id || u.classId && u.classId === tUser.classId
          );
          if (idx === -1) {
            parsed.users.push({ ...tUser });
            modified = true;
          } else {
            if (tUser.id === "u_gvcn_c_8d1" || tUser.classId === "c_8d1") {
              if (parsed.users[idx].email !== "thamhungml@gmail.com") {
                parsed.users[idx].email = "thamhungml@gmail.com";
                modified = true;
              }
            } else if (!parsed.users[idx].email || !parsed.users[idx].email.trim()) {
              parsed.users[idx].email = tUser.email;
              modified = true;
            }
            if (!parsed.users[idx].password || !parsed.users[idx].password.trim()) {
              parsed.users[idx].password = "Lhl@2026";
              modified = true;
            }
          }
        }
        parsed.users = parsed.users.map((u) => {
          const isAdmin = u.role === "super_admin" || u.role === "admin" || u.id === "u_admin" || u.id === "u_admin_hung" || u.email && u.email.toLowerCase() === "lehuyhung.h2com@gmail.com";
          const defaultPassword = isAdmin ? "Admin@123" : "Lhl@2026";
          if (!u.password || typeof u.password !== "string" || !u.password.trim()) {
            modified = true;
            return { ...u, password: defaultPassword };
          }
          return u;
        });
      }
      if (!parsed.classes || !Array.isArray(parsed.classes)) {
        parsed.classes = [];
        modified = true;
      }
      if (!parsed.campuses || !Array.isArray(parsed.campuses)) {
        parsed.campuses = [];
        modified = true;
      }
      if (!parsed.criteria || !Array.isArray(parsed.criteria)) {
        parsed.criteria = [];
        modified = true;
      }
      if (!parsed.grades || !Array.isArray(parsed.grades) || parsed.grades.length === 0) {
        parsed.grades = [
          { id: "grade_6", grade: 6, name: "Kh\u1ED1i 6", order: 1, displayOrder: 1, status: "active" },
          { id: "grade_7", grade: 7, name: "Kh\u1ED1i 7", order: 2, displayOrder: 2, status: "active" },
          { id: "grade_8", grade: 8, name: "Kh\u1ED1i 8", order: 3, displayOrder: 3, status: "active" },
          { id: "grade_9", grade: 9, name: "Kh\u1ED1i 9", order: 4, displayOrder: 4, status: "active" }
        ];
        modified = true;
      }
      if (!parsed.scoreLogs || !Array.isArray(parsed.scoreLogs)) {
        parsed.scoreLogs = [];
        modified = true;
      }
      if (!parsed.settings) {
        parsed.settings = {
          schoolName: "Tr\u01B0\u1EDDng THCS L\xEA H\u1EEFu L\u1EADp",
          governingBody: "",
          academicYear: "2026-2027",
          dataMode: "production",
          current_active_week: 4,
          currentWeek: 4,
          totalWeeks: 35,
          totalWeeksSemester1: 18,
          totalWeeksSemester2: 17,
          max_weeks: 35
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
    console.error("Error reading server DB:", err);
  }
  const fallback = {
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
      { id: "grade_6", grade: 6, name: "Kh\u1ED1i 6", order: 1, displayOrder: 1, status: "active" },
      { id: "grade_7", grade: 7, name: "Kh\u1ED1i 7", order: 2, displayOrder: 2, status: "active" },
      { id: "grade_8", grade: 8, name: "Kh\u1ED1i 8", order: 3, displayOrder: 3, status: "active" },
      { id: "grade_9", grade: 9, name: "Kh\u1ED1i 9", order: 4, displayOrder: 4, status: "active" }
    ],
    scoreLogs: [],
    settings: {
      schoolName: "Tr\u01B0\u1EDDng THCS L\xEA H\u1EEFu L\u1EADp",
      governingBody: "",
      academicYear: "2026-2027",
      dataMode: "production",
      current_active_week: 4,
      currentWeek: 4,
      totalWeeks: 35,
      totalWeeksSemester1: 18,
      totalWeeksSemester2: 17,
      max_weeks: 35
    },
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveDB(fallback);
  return fallback;
}
function saveDB(data) {
  try {
    data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving server DB:", err);
  }
}
let db = loadDB();
function extractUser(req) {
  const id = req.headers["x-user-id"] || "u_admin";
  const name = req.headers["x-user-name"] || "Th\u1EA7y Nguy\u1EC5n V\u0103n S\u01A1n";
  let role = req.headers["x-user-role"] || "super_admin";
  const campusId = req.headers["x-user-campus"];
  const classId = req.headers["x-user-class"];
  if (role === "admin") role = "super_admin";
  if (role === "inspector") role = "tpt_doi";
  if (role === "campus_lead") role = "campus_admin";
  if (role === "teacher") role = "gvcn";
  if (role === "public") role = "viewer";
  return { id, name, role, campusId, classId };
}
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const user = extractUser(req);
    if (user.role === "super_admin") {
      return next();
    }
    if (allowedRoles.includes(user.role)) {
      return next();
    }
    res.status(403).json({
      success: false,
      message: `Quy\u1EC1n truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i. Thao t\xE1c n\xE0y y\xEAu c\u1EA7u quy\u1EC1n: ${allowedRoles.join(", ")}`
    });
  };
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    auditLogCount: db.auditLogs.length,
    appealCount: db.appeals.length,
    lockedWeeks: db.lockedWeeks,
    userCount: db.users.length,
    classesCount: db.classes ? db.classes.length : 0,
    scoreLogsCount: db.scoreLogs ? db.scoreLogs.length : 0
  });
});
app.get("/api/bootstrap", (_req, res) => {
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
    lastUpdated: db.lastUpdated
  });
});
app.get("/api/classes", (_req, res) => {
  res.json({
    success: true,
    total: db.classes ? db.classes.length : 0,
    data: db.classes || [],
    classes: db.classes || []
  });
});
app.post("/api/classes", (req, res) => {
  const newClass = req.body;
  if (!newClass || !newClass.name) {
    res.status(400).json({ success: false, message: "T\xEAn l\u1EDBp h\u1ECDc kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const id = newClass.id || `cls_${Date.now()}`;
  const classItem = { ...newClass, id };
  if (!db.classes) db.classes = [];
  db.classes.push(classItem);
  saveDB(db);
  res.json({ success: true, data: classItem, classes: db.classes });
});
app.put("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  if (!db.classes) db.classes = [];
  const idx = db.classes.findIndex((c) => c.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y l\u1EDBp h\u1ECDc" });
    return;
  }
  db.classes[idx] = { ...db.classes[idx], ...patch };
  saveDB(db);
  res.json({ success: true, data: db.classes[idx], classes: db.classes });
});
app.delete("/api/classes/:id", (req, res) => {
  const { id } = req.params;
  if (!db.classes) db.classes = [];
  const prevLen = db.classes.length;
  db.classes = db.classes.filter((c) => c.id !== id);
  if (db.classes.length !== prevLen) {
    saveDB(db);
  }
  res.json({ success: true, message: "\u0110\xE3 x\xF3a l\u1EDBp h\u1ECDc", classes: db.classes });
});
app.post("/api/classes/batch", (req, res) => {
  const { classes } = req.body;
  if (!Array.isArray(classes)) {
    res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u l\u1EDBp h\u1ECDc ph\u1EA3i l\xE0 m\u1ED9t m\u1EA3ng" });
    return;
  }
  db.classes = classes;
  saveDB(db);
  res.json({ success: true, count: db.classes.length, classes: db.classes });
});
app.get("/api/score-logs", (_req, res) => {
  res.json({
    success: true,
    total: db.scoreLogs ? db.scoreLogs.length : 0,
    data: db.scoreLogs || [],
    scoreLogs: db.scoreLogs || []
  });
});
app.post("/api/score-logs", (req, res) => {
  const logData = req.body;
  if (!logData || !logData.classId || !logData.criteriaId) {
    res.status(400).json({ success: false, message: "Th\xF4ng tin bi\xEAn b\u1EA3n thi \u0111ua kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const id = logData.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newLog = { ...logData, id };
  if (!db.scoreLogs) db.scoreLogs = [];
  db.scoreLogs.unshift(newLog);
  saveDB(db);
  res.json({ success: true, data: newLog, scoreLogs: db.scoreLogs });
});
app.put("/api/score-logs/:id", (req, res) => {
  const { id } = req.params;
  const { patch, ...directPatch } = req.body;
  const updates = patch || directPatch;
  if (!db.scoreLogs) db.scoreLogs = [];
  const idx = db.scoreLogs.findIndex((l) => l.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y bi\xEAn b\u1EA3n ch\u1EA5m \u0111i\u1EC3m" });
    return;
  }
  db.scoreLogs[idx] = { ...db.scoreLogs[idx], ...updates, lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString() };
  saveDB(db);
  res.json({ success: true, data: db.scoreLogs[idx], scoreLogs: db.scoreLogs });
});
app.delete("/api/score-logs/:id", (req, res) => {
  const { id } = req.params;
  if (!db.scoreLogs) db.scoreLogs = [];
  const prevLen = db.scoreLogs.length;
  db.scoreLogs = db.scoreLogs.filter((l) => l.id !== id);
  if (db.scoreLogs.length !== prevLen) {
    saveDB(db);
  }
  res.json({ success: true, message: "\u0110\xE3 x\xF3a bi\xEAn b\u1EA3n thi \u0111ua", scoreLogs: db.scoreLogs });
});
app.post("/api/score-logs/batch", (req, res) => {
  const { logs } = req.body;
  if (!Array.isArray(logs)) {
    res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u bi\xEAn b\u1EA3n ph\u1EA3i l\xE0 m\u1EA3ng" });
    return;
  }
  if (!db.scoreLogs) db.scoreLogs = [];
  const enriched = logs.map((log, idx) => ({
    ...log,
    id: log.id || `log_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`
  }));
  db.scoreLogs = [...enriched, ...db.scoreLogs];
  saveDB(db);
  res.json({ success: true, count: enriched.length, scoreLogs: db.scoreLogs });
});
app.post("/api/locks", (req, res) => {
  const { lockedWeeks, lockedMonths, lockedSemesters, lockedYear, lockedTitles } = req.body;
  if (Array.isArray(lockedWeeks)) db.lockedWeeks = lockedWeeks;
  if (lockedMonths !== void 0) db.lockedMonths = lockedMonths;
  if (lockedSemesters !== void 0) db.lockedSemesters = lockedSemesters;
  if (lockedYear !== void 0) db.lockedYear = lockedYear;
  if (lockedTitles !== void 0) db.lockedTitles = lockedTitles;
  saveDB(db);
  res.json({
    success: true,
    lockedWeeks: db.lockedWeeks,
    lockedMonths: db.lockedMonths,
    lockedSemesters: db.lockedSemesters,
    lockedYear: db.lockedYear,
    lockedTitles: db.lockedTitles
  });
});
app.get("/api/campuses", (_req, res) => {
  res.json({ success: true, data: db.campuses || [] });
});
app.post("/api/campuses", (req, res) => {
  const newCampus = req.body;
  if (!db.campuses) db.campuses = [];
  const id = newCampus.id || `camp_${Date.now()}`;
  db.campuses.push({ ...newCampus, id });
  saveDB(db);
  res.json({ success: true, data: db.campuses });
});
app.put("/api/campuses/:id", (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  if (!db.campuses) db.campuses = [];
  const idx = db.campuses.findIndex((c) => c.id === id);
  if (idx !== -1) {
    db.campuses[idx] = { ...db.campuses[idx], ...patch };
    saveDB(db);
  }
  res.json({ success: true, data: db.campuses });
});
app.delete("/api/campuses/:id", (req, res) => {
  const { id } = req.params;
  if (!db.campuses) db.campuses = [];
  db.campuses = db.campuses.filter((c) => c.id !== id);
  saveDB(db);
  res.json({ success: true, data: db.campuses });
});
app.get("/api/criteria", (_req, res) => {
  res.json({ success: true, data: db.criteria || [] });
});
app.post("/api/criteria", (req, res) => {
  const newCriteria = req.body;
  if (!db.criteria) db.criteria = [];
  const id = newCriteria.id || `crit_${Date.now()}`;
  db.criteria.push({ ...newCriteria, id });
  saveDB(db);
  res.json({ success: true, data: db.criteria });
});
app.put("/api/criteria/:id", (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  if (!db.criteria) db.criteria = [];
  const idx = db.criteria.findIndex((c) => c.id === id);
  if (idx !== -1) {
    db.criteria[idx] = { ...db.criteria[idx], ...patch };
    saveDB(db);
  }
  res.json({ success: true, data: db.criteria });
});
app.delete("/api/criteria/:id", (req, res) => {
  const { id } = req.params;
  if (!db.criteria) db.criteria = [];
  db.criteria = db.criteria.filter((c) => c.id !== id);
  saveDB(db);
  res.json({ success: true, data: db.criteria });
});
app.get("/api/periodic-bonuses", (_req, res) => {
  res.json({
    success: true,
    bonus_monthly: db.bonus_monthly || {},
    bonus_term: db.bonus_term || {},
    bonus_yearly: db.bonus_yearly || {}
  });
});
app.post("/api/periodic-bonuses", requireRole(["super_admin", "bgh", "tpt_doi", "admin"]), (req, res) => {
  const { type, key, points } = req.body;
  if (!type || !key) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu th\xF4ng tin lo\u1EA1i ho\u1EB7c kh\xF3a \u0111i\u1EC3m th\u01B0\u1EDFng" });
    return;
  }
  const numericPoints = Number(points) || 0;
  if (!db.bonus_monthly) db.bonus_monthly = {};
  if (!db.bonus_term) db.bonus_term = {};
  if (!db.bonus_yearly) db.bonus_yearly = {};
  if (type === "monthly") {
    db.bonus_monthly[key] = numericPoints;
  } else if (type === "term") {
    db.bonus_term[key] = numericPoints;
  } else if (type === "yearly") {
    db.bonus_yearly[key] = numericPoints;
  }
  const user = extractUser(req);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "CAP_NHAT_CAU_HINH",
    entityType: "periodic_bonus",
    entityId: `${type}_${key}`,
    details: `C\u1EADp nh\u1EADt \u0111i\u1EC3m th\u01B0\u1EDFng phong tr\xE0o ${type} (${key}): ${numericPoints} \u0111i\u1EC3m`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: "\u0110\xE3 l\u01B0u \u0111i\u1EC3m th\u01B0\u1EDFng phong tr\xE0o th\xE0nh c\xF4ng",
    bonus_monthly: db.bonus_monthly,
    bonus_term: db.bonus_term,
    bonus_yearly: db.bonus_yearly
  });
});
app.post("/api/auth/validate-login", (req, res) => {
  const { email, password, name, avatar } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    res.status(400).json({
      success: false,
      message: "Vui l\xF2ng cung c\u1EA5p \u0111\u1ECBa ch\u1EC9 Email \u0111\u0103ng nh\u1EADp."
    });
    return;
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    res.status(400).json({
      success: false,
      message: "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u."
    });
    return;
  }
  const cleanEmail = email.trim().toLowerCase();
  const inputPassword = password.trim();
  const matchedUser = db.users.find(
    (u) => (u.email || "").trim().toLowerCase() === cleanEmail
  );
  if (!matchedUser) {
    const failedLog = {
      id: `audit_${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userId: "unauthorized",
      userName: name || cleanEmail,
      userRole: "guest",
      action: "DANG_NHAP_THAT_BAI",
      entityType: "user",
      entityId: cleanEmail,
      beforeData: null,
      afterData: null,
      details: `\u0110\u0103ng nh\u1EADp b\u1ECB t\u1EEB ch\u1ED1i: Email [${cleanEmail}] ch\u01B0a \u0111\u01B0\u1EE3c \u0111\u0103ng k\xFD trong h\u1EC7 th\u1ED1ng.`
    };
    db.auditLogs.unshift(failedLog);
    saveDB(db);
    res.status(401).json({
      success: false,
      code: "UNAUTHORIZED_EMAIL",
      message: "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c! Vui l\xF2ng ki\u1EC3m tra l\u1EA1i."
    });
    return;
  }
  if (matchedUser.isLocked) {
    res.status(403).json({
      success: false,
      code: "ACCOUNT_LOCKED",
      message: `T\xE0i kho\u1EA3n "${matchedUser.name}" \u0111ang b\u1ECB KH\xD3A (${matchedUser.lockedReason || "Li\xEAn h\u1EC7 qu\u1EA3n tr\u1ECB vi\xEAn"}). Kh\xF4ng th\u1EC3 \u0111\u0103ng nh\u1EADp!`
    });
    return;
  }
  const isAdmin = matchedUser.role === "super_admin" || matchedUser.role === "admin" || matchedUser.id === "u_admin" || matchedUser.id === "u_admin_hung" || cleanEmail === "lehuyhung.h2com@gmail.com";
  const expectedPassword = matchedUser.password || (isAdmin ? "Admin@123" : "Lhl@2026");
  if (inputPassword !== expectedPassword) {
    const failedPassLog = {
      id: `audit_${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userId: matchedUser.id,
      userName: matchedUser.name,
      userRole: matchedUser.role,
      action: "DANG_NHAP_THAT_BAI",
      entityType: "user",
      entityId: matchedUser.id,
      beforeData: null,
      afterData: null,
      details: `\u0110\u0103ng nh\u1EADp th\u1EA5t b\u1EA1i: Sai m\u1EADt kh\u1EA9u cho t\xE0i kho\u1EA3n [${cleanEmail}].`
    };
    db.auditLogs.unshift(failedPassLog);
    saveDB(db);
    res.status(401).json({
      success: false,
      code: "INCORRECT_PASSWORD",
      message: "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c! Vui l\xF2ng ki\u1EC3m tra l\u1EA1i."
    });
    return;
  }
  if (!matchedUser.password) {
    matchedUser.password = expectedPassword;
  }
  matchedUser.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
  if (name && (!matchedUser.name || matchedUser.name.includes("Th\u1EA7y/C\xF4"))) {
    matchedUser.name = name;
  }
  if (avatar && !matchedUser.avatar) {
    matchedUser.avatar = avatar;
  }
  const successLog = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: matchedUser.id,
    userName: matchedUser.name,
    userRole: matchedUser.role,
    action: "DANG_NHAP",
    entityType: "user",
    entityId: matchedUser.id,
    campusId: matchedUser.campusId,
    classId: matchedUser.classId,
    beforeData: null,
    afterData: { email: cleanEmail, name: matchedUser.name, role: matchedUser.role },
    details: `${matchedUser.name} (${matchedUser.title}) \u0111\xE3 x\xE1c th\u1EF1c \u0111\u0103ng nh\u1EADp th\xE0nh c\xF4ng [${cleanEmail}].`
  };
  db.auditLogs.unshift(successLog);
  saveDB(db);
  res.json({
    success: true,
    message: `X\xE1c th\u1EF1c th\xE0nh c\xF4ng! Ch\xE0o m\u1EEBng ${matchedUser.name}.`,
    user: matchedUser,
    targetTab: "dashboard"
  });
});
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    total: db.users.length,
    data: db.users
  });
});
app.post("/api/users/update-email", (req, res) => {
  const { userId, classId, email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ success: false, message: "Email kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  const cleanEmail = email.trim();
  const idx = db.users.findIndex(
    (u) => userId && u.id === userId || classId && u.classId === classId
  );
  if (idx === -1) {
    res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng ho\u1EB7c l\u1EDBp h\u1ECDc t\u01B0\u01A1ng \u1EE9ng" });
    return;
  }
  const user = db.users[idx];
  const oldEmail = user.email;
  user.email = cleanEmail;
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: "admin",
    userName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
    userRole: "super_admin",
    action: "SUA_NGUOI_DUNG",
    entityType: "user",
    entityId: user.id,
    beforeData: { email: oldEmail },
    afterData: { email: cleanEmail },
    details: `Admin c\u1EADp nh\u1EADt email Google cho ${user.name} (${user.title}): ${oldEmail || "Ch\u01B0a c\xF3"} -> ${cleanEmail}`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: `\u0110\xE3 c\u1EADp nh\u1EADt email cho ${user.name} th\xE0nh c\xF4ng.`,
    user
  });
});
app.post("/api/users/change-password", (req, res) => {
  const { userId, email, currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({
      success: false,
      message: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7: M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i, M\u1EADt kh\u1EA9u m\u1EDBi v\xE0 X\xE1c nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi!"
    });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({
      success: false,
      message: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 t\u1ED1i thi\u1EC3u 6 k\xFD t\u1EF1!"
    });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({
      success: false,
      message: "M\u1EADt kh\u1EA9u m\u1EDBi v\xE0 X\xE1c nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi kh\xF4ng tr\xF9ng kh\u1EDBp nhau!"
    });
    return;
  }
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  const user = db.users.find(
    (u) => userId && u.id === userId || cleanEmail && u.email?.trim().toLowerCase() === cleanEmail
  );
  if (!user) {
    res.status(404).json({
      success: false,
      message: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng trong h\u1EC7 th\u1ED1ng!"
    });
    return;
  }
  const isAdmin = user.role === "super_admin" || user.role === "admin" || user.id === "u_admin" || user.id === "u_admin_hung" || user.email?.toLowerCase() === "lehuyhung.h2com@gmail.com";
  const expectedPassword = user.password || (isAdmin ? "Admin@123" : "Lhl@2026");
  if (currentPassword !== expectedPassword) {
    res.status(400).json({
      success: false,
      message: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c! Vui l\xF2ng th\u1EED l\u1EA1i."
    });
    return;
  }
  user.password = newPassword;
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "SUA_NGUOI_DUNG",
    entityType: "user",
    entityId: user.id,
    beforeData: null,
    afterData: null,
    details: `${user.name} (${user.title}) \u0111\xE3 th\u1EF1c hi\u1EC7n \u0111\u1ED5i m\u1EADt kh\u1EA9u c\xE1 nh\xE2n th\xE0nh c\xF4ng.`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng!",
    user
  });
});
app.post("/api/users/batch-update-emails", (req, res) => {
  const { assignments } = req.body;
  if (!Array.isArray(assignments)) {
    res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng danh s\xE1ch" });
    return;
  }
  let updatedCount = 0;
  assignments.forEach((item) => {
    if (!item.email) return;
    const cleanEmail = item.email.trim();
    const targetUser = db.users.find(
      (u) => item.id && u.id === item.id || item.classId && u.classId === item.classId
    );
    if (targetUser) {
      targetUser.email = cleanEmail;
      updatedCount++;
    }
  });
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: "admin",
    userName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
    userRole: "super_admin",
    action: "SUA_NGUOI_DUNG",
    entityType: "user",
    entityId: "batch_update_emails",
    details: `Admin \u0111\xE3 l\u01B0u c\u1EA5u h\xECnh email Google cho ${updatedCount} Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    updatedCount,
    message: `\u0110\xE3 l\u01B0u th\xE0nh c\xF4ng \u0111\u1ECBa ch\u1EC9 email cho ${updatedCount} t\xE0i kho\u1EA3n!`,
    data: db.users
  });
});
app.post("/api/users/sync-from-classes", (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    res.status(400).json({ success: false, message: "Danh s\xE1ch ng\u01B0\u1EDDi d\xF9ng kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  db.users = users.map((u) => {
    const isAdmin = u.role === "super_admin" || u.role === "admin" || u.id === "u_admin" || u.id === "u_admin_hung" || u.email && u.email.toLowerCase() === "lehuyhung.h2com@gmail.com";
    const defaultPass = isAdmin ? "Admin@123" : "Lhl@2026";
    const password = u.password && typeof u.password === "string" && u.password.trim() ? u.password.trim() : defaultPass;
    const email = u.id === "u_gvcn_c_8d1" || u.classId === "c_8d1" ? u.email && !u.email.includes("gvcn.8d1") ? u.email : "thamhungml@gmail.com" : u.email;
    return {
      ...u,
      email,
      password
    };
  });
  saveDB(db);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: "admin",
    userName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
    userRole: "super_admin",
    action: "SUA_NGUOI_DUNG",
    entityType: "user",
    entityId: "sync_users",
    details: `\u0110\xE3 \u0111\u1ED3ng b\u1ED9 l\u1EA1i danh s\xE1ch ${users.length} t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng t\u1EEB h\u1EC7 th\u1ED1ng v\u1EDBi m\u1EADt kh\u1EA9u \u0111\u1EA7y \u0111\u1EE7`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    total: db.users.length,
    message: `\u0110\xE3 l\u01B0u danh s\xE1ch ${db.users.length} t\xE0i kho\u1EA3n th\xE0nh c\xF4ng!`,
    data: db.users
  });
});
app.post("/api/users/update", (req, res) => {
  const { id, patch } = req.body;
  if (!id) {
    res.status(400).json({ success: false, message: "Thi\u1EBFu ID ng\u01B0\u1EDDi d\xF9ng" });
    return;
  }
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
    return;
  }
  db.users[idx] = { ...db.users[idx], ...patch };
  saveDB(db);
  res.json({ success: true, user: db.users[idx], users: db.users });
});
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const patch = req.body;
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng" });
    return;
  }
  db.users[idx] = { ...db.users[idx], ...patch };
  saveDB(db);
  res.json({ success: true, user: db.users[idx], users: db.users });
});
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const prevLen = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  if (db.users.length !== prevLen) {
    saveDB(db);
  }
  res.json({ success: true, message: "\u0110\xE3 x\xF3a ng\u01B0\u1EDDi d\xF9ng th\xE0nh c\xF4ng", users: db.users });
});
app.post("/api/users", (req, res) => {
  const user = req.body;
  if (!user || !user.name || !user.email) {
    res.status(400).json({ success: false, message: "Th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng kh\xF4ng \u0111\u1EA7y \u0111\u1EE7" });
    return;
  }
  const id = user.id || `u_${Date.now()}`;
  const newUser = { ...user, id };
  const existingIdx = db.users.findIndex((u) => u.id === id);
  if (existingIdx !== -1) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...newUser };
  } else {
    db.users.push(newUser);
  }
  saveDB(db);
  res.json({ success: true, user: newUser, users: db.users });
});
app.post("/api/users/add", (req, res) => {
  const user = req.body;
  if (!user || !user.name || !user.email) {
    res.status(400).json({ success: false, message: "Th\xF4ng tin ng\u01B0\u1EDDi d\xF9ng kh\xF4ng \u0111\u1EA7y \u0111\u1EE7" });
    return;
  }
  const id = user.id || `u_${Date.now()}`;
  const newUser = { ...user, id };
  db.users.push(newUser);
  saveDB(db);
  res.json({ success: true, user: newUser, users: db.users });
});
app.post("/api/users/batch", (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    res.status(400).json({ success: false, message: "Danh s\xE1ch ng\u01B0\u1EDDi d\xF9ng ph\u1EA3i l\xE0 m\u1EA3ng" });
    return;
  }
  db.users = users;
  saveDB(db);
  res.json({ success: true, count: db.users.length, users: db.users });
});
app.post("/api/users/ensure-passwords", (_req, res) => {
  let updatedCount = 0;
  db.users = db.users.map((u) => {
    const isAdmin = u.role === "super_admin" || u.role === "admin" || u.id === "u_admin" || u.id === "u_admin_hung" || u.email && u.email.toLowerCase() === "lehuyhung.h2com@gmail.com";
    const defaultPass = isAdmin ? "Admin@123" : "Lhl@2026";
    if (!u.password || typeof u.password !== "string" || !u.password.trim()) {
      u.password = defaultPass;
      updatedCount++;
    }
    if (u.id === "u_gvcn_c_8d1" || u.classId === "c_8d1") {
      if (!u.email || u.email.includes("gvcn.8d1")) {
        u.email = "thamhungml@gmail.com";
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
    users: db.users
  });
});
app.post("/api/users/clean-demo", (req, res) => {
  const allInitialUsers = [...DEFAULT_CORE_USERS, ...DEFAULT_TEACHER_USERS];
  const prevCount = db.users.length;
  db.users = allInitialUsers;
  saveDB(db);
  const removedCount = Math.max(0, prevCount - allInitialUsers.length);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: "admin",
    userName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
    userRole: "super_admin",
    action: "XOA_NGUOI_DUNG",
    entityType: "user",
    entityId: "clean_demo_users",
    details: `Admin \u0111\xE3 ho\xE0n t\xE1c v\xE0 l\xE0m s\u1EA1ch t\xE0i kho\u1EA3n m\u1EABu, b\u1EA3o to\xE0n ${allInitialUsers.length} t\xE0i kho\u1EA3n c\xE1n b\u1ED9 v\xE0 gi\xE1o vi\xEAn ch\xEDnh th\u1EE9c`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    removedCount,
    total: allInitialUsers.length,
    message: `\u0110\xE3 l\xE0m s\u1EA1ch t\xE0i kho\u1EA3n m\u1EABu. Gi\u1EEF l\u1EA1i ${allInitialUsers.length} t\xE0i kho\u1EA3n c\xE1n b\u1ED9 v\xE0 gi\xE1o vi\xEAn ch\xEDnh th\u1EE9c!`,
    data: allInitialUsers
  });
});
app.post("/api/admin/clear-test-data", requireRole(["super_admin", "admin", "bgh"]), (req, res) => {
  const user = req.user || { name: "Qu\u1EA3n tr\u1ECB vi\xEAn", role: "super_admin" };
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
    db.settings.dataMode = "production";
    db.settings.start_date_of_week_1 = "2026-08-31";
    db.settings.currentWeek = 7;
    db.settings.current_active_week = 7;
  }
  const auditEntry = {
    id: `audit_golive_clean_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id || "admin",
    userName: user.name || "Qu\u1EA3n tr\u1ECB vi\xEAn",
    userRole: user.role || "super_admin",
    action: "DON_DEP_DU_LIEU_CHAY_THU",
    entityType: "settings",
    entityId: "system_cleanup_golive",
    beforeData: {
      lockedWeeks: prevLockedWeeks,
      appealsCount: prevAppealsCount,
      historicalWeeksCount: prevHistoricalWeeks
    },
    afterData: {
      lockedWeeks: [],
      appealsCount: 0,
      historicalScoresCount: 0,
      dataMode: "production",
      status: "go_live_ready"
    },
    details: `${user.name} \u0111\xE3 th\u1EF1c hi\u1EC7n d\u1ECDn d\u1EB9p s\u1EA1ch d\u1EEF li\u1EC7u ch\u1EA1y th\u1EED: X\xF3a to\xE0n b\u1ED9 \u0111i\u1EC3m s\u1ED1, vi ph\u1EA1m, \u0111i\u1EC3m b\u1EA3o l\u01B0u, v\xE0 m\u1EDF kh\xF3a to\xE0n b\u1ED9 c\xE1c tu\u1EA7n. Gi\u1EEF nguy\xEAn 59 L\u1EDBp h\u1ECDc, 6 Ph\xE2n hi\u1EC7u, 71 T\xE0i kho\u1EA3n v\xE0 Danh m\u1EE5c ti\xEAu ch\xED thi \u0111ua s\u1EB5n s\xE0ng cho v\u1EADn h\xE0nh th\u1EADt.`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: "\u0110\xE3 d\u1ECDn d\u1EB9p s\u1EA1ch to\xE0n b\u1ED9 d\u1EEF li\u1EC7u ch\u1EA1y th\u1EED! H\u1EC7 th\u1ED1ng \u0111\xE3 s\u1EB5n s\xE0ng 100% cho gi\xE1o vi\xEAn v\xE0o nh\u1EADp li\u1EC7u th\u1EADt.",
    db: {
      lockedWeeks: db.lockedWeeks,
      usersCount: db.users.length,
      appealsCount: db.appeals.length,
      historicalScoresCount: Object.keys(db.historicalWeeklyScores).length,
      dataMode: db.settings?.dataMode || "production"
    }
  });
});
app.get("/api/settings", (_req, res) => {
  res.json({
    success: true,
    data: db.settings || null
  });
});
app.post("/api/settings", (req, res) => {
  const settingsData = req.body;
  if (!settingsData || typeof settingsData !== "object") {
    res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u c\u1EA5u h\xECnh kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  db.settings = { ...db.settings || {}, ...settingsData };
  saveDB(db);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: "admin",
    userName: "Qu\u1EA3n tr\u1ECB vi\xEAn",
    userRole: "super_admin",
    action: "CAP_NHAT_CAU_HINH",
    entityType: "system_settings",
    entityId: "settings",
    details: `Admin c\u1EADp nh\u1EADt th\xF4ng tin \u0111\u01A1n v\u1ECB & c\u1EA5u h\xECnh h\u1EC7 th\u1ED1ng: \u0110\u01A1n v\u1ECB c\u1EA5p tr\xEAn="${db.settings.governingBody || "\u0110\u1EC3 tr\u1ED1ng"}", Tr\u01B0\u1EDDng="${db.settings.schoolName || ""}"`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: "\u0110\xE3 l\u01B0u c\u1EA5u h\xECnh h\u1EC7 th\u1ED1ng th\xE0nh c\xF4ng!",
    data: db.settings
  });
});
app.get("/api/historical-scores", (_req, res) => {
  const scores = db.historicalWeeklyScores || db.settings?.historicalWeeklyScores || {};
  res.json({
    success: true,
    data: scores
  });
});
app.post("/api/historical-scores", requireRole(["super_admin", "bgh", "admin"]), (req, res) => {
  const { week, scores, lockWeek = true } = req.body;
  if (!week || typeof week !== "number" || !scores || typeof scores !== "object") {
    res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u \u0111i\u1EC3m b\u1EA3o l\u01B0u kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  if (!db.historicalWeeklyScores) {
    db.historicalWeeklyScores = {};
  }
  db.historicalWeeklyScores[week] = scores;
  if (db.settings) {
    db.settings.historicalWeeklyScores = db.historicalWeeklyScores;
  }
  if (lockWeek && Array.isArray(db.lockedWeeks)) {
    if (!db.lockedWeeks.includes(week)) {
      db.lockedWeeks.push(week);
      db.lockedWeeks.sort((a, b) => a - b);
    }
  }
  const classesCount = Object.keys(scores).length;
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: req.header("x-user-id") || "admin",
    userName: req.header("x-user-name") || "Qu\u1EA3n tr\u1ECB vi\xEAn / BGH",
    userRole: req.header("x-user-role") || "super_admin",
    action: "CAP_NHAT_CAU_HINH",
    entityType: "historical_scores",
    entityId: `week_${week}`,
    details: `Nh\u1EADp \u0111i\u1EC3m b\u1EA3o l\u01B0u l\u1ECBch s\u1EED cho ${classesCount} l\u1EDBp t\u1EA1i Tu\u1EA7n ${week}. \u0110\xE3 ghi nh\u1EADn l\xE0m \u0111i\u1EC3m t\u1ED5ng k\u1EBFt h\u1EE3p l\u1EC7 v\xE0 t\u1EF1 \u0111\u1ED9ng t\xEDnh v\xE0o X\u1EBFp h\u1EA1ng Th\xE1ng, H\u1ECDc k\u1EF3, C\u1EA3 n\u0103m.`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: `\u0110\xE3 l\u01B0u th\xE0nh c\xF4ng \u0111i\u1EC3m b\u1EA3o l\u01B0u l\u1ECBch s\u1EED cho ${classesCount} l\u1EDBp t\u1EA1i Tu\u1EA7n ${week}!`,
    data: db.historicalWeeklyScores,
    lockedWeeks: db.lockedWeeks
  });
});
app.delete("/api/historical-scores/:week", requireRole(["super_admin", "bgh", "admin"]), (req, res) => {
  const week = parseInt(req.params.week, 10);
  if (!week || isNaN(week)) {
    res.status(400).json({ success: false, message: "Tu\u1EA7n kh\xF4ng h\u1EE3p l\u1EC7" });
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: req.header("x-user-id") || "admin",
    userName: req.header("x-user-name") || "Qu\u1EA3n tr\u1ECB vi\xEAn / BGH",
    userRole: req.header("x-user-role") || "super_admin",
    action: "CAP_NHAT_CAU_HINH",
    entityType: "historical_scores",
    entityId: `week_${week}`,
    details: `\u0110\xE3 x\xF3a \u0111i\u1EC3m b\u1EA3o l\u01B0u l\u1ECBch s\u1EED c\u1EE7a Tu\u1EA7n ${week}. H\u1EC7 th\u1ED1ng s\u1EBD quay v\u1EC1 t\xEDnh \u0111i\u1EC3m theo bi\xEAn b\u1EA3n vi ph\u1EA1m chi ti\u1EBFt (n\u1EBFu c\xF3).`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: `\u0110\xE3 x\xF3a \u0111i\u1EC3m b\u1EA3o l\u01B0u Tu\u1EA7n ${week}!`,
    data: db.historicalWeeklyScores || {}
  });
});
app.get("/api/audit-logs", requireRole(["super_admin", "bgh"]), (req, res) => {
  const { action, role, userId, entityType, limit = "200" } = req.query;
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
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({
    success: true,
    total: logs.length,
    data: logs.slice(0, Number(limit))
  });
});
app.post("/api/audit-logs", (req, res) => {
  const user = extractUser(req);
  const logItem = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: req.body.action || "THAO_TAC_HE_THONG",
    entityType: req.body.entityType || "score_log",
    entityId: req.body.entityId || "none",
    campusId: req.body.campusId || user.campusId,
    classId: req.body.classId || user.classId,
    beforeData: req.body.beforeData ?? null,
    afterData: req.body.afterData ?? null,
    details: req.body.details || ""
  };
  db.auditLogs.unshift(logItem);
  if (db.auditLogs.length > 2e3) {
    db.auditLogs = db.auditLogs.slice(0, 2e3);
  }
  saveDB(db);
  res.json({ success: true, data: logItem });
});
app.get("/api/appeals", (req, res) => {
  const user = extractUser(req);
  let appeals = [...db.appeals];
  if (user.role === "gvcn" && user.classId) {
    appeals = appeals.filter((a) => a.classId === user.classId);
  } else if (user.role === "campus_admin" && user.campusId) {
    appeals = appeals.filter((a) => a.campusId === user.campusId);
  }
  appeals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: appeals });
});
app.post("/api/appeals", requireRole(["gvcn", "super_admin"]), (req, res) => {
  const user = extractUser(req);
  const appeal = {
    id: `appeal_${Date.now()}`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    classId: req.body.classId,
    className: req.body.className,
    campusId: req.body.campusId,
    campusName: req.body.campusName,
    teacherId: user.id,
    teacherName: user.name,
    week: Number(req.body.week),
    scoreLogId: req.body.scoreLogId || null,
    criteriaName: req.body.criteriaName || "\u0110i\u1EC3m thi \u0111ua",
    appealType: req.body.appealType || "adjust_score",
    reason: req.body.reason,
    evidenceNotes: req.body.evidenceNotes || "",
    proposedPoints: req.body.proposedPoints !== void 0 ? Number(req.body.proposedPoints) : 0,
    status: "pending"
  };
  db.appeals.unshift(appeal);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "GUI_DE_NGHI_DIEU_CHINH",
    entityType: "appeal",
    entityId: appeal.id,
    campusId: appeal.campusId,
    classId: appeal.classId,
    beforeData: null,
    afterData: appeal,
    details: `GVCN ${user.name} g\u1EEDi ph\u1EA3n h\u1ED3i/\u0111\u1EC1 ngh\u1ECB \u0111i\u1EC1u ch\u1EC9nh \u0111i\u1EC3m Tu\u1EA7n ${appeal.week} cho l\u1EDBp ${appeal.className}: ${appeal.reason}`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({ success: true, data: appeal });
});
app.put("/api/appeals/:id/review", requireRole(["super_admin", "bgh", "tpt_doi", "campus_admin"]), (req, res) => {
  const user = extractUser(req);
  const { id } = req.params;
  const { status, reviewNotes } = req.body;
  const idx = db.appeals.findIndex((a) => a.id === id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: "Kh\xF4ng t\xECm th\u1EA5y y\xEAu c\u1EA7u \u0111i\u1EC1u ch\u1EC9nh" });
    return;
  }
  const beforeAppeal = { ...db.appeals[idx] };
  db.appeals[idx] = {
    ...db.appeals[idx],
    status,
    reviewerId: user.id,
    reviewerName: user.name,
    reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
    reviewNotes: reviewNotes || ""
  };
  const action = status === "approved" ? "DUYET_DIEU_CHINH" : "TU_CHOI_DIEU_CHINH";
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType: "appeal",
    entityId: id,
    campusId: db.appeals[idx].campusId,
    classId: db.appeals[idx].classId,
    beforeData: beforeAppeal,
    afterData: db.appeals[idx],
    details: `${status === "approved" ? "Ch\u1EA5p thu\u1EADn" : "T\u1EEB ch\u1ED1i"} \u0111\u1EC1 ngh\u1ECB \u0111i\u1EC1u ch\u1EC9nh c\u1EE7a l\u1EDBp ${db.appeals[idx].className} (Tu\u1EA7n ${db.appeals[idx].week}). Ghi ch\xFA: ${reviewNotes || "Kh\xF4ng c\xF3"}`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({ success: true, data: db.appeals[idx] });
});
app.post("/api/datalock/toggle", requireRole(["super_admin", "bgh", "tpt_doi"]), (req, res) => {
  const user = extractUser(req);
  const week = Number(req.body.week);
  if (!week || week < 1 || week > 35) {
    res.status(400).json({ success: false, message: "S\u1ED1 tu\u1EA7n kh\xF4ng h\u1EE3p l\u1EC7 (1 - 35)" });
    return;
  }
  const isCurrentlyLocked = db.lockedWeeks.includes(week);
  const beforeWeeks = [...db.lockedWeeks];
  if (isCurrentlyLocked) {
    if (user.role !== "super_admin" && user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "T\u1EEB ch\u1ED1i truy c\u1EADp: Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn h\u1EC7 th\u1ED1ng m\u1EDBi c\xF3 quy\u1EC1n m\u1EDF kh\xF3a d\u1EEF li\u1EC7u \u0111\xE3 ch\u1ED1t."
      });
      return;
    }
    db.lockedWeeks = db.lockedWeeks.filter((w) => w !== week);
  } else {
    db.lockedWeeks = [...db.lockedWeeks, week].sort((a, b) => a - b);
  }
  const action = isCurrentlyLocked ? "MO_KHOA_TUAN" : "CHOT_DU_LIEU_TUAN";
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType: "week_lock",
    entityId: `week_${week}`,
    beforeData: { lockedWeeks: beforeWeeks, weekLocked: isCurrentlyLocked },
    afterData: { lockedWeeks: db.lockedWeeks, weekLocked: !isCurrentlyLocked },
    details: `${!isCurrentlyLocked ? "Kh\xF3a ch\u1ED1t d\u1EEF li\u1EC7u thi \u0111ua" : "M\u1EDF kh\xF3a s\u1EEDa \u0111\u1ED5i d\u1EEF li\u1EC7u"} Tu\u1EA7n ${week}`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    lockedWeeks: db.lockedWeeks,
    isLocked: !isCurrentlyLocked,
    message: !isCurrentlyLocked ? `\u0110\xE3 ch\u1ED1t kh\xF3a d\u1EEF li\u1EC7u Tu\u1EA7n ${week}` : `\u0110\xE3 m\u1EDF kh\xF3a d\u1EEF li\u1EC7u Tu\u1EA7n ${week}`
  });
});
app.post("/api/datalock/month", requireRole(["super_admin", "bgh", "tpt_doi"]), (req, res) => {
  const user = extractUser(req);
  const month = Number(req.body.month);
  const isLock = !!req.body.isLock;
  const notes = req.body.notes || "";
  const reason = req.body.reason || "";
  if (!month || month < 1 || month > 12) {
    res.status(400).json({ success: false, message: "Th\xE1ng kh\xF4ng h\u1EE3p l\u1EC7 (1 - 12)" });
    return;
  }
  if (!db.lockedMonths) db.lockedMonths = {};
  const beforeLock = db.lockedMonths[month] || null;
  if (!isLock) {
    if (user.role !== "super_admin" && user.role !== "admin") {
      res.status(403).json({ success: false, message: "Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn h\u1EC7 th\u1ED1ng m\u1EDBi c\xF3 quy\u1EC1n m\u1EDF kh\xF3a th\xE1ng \u0111\xE3 ch\u1ED1t." });
      return;
    }
    delete db.lockedMonths[month];
  } else {
    db.lockedMonths[month] = {
      month,
      academicYear: db.settings?.academicYear || "2026-2027",
      isLocked: true,
      lockedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lockedBy: { id: user.id, name: user.name, role: user.role, title: user.title },
      notes
    };
  }
  if (db.settings) {
    db.settings.lockedMonths = db.lockedMonths;
  }
  const action = isLock ? "CHOT_DU_LIEU_THANG" : "MO_KHOA_THANG";
  db.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType: "month_lock",
    entityId: `month_${month}`,
    reason: isLock ? void 0 : reason,
    beforeData: beforeLock,
    afterData: db.lockedMonths[month] || { month, isLocked: false },
    details: isLock ? `${user.name} \u0111\xE3 CH\u1ED0T KH\xD3A d\u1EEF li\u1EC7u Th\xE1ng ${month}` : `${user.name} \u0111\xE3 M\u1EDE KH\xD3A d\u1EEF li\u1EC7u Th\xE1ng ${month} - L\xFD do: ${reason}`
  });
  saveDB(db);
  res.json({
    success: true,
    lockedMonths: db.lockedMonths,
    message: isLock ? `\u0110\xE3 ch\u1ED1t kh\xF3a d\u1EEF li\u1EC7u Th\xE1ng ${month}` : `\u0110\xE3 m\u1EDF kh\xF3a d\u1EEF li\u1EC7u Th\xE1ng ${month}`
  });
});
app.get("/api/backup/download", requireRole(["super_admin", "bgh"]), (req, res) => {
  const user = extractUser(req);
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "SAO_LUU_HE_THONG",
    entityType: "settings",
    entityId: `server_backup_${Date.now()}`,
    beforeData: null,
    afterData: { appealsCount: db.appeals.length, auditLogsCount: db.auditLogs.length },
    details: `${user.name} t\u1EA3i t\u1EC7p sao l\u01B0u d\u1EEF li\u1EC7u m\xE1y ch\u1EE7 server_db.json`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.setHeader("Content-Disposition", `attachment; filename=server_db_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(db, null, 2));
});
app.post("/api/reset-database", requireRole(["super_admin"]), (req, res) => {
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "KHOI_PHUC_HE_THONG",
    entityType: "settings",
    entityId: `reset_db_${Date.now()}`,
    details: `${user.name} \u0111\xE3 kh\u1EDFi t\u1EA1o l\u1EA1i c\u01A1 s\u1EDF d\u1EEF li\u1EC7u ho\xE0n to\xE0n tr\u1ED1ng (gi\u1EEF c\u1EA5u tr\xFAc chu\u1EA9n 59 l\u1EDBp, x\xF3a to\xE0n b\u1ED9 \u0111i\u1EC3m s\u1ED1 nh\xE1p)`
  });
  saveDB(db);
  res.json({
    success: true,
    message: "\u0110\xE3 kh\u1EDFi t\u1EA1o l\u1EA1i c\u01A1 s\u1EDF d\u1EEF li\u1EC7u ho\xE0n to\xE0n TR\u1ED0NG (v\u1EC1 \u0111i\u1EC3m s\u1ED1 v\xE0 ch\u1ED1t kh\xF3a), s\u1EB5n s\xE0ng nh\u1EADp li\u1EC7u th\u1EF1c t\u1EBF chu\u1EA9n 59 l\u1EDBp!"
  });
});
const handleExportZip = async (_req, res) => {
  try {
    res.setHeader("Content-Disposition", 'attachment; filename="source_code_thcs_le_huu_lap.zip"');
    res.setHeader("Content-Type", "application/zip");
    const archiverModule = await import("archiver");
    const archiver = archiverModule.default || archiverModule;
    const archive = archiver("zip", {
      zlib: { level: 9 }
    });
    archive.on("error", (err) => {
      console.error("Archiver error:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "L\u1ED7i n\xE9n m\xE3 ngu\u1ED3n: " + err.message });
      }
    });
    archive.pipe(res);
    const rootDir = path.resolve(__dirname);
    archive.glob("**/*", {
      cwd: rootDir,
      ignore: [
        "node_modules/**",
        "dist/**",
        ".git/**",
        ".aistudio/**",
        ".cache/**",
        "server.js",
        "*.zip",
        ".DS_Store"
      ]
    });
    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "L\u1ED7i n\xE9n m\xE3 ngu\u1ED3n: " + err.message });
    }
  }
};
app.get("/api/export-zip", handleExportZip);
app.get("/api/download-source-zip", handleExportZip);
app.post("/api/backup/restore", requireRole(["super_admin"]), (req, res) => {
  const user = extractUser(req);
  const backupData = req.body;
  if (!backupData || typeof backupData !== "object") {
    res.status(400).json({ success: false, message: "D\u1EEF li\u1EC7u sao l\u01B0u kh\xF4ng h\u1EE3p l\u1EC7!" });
    return;
  }
  try {
    const backupDir = path.resolve(DATA_DIR, "snapshots");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.resolve(backupDir, `pre_restore_${Date.now()}.json`), JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Error creating pre-restore snapshot:", err);
  }
  const beforeLogs = db.auditLogs.length;
  if (Array.isArray(backupData.auditLogs)) db.auditLogs = backupData.auditLogs;
  if (Array.isArray(backupData.appeals)) db.appeals = backupData.appeals;
  if (Array.isArray(backupData.lockedWeeks)) db.lockedWeeks = backupData.lockedWeeks;
  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: "PHUC_HOI_HE_THONG",
    entityType: "settings",
    entityId: `server_restore_${Date.now()}`,
    beforeData: { auditLogsCount: beforeLogs },
    afterData: { auditLogsCount: db.auditLogs.length, appealsCount: db.appeals.length },
    details: `Super Admin ${user.name} kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u m\xE1y ch\u1EE7 t\u1EEB t\u1EC7p sao l\u01B0u`
  };
  db.auditLogs.unshift(auditEntry);
  saveDB(db);
  res.json({
    success: true,
    message: "Kh\xF4i ph\u1EE5c d\u1EEF li\u1EC7u m\xE1y ch\u1EE7 th\xE0nh c\xF4ng!",
    auditLogsCount: db.auditLogs.length,
    appealsCount: db.appeals.length,
    lockedWeeks: db.lockedWeeks
  });
});
async function startServer() {
  const distPath = path.resolve(__dirname, "dist");
  const hasDist = fs.existsSync(path.resolve(distPath, "index.html"));
  const isProd = (process.env.NODE_ENV === "production" || hasDist) && hasDist;
  if (isProd) {
    console.log(`[Production] Serving pre-built static bundle from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application bundle not found.");
      }
    });
  } else {
    console.log("[Development / Fallback] Initializing Vite middleware for dev mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const server = app.listen(PORT, HOST, () => {
    console.log(`THCS L\xEA H\u1EEFu L\u1EADp Full-Stack RBAC server listening on http://${HOST}:${PORT}`);
  });
  process.on("SIGTERM", () => {
    console.log("SIGTERM received: closing HTTP server gracefully");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    console.log("SIGINT received: closing HTTP server gracefully");
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
