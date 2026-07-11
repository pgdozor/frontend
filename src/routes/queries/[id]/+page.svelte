<script lang="ts">
	import { ArrowLeftIcon, ExternalLinkIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';
	import type { QueryStatementDetailResponse } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/statement_pb';
	import { statementClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import { format } from 'sql-formatter';
	import { fmtDuration, sevByDuration, fmtTs, kvTags, truncate, errMsg } from '$lib/format';
	import MetricPanel from '$lib/components/MetricPanel.svelte';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import Tag from '$lib/components/Tag.svelte';

	let detail = $state<QueryStatementDetailResponse | undefined>(undefined);
	let chartRange = $state<{ from: Date; to: Date } | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const sql = new SqlPopoverState();

	const id = $derived(page.params.id ?? '');

	$effect(() => {
		const statementId = id;
		const { from, to } = ctx.timeRange();
		chartRange = { from, to };

		if (!/^\d+$/.test(statementId)) {
			error = 'Invalid query id';
			detail = undefined;
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;
		error = null;

		statementClient
			.queryStatementDetail({
				id: BigInt(statementId),
				from: timestampFromDate(from),
				to: timestampFromDate(to)
			})
			.then((res) => {
				if (cancelled) return;
				detail = res;
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				error = errMsg(e);
				detail = undefined;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	const tags = $derived(kvTags(detail?.tags ?? {}));

	// Raw normalized query by default; the Prettify toggle pretty-prints it.
	let prettified = $state(false);
	const queryText = $derived.by(() => {
		const q = detail?.query ?? '';
		if (!q || !prettified) return q;
		try {
			return format(q, { language: 'postgresql' });
		} catch {
			return q;
		}
	});

	const samples = $derived(
		(detail?.samples ?? []).map((s) => ({
			id: s.id.toString(),
			ts: s.occurredAt ? fmtTs(timestampDate(s.occurredAt)) : '—',
			statement: s.query,
			short: truncate(s.query, 120),
			tags: kvTags(s.tags),
			hasPlan: s.hasPlan,
			durFmt: fmtDuration(s.durationMs),
			sev: sevByDuration(s.durationMs)
		}))
	);

	const thBase =
		'border-b border-ink/14 px-[18px] py-[9px] font-condensed text-[11px] font-semibold tracking-[0.7px] text-ink/55 uppercase';
</script>

<a
	href="/queries"
	class="mb-[18px] inline-flex items-center gap-[7px] font-mono text-[12px] font-semibold text-command hover:underline"
>
	<ArrowLeftIcon class="size-[14px]" /><span>Back</span>
</a>

<div class="border border-ink/16 bg-ink px-[20px] py-[18px]">
	{#if detail}
		<div class="font-mono text-[14px] leading-[1.85] break-words whitespace-pre-wrap text-paper">
			<button
				type="button"
				onclick={() => (prettified = !prettified)}
				class="float-right ml-[12px] cursor-pointer border px-[10px] py-[3px] font-condensed text-[10.5px] font-semibold tracking-[0.7px] uppercase transition-colors {prettified
					? 'border-command bg-command text-paper'
					: 'border-paper/25 text-paper/70 hover:border-paper/50 hover:text-paper'}">Prettify</button
			>{queryText}
		</div>
	{:else}
		<div class="font-mono text-[14px] text-paper/50">{loading ? 'Loading…' : (error ?? '')}</div>
	{/if}
</div>

{#if tags.length > 0}
	<div class="mt-[12px] flex flex-wrap gap-[6px]">
		{#each tags as t (t)}
			<Tag text={t} size="md" />
		{/each}
	</div>
{/if}

<div class="mt-[16px]">
	<MetricPanel metrics={detail?.metrics} {loading} {error} range={chartRange} />
</div>

<div class="mt-[16px] border border-ink/16 bg-card">
	<div class="flex items-center gap-[11px] border-b border-ink/14 px-[18px] py-[13px]">
		<span class="font-condensed text-[14px] font-bold tracking-[0.8px] text-ink uppercase">Captured Samples</span>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-[640px] table-fixed border-collapse">
			<thead>
				<tr class="bg-ink/4">
					<th class="{thBase} w-[180px] text-left">At</th>
					<th class="{thBase} text-left">Query</th>
					<th class="{thBase} w-[112px] text-left">Plan</th>
					<th class="{thBase} w-[110px] text-right">Duration</th>
				</tr>
			</thead>
			<tbody>
				{#each samples as s (s.id)}
					<tr class="hover:bg-ink/3">
						<td
							class="border-b border-ink/8 px-[18px] py-[11px] align-top font-mono text-[12px] leading-[20px] whitespace-nowrap text-ink/75"
							>{s.ts}</td
						>
						<td class="min-w-0 border-b border-ink/8 px-[18px] py-[11px] align-top">
							<code
								onmouseenter={(e) => sql.show(s.statement, e)}
								onmouseleave={sql.hide}
								class="inline-block max-w-full cursor-default overflow-hidden align-top font-mono text-[12.5px] leading-[20px] text-ellipsis whitespace-nowrap text-ink transition-colors hover:text-command"
								>{s.short}</code
							>
							{#if s.tags.length > 0}
								<div class="mt-[6px] flex flex-wrap gap-[5px]">
									{#each s.tags as t (t)}
										<Tag text={t} />
									{/each}
								</div>
							{/if}
						</td>
						<td class="border-b border-ink/8 px-[18px] py-[11px] align-top">
							{#if s.hasPlan}
								<a
									href="/queries/{id}/plan/{s.id}"
									target="_blank"
									rel="noopener"
									class="inline-flex items-center gap-[5px] align-top font-mono text-[12px] leading-[20px] font-semibold whitespace-nowrap text-command hover:underline"
								>
									<span>view plan</span>
									<ExternalLinkIcon class="size-[11px] stroke-[2.2]" />
								</a>
							{:else}
								<span class="font-mono text-[12px] leading-[20px] text-ink/35">—</span>
							{/if}
						</td>
						<td
							class="border-b border-ink/8 px-[18px] py-[11px] text-right align-top font-mono text-[13px] leading-[20px] font-semibold whitespace-nowrap"
							style:color={s.sev}>{s.durFmt}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if loading}
		<div class="px-[18px] py-[24px] text-center font-mono text-[13px] text-ink/45">Loading…</div>
	{:else if error}
		<div class="px-[18px] py-[24px] text-center font-mono text-[13px] text-danger">{error}</div>
	{:else if samples.length === 0}
		<div class="px-[18px] py-[24px] text-center font-mono text-[13px] text-ink/45">
			No samples captured in this range.
		</div>
	{/if}
</div>

<SqlPopover state={sql} />
