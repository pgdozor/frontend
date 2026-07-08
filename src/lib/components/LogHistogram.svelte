<script lang="ts">
	import { fmtAxisTime } from '$lib/format';

	type Segment = { label: string; color: string; value: number };
	type Bucket = { at: Date; segments: Segment[] };

	let { data }: { data: Bucket[] } = $props();

	const CHART_H = 150;
	const TICKS = 5;

	const total = (b: Bucket): number => b.segments.reduce((s, seg) => s + seg.value, 0);

	// Scale against the tallest total so the peak fills the chart.
	const maxTotal = $derived(Math.max(1, ...data.map(total)));
	const px = (n: number): number => (n / maxTotal) * CHART_H;

	const ticks = $derived.by(() => {
		if (data.length === 0) return [];
		return Array.from({ length: TICKS }, (_, i) => {
			const idx = Math.round((i / (TICKS - 1)) * (data.length - 1));
			return fmtAxisTime(data[idx].at);
		});
	});

	const title = (b: Bucket): string => {
		const parts = b.segments.filter((s) => s.value > 0).map((s) => `${s.label} ${s.value}`);
		return `${fmtAxisTime(b.at)}${parts.length ? ' — ' + parts.join(', ') : ''}`;
	};
</script>

<div class="flex items-end gap-[2px] border-b border-ink/20" style:height="{CHART_H}px">
	{#each data as b, i (i)}
		<div class="flex min-w-0 flex-1 cursor-default flex-col-reverse" style:height="{CHART_H}px" title={title(b)}>
			{#each b.segments as seg, j (j)}
				<div class="w-full" style:height="{px(seg.value)}px" style:background={seg.color}></div>
			{/each}
		</div>
	{/each}
</div>

<div class="mt-[6px] flex justify-between">
	{#each ticks as t, i (i)}
		<span class="font-mono text-[10.5px] text-ink/50">{t}</span>
	{/each}
</div>
