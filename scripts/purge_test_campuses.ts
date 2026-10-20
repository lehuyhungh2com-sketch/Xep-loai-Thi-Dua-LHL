import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const DB_FILE = path.resolve(process.cwd(), 'data/server_db.json');

const DRAFT_CAMPUS_IDS = new Set(['thuan_loc', 'loc_son', 'my_loc', 'loc_tan', 'hau_loc']);

const DUPLICATE_USER_IDS_TO_REMOVE = new Set([
  'u_1792434390704',
  'u_1792434477860',
  'u_1792434522111',
  'u_1792434559212',
  'u_1792434597292',
  'u_1792434630740',
  'u_1792434664953',
  'u_1792434706015',
  'u_1792434740681',
  'u_1792434771524',
  'u_1792434798340',
  'u_1792434826384',
  'u_1792434853169',
]);

async function purgeFromFirestore(dbInstance: any, dbName: string) {
  console.log(`\n>>> ĐANG DỌN DẸP TRÊN FIRESTORE [${dbName}] <<<`);
  
  // 1. Dọn Classes
  const classesSnap = await getDocs(collection(dbInstance, 'classes'));
  const classesToDelete: any[] = [];
  const classesToKeep: any[] = [];

  classesSnap.docs.forEach((d) => {
    const data = d.data();
    if (DRAFT_CAMPUS_IDS.has(data.campusId)) {
      classesToDelete.push(d);
    } else {
      classesToKeep.push({ id: d.id, ...data });
    }
  });

  console.log(`- Classes tìm thấy: ${classesSnap.size}. Sẽ xóa: ${classesToDelete.length}, Giữ lại: ${classesToKeep.length}`);
  for (let i = 0; i < classesToDelete.length; i += 400) {
    const chunk = classesToDelete.slice(i, i + 400);
    const batch = writeBatch(dbInstance);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`✓ Đã xóa xong ${classesToDelete.length} lớp mẫu trên ${dbName}`);

  // 2. Dọn Users
  const usersSnap = await getDocs(collection(dbInstance, 'users'));
  const usersToDelete: any[] = [];
  const usersToKeep: any[] = [];

  usersSnap.docs.forEach((d) => {
    const data = d.data();
    const isDraftCampus = data.campusId && DRAFT_CAMPUS_IDS.has(data.campusId);
    const isDuplicate = DUPLICATE_USER_IDS_TO_REMOVE.has(d.id);

    if (isDraftCampus || isDuplicate) {
      usersToDelete.push(d);
    } else {
      usersToKeep.push({ id: d.id, ...data });
    }
  });

  console.log(`- Users tìm thấy: ${usersSnap.size}. Sẽ xóa: ${usersToDelete.length}, Giữ lại: ${usersToKeep.length}`);
  for (let i = 0; i < usersToDelete.length; i += 400) {
    const chunk = usersToDelete.slice(i, i + 400);
    const batch = writeBatch(dbInstance);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`✓ Đã xóa xong ${usersToDelete.length} tài khoản mẫu trên ${dbName}`);

  return { classesToKeep, usersToKeep };
}

async function main() {
  console.log('=== BẮT ĐẦU XÓA SẠCH TÀI KHOẢN VÀ LỚP HỌC MẪU CHẠY THỬ ===');
  
  const app = initializeApp(firebaseConfigJson);
  const dbDefault = getFirestore(app);
  const dbNamed = firebaseConfigJson.firestoreDatabaseId ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId) : null;

  const resultDefault = await purgeFromFirestore(dbDefault, 'DEFAULT_DB');
  if (dbNamed) {
    await purgeFromFirestore(dbNamed, `NAMED_DB: ${firebaseConfigJson.firestoreDatabaseId}`);
  }

  // 3. Dọn dẹp trong file server_db.json
  if (fs.existsSync(DB_FILE)) {
    console.log('\n>>> ĐANG ĐỒNG BỘ DỌN DẸP TỆP data/server_db.json <<<');
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const dbData = JSON.parse(raw);

    const prevClassCount = dbData.classes?.length || 0;
    const prevUserCount = dbData.users?.length || 0;

    // Giữ lại chỉ các lớp thuộc lhl_main
    dbData.classes = (dbData.classes || []).filter((c: any) => !DRAFT_CAMPUS_IDS.has(c.campusId));

    // Giữ lại chỉ các tài khoản không thuộc 5 phân hiệu mẫu và không phải duplicate
    dbData.users = (dbData.users || []).filter((u: any) => {
      if (u.campusId && DRAFT_CAMPUS_IDS.has(u.campusId)) return false;
      if (DUPLICATE_USER_IDS_TO_REMOVE.has(u.id)) return false;
      return true;
    });

    // Thêm log audit
    if (!Array.isArray(dbData.auditLogs)) dbData.auditLogs = [];
    dbData.auditLogs.unshift({
      id: `audit_purge_draft_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'u_admin_hung',
      userName: 'Lê Huy Hùng (Quản trị viên)',
      userRole: 'super_admin',
      action: 'XOA_DU_LIEU_MAU_PHAN_HIEU',
      entityType: 'settings',
      entityId: 'purge_draft_campuses',
      beforeData: { classesCount: prevClassCount, usersCount: prevUserCount },
      afterData: { classesCount: dbData.classes.length, usersCount: dbData.users.length },
      details: `Đã xóa sạch toàn bộ ${prevClassCount - dbData.classes.length} lớp mẫu và ${prevUserCount - dbData.users.length} tài khoản mẫu của 5 phân hiệu chạy thử (Thuần Lộc, Lộc Sơn, Mỹ Lộc, Lộc Tân, Hậu Lộc). Bảo tồn 12 lớp và tài khoản giáo viên thật phân hiệu Lê Hữu Lập.`,
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
    console.log(`✓ Đã cập nhật server_db.json: Lớp còn lại ${dbData.classes.length}, Tài khoản còn lại ${dbData.users.length}`);
  }

  console.log('\n=== HOÀN TẤT DỌN DẸP 100%! HỆ THỐNG ĐÃ SẠCH SẼ HOÀN TOÀN ===');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Lỗi thực hiện:', err);
  process.exit(1);
});
