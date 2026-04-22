// lib/date.ts
// Shared local-date helper for timezone-aware "today" logic on the client.
// Returns YYYY-MM-DD in the browser's local timezone (not UTC).
// Server endpoints accept this string to avoid UTC-day drift for non-UTC users.
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
