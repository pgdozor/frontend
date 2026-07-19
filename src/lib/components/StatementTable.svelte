<script module lang="ts">
	export type StatementRow = {
		id: string;
		query: string;
		usr: string;
		meanMs: number;
		calls: number;
		rowsPerCall: number;
		pctIo: number;
		pctTime: number;
		sev: string;
		tags: string[];
	};

	export type StatementSortCol = 'query' | 'usr' | 'meanMs' | 'calls' | 'rowsPerCall' | 'pctIo' | 'pctTime';
</script>

<script lang="ts">
	import { clsx } from 'clsx';
	import { ArrowUpIcon, ArrowDownIcon } from '@lucide/svelte';
	import { fmtDuration, fmtCount } from '$lib/format';
	import type { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	let {
		rows,
		sort = $bindable(),
		sql,
		onOpen,
		onFilterTag
	}: {
		rows: StatementRow[];
		sort: { col: StatementSortCol; dir: 'asc' | 'desc' };
		sql: SqlPopoverState;
		onOpen: (id: string) => void;
		onFilterTag: (e: MouseEvent, text: string) => void;
	} = $props();

	const headDef: { key: StatementSortCol; label: string; align: 'left' | 'right'; width?: string; hide?: string }[] = [
		{ key: 'query', label: 'Query', align: 'left' },
		{ key: 'usr', label: 'User', align: 'left', width: '7.5rem', hide: 'hidden sm:table-cell' },
		{ key: 'meanMs', label: 'Avg', align: 'right', width: '5.625rem' },
		{ key: 'calls', label: 'Calls', align: 'right', width: '5.625rem' },
		{ key: 'rowsPerCall', label: 'Rows/Call', align: 'right', width: '6.125rem', hide: 'hidden lg:table-cell' },
		{ key: 'pctIo', label: '% IO', align: 'right', width: '4.875rem', hide: 'hidden lg:table-cell' },
		{ key: 'pctTime', label: '% Time', align: 'right', width: '5.25rem', hide: 'hidden lg:table-cell' }
	];

	// Numeric/text cells never truncate — only the query text (the <code>) does.
	const numCell =
		'px-4 py-3 border-b border-line-soft text-right align-top leading-[20px] font-mono text-md text-ink whitespace-nowrap';

	function sortBy(key: StatementSortCol) {
		if (sort.col === key) sort = { col: key, dir: sort.dir === 'asc' ? 'desc' : 'asc' };
		else sort = { col: key, dir: key === 'query' || key === 'usr' ? 'asc' : 'desc' };
	}

	function onRowKey(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onOpen(id);
		}
	}
</script>

<div class="overflow-x-auto">
	<table class="w-full min-w-[30rem] table-fixed border-collapse font-sans">
		<thead>
			<tr class="bg-hover-soft">
				{#each headDef as h (h.key)}
					<th
						onclick={() => sortBy(h.key)}
						style:width={h.width}
						class={clsx(
							'cursor-pointer border-b border-line py-2.5 pr-4 font-condensed text-xs font-semibold tracking-[0.7px] whitespace-nowrap text-ink/55 uppercase select-none',
							h.key === 'query' ? 'pl-8' : 'pl-4',
							h.align === 'right' ? 'text-right' : 'text-left',
							h.hide
						)}
					>
						<span class="inline-flex items-center gap-1 align-middle">
							<span>{h.label}</span>
							{#if sort.col === h.key}
								{#if sort.dir === 'asc'}
									<ArrowUpIcon class="size-3 flex-none text-command" />
								{:else}
									<ArrowDownIcon class="size-3 flex-none text-command" />
								{/if}
							{/if}
						</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as q (q.id)}
				<tr
					onclick={() => onOpen(q.id)}
					onkeydown={(e) => onRowKey(e, q.id)}
					role="button"
					tabindex="0"
					class="cursor-pointer transition-colors hover:bg-command/6"
				>
					<td class="border-b border-line-soft px-4 py-3 align-top">
						<div class="flex items-start gap-2.5">
							<span class="mt-2 h-2 w-2 flex-none rounded-full" style:background={q.sev}></span>
							<div class="min-w-0 flex-1">
								<code
									onmouseenter={(e) => sql.showLazy(BigInt(q.id), e)}
									onmouseleave={sql.hide}
									class="inline-block max-w-full cursor-default overflow-hidden align-top font-mono text-sm leading-[20px] text-ellipsis whitespace-nowrap text-ink transition-colors hover:text-command"
									>{q.query}</code
								>
								{#if q.tags.length > 0}
									<div class="mt-1 flex flex-wrap gap-1.5">
										{#each q.tags as t (t)}
											<Tag text={t} title="Filter by {t}" onclick={(e) => onFilterTag(e, t)} />
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</td>
					<td
						title={q.usr}
						class="hidden border-b border-line-soft px-4 py-3 align-top font-mono text-md leading-[20px] text-ink sm:table-cell"
					>
						<span class="block truncate">{q.usr}</span>
					</td>
					<td
						class="border-b border-line-soft px-4 py-3 text-right align-top leading-[20px] font-mono text-md font-semibold whitespace-nowrap"
						style:color={q.sev}
					>
						{fmtDuration(q.meanMs)}
					</td>
					<td class={numCell}>{fmtCount(q.calls)}</td>
					<td class="{numCell} hidden lg:table-cell">{fmtCount(q.rowsPerCall)}</td>
					<td class="{numCell} hidden lg:table-cell">{q.pctIo.toFixed(1)}%</td>
					<td class="{numCell} hidden lg:table-cell">{q.pctTime.toFixed(1)}%</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
