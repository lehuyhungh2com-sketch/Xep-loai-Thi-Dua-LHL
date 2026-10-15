import * as XLSX from 'xlsx';
import {
  Campus,
  ClassItem,
  Criteria,
  SchoolSettings,
  ScoreLog,
  User,
} from '../types';

/**
 * Interface for Validated Import Row
 */
export interface ValidatedImportRow {
  index: number;
  rowNumber: number;
  classId: string;
  className: string;
  campusId: string;
  campusName: string;
  grade: number;
  criteriaId: string;
  criteriaCode: string;
  criteriaName: string;
  criteriaCategory: string;
  criteriaType: 'bonus' | 'penalty';
  quantity: number;
  pointsPerUnit: number;
  totalPoints: number;
  appliedCap?: number;
  calculationDetail?: string;
  isDisciplinary?: boolean;
  date: string;
  inspectorName: string;
  note: string;
  status: 'valid' | 'duplicate';
  duplicateLog?: ScoreLog;
  // Duplicate resolution choice: 'merge' (cộng dồn) | 'replace' (thay thế) | 'add_new' (thêm mới) | 'skip' (bỏ qua)
  duplicateAction: 'merge' | 'replace' | 'add_new' | 'skip';
  selectedToImport: boolean;
  tableSource?: 'table_a' | 'table_b' | 'matrix' | 'unified';
}

/**
 * Interface for Invalid Import Row (Requirement 13)
 */
export interface InvalidImportRow {
  index: number;
  rowNumber: number;
  rawClass: string;
  rawCriteria: string;
  rawValue: string;
  reason: string;
  howToFix: string;
}

/**
 * Metadata extracted from file
 */
export interface ExcelFileMetadata {
  systemSignature?: string;
  academicYear?: string;
  week?: number;
  campusId?: string;
  campusName?: string;
  startDate?: string;
  endDate?: string;
  exportedAt?: string;
  sheetNames: string[];
  hasSystemMetadataSheet: boolean;
  sourceType: 'xlsx' | 'xls' | 'csv' | 'pasted_text';
}

/**
 * Result of Excel File Parsing & Verification
 */
export interface ExcelImportValidationResult {
  success: boolean;
  fileMetadata: ExcelFileMetadata;
  mismatchWarnings: string[];
  isLockedWeek: boolean;
  totalRowsFound: number;
  validRows: ValidatedImportRow[];
  invalidRows: InvalidImportRow[];
  duplicateRows: ValidatedImportRow[];
}

