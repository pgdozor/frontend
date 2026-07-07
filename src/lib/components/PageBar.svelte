<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		/** Right-aligned bar actions (e.g. a "New …" button). */
		actions?: Snippet;
	};

	let { title, actions }: Props = $props();
</script>

<!-- Same sticky top bar as ContextBar, minus the server/db/time controls: keeps
     the title + bottom separator consistent across every section. The min-height
     matches ContextBar's control-driven height so the title sits at the same
     vertical position on every screen. -->
<div
	class="sticky top-0 z-30 flex min-h-[63px] items-center gap-[18px] border-b border-ink/14 bg-paper/70 px-[28px] py-[14px] backdrop-blur-[3px] backdrop-saturate-[1.1]"
>
	<span class="font-condensed text-[21px] font-bold tracking-[0.6px] text-ink uppercase">{title}</span>
	{#if actions}
		<div class="ml-auto flex items-center gap-[10px]">
			{@render actions()}
		</div>
	{/if}
</div>
