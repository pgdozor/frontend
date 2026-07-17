<script lang="ts">
	import { PlusIcon, SearchIcon } from '@lucide/svelte';
	import TagChip from '$lib/components/TagChip.svelte';
	import TagFilterPicker from '$lib/components/TagFilterPicker.svelte';
	import { type TagFilter, type QueryFilterState } from '$lib/queryFilter.svelte';

	let {
		searchText = $bindable(),
		tags
	}: {
		searchText: string;
		tags: QueryFilterState;
	} = $props();

	type Picker = { mode: 'add' } | { mode: 'edit'; index: number } | null;

	let picker = $state<Picker>(null);

	const editing = $derived(picker?.mode === 'edit' ? tags.chips[picker.index] : undefined);

	function commit(filter: TagFilter) {
		if (picker?.mode === 'edit') tags.replace(picker.index, filter);
		else tags.add(filter);
		picker = null;
	}
</script>

<div class="border-b border-ink/14 p-[14px]">
	<div class="flex items-center gap-[8px] border border-ink/20 bg-paper px-[9px] py-[4px]">
		<SearchIcon class="size-[13px] flex-none text-ink/40" />
		<input
			type="text"
			bind:value={searchText}
			placeholder="Search SQL text…"
			spellcheck="false"
			aria-label="Search SQL text"
			class="flex-1 border-none bg-transparent font-mono text-[12.5px] text-ink outline-none"
		/>
	</div>

	<div class="mt-[10px] flex flex-wrap items-center gap-[7px]">
		{#each tags.chips as filter, i (filter.key + filter.op + filter.values.join(','))}
			<TagChip
				{filter}
				active={picker?.mode === 'edit' && picker.index === i}
				onedit={() => (picker = picker?.mode === 'edit' && picker.index === i ? null : { mode: 'edit', index: i })}
				onremove={() => {
					if (picker?.mode === 'edit' && picker.index === i) picker = null;
					tags.remove(i);
				}}
			/>
		{/each}

		<div class="relative">
			{#if picker !== null}
				<button
					type="button"
					aria-label="Close tag filter picker"
					onclick={() => (picker = null)}
					class="fixed inset-0 z-[1] cursor-default bg-transparent"
				></button>
			{/if}

			<button
				type="button"
				onclick={() => (picker = picker?.mode === 'add' ? null : { mode: 'add' })}
				aria-haspopup="listbox"
				aria-expanded={picker !== null}
				class="relative z-[2] flex cursor-pointer items-center gap-[5px] border border-dashed border-ink/30 px-[9px] py-[4px] font-mono text-[12.5px] text-ink/60 hover:border-command/50 hover:text-command"
			>
				<PlusIcon class="size-[12px]" />
				Tag
			</button>

			{#if picker !== null}
				{#key picker.mode === 'edit' ? picker.index : 'add'}
					<TagFilterPicker initial={editing} onapply={commit} onclose={() => (picker = null)} />
				{/key}
			{/if}
		</div>

		{#if tags.chips.length > 0}
			<button
				type="button"
				onclick={() => {
					tags.clear();
					picker = null;
				}}
				class="cursor-pointer px-[6px] py-[4px] font-mono text-[11px] text-ink/45 hover:text-danger"
			>
				Clear all
			</button>
		{/if}
	</div>
</div>
