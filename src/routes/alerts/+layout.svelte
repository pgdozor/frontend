<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<!-- Alerts is a server-wide configuration screen, so it renders its own PageBar
     instead of the server/database/time ContextBar (the ADMIN pattern). -->
<AppShell contextBar={false}>
	{@render children()}
</AppShell>
