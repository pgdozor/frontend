import { LogEvent_LogLevel, LogEvent_LogClassification } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/log_pb';

export type LevelTier = 'info' | 'warn' | 'severe';

type LevelMeta = { tier: LevelTier; color: string };

const META: Record<LogEvent_LogLevel, LevelMeta> = {
	[LogEvent_LogLevel.UNSPECIFIED]: { tier: 'info', color: 'var(--color-steel)' },
	[LogEvent_LogLevel.PANIC]: { tier: 'severe', color: 'var(--color-panic)' },
	[LogEvent_LogLevel.FATAL]: { tier: 'severe', color: 'var(--color-danger)' },
	[LogEvent_LogLevel.ERROR]: { tier: 'severe', color: 'var(--color-command)' },
	[LogEvent_LogLevel.WARNING]: { tier: 'warn', color: 'var(--color-warn)' },
	[LogEvent_LogLevel.NOTICE]: { tier: 'info', color: 'var(--color-ok)' },
	[LogEvent_LogLevel.LOG]: { tier: 'info', color: 'var(--color-steel)' },
	[LogEvent_LogLevel.INFO]: { tier: 'info', color: 'var(--color-teal)' },
	[LogEvent_LogLevel.DEBUG]: { tier: 'info', color: 'var(--color-taupe)' }
};

// Warm brown used for warn-tier text on a tinted background (design value).
const WARN_TEXT = '#9A5B12';

export function levelTier(level: LogEvent_LogLevel): LevelTier {
	return (META[level] ?? { tier: 'info' }).tier;
}

export function levelColor(level: LogEvent_LogLevel): string {
	return (META[level] ?? { color: 'var(--color-steel)' }).color;
}

export function levelLabel(level: LogEvent_LogLevel): string {
	return LogEvent_LogLevel[level] ?? 'UNKNOWN';
}

/** Levels most-severe first, using Postgres' log_min_messages ordering where
 *  LOG ranks just below FATAL (…ERROR < LOG < FATAL < PANIC). */
export const LEVEL_ORDER: LogEvent_LogLevel[] = [
	LogEvent_LogLevel.PANIC,
	LogEvent_LogLevel.FATAL,
	LogEvent_LogLevel.LOG,
	LogEvent_LogLevel.ERROR,
	LogEvent_LogLevel.WARNING,
	LogEvent_LogLevel.NOTICE,
	LogEvent_LogLevel.INFO,
	LogEvent_LogLevel.DEBUG
];

function hexA(hex: string, alpha: number): string {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export type PillStyle = { color: string; background: string; border: string };

export function levelChip(level: LogEvent_LogLevel, active: boolean): PillStyle {
	const m = META[level] ?? { tier: 'info', color: 'var(--color-steel)' };
	if (!active)
		return { color: 'rgba(58,42,31,0.4)', background: 'transparent', border: '1px solid rgba(58,42,31,0.2)' };
	if (m.tier === 'severe') return { color: 'var(--color-paper)', background: m.color, border: `1px solid ${m.color}` };
	if (m.tier === 'warn')
		return { color: WARN_TEXT, background: hexA(m.color, 0.16), border: `1px solid ${hexA(m.color, 0.5)}` };
	return { color: m.color, background: hexA(m.color, 0.1), border: `1px solid ${hexA(m.color, 0.45)}` };
}

export function levelBadge(level: LogEvent_LogLevel): PillStyle {
	return levelChip(level, true);
}

export function classificationLabel(c: LogEvent_LogClassification): string {
	const name = LogEvent_LogClassification[c];
	if (!name || c === LogEvent_LogClassification.UNSPECIFIED) return '—';
	const words = name.toLowerCase().split('_');
	return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

export function classificationCode(c: LogEvent_LogClassification): string {
	return LogEvent_LogClassification[c] ?? '';
}

export const ALL_CLASSIFICATIONS: LogEvent_LogClassification[] = Object.values(LogEvent_LogClassification)
	.filter((v): v is LogEvent_LogClassification => typeof v === 'number' && v !== LogEvent_LogClassification.UNSPECIFIED)
	.sort((a, b) => classificationLabel(a).localeCompare(classificationLabel(b)));
