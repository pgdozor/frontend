import { C } from './theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtMs(ms: number): string {
	if (ms >= 1000) return (ms / 1000).toFixed(ms >= 10000 ? 1 : 2) + ' s';
	return ms.toFixed(ms < 10 ? 1 : 0) + ' ms';
}

export function fmtNum(n: number): string {
	return n.toLocaleString('en-US');
}

export function fmtDur(sec: number): string {
	if (sec >= 60) {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return `${m}m ${s}s`;
	}
	return `${sec}s`;
}

export function fmtRel(sec: number): string {
	const s = Math.max(0, Math.round(sec));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// "2026-06-09 14:00:00" → "Jun 9 14:00:00"
export function fmtClock(s: string): string {
	if (!s) return '—';
	const [d, t] = s.split(/[ T]/);
	const [, M, D] = d.split('-');
	return `${MONTHS[+M - 1]} ${+D} ${t}`;
}

export function fmtTs(d: Date): string {
	const p = (n: number, w = 2) => String(n).padStart(w, '0');
	return (
		`${MONTHS[d.getMonth()]} ${d.getDate()} ` +
		`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
	);
}

export function fmtClockDate(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${MONTHS[d.getMonth()]} ${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtAxisTime(value: Date | number): string {
	const d = value instanceof Date ? value : new Date(value);
	const p = (n: number) => String(n).padStart(2, '0');
	if (d.getHours() === 0 && d.getMinutes() === 0) return `${d.getMonth() + 1}/${d.getDate()}`;
	return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtCalls(n: number): string {
	if (n >= 1e6) return (n / 1e6).toFixed(2) + ' M';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + ' K';
	return String(Math.round(n));
}

export function fmtCompact(n: number): string {
	const x = Math.abs(n);
	if (x >= 1e6) return (n / 1e6).toFixed(2) + 'M';
	if (x >= 1e4) return Math.round(n / 1e3) + 'K';
	if (x >= 1e3) return (n / 1e3).toFixed(1) + 'K';
	if (x >= 10) return Math.round(n).toLocaleString('en-US');
	return n.toFixed(1);
}

export function kvTags(tags: Record<string, string>): string[] {
	return Object.entries(tags)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`);
}

export function truncate(text: string, max: number): string {
	return text.length > max ? text.slice(0, max) + '…' : text;
}

export function fmtDateTime(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return (
		`${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ` +
		`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
	);
}

export function errMsg(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

export const sevByMean = (ms: number): string => (ms >= 4000 ? C.danger : ms >= 800 ? C.warn : C.ok);
export const sevByDuration = (ms: number): string => (ms >= 10000 ? C.danger : ms >= 1000 ? C.warn : C.ok);

export const sevColorByLevel = (level: 'normal' | 'warning' | 'critical'): string =>
	level === 'critical' ? C.danger : level === 'warning' ? C.warn : C.ok;
