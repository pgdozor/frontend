<script lang="ts">
	import { XIcon, ExternalLinkIcon } from '@lucide/svelte';
	import { docs } from '$lib/docs.svelte';
	import { docContent } from '$lib/docsContent';

	const entry = $derived(docs.activeId ? docContent[docs.activeId] : null);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && docs.activeId) docs.close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if entry}
	<!-- Docked in the layout flow (like the sidebar) so it shrinks the content
	     instead of covering it — the right edge of tables/charts stays visible. -->
	<aside
		aria-labelledby="docs-title"
		class="sticky top-0 flex h-screen w-[21rem] flex-none flex-col border-l border-line bg-card"
	>
		<header class="flex min-h-[4.25rem] items-center justify-between gap-3 border-b border-line px-5 py-3.5">
			<h2
				id="docs-title"
				class="min-w-0 font-condensed text-lg leading-[1.15] font-bold tracking-[0.4px] text-ink uppercase"
			>
				{entry.title}
			</h2>
			<button
				type="button"
				onclick={() => docs.close()}
				aria-label="Close documentation"
				class="-mr-1 flex size-8 flex-none cursor-pointer items-center justify-center rounded-full text-ink/55 hover:bg-hover hover:text-command"
			>
				<XIcon class="size-5" />
			</button>
		</header>

		<div class="flex-1 overflow-y-auto px-5 py-4">
			{#each entry.sections as section (section.heading)}
				<section class="mb-5 last:mb-0">
					<h3 class="mb-1.5 font-condensed text-2xs font-bold tracking-[1px] text-command uppercase">
						{section.heading}
					</h3>
					{#each section.body as para (para)}
						<p class="mb-2 text-sm leading-[1.55] text-ink/80 last:mb-0">{para}</p>
					{/each}
					{#if section.link}
						<a
							href={section.link.href}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-command hover:underline"
						>
							{section.link.label}<ExternalLinkIcon class="size-3.5" />
						</a>
					{/if}
				</section>
			{/each}
		</div>
	</aside>
{/if}
