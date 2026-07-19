<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TagFilterBar from './TagFilterBar.svelte';

	const { Story } = defineMeta({
		title: 'Queries/TagFilterBar',
		component: TagFilterBar,
		parameters: { layout: 'fullscreen' }
	});
</script>

<script lang="ts">
	import { QueryFilterState, type TagFilter } from '$lib/queryFilter.svelte';

	const eq = (key: string, ...values: string[]): TagFilter => ({ key, op: 'eq', values });

	function make(chips: TagFilter[] = [], kinds?: Partial<Record<'reads' | 'writes' | 'others', boolean>>) {
		const s = new QueryFilterState();
		for (const c of chips) s.add(c);
		if (kinds) Object.assign(s.kinds, kinds);
		return s;
	}

	const empty = make();
	const withFilters = make([eq('service', 'checkout-api'), eq('env', 'production')]);
	const many = make([
		eq('service', 'checkout-api'),
		eq('env', 'production'),
		eq('region', 'eu-central-1'),
		eq('team', 'payments'),
		eq('tier', 'critical'),
		eq('version', 'v2')
	]);
	const readsOnly = make([], { writes: false, others: false });
</script>

{#snippet card(tags: QueryFilterState, searchText: string)}
	<div class="border border-line-card bg-card">
		<TagFilterBar {tags} {searchText} />
	</div>
{/snippet}

<Story name="Empty">
	{#snippet template()}{@render card(empty, '')}{/snippet}
</Story>

<Story name="With filters">
	{#snippet template()}{@render card(withFilters, '')}{/snippet}
</Story>

<Story name="Many filters (wrap)">
	{#snippet template()}{@render card(many, 'orders')}{/snippet}
</Story>

<Story name="Reads only">
	{#snippet template()}{@render card(readsOnly, '')}{/snippet}
</Story>