/**
 * Helper to download binary blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --------------------------------------------------------------------------
// 1. EXPORT EXCEL NHẬP ĐIỂM THI ĐUA TUẦN (CHUẨN 5 SHEETS DỄ DÙNG)
// --------------------------------------------------------------------------
export interface ExportTemplateParams {
  campus: Campus;
  week: number;
  academicYear: string;
  startDate: string;
  endDate: string;
  classes: ClassItem[];
  criteria: Criteria[];
  currentUser: User;
}

export function exportWeeklyScoringTemplate({
  campus,
  week,
  academicYear,
  startDate,
  endDate,
  classes,
  criteria,
  currentUser,
}: ExportTemplateParams) {
  const wb = XLSX.utils.book_new();

  // Filter and sort classes belonging strictly to this campus
  const campusClasses = classes
    .filter((c) => c.campusId === campus.id)
    .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Filter active criteria from live system configuration (Requirement 5)
  const activeCriteria = criteria.filter((c) => c.isActive !== false);
  const penaltyCriteria = activeCriteria.filter((c) => c.type === 'penalty');
  const bonusCriteria = activeCriteria.filter((c) => c.type === 'bonus');

  // ==========================================
  // SHEET 1: "NHẬP ĐIỂM" (BẢNG A: VI PHẠM & BẢNG B: THÀNH TÍCH)
  // ==========================================
  const sheet1Data: any[][] = [];

  // Header information block (Requirement 3)
  sheet1Data.push(['TRƯỜNG THCS LÊ HỮU LẬP - BẢNG NHẬP ĐIỂM THI ĐUA NỀ NẾP TUẦN ' + week]);
  sheet1Data.push(['Năm học:', academicYear, '', 'Tuần đánh giá:', 'Tuần ' + week]);
  sheet1Data.push(['Phân hiệu:', campus.name, '', 'Mã phân hiệu:', campus.id]);
  sheet1Data.push(['Ngày bắt đầu:', startDate, '', 'Ngày kết thúc:', endDate]);
  sheet1Data.push([
    'LƯU Ý QUAN TRỌNG:',
    'Giáo viên CHỈ NHẬP Số lượng / Số lần vào cột "Số lượng / Số lần (*)". KHÔNG tự nhập mức điểm hay công thức tính điểm. Hệ thống sẽ tự động nhân mức điểm theo quy định.',
  ]);
  sheet1Data.push([]); // blank line

  // SECTION 1: Class roster for quick lookup (Requirement 4)
  sheet1Data.push([
    'DANH SÁCH LỚP PHÂN HIỆU ' + campus.name.toUpperCase() + ' (ĐỐI CHIẾU CHUẨN MÃ LỚP - KHÔNG ĐỔI TÊN LỚP)',
  ]);
  sheet1Data.push(['STT', 'Mã lớp (*)', 'Tên lớp', 'Khối', 'Giáo viên chủ nhiệm', 'Phân hiệu', 'Ghi chú hệ thống']);

  campusClasses.forEach((cls, idx) => {
    sheet1Data.push([
      idx + 1,
      { t: 's', v: String(cls.name), z: '@' }, // Strictly preserved as String (e.g. 6A1, 600, 6E1...)
      `Lớp ${cls.name}`,
      `Khối ${cls.grade}`,
      cls.homeroomTeacher || 'Chưa phân công',
      campus.name,
      'Lớp học chính thức',
    ]);
  });

  sheet1Data.push([]); // blank line

  // SECTION 2: TABLE A - NHẬP LỖI VI PHẠM (TRỪ ĐIỂM) (Requirement 8)
  sheet1Data.push([
    'BẢNG A - NHẬP LỖI VI PHẠM (HỆ THỐNG TỰ ĐỘNG TÍNH ĐIỂM TRỪ - GIÁO VIÊN CHỈ NHẬP SỐ LẦN)',
  ]);
  sheet1Data.push([
    'Hướng dẫn Bảng A:',
    'Chỉ nhập Mã lớp, Mã tiêu chí vi phạm và Số lần vi phạm. Không tự nhập điểm trừ. Tra cứu mã lỗi tại sheet "DANH MỤC TIÊU CHÍ".',
  ]);

  const tableAHeader = [
    'STT',
    'Mã lớp (*)',
    'Tên lớp',
    'Khối',
    'Mã tiêu chí (*)',
    'Tên tiêu chí vi phạm',
    'Số lần vi phạm (*)',
    'Ngày vi phạm (YYYY-MM-DD)',
    'Người kiểm tra / Cờ đỏ',
    'Ghi chú chi tiết',
  ];
  sheet1Data.push(tableAHeader);

  let entryIndexA = 1;

  // Add 2 practical sample violation rows for Class 1 to guide teacher
  if (campusClasses.length > 0) {
    const firstClass = campusClasses[0];
    const critP1 = penaltyCriteria.find((c) => c.code === 'TP02') || penaltyCriteria[0];
    const critP2 = penaltyCriteria.find((c) => c.code === 'CC01') || penaltyCriteria[1];

    if (critP1) {
      sheet1Data.push([
        entryIndexA++,
        { t: 's', v: String(firstClass.name), z: '@' },
        `Lớp ${firstClass.name}`,
        firstClass.grade,
        critP1.code,
        critP1.name,
        2, // Quantity
        startDate,
        'Đội Cờ Đỏ Khối 8',
        '(Mẫu hướng dẫn) 2 học sinh không sơ vin đầu giờ',
      ]);
    }

    if (critP2) {
      sheet1Data.push([
        entryIndexA++,
        { t: 's', v: String(firstClass.name), z: '@' },
        `Lớp ${firstClass.name}`,
        firstClass.grade,
        critP2.code,
        critP2.name,
        1, // Quantity
        startDate,
        'Đội Cờ Đỏ',
        '(Mẫu hướng dẫn) Học sinh đến muộn sau tiếng trống',
      ]);
    }
  }

  // Pre-fill ready blank rows for each class belonging to this campus (2 rows per class)
  campusClasses.forEach((cls) => {
    sheet1Data.push([
      entryIndexA++,
      { t: 's', v: String(cls.name), z: '@' },
      `Lớp ${cls.name}`,
      cls.grade,
      '', // Mã tiêu chí vi phạm
      '', // Tên tiêu chí
      '', // Số lượng (ô trống để giáo viên nhập)
      startDate,
      currentUser.name,
      '',
    ]);
    sheet1Data.push([
      entryIndexA++,
      { t: 's', v: String(cls.name), z: '@' },
      `Lớp ${cls.name}`,
      cls.grade,
      '', // Mã tiêu chí vi phạm
      '', // Tên tiêu chí
      '', // Số lượng
      startDate,
      currentUser.name,
      '',
    ]);
  });

  // Extra blank rows for any other violations
  for (let i = 0; i < 5; i++) {
    sheet1Data.push([entryIndexA++, '', '', '', '', '', '', startDate, currentUser.name, '']);
  }

  sheet1Data.push([]); // blank line

  // SECTION 3: TABLE B - NHẬP THÀNH TÍCH & KHEN THƯỞNG (CỘNG ĐIỂM) (Requirement 8)
  sheet1Data.push([
    'BẢNG B - NHẬP THÀNH TÍCH & KHEN THƯỞNG (HỆ THỐNG TỰ ĐỘNG TÍNH ĐIỂM CỘNG - GIÁO VIÊN CHỈ NHẬP SỐ LẦN)',
  ]);
  sheet1Data.push([
    'Hướng dẫn Bảng B:',
    'Chỉ nhập Mã lớp, Mã tiêu chí khen thưởng và Số lần thành tích (ví dụ: điểm tốt, hoa điểm mười, sổ đầu bài tốt...).',
  ]);

  const tableBHeader = [
    'STT',
    'Mã lớp (*)',
    'Tên lớp',
    'Khối',
    'Mã tiêu chí (*)',
    'Tên tiêu chí khen thưởng',
    'Số lần thành tích (*)',
    'Ngày ghi nhận (YYYY-MM-DD)',
    'Người kiểm tra / Cờ đỏ',
    'Ghi chú chi tiết',
  ];
  sheet1Data.push(tableBHeader);

  let entryIndexB = 1;

  // Add 1 sample bonus row
  if (campusClasses.length > 0) {
    const firstClass = campusClasses[0];
    const critB1 = bonusCriteria.find((c) => c.code === 'HT01') || bonusCriteria[0];
    if (critB1) {
      sheet1Data.push([
        entryIndexB++,
        { t: 's', v: String(firstClass.name), z: '@' },
        `Lớp ${firstClass.name}`,
        firstClass.grade,
        critB1.code,
        critB1.name,
        8, // Quantity
        endDate,
        currentUser.name,
        '(Mẫu hướng dẫn) 8 con điểm 9 và 10 trong tuần',
      ]);
    }
  }

  // Pre-fill ready blank rows for each class for achievements
  campusClasses.forEach((cls) => {
    sheet1Data.push([
      entryIndexB++,
      { t: 's', v: String(cls.name), z: '@' },
      `Lớp ${cls.name}`,
      cls.grade,
      '', // Mã tiêu chí thưởng
      '', // Tên tiêu chí
      '', // Số lượng
      endDate,
      currentUser.name,
      '',
    ]);
  });

  // Extra blank rows for bonus
  for (let i = 0; i < 5; i++) {
    sheet1Data.push([entryIndexB++, '', '', '', '', '', '', endDate, currentUser.name, '']);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Configure column widths
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã lớp (*)
    { wch: 14 }, // Tên lớp
    { wch: 8 },  // Khối
    { wch: 16 }, // Mã tiêu chí (*)
    { wch: 38 }, // Tên tiêu chí
    { wch: 22 }, // Số lượng / Số lần (*)
    { wch: 26 }, // Ngày ghi nhận
    { wch: 24 }, // Người kiểm tra
    { wch: 35 }, // Ghi chú
  ];

  // Set explicit string cell type for Class Name columns so "600", "6E1", "6A1" are NEVER treated as numeric or scientific notation
  Object.keys(ws1).forEach((cellKey) => {
    if (cellKey.startsWith('!')) return;
    const cell = ws1[cellKey];
    if (!cell) return;

    // Check if cell is in column B or C (Mã lớp, Tên lớp)
    if (cellKey.startsWith('B') || cellKey.startsWith('C')) {
      if (typeof cell.v === 'string' || typeof cell.v === 'number') {
        cell.t = 's';
        cell.v = String(cell.v);
        cell.z = '@';
      }
    }
  });

  // Freeze header view for comfortable scrolling (Requirement 18)
  ws1['!views'] = [{ state: 'frozen', ySplit: 6 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'NHẬP ĐIỂM');

  // ==========================================
  // SHEET 2: "HƯỚNG DẪN" (Requirement 10)
  // ==========================================
  const sheet2Data: any[][] = [
    ['QUY TRÌNH HƯỚNG DẪN NHẬP ĐIỂM THI ĐUA BẰNG FILE EXCEL MẪU'],
    ['Áp dụng cho Ban Giám Hiệu, Tổng phụ trách Đội, Giáo viên chủ nhiệm & Đội cờ đỏ'],
    [],
    ['BƯỚC', 'NỘI DUNG THỰC HIỆN', 'LƯU Ý QUAN TRỌNG & NGUYÊN TẮC AN TOÀN DỮ LIỆU'],
    [
      'Bước 1',
      'Không thay đổi tên sheet trong file Excel',
      'Giữ nguyên tên các sheet: "NHẬP ĐIỂM", "HƯỚNG DẪN", "DANH MỤC TIÊU CHÍ". Không xóa hoặc đổi tên sheet.',
    ],
    [
      'Bước 2',
      'Không xóa hoặc thêm cột hệ thống',
      'Cấu trúc các cột đã được lập trình sẵn. Giữ nguyên tiêu đề và thứ tự các cột của Bảng A và Bảng B.',
    ],
    [
      'Bước 3',
      'Chỉ nhập số lượng / lần vi phạm hoặc thành tích vào các ô được phép nhập',
      'Giáo viên chỉ cần điền Số lượng / Số lần (số nguyên dương: 1, 2, 3...) vào cột "Số lượng / Số lần (*)".',
    ],
    [
      'Bước 4',
      'Tuyệt đối không tự nhập điểm cộng/trừ hay công thức',
      'Mức điểm quy định và công thức tính điểm được hệ thống tự động áp dụng chính xác 100%. Giáo viên không tự tính điểm.',
    ],
    [
      'Bước 5',
      'Lưu file dưới dạng .xlsx',
      'Sau khi nhập liệu xong, nhấn Ctrl + S hoặc File -> Save để lưu file định dạng Excel (.xlsx).',
    ],
    [
      'Bước 6',
      'Vào phần mềm -> Nhập điểm thi đua',
      'Chọn đúng Tuần (ví dụ Tuần ' + week + ') và Phân hiệu (' + campus.name + '). Bấm nút "Nhập từ file Excel / Dán bảng".',
    ],
    [
      'Bước 7',
      'Chọn file Excel vừa lưu từ máy tính',
      'Hệ thống tự động đọc và nhận diện dữ liệu các lớp, đối chiếu tiêu chí và tính toán điểm số tức thời.',
    ],
    [
      'Bước 8',
      'Kiểm tra bảng xem trước (Preview) dữ liệu',
      'Hệ thống hiển thị chi tiết: Dòng hợp lệ, dòng trùng lặp, dòng có lỗi sai dữ liệu và điểm thưởng/phạt dự kiến.',
    ],
    [
      'Bước 9',
      'Xác nhận nạp để ghi nhận vào hệ thống',
      'Chỉ khi bấm "Xác nhận nạp", điểm số mới chính thức được lưu vào sổ thi đua của trường.',
    ],
    [],
    ['QUY ĐỊNH BẢO VỆ CHỐNG TRÙNG LẶP DỮ LIỆU (REQUIREMENT 14):'],
    ['1. Bản ghi mới hoàn toàn:', 'Hệ thống tự động ghi nhận thêm mới vào bảng điểm tuần của lớp.'],
    [
      '2. Đã có dữ liệu trước đó:',
      'Phần mềm phát hiện ngay và cho phép bạn chọn: "Cộng dồn số lượng", "Ghi đè thay thế", "Thêm mới độc lập" hoặc "Bỏ qua". Tuyệt đối không tự động cộng trùng ngầm.',
    ],
    [
      '3. Tuần đã khóa sổ:',
      'Nếu tuần đã được Ban Giám Hiệu chốt khóa sổ thi đua, hệ thống sẽ từ chối nạp dữ liệu để bảo đảm công bằng, minh bạch.',
    ],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [{ wch: 12 }, { wch: 45 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'HƯỚNG DẪN');

  // ==========================================
  // SHEET 3: "DANH MỤC TIÊU CHÍ" (Requirement 9)
  // ==========================================
  const sheet3Data: any[][] = [
    ['DANH MỤC TIÊU CHÍ ĐÁNH GIÁ THI ĐUA NỀ NẾP (NĂM HỌC ' + academicYear + ')'],
    ['Dùng để tra cứu mã tiêu chí chuẩn khi nhập điểm vào Sheet "NHẬP ĐIỂM". Không chỉnh sửa nội dung sheet này.'],
    [],
    [
      'STT',
      'Mã tiêu chí',
      'Nhóm tiêu chí',
      'Tên tiêu chí thi đua',
      'Phân loại',
      'Mức điểm quy định',
      'Đơn vị tính',
      'Phạm vi áp dụng',
      'Phân hiệu áp dụng',
      'Chu kỳ đánh giá',
      'Điều kiện & Ghi chú quy chế',
    ],
  ];

  activeCriteria.forEach((crit, idx) => {
    let phanHieuApDung = 'Tất cả 6 phân hiệu';
    if (crit.scope === 'main_only') phanHieuApDung = 'Trường chính (Lê Hữu Lập)';
    if (crit.scope === 'sub_only') phanHieuApDung = '5 phân hiệu lẻ';

    sheet3Data.push([
      idx + 1,
      crit.code,
      crit.category,
      crit.name,
      crit.type === 'bonus' ? 'Cộng thưởng (+)' : 'Trừ điểm (-)',
      crit.points,
      crit.unit || 'Lần',
      crit.scope === 'main_only' ? 'Trường chính' : crit.scope === 'sub_only' ? 'Các phân hiệu' : 'Toàn trường',
      phanHieuApDung,
      crit.period === 'week' ? 'Hàng tuần' : crit.period === 'month' ? 'Hàng tháng' : 'Cả năm',
      crit.description || crit.calculationRule || '',
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã
    { wch: 22 }, // Nhóm
    { wch: 42 }, // Tên tiêu chí
    { wch: 18 }, // Phân loại
    { wch: 18 }, // Mức điểm
    { wch: 14 }, // Đơn vị
    { wch: 18 }, // Phạm vi
    { wch: 26 }, // Phân hiệu
    { wch: 14 }, // Chu kỳ
    { wch: 45 }, // Điều kiện
  ];
  ws3['!views'] = [{ state: 'frozen', ySplit: 4 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'DANH MỤC TIÊU CHÍ');

  // ==========================================
  // SHEET 4: "NHẬP ĐIỂM (MA TRẬN)" (Dễ nhập nhất đối với nhiều giáo viên)
  // ==========================================
  const matrixData: any[][] = [
    ['TRƯỜNG THCS LÊ HỮU LẬP - BẢNG NHẬP ĐIỂM MA TRẬN THEO LỚP & TIÊU CHÍ (TUẦN ' + week + ')'],
    [
      'Năm học:',
      academicYear,
      'Phân hiệu:',
      campus.name,
      'Hướng dẫn:',
      'Chỉ cần nhập Số lần vào ô giao điểm giữa Lớp và Tiêu chí. Ô nào lớp không vi phạm hoặc không có thành tích thì để trống.',
    ],
    [],
  ];

  // Matrix headers: STT, Mã lớp (*), Tên lớp, Khối, GVCN, then each active criteria code & name
  const matrixHeaderRow: any[] = ['STT', 'Mã lớp (*)', 'Tên lớp', 'Khối', 'Giáo viên chủ nhiệm'];
  activeCriteria.forEach((crit) => {
    const symbol = crit.type === 'bonus' ? '(+)' : '(-)';
    matrixHeaderRow.push(`[${crit.code}] ${crit.name} ${symbol}`);
  });
  matrixData.push(matrixHeaderRow);

  // Each class gets ONE row across all criteria
  campusClasses.forEach((cls, idx) => {
    const row: any[] = [
      idx + 1,
      { t: 's', v: String(cls.name), z: '@' },
      `Lớp ${cls.name}`,
      `Khối ${cls.grade}`,
      cls.homeroomTeacher || 'Chưa phân công',
    ];
    // Empty cells for each criteria waiting for teacher input
    activeCriteria.forEach(() => {
      row.push('');
    });
    matrixData.push(row);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
  const matrixCols: any[] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 24 },
  ];
  activeCriteria.forEach(() => {
    matrixCols.push({ wch: 28 });
  });
  wsMatrix['!cols'] = matrixCols;
  wsMatrix['!views'] = [{ state: 'frozen', xSplit: 5, ySplit: 4 }];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'NHẬP ĐIỂM (MA TRẬN)');

  // ==========================================
  // SHEET 5: "DỮ LIỆU HỆ THỐNG" (Hidden Integrity Metadata)
  // ==========================================
  const sheet5Data: any[][] = [
    ['THÔNG TIN XÁC THỰC HỆ THỐNG (SYSTEM INTEGRITY METADATA)'],
    ['Không thay đổi nội dung sheet này để hệ thống kiểm tra tính toàn vẹn khi tải lên phần mềm.'],
    [],
    ['THUỘC TÍNH HỆ THỐNG', 'GIÁ TRỊ XÁC THỰC'],
    ['APP_SIGNATURE', 'THCS_LE_HUU_LAP_EMULATION_SYSTEM'],
    ['ACADEMIC_YEAR', academicYear],
    ['WEEK', week],
    ['CAMPUS_ID', campus.id],
    ['CAMPUS_NAME', campus.name],
    ['START_DATE', startDate],
    ['END_DATE', endDate],
    ['TOTAL_CLASSES', campusClasses.length],
    ['GENERATED_AT', new Date().toISOString()],
    ['GENERATED_BY', currentUser.name],
    ['CHECKSUM', `CHKSUM_${campus.id}_W${week}_${Date.now()}`],
  ];

  const ws5 = XLSX.utils.aoa_to_sheet(sheet5Data);
  ws5['!cols'] = [{ wch: 28 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws5, 'DỮ LIỆU HỆ THỐNG');

  // Mark "DỮ LIỆU HỆ THỐNG" as Hidden in Excel so teachers don't get distracted
  wb.Workbook = wb.Workbook || {};
  wb.Workbook.Sheets = [
    { name: 'NHẬP ĐIỂM', Hidden: 0 },
    { name: 'HƯỚNG DẪN', Hidden: 0 },
    { name: 'DANH MỤC TIÊU CHÍ', Hidden: 0 },
    { name: 'NHẬP ĐIỂM (MA TRẬN)', Hidden: 0 },
    { name: 'DỮ LIỆU HỆ THỐNG', Hidden: 1 }, // Hidden sheet
  ];

  // Write and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const sanitizeName = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  const safeCampus = sanitizeName(campus.name);
  const safeYear = academicYear.replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Mau_Nhap_Diem_Thi_Dua_${safeCampus}_Tuan_${week}_${safeYear}.xlsx`;

  downloadBlob(blob, filename);
}

// --------------------------------------------------------------------------
// 2. PARSE VÀ KIỂM TRA FILE EXCEL KHI IMPORT NGƯỢC (Requirements 12 - 17)
// --------------------------------------------------------------------------
export interface ParseExcelContext {
  currentWeek: number;
  selectedCampusId: string;
  academicYear: string;
  campuses: Campus[];
  classes: ClassItem[];
  criteria: Criteria[];
  existingLogs: ScoreLog[];
  previewCriteriaCalculation: (
    criteriaId: string,
    quantity: number,
    classId: string
  ) => {
    pointsPerUnit: number;
    totalPoints: number;
    appliedCap?: number;
    calculationDetail: string;
    isDisciplinary?: boolean;
    period: any;
    campus?: any;
  };
  currentUser: User;
  isWeekLocked: (week: number) => boolean;
  defaultDate?: string;
}

/**
 * Intelligent helper to resolve Class Item from raw string
 * Properly handles scientific notation quirks in Excel (e.g. 6E1 turning into 60, or 600 turning into 6.00E+02)
 */
