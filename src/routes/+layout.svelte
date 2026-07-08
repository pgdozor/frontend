<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { session } from '$lib/session.svelte';

	let { children } = $props();

	onMount(() => {
		session.load();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
