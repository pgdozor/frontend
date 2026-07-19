<script lang="ts">
	import type { Snippet } from 'svelte';

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

<section class="border border-ink/16 bg-card px-[14px] pt-[14px] pb-[12px]">
	<header class="mb-[14px]">
		<h2 class="font-condensed text-[12px] leading-[1.15] font-bold tracking-[0.8px] text-ink/70 uppercase">
			{title}
		</h2>
		<p class="mt-[2px] text-[11.5px] leading-[1.2] text-ink/45">{description}</p>
	</header>
	{@render children()}
</section>
