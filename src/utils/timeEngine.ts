/**
 * TIME AND CALENDAR MANAGEMENT ENGINE FOR THCS LÊ HỮU LẬP
 * 
 * Quy tắc cốt lõi theo chỉ đạo:
 * 1. Tuần 1 của năm học LUÔN LÀ tuần chứa ngày 05/09 của năm đó.
 * 2. Ngày bắt đầu của Tuần 1 luôn là ngày Thứ Hai của tuần đó (start_date_of_week_1).
 *    Ví dụ năm 2026:
 *    05/09/2026 là Thứ Bảy.
 *    Lùi lại tìm Thứ Hai của tuần đó -> Thứ Hai 31/08/2026.
 *    start_date_of_week_1 = '2026-08-31'.
 * 
 * 3. Công thức tính Số Tuần Hiện Tại:
 *    Số Tuần Hiện Tại = Math.floor((Today - start_date_of_week_1) / (7 * 86400000)) + 1.
 * 
 * 4. Khi Admin chọn 'Thiết lập Tuần hiện tại' bằng tay:
 *    Hệ thống ghi đè start_date_of_week_1 tương ứng để tự động đếm tiếp chuẩn xác từ tuần đó.
 */

import { CalendarWeekConfig } from '../types';

/**
 * Format Date to YYYY-MM-DD
 */
export function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse YYYY-MM-DD to Date object at local midnight
 */
export function parseDateYMD(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return new Date();
}

/**
 * Thuật toán 1: Tìm ngày Thứ Hai của tuần chứa ngày 05/09 của năm học.
 * Tuần 1 luôn là tuần chứa 05/09; ngày bắt đầu là Thứ Hai của tuần đó.
 */
export function calculateNaturalWeek1StartDate(
  academicYearStr?: string,
  referenceDate?: Date
): string {
  const ref = referenceDate || new Date();
  let startYear = ref.getFullYear();

  if (academicYearStr && academicYearStr.includes('-')) {
    const parsedStart = parseInt(academicYearStr.split('-')[0], 10);
    if (!isNaN(parsedStart)) {
      startYear = parsedStart;
    }
  } else {
    // If today is Jan-Aug, the academic year started in previous year Sept 5
    if (ref.getMonth() < 8) {
      startYear = ref.getFullYear() - 1;
    }
  }

  // 05/09 của năm bắt đầu năm học (Tháng 9 có index = 8)
  const sept5 = new Date(startYear, 8, 5);
  const dayOfWeek = sept5.getDay(); // 0: Chủ Nhật, 1: Thứ 2, ..., 6: Thứ 7

  // Trong lịch Việt Nam (ISO-8601), tuần bắt đầu từ Thứ Hai (1) đến Chủ Nhật (0).
  // Số ngày cần lùi lại từ 05/09 để về đúng ngày Thứ Hai đầu tuần:
  // Thứ 2: lùi 0 ngày
  // Thứ 3: lùi 1 ngày
  // Thứ 4: lùi 2 ngày
  // Thứ 5: lùi 3 ngày
  // Thứ 6: lùi 4 ngày
  // Thứ 7: lùi 5 ngày (05/09/2026 là Thứ 7 -> lùi 5 ngày = 31/08/2026)
  // Chủ Nhật: lùi 6 ngày
  const daysToMonday = (dayOfWeek + 6) % 7;
  const mondayWeek1 = new Date(startYear, 8, 5 - daysToMonday);

  return formatDateYMD(mondayWeek1);
}

/**
 * Tính ngày Thứ Hai bắt đầu Tuần 1 theo Chế độ quy tắc chọn lựa:
 * - 'contains_sep_5': Tuần chứa ngày 05/09 (Ví dụ 2026: 31/08/2026)
 * - 'after_sep_5': Tuần kế tiếp sau ngày 05/09 (Ví dụ 2026: 07/09/2026 - do 05/09 là Thứ 7)
 * - 'custom': Tùy chọn ngày Thứ Hai bất kỳ
 */
export function calculateWeek1StartDateByMode(
  academicYearStr?: string,
  mode: 'contains_sep_5' | 'after_sep_5' | 'custom' = 'after_sep_5',
  customDate?: string,
  referenceDate?: Date
): string {
  if (mode === 'custom' && customDate && customDate.trim()) {
    return customDate.trim();
  }

  const naturalMondayStr = calculateNaturalWeek1StartDate(academicYearStr, referenceDate);
  if (mode === 'after_sep_5') {
    let startYear = (referenceDate || new Date()).getFullYear();
    if (academicYearStr && academicYearStr.includes('-')) {
      const parsedStart = parseInt(academicYearStr.split('-')[0], 10);
      if (!isNaN(parsedStart)) startYear = parsedStart;
    }
    const sept5 = new Date(startYear, 8, 5);
    const dayOfWeek = sept5.getDay(); // 0: Sunday, 6: Saturday
    // Nếu 05/09 rơi vào Thứ 7 (như năm 2026) hoặc Chủ Nhật, tuần thi đua nề nếp thực tế bắt đầu từ Thứ Hai kế tiếp
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      const MondayDate = parseDateYMD(naturalMondayStr);
      const nextMonday = new Date(MondayDate.getTime() + 7 * 86400000);
      return formatDateYMD(nextMonday);
    }
  }

  return naturalMondayStr;
}

/**
 * Thuật toán 2: Tính 'Số Tuần Hiện Tại' tự động và chính xác theo thời gian thực
 * Công thức: Số Tuần Hiện Tại = Math.floor((Today - start_date_of_week_1) / 7 ngày) + 1
 */
