<script lang="ts">
	import { timestampDate } from '@bufbuild/protobuf/wkt';
	import type { StatementMetric, StatementMetrics } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { fmtMs, fmtCompact } from '$lib/format';
	import { C } from '$lib/theme';
	import MetricChart from '$lib/components/MetricChart.svelte';

	type MetricKey = 'TOTAL' | 'CALLS' | 'AVG' | 'ROWS' | 'READS' | 'SPILLS';

	let {
		metrics,
		loading = false,
		error = null
	}: { metrics: StatementMetrics | undefined; loading?: boolean; error?: string | null } = $props();

	const faint = hexAlpha(C.ink, 0.55);

	const metricDefs: {
		key: MetricKey;
		color: string;
		polarity: 'badUp' | 'neutral';
		desc: string;
		format: (value: number) => string;
	}[] = [
		{
			key: 'TOTAL',
			color: C.command,
			polarity: 'badUp',
			desc: 'Total time spent running queries',
			format: (v) => `${fmtCompact(v / 1000)} s`
		},
		{
			key: 'CALLS',
			color: C.steel,
			polarity: 'neutral',
			desc: 'Number of times queries were executed',
			// CALLS is an integer count — round small values rather than showing "8.0".
			format: (v) => (v >= 1000 ? fmtCompact(v) : Math.round(v).toLocaleString('en-US'))
		},
		{
			key: 'AVG',
			color: C.warn,
			polarity: 'badUp',
			desc: 'Average time per query call',
			format: (v) => fmtMs(Math.round(v))
		},
		{
			key: 'ROWS',
			color: C.ok,
			polarity: 'neutral',
			desc: 'Number of rows returned or changed by queries',
			format: fmtCompact
		},
		{
			key: 'READS',
			color: '#4B6A8A',
			polarity: 'badUp',
			desc: 'Data pages read from storage instead of cache',
			format: fmtCompact
		},
		{
			key: 'SPILLS',
			color: C.danger,
			polarity: 'badUp',
			desc: 'Temporary data written to disk when work did not fit in memory',
			format: fmtCompact
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
		// Split a formatted value like "69 s" into its number and unit so the unit can
		// render smaller and tight against the number instead of a wide 34px space.
		const valueFmt = def.format(value);
		const sp = valueFmt.indexOf(' ');
		const valueNum = sp === -1 ? valueFmt : valueFmt.slice(0, sp);
		const valueUnit = sp === -1 ? '' : valueFmt.slice(sp + 1);
		return {
			color: def.color,
			fill: hexAlpha(def.color, 0.13),
			format: def.format,
			desc: def.desc,
			valueNum,
			valueUnit,
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
				<span class="font-mono text-[34px] leading-none font-semibold tracking-[-0.5px] whitespace-nowrap text-ink"
					>{active.valueNum}{#if active.valueUnit}<span class="ml-[3px] text-[20px] font-medium text-ink/55"
							>{active.valueUnit}</span
						>{/if}</span
				>
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

	{#if active.chart.length > 0}
		<MetricChart data={active.chart} stroke={active.color} fill={active.fill} format={active.format} />
	{:else}
		<div class="flex h-[240px] items-center justify-center font-mono text-[13px] text-ink/45">
			{loading ? 'Loading…' : error ? error : 'No data for this range.'}
		</div>
	{/if}
</div>
