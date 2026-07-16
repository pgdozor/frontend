<script lang="ts">
	let { items }: { items: { label: string; color: string }[] } = $props();
</script>

<div class="mb-[10px] flex flex-wrap justify-center gap-[16px]">
	{#each items as item (item.label)}
		<div class="flex items-center gap-[6px] font-mono text-[11px] text-ink/60">
			<span class="h-[2px] w-[16px]" style:background={item.color}></span>{item.label}
		</div>
	{/each}
</div>
