<script lang="ts">
	import { onDestroy } from 'svelte';
	import { clsx } from 'clsx';
	import { ArrowUpIcon, ArrowDownIcon } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';
	import type {
		StatementMetrics,
		StatementMetric,
		StatementStat
	} from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { StatementSortColumn } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { statementClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import { urlSync } from '$lib/urlState.svelte';
	import { QueryFilterState, parseDisplayTag } from '$lib/queryFilter.svelte';
	import { fmtDuration, fmtCount, sevByMean, kvTags, errMsg } from '$lib/format';
	import { C } from '$lib/theme';
	import type { MetricSeriesPoint } from '$lib/metricChart';
	import CallsChart from '$lib/components/CallsChart.svelte';
	import ChartPanel from '$lib/components/ChartPanel.svelte';
	import LineChart from '$lib/components/LineChart.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';
	import TagFilterBar from '$lib/components/TagFilterBar.svelte';

	type Row = {
		id: string;
		query: string;
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

	const headDef: { key: SortCol; label: string; align: 'left' | 'right'; width?: string; hide?: string }[] = [
		{ key: 'query', label: 'Query', align: 'left' },
		{ key: 'usr', label: 'User', align: 'left', width: '120px', hide: 'hidden sm:table-cell' },
		{ key: 'meanMs', label: 'Avg', align: 'right', width: '90px' },
		{ key: 'calls', label: 'Calls', align: 'right', width: '90px' },
		{ key: 'rowsPerCall', label: 'Rows/Call', align: 'right', width: '98px', hide: 'hidden lg:table-cell' },
		{ key: 'pctIo', label: '% IO', align: 'right', width: '78px', hide: 'hidden lg:table-cell' },
		{ key: 'pctTime', label: '% Time', align: 'right', width: '84px', hide: 'hidden lg:table-cell' }
	];

	const PAGE_SIZE = 50;

	const sortColumnProto: Record<SortCol, StatementSortColumn> = {
		query: StatementSortColumn.QUERY,
		usr: StatementSortColumn.USER,
		meanMs: StatementSortColumn.AVG,
		calls: StatementSortColumn.CALLS,
		rowsPerCall: StatementSortColumn.ROWS_PER_CALL,
		pctIo: StatementSortColumn.PCT_IO,
		pctTime: StatementSortColumn.PCT_TIME
	};

	let rows = $state<Row[]>([]);
	let hasMore = $state(false);
	let tableLoading = $state(true);
	let loadingMore = $state(false);
	let tableError = $state<string | null>(null);
	let sort = $state<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'pctTime', dir: 'desc' });

	let metrics = $state<StatementMetrics | undefined>(undefined);
	let chartRange = $state<{ from: Date; to: Date } | null>(null);
	let chartLoading = $state(true);
	let chartError = $state<string | null>(null);

	const sql = new SqlPopoverState((id) => statementClient.getStatementText({ id }).then((r) => r.query));
	const filters = new QueryFilterState();

	// Registration must happen during init, not in a $effect: AppShell rebuilds the
	// whole query string from the registered providers, and its effect would
	// otherwise run first and strip ?q=/?tag= off a deep link before we appear.
	filters.applyQuery(new URLSearchParams(page.url.search));
	onDestroy(urlSync.register(filters));

	let search = $state(filters.text);

	$effect(() => {
		const term = search;
		const id = setTimeout(() => {
			filters.text = term.trim();
		}, 250);
		return () => clearTimeout(id);
	});

	function toRow(s: StatementStat): Row {
		const calls = Number(s.calls);
		return {
			id: s.id.toString(),
			query: s.preview,
			usr: s.userName,
			meanMs: s.avgExecTime,
			calls,
			rowsPerCall: calls > 0 ? Number(s.rows) / calls : 0,
			pctIo: s.pctIo,
			pctTime: s.pctOfTotal,
			sev: sevByMean(s.avgExecTime),
			tags: kvTags(s.tags)
		};
	}

	let chartGen = 0;
	$effect(() => {
		const { from, to } = ctx.timeRange();
		chartRange = { from, to };
		const gen = ++chartGen;
		chartLoading = true;
		chartError = null;

		statementClient
			.queryStatementMetrics({
				serverName: ctx.server,
				databaseName: ctx.db,
				from: timestampFromDate(from),
				to: timestampFromDate(to)
			})
			.then((res) => {
				if (gen === chartGen) metrics = res.metrics;
			})
			.catch((e: unknown) => {
				if (gen !== chartGen) return;
				chartError = errMsg(e);
				metrics = undefined;
			})
			.finally(() => {
				if (gen === chartGen) chartLoading = false;
			});
	});

	function tableRequest(offset: number) {
		const { from, to } = ctx.timeRange();
		return {
			serverName: ctx.server,
			databaseName: ctx.db,
			from: timestampFromDate(from),
			to: timestampFromDate(to),
			queryText: filters.text,
			tagFilters: filters.toProto(),
			kinds: filters.kindsProto(),
			sortColumn: sortColumnProto[sort.col],
			sortDesc: sort.dir === 'desc',
			limit: PAGE_SIZE,
			offset
		};
	}

	let tableGen = 0;
	$effect(() => {
		const request = tableRequest(0);
		const gen = ++tableGen;
		tableLoading = true;
		tableError = null;

		statementClient
			.queryStatements(request)
			.then((res) => {
				if (gen !== tableGen) return;
				rows = res.statements.map(toRow);
				hasMore = res.hasMore;
			})
			.catch((e: unknown) => {
				if (gen !== tableGen) return;
				tableError = errMsg(e);
				rows = [];
				hasMore = false;
			})
			.finally(() => {
				if (gen === tableGen) tableLoading = false;
			});
	});

	async function loadMore() {
		if (loadingMore || tableLoading || !hasMore) return;
		const gen = tableGen;
		loadingMore = true;
		try {
			const res = await statementClient.queryStatements(tableRequest(rows.length));
			if (gen !== tableGen) return;
			rows = [...rows, ...res.statements.map(toRow)];
			hasMore = res.hasMore;
		} catch (e: unknown) {
			if (gen === tableGen) tableError = errMsg(e);
		} finally {
			loadingMore = false;
		}
	}

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

	// Numeric/text cells never truncate — only the query text (the <code>) does.
	const numCell =
		'px-4 py-3 border-b border-ink/8 text-right align-top leading-[20px] font-mono text-md text-ink whitespace-nowrap';

	function open(id: string) {
		goto(`/queries/${id}`);
	}
	function onRowKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			open(id);
		}
	}

	// The tag sits inside a row that navigates on click.
	function filterByTag(e: MouseEvent, text: string) {
		e.stopPropagation();
		const filter = parseDisplayTag(text);
		if (filter) filters.add(filter);
	}
