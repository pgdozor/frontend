<script module lang="ts">
	export type SampleRow = {
		id: string;
		ts: string;
		short: string;
		tags: Record<string, string>;
		hasPlan: boolean;
		durFmt: string;
		sev: string;
	};
</script>

<script lang="ts">
	import { ArrowUpIcon, ExternalLinkIcon } from '@lucide/svelte';
	import type { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	let {
		samples,
		sql,
		id,
		hasBaseTags,
		extraTags
	}: {
		samples: SampleRow[];
		sql: SqlPopoverState;
		id: string;
		hasBaseTags: boolean;
		extraTags: (tags: Record<string, string>) => string[];
	} = $props();

	const thBase =
		'border-b border-line px-5 py-2.5 font-condensed text-xs font-semibold tracking-[0.7px] text-ink/55 uppercase';
</script>

<div class="overflow-x-auto">
	<table class="w-full min-w-[26.25rem] table-fixed border-collapse">
		<thead>
			<tr class="bg-hover-soft">
				<th class="{thBase} hidden w-[11.25rem] text-left sm:table-cell">At</th>
				<th class="{thBase} text-left">Query</th>
				<th class="{thBase} w-[7rem] text-left">Plan</th>
				<th class="{thBase} w-[6.875rem] text-right">Duration</th>
			</tr>
		</thead>
		<tbody>
			{#each samples as s (s.id)}
				{@const extra = extraTags(s.tags)}
				<tr class="hover:bg-ink/3">
					<td
						class="hidden border-b border-line-soft px-5 py-3 align-top font-mono text-sm leading-[20px] whitespace-nowrap text-ink/75 sm:table-cell"
						>{s.ts}</td
					>
					<td class="min-w-0 border-b border-line-soft px-5 py-3 align-top">
						<code
							onmouseenter={(e) => sql.showLazy(BigInt(s.id), e)}
							onmouseleave={sql.hide}
							class="inline-block max-w-full cursor-default overflow-hidden align-top font-mono text-sm leading-[20px] text-ellipsis whitespace-nowrap text-ink transition-colors hover:text-command"
							>{s.short}</code
						>
						{#if hasBaseTags || extra.length > 0}
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								{#if hasBaseTags}
									<span
										title="Also carries the base tags shown at the top"
										class="inline-flex items-center gap-1 border border-ink/12 px-1.5 py-px font-mono text-xs text-ink/40"
									>
										<ArrowUpIcon class="size-2.5" />base tags
									</span>
								{/if}
								{#each extra as t (t)}
									<Tag text={t} />
								{/each}
							</div>
						{/if}
					</td>
					<td class="border-b border-line-soft px-5 py-3 align-top">
						{#if s.hasPlan}
							<a
								href="/queries/{id}/plan/{s.id}"
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1.5 align-top font-mono text-sm leading-[20px] font-semibold whitespace-nowrap text-command hover:underline"
							>
								<span>view plan</span>
								<ExternalLinkIcon class="size-3 stroke-[2.2]" />
							</a>
						{:else}
							<span class="font-mono text-sm leading-[20px] text-ink/35">—</span>
						{/if}
					</td>
					<td
						class="border-b border-line-soft px-5 py-3 text-right align-top font-mono text-md leading-[20px] font-semibold whitespace-nowrap"
						style:color={s.sev}>{s.durFmt}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
