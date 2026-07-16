<script lang="ts" generics="T">
	import { getChartContext } from 'layerchart';

	let { colors, values }: { colors: string[]; values: (row: T) => (number | null)[] } = $props();

	const c = getChartContext();

	const points = $derived.by(() => {
		const row = c.tooltip.data as T | undefined;
		if (row == null) return [];
		const cx = Number(c.xGet(row));
		if (!Number.isFinite(cx)) return [];
		return values(row).flatMap((v, i) => (v == null ? [] : [{ key: i, cx, cy: Number(c.yScale(v)), fill: colors[i] }]));
	});
</script>

{#each points as p (p.key)}
	<circle cx={p.cx} cy={p.cy} r={3.5} fill={p.fill} class="stroke-card" stroke-width={1.5} />
{/each}
