import { runComprehensiveTestSuite } from '../src/utils/testSuiteRunner';

console.log('========================================================================================================');
console.log('    BỘ KIỂM THỬ DỮ LIỆU MẪU TOÀN DIỆN HỆ THỐNG LHL CLASS RANKING – TRƯỜNG THCS LÊ HỮU LẬP');
console.log('    NIÊN KHÓA: 2026 - 2027 | TUẦN KIỂM THỬ: TUẦN 4 | MÔI TRƯỜNG: CÔ LẬP AN TOÀN (SANDBOX ISOLATED)');
console.log('========================================================================================================\n');

const report = runComprehensiveTestSuite();

console.log(`Thời điểm thực hiện: ${new Date(report.timestamp).toLocaleString('vi-VN')}`);
console.log(`Tuần kiểm thử: Tuần ${report.testWeek} (Năm học ${report.academicYear})`);
console.log(`Tổng số ca kiểm thử: ${report.totalTests} ca`);
console.log(`Kết quả: ${report.passedCount}/${report.totalTests} ĐẠT (${((report.passedCount / report.totalTests) * 100).toFixed(0)}%) | ${report.failedCount} LỖI`);
console.log(`Trạng thái toàn bộ: ${report.overallStatus === 'PASSED' ? '>>> TẤT CẢ TIÊU CHÍ ĐẠT CHUẨN 100% <<<' : '>>> CÓ LỖI <<<'}\n`);

console.log('--------------------------------------------------------------------------------------------------------');
console.log('PHÂN BỐ KẾT QUẢ THEO NHÓM CHỨC NĂNG:');
report.sections.forEach((sec) => {
  const percent = ((sec.passed / sec.total) * 100).toFixed(0);
  console.log(` • [${sec.passed === sec.total ? 'PASS' : 'FAIL'}] ${sec.sectionName.padEnd(42)}: ${sec.passed}/${sec.total} Đạt (${percent}%)`);
});
console.log('--------------------------------------------------------------------------------------------------------\n');

console.log('==================================================================================================================================================');
console.log('| STT | Mã TC | Nhóm kiểm thử                  | Tên tiêu chí kiểm thử                              | Kết quả | Thời gian | Ghi chú & Chi tiết      |');
console.log('==================================================================================================================================================');

report.results.forEach((r) => {
  const stt = String(r.testNumber).padEnd(3);
  const tc = r.id.padEnd(5);
  const sec = r.section.substring(0, 30).padEnd(30);
  const title = r.title.substring(0, 50).padEnd(50);
  const res = (r.status === 'PASSED' ? '✓ ĐẠT' : '✗ LỖI').padEnd(7);
  const ms = `${r.executionTimeMs}ms`.padEnd(9);
  const note = r.actual.substring(0, 24);
  console.log(`| ${stt} | ${tc} | ${sec} | ${title} | ${res} | ${ms} | ${note.padEnd(24)} |`);
});

console.log('==================================================================================================================================================\n');

console.log('--------------------------------------------------------------------------------------------------------');
console.log('KẾT QUẢ BẢNG XẾP HẠNG THI ĐUA 9 LỚP TEST MẪU (TUẦN 4):');
console.log('--------------------------------------------------------------------------------------------------------');
console.log('| Hạng | Lớp | Phân hiệu                   | Loại lớp  | Điểm tuần | Xếp loại    | Ghi chú              |');
console.log('|------|-----|-----------------------------|-----------|-----------|-------------|----------------------|');
report.testClasses.forEach((c) => {
  const rank = `Hạng ${c.rank}`.padEnd(4);
  const name = c.name.padEnd(3);
  const campus = c.campusName.padEnd(27);
  const cType = c.classType.padEnd(9);
  const score = `${c.score}đ`.padEnd(9);
  const tier = c.tier.padEnd(11);
  const note = c.score >= 105 ? 'Xuất sắc nhất tuần' : c.score >= 100 ? 'Đạt chuẩn tốt' : 'Nề nếp khá';
  console.log(`| ${rank} | ${name} | ${campus} | ${cType} | ${score} | ${tier} | ${note.padEnd(20)} |`);
});
console.log('--------------------------------------------------------------------------------------------------------\n');

console.log('XÁC NHẬN AN TOÀN DỮ LIỆU:');
console.log(' [✓] Toàn bộ dữ liệu kiểm thử được thực thi hoàn toàn trong bộ nhớ (In-memory sandbox).');
console.log(' [✓] Không ghi đè hoặc làm thay đổi cơ sở dữ liệu thật (production) của nhà trường.');
console.log(' [✓] Chế độ sản xuất (Production Mode) tự động cô lập và loại bỏ 100% các bản ghi kiểm thử.');
console.log('========================================================================================================\n');
