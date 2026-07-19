<script lang="ts">
	import type { Snippet } from 'svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	let {
		title,
		description,
		children
	}: {
		title: string;
		description: string;
		children: Snippet;
	} = $props();
</script>

<section class="border border-line-card bg-card px-3.5 pt-3.5 pb-3">
	<header class="mb-3.5">
		<SectionHeader {title} {description} />
	</header>
	{@render children()}
</section>
