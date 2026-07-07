<script lang="ts">
	// pev2 (a Vue component) renders the plan inside a same-origin iframe, keeping its
	// CDN-loaded Vue/Bootstrap isolated from the app. Once it loads, post the plan in.
	let { planJson, statement }: { planJson: string; statement: string } = $props();

	let iframeEl = $state<HTMLIFrameElement>();
	let loaded = $state(false);

	$effect(() => {
		if (!loaded || !iframeEl?.contentWindow) return;
		iframeEl.contentWindow.postMessage({ type: 'pev2:plan', planJson, query: statement }, window.location.origin);
	});
</script>

<iframe
	bind:this={iframeEl}
	src="/pev2/viewer.html"
	title="Explain plan"
	class="h-full w-full border-0"
	onload={() => (loaded = true)}
></iframe>
