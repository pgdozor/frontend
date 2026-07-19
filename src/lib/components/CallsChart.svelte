<script lang="ts">
	import { Axis, Chart, Grid, Highlight, Svg, Tooltip } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { fmtAxisTime, fmtBucketRange, fmtCount, fmtCountFull } from '$lib/format';
	import ChartLegend from '$lib/components/ChartLegend.svelte';
	import GapBands from '$lib/components/GapBands.svelte';
	import MetricBars from '$lib/components/MetricBars.svelte';
	import SeriesPoints from '$lib/components/SeriesPoints.svelte';
	import { buildMetricChartModel, type MetricSeriesPoint } from '$lib/metricChart';

	let {
		data,
		from,
		to,
		bucketMs,
		fill,
		label
	}: {
		data: MetricSeriesPoint[];
		from: Date;
		to: Date;
		bucketMs: number;
		fill: string;
		label: string;
	} = $props();

	const model = $derived(buildMetricChartModel(data, from, to, bucketMs));

	const bucketCenter = $derived((d: MetricSeriesPoint) => new Date(d.at.getTime() - model.step / 2));
</script>

<div>
	<ChartLegend items={[{ label, color: fill }]} />
	<div class="h-[15rem]">
		<Chart
			{data}
			x={bucketCenter}
			xScale={scaleTime()}
			xDomain={[model.xFrom, model.xTo]}
			y="value"
			yDomain={[0, null]}
			yNice
			padding={{ left: 36, bottom: 24 }}
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
					tickLabelProps={{ class: 'fill-ink/45 font-mono text-2xs', stroke: 'none' }}
				/>
				<Axis
					placement="bottom"
					rule
					ticks={6}
					format={fmtAxisTime}
					tickLabelProps={{ class: 'fill-ink/45 font-mono text-2xs', stroke: 'none' }}
				/>
				<MetricBars {data} bucketMs={model.step} {fill} />
				<Highlight lines motion="none" />
				<SeriesPoints colors={[fill]} values={(d: MetricSeriesPoint) => [d.value]} />
			</Svg>
			<Tooltip.Root
				x="data"
				y="pointer"
				anchor="top-left"
				xOffset={18}
				yOffset={10}
				variant="none"
				class="border border-ink/16 bg-card px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
			>
				{#snippet children({ data: point }: { data: MetricSeriesPoint })}
					<div class="flex flex-col gap-1 font-mono text-xs leading-[1.4] whitespace-nowrap">
						<div class="text-ink/50">{fmtBucketRange(point.at, model.step)}</div>
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
</div>

<style>
	:global(.lc-axis-tick-label),
	:global(.lc-axis-tick-label tspan) {
		stroke: none;
	}
</style>
