<script lang="ts">
	import { SearchIcon, ArrowUpIcon, ArrowDownIcon } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';
	import type { StatementMetrics, StatementMetric } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { statementClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import {
		fmtDuration,
		fmtCount,
		fmtDurationFull,
		fmtCountFull,
		sevByMean,
		kvTags,
		truncate,
		errMsg
	} from '$lib/format';
	import { C } from '$lib/theme';
	import type { MetricSeriesPoint } from '$lib/metricChart';
	import CallsChart from '$lib/components/CallsChart.svelte';
	import ChartPanel from '$lib/components/ChartPanel.svelte';
	import LineChart from '$lib/components/LineChart.svelte';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	type Row = {
		id: string;
		query: string;
		short: string;
		usr: string;
		meanMs: number;
		calls: number;
		rowsPerCall: number;
		pctIo: number;
		pctTime: number;
		sev: string;
		tags: string[];
	};

	type SortCol = 'query' | 'usr' | 'meanMs' | 'calls' | 'rowsPerCall' | 'pctIo' | 'pctTime';

	const headDef: { key: SortCol; label: string; align: 'left' | 'right'; width?: string }[] = [
		{ key: 'query', label: 'Query', align: 'left' },
		{ key: 'usr', label: 'User', align: 'left', width: '120px' },
		{ key: 'meanMs', label: 'Avg', align: 'right', width: '90px' },
		{ key: 'calls', label: 'Calls', align: 'right', width: '90px' },
		{ key: 'rowsPerCall', label: 'Rows/Call', align: 'right', width: '98px' },
		{ key: 'pctIo', label: '% IO', align: 'right', width: '78px' },
		{ key: 'pctTime', label: '% Time', align: 'right', width: '84px' }
	];

	let statements = $state<Row[]>([]);
	let metrics = $state<StatementMetrics | undefined>(undefined);
	let chartRange = $state<{ from: Date; to: Date } | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let search = $state('');
	let filter = $state('');
	let sort = $state<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'pctTime', dir: 'desc' });

	const sql = new SqlPopoverState();

	// Debounce the search box into the server-side query-text filter.
	$effect(() => {
		const term = search;
		const id = setTimeout(() => {
			filter = term.trim();
		}, 250);
		return () => clearTimeout(id);
	});

	$effect(() => {
		const { from, to } = ctx.timeRange();
		chartRange = { from, to };
		const request = {
			serverName: ctx.server,
			databaseName: ctx.db,
			from: timestampFromDate(from),
			to: timestampFromDate(to),
			filter
		};

		let cancelled = false;
		loading = true;
		error = null;

		statementClient
			.queryStatements(request)
			.then((res) => {
				if (cancelled) return;
				metrics = res.metrics;
				statements = res.statements.map((s) => ({
					id: s.id.toString(),
					query: s.query,
					short: truncate(s.query, 96),
					usr: s.userName,
					meanMs: s.avgExecTime,
					calls: Number(s.calls),
					rowsPerCall: Number(s.calls) > 0 ? Number(s.rows) / Number(s.calls) : 0,
					pctIo: s.pctIo,
					pctTime: s.pctOfTotal,
					sev: sevByMean(s.avgExecTime),
					tags: kvTags(s.tags)
				}));
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				error = errMsg(e);
				statements = [];
				metrics = undefined;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	function toPoints(m?: StatementMetric): MetricSeriesPoint[] {
		return (m?.series ?? []).filter((p) => p.at != null).map((p) => ({ at: timestampDate(p.at!), value: p.value }));
	}

	const bucketMs = $derived(Number(metrics?.bucketMs ?? 0n));
	const callsPoints = $derived(toPoints(metrics?.calls));
	const latency = $derived([
		{ label: 'p90', color: C.steel, points: toPoints(metrics?.p90) },
		{ label: 'p95', color: C.warn, points: toPoints(metrics?.p95) },
		{ label: 'p99', color: C.danger, points: toPoints(metrics?.p99) }
	]);

	function sortBy(key: SortCol) {
		if (sort.col === key) sort = { col: key, dir: sort.dir === 'asc' ? 'desc' : 'asc' };
		else sort = { col: key, dir: key === 'query' || key === 'usr' ? 'asc' : 'desc' };
	}

	const rows = $derived.by(() => {
		const { col, dir } = sort;
		return [...statements].sort((a, b) => {
			const av = a[col];
			const bv = b[col];
			if (typeof av === 'string' && typeof bv === 'string') {
				return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
			}
			return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
		});
	});

	// Numeric/text cells never truncate — only the query text (the <code>) does.
	const numCell =
		'px-[16px] py-[11px] border-b border-ink/8 text-right align-top leading-[20px] font-mono text-[13px] text-ink whitespace-nowrap';

	function open(id: string) {
		goto(`/queries/${id}`);
	}
	function onRowKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			open(id);
		}
	}
</script>

<div class="mb-[22px] grid gap-[16px]">
	<ChartPanel title="Query volume over time" description="How many times queries ran">
		{#if chartRange && callsPoints.length > 0}
			<CallsChart
				data={callsPoints}
				from={chartRange.from}
				to={chartRange.to}
				{bucketMs}
				fill={C.steel}
				label="calls"
			/>
		{:else}
			<div class="flex h-[240px] items-center justify-center font-mono text-[12px] text-ink/40">
				{loading ? 'Loading…' : (error ?? 'No data')}
			</div>
		{/if}
	</ChartPanel>

	<ChartPanel
		title="Query speed over time"
		description="How long queries took — p90 means roughly 9 in 10 finished faster"
	>
		{#if chartRange && latency.some((s) => s.points.length > 0)}
			<LineChart series={latency} from={chartRange.from} to={chartRange.to} {bucketMs} format={fmtDuration} />
		{:else}
			<div class="flex h-[240px] items-center justify-center font-mono text-[12px] text-ink/40">
				{loading ? 'Loading…' : (error ?? 'No data')}
			</div>
		{/if}
	</ChartPanel>
</div>

<div class="border border-ink/16 bg-card">
	<div class="border-b border-ink/14 p-[14px]">
		<div class="flex items-center gap-[10px] border border-ink/20 bg-paper px-[14px] py-[10px]">
			<SearchIcon class="size-[14px] flex-none text-ink/40" />
			<input
				type="text"
				bind:value={search}
				placeholder="Search SQL text or tags, e.g. service=payments"
				class="flex-1 border-none bg-transparent font-mono text-[13px] text-ink outline-none"
			/>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-[740px] table-fixed border-collapse font-sans">
			<thead>
				<tr class="bg-ink/4">
					{#each headDef as h (h.key)}
						<th
							onclick={() => sortBy(h.key)}
							style:width={h.width}
							class="cursor-pointer border-b border-ink/14 py-[10px] pr-[16px] font-condensed text-[11.5px] font-semibold tracking-[0.7px] whitespace-nowrap text-ink/55 uppercase select-none {h.key ===
							'query'
								? 'pl-[33px]'
								: 'pl-[16px]'} {h.align === 'right' ? 'text-right' : 'text-left'}"
						>
							<span class="inline-flex items-center gap-[4px] align-middle">
								<span>{h.label}</span>
								{#if sort.col === h.key}
									{#if sort.dir === 'asc'}
										<ArrowUpIcon class="size-[12px] flex-none text-command" />
									{:else}
										<ArrowDownIcon class="size-[12px] flex-none text-command" />
									{/if}
								{/if}
							</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as q (q.id)}
					<tr
						onclick={() => open(q.id)}
						onkeydown={(e) => onRowKey(e, q.id)}
						role="button"
						tabindex="0"
						class="cursor-pointer transition-colors hover:bg-command/6"
					>
						<td class="border-b border-ink/8 px-[16px] py-[11px] align-top">
							<div class="flex items-start gap-[10px]">
								<span class="mt-[7px] h-[7px] w-[7px] flex-none rounded-full" style:background={q.sev}></span>
								<div class="min-w-0 flex-1">
									<code
										onmouseenter={(e) => sql.show(q.query, e)}
										onmouseleave={sql.hide}
										class="inline-block max-w-full cursor-default overflow-hidden align-top font-mono text-[12.5px] leading-[20px] text-ellipsis whitespace-nowrap text-ink transition-colors hover:text-command"
										>{q.short}</code
									>
									{#if q.tags.length > 0}
										<div class="mt-[6px] flex flex-wrap gap-[5px]">
											{#each q.tags as t (t)}
												<Tag text={t} />
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</td>
						<td
							title={q.usr}
							class="border-b border-ink/8 px-[16px] py-[11px] align-top font-mono text-[13px] leading-[20px] text-ink"
						>
							<span class="block truncate">{q.usr}</span>
						</td>
						<td
							title={fmtDurationFull(q.meanMs)}
							class="border-b border-ink/8 px-[16px] py-[11px] text-right align-top leading-[20px] font-mono text-[13px] font-semibold whitespace-nowrap"
							style:color={q.sev}
						>
							{fmtDuration(q.meanMs)}
						</td>
						<td class={numCell} title={fmtCountFull(q.calls)}>{fmtCount(q.calls)}</td>
						<td class={numCell} title={fmtCountFull(q.rowsPerCall)}>{fmtCount(q.rowsPerCall)}</td>
						<td class={numCell}>{q.pctIo.toFixed(1)}%</td>
						<td class={numCell}>{q.pctTime.toFixed(1)}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if loading}
		<div class="px-[16px] py-[28px] text-center font-mono text-[12px] text-ink/45">Loading…</div>
	{:else if error}
		<div class="px-[16px] py-[28px] text-center font-mono text-[12px] text-danger">{error}</div>
	{:else if rows.length === 0}
		<div class="px-[16px] py-[28px] text-center font-mono text-[12px] text-ink/45">No statements for this filter</div>
	{/if}
</div>

<SqlPopover state={sql} />
