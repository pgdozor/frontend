<script lang="ts">
	let { text, size = 'sm' }: { text: string; size?: 'sm' | 'md' } = $props();
</script>

<span
	class="border border-steel/28 bg-steel/10 font-mono whitespace-nowrap text-steel {size === 'md'
		? 'px-[9px] py-[3px] text-[11.5px]'
		: 'px-[6px] py-px text-[10px]'}"
>
	{text}
</span>
