<script lang="ts">
	import { ArrowLeftIcon, SparklesIcon } from '@lucide/svelte';
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
	import type { MetricSeriesPoint } from '$lib/metricChart';
	import CallsChart from '$lib/components/CallsChart.svelte';
	import ChartPanel from '$lib/components/ChartPanel.svelte';
	import LineChart from '$lib/components/LineChart.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import SamplesTable, { type SampleRow } from '$lib/components/SamplesTable.svelte';
	import Tag from '$lib/components/Tag.svelte';

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
		{ label: 'avg total', color: 'var(--color-command)', points: toPoints(metrics?.avg) },
		{ label: 'avg IO', color: 'var(--color-teal)', points: toPoints(metrics?.avgIo) }
	]);
</script>

<a
	href="/queries"
	class="mb-5 inline-flex items-center gap-2 font-mono text-sm font-semibold text-command hover:underline"
>
	<ArrowLeftIcon class="size-3.5" /><span>Back</span>
</a>

<div class="border border-line-card bg-card px-4 pt-3.5 pb-4">
	<header class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<SectionHeader title="Query" description="The normalized query — each captured run below fills in real values" />
		</div>
		{#if detail}
			<button
				type="button"
				onclick={() => (prettified = !prettified)}
				class="inline-flex flex-none cursor-pointer items-center gap-1.5 border px-2.5 py-1 font-condensed text-2xs font-semibold tracking-[0.7px] uppercase transition-colors {prettified
					? 'border-command bg-command text-paper'
					: 'border-line-strong text-ink/60 hover:border-ink/40 hover:text-ink'}"
			>
				<SparklesIcon class="size-3.5" /><span>Format</span>
			</button>
		{/if}
	</header>

	<div class="mt-3.5 border border-line-card bg-ink px-4 py-3.5">
		{#if detail}
			<div class="font-mono text-sm leading-[1.7] break-words whitespace-pre-wrap text-paper">
				{queryText}
			</div>
		{:else}
			<div class="font-mono text-sm text-paper/50">{metaLoading ? 'Loading…' : (metaError ?? '')}</div>
		{/if}
	</div>

	{#if tags.length > 0}
		<div class="mt-3 flex flex-wrap gap-1.5">
			{#each tags as t (t)}
				<Tag text={t} size="md" />
			{/each}
		</div>
	{/if}
</div>

<div class="mt-4 grid gap-4">
	<ChartPanel title="Query volume over time" description="How many times this query ran">
		{#if chartRange && callsPoints.length > 0}
			<CallsChart
				data={callsPoints}
				from={chartRange.from}
				to={chartRange.to}
				{bucketMs}
				fill={'var(--color-steel)'}
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
		description="How long this query took per run on average, and how much of that was disk I/O"
	>
		{#if chartRange && timing.some((s) => s.points.length > 0)}
			<LineChart series={timing} from={chartRange.from} to={chartRange.to} {bucketMs} format={fmtDuration} />
		{:else}
			<div class="flex h-[15rem] items-center justify-center font-mono text-sm text-ink/40">
				{chartLoading ? 'Loading…' : (chartError ?? 'No data')}
			</div>
		{/if}
	</ChartPanel>
</div>

<div class="mt-4 border border-line-card bg-card">
	<div class="border-b border-line px-5 py-3.5">
		<SectionHeader
			title="Captured samples"
			description="Individual runs of this query — the real values each one used, and a plan when captured"
		/>
	</div>

	<SamplesTable {samples} {sql} {id} {hasBaseTags} {extraTags} />

	{#if samplesLoading}
		<div class="px-5 py-6 text-center font-mono text-sm text-ink/45">Loading…</div>
	{:else if samplesError}
		<div class="px-5 py-6 text-center font-mono text-sm text-danger">{samplesError}</div>
	{:else if samples.length === 0}
		<div class="px-5 py-6 text-center font-mono text-sm text-ink/45">No samples captured in this range</div>
	{:else if hasMore}
		<div class="border-t border-line-soft p-3 text-center">
			<button
				onclick={loadMore}
				disabled={loadingMore}
				class="cursor-pointer border border-line-card px-5 py-2 font-condensed text-xs font-semibold tracking-[0.7px] text-ink/70 uppercase transition-colors hover:bg-command/6 hover:text-command disabled:cursor-default disabled:opacity-50"
			>
				{loadingMore ? 'Loading…' : 'Load more'}
			</button>
		</div>
	{/if}
</div>

<SqlPopover state={sql} />
