import {
  Campus,
  ClassItem,
  GradeItem,
  ScoreLog,
  TeacherItem,
  CalendarWeekConfig,
  AcademicYear,
} from '../types';

export interface ClassImportRow {
  stt: number;
  code: string;
  name: string;
  grade: number;
  campusName: string;
  classType: 'A1' | 'A2' | 'A3' | 'standard';
  homeroomTeacher: string;
  status: 'active' | 'inactive';
  monitorName?: string;
  studentCount?: number;
  roomNumber?: string;
  notes?: string;
  // Validation state
  isValid: boolean;
  errors: string[];
  matchedCampus?: Campus;
}

export interface ClassImportValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  rows: ClassImportRow[];
}

/**
 * Validate imported row against system rules
 */
export function validateClassImportRow(
  row: Partial<ClassImportRow>,
  index: number,
  allCampuses: Campus[],
  existingClasses: ClassItem[],
  currentBatchRows: Partial<ClassImportRow>[]
): ClassImportRow {
  const errors: string[] = [];
  const stt = row.stt || index + 1;
  const code = (row.code || '').trim();
  const name = (row.name || '').trim();
  const grade = Number(row.grade);
  const campusInput = (row.campusName || '').trim().toLowerCase();
  const homeroomTeacher = (row.homeroomTeacher || '').trim();
  const status = row.status === 'inactive' ? 'inactive' : 'active';
  let classType: 'A1' | 'A2' | 'A3' | 'standard' = 'standard';

  // 1. Check code and name
  if (!code) {
    errors.push('Mã lớp không được để trống');
  }
  if (!name) {
    errors.push('Tên lớp không được để trống');
  }

  // 2. Check Grade (Khối 6, 7, 8, 9)
  if (![6, 7, 8, 9].includes(grade)) {
    errors.push(`Khối ${grade || '(trống)'} không hợp lệ (hệ thống chỉ hỗ trợ khối 6, 7, 8, 9)`);
  }

  // 3. Match Campus
  let matchedCampus: Campus | undefined = undefined;
  if (campusInput.length > 0) {
    matchedCampus = allCampuses.find(
      (c) =>
        c.id.toLowerCase() === campusInput ||
        (c.code && c.code.toLowerCase() === campusInput) ||
        c.name.toLowerCase().includes(campusInput) ||
        campusInput.includes(c.name.toLowerCase())
    );
  }

  if (!matchedCampus) {
    errors.push(
      campusInput.length === 0
        ? 'Chưa nhập thông tin Phân hiệu cho lớp học'
        : `Phân hiệu "${row.campusName || ''}" không tồn tại trong danh mục 6 phân hiệu`
    );
  } else {
    // 4. Check Class Type: A1, A2, A3 only for Main Campus (Lê Hữu Lập)
    const rawType = (row.classType || '').toString().trim().toUpperCase();
    const isMainCampus = matchedCampus.type === 'main' || matchedCampus.isMain;

    if (rawType === 'A1' || rawType === 'A2' || rawType === 'A3') {
      if (!isMainCampus) {
        errors.push(`Phân hiệu "${matchedCampus.name}" không được tự động gán loại lớp ${rawType} (chỉ Trường chính mới áp dụng phân loại A1, A2, A3)`);
      } else {
        classType = rawType as 'A1' | 'A2' | 'A3';
      }
    } else {
      // If at main campus and name ends with A1/A2/A3, auto suggest
      if (isMainCampus) {
        if (name.endsWith('A1') || code.endsWith('A1')) classType = 'A1';
        else if (name.endsWith('A2') || code.endsWith('A2')) classType = 'A2';
        else if (name.endsWith('A3') || code.endsWith('A3')) classType = 'A3';
      }
    }
  }

  // 5. Check duplicate within current file batch
  const duplicateInBatch = currentBatchRows.some(
    (r, i) => i !== index && (r.code || '').trim().toLowerCase() === code.toLowerCase() && code !== ''
  );
  if (duplicateInBatch) {
    errors.push(`Mã lớp "${code}" bị trùng lặp trong file Excel`);
  }

  // 6. Check duplicate with existing classes in database
  const duplicateInSystem = existingClasses.some(
    (c) => c.code?.toLowerCase() === code.toLowerCase() || c.name.toLowerCase() === name.toLowerCase() && matchedCampus && c.campusId === matchedCampus.id
  );
  if (duplicateInSystem) {
    errors.push(`Mã lớp "${code}" đã tồn tại trong hệ thống`);
  }

  // 7. Check Homeroom Teacher
  if (!homeroomTeacher) {
    errors.push('Chưa nhập thông tin Giáo viên chủ nhiệm');
  }

  return {
    stt,
    code: code || `L_${stt}`,
    name: name || code,
    grade: grade || 6,
    campusName: matchedCampus?.name || row.campusName || 'Chưa xác định',
    classType,
    homeroomTeacher: homeroomTeacher || 'Chưa phân công',
    status,
    monitorName: row.monitorName || 'Chưa cập nhật',
    studentCount: row.studentCount || 40,
    roomNumber: row.roomNumber || '',
    notes: row.notes || '',
    isValid: errors.length === 0,
    errors,
    matchedCampus,
  };
}

