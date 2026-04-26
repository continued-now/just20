const DAY_MS = 24 * 60 * 60 * 1000;

function localDateFromKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function offsetLocalDay(dayKey: string, offset: number): string {
  const date = localDateFromKey(dayKey);
  date.setDate(date.getDate() + offset);
  return localDayKey(date);
}

export function localDaysBetween(fromDayKey: string, toDayKey: string): number {
  const from = localDateFromKey(fromDayKey);
  const to = localDateFromKey(toDayKey);
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

export function startOfLocalWeekKey(date = new Date()): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfWeek = start.getDay();
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - daysBack);
  return localDayKey(start);
}
