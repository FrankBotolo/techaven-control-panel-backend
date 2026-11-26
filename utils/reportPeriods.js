/**
 * Shared helpers for admin and seller reports. Dates are Malawi calendar days
 * (Africa/Blantyre, UTC+2, no daylight saving); `to` is inclusive.
 */
export const TZ = '+02:00';
export const TIMEZONE_LABEL = 'Africa/Blantyre (UTC+2)';

export const local = (column) => `CONVERT_TZ(${column}, '+00:00', '${TZ}')`;

/** SQL expression for the day / Monday-week / month a UTC column falls in, in Malawi time. */
export const bucket = (column, granularity) => {
  if (granularity === 'month') return `DATE_FORMAT(${local(column)}, '%Y-%m')`;
  if (granularity === 'week') return `DATE_FORMAT(DATE_SUB(DATE(${local(column)}), INTERVAL WEEKDAY(${local(column)}) DAY), '%Y-%m-%d')`;
  return `DATE_FORMAT(${local(column)}, '%Y-%m-%d')`;
};

export const num = (value) => (value == null ? 0 : Number(value));
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const utc = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

/**
 * Validates ?from&to&granularity. Returns { error } or the period plus UTC bounds as explicit strings
 * (the database stores UTC; Date replacements would be formatted in the machine's local zone).
 */
export function parsePeriod(query) {
  const today = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);
  const from = isDate(query.from) ? query.from : today.slice(0, 8) + '01';
  const to = isDate(query.to) ? query.to : today;
  const granularity = ['day', 'week', 'month'].includes(query.granularity) ? query.granularity : 'day';
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (from > to) return { error: '"from" must be on or before "to"' };
  if (days > 1100) return { error: 'Choose a range of three years or less' };
  if (granularity === 'day' && days > 400) return { error: 'Use weekly or monthly grouping for ranges over a year' };
  const start = new Date(`${from}T00:00:00${TZ}`);
  const end = new Date(new Date(`${to}T00:00:00${TZ}`).getTime() + 86_400_000);
  return { from, to, granularity, replacements: { start: utc(start), end: utc(end) } };
}

/** Every bucket key between from and to, so charts show empty periods as zero. */
export function bucketKeys(from, to, granularity) {
  const keys = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  if (granularity === 'week') cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  if (granularity === 'month') cursor.setUTCDate(1);
  while (cursor <= last && keys.length < 800) {
    keys.push(granularity === 'month' ? cursor.toISOString().slice(0, 7) : cursor.toISOString().slice(0, 10));
    if (granularity === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (granularity === 'week' ? 7 : 1));
  }
  return keys;
}

export const toNumbers = (rows, keys) => rows.map((row) => {
  const out = { ...row };
  for (const key of keys) out[key] = num(row[key]);
  return out;
});
