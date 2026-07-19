<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { screenDescription, screenTitle } from '$lib/nav';
	import SidebarToggle from '$lib/components/SidebarToggle.svelte';

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
	class="sticky top-0 z-30 flex min-h-[63px] flex-wrap items-center gap-[10px] border-b border-ink/14 bg-paper/70 px-[16px] py-[14px] backdrop-blur-[3px] backdrop-saturate-[1.1] sm:px-[20px] md:gap-[18px] md:px-[28px]"
>
	<SidebarToggle />

	<div class="flex min-w-0 flex-1 flex-col gap-[2px]">
		<div class="flex items-baseline gap-[9px]">
			<span class="truncate font-condensed text-[16px] leading-[1.15] font-bold tracking-[0.6px] text-ink uppercase"
				>{title}</span
			>
		</div>
		<p class="truncate text-[11px] leading-[1.2] text-ink/45">{description}</p>
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-[10px]">
			{@render actions()}
		</div>
	{/if}
</div>
