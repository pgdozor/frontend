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
		'py-[10px] px-[14px] text-left font-condensed text-[11px] font-semibold tracking-[0.7px] uppercase text-ink/55 border-b border-ink/14 whitespace-nowrap';
	const td = 'px-[14px] py-[10px] border-b border-ink/8 align-top';
</script>

<div class="mb-[16px] border border-ink/16 bg-card px-[20px] pt-[18px] pb-[14px]">
	<div class="mb-[16px] flex flex-wrap items-start justify-between gap-[18px]">
		<div class="flex items-baseline gap-[10px]">
			<span class="font-mono text-[30px] leading-none font-semibold tracking-[-0.5px] text-ink">
				{fmtCount(totalEvents)}
			</span>
			<span class="font-condensed text-[12px] font-semibold tracking-[0.8px] text-ink/55 uppercase">log events</span>
		</div>

		<div class="flex flex-nowrap items-center justify-end gap-[7px]">
			{#each chips as chip (chip.level)}
				{@const cs = levelChip(chip.level, chip.active)}
				<button
					type="button"
					onclick={() => toggleLevel(chip.level)}
					class="flex shrink-0 cursor-pointer items-center gap-[6px] px-[10px] py-[4px] font-condensed text-[11px] font-semibold tracking-[0.6px] uppercase transition-colors"
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
					class="shrink-0 cursor-pointer font-condensed text-[11px] font-bold tracking-[0.6px] text-command uppercase hover:text-danger"
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

<div class="border border-ink/16 bg-card">
	<div class="flex flex-wrap items-center gap-[10px] border-b border-ink/14 p-[12px] px-[14px]">
		<div class="flex h-[38px] min-w-[240px] flex-1 items-center gap-[10px] border border-ink/20 bg-paper px-[12px]">
			<SearchIcon class="size-[14px] flex-none text-ink/40" />
			<input
				type="text"
				bind:value={search}
				placeholder="Search log text or PID, e.g. deadlock"
				spellcheck="false"
				class="min-w-0 flex-1 border-none bg-transparent font-mono text-[13px] text-ink outline-none"
			/>
			{#if search}
				<button
					type="button"
					title="Clear"
					onclick={() => (search = '')}
					class="cursor-pointer text-ink/45 hover:text-danger"><XIcon class="size-[13px]" /></button
				>
			{/if}
		</div>

		<div class="relative z-[21]">
			<button
				type="button"
				onclick={() => (menu = menu === 'class' ? null : 'class')}
				class="flex h-[38px] cursor-pointer items-center gap-[9px] border border-ink/20 bg-paper px-[12px] hover:bg-ink/4"
			>
				<span class="font-condensed text-[10px] font-semibold tracking-[0.8px] text-ink/50 uppercase">Class</span>
				<span class="font-mono text-[12px] font-medium whitespace-nowrap text-ink">{classLabel}</span>
				<ChevronDownIcon class="size-[13px] text-ink/45" />
			</button>
			{#if menu === 'class'}
				<div
					class="absolute top-[calc(100%+6px)] right-0 z-[22] max-h-[340px] min-w-[300px] overflow-auto border border-ink/20 bg-card p-[5px] shadow-[0_10px_28px_rgba(58,42,31,0.2)]"
				>
					{#each ALL_CLASSIFICATIONS as c (c)}
						<button
							type="button"
							onclick={() => toggleClass(c)}
							class="flex w-full cursor-pointer items-center justify-between gap-[10px] px-[10px] py-[7px] text-left font-sans text-[12.5px] text-ink hover:bg-ink/5"
						>
							<span>{classificationLabel(c)}</span>
							{#if selectedClasses.includes(c)}<CheckIcon class="size-[14px] flex-none text-command" />{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-[1072px] table-fixed border-collapse font-sans">
			<thead>
				<tr class="bg-ink/4">
					<th class="{th} pl-[32px]" style="width:188px">At</th>
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
							<div class="flex items-start gap-[8px]">
								{#if open}<ChevronDownIcon
										class="mt-[1px] size-[13px] flex-none text-command"
									/>{:else}<ChevronRightIcon class="mt-[1px] size-[13px] flex-none text-command" />{/if}
								<span class="font-mono text-[12px] leading-[18px] whitespace-nowrap text-ink/80">{tsFmt(r)}</span>
							</div>
						</td>
						<td class={td}>
							<div class="flex h-[18px] items-center">
								<span
									class="px-[8px] py-[1px] font-condensed text-[10.5px] font-bold tracking-[0.7px] whitespace-nowrap uppercase"
									style:color={lb.color}
									style:background={lb.background}
									style:border={lb.border}>{levelLabel(r.logLevel)}</span
								>
							</div>
						</td>
						<td class="{td} overflow-hidden">
							<span
								title={classificationCode(r.classification)}
								class="block overflow-hidden font-sans text-[12.5px] leading-[18px] text-ellipsis whitespace-nowrap text-ink"
								>{classificationLabel(r.classification)}</span
							>
						</td>
						<td class="{td} font-mono text-[12px] leading-[18px] text-ink/80">{r.pid || '—'}</td>
						<td class="{td} overflow-hidden">
							<span
								class="block overflow-hidden text-[12.5px] leading-[18px] text-ellipsis whitespace-nowrap text-ink/78"
								>{r.databaseName || '—'}</span
							>
						</td>
						<td class="{td} overflow-hidden">
							<span
								class="block overflow-hidden text-[12.5px] leading-[18px] text-ellipsis whitespace-nowrap text-ink/78"
								>{r.username || '—'}</span
							>
						</td>
						<td class="{td} overflow-hidden">
							<span
								class="block overflow-hidden text-[12.5px] leading-[18px] text-ellipsis whitespace-nowrap text-ink/78"
								>{r.applicationName || '—'}</span
							>
						</td>
						<td class={td}>
							<span class="block font-mono text-[11.5px] leading-[18px] break-words text-ink/70"
								>{r.backendType || '—'}</span
							>
						</td>
					</tr>
					{#if open}
						<tr>
							<td colspan="8" class="border-b border-ink/14 p-0">
								<div class="bg-paper px-[18px] py-[16px] pl-[32px]">
									<div class="mb-[14px]">
										<div
											class="mb-[4px] font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/50 uppercase"
										>
											Message
										</div>
										<div class="font-mono text-[13px] leading-[1.6] break-words whitespace-pre-wrap text-ink">
											{r.message}
										</div>
									</div>

									{#if r.stateCode}
										<div class="mb-[14px]">
											<span
												class="border border-danger/30 bg-danger/10 px-[9px] py-[3px] font-mono text-[11px] font-semibold text-danger"
												>SQLSTATE {r.stateCode}</span
											>
										</div>
									{/if}

									{#if r.detail}
										<div class="mb-[13px]">
											<div
												class="mb-[4px] font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/50 uppercase"
											>
												Detail
											</div>
											<div class="font-mono text-[12.5px] leading-[1.6] break-words whitespace-pre-wrap text-ink">
												{r.detail}
											</div>
										</div>
									{/if}

									{#if r.hint}
										<div class="mb-[13px]">
											<div
												class="mb-[4px] font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/50 uppercase"
											>
												Hint
											</div>
											<div class="font-sans text-[13px] leading-[1.55] text-ink/82">{r.hint}</div>
										</div>
									{/if}

									{#if r.context}
										<div class="mb-[13px]">
											<div
												class="mb-[4px] font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/50 uppercase"
											>
												Context
											</div>
											<div class="font-mono text-[12.5px] leading-[1.55] break-words whitespace-pre-wrap text-ink/80">
												{r.context}
											</div>
										</div>
									{/if}

									{#if r.statement}
										<div>
											<div
												class="mb-[5px] font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/50 uppercase"
											>
												Statement
											</div>
											<pre
												class="m-0 bg-ink px-[14px] py-[12px] font-mono text-[12.5px] leading-[1.7] break-words whitespace-pre-wrap text-paper">{r.statement}</pre>
										</div>
									{/if}

									{#if !hasSecondary(r)}
										<div class="font-mono text-[12px] text-ink/40">No additional fields recorded for this event</div>
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
		<div class="px-[16px] py-[28px] text-center font-mono text-[12px] text-ink/45">Loading…</div>
	{:else if error}
		<div class="px-[16px] py-[28px] text-center font-mono text-[12px] text-danger">{error}</div>
	{:else if records.length === 0}
		<div class="px-[40px] py-[40px] text-center font-mono text-[12px] text-ink/45">
			No log events match the current filters
		</div>
	{/if}
</div>
