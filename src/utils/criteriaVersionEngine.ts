import { Criteria, ScoreLog } from '../types';

export function isCriteriaUsedInScores(
  critId: string,
  critCode: string,
  scoreLogs: ScoreLog[] = []
): boolean {
  if (!scoreLogs) return false;
  return scoreLogs.some(
    (l) => l.criteriaId === critId || l.criteriaCode === critCode
  );
}

export function getCriteriaEditRuleCase(
  crit: Criteria,
  scoreLogs: ScoreLog[] = [],
  lockedWeeks: number[] = []
): { ruleCase: 1 | 2 | 3; reason: string } {
  // Check if used in locked weeks
  const usedInLockedWeek = scoreLogs.some(
    (l) =>
      (l.criteriaId === crit.id || l.criteriaCode === crit.code) &&
      lockedWeeks.includes(l.week)
  );

  if (usedInLockedWeek || crit.isLocked || crit.status === 'locked') {
    return {
      ruleCase: 3,
      reason: 'Tiêu chí đã được sử dụng trong tuần đã chốt sổ hoặc đã bị chốt bảo vệ lịch sử.',
    };
  }

  const isUsed = isCriteriaUsedInScores(crit.id, crit.code, scoreLogs);
  if (isUsed) {
    return {
      ruleCase: 2,
      reason: 'Tiêu chí đang được sử dụng trong các tuần chưa chốt sổ.',
    };
  }

  return {
    ruleCase: 1,
    reason: 'Tiêu chí chưa phát sinh dữ liệu chấm điểm nào, được phép sửa trực tiếp.',
  };
}

export interface CriteriaDiffItem {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export function diffCriteriaVersions(
  oldCrit: Criteria,
  newCrit: Criteria
): CriteriaDiffItem[] {
  const diffs: CriteriaDiffItem[] = [];

  const fieldsToCheck: { key: keyof Criteria; label: string }[] = [
    { key: 'name', label: 'Tên tiêu chí' },
    { key: 'points', label: 'Điểm số' },
    { key: 'unit', label: 'Đơn vị tính' },
    { key: 'category', label: 'Danh mục' },
    { key: 'type', label: 'Loại tiêu chí' },
    { key: 'scope', label: 'Phạm vi áp dụng' },
    { key: 'period', label: 'Chu kỳ' },
    { key: 'condition', label: 'Điều kiện' },
    { key: 'maxCap', label: 'Điểm tối đa' },
    { key: 'calculationRule', label: 'Quy tắc tính' },
  ];

  fieldsToCheck.forEach(({ key, label }) => {
    if (oldCrit[key] !== newCrit[key]) {
      diffs.push({
        field: key,
        label,
        oldValue: oldCrit[key] !== undefined && oldCrit[key] !== null ? oldCrit[key] : '(Trống)',
        newValue: newCrit[key] !== undefined && newCrit[key] !== null ? newCrit[key] : '(Trống)',
      });
    }
  });

  return diffs;
}
