/**
 * Date calculation and helper utilities for Aurevia SMS
 */

/**
 * Calculates a cohort end date given a start date string (YYYY-MM-DD)
 * and the course duration in weeks.
 * Example: '2026-10-05' + 5 weeks = '2026-11-09'
 */
export const calculateCohortEndDate = (startDateStr: string, durationWeeks: number): string => {
  if (!startDateStr || !durationWeeks || durationWeeks <= 0) return '';
  const parts = startDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + Math.round(durationWeeks * 7));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
};

/**
 * Calculates the difference in weeks and days between two dates.
 */
export const getCohortDurationSummary = (
  startStr: string,
  endStr: string
): { days: number; weeks: number } | null => {
  if (!startStr || !endStr) return null;
  const sParts = startStr.split('-').map(Number);
  const eParts = endStr.split('-').map(Number);
  if (sParts.length !== 3 || eParts.length !== 3) return null;
  const s = new Date(sParts[0], sParts[1] - 1, sParts[2]);
  const e = new Date(eParts[0], eParts[1] - 1, eParts[2]);
  const diffTime = e.getTime() - s.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  const weeks = Math.round((days / 7) * 10) / 10;
  return { days, weeks };
};
