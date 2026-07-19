<script lang="ts">
	import { ChevronDownIcon, ChevronRightIcon } from '@lucide/svelte';
	import { timestampFromDate, timestampDate, type Timestamp } from '@bufbuild/protobuf/wkt';
	import {
		TransactionEventStatus,
		type Transaction,
		type TransactionEvent
	} from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/activity_pb';
	import { activityClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import { fmtDuration, fmtRel, fmtClockDate, errMsg, kvTags } from '$lib/format';
	import { C } from '$lib/theme';
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

		let cancelled = false;
		loading = true;
		error = null;

		activityClient
			.queryTransactions(request)
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
				return C.ok;
			case TransactionEventStatus.ABORTED:
				return C.danger;
			default:
				return C.steel;
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

<div class="border border-ink/16 bg-card">
	{#if loading}
		<div class="px-4 py-7 text-center font-mono text-sm text-ink/45">Loading…</div>
	{:else if error}
		<div class="px-4 py-7 text-center font-mono text-sm text-danger">{error}</div>
	{:else if transactions.length === 0}
		<div class="px-4 py-7 text-center font-mono text-sm text-ink/45">No transactions in this range</div>
	{:else}
		{#each transactions as t (rowKey(t))}
			{@const open = expanded[rowKey(t)] ?? false}
			<div class="border-b border-ink/14 last:border-b-0">
				<div
					onclick={() => toggle(t)}
					onkeydown={(e) => onRowKey(e, t)}
					role="button"
					tabindex="0"
					class="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-command/5"
				>
					{#if open}<ChevronDownIcon class="size-3.5 flex-none text-command" />{:else}<ChevronRightIcon
							class="size-3.5 flex-none text-command"
						/>{/if}
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2.5">
							<span class="font-mono text-md font-semibold text-ink">pid {t.pid}</span>
							<span class="font-sans text-sm text-ink/60">{t.applicationName}</span>
						</div>
					</div>
					<div class="flex-none text-right">
						<div class="font-mono text-2xl leading-none font-semibold whitespace-nowrap text-ink">
							{fmtDurMs(durationMs(t.start, t.end))}
						</div>
						<div class="mt-1 font-mono text-xs whitespace-nowrap text-ink/50">
							{t.start ? `started ${fmtClockDate(timestampDate(t.start))}` : '—'}
						</div>
					</div>
				</div>

				{#if open}
					<div class="border-t border-ink/8 bg-paper px-5 py-3 md:pl-12">
						{#each groupEvents(t.events) as g, gi (gi)}
							<div class="mt-4 first:mt-0">
								{#if g.query}
									<div class="leading-[18px]">
										<code
											onmouseenter={(ev) => sql.show(g.query, ev)}
											onmouseleave={sql.hide}
											class="inline-block max-w-full truncate align-top font-mono text-sm text-ink/75">{g.query}</code
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
									<div class="font-mono text-sm leading-[18px] text-ink/35">no query running</div>
								{/if}

								<div class="mt-2 border-l border-ink/12 pl-3.5">
									{#each g.events as e, i (i)}
										<div class={timelineGrid}>
											<span class="mt-1.5 h-2.5 w-2.5 rounded-full" style:background={statusColor(e.status)}></span>
											<span class="font-mono text-sm leading-[18px] whitespace-nowrap text-ink/60">
												{#if t.start && e.from && e.to}{relFrom(t.start, e.from)}–{relFrom(t.start, e.to)}{/if}
											</span>
											<span class="text-right font-mono text-sm leading-[18px] whitespace-nowrap text-ink/50">
												{fmtDurMs(durationMs(e.from, e.to))}
											</span>
											<span
												class="font-condensed text-xs leading-[18px] font-bold tracking-[0.5px] whitespace-nowrap uppercase"
												style:color={statusColor(e.status)}>{statusLabel(e.status)}</span
											>
											<span class="font-mono text-sm leading-[18px] text-ink/55">{waitText(e)}</span>
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
