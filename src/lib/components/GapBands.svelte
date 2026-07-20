<script lang="ts">
	import { getChartContext } from 'layerchart';

	let { gaps }: { gaps: { from: Date; to: Date }[] } = $props();

	const c = getChartContext();
</script>

{#each gaps as g (g.from.getTime())}
	{@const x = Math.max(0, Math.min(c.width, Number(c.xScale(g.from))))}
	{@const right = Math.max(0, Math.min(c.width, Number(c.xScale(g.to))))}
	<rect {x} y={0} width={Math.max(0, right - x)} height={c.height} class="fill-ink/8" />
{/each}