export function calculateCurrentActiveWeek(
  startDateOfWeek1Str: string,
  maxWeeks: number = 35,
  today?: Date
): {
  currentWeek: number;
  diffDays: number;
  startDateOfWeek1: string;
  isBeforeSchoolYear: boolean;
  isAfterSchoolYear: boolean;
} {
  const now = today || new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startMid = parseDateYMD(startDateOfWeek1Str);

  const diffMs = todayMid.getTime() - startMid.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Nếu thời gian thực trước ngày Thứ Hai của Tuần 1: Năm học chưa khai giảng -> Tuần 1
  if (diffDays < 0) {
    return {
      currentWeek: 1,
      diffDays,
      startDateOfWeek1: startDateOfWeek1Str,
      isBeforeSchoolYear: true,
      isAfterSchoolYear: false,
    };
  }

  // Thuật toán: Làm tròn xuống ((Today - start_date_of_week_1) / 7 ngày) + 1
  const rawWeek = Math.floor(diffDays / 7) + 1;
  const clampedWeek = Math.max(1, Math.min(maxWeeks, rawWeek));

  return {
    currentWeek: clampedWeek,
    diffDays,
    startDateOfWeek1: startDateOfWeek1Str,
    isBeforeSchoolYear: false,
    isAfterSchoolYear: rawWeek > maxWeeks,
  };
}

/**
 * Thuật toán 3: Khi Admin thiết lập 'Tuần hiện tại' bằng tay (Manual Override):
 * Ghi đè start_date_of_week_1 để hệ thống tự động đếm tiếp từ mốc tuần này.
 * 
 * Logic:
 * Giả sử hôm nay Admin chỉ định tuần hiện tại là targetWeek (ví dụ: Tuần 6).
 * Ta tìm Thứ Hai của tuần hiện tại (todayMonday).
 * Ngày bắt đầu của Tuần 1 sẽ lùi lại đúng (targetWeek - 1) * 7 ngày tính từ todayMonday!
 * Khi đó, công thức calculateCurrentActiveWeek vào ngày hôm nay sẽ cho ra đúng targetWeek,
 * và khi sang Thứ Hai tuần kế tiếp sẽ tự động nhảy lên targetWeek + 1.
 */
export function calculateOverriddenStartDateOfWeek1(
  targetWeek: number,
  today?: Date
): string {
  const now = today || new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Tìm Thứ Hai của tuần này
  const dayOfWeek = todayMid.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const currentWeekMonday = new Date(todayMid.getTime() - daysToMonday * 86400000);

  // Lùi lại (targetWeek - 1) tuần
  const weeksToRewind = Math.max(0, targetWeek - 1);
  const newWeek1Monday = new Date(currentWeekMonday.getTime() - weeksToRewind * 7 * 86400000);

  return formatDateYMD(newWeek1Monday);
}

/**
 * Lấy khoảng thời gian [Thứ Hai, Chủ Nhật] của một tuần bất kỳ
 */
export function getWeekDateRange(
  weekNumber: number,
  startDateOfWeek1Str: string
): {
  startDate: string;
  endDate: string;
  startFormatted: string;
  endFormatted: string;
  label: string;
} {
  const w1Start = parseDateYMD(startDateOfWeek1Str);
  const weekStart = new Date(w1Start.getTime() + (weekNumber - 1) * 7 * 86400000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  const startFormatted = `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')}/${weekStart.getFullYear()}`;
  const endFormatted = `${String(weekEnd.getDate()).padStart(2, '0')}/${String(weekEnd.getMonth() + 1).padStart(2, '0')}/${weekEnd.getFullYear()}`;

  return {
    startDate: formatDateYMD(weekStart),
    endDate: formatDateYMD(weekEnd),
    startFormatted,
    endFormatted,
    label: `Từ Thứ Hai ${startFormatted} đến Chủ Nhật ${endFormatted}`,
  };
}

export function generateDefaultCalendarWeeks(
  academicYear = '2026-2027',
  sem1Weeks = 18,
  sem2Weeks = 17,
  startDateStr = '2026-08-31'
): CalendarWeekConfig[] {
  const weeks: CalendarWeekConfig[] = [];
  const baseStart = new Date(startDateStr ? `${startDateStr}T00:00:00` : '2026-08-31T00:00:00'); // Thứ Hai tuần 1
  const totalWeeks = sem1Weeks + sem2Weeks;
  for (let w = 1; w <= totalWeeks; w++) {
    const wStart = new Date(baseStart.getTime() + (w - 1) * 7 * 86400000);
    const wEnd = new Date(wStart.getTime() + 5 * 86400000); // Thứ Bảy
    let month = 9;
    if (w <= 4) month = 9;
    else if (w <= 8) month = 10;
    else if (w <= 13) month = 11;
    else if (w <= sem1Weeks) month = 12;
    else if (w <= sem1Weeks + 4) month = 1;
    else if (w <= sem1Weeks + 8) month = 2;
    else if (w <= sem1Weeks + 12) month = 3;
    else month = 4;

    weeks.push({
      week: w,
      name: `Tuần ${w}`,
      startDate: wStart.toISOString().split('T')[0],
      endDate: wEnd.toISOString().split('T')[0],
      month,
      semester: w <= sem1Weeks ? 1 : 2,
      academicYear,
      isHoliday: false,
    });
  }
  return weeks;
}
