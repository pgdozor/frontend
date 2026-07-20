<script lang="ts">
	let { title, description }: { title: string; description: string } = $props();
</script>

<h2 class="font-condensed text-sm leading-[1.15] font-bold tracking-[0.8px] text-ink/70 uppercase">{title}</h2>
<p class="mt-0.5 text-xs leading-[1.2] text-ink/55">{description}</p>
