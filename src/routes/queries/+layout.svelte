<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import AppShell from '$lib/components/AppShell.svelte';
	import DocsDrawer from '$lib/components/DocsDrawer.svelte';
	import { docs } from '$lib/docs.svelte';

	let { children } = $props();

	// A card's docs don't carry between the list and a query's detail, so close
	// the panel whenever we move between them.
	afterNavigate(() => docs.close());
</script>

<AppShell>
	{#snippet rightPanel()}
		<DocsDrawer />
	{/snippet}
	{@render children()}
</AppShell>
