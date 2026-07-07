import { C } from './theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "4.82 s" / "910 ms" — matches fmtMs from the source design. */
export function fmtMs(ms: number): string {
	if (ms >= 1000) return (ms / 1000).toFixed(ms >= 10000 ? 1 : 2) + ' s';
	return ms.toFixed(ms < 10 ? 1 : 0) + ' ms';
}

/** Locale-grouped integer, e.g. "184,203". */
export function fmtNum(n: number): string {
	return n.toLocaleString('en-US');
}

/** "5m 12s" / "42s" from a duration in seconds. */
export function fmtDur(sec: number): string {
	if (sec >= 60) {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}m ${s}s`;
	}
	return `${sec}s`;
}

/** Relative "M:SS" offset from a baseline, e.g. 165 → "2:45" (transaction event timeline). */
export function fmtRel(sec: number): string {
	const s = Math.max(0, Math.round(sec));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "2026-06-09 14:00:00" → "Jun 9 14:00:00" for the time-range label. */
export function fmtClock(s: string): string {
	if (!s) return '—';
	const [d, t] = s.split(/[ T]/);
	const [, M, D] = d.split('-');
	return `${MONTHS[+M - 1]} ${+D} ${t}`;
}

/** "Jun 26 14:21:08.441" (local) for a captured sample timestamp. */
export function fmtTs(d: Date): string {
	const p = (n: number, w = 2) => String(n).padStart(w, '0');
	return (
		`${MONTHS[d.getMonth()]} ${d.getDate()} ` +
		`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
	);
}

/** "Jun 26 14:21:08" (local, whole seconds) — coarse clock for a transaction's start. */
export function fmtClockDate(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${MONTHS[d.getMonth()]} ${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Chart x-axis label: 24-hour "06:00" for an intraday tick, "6/27" at a day boundary (local time). */
export function fmtAxisTime(value: Date | number): string {
	const d = value instanceof Date ? value : new Date(value);
	const p = (n: number) => String(n).padStart(2, '0');
	if (d.getHours() === 0 && d.getMinutes() === 0) return `${d.getMonth() + 1}/${d.getDate()}`;
	return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Compact call count, e.g. "1.24 M" / "12.0 K" / "503". */
export function fmtCalls(n: number): string {
	if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
	return String(Math.round(n));
}

/** Compact magnitude, e.g. "1.24M" / "48K" / "9.1K" / "503" / "4.2". */
export function fmtCompact(n: number): string {
	const x = Math.abs(n);
	if (x >= 1e6) return (n / 1e6).toFixed(2) + 'M';
	if (x >= 1e4) return Math.round(n / 1e3) + 'K';
	if (x >= 1e3) return (n / 1e3).toFixed(1) + 'K';
	if (x >= 10) return Math.round(n).toLocaleString('en-US');
	return n.toFixed(1);
}

/** Sorted "key=value" tag list for display. */
export function kvTags(tags: Record<string, string>): string[] {
	return Object.entries(tags)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`);
}

/** Clip `text` to `max` characters, appending an ellipsis when shortened. */
export function truncate(text: string, max: number): string {
	return text.length > max ? text.slice(0, max) + '…' : text;
}

/** "Jun 10, 2026 09:22:04" — calendar date + local wall-clock time, for
 *  created-at columns. */
export function fmtDateTime(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return (
		`${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ` +
		`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
	);
}

/** Best-effort human-readable message from an unknown thrown value. */
export function errMsg(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

// ---- severity coloring ----
/** Normalized-query mean-duration severity (Query Statistics table). */
export const sevByMean = (ms: number): string => (ms >= 4000 ? C.danger : ms >= 800 ? C.warn : C.ok);
/** Sample/plan absolute-duration severity (samples, captured plans). */
export const sevByDuration = (ms: number): string => (ms >= 10000 ? C.danger : ms >= 1000 ? C.warn : C.ok);

/** Backend-assigned tag severity → palette color (transaction tags). */
export const sevColorByLevel = (level: 'normal' | 'warning' | 'critical'): string =>
	level === 'critical' ? C.danger : level === 'warning' ? C.warn : C.ok;
