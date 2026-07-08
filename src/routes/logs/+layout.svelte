<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';

	let { children } = $props();
</script>

<AppShell dbSwitch={false}>
	{@render children()}
</AppShell>
