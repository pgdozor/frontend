<script lang="ts">
	import { CopyIcon } from '@lucide/svelte';
	import { POPOVER_WIDTH, type SqlPopoverState } from '$lib/sqlPopover.svelte';

	let { state }: { state: SqlPopoverState } = $props();

	// Capture, because scroll does not bubble: the query tables sit in their own
	// overflow containers, and a listener on window alone would miss those.
	$effect(() => {
		const opts = { capture: true, passive: true } as const;
		document.addEventListener('scroll', state.reflow, opts);
		window.addEventListener('resize', state.reflow);
		return () => {
			document.removeEventListener('scroll', state.reflow, opts);
			window.removeEventListener('resize', state.reflow);
			state.destroy();
		};
	});
</script>

{#if state.pop}
	<div
		role="tooltip"
		onmouseenter={state.keep}
		onmouseleave={state.hide}
		class="fixed z-50"
		style:left="{state.pop.left}px"
		style:top={state.pop.top != null ? `${state.pop.top}px` : null}
		style:bottom={state.pop.bottom != null ? `${state.pop.bottom}px` : null}
	>
		<div
			class="flex max-w-[calc(100vw-24px)] flex-col border border-ink/40 bg-ink shadow-[0_14px_36px_rgba(58,42,31,0.32)]"
			style:width="{POPOVER_WIDTH}px"
			style:max-height="{state.pop.maxHeight}px"
		>
			<div class="flex flex-none items-center justify-between gap-[12px] border-b border-paper/14 px-[12px] py-[9px]">
				<span class="font-condensed text-[10.5px] font-semibold tracking-[1px] text-paper/55 uppercase">Full query</span
				>
				{#if !state.pop.loading}
					<button
						type="button"
						onclick={state.copy}
						class="inline-flex cursor-pointer items-center gap-[6px] bg-command px-[11px] py-[5px] font-condensed text-[11px] font-bold tracking-[0.6px] whitespace-nowrap text-paper uppercase hover:bg-danger"
					>
						<CopyIcon class="size-[12px] stroke-[2.2]" />
						<span>{state.copied ? 'Copied' : 'Copy'}</span>
					</button>
				{/if}
			</div>
			{#if state.pop.loading}
				<div class="flex-1 px-[14px] py-[13px] font-mono text-[12.5px] text-paper/55">Loading…</div>
			{:else}
				<code
					class="block min-h-0 flex-1 overflow-auto px-[14px] py-[13px] font-mono text-[12.5px] leading-[1.7] break-words whitespace-pre-wrap text-paper"
					>{state.pop.text}</code
				>
			{/if}
		</div>
	</div>
{/if}
