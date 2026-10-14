/**
 * Adds calendar months while keeping the day within the target month.
 * Example: 31 August + 6 months = 28 February (or 29 in a leap year).
 */
export function addCalendarMonths(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();

  return new Date(
    year,
    month,
    Math.min(date.getDate(), lastDay),
  );
}

export function calendarDaysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  );

  return Math.round((endUtc - startUtc) / 86_400_000);
}

export function getCoolingPeriodProgress(
  firstMotionDate: Date,
  asOf: Date,
) {
  const milestoneDate = addCalendarMonths(firstMotionDate, 6);
  const totalDays = calendarDaysBetween(firstMotionDate, milestoneDate);
  const elapsedDays = calendarDaysBetween(firstMotionDate, asOf);
  const remainingDays = calendarDaysBetween(asOf, milestoneDate);

  return {
    milestoneDate,
    totalDays,
    elapsedDays: Math.max(0, Math.min(elapsedDays, totalDays)),
    remainingDays: Math.max(0, remainingDays),
    progressPercent:
      totalDays > 0
        ? Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))
        : 0,
    milestoneReached: asOf >= milestoneDate,
  };
}