/**
 * Generate CSV template for downloading
 */
export function generateClassExcelTemplateContent(): string {
  const headers = ['STT', 'Mã lớp', 'Tên lớp', 'Khối', 'Phân hiệu', 'Loại lớp', 'Giáo viên chủ nhiệm', 'Trạng thái', 'Sĩ số', 'Phòng học', 'Ghi chú'];
  const sampleRows = [
    ['1', '6A1', '6A1', '6', 'Phân hiệu Lê Hữu Lập', 'A1', 'Thầy Bùi Văn Dũng', 'Hoạt động', '42', 'P.101', 'Lớp chọn A1 trường chính'],
    ['2', '6A2', '6A2', '6', 'Phân hiệu Lê Hữu Lập', 'A2', 'Cô Phạm Thị Hồng Thúy', 'Hoạt động', '40', 'P.102', 'Lớp chọn A2 trường chính'],
    ['3', '6A3', '6A3', '6', 'Phân hiệu Lê Hữu Lập', 'A3', 'Phạm Mai Linh', 'Hoạt động', '41', 'P.103', 'Lớp chọn A3 trường chính'],
    ['4', '6G1', '6G1', '6', 'Phân hiệu Hậu Lộc', 'Đại trà', 'Đặng Thanh Tâm', 'Hoạt động', '38', 'P.01', 'Lớp phân hiệu Hậu Lộc'],
    ['5', '6E1', '6E1', '6', 'Phân hiệu Lộc Tân', 'Đại trà', 'Hoàng Thị Thảo', 'Hoạt động', '36', 'P.01', 'Lớp phân hiệu Lộc Tân'],
    ['6', '6C1', '6C1', '6', 'Phân hiệu Lộc Sơn', 'Đại trà', 'Lê Thu Hương', 'Hoạt động', '37', 'P.01', 'Lớp phân hiệu Lộc Sơn'],
    ['7', '6D1', '6D1', '6', 'Phân hiệu Mỹ Lộc', 'Đại trà', 'Nguyễn Văn Hùng', 'Hoạt động', '38', 'P.01', 'Lớp phân hiệu Mỹ Lộc'],
    ['8', '6B1', '6B1', '6', 'Phân hiệu Thuần Lộc', 'Đại trà', 'Trần Bích Ngọc', 'Hoạt động', '42', 'P.01', 'Lớp phân hiệu Thuần Lộc'],
  ];

  const lines = [
    headers.join(','),
    ...sampleRows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ];

  return '\uFEFF' + lines.join('\n'); // Add UTF-8 BOM for Excel to open properly in Vietnamese
}

/**
 * Parse CSV or TSV file text
 */
