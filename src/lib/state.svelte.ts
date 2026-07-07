import { fmtClock } from './format';
import { timestampDate } from '@bufbuild/protobuf/wkt';
import type { MonitoredServer } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/health_pb';
import { healthClient } from './connect';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Quick time ranges shown in the context bar; one source for both the menu
 *  labels and each range's span. */
export const presets: { key: string; label: string; ms: number }[] = [
	{ key: '15m', label: 'Last 15 minutes', ms: 15 * MINUTE },
	{ key: '1h', label: 'Last 1 hour', ms: HOUR },
	{ key: '6h', label: 'Last 6 hours', ms: 6 * HOUR },
	{ key: '24h', label: 'Last 24 hours', ms: 24 * HOUR },
	{ key: '7d', label: 'Last 7 days', ms: 7 * DAY }
];

const DEFAULT_RANGE = '24h';
const presetMap: Record<string, string> = Object.fromEntries(presets.map((p) => [p.key, p.label]));
const presetMs: Record<string, number> = Object.fromEntries(presets.map((p) => [p.key, p.ms]));

/** A collector is considered live if its last health check is this recent. */
const HEALTH_FRESH_MS = 5 * MINUTE;

export type ServerHealth = 'ok' | 'stale';

/** Today's local date at the given wall-clock time, as "YYYY-MM-DD HH:MM:SS". */
function todayAt(time: string): string {
	const d = new Date();
	const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	return `${date} ${time}`;
}

/** Global context-bar selection (server · database · time range), shared across
 *  every screen via the sticky top bar. */
class ContextState {
	server = $state('');
	db = $state('');
	range = $state(DEFAULT_RANGE);
	// Absolute range defaults to the current day (local time).
	customFrom = $state(todayAt('00:00:00'));
	customTo = $state(todayAt('23:59:59'));

	get timeLabel(): string {
		return this.range === 'custom'
			? `${fmtClock(this.customFrom)}  →  ${fmtClock(this.customTo)}`
			: (presetMap[this.range] ?? presetMap[DEFAULT_RANGE]);
	}

	/** Resolve the current selection to an absolute [from, to] interval. */
	timeRange(): { from: Date; to: Date } {
		if (this.range === 'custom') {
			// Inputs are typed as "YYYY-MM-DD HH:MM:SS"; normalize the space to ISO's "T".
			return {
				from: new Date(this.customFrom.replace(' ', 'T')),
				to: new Date(this.customTo.replace(' ', 'T'))
			};
		}
		const to = new Date();
		const span = presetMs[this.range] ?? presetMs[DEFAULT_RANGE];
		return { from: new Date(to.getTime() - span), to };
	}
}

export const ctx = new ContextState();

/** Monitored servers and their databases, loaded from the backend health
 *  endpoint. Servers whose last health check is older than 24h are already
 *  excluded by the backend. */
class ServersState {
	list = $state<MonitoredServer[]>([]);

	async load() {
		try {
			const { servers } = await healthClient.queryServers({});
			this.list = servers;
			this.reconcile();
		} catch (err) {
			console.error('failed to load monitored servers', err);
		}
	}

	get names(): string[] {
		return this.list.map((s) => s.serverName);
	}

	databasesFor(server: string): string[] {
		return this.list.find((s) => s.serverName === server)?.databases ?? [];
	}

	/** Green while the collector reported within HEALTH_FRESH_MS, yellow once
	 *  its last health check is older than that. */
	health(server: string): ServerHealth {
		const found = this.list.find((s) => s.serverName === server);
		if (!found?.collectedAt) return 'stale';
		return Date.now() - timestampDate(found.collectedAt).getTime() <= HEALTH_FRESH_MS ? 'ok' : 'stale';
	}

	/** Keep the context-bar selection pointing at a server/database that exists. */
	reconcile() {
		if (!this.names.includes(ctx.server)) {
			ctx.server = this.names[0] ?? '';
		}
		const dbs = this.databasesFor(ctx.server);
		if (!dbs.includes(ctx.db)) {
			ctx.db = dbs[0] ?? '';
		}
	}
}

export const serversState = new ServersState();
