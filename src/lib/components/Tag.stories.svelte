<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Tag from './Tag.svelte';

	const { Story } = defineMeta({
		title: 'Queries/Tag',
		component: Tag,
		parameters: { layout: 'padded' }
	});
</script>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-[8px]">
			<Tag text="env=production" />
			<Tag text="env=production" size="md" />
		</div>
	{/snippet}
</Story>

<Story name="Clickable (filter)">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-[8px]">
			<Tag text="service=checkout-api" title="Filter by service=checkout-api" onclick={() => {}} />
			<Tag text="team=payments" title="Filter by team=payments" onclick={() => {}} />
		</div>
	{/snippet}
</Story>

<Story name="Wrapping row">
	{#snippet template()}
		<div class="flex max-w-[320px] flex-wrap items-center gap-[6px]">
			<Tag text="service=checkout-api" />
			<Tag text="route=POST:/v1/orders/confirm" />
			<Tag text="env=production" />
			<Tag text="region=eu-central-1" />
			<Tag text="team=payments" />
			<Tag text="tier=critical" />
		</div>
	{/snippet}
</Story>
