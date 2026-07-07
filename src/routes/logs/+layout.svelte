<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<!-- Logs are server-wide, so the context bar's database selector is disabled here. -->
<AppShell dbSwitch={false}>
	{@render children()}
</AppShell>
