<script lang="ts">
	import { timestampDate } from '@bufbuild/protobuf/wkt';
	import type { StatementMetric, StatementMetrics } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { fmtDuration, fmtCount, fmtDurationFull, fmtCountFull, fmtDurationParts } from '$lib/format';
	import { C } from '$lib/theme';
	import MetricChart from '$lib/components/MetricChart.svelte';

	type MetricKey = 'TOTAL' | 'CALLS' | 'AVG' | 'ROWS' | 'READS' | 'SPILLS';

	let {
		metrics,
		loading = false,
		error = null,
		range = null
	}: {
		metrics: StatementMetrics | undefined;
		loading?: boolean;
		error?: string | null;
		range?: { from: Date; to: Date } | null;
	} = $props();

	const faint = hexAlpha(C.ink, 0.55);

	const metricDefs: {
		key: MetricKey;
		kind: 'duration' | 'count';
		color: string;
		polarity: 'badUp' | 'neutral';
		desc: string;
		format: (value: number) => string;
		formatFull: (value: number) => string;
	}[] = [
		{
			key: 'TOTAL',
			kind: 'duration',
			color: C.command,
			polarity: 'badUp',
			desc: 'Total time spent running queries',
			format: fmtDuration,
			formatFull: fmtDurationFull
		},
		{
			key: 'CALLS',
			kind: 'count',
			color: C.steel,
			polarity: 'neutral',
			desc: 'Number of times queries were executed',
			format: fmtCount,
			formatFull: fmtCountFull
		},
		{
			key: 'AVG',
			kind: 'duration',
			color: C.warn,
			polarity: 'badUp',
			desc: 'Average time per query call',
			format: fmtDuration,
			formatFull: fmtDurationFull
		},
		{
			key: 'ROWS',
			kind: 'count',
			color: C.ok,
			polarity: 'neutral',
			desc: 'Number of rows returned or changed by queries',
			format: fmtCount,
			formatFull: fmtCountFull
		},
		{
			key: 'READS',
			kind: 'count',
			color: '#4B6A8A',
			polarity: 'badUp',
			desc: 'Data pages read from storage instead of cache',
			format: fmtCount,
			formatFull: fmtCountFull
		},
		{
			key: 'SPILLS',
			kind: 'count',
			color: C.danger,
			polarity: 'badUp',
			desc: 'Temporary data written to disk when work did not fit in memory',
			format: fmtCount,
			formatFull: fmtCountFull
		}
	];

	let metric = $state<MetricKey>('TOTAL');

	function hexAlpha(hex: string, alpha: number): string {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	function trendColor(pct: number, polarity: 'badUp' | 'neutral'): string {
		if (pct === 0) return faint;
		const up = pct > 0;
		if (polarity === 'neutral') return up ? C.steel : faint;
		return up ? C.danger : C.ok;
	}

	function metricFor(source: StatementMetrics, key: MetricKey): StatementMetric | undefined {
		const byKey: Record<MetricKey, StatementMetric | undefined> = {
			TOTAL: source.total,
			CALLS: source.calls,
			AVG: source.avg,
			ROWS: source.rows,
			READS: source.reads,
			SPILLS: source.spills
		};
		return byKey[key];
	}

	const active = $derived.by(() => {
		const def = metricDefs.find((d) => d.key === metric) ?? metricDefs[0];
		const m = metrics ? metricFor(metrics, def.key) : undefined;
		const value = m?.value ?? 0;
		const pct = m?.trendPct ?? 0;
		const chart = (m?.series ?? []).map((p) => ({
			at: p.at ? timestampDate(p.at) : new Date(0),
			value: p.value
		}));
		const valueParts =
			def.kind === 'duration'
				? fmtDurationParts(value)
				: [{ value: fmtCountFull(value), unit: '' }];
		return {
			color: def.color,
			fill: hexAlpha(def.color, 0.13),
			format: def.format,
			formatFull: def.formatFull,
			desc: def.desc,
			valueParts,
			trendFmt: pct === 0 ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
			trendColor: trendColor(pct, def.polarity),
			chart
		};
	});
</script>

<div class="border border-ink/16 bg-card px-[20px] pt-[18px] pb-[16px]">
	<div class="mb-[18px] flex flex-wrap items-start justify-between gap-[18px]">
		<div>
			<div class="flex items-baseline gap-[12px] leading-none">
				<span class="inline-flex items-baseline gap-[7px] font-mono tracking-[-0.5px] whitespace-nowrap">
					{#each active.valueParts as p, i (i)}
						<span class="text-[34px] leading-none font-semibold text-ink"
							>{p.value}{#if p.unit}<span class="ml-[2px] text-[20px] font-medium text-ink/40"
									>{p.unit}</span
								>{/if}</span
						>
					{/each}
				</span>
				<span class="font-mono text-[15px] font-semibold whitespace-nowrap" style:color={active.trendColor}
					>{active.trendFmt}</span
				>
			</div>
			<div class="mt-[7px] max-w-[420px] font-sans text-[12.5px] leading-[1.45] text-ink/60">
				{active.desc}
			</div>
		</div>
		<div class="flex flex-wrap divide-x divide-ink/18 self-start border border-ink/18">
			{#each metricDefs as m (m.key)}
				<button
					type="button"
					onclick={() => (metric = m.key)}
					class="cursor-pointer px-[13px] py-[6px] font-mono text-[11.5px] tracking-[0.5px] whitespace-nowrap {metric ===
					m.key
						? 'font-bold text-paper'
						: 'font-medium text-ink/55'}"
					style:background={metric === m.key ? m.color : 'transparent'}
				>
					{m.key}
				</button>
			{/each}
		</div>
	</div>

	{#if active.chart.length > 0 && range}
		<MetricChart
			data={active.chart}
			from={range.from}
			to={range.to}
			stroke={active.color}
			fill={active.fill}
			format={active.format}
			formatFull={active.formatFull}
		/>
	{:else}
		<div class="flex h-[240px] items-center justify-center font-mono text-[13px] text-ink/45">
			{loading ? 'Loading…' : error ? error : 'No data for this range.'}
		</div>
	{/if}
</div>