</script>

<div class="mb-6 grid gap-4">
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
			<div class="flex h-[15rem] items-center justify-center font-mono text-sm text-ink/40">
				{chartLoading ? 'Loading…' : (chartError ?? 'No data')}
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
			<div class="flex h-[15rem] items-center justify-center font-mono text-sm text-ink/40">
				{chartLoading ? 'Loading…' : (chartError ?? 'No data')}
			</div>
		{/if}
	</ChartPanel>
</div>

<div class="border border-ink/16 bg-card">
	<header class="px-4 pt-3.5 pb-0">
		<SectionHeader title="Queries" description="Grouped by shape, with the most time-consuming first" />
	</header>
	<TagFilterBar bind:searchText={search} tags={filters} />

	<div class="overflow-x-auto">
		<table class="w-full min-w-[30rem] table-fixed border-collapse font-sans">
			<thead>
				<tr class="bg-ink/4">
					{#each headDef as h (h.key)}
						<th
							onclick={() => sortBy(h.key)}
							style:width={h.width}
							class={clsx(
								'cursor-pointer border-b border-ink/14 py-2.5 pr-4 font-condensed text-xs font-semibold tracking-[0.7px] whitespace-nowrap text-ink/55 uppercase select-none',
								h.key === 'query' ? 'pl-8' : 'pl-4',
								h.align === 'right' ? 'text-right' : 'text-left',
								h.hide
							)}
						>
							<span class="inline-flex items-center gap-1 align-middle">
								<span>{h.label}</span>
								{#if sort.col === h.key}
									{#if sort.dir === 'asc'}
										<ArrowUpIcon class="size-3 flex-none text-command" />
									{:else}
										<ArrowDownIcon class="size-3 flex-none text-command" />
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
						<td class="border-b border-ink/8 px-4 py-3 align-top">
							<div class="flex items-start gap-2.5">
								<span class="mt-2 h-2 w-2 flex-none rounded-full" style:background={q.sev}></span>
								<div class="min-w-0 flex-1">
									<code
										onmouseenter={(e) => sql.showLazy(BigInt(q.id), e)}
										onmouseleave={sql.hide}
										class="inline-block max-w-full cursor-default overflow-hidden align-top font-mono text-sm leading-[20px] text-ellipsis whitespace-nowrap text-ink transition-colors hover:text-command"
										>{q.query}</code
									>
									{#if q.tags.length > 0}
										<div class="mt-1 flex flex-wrap gap-1.5">
											{#each q.tags as t (t)}
												<Tag text={t} title="Filter by {t}" onclick={(e) => filterByTag(e, t)} />
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</td>
						<td
							title={q.usr}
							class="hidden border-b border-ink/8 px-4 py-3 align-top font-mono text-md leading-[20px] text-ink sm:table-cell"
						>
							<span class="block truncate">{q.usr}</span>
						</td>
						<td
							class="border-b border-ink/8 px-4 py-3 text-right align-top leading-[20px] font-mono text-md font-semibold whitespace-nowrap"
							style:color={q.sev}
						>
							{fmtDuration(q.meanMs)}
						</td>
						<td class={numCell}>{fmtCount(q.calls)}</td>
						<td class="{numCell} hidden lg:table-cell">{fmtCount(q.rowsPerCall)}</td>
						<td class="{numCell} hidden lg:table-cell">{q.pctIo.toFixed(1)}%</td>
						<td class="{numCell} hidden lg:table-cell">{q.pctTime.toFixed(1)}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if tableLoading}
		<div class="px-4 py-7 text-center font-mono text-sm text-ink/45">Loading…</div>
	{:else if tableError}
		<div class="px-4 py-7 text-center font-mono text-sm text-danger">{tableError}</div>
	{:else if rows.length === 0}
		<div class="px-4 py-7 text-center font-mono text-sm text-ink/45">No statements found</div>
	{:else if hasMore}
		<div class="border-t border-ink/8 p-3 text-center">
			<button
				onclick={loadMore}
				disabled={loadingMore}
				class="cursor-pointer border border-ink/16 px-5 py-2 font-condensed text-xs font-semibold tracking-[0.7px] text-ink/70 uppercase transition-colors hover:bg-command/6 hover:text-command disabled:cursor-default disabled:opacity-50"
			>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		</div>
	{/if}
</div>

<SqlPopover state={sql} />
