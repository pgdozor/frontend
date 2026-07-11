<script lang="ts">
	import { Area, Axis, Chart, Grid, Highlight, Points, Svg, Tooltip } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { fmtAxisTime, fmtClockDate } from '$lib/format';
	import GapBands from '$lib/components/GapBands.svelte';

	let {
		data,
		from,
		to,
		stroke,
		fill,
		format,
		formatFull
	}: {
		data: { at: Date; value: number }[];
		from: Date;
		to: Date;
		stroke: string;
		fill: string;
		format: (value: number) => string;
		formatFull: (value: number) => string;
	} = $props();

	type Point = { at: Date; value: number | null };

	const model = $derived.by(() => {
		const f = from.getTime();
		const t = to.getTime();
		const bucketMs = Math.max(60_000, (t - f) / 60);
		const threshold = bucketMs * 1.5;

		const covered: { s: number; e: number }[] = [];
		const gapData: Point[] = [];
		let runStart: number | null = null;
		let prev: number | null = null;
		for (const p of data) {
			const cur = p.at.getTime();
			if (prev === null) {
				runStart = cur;
			} else if (cur - prev > threshold) {
				covered.push({ s: runStart as number, e: prev });
				gapData.push({ at: new Date((prev + cur) / 2), value: null });
				runStart = cur;
			}
			gapData.push(p);
			prev = cur;
		}
		if (prev !== null) covered.push({ s: runStart as number, e: prev });

		const firstSample = data.length ? data[0].at.getTime() : f;
		const lastSample = data.length ? data[data.length - 1].at.getTime() : t;
		let left = firstSample - f <= 2 * bucketMs ? firstSample : f;
		let right = t - lastSample <= 2 * bucketMs ? lastSample : t;
		if (right <= left) {
			left = f;
			right = t;
		}

		const gaps: { from: Date; to: Date }[] = [];
		let cursor = left;
		for (const c of covered) {
			if (c.s > cursor) gaps.push({ from: new Date(cursor), to: new Date(Math.min(c.s, right)) });
			cursor = Math.max(cursor, c.e);
		}
		if (cursor < right) gaps.push({ from: new Date(cursor), to: new Date(right) });

		return { gaps, gapData, xFrom: new Date(left), xTo: new Date(right) };
	});
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
			class="border border-ink/16 bg-card px-[11px] py-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
		>
			{#snippet children({ data: point }: { data: { at: Date; value: number } })}
				<div class="flex flex-col gap-[3px] font-mono text-[11.5px] leading-[1.4] whitespace-nowrap">
					<div class="text-ink/50">{fmtClockDate(point.at)}</div>
					{#each formatFull(point.value).split('\n') as line, i (i)}
						<div class={i === 0 ? 'font-semibold text-ink' : 'text-ink/55'}>{line}</div>
					{/each}
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
