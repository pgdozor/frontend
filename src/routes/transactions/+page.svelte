<script lang="ts">
	import { ChevronDownIcon, ChevronRightIcon } from '@lucide/svelte';
	import { timestampFromDate, timestampDate, type Timestamp } from '@bufbuild/protobuf/wkt';
	import {
		TransactionEventStatus,
		type Transaction,
		type TransactionEvent
	} from '@buf/querysheriff_backend.bufbuild_es/querysheriff/v1/activity_pb';
	import { activityClient } from '$lib/connect';
	import StateBlock from '$lib/components/StateBlock.svelte';
	import { ctx, serversState } from '$lib/state.svelte';
	import { fmtDuration, fmtRel, fmtClockDate, errMsg, kvTags } from '$lib/format';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	let transactions = $state<Transaction[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expanded = $state<Record<string, boolean>>({});

	const sql = new SqlPopoverState();

	$effect(() => {
		const { from, to } = ctx.timeRange();
		const request = {
			serverName: ctx.server,
			databaseName: ctx.db,
			from: timestampFromDate(from),
			to: timestampFromDate(to)
		};

		if (!ctx.server) {
			loading = !serversState.loaded;
			if (serversState.loaded) {
				transactions = [];
				error = null;
			}
			return;
		}

		let cancelled = false;
		const ac = new AbortController();
		loading = true;
		error = null;
		transactions = [];

		activityClient
			.queryTransactions(request, { signal: ac.signal })
			.then((res) => {
				if (cancelled) return;
				transactions = res.transactions;
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				error = errMsg(e);
				transactions = [];
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	// No stable id; key expansion state by pid + start.
	const rowKey = (t: Transaction): string => `${t.pid}-${t.start ? timestampDate(t.start).getTime() : 0}`;

	function toggle(t: Transaction) {
		const key = rowKey(t);
		expanded[key] = !expanded[key];
	}

	function onRowKey(e: KeyboardEvent, t: Transaction) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle(t);
		}
	}

	function durationMs(from?: Timestamp, to?: Timestamp): number {
		if (!from || !to) return 0;
		return timestampDate(to).getTime() - timestampDate(from).getTime();
	}

	const fmtDurMs = (ms: number): string => fmtDuration(ms);

	const relFrom = (start: Timestamp, ts: Timestamp): string =>
		fmtRel((timestampDate(ts).getTime() - timestampDate(start).getTime()) / 1000);

	function statusLabel(s: TransactionEventStatus): string {
		switch (s) {
			case TransactionEventStatus.ACTIVE:
				return 'ACTIVE';
			case TransactionEventStatus.IDLE:
				return 'IDLE';
			case TransactionEventStatus.ABORTED:
				return 'ABORTED';
			default:
				return '';
		}
	}

	function statusColor(s: TransactionEventStatus): string {
		switch (s) {
			case TransactionEventStatus.ACTIVE:
				return 'var(--color-ok)';
			case TransactionEventStatus.ABORTED:
				return 'var(--color-danger)';
			default:
				return 'var(--color-steel)';
		}
	}

	const waitText = (e: TransactionEvent): string =>
		[e.waitEventType, e.waitEvent, e.lockMode].filter(Boolean).join(' · ');

	type EventGroup = {
		query: string;
		queryTags: Record<string, string>;
		events: TransactionEvent[];
	};

	// Consecutive events running the same query share one query header; idle/aborted
	// stretches carry no query and group under a "no query running" header.
	function groupEvents(events: TransactionEvent[]): EventGroup[] {
		const groups: EventGroup[] = [];
		for (const e of events) {
			const last = groups[groups.length - 1];
			if (last && last.query === e.query) {
				last.events.push(e);
			} else {
				groups.push({ query: e.query, queryTags: e.queryTags, events: [e] });
			}
		}
		return groups;
	}

	const timelineGrid =
		'grid grid-cols-[9px_minmax(64px,auto)_minmax(40px,auto)_minmax(64px,auto)_minmax(0,1fr)] items-start gap-x-3 py-1.5';
</script>

<div class="border border-line-card bg-card">
	{#if loading}
		<StateBlock class="px-4 py-7" message="Loading…" />
	{:else if error}
		<StateBlock kind="error" class="px-4 py-7" message={error} />
	{:else if transactions.length === 0}
		<StateBlock class="px-4 py-7" message="No transactions in this range" />
	{:else}
		{#each transactions as t (rowKey(t))}
			{@const open = expanded[rowKey(t)] ?? false}
			<div class="border-b border-line last:border-b-0">
				<div
					onclick={() => toggle(t)}
					onkeydown={(e) => onRowKey(e, t)}
					role="button"
					tabindex="0"
					aria-expanded={open}
					class="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent-soft"
				>
					{#if open}<ChevronDownIcon class="size-3.5 flex-none text-command" />{:else}<ChevronRightIcon
							class="size-3.5 flex-none text-command"
						/>{/if}
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2.5">
							<span class="font-mono text-md font-semibold text-ink">pid {t.pid}</span>
							<span class="font-sans text-sm text-ink/70">{t.applicationName}</span>
						</div>
					</div>
					<div class="flex-none text-right">
						<div class="font-mono text-2xl leading-none font-semibold whitespace-nowrap text-ink">
							{fmtDurMs(durationMs(t.start, t.end))}
						</div>
						<div class="mt-1 font-mono text-xs whitespace-nowrap text-ink/70">
							{t.start ? `started ${fmtClockDate(timestampDate(t.start))}` : '—'}
						</div>
					</div>
				</div>

				{#if open}
					<div class="border-t border-line-soft bg-paper px-5 py-3 md:pl-12">
						{#each groupEvents(t.events) as g, gi (gi)}
							<div class="mt-4 first:mt-0">
								{#if g.query}
									<div class="leading-[18px]">
										<button
											type="button"
											onmouseenter={(ev) => sql.show(g.query, ev)}
											onmouseleave={sql.hide}
											onfocus={(ev) => sql.show(g.query, ev)}
											onblur={sql.hide}
											class="inline-block max-w-full cursor-default truncate border-0 bg-transparent p-0 text-left align-top font-mono text-sm text-ink/75 transition-colors hover:text-command focus-visible:text-command focus-visible:outline-none"
											>{g.query}</button
										>
										{#if Object.keys(g.queryTags).length > 0}
											<div class="mt-1.5 flex flex-wrap gap-1.5">
												{#each kvTags(g.queryTags) as qtag (qtag)}
													<Tag text={qtag} />
												{/each}
											</div>
										{/if}
									</div>
								{:else}
									<div class="font-mono text-sm leading-[18px] text-ink/70">no query running</div>
								{/if}

								<div class="mt-2 border-l border-line pl-3.5">
									{#each g.events as e, i (i)}
										<div class={timelineGrid}>
											<span class="mt-1.5 h-2.5 w-2.5 rounded-full" style:background={statusColor(e.status)}></span>
											<span class="font-mono text-sm leading-[18px] whitespace-nowrap text-ink/70">
												{#if t.start && e.from && e.to}{relFrom(t.start, e.from)}–{relFrom(t.start, e.to)}{/if}
											</span>
											<span class="text-right font-mono text-sm leading-[18px] whitespace-nowrap text-ink/70">
												{fmtDurMs(durationMs(e.from, e.to))}
											</span>
											<span
												class="font-condensed text-xs leading-[18px] font-bold tracking-[0.5px] whitespace-nowrap uppercase"
												style:color={statusColor(e.status)}>{statusLabel(e.status)}</span
											>
											<span class="font-mono text-sm leading-[18px] text-ink/70">{waitText(e)}</span>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<SqlPopover state={sql} />
