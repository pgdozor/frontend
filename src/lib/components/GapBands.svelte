<script lang="ts">
	import { getChartContext } from 'layerchart';

	let { gaps }: { gaps: { from: Date; to: Date }[] } = $props();

	const c = getChartContext();
</script>

{#each gaps as g (g.from.getTime())}
	<rect
		x={Number(c.xScale(g.from))}
		y={0}
		width={Math.max(0, Number(c.xScale(g.to)) - Number(c.xScale(g.from)))}
		height={c.height}
		class="fill-ink/8"
	/>
{/each}
