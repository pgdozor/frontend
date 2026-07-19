<script lang="ts">
	import { SearchIcon, XIcon, ChevronDownIcon, ChevronRightIcon, CheckIcon } from '@lucide/svelte';
	import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';
	import {
		LogEvent_LogLevel,
		LogEvent_LogClassification,
		type QueryLogsResponse,
		type LogRecord
	} from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/log_pb';
	import { logClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import { fmtCount, fmtTs, errMsg } from '$lib/format';
	import {
		levelLabel,
		levelColor,
		levelBadge,
		levelChip,
		LEVEL_ORDER,
		classificationLabel,
		classificationCode,
		ALL_CLASSIFICATIONS
	} from '$lib/logs';
	import LogHistogram from '$lib/components/LogHistogram.svelte';

	let resp = $state<QueryLogsResponse | undefined>(undefined);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let search = $state('');
	let filter = $state('');

	// Empty selection means "all"; chips keep counts from level_totals so they stay togglable.
	let selectedLevels = $state<LogEvent_LogLevel[]>([]);
	let selectedClasses = $state<LogEvent_LogClassification[]>([]);

	let expanded = $state<Record<string, boolean>>({});
	let menu = $state<'class' | null>(null);

	$effect(() => {
		if (ctx.server) {
			selectedLevels = [];
			selectedClasses = [];
		}
	});

	$effect(() => {
		const term = search;
		const id = setTimeout(() => {
			filter = term.trim();
		}, 250);
		return () => clearTimeout(id);
	});

	$effect(() => {
		const { from, to } = ctx.timeRange();
		const request = {
			serverName: ctx.server,
			from: timestampFromDate(from),
			to: timestampFromDate(to),
			filter,
			logLevels: [...selectedLevels],
			classifications: [...selectedClasses]
		};

		let cancelled = false;
		loading = true;
		error = null;

		logClient
			.queryLogs(request)
			.then((res) => {
				if (cancelled) return;
				resp = res;
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				error = errMsg(e);
				resp = undefined;
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	const records = $derived(resp?.records ?? []);
	const buckets = $derived(resp?.histogram?.buckets ?? []);
	const levelTotals = $derived(resp?.histogram?.levelTotals ?? []);

	const levelActive = (level: LogEvent_LogLevel): boolean =>
		selectedLevels.length === 0 || selectedLevels.includes(level);

	const chips = $derived.by(() => {
		const counts = new Map(levelTotals.map((c) => [c.level, Number(c.count)]));
		return LEVEL_ORDER.filter((l) => counts.has(l)).map((l) => ({
			level: l,
			label: levelLabel(l),
			count: counts.get(l) ?? 0,
			active: levelActive(l)
		}));
	});

	const totalEvents = $derived(levelTotals.reduce((sum, c) => (levelActive(c.level) ? sum + Number(c.count) : sum), 0));

	const STACK_ORDER = [...LEVEL_ORDER].reverse();
	const chartData = $derived(
		buckets.map((b) => {
			const counts = new Map(b.counts.map((c) => [c.level, Number(c.count)]));
			const segments = STACK_ORDER.filter(levelActive).map((level) => ({
				label: levelLabel(level),
				color: levelColor(level),
				value: counts.get(level) ?? 0
			}));
			return { at: b.bucketStart ? timestampDate(b.bucketStart) : new Date(0), segments };
		})
	);

	const filterActive = $derived(selectedLevels.length > 0 || selectedClasses.length > 0 || filter.length > 0);

	const classLabel = $derived(
		selectedClasses.length === 0
			? 'All'
			: selectedClasses.length === 1
				? classificationLabel(selectedClasses[0])
				: `${selectedClasses.length} selected`
	);

	function toggle<T>(list: T[], value: T): T[] {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}
	const toggleLevel = (l: LogEvent_LogLevel) => (selectedLevels = toggle(selectedLevels, l));
	const toggleClass = (c: LogEvent_LogClassification) => (selectedClasses = toggle(selectedClasses, c));

	function reset() {
		selectedLevels = [];
		selectedClasses = [];
		search = '';
		filter = '';
	}

	const rowKey = (r: LogRecord): string => r.id.toString();
	function toggleRow(r: LogRecord) {
		const k = rowKey(r);
		expanded[k] = !expanded[k];
	}
	function onRowKey(e: KeyboardEvent, r: LogRecord) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleRow(r);
		}
	}

	const tsFmt = (r: LogRecord): string => (r.occurredAt ? fmtTs(timestampDate(r.occurredAt)) : '—');
	const hasSecondary = (r: LogRecord): boolean => !!(r.stateCode || r.detail || r.hint || r.context || r.statement);

	const th =
		'py-2.5 px-3.5 text-left font-condensed text-xs font-semibold tracking-[0.7px] uppercase text-ink/55 border-b border-line whitespace-nowrap';
	const td = 'px-3.5 py-2.5 border-b border-line-soft align-top';
</script>

<div class="mb-4 border border-line-card bg-card px-5 pt-5 pb-3.5">
	<div class="mb-4 flex flex-wrap items-start justify-between gap-5">
		<div class="flex items-baseline gap-2.5">
			<span class="font-mono text-[30px] leading-none font-semibold tracking-[-0.5px] text-ink">
				{fmtCount(totalEvents)}
			</span>
			<span class="font-condensed text-sm font-semibold tracking-[0.8px] text-ink/55 uppercase">log events</span>
		</div>

		<div class="flex flex-nowrap items-center justify-end gap-2">
			{#each chips as chip (chip.level)}
				{@const cs = levelChip(chip.level, chip.active)}
				<button
					type="button"
					onclick={() => toggleLevel(chip.level)}
					class="flex shrink-0 cursor-pointer items-center gap-1.5 px-2.5 py-1 font-condensed text-xs font-semibold tracking-[0.6px] uppercase transition-colors"
					style:color={cs.color}
					style:background={cs.background}
					style:border={cs.border}
				>
					<span>{chip.label}</span>
					<span class="font-mono">{fmtCount(chip.count)}</span>
				</button>
			{/each}
			{#if filterActive}
				<button
					type="button"
					onclick={reset}
					class="shrink-0 cursor-pointer font-condensed text-xs font-bold tracking-[0.6px] text-command uppercase hover:text-danger"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	{#if chartData.length > 0}
		<LogHistogram data={chartData} />
	{/if}
</div>

{#if menu !== null}
	<button
		type="button"
		aria-label="Close menu"
		onclick={() => (menu = null)}
		class="fixed inset-0 z-[20] cursor-default bg-transparent"
	></button>
{/if}

<div class="border border-line-card bg-card">
	<div class="flex flex-wrap items-center gap-2.5 border-b border-line p-3 px-3.5">
		<div class="flex h-10 min-w-[15rem] flex-1 items-center gap-2.5 border border-line-strong bg-paper px-3">
			<SearchIcon class="size-3.5 flex-none text-ink/40" />
			<input
				type="text"
				bind:value={search}
				placeholder="Search log text or PID, e.g. deadlock"
				spellcheck="false"
				class="min-w-0 flex-1 border-none bg-transparent font-mono text-md text-ink outline-none"
			/>
			{#if search}
				<button
					type="button"
					title="Clear"
					onclick={() => (search = '')}
					class="cursor-pointer text-ink/45 hover:text-danger"><XIcon class="size-3.5" /></button
				>
			{/if}
		</div>

		<div class="relative z-[21]">
			<button
				type="button"
				onclick={() => (menu = menu === 'class' ? null : 'class')}
				class="flex h-10 cursor-pointer items-center gap-2.5 border border-line-strong bg-paper px-3 hover:bg-hover-soft"
			>
				<span class="font-condensed text-2xs font-semibold tracking-[0.8px] text-ink/50 uppercase">Class</span>
				<span class="font-mono text-sm font-medium whitespace-nowrap text-ink">{classLabel}</span>
				<ChevronDownIcon class="size-3.5 text-ink/45" />
			</button>
			{#if menu === 'class'}
				<div
					class="absolute top-[calc(100%+6px)] right-0 z-[22] max-h-[21.25rem] min-w-[18.75rem] overflow-auto border border-line-strong bg-card p-1.5 shadow-[0_10px_28px_rgba(58,42,31,0.2)]"
				>
					{#each ALL_CLASSIFICATIONS as c (c)}
						<button
							type="button"
							onclick={() => toggleClass(c)}
							class="flex w-full cursor-pointer items-center justify-between gap-2.5 px-2.5 py-2 text-left font-sans text-sm text-ink hover:bg-hover"
						>
							<span>{classificationLabel(c)}</span>
							{#if selectedClasses.includes(c)}<CheckIcon class="size-3.5 flex-none text-command" />{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-[67rem] table-fixed border-collapse font-sans">
			<thead>
				<tr class="bg-hover-soft">
					<th class="{th} pl-8" style="width:188px">At</th>
					<th class={th} style="width:84px">Level</th>
					<th class={th}>Classification</th>
					<th class={th} style="width:68px">PID</th>
					<th class={th} style="width:100px">Database</th>
					<th class={th} style="width:112px">User</th>
					<th class={th} style="width:132px">Application</th>
					<th class={th} style="width:156px">Backend</th>
				</tr>
			</thead>
			<tbody>
				{#each records as r (rowKey(r))}
					{@const open = expanded[rowKey(r)] ?? false}
					{@const lb = levelBadge(r.logLevel)}
					<tr
						onclick={() => toggleRow(r)}
						onkeydown={(e) => onRowKey(e, r)}
						role="button"
						tabindex="0"
						class="cursor-pointer transition-colors hover:bg-command/6"
					>
						<td class={td}>
							<div class="flex items-start gap-2">
								{#if open}<ChevronDownIcon class="mt-px size-3.5 flex-none text-command" />{:else}<ChevronRightIcon
										class="mt-px size-3.5 flex-none text-command"
									/>{/if}
								<span class="font-mono text-sm leading-[18px] whitespace-nowrap text-ink/80">{tsFmt(r)}</span>
							</div>
						</td>
						<td class={td}>
							<div class="flex h-5 items-center">
								<span
									class="px-2 py-px font-condensed text-2xs font-bold tracking-[0.7px] whitespace-nowrap uppercase"
									style:color={lb.color}
									style:background={lb.background}
									style:border={lb.border}>{levelLabel(r.logLevel)}</span
								>
							</div>
						</td>
						<td class="{td} overflow-hidden">
							<span
								title={classificationCode(r.classification)}
								class="block overflow-hidden font-sans text-sm leading-[18px] text-ellipsis whitespace-nowrap text-ink"
								>{classificationLabel(r.classification)}</span
							>
						</td>
						<td class="{td} font-mono text-sm leading-[18px] text-ink/80">{r.pid || '—'}</td>
						<td class="{td} overflow-hidden">
							<span class="block overflow-hidden text-sm leading-[18px] text-ellipsis whitespace-nowrap text-ink/78"
								>{r.databaseName || '—'}</span
							>
						</td>
						<td class="{td} overflow-hidden">
							<span class="block overflow-hidden text-sm leading-[18px] text-ellipsis whitespace-nowrap text-ink/78"
								>{r.username || '—'}</span
							>
						</td>
						<td class="{td} overflow-hidden">
							<span class="block overflow-hidden text-sm leading-[18px] text-ellipsis whitespace-nowrap text-ink/78"
								>{r.applicationName || '—'}</span
							>
						</td>
						<td class={td}>
							<span class="block font-mono text-xs leading-[18px] break-words text-ink/70">{r.backendType || '—'}</span>
						</td>
					</tr>
					{#if open}
						<tr>
							<td colspan="8" class="border-b border-line p-0">
								<div class="bg-paper px-5 py-4 pl-8">
									<div class="mb-3.5">
										<div class="mb-1 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
											Message
										</div>
										<div class="font-mono text-md leading-[1.6] break-words whitespace-pre-wrap text-ink">
											{r.message}
										</div>
									</div>

									{#if r.stateCode}
										<div class="mb-3.5">
											<span
												class="border border-danger/30 bg-danger/10 px-2.5 py-1 font-mono text-xs font-semibold text-danger"
												>SQLSTATE {r.stateCode}</span
											>
										</div>
									{/if}

									{#if r.detail}
										<div class="mb-3.5">
											<div class="mb-1 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
												Detail
											</div>
											<div class="font-mono text-sm leading-[1.6] break-words whitespace-pre-wrap text-ink">
												{r.detail}
											</div>
										</div>
									{/if}

									{#if r.hint}
										<div class="mb-3.5">
											<div class="mb-1 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
												Hint
											</div>
											<div class="font-sans text-md leading-[1.55] text-ink/82">{r.hint}</div>
										</div>
									{/if}

									{#if r.context}
										<div class="mb-3.5">
											<div class="mb-1 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
												Context
											</div>
											<div class="font-mono text-sm leading-[1.55] break-words whitespace-pre-wrap text-ink/80">
												{r.context}
											</div>
										</div>
									{/if}

									{#if r.statement}
										<div>
											<div class="mb-1.5 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
												Statement
											</div>
											<pre
												class="m-0 bg-ink px-3.5 py-3 font-mono text-sm leading-[1.7] break-words whitespace-pre-wrap text-paper">{r.statement}</pre>
										</div>
									{/if}

									{#if !hasSecondary(r)}
										<div class="font-mono text-sm text-ink/40">No additional fields recorded for this event</div>
									{/if}
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>

	{#if loading}
		<div class="px-4 py-7 text-center font-mono text-sm text-ink/45">Loading…</div>
	{:else if error}
		<div class="px-4 py-7 text-center font-mono text-sm text-danger">{error}</div>
	{:else if records.length === 0}
		<div class="px-10 py-10 text-center font-mono text-sm text-ink/45">No log events match the current filters</div>
	{/if}
</div>
