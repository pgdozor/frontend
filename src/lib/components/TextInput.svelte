<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	let {
		value = $bindable(''),
		class: klass = '',
		...rest
	}: { value?: string; class?: string } & HTMLInputAttributes = $props();
</script>

<input
	bind:value
	{...rest}
	class="h-[2.625rem] w-full border border-line-strong bg-paper px-3.5 font-mono text-md text-ink outline-none focus:border-command {klass}"
/>
