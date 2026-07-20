<script lang="ts">
	import { getChartContext } from 'layerchart';
	import type { MetricSeriesPoint } from '$lib/metricChart';

	let { data, bucketMs, fill }: { data: MetricSeriesPoint[]; bucketMs: number; fill: string } = $props();

	const c = getChartContext();

	const bars = $derived.by(() => {
		const y0 = Number(c.yScale(0));
		return data
			.filter((d) => d.value != null)
			.map((d) => {
				const left = Math.max(0, Number(c.xScale(new Date(d.at.getTime() - bucketMs))));
				const right = Math.min(c.width, Number(c.xScale(d.at)));
				const top = Number(c.yScale(d.value as number));
				return {
					at: d.at.getTime(),
					x: left,
					y: Math.min(top, y0),
					span: right - left,
					width: Math.max(1, right - left - 1),
					height: Math.abs(y0 - top)
				};
			})
			.filter((b) => b.span > 0);
	});
</script>

{#each bars as b (b.at)}
	<rect x={b.x} y={b.y} width={b.width} height={b.height} style:fill />
{/each}
