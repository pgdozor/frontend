import { C } from './theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sig3(n: number): string {
	if (!Number.isFinite(n)) return '—';
	const abs = Math.abs(n);
	const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
	const s = n.toFixed(decimals);
	return s.indexOf('.') === -1 ? s : s.replace(/\.?0+$/, '');
}

export function fmtDuration(ms: number): string {
	if (ms < 1000) return `${sig3(ms)}ms`;
	if (ms < 60_000) return `${sig3(ms / 1000)}s`;
	if (ms < 3_600_000) return `${sig3(ms / 60_000)}min`;
	if (ms < 86_400_000) return `${sig3(ms / 3_600_000)}h`;
	return `${sig3(ms / 86_400_000)}d`;
}

export function fmtCount(n: number): string {
	const abs = Math.abs(n);
	if (abs < 1000) return sig3(n);
	if (abs < 1e6) return sig3(n / 1e3) + 'K';
	if (abs < 1e9) return sig3(n / 1e6) + 'M';
	return sig3(n / 1e9) + 'B';
}

export function fmtDurationParts(ms: number): { value: string; unit: string }[] {
	if (ms < 1000) return [{ value: sig3(ms), unit: 'ms' }];
	const total = Math.round(ms);
	const units: [number, string][] = [
		[86_400_000, 'd'],
		[3_600_000, 'h'],
		[60_000, 'min'],
		[1_000, 's'],
		[1, 'ms']
	];
	const parts: { value: string; unit: string }[] = [];
	let rem = total;
	for (const [size, label] of units) {
		const v = Math.floor(rem / size);
		if (v > 0) parts.push({ value: String(v), unit: label });
		rem %= size;
	}
	return parts;
}

export function fmtDurationFull(ms: number): string {
	return fmtDurationParts(ms)
		.map((p) => `${p.value} ${p.unit}`)
		.join(', ');
}

export function fmtCountFull(n: number): string {
	return Math.round(n).toLocaleString('en-US');
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
