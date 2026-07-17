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
			size === 'md' ? 'px-[9px] py-[3px] text-[11.5px]' : 'px-[6px] py-px text-[10px]'
		}`
	);
</script>

{#if onclick}
	<button type="button" {onclick} {title} class="{cls} cursor-pointer hover:border-command/45 hover:text-command">
		{text}
	</button>
{:else}
	<span class={cls} {title}>{text}</span>
{/if}