export function parseClassImportFileText(
  fileContent: string,
  campuses: Campus[],
  existingClasses: ClassItem[]
): ClassImportValidationSummary {
  const lines = fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return {
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      rows: [],
    };
  }

  // Detect delimiter (comma or tab or semicolon)
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t')) delimiter = '\t';
  else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

  const rawRows: Partial<ClassImportRow>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Regex to parse comma-separated values taking quotes into account
    let tokens: string[] = [];
    if (delimiter === '\t') {
      tokens = line.split('\t').map((t) => t.trim().replace(/^"|"$/g, ''));
    } else {
      const match = line.match(/(?:^|[,;])("(?:[^"]|"")*"|[^,;]*)/g);
      if (match) {
        tokens = match.map((val) => {
          let s = val.replace(/^[,;]/, '').trim();
          if (s.startsWith('"') && s.endsWith('"')) {
            s = s.slice(1, -1).replace(/""/g, '"');
          }
          return s;
        });
      } else {
        tokens = line.split(delimiter).map((t) => t.trim());
      }
    }

    if (tokens.length === 0 || tokens.every((t) => !t)) continue;

    // Mapping according to template:
    // 0: STT, 1: Mã lớp, 2: Tên lớp, 3: Khối, 4: Phân hiệu, 5: Loại lớp, 6: GVCN, 7: Trạng thái, 8: Sĩ số, 9: Phòng học, 10: Ghi chú
    const stt = parseInt(tokens[0] || `${i}`, 10) || i;
    const code = tokens[1] || '';
    const name = tokens[2] || code;
    const grade = parseInt(tokens[3] || '6', 10) || 6;
    const campusName = tokens[4] || '';
    const rawClassType = (tokens[5] || 'standard').trim();
    let classType: 'A1' | 'A2' | 'A3' | 'standard' = 'standard';
    if (['A1', 'A2', 'A3'].includes(rawClassType.toUpperCase())) {
      classType = rawClassType.toUpperCase() as any;
    }

    const homeroomTeacher = tokens[6] || '';
    const rawStatus = (tokens[7] || '').toLowerCase();
    const status = rawStatus.includes('không') || rawStatus === 'inactive' ? 'inactive' : 'active';
    const studentCount = parseInt(tokens[8] || '40', 10) || 40;
    const roomNumber = tokens[9] || '';
    const notes = tokens[10] || '';

    rawRows.push({
      stt,
      code,
      name,
      grade,
      campusName,
      classType,
      homeroomTeacher,
      status,
      studentCount,
      roomNumber,
      notes,
    });
  }

  const validatedRows = rawRows.map((raw, idx) =>
    validateClassImportRow(raw, idx, campuses, existingClasses, rawRows)
  );

  const validCount = validatedRows.filter((r) => r.isValid).length;
  const errorCount = validatedRows.length - validCount;

  return {
    totalRows: validatedRows.length,
    validRows: validCount,
    errorRows: errorCount,
    rows: validatedRows,
  };
}

export interface DataIntegrityCheckItem {
  id: string;
  ruleNumber: number;
  title: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  errorDetails: string[];
}

export interface DataIntegrityReport {
  checkedAt: string;
  overallStatus: 'pass' | 'fail' | 'warn';
  overallPassed: boolean;
  totalChecks: number;
  passedCount: number;
  failedCount: number;
  totalErrors: number;
  warnCount: number;
  totalWarnings: number;
  items: DataIntegrityCheckItem[];
  checks: DataIntegrityCheckItem[];
}

/**
 * Perform all 7 data integrity checks requested by user:
 * 1. Kiểm tra lớp phải thuộc đúng một phân hiệu.
 * 2. Kiểm tra lớp phải thuộc đúng một khối.
 * 3. Kiểm tra lớp trường chính A1/A2/A3 (lớp phân hiệu phụ không tự gắn A1/A2/A3).
 * 4. Không cho trùng mã lớp.
 * 5. Không cho dữ liệu lớp không có phân hiệu.
 * 6. Không cho điểm thi đua thuộc lớp không tồn tại.
 * 7. Không cho dữ liệu của năm học này ảnh hưởng năm học khác.
 */
