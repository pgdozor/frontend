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
	class="sticky top-0 z-30 flex min-h-[3.9375rem] flex-wrap items-center gap-2.5 border-b border-line bg-paper/70 px-4 py-3.5 backdrop-blur-[3px] backdrop-saturate-[1.1] sm:px-5 md:gap-5 md:px-7"
>
	<SidebarToggle />

	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<div class="flex items-baseline gap-2.5">
			<span class="truncate font-condensed text-xl leading-[1.15] font-bold tracking-[0.6px] text-ink uppercase"
				>{title}</span
			>
		</div>
		<p class="truncate text-xs leading-[1.2] text-ink/45">{description}</p>
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-2.5">
			{@render actions()}
		</div>
	{/if}
</div>
