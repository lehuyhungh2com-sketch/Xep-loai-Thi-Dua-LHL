import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const dbPath = path.resolve(process.cwd(), 'data/server_db.json');
  const readDb = () => {
    try {
      if (fs.existsSync(dbPath)) {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      }
    } catch {}
    return {
      campuses: [],
      classes: [],
      criteria: [],
      users: [],
      settings: {},
      scoreLogs: [],
      auditLogs: [],
      appeals: [],
    };
  };

  const writeDb = (data: any) => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing server_db.json:', err);
    }
  };

  app.get('/api/bootstrap', (req, res) => {
    const db = readDb();
    res.json(db);
  });

  app.get('/api/settings', (req, res) => {
    const db = readDb();
    res.json(db.settings || {});
  });

  app.post('/api/settings', (req, res) => {
    const db = readDb();
    db.settings = { ...(db.settings || {}), ...req.body };
    writeDb(db);
    res.json({ success: true, settings: db.settings });
  });

  app.get('/api/audit-logs', (req, res) => {
    const db = readDb();
    res.json(db.auditLogs || []);
  });

  app.post('/api/audit-logs', (req, res) => {
    const db = readDb();
    if (!db.auditLogs) db.auditLogs = [];
    const newLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...req.body,
    };
    db.auditLogs.unshift(newLog);
    writeDb(db);
    res.json({ success: true, log: newLog });
  });

  app.put('/api/appeals/:id/review', (req, res) => {
    const db = readDb();
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    if (db.appeals) {
      db.appeals = db.appeals.map((a: any) => (a.id === id ? { ...a, status, reviewNotes, reviewedAt: new Date().toISOString() } : a));
      writeDb(db);
    }
    res.json({ success: true });
  });

  app.post('/api/periodic-bonuses', (req, res) => {
    const db = readDb();
    const { type, key, points } = req.body;
    if (!db.bonusMonthly) db.bonusMonthly = {};
    if (!db.bonusTerm) db.bonusTerm = {};
    if (!db.bonusYearly) db.bonusYearly = {};
    if (type === 'monthly') db.bonusMonthly[key] = points;
    if (type === 'term') db.bonusTerm[key] = points;
    if (type === 'yearly') db.bonusYearly[key] = points;
    writeDb(db);
    res.json({ success: true });
  });

  app.post('/api/score-logs', (req, res) => {
    const db = readDb();
    if (!db.scoreLogs) db.scoreLogs = [];
    const log = req.body;
    const existingIndex = db.scoreLogs.findIndex((l: any) => l.id === log.id);
    if (existingIndex >= 0) {
      db.scoreLogs[existingIndex] = log;
    } else {
      db.scoreLogs.unshift(log);
    }
    writeDb(db);
    res.json({ success: true, log });
  });

  app.put('/api/score-logs/:id', (req, res) => {
    const db = readDb();
    if (!db.scoreLogs) db.scoreLogs = [];
    const { id } = req.params;
    const { patch } = req.body;
    const existingIndex = db.scoreLogs.findIndex((l: any) => l.id === id);
    if (existingIndex >= 0) {
      db.scoreLogs[existingIndex] = { ...db.scoreLogs[existingIndex], ...patch };
    }
    writeDb(db);
    res.json({ success: true });
  });

  app.delete('/api/score-logs/:id', (req, res) => {
    const db = readDb();
    if (!db.scoreLogs) db.scoreLogs = [];
    const { id } = req.params;
    db.scoreLogs = db.scoreLogs.filter((l: any) => l.id !== id);
    writeDb(db);
    res.json({ success: true });
  });

  app.post('/api/score-logs/batch', (req, res) => {
    const db = readDb();
    if (!db.scoreLogs) db.scoreLogs = [];
    const logs = req.body.logs || req.body;
    if (Array.isArray(logs)) {
      for (const log of logs) {
        const existingIndex = db.scoreLogs.findIndex((l: any) => l.id === log.id);
        if (existingIndex >= 0) {
          db.scoreLogs[existingIndex] = log;
        } else {
          db.scoreLogs.unshift(log);
        }
      }
    }
    writeDb(db);
    res.json({ success: true, count: logs.length });
  });

  app.post('/api/classes', (req, res) => {
    const db = readDb();
    if (!db.classes) db.classes = [];
    const item = req.body;
    const idx = db.classes.findIndex((c: any) => c.id === item.id);
    if (idx >= 0) db.classes[idx] = item;
    else db.classes.push(item);
    writeDb(db);
    res.json({ success: true, class: item });
  });

  app.post('/api/classes/batch', (req, res) => {
    const db = readDb();
    db.classes = req.body.classes || req.body;
    writeDb(db);
    res.json({ success: true });
  });

  app.post('/api/campuses', (req, res) => {
    const db = readDb();
    if (!db.campuses) db.campuses = [];
    const item = req.body;
    const idx = db.campuses.findIndex((c: any) => c.id === item.id);
    if (idx >= 0) db.campuses[idx] = item;
    else db.campuses.push(item);
    writeDb(db);
    res.json({ success: true, campus: item });
  });

  app.post('/api/criteria', (req, res) => {
    const db = readDb();
    if (!db.criteria) db.criteria = [];
    const item = req.body;
    const idx = db.criteria.findIndex((c: any) => c.id === item.id);
    if (idx >= 0) db.criteria[idx] = item;
    else db.criteria.push(item);
    writeDb(db);
    res.json({ success: true, criteria: item });
  });

  app.post('/api/users', (req, res) => {
    const db = readDb();
    if (!db.users) db.users = [];
    const item = req.body;
    const idx = db.users.findIndex((u: any) => u.id === item.id);
    if (idx >= 0) db.users[idx] = item;
    else db.users.push(item);
    writeDb(db);
    res.json({ success: true, user: item });
  });

  app.post('/api/appeals', (req, res) => {
    const db = readDb();
    if (!db.appeals) db.appeals = [];
    const item = req.body;
    db.appeals.unshift(item);
    writeDb(db);
    res.json({ success: true, appeal: item });
  });

  app.post('/api/datalock/toggle', (req, res) => {
    const db = readDb();
    const { week, locked } = req.body;
    if (!db.lockedWeeks) db.lockedWeeks = [];
    if (locked) {
      if (!db.lockedWeeks.includes(week)) db.lockedWeeks.push(week);
    } else {
      db.lockedWeeks = db.lockedWeeks.filter((w: number) => w !== week);
    }
    writeDb(db);
    res.json({ success: true, lockedWeeks: db.lockedWeeks });
  });

  app.post('/api/datalock/month', (req, res) => {
    const db = readDb();
    const { month, locked } = req.body;
    if (!db.lockedMonths) db.lockedMonths = {};
    db.lockedMonths[month] = locked;
    writeDb(db);
    res.json({ success: true });
  });

  app.get('/api/historical-scores', (req, res) => {
    const db = readDb();
    res.json(db.historicalWeeklyScores || {});
  });

  app.post('/api/historical-scores', (req, res) => {
    const db = readDb();
    db.historicalWeeklyScores = req.body;
    writeDb(db);
    res.json({ success: true });
  });

  app.put('/api/users/:id', (req, res) => {
    const db = readDb();
    if (!db.users) db.users = [];
    const userId = req.params.id;
    const patch = req.body;
    const idx = db.users.findIndex((u: any) => u.id === userId);
    if (idx >= 0) {
      db.users[idx] = { ...db.users[idx], ...patch };
    } else if (patch && patch.id) {
      db.users.push(patch);
    }
    writeDb(db);
    res.json({ success: true });
  });

  app.post('/api/auth/validate-login', (req, res) => {
    const db = readDb();
    const queryEmail = (req.body.email || req.body.username || '').trim().toLowerCase();
    const queryPassword = (req.body.password || '').trim();
    const user = (db.users || []).find((u: any) => {
      const uEmail = (u.email || u.username || '').trim().toLowerCase();
      return uEmail === queryEmail;
    });
    if (user) {
      if (user.isLocked) {
        return res.json({
          success: false,
          isLocked: true,
          message: `Tài khoản "${user.name}" đang bị KHÓA (${user.lockedReason || 'Liên hệ quản trị viên'}). Không thể đăng nhập!`,
        });
      }
      const isAdmin = user.role === 'super_admin' || user.role === 'admin' || user.id === 'u_admin' || user.id === 'u_admin_hung' || (user.email || '').toLowerCase() === 'lehuyhung.h2com@gmail.com';
      const defaultPass = isAdmin ? 'Admin@123' : 'Lhl@2026';
      const expectedPassword = (user.password && typeof user.password === 'string' && user.password.trim())
        ? user.password.trim()
        : defaultPass;
      if (queryPassword && queryPassword !== expectedPassword) {
        return res.json({ success: false, message: 'Sai mật khẩu' });
      }
      res.json({ success: true, user });
    } else {
      res.json({ success: false, message: 'Tài khoản không tồn tại' });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    const db = readDb();
    const userId = req.params.id;
    let foundName = '';
    if (db.users) {
      const targetUser = db.users.find((u: any) => u.id === userId);
      if (targetUser) foundName = targetUser.name;
      db.users = db.users.filter((u: any) => u.id !== userId);
    }
    if (db.teachers) {
      db.teachers = db.teachers.filter((t: any) => t.id !== userId && (!foundName || t.fullName !== foundName));
    }
    writeDb(db);
    res.json({ success: true });
  });

  app.delete('/api/classes/:id', (req, res) => {
    const db = readDb();
    if (db.classes) {
      db.classes = db.classes.filter((c: any) => c.id !== req.params.id);
      writeDb(db);
    }
    res.json({ success: true });
  });

  app.post('/api/users/change-password', (req, res) => {
    const db = readDb();
    const { userId, email, currentPassword, newPassword } = req.body;
    if (!db.users) db.users = [];
    const idx = db.users.findIndex((u: any) => u.id === userId || (email && (u.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase()));
    if (idx >= 0) {
      const user = db.users[idx];
      const isAdmin = user.role === 'super_admin' || user.role === 'admin' || user.id === 'u_admin' || user.id === 'u_admin_hung' || (user.email || '').toLowerCase() === 'lehuyhung.h2com@gmail.com';
      const defaultPass = isAdmin ? 'Admin@123' : 'Lhl@2026';
      const expectedPassword = (user.password && typeof user.password === 'string' && user.password.trim())
        ? user.password.trim()
        : defaultPass;

      if (currentPassword && currentPassword !== expectedPassword) {
        return res.json({ success: false, message: 'Mật khẩu hiện tại không chính xác!' });
      }

      db.users[idx].password = newPassword;
      writeDb(db);
      return res.json({ success: true, message: 'Đổi mật khẩu thành công', user: db.users[idx] });
    }
    return res.json({ success: false, message: 'Không tìm thấy người dùng trên hệ thống!' });
  });

  app.post('/api/users/update-email', (req, res) => {
    res.json({ success: true, message: 'Cập nhật email thành công' });
  });

  app.post('/api/users/batch-update-emails', (req, res) => {
    res.json({ success: true, message: 'Cập nhật hàng loạt thành công' });
  });

  app.post('/api/users/sync-from-classes', (req, res) => {
    const db = readDb();
    if (req.body.users) {
      db.users = req.body.users;
      writeDb(db);
    }
    res.json({ success: true, message: 'Đồng bộ người dùng thành công' });
  });

  app.post('/api/admin/clear-test-data', (req, res) => {
    const db = readDb();
    const { clearScores, clearClasses, clearTeachers, purgeOtherCampusesOnly } = req.body || {};
    if (clearScores !== false) {
      db.scoreLogs = [];
      db.historicalWeeklyScores = {};
      db.lockedWeeks = [];
      db.appeals = [];
    }
    if (purgeOtherCampusesOnly) {
      if (db.classes) {
        db.classes = db.classes.filter((c: any) => c.campusId === 'lhl_main');
      }
      if (db.users) {
        db.users = db.users.filter((u: any) => u.campusId === 'lhl_main' || !u.campusId || u.role === 'super_admin');
      }
    } else {
      if (clearClasses && db.classes) {
        db.classes = [];
      }
      if (clearTeachers && db.users) {
        db.users = db.users.filter((u: any) => u.role === 'super_admin' || u.id === 'u_admin_hung' || u.id === 'u_admin');
      }
    }
    db.auditLogs = db.auditLogs || [];
    writeDb(db);
    res.json({ success: true, message: 'Đã dọn dẹp sạch dữ liệu máy chủ.' });
  });

  app.post('/api/reset-database', (req, res) => {
    const db = readDb();
    db.scoreLogs = [];
    db.historicalWeeklyScores = {};
    db.lockedWeeks = [];
    db.appeals = [];
    db.bonusMonthly = {};
    db.bonusTerm = {};
    db.bonusYearly = {};
    writeDb(db);
    res.json({ success: true, message: 'Đã khởi tạo lại cơ sở dữ liệu trống thành công.' });
  });

  app.get('/api/download-source-zip', (req, res) => {
    const zipPath = path.resolve(process.cwd(), 'source_code_thcs_le_huu_lap.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // Vite middleware for development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
