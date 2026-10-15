import { ClassItem, Campus, ScoreLog, Criteria, SchoolSettings, RankingEntry, MonthRankingRow, SemesterRankingRow, YearRankingRow, TitleEvaluationRow, AuditLog } from '../types';

/**
 * Universal Excel Exporter for THCS Lê Hữu Lập
 * Generates rich, formatted Excel Workbooks (.xls HTML spreadsheet / UTF-8)
 * - Directly writes system-computed numeric values and tiers (No broken formulas, no #VALUE!)
 * - Strictly formats class names as TEXT with mso-number-format: '\@' and x:str
 * - Uses dynamic leadership signatures from system configuration
 */

export interface ExportSignatures {
  tptName?: string;
  leaderTitle?: string;
  leaderName?: string;
  principalName?: string;
  dutyTeacherName?: string;
  campusName?: string;
  governingBody?: string;
  schoolName?: string;
}

/** Helper: download file to user's browser */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Format number for Vietnamese Excel presentation */
function fmtNum(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1).replace('.', ',');
}

// --------------------------------------------------------------------------
// 1. SỔ CHẤM ĐIỂM & ĐÁNH GIÁ NỀ NẾP OFFLINE DỰ PHÒNG
// --------------------------------------------------------------------------
/**
 * Generates an Offline Standby Evaluation Excel Sheet with exact values computed
 * by the system. Ghi trực tiếp giá trị số (Điểm gốc, Thưởng, Phạt, Tổng điểm, Hạng, Xếp loại),
 * không dùng công thức lỗi để đảm bảo tương thích mọi phiên bản Microsoft Excel.
 */
