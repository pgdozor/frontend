<script lang="ts">
	let { text, placeholder = '' }: { text?: string; placeholder?: string } = $props();
</script>

<div class="border border-line-card bg-ink px-4 py-3.5">
	{#if text}
		<div class="font-mono text-sm leading-[1.7] break-words whitespace-pre-wrap text-paper">
			{text}
		</div>
	{:else}
		<div class="font-mono text-sm text-paper/50">{placeholder}</div>
	{/if}
</div>
