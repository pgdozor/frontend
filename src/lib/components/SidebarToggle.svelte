<script lang="ts">
	import { MenuIcon, PanelLeftIcon, PanelLeftCloseIcon } from '@lucide/svelte';
	import { sidebar } from '$lib/sidebar.svelte';

	const btn =
		'flex size-[32px] flex-none cursor-pointer items-center justify-center text-ink/55 transition-colors hover:bg-ink/6 hover:text-command';
</script>

<button
	type="button"
	onclick={() => sidebar.openDrawer()}
	aria-label="Open navigation"
	class="{btn} -ml-[6px] md:hidden"
>
	<MenuIcon class="size-[20px]" />
</button>

<button
	type="button"
	onclick={() => sidebar.toggleCollapsed()}
	aria-label={sidebar.collapsed ? 'Show sidebar' : 'Hide sidebar'}
	title={sidebar.collapsed ? 'Show sidebar' : 'Hide sidebar'}
	class="{btn} -ml-[6px] hidden md:inline-flex"
>
	{#if sidebar.collapsed}
		<PanelLeftIcon class="size-[18px]" />
	{:else}
		<PanelLeftCloseIcon class="size-[18px]" />
	{/if}
</button>