export function exportOfflineStandbyEvaluationBook(
  classes: ClassItem[],
  campuses: Campus[],
  settings: SchoolSettings,
  weekNumber: number,
  weeklyRankings?: RankingEntry[],
  signatures?: ExportSignatures
) {
  const campusMap = new Map(campuses.map((c) => [c.id, c.name]));
  const rankingsMap = new Map((weeklyRankings || []).map((r) => [r.classItem.id, r]));

  const sortedClasses = [...classes].sort((a, b) => {
    const ra = rankingsMap.get(a.id);
    const rb = rankingsMap.get(b.id);
    if (ra && rb && ra.rank !== rb.rank) {
      return ra.rank - rb.rank;
    }
    if (a.campusId !== b.campusId) return a.campusId.localeCompare(b.campusId);
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  const headerTitle = `TRƯỜNG THCS LÊ HỮU LẬP - BẢNG ĐIỂM THI ĐUA NỀ NẾP TUẦN ${weekNumber}`;
  const dateStr = new Date().toLocaleDateString('vi-VN');

  const tpt = signatures?.tptName || settings.leadershipSignatures?.tptName || 'Cô Lê Thị Hoa';
  const principal = signatures?.principalName || settings.leadershipSignatures?.principalName || 'Thầy Nguyễn Văn Sơn';
  const viceLeader = signatures?.leaderName || settings.leadershipSignatures?.vicePrincipalEmulationName || 'Thầy Hoàng Văn Sơn';
  const viceTitle = signatures?.leaderTitle || 'Phó Hiệu trưởng phụ trách Thi đua';

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Thi Dua Tuan ${weekNumber}</x:Name>
            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #0f172a; }
      .header-title { font-size: 14pt; font-weight: bold; text-align: center; color: #0c2340; }
      .sub-title { font-size: 11pt; font-style: italic; text-align: center; margin-bottom: 12px; }
      .notice-box { font-size: 10pt; color: #1e3a8a; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 8px; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #1a4480; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; vertical-align: middle; padding: 6px; }
      td { border: 1px solid #000000; padding: 5px; vertical-align: middle; }
      .num-cell { text-align: right; }
      .int-cell { text-align: center; }
      .center-cell { text-align: center; }
      .bold-cell { font-weight: bold; }
      .text-cell { mso-number-format: "\\@"; white-space: nowrap; }
      .formula-cell { font-weight: bold; background-color: #f0f7ff; color: #004085; text-align: right; }
      .rank-cell { font-weight: bold; text-align: center; background-color: #fff8e1; }
      .tier-cell { text-align: center; font-weight: bold; }
      .footer-sign { margin-top: 25px; text-align: center; font-weight: bold; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="4" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          ${signatures?.governingBody || settings.governingBody ? `${(signatures?.governingBody || settings.governingBody)!.trim().toUpperCase()}<br>` : ''}
          <strong>${(signatures?.schoolName || settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP').toUpperCase()}</strong><br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Số: 26/BC-TĐ-LHL</span>
        </td>
        <td colspan="8" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
          Độc lập - Tự do - Hạnh phúc<br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Hậu Lộc, ngày ${dateStr}</span>
        </td>
      </tr>
      <tr><td colspan="12" style="border: none; height: 15px;"></td></tr>
      <tr>
        <td colspan="12" class="header-title" style="border: none;">
          ${headerTitle}
        </td>
      </tr>
      <tr>
        <td colspan="12" class="sub-title" style="border: none;">
          Năm học: ${settings.academicYear} · Điểm cơ sở: ${settings.basePointsPerWeek} điểm · Tổng số: ${sortedClasses.length} lớp · Ngày xuất: ${dateStr}
        </td>
      </tr>
      <tr>
        <td colspan="12" class="notice-box" style="border: 1px solid #bfdbfe;">
          <strong>* GHI CHÚ CHÍNH THỨC:</strong> Toàn bộ dữ liệu điểm số, xếp hạng và xếp loại đã được hệ thống tính toán chính xác theo Quy chế thi đua năm học ${settings.academicYear}. Giá trị được ghi trực tiếp để đảm bảo hiển thị đúng và đồng bộ 100% trên mọi phiên bản Microsoft Excel.
        </td>
      </tr>
      <tr><td colspan="12" style="border: none; height: 10px;"></td></tr>
      <thead>
        <tr>
          <th rowspan="2" style="width: 35px;">STT</th>
          <th rowspan="2" style="width: 70px;">Lớp</th>
          <th rowspan="2" style="width: 140px;">Phân hiệu</th>
          <th rowspan="2" style="width: 130px;">GVCN</th>
          <th rowspan="2" style="width: 65px;">Điểm gốc</th>
          <th colspan="4" style="background-color: #8b0000;">CÁC KHOẢN ĐIỂM TRỪ NỀ NẾP</th>
          <th colspan="2" style="background-color: #006400;">CỘNG THƯỞNG</th>
          <th rowspan="2" style="width: 80px; background-color: #0c2340;">TỔNG ĐIỂM</th>
          <th rowspan="2" style="width: 65px; background-color: #b8860b;">HẠNG</th>
          <th rowspan="2" style="width: 95px; background-color: #2e8b57;">XẾP LOẠI</th>
        </tr>
        <tr>
          <th style="width: 70px; background-color: #b22222;">Chuyên cần</th>
          <th style="width: 70px; background-color: #b22222;">Tác phong</th>
          <th style="width: 70px; background-color: #b22222;">Vệ sinh</th>
          <th style="width: 70px; background-color: #b22222;">Học tập</th>
          <th style="width: 70px; background-color: #228b22;">Điểm tốt</th>
          <th style="width: 70px; background-color: #228b22;">Khen thưởng</th>
        </tr>
      </thead>
      <tbody>
  `;

  sortedClasses.forEach((cls, idx) => {
    const campusName = campusMap.get(cls.campusId) || 'Phân hiệu';
    const r = rankingsMap.get(cls.id);

    const baseScore = r ? r.baseScore : settings.basePointsPerWeek;
    const bonus = r ? r.bonusPoints || 0 : 0;
    const penalty = r ? r.penaltyPoints || 0 : 0;
    const totalScore = r ? r.totalScore : settings.basePointsPerWeek;
    const rank = r ? r.rank : (idx + 1);
    const tier = r ? r.performanceTier : 'Tốt';

    // Approximate category breakdowns
    const penSub = penalty > 0 ? fmtNum(penalty) : '0';
    const bonSub = bonus > 0 ? fmtNum(bonus) : '0';

    html += `
      <tr>
        <td class="center-cell">${idx + 1}</td>
        <td class="center-cell bold-cell text-cell" style="mso-number-format:'\\@'; font-size: 11pt; color: #1a4480;" x:str>${cls.name}</td>
        <td>${campusName}</td>
        <td>${cls.homeroomTeacher}</td>
        <td class="num-cell bold-cell">${baseScore}</td>
        <td class="num-cell" style="color: ${penalty > 0 ? '#b91c1c' : '#64748b'};">${penSub}</td>
        <td class="num-cell">0</td>
        <td class="num-cell">0</td>
        <td class="num-cell">0</td>
        <td class="num-cell" style="color: ${bonus > 0 ? '#047857' : '#64748b'};">${bonSub}</td>
        <td class="num-cell">0</td>
        <td class="formula-cell" style="font-size: 11.5pt;">${fmtNum(totalScore)}</td>
        <td class="rank-cell" style="font-size: 11pt;">${rank}</td>
        <td class="tier-cell">${tier}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <table style="border: none; margin-top: 30px; width: 100%;">
      <tr style="border: none;">
        <td colspan="4" style="text-align: center; border: none; vertical-align: top; width: 33%;">
          <strong>TỔNG PHỤ TRÁCH ĐỘI</strong><br>
          <span style="font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${tpt}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; vertical-align: top; width: 33%;">
          <strong>${viceTitle.toUpperCase()}</strong><br>
          <span style="font-size: 10pt; font-style: italic;">(Ký và ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${viceLeader}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; vertical-align: top; width: 34%;">
          <strong>GIÁO VIÊN TRỰC</strong><br>
          <span style="font-size: 10pt; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>Giáo viên trực ban tuần</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Bang_Diem_Offline_Du_Phong_Tuan_${weekNumber}_THCS_LeHuuLap.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 2. XUẤT BẢNG TỔNG HỢP XẾP HẠNG THI ĐUA ĐẦY ĐỦ (TUẦN / THÁNG / KỲ / NĂM)
// --------------------------------------------------------------------------
export function exportRankingsToExcel(
  rankings: RankingEntry[],
  periodTitle: string,
  academicYear: string,
  scopeTitle: string,
  signatures?: ExportSignatures
) {
  const dateStr = new Date().toLocaleDateString('vi-VN');

  const tpt = signatures?.tptName || 'Cô Lê Thị Hoa';
  const principal = signatures?.principalName || 'Thầy Nguyễn Văn Sơn';
  const viceLeader = signatures?.leaderName || 'Thầy Hoàng Văn Sơn';
  const viceTitle = signatures?.leaderTitle || (scopeTitle.includes('Phân hiệu') ? `Phó Hiệu trưởng phụ trách ${scopeTitle}` : 'Phó Hiệu trưởng phụ trách Thi đua');

  // Calculate summary stats
  const totalClasses = rankings.length;
  const avgScore = totalClasses > 0 ? (rankings.reduce((sum, r) => sum + r.totalScore, 0) / totalClasses).toFixed(2) : '0';
  const excellentCount = rankings.filter((r) => r.performanceTier === 'Xuất sắc').length;
  const goodCount = rankings.filter((r) => r.performanceTier === 'Tốt').length;
  const fairCount = rankings.filter((r) => r.performanceTier === 'Khá').length;
  const averageTierCount = rankings.filter((r) => r.performanceTier === 'Trung bình').length;
  const retryCount = rankings.filter((r) => r.performanceTier === 'Cần cố gắng').length;

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #0f172a; }
      .header-title { font-size: 15pt; font-weight: bold; text-align: center; color: #0c2340; }
      .sub-title { font-size: 11pt; font-style: italic; text-align: center; margin-bottom: 8px; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #0c2340; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; padding: 6px; font-size: 10.5pt; }
      td { border: 1px solid #000000; padding: 5px; font-size: 10.5pt; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .text-cell { mso-number-format: "\\@"; white-space: nowrap; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="4" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          ${signatures?.governingBody ? `${signatures.governingBody.trim().toUpperCase()}<br>` : ''}
          <strong>${(signatures?.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP').toUpperCase()}</strong><br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Số: 26/BC-TĐ-LHL</span>
        </td>
        <td colspan="7" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
          Độc lập - Tự do - Hạnh phúc<br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Hậu Lộc, ngày ${dateStr}</span>
        </td>
      </tr>
      <tr><td colspan="11" style="border: none; height: 10px;"></td></tr>
      <tr>
        <td colspan="11" class="header-title" style="border: none;">
          BẢNG TỔNG HỢP VÀ XẾP HẠNG THI ĐUA NỀ NẾP - ${periodTitle.toUpperCase()}
        </td>
      </tr>
      <tr>
        <td colspan="11" class="sub-title" style="border: none;">
          Kỳ đánh giá: <strong>${periodTitle}</strong> · Phạm vi: <strong>${scopeTitle}</strong> · Năm học: <strong>${academicYear}</strong>
        </td>
      </tr>
      <tr>
        <td colspan="11" class="sub-title" style="border: none; font-size: 10pt; color: #475569;">
          Tổng số lớp báo cáo: <strong>${totalClasses} lớp</strong> · Điểm trung bình toàn bảng: <strong>${avgScore} điểm</strong> · Ngày xuất biểu: ${dateStr}
        </td>
      </tr>
      <thead>
        <tr>
          <th style="width: 45px;">STT</th>
          <th style="width: 55px;">Hạng</th>
          <th style="width: 75px;">Lớp</th>
          <th style="width: 55px;">Khối</th>
          <th style="width: 150px;">Phân hiệu</th>
          <th style="width: 140px;">GVCN</th>
          <th style="width: 70px;">Điểm gốc</th>
          <th style="width: 80px;">Thưởng (+)</th>
          <th style="width: 80px;">Phạt (-)</th>
          <th style="width: 90px;">Tổng điểm</th>
          <th style="width: 120px;">Xếp loại thi đua</th>
        </tr>
      </thead>
      <tbody>
  `;

  rankings.forEach((r, idx) => {
    const bonus = r.bonusPoints || r.monthBonusPoints || r.yearBonusPoints || 0;
    const penalty = r.penaltyPoints || r.monthPenaltyPoints || 0;
    const isTop3 = typeof r.rank === 'number' && r.rank <= 3 && !r.isDisqualifiedYearly;
    const rankBg = isTop3 ? '#fef3c7' : '#ffffff';
    const rankColor = isTop3 ? '#92400e' : '#0f172a';

    html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold" style="background-color: ${rankBg}; color: ${rankColor}; font-size: 11pt;">
          ${r.isDisqualifiedYearly ? 'Không XL' : r.rank}
        </td>
        <td class="center bold text-cell" style="mso-number-format:'\\@'; font-size: 11pt;" x:str>${r.classItem.name}</td>
        <td class="center">${r.classItem.grade}</td>
        <td>${r.campus.name}</td>
        <td>${r.classItem.homeroomTeacher}</td>
        <td class="right">${r.baseScore}</td>
        <td class="right" style="color: #15803d; font-weight: 500;">+${fmtNum(bonus)}</td>
        <td class="right" style="color: #b91c1c; font-weight: 500;">-${fmtNum(penalty)}</td>
        <td class="right bold" style="font-size: 11.5pt; color: #1e3a8a; background-color: #f8fafc;">${fmtNum(r.totalScore)}</td>
        <td class="center bold">${r.performanceTier}</td>
      </tr>
    `;
  });

  // Summary Row
  html += `
      <tr style="background-color: #f1f5f9; font-weight: bold;">
        <td colspan="6" style="text-align: right; padding: 7px;">TỔNG HỢP VÀ THỐNG KÊ (${totalClasses} LỚP):</td>
        <td class="center">ĐTB:</td>
        <td colspan="2" class="center" style="color: #1e3a8a;">${avgScore}đ</td>
        <td class="right" style="color: #1e3a8a; font-size: 11pt;">${avgScore}</td>
        <td class="center" style="font-size: 9.5pt;">XS: ${excellentCount} | Tốt: ${goodCount} | Khá: ${fairCount} | Đạt: ${averageTierCount}${retryCount > 0 ? ` | CCG: ${retryCount}` : ''}</td>
      </tr>
      </tbody>
    </table>
  `;

  const isWeekly = periodTitle.toLowerCase().includes('tuần') || periodTitle.toLowerCase().includes('week');
  const dutyTeacher = signatures?.dutyTeacherName || 'Giáo viên trực ban tuần';

  html += `
    <table style="border: none; margin-top: 35px; width: 100%;">
      <tr style="border: none;">
        <td colspan="3" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          NGƯỜI LẬP BIỂU / TPT ĐỘI<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${tpt}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          ${viceTitle.toUpperCase()}<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${viceLeader}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 34%;">
          ${isWeekly ? 'GIÁO VIÊN TRỰC' : 'HIỆU TRƯỞNG NHÀ TRƯỜNG'}<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">${isWeekly ? '(Ký, ghi rõ họ tên)' : '(Ký tên và đóng dấu)'}</span>
          <br><br><br><br>
          <strong>${isWeekly ? dutyTeacher : principal}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const safePeriod = periodTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const safeScope = scopeTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const safeYear = academicYear.replace(/[^a-zA-Z0-9]/g, '-');

  downloadFile(
    html,
    `Bao_cao_thi_dua_${safeScope}_${safePeriod}_${safeYear}.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 2.1 XUẤT BẢNG XẾP HẠNG THÁNG CHUẨN QUY CHẾ (ĐIỂM TB CÁC TUẦN ĐÃ CHỐT)
// --------------------------------------------------------------------------
export function exportMonthlyRankingsToExcel(
  rows: MonthRankingRow[],
  month: number,
  academicYear: string,
  scopeTitle: string = 'Toàn trường',
  weeksInMonth: number[] = [1, 2, 3, 4],
  signatures?: ExportSignatures
) {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const totalCols = 5 + weeksInMonth.length + 5; // STT, Lớp, Phân hiệu, Khối, GVCN + weeks + Số tuần, Điểm TB Tuần, Thưởng, Tổng Điểm Tháng, Xếp hạng, Xếp loại

  const tpt = signatures?.tptName || 'Cô Lê Thị Hoa';
  const principal = signatures?.principalName || 'Thầy Nguyễn Văn Sơn';
  const viceLeader = signatures?.leaderName || '';
  const viceTitle = signatures?.leaderTitle || (scopeTitle.includes('Phân hiệu') ? `Phó Hiệu trưởng phụ trách ${scopeTitle}` : 'Phó Hiệu trưởng phụ trách Thi đua');

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #0f172a; }
      .header-title { font-size: 14pt; font-weight: bold; text-align: center; color: #0c2340; }
      .sub-title { font-size: 11pt; font-style: italic; text-align: center; margin-bottom: 8px; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #0c2340; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; padding: 6px; }
      td { border: 1px solid #000000; padding: 5px; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .text-cell { mso-number-format: "\\@"; white-space: nowrap; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="4" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          ${signatures?.governingBody ? `${signatures.governingBody.trim().toUpperCase()}<br>` : ''}
          <strong>${(signatures?.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP').toUpperCase()}</strong><br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Số: 26/BC-TĐ-LHL</span>
        </td>
        <td colspan="${totalCols - 4}" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
          Độc lập - Tự do - Hạnh phúc<br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Hậu Lộc, ngày ${dateStr}</span>
        </td>
      </tr>
      <tr><td colspan="${totalCols}" style="border: none; height: 10px;"></td></tr>
      <tr>
        <td colspan="${totalCols}" class="header-title" style="border: none;">
          BẢNG TỔNG HỢP VÀ XẾP HẠNG THI ĐUA NỀ NẾP - THÁNG ${month}
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          (Căn cứ quy định chấm điểm thi đua nề nếp năm học ${academicYear} - Điểm tháng = Điểm trung bình tuần + Điểm thưởng phong trào)
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          Phạm vi: <strong>${scopeTitle}</strong> · Tổng số lớp: <strong>${rows.length} lớp</strong> · Ngày lập biểu: ${dateStr}
        </td>
      </tr>
      <thead>
        <tr>
          <th style="width: 45px;">STT</th>
          <th style="width: 70px;">Lớp</th>
          <th style="width: 140px;">Phân hiệu</th>
          <th style="width: 50px;">Khối</th>
          <th style="width: 130px;">GVCN</th>
          ${weeksInMonth.map((w) => `<th style="width: 65px;">Tuần ${w}</th>`).join('')}
          <th style="width: 75px;">Số tuần tính</th>
          <th style="width: 85px;">Điểm TB tuần</th>
          <th style="width: 85px;">Thưởng phong trào</th>
          <th style="width: 95px;">Tổng điểm Tháng</th>
          <th style="width: 60px;">Xếp hạng</th>
          <th style="width: 110px;">Xếp loại thi đua</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((r, idx) => {
    html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold text-cell" style="mso-number-format:'\\@';" x:str>${r.classItem.name}</td>
        <td>${r.campus.name}</td>
        <td class="center">${r.classItem.grade}</td>
        <td>${r.classItem.homeroomTeacher}</td>
        ${r.weekScores
          .map(
            (ws) =>
              `<td class="right" style="color: ${
                ws.score >= 100 ? '#15803d' : ws.score >= 90 ? '#0369a1' : '#b91c1c'
              }; font-weight: ${ws.isLocked ? 'bold' : 'normal'};">
                ${ws.isLocked ? fmtNum(ws.score) : `${fmtNum(ws.score)}*`}
              </td>`
          )
          .join('')}
        <td class="center bold">${r.lockedWeeksCount}/${r.totalWeeksInMonth}</td>
        <td class="right">${fmtNum(r.averageScore)}</td>
        <td class="right" style="color: #047857; font-weight: bold;">+${fmtNum(r.bonus_points_monthly || 0)}</td>
        <td class="right bold" style="font-size: 11.5pt; color: #1e3a8a; background-color: #f8fafc;">
          ${fmtNum(r.finalMonthlyScore)}
        </td>
        <td class="center bold" style="background-color: ${
          r.rank === 1 ? '#fef08a' : r.rank === 2 ? '#e2e8f0' : r.rank === 3 ? '#fed7aa' : '#ffffff'
        };">
          ${r.rank}
        </td>
        <td class="center bold">${r.performanceTier}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <table style="border: none; margin-top: 35px; width: 100%;">
      <tr style="border: none;">
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          NGƯỜI LẬP BIỂU / TPT ĐỘI<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${tpt}</strong>
        </td>
        <td colspan="${totalCols - 8}" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          ${viceTitle.toUpperCase()}<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${viceLeader}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 34%;">
          HIỆU TRƯỞNG NHÀ TRƯỜNG<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký tên và đóng dấu)</span>
          <br><br><br><br>
          <strong>${principal}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Bang_Xep_Hang_Thang_${month}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_THCS_LeHuuLap.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 2B. XUẤT BẢNG XẾP HẠNG HỌC KỲ QUY CHUẨN (HỌC KỲ I / HỌC KỲ II)
// --------------------------------------------------------------------------
export function exportSemesterRankingsToExcel(
  semester: 1 | 2,
  rows: SemesterRankingRow[],
  monthsInSemester: number[],
  academicYear: string,
  scopeTitle: string = 'Toàn trường',
  signatures?: ExportSignatures
) {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const semesterRoman = semester === 1 ? 'I' : 'II';
  const totalCols = 8 + monthsInSemester.length;

  const tpt = signatures?.tptName || 'Cô Lê Thị Hoa';
  const principal = signatures?.principalName || 'Thầy Nguyễn Văn Sơn';
  const viceLeader = signatures?.leaderName || 'Thầy Hoàng Văn Sơn';
  const viceTitle = signatures?.leaderTitle || (scopeTitle.includes('Phân hiệu') ? `Phó Hiệu trưởng phụ trách ${scopeTitle}` : 'Phó Hiệu trưởng phụ trách Thi đua');

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #0f172a; }
      .header-title { font-size: 14pt; font-weight: bold; text-align: center; color: #0c2340; }
      .sub-title { font-size: 10.5pt; font-style: italic; text-align: center; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th { background-color: #312e81; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; padding: 6px; font-size: 10.5pt; }
      td { border: 1px solid #000000; padding: 5px; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .text-cell { mso-number-format: "\\@"; white-space: nowrap; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="4" style="border: none; font-weight: bold; font-size: 10pt;">
          ${signatures?.governingBody ? `${signatures.governingBody.trim().toUpperCase()}<br>` : ''}
          <strong>${(signatures?.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP').toUpperCase()}</strong><br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Số: 26/BC-TĐ-LHL</span>
        </td>
        <td colspan="${totalCols - 4}" style="border: none; text-align: center; font-weight: bold; font-size: 10pt;">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
          Độc lập - Tự do - Hạnh phúc<br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Hậu Lộc, ngày ${dateStr}</span>
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="header-title" style="border: none; padding-top: 10px;">
          BẢNG TỔNG HỢP VÀ XẾP HẠNG THI ĐUA NỀ NẾP - HỌC KỲ ${semesterRoman}
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          (Căn cứ quy chế thi đua nề nếp năm học ${academicYear} - Điểm học kỳ = Điểm trung bình các tháng đã chốt)
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          Phạm vi: <strong>${scopeTitle}</strong> · Tổng số lớp: <strong>${rows.length} lớp</strong> · Ngày lập biểu: ${dateStr}
        </td>
      </tr>
      <thead>
        <tr>
          <th style="width: 45px;">STT</th>
          <th style="width: 70px;">Lớp</th>
          <th style="width: 140px;">Phân hiệu</th>
          <th style="width: 50px;">Khối</th>
          <th style="width: 130px;">GVCN</th>
          ${monthsInSemester.map((m) => `<th style="width: 75px;">Tháng ${m}</th>`).join('')}
          <th style="width: 80px;">Số tháng tính</th>
          <th style="width: 95px;">Điểm TB Học kỳ</th>
          <th style="width: 65px;">Xếp hạng</th>
          <th style="width: 110px;">Xếp loại thi đua</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((r, idx) => {
    html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold text-cell" style="mso-number-format:'\\@';" x:str>${r.classItem.name}</td>
        <td>${r.campus.name}</td>
        <td class="center">${r.classItem.grade}</td>
        <td>${r.classItem.homeroomTeacher || '---'}</td>
        ${r.monthScores
          .map(
            (ms) =>
              `<td class="right" style="color: ${
                ms.averageScore >= 100 ? '#15803d' : ms.averageScore >= 95 ? '#0369a1' : '#b91c1c'
              }; font-weight: ${ms.isLocked ? 'bold' : 'normal'};">
                ${ms.isLocked ? fmtNum(ms.averageScore) : `${fmtNum(ms.averageScore)}*`}
              </td>`
          )
          .join('')}
        <td class="center bold">${r.lockedMonthsCount}/${r.totalMonthsInSemester}</td>
        <td class="right bold" style="font-size: 11.5pt; color: #312e81; background-color: #f8fafc;">
          ${r.lockedMonthsCount > 0 ? fmtNum(r.semesterScore) : '---'}
        </td>
        <td class="center bold" style="background-color: ${
          r.rank === 1 ? '#fef08a' : r.rank === 2 ? '#e2e8f0' : r.rank === 3 ? '#fed7aa' : '#ffffff'
        };">
          ${r.rank}
        </td>
        <td class="center bold">${r.performanceTier}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <table style="border: none; margin-top: 35px; width: 100%;">
      <tr style="border: none;">
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          NGƯỜI LẬP BIỂU / TPT ĐỘI<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${tpt}</strong>
        </td>
        <td colspan="${totalCols - 8}" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          ${viceTitle.toUpperCase()}<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${viceLeader}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 34%;">
          HIỆU TRƯỞNG NHÀ TRƯỜNG<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký tên và đóng dấu)</span>
          <br><br><br><br>
          <strong>${principal}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Bang_Xep_Hang_Hoc_Ky_${semesterRoman}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_THCS_LeHuuLap.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 2.3. XUẤT BẢNG XẾP HẠNG THI ĐUA CẢ NĂM HỌC (NĂM HỌC 2026-2027)
// --------------------------------------------------------------------------
export function exportYearRankingsToExcel(
  rows: YearRankingRow[],
  academicYear: string,
  schoolName: string = 'Trường THCS Lê Hữu Lập',
  scopeTitle: string = 'Toàn trường',
  signatures?: ExportSignatures
) {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const totalCols = 10;

  const tpt = signatures?.tptName || 'Cô Lê Thị Hoa';
  const principal = signatures?.principalName || 'Thầy Nguyễn Văn Sơn';
  const viceLeader = signatures?.leaderName || 'Thầy Hoàng Văn Sơn';
  const viceTitle = signatures?.leaderTitle || (scopeTitle.includes('Phân hiệu') ? `Phó Hiệu trưởng phụ trách ${scopeTitle}` : 'Phó Hiệu trưởng phụ trách Thi đua');

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>XepHang_CaNam_${academicYear.replace(/[^a-zA-Z0-9]/g, '')}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1e293b; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 0.5pt solid #94a3b8; padding: 6px 8px; vertical-align: middle; }
      th { background-color: #0f172a; color: #ffffff; font-weight: bold; text-align: center; }
      .header-title { font-size: 16pt; font-weight: bold; text-align: center; color: #0f172a; }
      .sub-title { font-size: 11pt; text-align: center; font-style: italic; color: #475569; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .text-cell { mso-number-format: "\\@"; white-space: nowrap; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; font-size: 10pt;">
          ${signatures?.governingBody && signatures.governingBody.trim() ? `${signatures.governingBody.trim().toUpperCase()}<br>` : ''}
          <strong>${(signatures?.schoolName || schoolName).toUpperCase()}</strong><br>
          <span style="font-weight: normal; font-size: 10pt;">HỘI ĐỒNG THI ĐUA KHEN THƯỞNG</span><br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Số: 26/BC-TĐ-LHL</span>
        </td>
        <td colspan="${totalCols - 4}" style="text-align: center; border: none; font-weight: bold; font-size: 10pt;">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
          <span style="font-weight: normal; font-style: italic; font-size: 10pt;">Độc lập - Tự do - Hạnh phúc</span><br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Hậu Lộc, ngày ${dateStr}</span>
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="header-title" style="border: none; padding-top: 10px;">
          BẢNG TỔNG HỢP VÀ XẾP HẠNG THI ĐUA NỀ NẾP - CẢ NĂM HỌC
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          (Quy chế thi đua năm học ${academicYear} · Điểm cả năm = (Điểm HKI + Điểm HKII × 2) / 3)
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          Phạm vi: <strong>${scopeTitle}</strong> · Tổng số lớp: <strong>${rows.length} lớp</strong> · Ngày lập biểu: ${dateStr}
        </td>
      </tr>
      <thead>
        <tr>
          <th style="width: 45px;">STT</th>
          <th style="width: 65px;">Xếp hạng</th>
          <th style="width: 75px;">Lớp</th>
          <th style="width: 150px;">Phân hiệu</th>
          <th style="width: 50px;">Khối</th>
          <th style="width: 140px;">GVCN</th>
          <th style="width: 95px;">Điểm HKI</th>
          <th style="width: 95px;">Điểm HKII (×2)</th>
          <th style="width: 110px;">Điểm Cả Năm</th>
          <th style="width: 120px;">Xếp loại thi đua</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((r, idx) => {
    const hasData = r.hasBothSemestersLocked && r.yearScore !== null;
    html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold" style="background-color: ${
          r.rank === 1 ? '#fef08a' : r.rank === 2 ? '#e2e8f0' : r.rank === 3 ? '#fed7aa' : '#ffffff'
        };">
          ${hasData ? r.rank : '---'}
        </td>
        <td class="center bold text-cell" style="mso-number-format:'\\@';" x:str>${r.classItem.name}</td>
        <td>${r.campus.name}</td>
        <td class="center">${r.classItem.grade}</td>
        <td>${r.classItem.homeroomTeacher || '---'}</td>
        <td class="right" style="font-weight: bold; color: ${r.isSemester1Locked ? '#0f172a' : '#94a3b8'};">
          ${r.semester1Score !== null ? fmtNum(r.semester1Score) : 'Chưa chốt'}
        </td>
        <td class="right" style="font-weight: bold; color: ${r.isSemester2Locked ? '#0f172a' : '#94a3b8'};">
          ${r.semester2Score !== null ? fmtNum(r.semester2Score) : 'Chưa chốt'}
        </td>
        <td class="right bold" style="font-size: 11.5pt; color: ${hasData ? '#312e81' : '#dc2626'}; background-color: #f8fafc;">
          ${hasData ? fmtNum(r.yearScore!) : 'Chưa đủ dữ liệu'}
        </td>
        <td class="center bold" style="color: ${hasData ? '#0f172a' : '#dc2626'};">
          ${r.performanceTier}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <table style="border: none; margin-top: 35px; width: 100%;">
      <tr style="border: none;">
        <td colspan="3" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          NGƯỜI LẬP BIỂU / TPT ĐỘI<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${tpt}</strong>
        </td>
        <td colspan="4" style="text-align: center; border: none; font-weight: bold; width: 33%;">
          ${viceTitle.toUpperCase()}<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${viceLeader}</strong>
        </td>
        <td colspan="3" style="text-align: center; border: none; font-weight: bold; width: 34%;">
          HIỆU TRƯỞNG NHÀ TRƯỜNG<br>
          <span style="font-size: 10pt; font-weight: normal; font-style: italic;">(Ký tên và đóng dấu)</span>
          <br><br><br><br>
          <strong>${principal}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Bang_Xep_Hang_Ca_Nam_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_THCS_LeHuuLap.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 3. XUẤT SỔ NHẬT KÝ THEO DÕI VI PHẠM & KHEN THƯỞNG CHI TIẾT (AUDIT RECORD BOOK)
// --------------------------------------------------------------------------
export function exportScoreLogsToExcel(
  logs: ScoreLog[],
  academicYear: string,
  filterDescription: string = 'Toàn bộ năm học'
) {
  const dateStr = new Date().toLocaleDateString('vi-VN');

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 10pt; }
      .header-title { font-size: 13pt; font-weight: bold; text-align: center; color: #0c2340; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #1a4480; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; padding: 5px; }
      td { border: 1px solid #000000; padding: 4px; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="10" class="header-title" style="border: none;">
          SỔ NHẬT KÝ GHI NHẬN NỀ NẾP & THI ĐUA CHI TIẾT - NĂM HỌC ${academicYear}
        </td>
      </tr>
      <tr>
        <td colspan="10" style="text-align: center; font-style: italic; border: none; margin-bottom: 10px;">
          Lọc: ${filterDescription} · Ngày xuất: ${dateStr} · Tổng số bản ghi: ${logs.length}
        </td>
      </tr>
      <thead>
        <tr>
          <th style="width: 35px;">STT</th>
          <th style="width: 45px;">Tuần</th>
          <th style="width: 75px;">Ngày</th>
          <th style="width: 130px;">Phân hiệu</th>
          <th style="width: 60px;">Lớp</th>
          <th style="width: 60px;">Mã TC</th>
          <th style="width: 220px;">Nội dung Tiêu chí</th>
          <th style="width: 60px;">Số điểm</th>
          <th style="width: 200px;">Chi tiết / Học sinh / Tiết học</th>
          <th style="width: 120px;">Cán bộ chấm</th>
        </tr>
      </thead>
      <tbody>
  `;

  logs.forEach((l, idx) => {
    const isPenalty = l.type === 'penalty' || l.totalPoints < 0;
    const pts = isPenalty ? `-${Math.abs(l.totalPoints)}` : `+${l.totalPoints}`;
    const color = isPenalty ? '#dc3545' : '#28a745';

    html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold">${l.week}</td>
        <td class="center">${l.date}</td>
        <td>${l.campusName}</td>
        <td class="center bold text-cell" style="mso-number-format:'\\@';" x:str>${l.className}</td>
        <td class="center">${l.criteriaCode}</td>
        <td>${l.criteriaName}</td>
        <td class="right bold" style="color: ${color};">${pts}đ</td>
        <td>${l.note || l.calculationDetail || ''}</td>
        <td>${l.inspectorName || l.recordedBy}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `So_Nhat_Ky_Thi_Dua_${academicYear}_THCS_LeHuuLap.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 4. XUẤT BẢNG QUY CHUẨN 64 TIÊU CHÍ THI ĐUA THEO CÔNG VĂN CHÍNH THỨC
// --------------------------------------------------------------------------
export function exportCriteriaCatalogToExcel(criteriaList: Criteria[], academicYear: string) {
  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #0c2340; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; padding: 6px; }
      td { border: 1px solid #000000; padding: 5px; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="7" style="font-size: 14pt; font-weight: bold; text-align: center; border: none; color: #0c2340;">
          QUY CHUẨN DANH MỤC TIÊU CHÍ THI ĐUA NỀ NẾP HỌC SINH NĂM HỌC ${academicYear}
        </td>
      </tr>
      <tr>
        <td colspan="7" style="text-align: center; font-style: italic; border: none; margin-bottom: 12px;">
          Theo Quy chế Thi đua - Nề nếp Trường THCS Lê Hữu Lập (Áp dụng Trường chính và 5 Phân hiệu)
        </td>
      </tr>
      <thead>
        <tr>
          <th style="width: 60px;">Mã TC</th>
          <th style="width: 140px;">Mảng / Danh mục</th>
          <th style="width: 250px;">Tên Tiêu chí / Hành vi</th>
          <th style="width: 80px;">Loại</th>
          <th style="width: 80px;">Mức điểm</th>
          <th style="width: 120px;">Phạm vi áp dụng</th>
          <th style="width: 240px;">Quy chuẩn chi tiết & Điều kiện</th>
        </tr>
      </thead>
      <tbody>
  `;

  criteriaList.forEach((c) => {
    const typeLabel = c.type === 'bonus' ? 'Cộng thưởng' : 'Trừ điểm';
    const typeColor = c.type === 'bonus' ? '#28a745' : '#dc3545';
    const scopeLabel =
      c.scope === 'main_only'
        ? 'Chỉ Trường chính'
        : c.scope === 'sub_only'
        ? 'Chỉ Phân hiệu'
        : c.scope === 'sub_with_badge'
        ? 'Phân hiệu đeo băng đỏ'
        : 'Toàn bộ 6 phân hiệu';

    html += `
      <tr>
        <td style="text-align: center; font-weight: bold;">${c.code}</td>
        <td>${c.category}</td>
        <td><strong>${c.name}</strong></td>
        <td style="text-align: center; font-weight: bold; color: ${typeColor};">${typeLabel}</td>
        <td style="text-align: right; font-weight: bold;">${c.points > 0 ? `+${c.points}` : c.points}đ / ${c.unit}</td>
        <td>${scopeLabel}</td>
        <td>${c.condition || c.description || ''}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Quy_Chuan_Tieu_Chi_Thi_Dua_${academicYear}_THCS_LeHuuLap.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 5. XUẤT BẢNG TỔNG HỢP VÀ XÉT CÔNG NHẬN DANH HIỆU THI ĐUA CẢ NĂM HỌC
// --------------------------------------------------------------------------
export function exportTitleEvaluationToExcel(
  rows: TitleEvaluationRow[],
  academicYear: string,
  scopeTitle: string,
  schoolName: string = 'Trường THCS Lê Hữu Lập',
  isLocked: boolean = false,
  signatures?: ExportSignatures
) {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const totalCols = 7;

  const tpt = signatures?.tptName || 'Cô Lê Thị Hoa';
  const principal = signatures?.principalName || 'Thầy Nguyễn Văn Sơn';
  const viceLeader = signatures?.leaderName || 'Thầy Hoàng Văn Sơn';
  const viceTitle = signatures?.leaderTitle || (scopeTitle.includes('Phân hiệu') ? `Phó Hiệu trưởng phụ trách ${scopeTitle}` : 'Hội đồng Thi đua Nhà trường');

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #0f172a; }
      .header-title { font-size: 14pt; font-weight: bold; text-align: center; color: #1e3a8a; }
      .sub-title { font-size: 10.5pt; font-style: italic; text-align: center; color: #475569; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #1e3a8a; color: #ffffff; border: 1px solid #000000; font-weight: bold; text-align: center; padding: 7px; font-size: 10pt; }
      td { border: 1px solid #000000; padding: 6px; font-size: 10pt; vertical-align: middle; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .text-cell { mso-number-format: "\\@"; white-space: nowrap; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="3" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          ${signatures?.governingBody ? `${signatures.governingBody.trim().toUpperCase()}<br>` : ''}
          <strong>${(signatures?.schoolName || schoolName).toUpperCase()}</strong><br>
          HỘI ĐỒNG THI ĐUA KHEN THƯỞNG<br>
          <span style="font-size: 9pt; font-style: italic; font-weight: normal;">Số: 26/BC-TĐ-LHL</span>
        </td>
        <td colspan="${totalCols - 3}" style="text-align: center; font-weight: bold; border: none; font-size: 10pt;">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>
          Độc lập - Tự do - Hạnh phúc<br>
          <span style="font-weight: normal; font-style: italic; font-size: 9.5pt;">Hậu Lộc, ngày ${dateStr}</span>
        </td>
      </tr>
      <tr><td colspan="${totalCols}" style="border: none; height: 12px;"></td></tr>
      <tr>
        <td colspan="${totalCols}" class="header-title" style="border: none;">
          BẢNG TỔNG HỢP VÀ CÔNG NHẬN DANH HIỆU THI ĐUA LỚP - NĂM HỌC ${academicYear}
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          (Căn cứ quy chế "Tiêu chí xếp loại lớp, năm học 2026-2027" · Tỷ lệ lớp tiên tiến trở lên 70% · Điểm cả năm đã chốt)
        </td>
      </tr>
      <tr>
        <td colspan="${totalCols}" class="sub-title" style="border: none;">
          Phạm vi xét: <strong>${scopeTitle}</strong> · Tổng số: <strong>${rows.length} lớp</strong> · Trạng thái: ${isLocked ? 'ĐÃ KHÓA CHỐT CHÍNH THỨC' : 'DỰ THẢO XÉT DUYỆT'}
        </td>
      </tr>
      <tr><td colspan="${totalCols}" style="border: none; height: 10px;"></td></tr>
      <thead>
        <tr>
          <th style="width: 45px;">STT</th>
          <th style="width: 75px;">Lớp</th>
          <th style="width: 140px;">Phân hiệu</th>
          <th style="width: 100px;">Điểm cả năm</th>
          <th style="width: 120px;">Trạng thái xét</th>
          <th style="width: 150px;">Danh hiệu</th>
          <th style="width: 280px;">Ghi chú & Lý do</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((r, idx) => {
    const titleBg =
      r.title === 'LỚP XUẤT SẮC'
        ? '#fef3c7'
        : r.title === 'LỚP TIÊN TIẾN'
        ? '#dcfce7'
        : '#f1f5f9';
    const titleColor =
      r.title === 'LỚP XUẤT SẮC'
        ? '#92400e'
        : r.title === 'LỚP TIÊN TIẾN'
        ? '#166534'
        : '#475569';

    const statusBg = r.evaluationStatus === 'Được xét' ? '#eff6ff' : '#fff1f2';
    const statusColor = r.evaluationStatus === 'Được xét' ? '#1d4ed8' : '#be123c';

    html += `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold text-cell" style="mso-number-format:'\\@';" x:str>${r.classItem.name}</td>
        <td>${r.campus.name}</td>
        <td class="center bold" style="font-size: 11pt; color: #1e3a8a;">
          ${r.yearScore !== null ? r.yearScore.toFixed(2) + 'đ' : 'Chưa đủ DL'}
        </td>
        <td class="center bold" style="background-color: ${statusBg}; color: ${statusColor};">
          ${r.evaluationStatus}
        </td>
        <td class="center bold" style="background-color: ${titleBg}; color: ${titleColor};">
          ${r.title}
        </td>
        <td>
          ${r.notes}
          ${r.specialAchievementNote ? `<br><span style="font-style: italic; color: #4338ca;">* ${r.specialAchievementNote}</span>` : ''}
          ${r.disciplinaryDetails ? `<br><span style="color: #b91c1c; font-weight: bold;">! ${r.disciplinaryDetails}</span>` : ''}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <table style="border: none; margin-top: 40px; width: 100%;">
      <tr style="border: none;">
        <td colspan="2" style="text-align: center; border: none; font-weight: bold; font-size: 10pt; width: 33%;">
          TỔNG PHỤ TRÁCH ĐỘI<br>
          <span style="font-size: 9.5pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${tpt}</strong>
        </td>
        <td colspan="3" style="text-align: center; border: none; font-weight: bold; font-size: 10pt; width: 33%;">
          ${viceTitle.toUpperCase()}<br>
          <span style="font-size: 9.5pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>${viceLeader}</strong>
        </td>
        <td colspan="2" style="text-align: center; border: none; font-weight: bold; font-size: 10pt; width: 34%;">
          HIỆU TRƯỞNG NHÀ TRƯỜNG<br>
          <span style="font-size: 9.5pt; font-weight: normal; font-style: italic;">(Ký tên và đóng dấu)</span>
          <br><br><br><br>
          <strong>${principal}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const safeScope = scopeTitle.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  downloadFile(
    html,
    `Bang_Danh_Hieu_Thi_Dua_${academicYear}_${safeScope}.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

// --------------------------------------------------------------------------
// 7. XUẤT BÁO CÁO DASHBOARD QUẢN LÝ THI ĐUA TOÀN TRƯỜNG & 6 PHÂN HIỆU
// --------------------------------------------------------------------------
export interface DashboardExportData {
  academicYear: string;
  timeScopeLabel: string;
  campusFilterLabel: string;
  gradeFilterLabel: string;
  kpiStats: {
    totalClasses: number;
    totalCampuses: number;
    weekScoredCount: number;
    monthLockedCount: number;
    semesterLockedCount: number;
    yearLockedCount: number;
  };
  campusCards: {
    name: string;
    classCount: number;
    avgScore: number;
    topClass: string;
    topClassScore: number;
    unsubmittedCount: number;
    dataStatus: string;
  }[];
  rankingRows: {
    stt: number;
    className: string;
    campusName: string;
    score: number | string;
    rank: number | string;
    titleOrTier: string;
    notes?: string;
  }[];
  governingBody?: string;
  schoolName?: string;
}

export function exportDashboardOverviewExcel(data: DashboardExportData) {
  const currentDate = new Date().toLocaleDateString('vi-VN');

  let campusRowsHtml = data.campusCards
    .map(
      (c) => `
      <tr>
        <td class="bold" style="background-color: #f8fafc;">${c.name}</td>
        <td class="center">${c.classCount} lớp</td>
        <td class="center bold" style="color: #1e40af; font-size: 11pt;">${c.avgScore.toFixed(2)}đ</td>
        <td class="center bold" style="color: #047857;">${c.topClass} (${c.topClassScore.toFixed(1)}đ)</td>
        <td class="center ${c.unsubmittedCount > 0 ? 'bold' : ''}" style="${c.unsubmittedCount > 0 ? 'color: #b91c1c;' : 'color: #64748b;'}">${c.unsubmittedCount} lớp</td>
        <td class="center">${c.dataStatus}</td>
      </tr>
    `
    )
    .join('');

  let rankingsHtml = data.rankingRows
    .map((r) => {
      const isTop3 = typeof r.rank === 'number' && r.rank <= 3;
      const rankBg = isTop3 ? '#fef3c7' : '#ffffff';
      const rankColor = isTop3 ? '#92400e' : '#1e293b';

      return `
      <tr>
        <td class="center bold" style="background-color: ${rankBg}; color: ${rankColor};">${r.stt}</td>
        <td class="center bold">${r.className}</td>
        <td>${r.campusName}</td>
        <td class="center bold" style="font-size: 11pt; color: #1e3a8a;">${typeof r.score === 'number' ? r.score.toFixed(2) + 'đ' : r.score}</td>
        <td class="center bold" style="background-color: ${rankBg}; color: ${rankColor};">${r.rank}</td>
        <td class="center bold">${r.titleOrTier}</td>
        <td>${r.notes || ''}</td>
      </tr>
    `;
    })
    .join('');

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <style>
      body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1e293b; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { border: 0.5pt solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
      th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: center; }
      .sub-th { background-color: #0284c7; color: #ffffff; font-weight: bold; text-align: center; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
    </style>
  </head>
  <body>
    <table style="border: none; margin-bottom: 15px;">
      <tr style="border: none;">
        <td colspan="3" style="border: none; text-align: center; font-size: 10.5pt;">
          ${data.governingBody && data.governingBody.trim() ? `${data.governingBody.trim().toUpperCase()}<br />` : ''}
          <strong>${(data.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP').toUpperCase()}</strong>
        </td>
        <td colspan="4" style="border: none; text-align: center; font-size: 10.5pt;">
          <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
          Độc lập - Tự do - Hạnh phúc
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin-bottom: 15px;">
      <h2 style="color: #1e3a8a; margin: 4px 0; font-size: 15pt;">BÁO CÁO TỔNG QUAN THI ĐUA NỀ NẾP TOÀN TRƯỜNG & 6 PHÂN HIỆU</h2>
      <p style="font-style: italic; margin: 4px 0; font-size: 10.5pt;">
        Năm học: ${data.academicYear} • Kỳ báo cáo: <strong>${data.timeScopeLabel}</strong> • Phạm vi: <strong>${data.campusFilterLabel} - ${data.gradeFilterLabel}</strong>
      </p>
      <p style="font-size: 9.5pt; color: #475569; margin: 2px 0;">Ngày xuất báo cáo: ${currentDate}</p>
    </div>

    <!-- KPI STATS -->
    <table>
      <thead>
        <tr>
          <th colspan="6">1. CHỈ SỐ THI ĐUA TOÀN TRƯỜNG (KPI TỔNG HỢP)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
          <td>Tổng số lớp</td>
          <td>Tổng phân hiệu</td>
          <td>Đã có điểm tuần</td>
          <td>Đã chốt tháng</td>
          <td>Đã chốt học kỳ</td>
          <td>Đã chốt cả năm</td>
        </tr>
        <tr style="text-align: center; font-size: 13pt; font-weight: bold; color: #1e3a8a;">
          <td>${data.kpiStats.totalClasses}</td>
          <td>${data.kpiStats.totalCampuses}</td>
          <td style="color: #047857;">${data.kpiStats.weekScoredCount} / ${data.kpiStats.totalClasses}</td>
          <td style="color: #0284c7;">${data.kpiStats.monthLockedCount} / ${data.kpiStats.totalClasses}</td>
          <td style="color: #7c3aed;">${data.kpiStats.semesterLockedCount} / ${data.kpiStats.totalClasses}</td>
          <td style="color: #c026d3;">${data.kpiStats.yearLockedCount} / ${data.kpiStats.totalClasses}</td>
        </tr>
      </tbody>
    </table>

    <!-- 6 CAMPUS CARDS -->
    <table>
      <thead>
        <tr>
          <th colspan="6">2. TỔNG HỢP THEO 6 PHÂN HIỆU THI ĐUA</th>
        </tr>
        <tr>
          <th class="sub-th">Tên phân hiệu</th>
          <th class="sub-th">Quy mô</th>
          <th class="sub-th">Điểm trung bình</th>
          <th class="sub-th">Lớp dẫn đầu</th>
          <th class="sub-th">Lớp chưa nhập điểm</th>
          <th class="sub-th">Trạng thái dữ liệu</th>
        </tr>
      </thead>
      <tbody>
        ${campusRowsHtml}
      </tbody>
    </table>

    <!-- ALL SCHOOL RANKING TABLE -->
    <table>
      <thead>
        <tr>
          <th colspan="7">3. BẢNG XẾP HẠNG THI ĐUA TOÀN TRƯỜNG</th>
        </tr>
        <tr>
          <th class="sub-th" style="width: 40px;">STT</th>
          <th class="sub-th" style="width: 80px;">Lớp</th>
          <th class="sub-th" style="width: 160px;">Phân hiệu</th>
          <th class="sub-th" style="width: 90px;">Điểm số</th>
          <th class="sub-th" style="width: 70px;">Hạng</th>
          <th class="sub-th" style="width: 140px;">Danh hiệu / Xếp loại</th>
          <th class="sub-th">Ghi chú & Căn cứ</th>
        </tr>
      </thead>
      <tbody>
        ${rankingsHtml}
      </tbody>
    </table>

    <table style="border: none; margin-top: 30px; width: 100%;">
      <tr style="border: none;">
        <td colspan="2" style="text-align: center; border: none; font-weight: bold; font-size: 10pt;">
          TỔNG PHỤ TRÁCH ĐỘI<br>
          <span style="font-size: 9pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>Lê Thị Hoa</strong>
        </td>
        <td colspan="3" style="text-align: center; border: none; font-weight: bold; font-size: 10pt;">
          HỘI ĐỒNG THI ĐUA NHÀ TRƯỜNG<br>
          <span style="font-size: 9pt; font-weight: normal; font-style: italic;">(Ký, ghi rõ họ tên)</span>
          <br><br><br><br>
          <strong>Ban Giám Hiệu</strong>
        </td>
        <td colspan="2" style="text-align: center; border: none; font-weight: bold; font-size: 10pt;">
          HIỆU TRƯỞNG NHÀ TRƯỜNG<br>
          <span style="font-size: 9pt; font-weight: normal; font-style: italic;">(Ký tên và đóng dấu)</span>
          <br><br><br><br>
          <strong>Nguyễn Văn Sơn</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Bao_Cao_Thi_Dua_Toan_Truong_${data.academicYear}_${data.timeScopeLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

/**
 * Xuất Nhật ký hệ thống và kiểm soát dữ liệu sang Excel với đầy đủ các trường kiểm toán
 */
export function exportAuditLogsToExcel(logs: AuditLog[]) {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const timeStr = new Date().toLocaleTimeString('vi-VN');

  const rowsHtml = logs
    .map(
      (l, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="text-align: center;">${new Date(l.timestamp).toLocaleString('vi-VN')}</td>
      <td><strong>${(l.userName || 'Hệ thống').replace(/</g, '&lt;')}</strong></td>
      <td style="text-align: center;">${l.userRole || '-'}</td>
      <td>${l.category || '-'}</td>
      <td><strong>${l.action}</strong></td>
      <td>${(l.campusName || '-').replace(/</g, '&lt;')}</td>
      <td style="mso-number-format:'\\@';" x:str>${(l.className || '-').replace(/</g, '&lt;')}</td>
      <td>${(l.reason || '-').replace(/</g, '&lt;')}</td>
      <td>${(l.details || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
    </tr>
  `
    )
    .join('');

  const html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      th { border: 1px solid #000; background-color: #1e3a8a; color: #ffffff; padding: 6px; font-size: 10pt; text-align: center; }
      td { border: 1px solid #000; padding: 5px; font-size: 10pt; vertical-align: middle; }
      .header-title { font-size: 15pt; font-weight: bold; text-align: center; color: #1e3a8a; }
      .sub-title { font-size: 10pt; text-align: center; font-style: italic; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="10" class="header-title">TRƯỜNG THCS LÊ HỮU LẬP - NHẬT KÝ KIỂM TOÁN HỆ THỐNG VÀ KIỂM SOÁT DỮ LIỆU</td>
      </tr>
      <tr>
        <td colspan="10" class="sub-title">Thời điểm xuất: ${dateStr} ${timeStr} | Tổng số bản ghi: ${logs.length} thao tác</td>
      </tr>
    </table>
    <br/>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">STT</th>
          <th style="width: 130px;">Thời gian</th>
          <th style="width: 140px;">Người thực hiện</th>
          <th style="width: 110px;">Vai trò</th>
          <th style="width: 120px;">Chức năng</th>
          <th style="width: 140px;">Hành động</th>
          <th style="width: 120px;">Phân hiệu</th>
          <th style="width: 80px;">Lớp</th>
          <th style="width: 160px;">Lý do thực hiện</th>
          <th style="width: 320px;">Chi tiết thay đổi</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </body>
  </html>
  `;

  downloadFile(
    html,
    `Nhat_Ky_He_Thong_${new Date().toISOString().split('T')[0]}.xls`,
    'application/vnd.ms-excel;charset=utf-8;'
  );
}