function resolveClassItem(
  rawClassVal: string,
  classes: ClassItem[],
  selectedCampusId: string
): ClassItem | undefined {
  if (!rawClassVal) return undefined;

  let cleanStr = String(rawClassVal)
    .trim()
    .replace(/^lớp\s*/i, '')
    .trim();

  // 1. Direct exact matches
  let matched = classes.find((c) => {
    const cClean = c.name.replace(/^lớp\s*/i, '').trim();
    return (
      c.id.toLowerCase() === rawClassVal.toLowerCase() ||
      cClean.toLowerCase() === cleanStr.toLowerCase() ||
      c.name.toLowerCase() === rawClassVal.toLowerCase() ||
      (c.code && c.code.toLowerCase() === rawClassVal.toLowerCase())
    );
  });

  if (matched) return matched;

  // 2. Handle scientific notation accidents from Excel
  // e.g. "60" from "6E1", "600" from "6E2", "70" from "7E1", "700" from "7E2"
  const sciMap: Record<string, string> = {
    '60': '6E1',
    '600': '6E2',
    '70': '7E1',
    '700': '7E2',
    '80': '8E1',
    '800': '8E2',
    '90': '9E1',
    '900': '9E2',
  };

  if (sciMap[cleanStr]) {
    const targetSciName = sciMap[cleanStr];
    // Check if this campus has a class with targetSciName (e.g. 6E1 in Phân hiệu Lộc Tân)
    const sciClass = classes.find(
      (c) => c.campusId === selectedCampusId && c.name.toUpperCase() === targetSciName
    );
    if (sciClass) return sciClass;
  }

  // 3. Fallback: match without spaces or special characters
  const normStr = cleanStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  matched = classes.find((c) => {
    const cNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cNorm === normStr;
  });

  return matched;
}

