/**
 * Formats any time string (24h or 12h) to a clean 12-hour format string with AM/PM.
 * e.g. "14:30" -> "2:30 PM"
 *      "09:00" -> "9:00 AM"
 *      "10:00 AM" -> "10:00 AM"
 */
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr || !timeStr.trim()) return '';
  const trimmed = timeStr.trim();

  // If already contains AM or PM (case insensitive)
  if (/am|pm/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Parse HH:mm or HH:mm:ss
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2).padStart(2, '0');

  if (isNaN(hours)) return trimmed;

  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${period}`;
}
