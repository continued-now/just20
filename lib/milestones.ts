export const MILESTONE_DAYS = [7, 14, 21, 30, 60, 90, 100, 365] as const;

export const MILESTONE_COPY: Record<number, string> = {
  7:   "SEVEN DAYS.\nYou're not normal.",
  14:  "TWO WEEKS.\nThe floor respects you.",
  21:  "21 DAYS.\nA habit is born.",
  30:  "30 DAYS.\nThe floor fears you.",
  60:  "60 DAYS.\nYou're built different.",
  90:  "90 DAYS.\nCertified destroyer.",
  100: "100 DAYS.\nYou are the 1%.",
  365: "365 DAYS.\nUnbreakable.",
};

export function getNextMilestone(current: number): { days: number; daysLeft: number } | null {
  const next = MILESTONE_DAYS.find(m => m > current);
  if (!next) return null;
  return { days: next, daysLeft: next - current };
}

export function isMilestoneDay(current: number): boolean {
  return (MILESTONE_DAYS as readonly number[]).includes(current);
}
