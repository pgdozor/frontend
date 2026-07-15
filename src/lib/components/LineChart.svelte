<script lang="ts">
	import { Axis, Chart, Grid, Highlight, Spline, Svg, Tooltip } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { fmtAxisTime, fmtClockDate } from '$lib/format';
	import GapBands from '$lib/components/GapBands.svelte';
	import { buildMetricChartModel, type MetricSeriesPoint } from '$lib/metricChart';

	type Series = { label: string; color: string; points: MetricSeriesPoint[] };

	let {
		series,
		from,
		to,
		bucketMs,
		format
	}: {
		series: Series[];
		from: Date;
		to: Date;
		bucketMs: number;
		format: (value: number) => string;
	} = $props();

	const models = $derived(series.map((s) => ({ ...s, model: buildMetricChartModel(s.points, from, to, bucketMs) })));

	const domain = $derived.by(() => {
		let lo = Infinity;
		let hi = -Infinity;
		for (const m of models) {
			lo = Math.min(lo, m.model.xFrom.getTime());
			hi = Math.max(hi, m.model.xTo.getTime());
		}
		if (!Number.isFinite(lo)) return [from, to] as [Date, Date];
		return [new Date(lo), new Date(hi)] as [Date, Date];
	});

	const yMax = $derived.by(() => {
		let m = 0;
		for (const s of series) {
			for (const p of s.points) {
				if (p.value != null && p.value > m) m = p.value;
			}
		}
		return m;
	});

	// One row per bucket carrying every series' value, so a single bisect-x
	// lookup drives a combined tooltip.
	const merged = $derived.by(() => {
		const byTime: Record<number, { at: Date; values: (number | null)[] }> = {};
		series.forEach((s, si) => {
			for (const p of s.points) {
				const t = p.at.getTime();
				let row = byTime[t];
				if (!row) {
					row = { at: p.at, values: series.map(() => null) };
					byTime[t] = row;
				}
				row.values[si] = p.value;
			}
		});
		return Object.values(byTime).sort((a, b) => a.at.getTime() - b.at.getTime());
	});
</script>

<div>
	<div class="mb-[10px] flex flex-wrap gap-[16px]">
		{#each series as s (s.label)}
			<div class="flex items-center gap-[6px] font-mono text-[11px] text-ink/60">
				<span class="h-[2px] w-[16px]" style:background={s.color}></span>{s.label}
			</div>
		{/each}
	</div>
	<div class="h-[240px]">
		<Chart
			data={merged}
			x="at"
			xScale={scaleTime()}
			xDomain={domain}
			y={() => 0}
			yDomain={[0, yMax || 1]}
			yNice
			padding={{ left: 40, bottom: 24 }}
			tooltipContext={{ mode: 'bisect-x' }}
		>
			<Svg>
				<Grid y={{ class: 'stroke-ink/10' }} />
				<GapBands gaps={models[0]?.model.gaps ?? []} />
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
				{#each models as m (m.label)}
					<Spline
						data={m.model.gapData}
						x="at"
						y="value"
						defined={(d) => d.value != null}
						curve={curveMonotoneX}
						stroke={m.color}
						stroke-width={2}
					/>
				{/each}
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
				{#snippet children({ data: point }: { data: { at: Date; values: (number | null)[] } })}
					<div class="flex flex-col gap-[3px] font-mono text-[11.5px] leading-[1.4] whitespace-nowrap">
						<div class="text-ink/50">{fmtClockDate(point.at)}</div>
						{#each series as s, i (s.label)}
							<div class="flex items-center justify-between gap-[14px]">
								<span class="flex items-center gap-[5px] text-ink/55">
									<span class="h-[2px] w-[12px]" style:background={s.color}></span>{s.label}
								</span>
								<span class="font-semibold text-ink"
									>{point.values[i] == null ? '—' : format(point.values[i] as number)}</span
								>
							</div>
						{/each}
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
