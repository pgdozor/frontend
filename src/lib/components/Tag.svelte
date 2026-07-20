<script lang="ts">
	let {
		text,
		size = 'sm',
		onclick,
		title
	}: {
		text: string;
		size?: 'sm' | 'md';
		onclick?: (e: MouseEvent) => void;
		title?: string;
	} = $props();

	const cls = $derived(
		`border border-steel/28 bg-steel/10 font-mono whitespace-nowrap text-steel ${
			size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-px text-2xs'
		}`
	);
</script>

{#if onclick}
	<button type="button" {onclick} {title} class="{cls} cursor-pointer hover:border-accent-line hover:text-command">
		{text}
	</button>
{:else}
	<span class={cls} {title}>{text}</span>
{/if}
