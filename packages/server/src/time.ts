/** UTC calendar day string (YYYY-MM-DD) for a timestamp — used for daily resets. */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
