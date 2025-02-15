/**
 * Formats a date into a human-readable "time ago" string
 * @param date The date to format
 * @returns A string like "2 hours ago", "3 days ago", etc.
 */
export function timeAgo(date: Date | string | number): string {
  const now = new Date();
  const past = new Date(date);
  const msAgo = now.getTime() - past.getTime();
  const secondsAgo = Math.floor(msAgo / 1000);
  const minutesAgo = Math.floor(secondsAgo / 60);
  const hoursAgo = Math.floor(minutesAgo / 60);
  const daysAgo = Math.floor(hoursAgo / 24);
  const weeksAgo = Math.floor(daysAgo / 7);
  const monthsAgo = Math.floor(daysAgo / 30);
  const yearsAgo = Math.floor(daysAgo / 365);

  if (secondsAgo < 60) {
    return `${secondsAgo} seconds ago`;
  } else if (minutesAgo < 60) {
    const remainingSeconds = secondsAgo % 60;
    return `${minutesAgo}m ${remainingSeconds}s ago`;
  } else if (hoursAgo < 24) {
    const remainingMinutes = minutesAgo % 60;
    return `${hoursAgo}h ${remainingMinutes}m ago`;
  } else if (daysAgo < 7) {
    const remainingHours = hoursAgo % 24;
    return `${daysAgo}d ${remainingHours}h ago`;
  } else if (weeksAgo < 4) {
    const remainingDays = daysAgo % 7;
    return `${weeksAgo}w ${remainingDays}d ago`;
  } else if (monthsAgo < 12) {
    const remainingWeeks = Math.floor((daysAgo % 30) / 7);
    return `${monthsAgo}mo ${remainingWeeks}w ago`;
  } else {
    const remainingMonths = monthsAgo % 12;
    return `${yearsAgo}y ${remainingMonths}mo ago`;
  }
} 