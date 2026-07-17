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
		class="flex cursor-pointer items-center gap-[5px] py-[4px] pr-[6px] pl-[8px] font-mono text-[12.5px] whitespace-nowrap"
	>
		<span class="text-ink/60">{filter.key}</span>
		<span class={filter.op === 'ne' ? 'font-semibold text-danger' : 'font-semibold text-command'}>{opLabel}</span>
		{#if filter.op !== 'exists'}
			<span class="max-w-[220px] truncate text-ink">{filter.values.join(' or ')}</span>
		{/if}
	</button>
	<button
		type="button"
		onclick={onremove}
		aria-label="Remove {describeTagFilter(filter)} filter"
		class="cursor-pointer border-l border-ink/12 px-[5px] py-[5px] text-ink/40 hover:bg-ink/5 hover:text-danger"
	>
		<XIcon class="size-[12px]" />
	</button>
</span>
