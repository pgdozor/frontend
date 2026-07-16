<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { screenDescription, screenTitle } from '$lib/nav';

	type Props = {
		actions?: Snippet;
	};

	let { actions }: Props = $props();

	const title = $derived(screenTitle(page.url.pathname));
	const description = $derived(screenDescription(page.url.pathname));
</script>

<!-- min-height matches ContextBar's control-driven height so the title sits at
     the same vertical position across sections. -->
<div
	class="sticky top-0 z-30 flex min-h-[63px] items-center gap-[18px] border-b border-ink/14 bg-paper/70 px-[28px] py-[14px] backdrop-blur-[3px] backdrop-saturate-[1.1]"
>
	<div class="flex max-w-[46%] flex-none flex-col gap-[2px]">
		<div class="flex items-baseline gap-[9px] whitespace-nowrap">
			<span class="font-condensed text-[16px] leading-[1.15] font-bold tracking-[0.6px] text-ink uppercase"
				>{title}</span
			>
		</div>
		<p class="truncate text-[11px] leading-[1.2] text-ink/45">{description}</p>
	</div>
	{#if actions}
		<div class="ml-auto flex items-center gap-[10px]">
			{@render actions()}
		</div>
	{/if}
</div>
