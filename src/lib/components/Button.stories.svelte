<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './Button.svelte';

	const { Story } = defineMeta({
		title: 'UI/Button',
		component: Button,
		parameters: { layout: 'padded' }
	});
</script>

<Story name="Variants">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="primary">Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="primary" disabled>Disabled</Button>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-3">
			<Button size="sm">Small</Button>
			<Button size="md">Medium</Button>
			<Button variant="ghost" size="sm">Small ghost</Button>
			<Button variant="ghost" size="md">Medium ghost</Button>
		</div>
	{/snippet}
</Story>