export function parseWeeklyScoringExcel(
  fileData: ArrayBuffer | string,
  context: ParseExcelContext
): ExcelImportValidationResult {
  const {
    currentWeek,
    selectedCampusId,
    academicYear,
    campuses,
    classes,
    criteria,
    existingLogs,
    previewCriteriaCalculation,
    currentUser,
    isWeekLocked,
    defaultDate = new Date().toISOString().split('T')[0],
  } = context;

  const currentCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];

  const fileMetadata: ExcelFileMetadata = {
    sheetNames: [],
    hasSystemMetadataSheet: false,
    sourceType: typeof fileData === 'string' ? 'pasted_text' : 'xlsx',
  };

  const mismatchWarnings: string[] = [];
  const validRows: ValidatedImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];
  const duplicateRows: ValidatedImportRow[] = [];

  let workbook: XLSX.WorkBook | null = null;

  try {
    if (typeof fileData === 'string') {
      workbook = XLSX.read(fileData, { type: 'string' });
    } else {
      workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    }
  } catch (err) {
    try {
      workbook = XLSX.read(fileData, { type: 'binary' });
    } catch (e2) {
      console.error('Workbook read failure:', e2);
    }
  }

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      success: false,
      fileMetadata,
      mismatchWarnings: ['Không thể đọc nội dung tệp Excel. Tệp có thể bị hỏng hoặc sai định dạng.'],
      isLockedWeek: isWeekLocked(currentWeek),
      totalRowsFound: 0,
      validRows: [],
      invalidRows: [
        {
          index: 1,
          rowNumber: 1,
          rawClass: '---',
          rawCriteria: '---',
          rawValue: '---',
          reason: 'Tệp không chứa dữ liệu hoặc không phải định dạng bảng tính hợp lệ (.xlsx, .xls, .csv).',
          howToFix: 'Vui lòng kiểm tra lại tệp hoặc tải lại mẫu từ hệ thống.',
        },
      ],
      duplicateRows: [],
    };
  }

  fileMetadata.sheetNames = workbook.SheetNames;

  // 1. Check Metadata from "DỮ LIỆU HỆ THỐNG" if available
  const sysSheet =
    workbook.Sheets['DỮ LIỆU HỆ THỐNG'] ||
    workbook.Sheets['DU_LIEU_HE_THONG'] ||
    workbook.Sheets['SystemData'];

  if (sysSheet) {
    fileMetadata.hasSystemMetadataSheet = true;
    const sysData: any[][] = XLSX.utils.sheet_to_json(sysSheet, { header: 1 });
    sysData.forEach((row) => {
      if (Array.isArray(row) && row.length >= 2) {
        const key = String(row[0]).trim();
        const val = String(row[1]).trim();
        if (key === 'APP_SIGNATURE') fileMetadata.systemSignature = val;
        if (key === 'ACADEMIC_YEAR') fileMetadata.academicYear = val;
        if (key === 'WEEK') fileMetadata.week = parseInt(val, 10);
        if (key === 'CAMPUS_ID') fileMetadata.campusId = val;
        if (key === 'CAMPUS_NAME') fileMetadata.campusName = val;
        if (key === 'START_DATE') fileMetadata.startDate = val;
        if (key === 'END_DATE') fileMetadata.endDate = val;
        if (key === 'GENERATED_AT') fileMetadata.exportedAt = val;
      }
    });
  }

  // 2. Check if a Matrix sheet has data
  const matrixSheetName = workbook.SheetNames.find(
    (n) => n.toUpperCase().includes('MA TRẬN') || n.toUpperCase().includes('MA TRAN') || n.toUpperCase().includes('MATRIX')
  );
  const matrixSheet = matrixSheetName ? workbook.Sheets[matrixSheetName] : null;

  // Primary tabular sheet: "NHẬP ĐIỂM", or first sheet
  const tabularSheetName =
    workbook.SheetNames.find(
      (n) =>
        (n.toUpperCase().includes('NHẬP') || n.toUpperCase().includes('NHAP') || n.toUpperCase().includes('DIEM')) &&
        !n.toUpperCase().includes('MA TRẬN') &&
        !n.toUpperCase().includes('MA TRAN')
    ) || workbook.SheetNames[0];

  const tabularSheet = workbook.Sheets[tabularSheetName];

  // Scan metadata from sheet headers if not retrieved from Sheet 5
  const probeSheet = tabularSheet || matrixSheet;
  if (probeSheet && (!fileMetadata.week || !fileMetadata.campusId)) {
    const rawProbe: any[][] = XLSX.utils.sheet_to_json(probeSheet, { header: 1, raw: false });
    for (let i = 0; i < Math.min(10, rawProbe.length); i++) {
      const lineStr = (rawProbe[i] || []).join(' ');
      const matchWeek = lineStr.match(/Tuần\s*(\d+)/i);
      if (matchWeek && !fileMetadata.week) fileMetadata.week = parseInt(matchWeek[1], 10);

      const matchYear = lineStr.match(/(\d{4}\s*[-–]\s*\d{4})/);
      if (matchYear && !fileMetadata.academicYear) fileMetadata.academicYear = matchYear[1].replace(/\s+/g, '');

      campuses.forEach((camp) => {
        if (lineStr.toLowerCase().includes(camp.name.toLowerCase()) || lineStr.includes(camp.id)) {
          fileMetadata.campusId = camp.id;
          fileMetadata.campusName = camp.name;
        }
      });
    }
  }

  // 3. Mismatch Checks (Requirements 12 & 16)
  const targetWeek = fileMetadata.week || currentWeek;
  const isLocked = isWeekLocked(targetWeek);

  if (fileMetadata.academicYear && fileMetadata.academicYear !== academicYear) {
    mismatchWarnings.push(
      `CẢNH BÁO NĂM HỌC: Tệp Excel ghi nhận năm học "${fileMetadata.academicYear}", nhưng hệ thống đang cấu hình "${academicYear}".`
    );
  }

  if (fileMetadata.week && fileMetadata.week !== currentWeek) {
    mismatchWarnings.push(
      `CẢNH BÁO TUẦN: Tệp Excel dành cho "Tuần ${fileMetadata.week}", nhưng bạn đang mở "Tuần ${currentWeek}". Dữ liệu sẽ được nạp vào Tuần ${fileMetadata.week}.`
    );
  }

  if (fileMetadata.campusId && fileMetadata.campusId !== selectedCampusId) {
    const fileCampus = campuses.find((c) => c.id === fileMetadata.campusId);
    mismatchWarnings.push(
      `CẢNH BÁO PHÂN HIỆU: Tệp Excel thuộc "${fileCampus?.name || fileMetadata.campusId}", nhưng bạn đang thao tác tại "${currentCampus.name}".`
    );
  }

  if (isLocked) {
    mismatchWarnings.push(
      `CẢNH BÁO KHÓA SỔ: Tuần ${targetWeek} đã được Ban Giám Hiệu khóa sổ thi đua. Không thể nạp thêm hoặc cập nhật điểm số!`
    );
  }

  let validRowCounter = 1;

  // --------------------------------------------------------------------------
  // PARSER A: TABULAR SHEET (BẢNG A: VI PHẠM & BẢNG B: THÀNH TÍCH)
  // --------------------------------------------------------------------------
  if (tabularSheet) {
    const rawRows: any[][] = XLSX.utils.sheet_to_json(tabularSheet, { header: 1, raw: false });

    let currentSection: 'header' | 'class_roster' | 'table_a' | 'table_b' | 'generic' = 'header';
    let currentTableColMap = {
      classCode: -1,
      className: -1,
      critCode: -1,
      critName: -1,
      quantity: -1,
      date: -1,
      inspector: -1,
      note: -1,
    };

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const nonBlankCells = row.map((c) => String(c || '').trim()).filter((s) => s.length > 0);
      const lowerRow = row.map((c) => String(c || '').toLowerCase().trim());
      const firstCell = lowerRow[0] || '';
      const fullRowText = lowerRow.join(' ');

      // 1. Check if this row is a Table Header (e.g. STT | Mã lớp | Tên lớp | Mã tiêu chí | Số lần...)
      const hasClassHeader = lowerRow.some((s) => s.includes('mã lớp') || s.includes('tên lớp') || s === 'lớp');
      const hasCritHeader = lowerRow.some((s) => s.includes('mã tiêu chí') || s.includes('tên tiêu chí') || s === 'tiêu chí' || s.includes('mã tc'));
      const hasQtyHeader = lowerRow.some((s) => s.includes('số lượng') || s.includes('số lần') || s === 'sl');

      if (hasClassHeader && (hasCritHeader || hasQtyHeader)) {
        // Determine whether this header is for Table A (vi phạm) or Table B (thành tích) or generic
        if (fullRowText.includes('khen thưởng') || fullRowText.includes('thành tích') || fullRowText.includes('điểm cộng')) {
          currentSection = 'table_b';
        } else if (fullRowText.includes('vi phạm') || fullRowText.includes('điểm trừ')) {
          currentSection = 'table_a';
        } else if (currentSection !== 'table_a' && currentSection !== 'table_b') {
          currentSection = 'generic';
        }

        // Reset and re-map column indices for this table
        currentTableColMap = {
          classCode: -1,
          className: -1,
          critCode: -1,
          critName: -1,
          quantity: -1,
          date: -1,
          inspector: -1,
          note: -1,
        };

        lowerRow.forEach((colText, cIdx) => {
          if (colText.includes('mã lớp') || (colText.includes('lớp') && !colText.includes('tên'))) {
            if (currentTableColMap.classCode === -1) currentTableColMap.classCode = cIdx;
          } else if (colText.includes('tên lớp')) {
            if (currentTableColMap.className === -1) currentTableColMap.className = cIdx;
          }

          if (colText.includes('mã tiêu chí') || colText.includes('mã tc')) {
            if (currentTableColMap.critCode === -1) currentTableColMap.critCode = cIdx;
          } else if (colText.includes('tên tiêu chí') || colText.includes('tiêu chí')) {
            if (currentTableColMap.critName === -1) currentTableColMap.critName = cIdx;
          }

          if (colText.includes('số lượng') || colText.includes('số lần') || colText === 'sl') {
            if (currentTableColMap.quantity === -1) currentTableColMap.quantity = cIdx;
          }

          if (colText.includes('ngày') || colText.includes('thời gian')) {
            if (currentTableColMap.date === -1) currentTableColMap.date = cIdx;
          }

          if (colText.includes('người kiểm tra') || colText.includes('cờ đỏ') || colText.includes('người ghi')) {
            if (currentTableColMap.inspector === -1) currentTableColMap.inspector = cIdx;
          }

          if (colText.includes('ghi chú')) {
            if (currentTableColMap.note === -1) currentTableColMap.note = cIdx;
          }
        });

        // Ensure defaults if some columns were not explicitly found
        if (currentTableColMap.classCode === -1) currentTableColMap.classCode = 1;
        if (currentTableColMap.className === -1) currentTableColMap.className = currentTableColMap.classCode;
        if (currentTableColMap.critCode === -1) currentTableColMap.critCode = 4;
        if (currentTableColMap.critName === -1) currentTableColMap.critName = 5;
        if (currentTableColMap.quantity === -1) currentTableColMap.quantity = 6;
        if (currentTableColMap.date === -1) currentTableColMap.date = 7;
        if (currentTableColMap.inspector === -1) currentTableColMap.inspector = 8;
        if (currentTableColMap.note === -1) currentTableColMap.note = 9;

        continue;
      }

      // 2. Check section title banners (lines with 1-2 non-blank cells)
      if (nonBlankCells.length <= 2) {
        if (fullRowText.includes('bảng a') || (fullRowText.includes('vi phạm') && fullRowText.includes('bảng'))) {
          currentSection = 'table_a';
          continue;
        }
        if (fullRowText.includes('bảng b') || (fullRowText.includes('thành tích') && fullRowText.includes('bảng')) || (fullRowText.includes('khen thưởng') && fullRowText.includes('bảng'))) {
          currentSection = 'table_b';
          continue;
        }
        if (fullRowText.includes('danh sách lớp')) {
          currentSection = 'class_roster';
          continue;
        }
      }

      // If we are in class roster section, skip it
      if (currentSection === 'class_roster') {
        continue;
      }

      // If we are in an entry section and column mappings are ready, parse data row
      if (currentTableColMap.quantity !== -1 && (currentSection === 'table_a' || currentSection === 'table_b' || currentSection === 'generic')) {
        // Skip comment or guide lines
        if (firstCell.startsWith('#') || firstCell.startsWith('---') || firstCell.startsWith('Hướng dẫn') || firstCell.startsWith('Quy ước')) {
          continue;
        }

        const rawClassVal = String(row[currentTableColMap.classCode] || row[currentTableColMap.className] || '').trim();
        const rawCritCodeVal = String(row[currentTableColMap.critCode] || '').trim();
        const rawCritNameVal = String(row[currentTableColMap.critName] || '').trim();
        const rawQtyVal = String(row[currentTableColMap.quantity] || '').trim();
        const rawDateVal = String(row[currentTableColMap.date] || '').trim();
        const rawInspectorVal = String(row[currentTableColMap.inspector] || '').trim();
        const rawNoteVal = String(row[currentTableColMap.note] || '').trim();

        // If entire row is blank, skip
        if (!rawClassVal && !rawCritCodeVal && !rawCritNameVal && !rawQtyVal) {
          continue;
        }

        // If class is filled, but criteria and quantity are completely empty, this is an untouched template row: skip cleanly
        if (rawClassVal && !rawCritCodeVal && !rawCritNameVal && (!rawQtyVal || rawQtyVal === '0')) {
          continue;
        }

        // Skip sample rows marked '(Mẫu hướng dẫn)' if untouched
        if (rawNoteVal.includes('(Mẫu hướng dẫn)') || rawNoteVal.includes('(Huong dan)')) {
          continue;
        }

        const actualRowNumber = r + 1;

        // 1. Resolve Class
        const matchedClass = resolveClassItem(rawClassVal, classes, selectedCampusId);

        // 2. Resolve Criteria
        let matchedCrit: Criteria | undefined;
        if (rawCritCodeVal) {
          matchedCrit = criteria.find(
            (cr) => cr.code.toLowerCase() === rawCritCodeVal.toLowerCase() || cr.id === rawCritCodeVal
          );
        }

        if (!matchedCrit && rawCritNameVal) {
          matchedCrit = criteria.find(
            (cr) =>
              cr.name.toLowerCase() === rawCritNameVal.toLowerCase() ||
              rawCritNameVal.toLowerCase().includes(cr.name.toLowerCase()) ||
              cr.name.toLowerCase().includes(rawCritNameVal.toLowerCase())
          );
        }

        // 3. Resolve Quantity
        const parsedQty = parseInt(rawQtyVal, 10);
        const isValidQty = !isNaN(parsedQty) && parsedQty > 0;

        // Check for Errors (Requirement 13)
        if (!matchedClass) {
          invalidRows.push({
            index: invalidRows.length + 1,
            rowNumber: actualRowNumber,
            rawClass: rawClassVal || '(Trống)',
            rawCriteria: rawCritCodeVal || rawCritNameVal || '(Trống)',
            rawValue: rawQtyVal || '(Trống)',
            reason: `Không tìm thấy lớp "${rawClassVal}" trong hệ thống nhà trường.`,
            howToFix: `Tra cứu lại Mã lớp chuẩn tại Bảng danh sách lớp (ví dụ: 6A1, 600, 7C1...).`,
          });
          continue;
        }

        if (matchedClass.campusId !== selectedCampusId) {
          const classCampus = campuses.find((c) => c.id === matchedClass.campusId);
          invalidRows.push({
            index: invalidRows.length + 1,
            rowNumber: actualRowNumber,
            rawClass: matchedClass.name,
            rawCriteria: rawCritCodeVal || rawCritNameVal || '(Trống)',
            rawValue: rawQtyVal || '(Trống)',
            reason: `Lớp ${matchedClass.name} thuộc "${classCampus?.name || matchedClass.campusId}", không thuộc phân hiệu đang chọn (${currentCampus.name}).`,
            howToFix: `Chỉ nhập các lớp thuộc phân hiệu ${currentCampus.name}.`,
          });
          continue;
        }

        if (!matchedCrit) {
          invalidRows.push({
            index: invalidRows.length + 1,
            rowNumber: actualRowNumber,
            rawClass: matchedClass.name,
            rawCriteria: rawCritCodeVal || rawCritNameVal || '(Trống)',
            rawValue: rawQtyVal || '(Trống)',
            reason: `Mã hoặc tên tiêu chí "${rawCritCodeVal || rawCritNameVal}" không tồn tại trong danh mục thi đua.`,
            howToFix: `Tra cứu chính xác mã tiêu chí tại sheet "DANH MỤC TIÊU CHÍ" (Ví dụ: CC01, TP02, VS01, HT01...).`,
          });
          continue;
        }

        if (!isValidQty) {
          invalidRows.push({
            index: invalidRows.length + 1,
            rowNumber: actualRowNumber,
            rawClass: matchedClass.name,
            rawCriteria: `[${matchedCrit.code}] ${matchedCrit.name}`,
            rawValue: rawQtyVal || '(Trống)',
            reason: `Số lượng / Số lần "${rawQtyVal}" không hợp lệ. Phải là số nguyên lớn hơn 0.`,
            howToFix: `Nhập một số nguyên dương (Ví dụ: 1, 2, 5, 8...) vào cột Số lượng / Số lần.`,
          });
          continue;
        }

        // Valid Row calculation
        const calcResult = previewCriteriaCalculation(matchedCrit.id, parsedQty, matchedClass.id);

        let parsedDate = defaultDate;
        if (rawDateVal && /^\d{4}-\d{2}-\d{2}$/.test(rawDateVal)) {
          parsedDate = rawDateVal;
        }

        const inspector = rawInspectorVal.trim() || currentUser.name;
        const note = rawNoteVal.trim();

        // Duplicate Detection (Requirement 14)
        const duplicateLog = existingLogs.find(
          (l) =>
            l.classId === matchedClass.id &&
            l.week === targetWeek &&
            (l.criteriaId === matchedCrit!.id || l.criteriaCode === matchedCrit!.code)
        );

        const isDuplicate = !!duplicateLog;

        const validatedRow: ValidatedImportRow = {
          index: validRowCounter++,
          rowNumber: actualRowNumber,
          classId: matchedClass.id,
          className: matchedClass.name,
          campusId: matchedClass.campusId,
          campusName: currentCampus.name,
          grade: matchedClass.grade,
          criteriaId: matchedCrit.id,
          criteriaCode: matchedCrit.code,
          criteriaName: matchedCrit.name,
          criteriaCategory: matchedCrit.category,
          criteriaType: matchedCrit.type,
          quantity: parsedQty,
          pointsPerUnit: calcResult.pointsPerUnit,
          totalPoints: calcResult.totalPoints,
          appliedCap: calcResult.appliedCap,
          calculationDetail: calcResult.calculationDetail,
          isDisciplinary: calcResult.isDisciplinary,
          date: parsedDate,
          inspectorName: inspector,
          note,
          status: isDuplicate ? 'duplicate' : 'valid',
          duplicateLog,
          duplicateAction: isDuplicate ? 'merge' : 'add_new',
          selectedToImport: true,
          tableSource: currentSection === 'table_b' ? 'table_b' : 'table_a',
        };

        validRows.push(validatedRow);
        if (isDuplicate) duplicateRows.push(validatedRow);
      }
    }
  }

  // --------------------------------------------------------------------------
  // PARSER B: MATRIX SHEET (If teacher entered data in Sheet "NHẬP ĐIỂM (MA TRẬN)")
  // --------------------------------------------------------------------------
  if (matrixSheet && validRows.length === 0) {
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(matrixSheet, { header: 1, raw: false });

    // Find matrix header row containing criteria columns
    let matrixHeaderIdx = -1;
    let matrixCritCols: { colIndex: number; crit: Criteria }[] = [];
    let matrixClassCol = -1;

    for (let r = 0; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row)) continue;

      const classColIdx = row.findIndex((c) => {
        const s = String(c || '').toLowerCase().trim();
        return s.includes('mã lớp') || (s.includes('lớp') && !s.includes('tên'));
      });

      if (classColIdx !== -1) {
        // Check for criteria code brackets e.g. [CC01], [TP02]
        const critColsFound: { colIndex: number; crit: Criteria }[] = [];
        row.forEach((cellVal, cIdx) => {
          const s = String(cellVal || '').trim();
          const matchCode = s.match(/\[([A-Z0-9_-]+)\]/i);
          if (matchCode) {
            const foundCrit = criteria.find(
              (cr) => cr.code.toUpperCase() === matchCode[1].toUpperCase()
            );
            if (foundCrit) {
              critColsFound.push({ colIndex: cIdx, crit: foundCrit });
            }
          }
        });

        if (critColsFound.length >= 2) {
          matrixHeaderIdx = r;
          matrixClassCol = classColIdx;
          matrixCritCols = critColsFound;
          break;
        }
      }
    }

    if (matrixHeaderIdx !== -1 && matrixCritCols.length > 0) {
      for (let r = matrixHeaderIdx + 1; r < rawMatrix.length; r++) {
        const row = rawMatrix[r];
        if (!Array.isArray(row) || row.length === 0) continue;

        const rawClassVal = String(row[matrixClassCol] || '').trim();
        if (!rawClassVal) continue;

        const matchedClass = resolveClassItem(rawClassVal, classes, selectedCampusId);
        if (!matchedClass) continue;

        // Iterate through all criteria columns for this class
        matrixCritCols.forEach(({ colIndex, crit }) => {
          const rawCellVal = String(row[colIndex] || '').trim();
          if (!rawCellVal || rawCellVal === '0') return;

          const parsedQty = parseInt(rawCellVal, 10);
          if (isNaN(parsedQty) || parsedQty <= 0) {
            invalidRows.push({
              index: invalidRows.length + 1,
              rowNumber: r + 1,
              rawClass: matchedClass.name,
              rawCriteria: `[${crit.code}] ${crit.name}`,
              rawValue: rawCellVal,
              reason: `Số lượng "${rawCellVal}" tại ô ma trận không phải là số nguyên dương.`,
              howToFix: `Nhập một số nguyên dương hoặc để trống ô nếu không có điểm.`,
            });
            return;
          }

          const calcResult = previewCriteriaCalculation(crit.id, parsedQty, matchedClass.id);

          const duplicateLog = existingLogs.find(
            (l) =>
              l.classId === matchedClass.id &&
              l.week === targetWeek &&
              (l.criteriaId === crit.id || l.criteriaCode === crit.code)
          );

          const isDuplicate = !!duplicateLog;

          const validatedRow: ValidatedImportRow = {
            index: validRowCounter++,
            rowNumber: r + 1,
            classId: matchedClass.id,
            className: matchedClass.name,
            campusId: matchedClass.campusId,
            campusName: currentCampus.name,
            grade: matchedClass.grade,
            criteriaId: crit.id,
            criteriaCode: crit.code,
            criteriaName: crit.name,
            criteriaCategory: crit.category,
            criteriaType: crit.type,
            quantity: parsedQty,
            pointsPerUnit: calcResult.pointsPerUnit,
            totalPoints: calcResult.totalPoints,
            appliedCap: calcResult.appliedCap,
            calculationDetail: calcResult.calculationDetail,
            isDisciplinary: calcResult.isDisciplinary,
            date: defaultDate,
            inspectorName: currentUser.name,
            note: 'Nhập từ bảng Ma trận Excel',
            status: isDuplicate ? 'duplicate' : 'valid',
            duplicateLog,
            duplicateAction: isDuplicate ? 'merge' : 'add_new',
            selectedToImport: true,
            tableSource: 'matrix',
          };

          validRows.push(validatedRow);
          if (isDuplicate) duplicateRows.push(validatedRow);
        });
      }
    }
  }

  const totalRowsFound = validRows.length + invalidRows.length;

  return {
    success: validRows.length > 0 || invalidRows.length === 0,
    fileMetadata,
    mismatchWarnings,
    isLockedWeek: isLocked,
    totalRowsFound,
    validRows,
    invalidRows,
    duplicateRows,
  };
}
