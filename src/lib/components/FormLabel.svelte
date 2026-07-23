<script lang="ts">
	import type { Snippet } from 'svelte';
	let { for: forId, class: klass = '', children }: { for?: string; class?: string; children: Snippet } = $props();
</script>

<label
	class="mb-1.5 block font-condensed text-2xs font-semibold tracking-[1px] text-ink/70 uppercase {klass}"
	for={forId}
>
	{@render children()}
</label>
