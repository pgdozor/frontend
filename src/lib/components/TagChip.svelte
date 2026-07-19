<script lang="ts">
	import { XIcon } from '@lucide/svelte';
	import { describeTagFilter, type TagFilter } from '$lib/queryFilter.svelte';

	let {
		filter,
		active = false,
		onedit,
		onremove
	}: {
		filter: TagFilter;
		active?: boolean;
		onedit: () => void;
		onremove: () => void;
	} = $props();

	const opLabel = $derived(filter.op === 'ne' ? '!=' : filter.op === 'eq' ? '=' : 'exists');
</script>

<span class="flex items-center border bg-card {active ? 'border-command/55' : 'border-ink/20'} hover:border-command/45">
	<button
		type="button"
		onclick={onedit}
		title={describeTagFilter(filter)}
		class="flex cursor-pointer items-center gap-1.5 py-1 pr-1.5 pl-2 font-mono text-sm whitespace-nowrap"
	>
		<span class="text-ink/60">{filter.key}</span>
		<span class={filter.op === 'ne' ? 'font-semibold text-danger' : 'font-semibold text-command'}>{opLabel}</span>
		{#if filter.op !== 'exists'}
			<span class="max-w-[13.75rem] truncate text-ink">{filter.values.join(' or ')}</span>
		{/if}
	</button>
	<button
		type="button"
		onclick={onremove}
		aria-label="Remove {describeTagFilter(filter)} filter"
		class="cursor-pointer border-l border-ink/12 px-1.5 py-1.5 text-ink/40 hover:bg-ink/5 hover:text-danger"
	>
		<XIcon class="size-3" />
	</button>
</span>
