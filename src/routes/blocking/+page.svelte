<script lang="ts">
	import { timestampFromDate, timestampDate, type Timestamp } from '@bufbuild/protobuf/wkt';
	import { type BlockingTree, type BlockedEvent } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/activity_pb';
	import { activityClient } from '$lib/connect';
	import { ctx } from '$lib/state.svelte';
	import { fmtDuration, fmtClockDate, errMsg } from '$lib/format';
	import SqlPopover from '$lib/components/SqlPopover.svelte';
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';

	let trees = $state<BlockingTree[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

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
			.queryBlocking(request)
			.then((res) => {
				if (cancelled) return;
				trees = res.trees;
			})
			.catch((e: unknown) => {
				if (cancelled) return;
				error = errMsg(e);
				trees = [];
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	type VictimRow = { event: BlockedEvent; level: number };

	// Rebuild the waits-for tree from the flat blocked list: depth-first from the
	// root through each event's blocker; `level` (1-based) drives the row indent.
	function orderVictims(tree: BlockingTree): VictimRow[] {
		const byBlocker: Record<number, BlockedEvent[]> = {};
		for (const e of tree.blocked) {
			(byBlocker[e.blockedByPid] ??= []).push(e);
		}

		const rows: VictimRow[] = [];
		const seen: Record<number, boolean> = {};
		const walk = (blockerPid: number, level: number) => {
			for (const e of byBlocker[blockerPid] ?? []) {
				if (seen[e.pid]) continue; // guard against a waits-for cycle
				seen[e.pid] = true;
				rows.push({ event: e, level });
				walk(e.pid, level + 1);
			}
		};
		walk(tree.rootPid, 1);

		// A victim whose blocker isn't in the tree still belongs to this pile-up.
		for (const e of tree.blocked) {
			if (!seen[e.pid]) {
				seen[e.pid] = true;
				rows.push({ event: e, level: 1 });
			}
		}

		return rows;
	}

	const fmtDurMs = (ms: number): string => fmtDuration(ms);

	// Independent of "now", so a pile-up that ended in the past shows its real length.
	const durationMs = (from?: Timestamp, to?: Timestamp): number =>
		from && to ? Math.max(0, timestampDate(to).getTime() - timestampDate(from).getTime()) : 0;

	const startedLabel = (ts?: Timestamp): string => (ts ? `started ${fmtClockDate(timestampDate(ts))}` : '—');
</script>

{#if loading}
	<div class="border border-line-card bg-card px-4 py-7 text-center font-mono text-sm text-ink/45">Loading…</div>
{:else if error}
	<div class="border border-line-card bg-card px-4 py-7 text-center font-mono text-sm text-danger">
		{error}
	</div>
{:else if trees.length === 0}
	<div class="border border-line-card bg-card px-4 py-7 text-center font-mono text-sm text-ink/45">
		No blocking in this range
	</div>
{:else}
	{#each trees as tree (tree.rootPid)}
		<div class="mb-4 border border-line-card bg-card last:mb-0">
			<div class="flex items-center gap-4 border-l-4 border-warn bg-warn/[0.06] px-5 py-2.5">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-baseline gap-2.5">
						<span class="font-mono text-md font-semibold text-ink">pid {tree.rootPid}</span>
						<span class="font-sans text-sm text-ink/60">{tree.rootApplicationName}</span>
					</div>
				</div>
				<div class="flex-none text-right">
					<div class="whitespace-nowrap">
						<span class="font-mono text-xl leading-none font-semibold text-warn"
							>{fmtDurMs(durationMs(tree.rootStartedBlocking, tree.rootLastBlocking))}</span
						>
						<span class="ml-1.5 font-condensed text-2xs font-bold tracking-[0.8px] text-warn uppercase">hold</span>
					</div>
					<div class="mt-1.5 font-mono text-xs whitespace-nowrap text-ink/50">
						{startedLabel(tree.rootStartedBlocking)}
					</div>
				</div>
			</div>

			{#each orderVictims(tree) as { event, level } (event.pid)}
				<div class="flex items-start border-t border-line-soft py-3 pr-5" style:padding-left={`${level * 22}px`}>
					<!-- Arrow column width matches the 22px indent step, so pids align across levels. -->
					<span class="w-6 flex-none font-mono text-xs leading-[18px] text-ink/40">↳</span>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-baseline gap-2.5">
							<span class="font-mono text-md font-semibold text-ink">pid {event.pid}</span>
							<span class="font-sans text-sm text-ink/60">{event.applicationName}</span>
						</div>
						<div class="mt-2 flex min-w-0 items-baseline">
							<code
								onmouseenter={(ev) => sql.show(event.query, ev)}
								onmouseleave={sql.hide}
								class="min-w-0 flex-initial truncate font-mono text-sm text-ink/70">{event.query}</code
							>
							{#if event.lockMode}
								<span class="flex-none font-mono text-sm font-medium whitespace-nowrap text-danger">
									<span class="mx-2.5 text-ink/35">·</span>wants {event.lockMode}
								</span>
							{/if}
						</div>
					</div>
					<div class="flex-none pl-4 text-right">
						<div class="whitespace-nowrap">
							<span class="font-mono text-xl leading-none font-semibold text-danger"
								>{fmtDurMs(durationMs(event.startedWaiting, event.lastSeen))}</span
							>
							<span class="ml-1.5 font-condensed text-2xs font-bold tracking-[0.8px] text-danger uppercase">wait</span>
						</div>
						<div class="mt-1.5 font-mono text-xs whitespace-nowrap text-ink/50">
							{startedLabel(event.startedWaiting)}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/each}
{/if}

<SqlPopover state={sql} />
