<script lang="ts">
	import { SearchIcon, XIcon, ChevronDownIcon, CheckIcon } from '@lucide/svelte';
	import { timestampFromDate, timestampDate } from '@bufbuild/protobuf/wkt';
	import {
		LogEvent_LogLevel,
		LogEvent_LogClassification,
		type QueryLogsResponse
	} from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/log_pb';
	import { logClient } from '$lib/connect';
	import StateBlock from '$lib/components/StateBlock.svelte';
	import LogsTable from '$lib/components/LogsTable.svelte';
	import { ctx } from '$lib/state.svelte';
	import { fmtCount, errMsg } from '$lib/format';
	import { levelLabel, levelColor, levelChip, LEVEL_ORDER, classificationLabel, ALL_CLASSIFICATIONS } from '$lib/logs';
	import LogHistogram from '$lib/components/LogHistogram.svelte';

	let resp = $state<QueryLogsResponse | undefined>(undefined);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let search = $state('');
	let filter = $state('');

	// Empty selection means "all"; chips keep counts from level_totals so they stay togglable.
	let selectedLevels = $state<LogEvent_LogLevel[]>([]);
	let selectedClasses = $state<LogEvent_LogClassification[]>([]);

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
		const ac = new AbortController();
		loading = true;
		error = null;

		logClient
			.queryLogs(request, { signal: ac.signal })
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
			ac.abort();
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
		<div
			class="flex h-10 min-w-[15rem] flex-1 items-center gap-2.5 border border-line-strong bg-paper px-3 focus-within:border-command"
		>
			<SearchIcon class="size-3.5 flex-none text-ink/55" />
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
					class="cursor-pointer text-ink/55 hover:text-danger"><XIcon class="size-3.5" /></button
				>
			{/if}
		</div>

		<div class="relative z-[21]">
			<button
				type="button"
				onclick={() => (menu = menu === 'class' ? null : 'class')}
				aria-haspopup="menu"
				aria-expanded={menu === 'class'}
				class="flex h-10 cursor-pointer items-center gap-2.5 border border-line-strong bg-paper px-3 hover:bg-hover-soft"
			>
				<span class="font-condensed text-2xs font-semibold tracking-[0.8px] text-ink/50 uppercase">Class</span>
				<span class="font-mono text-sm font-medium whitespace-nowrap text-ink">{classLabel}</span>
				<ChevronDownIcon class="size-3.5 text-ink/55" />
			</button>
			{#if menu === 'class'}
				<div
					class="absolute top-[calc(100%+6px)] right-0 z-[22] max-h-[21.25rem] min-w-[18.75rem] overflow-auto border border-line-strong bg-card p-1.5 shadow-popover"
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

	<LogsTable {records} />

	{#if loading}
		<StateBlock class="px-4 py-7" message="Loading…" />
	{:else if error}
		<StateBlock kind="error" class="px-4 py-7" message={error} />
	{:else if records.length === 0}
		<StateBlock class="px-10 py-10" message="No log events match the current filters" />
	{/if}
</div>
