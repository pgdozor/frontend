<script lang="ts">
	import { Axis, Chart, Grid, Highlight, Svg, Tooltip } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { fmtAxisTime, fmtClockDate, fmtCount, fmtCountFull } from '$lib/format';
	import GapBands from '$lib/components/GapBands.svelte';
	import MetricBars from '$lib/components/MetricBars.svelte';
	import { buildMetricChartModel, type MetricSeriesPoint } from '$lib/metricChart';

	let {
		data,
		from,
		to,
		bucketMs,
		fill
	}: {
		data: MetricSeriesPoint[];
		from: Date;
		to: Date;
		bucketMs: number;
		fill: string;
	} = $props();

	const model = $derived(buildMetricChartModel(data, from, to, bucketMs));
</script>

<div class="h-[240px]">
	<Chart
		{data}
		x="at"
		xScale={scaleTime()}
		xDomain={[model.xFrom, model.xTo]}
		y="value"
		yDomain={[0, null]}
		yNice
		padding={{ left: 40, bottom: 24 }}
		tooltipContext={{ mode: 'bisect-x' }}
	>
		<Svg>
			<Grid y={{ class: 'stroke-ink/10' }} />
			<GapBands gaps={model.gaps} />
			<Axis
				placement="left"
				rule
				ticks={4}
				format={fmtCount}
				tickLabelProps={{ class: 'fill-ink/45 font-mono text-[10.5px]', stroke: 'none' }}
			/>
			<Axis
				placement="bottom"
				rule
				ticks={4}
				format={fmtAxisTime}
				tickLabelProps={{ class: 'fill-ink/45 font-mono text-[10.5px]', stroke: 'none' }}
			/>
			<MetricBars {data} {bucketMs} {fill} />
			<Highlight lines />
		</Svg>
		<Tooltip.Root
			x="data"
			y={0}
			anchor="top-left"
			xOffset={18}
			yOffset={10}
			variant="none"
			class="border border-ink/16 bg-card px-[11px] py-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
		>
			{#snippet children({ data: point }: { data: { at: Date; value: number | null } })}
				<div class="flex flex-col gap-[3px] font-mono text-[11.5px] leading-[1.4] whitespace-nowrap">
					<div class="text-ink/50">{fmtClockDate(point.at)}</div>
					{#if point.value == null}
						<div class="text-ink/40">No data</div>
					{:else}
						<div class="font-semibold text-ink">{fmtCountFull(point.value)} calls</div>
					{/if}
				</div>
			{/snippet}
		</Tooltip.Root>
	</Chart>
</div>

<style>
	:global(.lc-axis-tick-label),
	:global(.lc-axis-tick-label tspan) {
		stroke: none;
	}
</style>