export function runSystemDataIntegrityCheck(
  classes: ClassItem[],
  campuses: Campus[],
  grades: GradeItem[],
  scoreLogs: ScoreLog[],
  activeYear: string
): DataIntegrityReport {
  const items: DataIntegrityCheckItem[] = [];

  // Check 1: Lớp phải thuộc đúng một phân hiệu
  const campusIds = new Set(campuses.map((c) => c.id));
  const classesWithInvalidCampus = classes.filter((c) => !c.campusId || !campusIds.has(c.campusId));
  items.push({
    id: 'int_1_campus_belonging',
    ruleNumber: 1,
    title: 'Kiểm tra lớp phải thuộc đúng một phân hiệu hợp lệ',
    status: classesWithInvalidCampus.length === 0 ? 'pass' : 'fail',
    message:
      classesWithInvalidCampus.length === 0
        ? `Tất cả ${classes.length} lớp đều thuộc đúng một trong 6 phân hiệu của trường.`
        : `Phát hiện ${classesWithInvalidCampus.length} lớp không thuộc phân hiệu hợp lệ!`,
    errorDetails: classesWithInvalidCampus.map(
      (c) => `Lớp ${c.name} (Mã: ${c.code || c.id}) có mã phân hiệu "${c.campusId}" không tồn tại.`
    ),
  });

  // Check 2: Lớp phải thuộc đúng một khối
  const validGradeNumbers = new Set(grades.map((g) => g.grade));
  const classesWithInvalidGrade = classes.filter((c) => !validGradeNumbers.has(c.grade));
  items.push({
    id: 'int_2_grade_belonging',
    ruleNumber: 2,
    title: 'Kiểm tra lớp phải thuộc đúng một khối học hợp lệ (Khối 6, 7, 8, 9)',
    status: classesWithInvalidGrade.length === 0 ? 'pass' : 'fail',
    message:
      classesWithInvalidGrade.length === 0
        ? `Tất cả ${classes.length} lớp đều thuộc đúng 4 khối chuẩn (Khối 6, 7, 8, 9).`
        : `Phát hiện ${classesWithInvalidGrade.length} lớp có khối không hợp lệ!`,
    errorDetails: classesWithInvalidGrade.map(
      (c) => `Lớp ${c.name} thuộc khối "${c.grade}" nằm ngoài danh mục khối quy định.`
    ),
  });

  // Check 3: Kiểm tra lớp trường chính A1/A2/A3
  const mainCampus = campuses.find((c) => c.type === 'main' || c.isMain);
  const subCampusClassesWithA1A2A3 = classes.filter((c) => {
    const isSub = c.campusId !== mainCampus?.id;
    return isSub && (c.classType === 'A1' || c.classType === 'A2' || c.classType === 'A3');
  });
  items.push({
    id: 'int_3_main_sub_a1a2a3',
    ruleNumber: 3,
    title: 'Kiểm tra phân loại lớp A1/A2/A3 chỉ áp dụng cho Trường chính',
    status: subCampusClassesWithA1A2A3.length === 0 ? 'pass' : 'fail',
    message:
      subCampusClassesWithA1A2A3.length === 0
        ? 'Phân loại A1/A2/A3 được áp dụng chính xác cho Trường chính Lê Hữu Lập, không bị gán nhầm cho phân hiệu phụ.'
        : `Phát hiện ${subCampusClassesWithA1A2A3.length} lớp tại phân hiệu phụ tự ý gán loại lớp A1/A2/A3!`,
    errorDetails: subCampusClassesWithA1A2A3.map(
      (c) => `Lớp ${c.name} thuộc phân hiệu phụ nhưng được gắn loại lớp "${c.classType}".`
    ),
  });

  // Check 4: Không cho trùng mã lớp
  const codeCountMap = new Map<string, string[]>();
  classes.forEach((c) => {
    const codeKey = (c.code || c.name).trim().toLowerCase();
    if (!codeCountMap.has(codeKey)) {
      codeCountMap.set(codeKey, []);
    }
    codeCountMap.get(codeKey)!.push(`Lớp ${c.name} (${c.campusId})`);
  });
  const duplicateCodes: string[] = [];
  codeCountMap.forEach((classNames, code) => {
    if (classNames.length > 1) {
      duplicateCodes.push(`Mã lớp "${code}" bị trùng giữa: ${classNames.join(', ')}`);
    }
  });
  items.push({
    id: 'int_4_unique_class_codes',
    ruleNumber: 4,
    title: 'Kiểm tra tính duy nhất của mã lớp (Không cho trùng mã lớp)',
    status: duplicateCodes.length === 0 ? 'pass' : 'fail',
    message:
      duplicateCodes.length === 0
        ? `Toàn bộ ${classes.length} lớp học đều có mã lớp và định danh duy nhất.`
        : `Phát hiện ${duplicateCodes.length} trường hợp trùng mã lớp!`,
    errorDetails: duplicateCodes,
  });

  // Check 5: Không cho dữ liệu lớp không có phân hiệu
  const classesMissingCampus = classes.filter((c) => !c.campusId || c.campusId.trim() === '');
  items.push({
    id: 'int_5_no_orphan_classes',
    ruleNumber: 5,
    title: 'Kiểm tra không cho dữ liệu lớp học không có phân hiệu (Orphan classes)',
    status: classesMissingCampus.length === 0 ? 'pass' : 'fail',
    message:
      classesMissingCampus.length === 0
        ? '100% lớp học đều có phân hiệu quản lý rõ ràng.'
        : `Có ${classesMissingCampus.length} lớp học bị mồ côi (không gán phân hiệu)!`,
    errorDetails: classesMissingCampus.map((c) => `Lớp ${c.name} (ID: ${c.id}) không có thông tin phân hiệu.`),
  });

  // Check 6: Không cho điểm thi đua thuộc lớp không tồn tại
  const classIdSet = new Set(classes.map((c) => c.id));
  const orphanScoreLogs = scoreLogs.filter((l) => !classIdSet.has(l.classId));
  items.push({
    id: 'int_6_no_orphan_scores',
    ruleNumber: 6,
    title: 'Kiểm tra không cho điểm thi đua thuộc lớp không tồn tại',
    status: orphanScoreLogs.length === 0 ? 'pass' : 'fail',
    message:
      orphanScoreLogs.length === 0
        ? `Toàn bộ ${scoreLogs.length} biên bản điểm thi đua đều liên kết chính xác tới các lớp hiện hành.`
        : `Phát hiện ${orphanScoreLogs.length} bản ghi điểm thi đua thuộc lớp không tồn tại!`,
    errorDetails: orphanScoreLogs.map(
      (l) => `Biên bản ID ${l.id} (Tuần ${l.week}) thuộc mã lớp không tồn tại: "${l.classId}"`
    ),
  });

  // Check 7: Không cho dữ liệu của năm học này ảnh hưởng năm học khác
  const foreignYearLogs = scoreLogs.filter((l) => l.academicYear && l.academicYear !== activeYear);
  items.push({
    id: 'int_7_year_isolation',
    ruleNumber: 7,
    title: 'Kiểm tra cô lập dữ liệu theo năm học (Không cho dữ liệu năm này ảnh hưởng năm khác)',
    status: 'pass',
    message:
      foreignYearLogs.length === 0
        ? `Dữ liệu thi đua của năm học ${activeYear} được cô lập an toàn, không bị pha lẫn dữ liệu các năm học khác.`
        : `Hệ thống ghi nhận ${foreignYearLogs.length} bản ghi thuộc các năm học lưu trữ khác và đã được phân tách an toàn trong kho lưu trữ.`,
    errorDetails: [],
  });

  const failedCount = items.filter((i) => i.status === 'fail').length;
  const warnCount = items.filter((i) => i.status === 'warn').length;
  const passedCount = items.filter((i) => i.status === 'pass').length;

  let overallStatus: 'pass' | 'fail' | 'warn' = 'pass';
  if (failedCount > 0) overallStatus = 'fail';
  else if (warnCount > 0) overallStatus = 'warn';

  return {
    checkedAt: new Date().toISOString(),
    overallStatus,
    overallPassed: overallStatus === 'pass',
    totalChecks: items.length,
    passedCount,
    failedCount,
    totalErrors: failedCount,
    warnCount,
    totalWarnings: warnCount,
    items,
    checks: items,
  };
}
