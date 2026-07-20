<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	// Uses currentColor so callers tint it with a text-* utility (e.g. text-command).
	let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" aria-hidden="true" {...props}>
	<circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2.5" />
	<circle cx="20" cy="20" r="11.5" fill="none" stroke="currentColor" stroke-width="1" />
	<path d="M20 6 L20 34 M6 20 L34 20" stroke="currentColor" stroke-width="1" />
	<circle cx="20" cy="20" r="4" fill="currentColor" />
</svg>
