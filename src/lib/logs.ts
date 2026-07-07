import { LogEvent_LogLevel, LogEvent_LogClassification } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/log_pb';
import { C } from './theme';

/** Severity tier a level belongs to. Levels fold into these three bands for the
 *  histogram; the level chips + table badge keep each level's own color. */
export type LevelTier = 'info' | 'warn' | 'severe';

type LevelMeta = { tier: LevelTier; color: string };

// Per-level tier + color, matching the design's logLevelMeta().
const META: Record<LogEvent_LogLevel, LevelMeta> = {
	[LogEvent_LogLevel.UNSPECIFIED]: { tier: 'info', color: C.steel },
	[LogEvent_LogLevel.PANIC]: { tier: 'severe', color: C.panic },
	[LogEvent_LogLevel.FATAL]: { tier: 'severe', color: C.danger },
	[LogEvent_LogLevel.ERROR]: { tier: 'severe', color: C.command },
	[LogEvent_LogLevel.WARNING]: { tier: 'warn', color: C.warn },
	[LogEvent_LogLevel.NOTICE]: { tier: 'info', color: C.ok },
	[LogEvent_LogLevel.LOG]: { tier: 'info', color: C.steel },
	[LogEvent_LogLevel.INFO]: { tier: 'info', color: C.teal },
	[LogEvent_LogLevel.DEBUG]: { tier: 'info', color: C.taupe }
};

// Warm brown used for warn-tier text on a tinted background (design value).
const WARN_TEXT = '#9A5B12';

export function levelTier(level: LogEvent_LogLevel): LevelTier {
	return (META[level] ?? { tier: 'info' }).tier;
}

export function levelColor(level: LogEvent_LogLevel): string {
	return (META[level] ?? { color: C.steel }).color;
}

/** Bare level name for chips / the table badge, e.g. "ERROR", "WARNING". */
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

/** Inline styles for a colored pill (level chip / table badge). */
export type PillStyle = { color: string; background: string; border: string };

/** A level pill: dimmed when inactive, otherwise solid for severe, tinted for
 *  warn, tinted+outlined for info. The table LEVEL badge reuses the active
 *  style so it matches the chart's chips exactly. */
export function levelChip(level: LogEvent_LogLevel, active: boolean): PillStyle {
	const m = META[level] ?? { tier: 'info', color: C.steel };
	if (!active)
		return { color: 'rgba(58,42,31,0.4)', background: 'transparent', border: '1px solid rgba(58,42,31,0.2)' };
	if (m.tier === 'severe') return { color: C.paper, background: m.color, border: `1px solid ${m.color}` };
	if (m.tier === 'warn')
		return { color: WARN_TEXT, background: hexA(m.color, 0.16), border: `1px solid ${hexA(m.color, 0.5)}` };
	return { color: m.color, background: hexA(m.color, 0.1), border: `1px solid ${hexA(m.color, 0.45)}` };
}

/** The table LEVEL badge — identical to an active chip so the two stay consistent. */
export function levelBadge(level: LogEvent_LogLevel): PillStyle {
	return levelChip(level, true);
}

/** "LOG_CLASSIFICATION_LOCK_DEADLOCK_DETECTED" → "Lock deadlock detected". */
export function classificationLabel(c: LogEvent_LogClassification): string {
	const name = LogEvent_LogClassification[c];
	if (!name || c === LogEvent_LogClassification.UNSPECIFIED) return '—';
	const words = name.toLowerCase().split('_');
	return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

/** Raw enum constant name, shown as the classification cell's title tooltip. */
export function classificationCode(c: LogEvent_LogClassification): string {
	return LogEvent_LogClassification[c] ?? '';
}

/** Every classification value (except UNSPECIFIED), label-sorted, for the filter menu. */
export const ALL_CLASSIFICATIONS: LogEvent_LogClassification[] = Object.values(LogEvent_LogClassification)
	.filter((v): v is LogEvent_LogClassification => typeof v === 'number' && v !== LogEvent_LogClassification.UNSPECIFIED)
	.sort((a, b) => classificationLabel(a).localeCompare(classificationLabel(b)));
