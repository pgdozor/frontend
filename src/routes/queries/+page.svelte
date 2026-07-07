<script lang="ts">
	import { SearchIcon } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { timestampFromDate } from '@bufbuild/protobuf/wkt';
	import type { StatementMetrics } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { statementClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import { fmtMs, fmtNum, fmtCalls, sevByMean, kvTags, truncate, errMsg } from '$lib/format';
	import MetricPanel from '$lib/components/MetricPanel.svelte';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	type Row = {
		id: string;
		query: string;
		short: string;
		usr: string;
		totalMs: number;
		pctTime: number;
		calls: number;
		meanMs: number;
		rowsAvg: number;
		sev: string;
		tags: string[];
	};

	type SortCol = 'query' | 'usr' | 'totalMs' | 'pctTime' | 'calls' | 'meanMs' | 'rowsAvg';

	const headDef: { key: SortCol; label: string; align: 'left' | 'right'; width?: string }[] = [
		{ key: 'query', label: 'Query', align: 'left' },
		{ key: 'usr', label: 'User', align: 'right', width: '150px' },
		{ key: 'totalMs', label: 'Total', align: 'right', width: '90px' },
		{ key: 'pctTime', label: '% Time', align: 'right', width: '84px' },
		{ key: 'calls', label: 'Calls', align: 'right', width: '90px' },
		{ key: 'meanMs', label: 'Avg', align: 'right', width: '90px' },
		{ key: 'rowsAvg', label: 'Rows', align: 'right', width: '78px' }
	];

	let statements = $state<Row[]>([]);
	let metrics = $state<StatementMetrics | undefined>(undefined);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let search = $state('');
	let filter = $state('');
	let sort = $state<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'totalMs', dir: 'desc' });

	const sql = new SqlPopoverState();

	// Debounce the search box into the server-side query-text filter.
	$effect(() => {
		const term = search;
		const id = setTimeout(() => {
			filter = term.trim();
		}, 250);
		return () => clearTimeout(id);
	});

	// Re-fetch whenever the context bar (server · database · time range) or filter changes.
	$effect(() => {
		const { from, to } = ctx.timeRange();
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
					totalMs: s.totalExecTime,
					pctTime: s.pctOfTotal,
					calls: Number(s.calls),
					meanMs: s.avgExecTime,
					rowsAvg: Number(s.rows),
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

	const arrow = (key: SortCol) => (sort.col === key ? (sort.dir === 'asc' ? '▲' : '▼') : '');

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

<!-- metric time-series -->
<div class="mb-[22px]">
	<MetricPanel {metrics} {loading} {error} />
</div>

<!-- table -->
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
							<span>{h.label}</span><span class="ml-[4px] text-[9px] text-command">{arrow(h.key)}</span>
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
						<td class={numCell}>{q.usr}</td>
						<td class={numCell}>{fmtMs(q.totalMs)}</td>
						<td class={numCell}>{q.pctTime.toFixed(1)}%</td>
						<td class={numCell}>{fmtCalls(q.calls)}</td>
						<td
							class="border-b border-ink/8 px-[16px] py-[11px] text-right align-top leading-[20px] font-mono text-[13px] font-semibold whitespace-nowrap"
							style:color={q.sev}
						>
							{fmtMs(q.meanMs)}
						</td>
						<td class={numCell}>{fmtNum(q.rowsAvg)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if loading}
		<div class="px-[16px] py-[28px] text-center font-mono text-[13px] text-ink/45">Loading…</div>
	{:else if error}
		<div class="px-[16px] py-[28px] text-center font-mono text-[13px] text-danger">{error}</div>
	{:else if rows.length === 0}
		<div class="px-[16px] py-[28px] text-center font-mono text-[13px] text-ink/45">No statements for this filter.</div>
	{/if}
</div>

<SqlPopover state={sql} />
