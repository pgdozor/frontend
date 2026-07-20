<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<div class="flex h-[15rem] items-center justify-center font-mono text-sm text-ink/55">{message}</div>
