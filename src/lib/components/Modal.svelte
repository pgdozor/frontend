<script lang="ts">
	import { XIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		onclose: () => void;
		children: Snippet;
		maxWidth?: string;
	};

	let { title, onclose, children, maxWidth = '480px' }: Props = $props();
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center p-[24px] font-sans">
	<button type="button" aria-label="Close" onclick={onclose} class="fixed inset-0 cursor-default bg-ink/40"></button>
	<div
		class="relative max-h-[calc(100vh-48px)] w-full overflow-auto border border-ink/28 bg-card shadow-[0_24px_60px_rgba(58,42,31,0.32)]"
		style:max-width={maxWidth}
	>
		<div class="flex items-center justify-between gap-[12px] border-b border-ink/14 px-[20px] py-[15px]">
			<span class="font-condensed text-[15px] font-bold tracking-[0.6px] text-ink uppercase">{title}</span>
			<button
				type="button"
				onclick={onclose}
				aria-label="Close"
				class="cursor-pointer leading-none text-ink/45 hover:text-danger"><XIcon class="size-[16px]" /></button
			>
		</div>
		{@render children()}
	</div>
</div>
