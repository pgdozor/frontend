<script lang="ts">
	import { ArrowLeftIcon, ExternalLinkIcon, SparklesIcon, ArrowUpIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';
	import type {
		QueryStatementDetailResponse,
		StatementMetrics,
		StatementMetric,
		StatementSample
	} from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { statementClient } from '$lib/connect';
	import { ctx, scopeLock } from '$lib/state.svelte';
	import { format } from 'sql-formatter';
	import { fmtDuration, sevByDuration, fmtTs, kvTags, errMsg } from '$lib/format';
	import { C } from '$lib/theme';
	import type { MetricSeriesPoint } from '$lib/metricChart';
	import CallsChart from '$lib/components/CallsChart.svelte';
	import ChartPanel from '$lib/components/ChartPanel.svelte';
	import LineChart from '$lib/components/LineChart.svelte';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	type SampleRow = {
		id: string;
		ts: string;
		short: string;
		tags: Record<string, string>;
		hasPlan: boolean;
		durFmt: string;
		sev: string;
	};

	const PAGE_SIZE = 50;

	let detail = $state<QueryStatementDetailResponse | undefined>(undefined);
	let metaLoading = $state(true);
	let metaError = $state<string | null>(null);

	let metrics = $state<StatementMetrics | undefined>(undefined);
	let chartRange = $state<{ from: Date; to: Date } | null>(null);
	let chartLoading = $state(true);
	let chartError = $state<string | null>(null);

	let samples = $state<SampleRow[]>([]);
	let hasMore = $state(false);
	let samplesLoading = $state(true);
	let loadingMore = $state(false);
	let samplesError = $state<string | null>(null);

	const sql = new SqlPopoverState((sampleId) =>
		statementClient.getStatementSampleText({ sampleId }).then((r) => r.query)
	);

	const id = $derived(page.params.id ?? '');
	const validId = $derived(/^\d+$/.test(id));

	let metaGen = 0;
	$effect(() => {
		const statementId = id;
		const { from, to } = ctx.timeRange();
		const gen = ++metaGen;

		if (!validId) {
			metaError = 'Invalid query id';
			detail = undefined;
			metaLoading = false;
			return;
		}

		metaLoading = true;
		metaError = null;

		statementClient
			.queryStatementDetail({
				id: BigInt(statementId),
				from: timestampFromDate(from),
				to: timestampFromDate(to)
			})
			.then((res) => {
				if (gen === metaGen) detail = res;
			})
			.catch((e: unknown) => {
				if (gen !== metaGen) return;
				metaError = errMsg(e);
				detail = undefined;
			})
			.finally(() => {
				if (gen === metaGen) metaLoading = false;
			});
	});

	let chartGen = 0;
	$effect(() => {
		const statementId = id;
		const { from, to } = ctx.timeRange();
		chartRange = { from, to };
		const gen = ++chartGen;

		if (!validId) {
			chartError = 'Invalid query id';
			metrics = undefined;
			chartLoading = false;
			return;
		}

		chartLoading = true;
		chartError = null;

		statementClient
			.queryStatementDetailMetrics({
				id: BigInt(statementId),
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

	function sampleRequest(offset: number) {
		const { from, to } = ctx.timeRange();
		return {
			id: BigInt(id),
			from: timestampFromDate(from),
			to: timestampFromDate(to),
			limit: PAGE_SIZE,
			offset
		};
	}

	function toSampleRow(s: StatementSample): SampleRow {
		return {
			id: s.id.toString(),
			ts: s.occurredAt ? fmtTs(timestampDate(s.occurredAt)) : '—',
			short: s.query,
			tags: s.tags,
			hasPlan: s.hasPlan,
			durFmt: fmtDuration(s.durationMs),
			sev: sevByDuration(s.durationMs)
		};
	}

	let samplesGen = 0;
	$effect(() => {
		const request = validId ? sampleRequest(0) : null;
		const gen = ++samplesGen;

		if (!request) {
			samplesError = 'Invalid query id';
			samples = [];
			hasMore = false;
			samplesLoading = false;
			return;
		}

		samplesLoading = true;
		samplesError = null;

		statementClient
			.queryStatementSamples(request)
			.then((res) => {
				if (gen !== samplesGen) return;
				samples = res.samples.map(toSampleRow);
				hasMore = res.hasMore;
			})
			.catch((e: unknown) => {
				if (gen !== samplesGen) return;
				samplesError = errMsg(e);
				samples = [];
				hasMore = false;
			})
			.finally(() => {
				if (gen === samplesGen) samplesLoading = false;
			});
	});

	async function loadMore() {
		if (loadingMore || samplesLoading || !hasMore) return;
		const gen = samplesGen;
		loadingMore = true;
		try {
			const res = await statementClient.queryStatementSamples(sampleRequest(samples.length));
			if (gen !== samplesGen) return;
			samples = [...samples, ...res.samples.map(toSampleRow)];
			hasMore = res.hasMore;
		} catch (e: unknown) {
			if (gen === samplesGen) samplesError = errMsg(e);
		} finally {
			loadingMore = false;
		}
	}

	$effect(() => {
		if (!detail) return;
		scopeLock.lock(detail.serverName, detail.databaseName);
		ctx.server = detail.serverName;
		ctx.db = detail.databaseName;
	});

	$effect(() => () => scopeLock.unlock());

	const baseTags = $derived(detail?.tags ?? {});
	const tags = $derived(kvTags(baseTags));
	const hasBaseTags = $derived(Object.keys(baseTags).length > 0);

	// Samples carry the base tags too; show only the ones that differ from the
	// base so each row isn't a repeat of the tag list shown at the top.
	function extraTags(tagMap: Record<string, string>): string[] {
		return kvTags(Object.fromEntries(Object.entries(tagMap).filter(([k, v]) => baseTags[k] !== v)));
	}

	// Raw normalized query by default; the Prettify toggle pretty-prints it.
	let prettified = $state(false);
	const queryText = $derived.by(() => {
		const q = detail?.query ?? '';
		if (!q || !prettified) return q;
		try {
			return format(q, { language: 'postgresql' });
		} catch {
			return q;
		}
	});

	function toPoints(m?: StatementMetric): MetricSeriesPoint[] {
		return (m?.series ?? []).filter((p) => p.at != null).map((p) => ({ at: timestampDate(p.at!), value: p.value }));
	}

	const bucketMs = $derived(Number(metrics?.bucketMs ?? 0n));
	const callsPoints = $derived(toPoints(metrics?.calls));
	const timing = $derived([
		{ label: 'avg total', color: C.command, points: toPoints(metrics?.avg) },
		{ label: 'avg IO', color: C.teal, points: toPoints(metrics?.avgIo) }
	]);

	const thBase =
		'border-b border-ink/14 px-[18px] py-[9px] font-condensed text-[11px] font-semibold tracking-[0.7px] text-ink/55 uppercase';
</script>

<a
	href="/queries"
	class="mb-[18px] inline-flex items-center gap-[7px] font-mono text-[12px] font-semibold text-command hover:underline"
>
	<ArrowLeftIcon class="size-[14px]" /><span>Back</span>
</a>

<div class="border border-ink/16 bg-card px-[16px] pt-[14px] pb-[16px]">
	<header class="flex items-start justify-between gap-[12px]">
		<div class="min-w-0">
			<h2 class="font-condensed text-[12px] leading-[1.15] font-bold tracking-[0.8px] text-ink/70 uppercase">Query</h2>
			<p class="mt-[2px] text-[11.5px] leading-[1.2] text-ink/45">
				The normalized query — each captured run below fills in real values
			</p>
		</div>
		{#if detail}
			<button
				type="button"
				onclick={() => (prettified = !prettified)}
				class="inline-flex flex-none cursor-pointer items-center gap-[5px] border px-[10px] py-[4px] font-condensed text-[10.5px] font-semibold tracking-[0.7px] uppercase transition-colors {prettified
					? 'border-command bg-command text-paper'
					: 'border-ink/20 text-ink/60 hover:border-ink/40 hover:text-ink'}"
			>
				<SparklesIcon class="size-[13px]" /><span>Format</span>
			</button>
		{/if}
	</header>

	<div class="mt-[14px] border border-ink/16 bg-ink px-[16px] py-[14px]">
		{#if detail}
			<div class="font-mono text-[12.5px] leading-[1.7] break-words whitespace-pre-wrap text-paper">
				{queryText}
			</div>
		{:else}
			<div class="font-mono text-[12.5px] text-paper/50">{metaLoading ? 'Loading…' : (metaError ?? '')}</div>
		{/if}
	</div>

	{#if tags.length > 0}
		<div class="mt-[12px] flex flex-wrap gap-[6px]">
			{#each tags as t (t)}
				<Tag text={t} size="md" />
			{/each}
		</div>
	{/if}
</div>

<div class="mt-[16px] grid gap-[16px]">
	<ChartPanel title="Query volume over time" description="How many times this query ran">
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
				{chartLoading ? 'Loading…' : (chartError ?? 'No data')}
			</div>
		{/if}
	</ChartPanel>

	<ChartPanel
		title="Query speed over time"
		description="How long this query took per run on average, and how much of that was disk I/O"
	>
		{#if chartRange && timing.some((s) => s.points.length > 0)}
			<LineChart series={timing} from={chartRange.from} to={chartRange.to} {bucketMs} format={fmtDuration} />
		{:else}
			<div class="flex h-[240px] items-center justify-center font-mono text-[12px] text-ink/40">
				{chartLoading ? 'Loading…' : (chartError ?? 'No data')}
			</div>
		{/if}
	</ChartPanel>
</div>

<div class="mt-[16px] border border-ink/16 bg-card">
	<div class="border-b border-ink/14 px-[18px] py-[13px]">
		<h2 class="font-condensed text-[12px] leading-[1.15] font-bold tracking-[0.8px] text-ink/70 uppercase">
			Captured samples
		</h2>
		<p class="mt-[2px] text-[11.5px] leading-[1.2] text-ink/45">
			Individual runs of this query — the real values each one used, and a plan when captured
		</p>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-[420px] table-fixed border-collapse">
			<thead>
				<tr class="bg-ink/4">
					<th class="{thBase} hidden w-[180px] text-left sm:table-cell">At</th>
					<th class="{thBase} text-left">Query</th>
					<th class="{thBase} w-[112px] text-left">Plan</th>
					<th class="{thBase} w-[110px] text-right">Duration</th>
				</tr>
			</thead>
			<tbody>
				{#each samples as s (s.id)}
					{@const extra = extraTags(s.tags)}
					<tr class="hover:bg-ink/3">
						<td
							class="hidden border-b border-ink/8 px-[18px] py-[11px] align-top font-mono text-[12px] leading-[20px] whitespace-nowrap text-ink/75 sm:table-cell"
							>{s.ts}</td
						>
						<td class="min-w-0 border-b border-ink/8 px-[18px] py-[11px] align-top">
							<code
								onmouseenter={(e) => sql.showLazy(BigInt(s.id), e)}
								onmouseleave={sql.hide}
								class="inline-block max-w-full cursor-default overflow-hidden align-top font-mono text-[12.5px] leading-[20px] text-ellipsis whitespace-nowrap text-ink transition-colors hover:text-command"
								>{s.short}</code
							>
							{#if hasBaseTags || extra.length > 0}
								<div class="mt-[3px] flex flex-wrap items-center gap-[5px]">
									{#if hasBaseTags}
										<span
											title="Also carries the base tags shown at the top"
											class="inline-flex items-center gap-[3px] border border-ink/12 px-[6px] py-[1px] font-mono text-[11px] text-ink/40"
										>
											<ArrowUpIcon class="size-[10px]" />base tags
										</span>
									{/if}
									{#each extra as t (t)}
										<Tag text={t} />
									{/each}
								</div>
							{/if}
						</td>
						<td class="border-b border-ink/8 px-[18px] py-[11px] align-top">
							{#if s.hasPlan}
								<a
									href="/queries/{id}/plan/{s.id}"
									target="_blank"
									rel="noopener"
									class="inline-flex items-center gap-[5px] align-top font-mono text-[12px] leading-[20px] font-semibold whitespace-nowrap text-command hover:underline"
								>
									<span>view plan</span>
									<ExternalLinkIcon class="size-[11px] stroke-[2.2]" />
								</a>
							{:else}
								<span class="font-mono text-[12px] leading-[20px] text-ink/35">—</span>
							{/if}
						</td>
						<td
							class="border-b border-ink/8 px-[18px] py-[11px] text-right align-top font-mono text-[13px] leading-[20px] font-semibold whitespace-nowrap"
							style:color={s.sev}>{s.durFmt}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if samplesLoading}
		<div class="px-[18px] py-[24px] text-center font-mono text-[12px] text-ink/45">Loading…</div>
	{:else if samplesError}
		<div class="px-[18px] py-[24px] text-center font-mono text-[12px] text-danger">{samplesError}</div>
	{:else if samples.length === 0}
		<div class="px-[18px] py-[24px] text-center font-mono text-[12px] text-ink/45">
			No samples captured in this range
		</div>
	{:else if hasMore}
		<div class="border-t border-ink/8 p-[12px] text-center">
			<button
				onclick={loadMore}
				disabled={loadingMore}
				class="cursor-pointer border border-ink/16 px-[18px] py-[8px] font-condensed text-[11.5px] font-semibold tracking-[0.7px] text-ink/70 uppercase transition-colors hover:bg-command/6 hover:text-command disabled:cursor-default disabled:opacity-50"
			>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		</div>
	{/if}
</div>

<SqlPopover state={sql} />
