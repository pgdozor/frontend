import {
	LogEvent_LogLevel,
	LogEvent_LogClassification
} from '@buf/querysheriff_backend.bufbuild_es/querysheriff/v1/log_pb';

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

function tint(color: string, pct: number): string {
	return `color-mix(in oklab, ${color} ${pct}%, transparent)`;
}

export type PillStyle = { color: string; background: string; border: string };

export function levelChip(level: LogEvent_LogLevel, active: boolean): PillStyle {
	const m = META[level] ?? { tier: 'info', color: 'var(--color-steel)' };
	if (!active) {
		return {
			color: tint('var(--color-ink)', 40),
			background: 'transparent',
			border: '1px solid var(--color-line-strong)'
		};
	}
	if (m.tier === 'severe') return { color: 'var(--color-paper)', background: m.color, border: `1px solid ${m.color}` };
	if (m.tier === 'warn') {
		return { color: 'var(--color-warn-text)', background: tint(m.color, 16), border: `1px solid ${tint(m.color, 50)}` };
	}
	return { color: m.color, background: tint(m.color, 10), border: `1px solid ${tint(m.color, 45)}` };
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
