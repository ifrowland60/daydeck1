/**
 * Full weeks needed to show `month` (1–12): leading days from the previous month,
 * all days in the month, then trailing days from the next month. Uses 4–6 rows
 * (28–42 cells), not always six weeks.
 */
export function getCalendarGridCellCount(year: number, month: number): number {
  const monthIndex = month - 1;
  const firstDay = new Date(year, monthIndex, 1);
  const firstDayIndex = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellsNeeded = firstDayIndex + daysInMonth;
  return Math.ceil(cellsNeeded / 7) * 7;
}
