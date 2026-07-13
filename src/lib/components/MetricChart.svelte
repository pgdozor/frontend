<script lang="ts">
	import { Area, Axis, Chart, Grid, Highlight, Points, Svg, Tooltip } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { fmtAxisTime, fmtClockDate } from '$lib/format';
	import GapBands from '$lib/components/GapBands.svelte';
	import { buildMetricChartModel, type MetricSeriesPoint } from '$lib/metricChart';

	let {
		data,
		from,
		to,
		bucketMs,
		stroke,
		fill,
		format,
		formatFull
	}: {
		data: MetricSeriesPoint[];
		from: Date;
		to: Date;
		bucketMs: number;
		stroke: string;
		fill: string;
		format: (value: number) => string;
		formatFull: (value: number) => string;
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
				{format}
				tickLabelProps={{ class: 'fill-ink/45 font-mono text-[10.5px]', stroke: 'none' }}
			/>
			<Axis
				placement="bottom"
				rule
				ticks={4}
				format={fmtAxisTime}
				tickLabelProps={{ class: 'fill-ink/45 font-mono text-[10.5px]', stroke: 'none' }}
			/>
			<Area
				data={model.gapData}
				defined={(d) => d.value != null}
				curve={curveMonotoneX}
				{fill}
				line={{ stroke, 'stroke-width': 2 }}
			/>
			{#if data.length <= 30}
				<Points r={2} fill={stroke} />
			{/if}
			<Highlight lines points={{ fill: stroke }} />
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
						{#each formatFull(point.value).split('\n') as line, i (i)}
							<div class={i === 0 ? 'font-semibold text-ink' : 'text-ink/55'}>{line}</div>
						{/each}
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
