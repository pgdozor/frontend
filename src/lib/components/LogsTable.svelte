<script lang="ts">
	import { ChevronDownIcon, ChevronRightIcon } from '@lucide/svelte';
	import { timestampDate } from '@bufbuild/protobuf/wkt';
	import type { LogRecord } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/log_pb';
	import { fmtTs } from '$lib/format';
	import { levelBadge, levelLabel, classificationLabel, classificationCode } from '$lib/logs';

	let { records }: { records: LogRecord[] } = $props();

	let expanded = $state<Record<string, boolean>>({});

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

<div class="overflow-x-auto">
	<table class="w-full min-w-[67rem] table-fixed border-collapse font-sans">
		<thead>
			<tr class="bg-hover-soft">
				<th scope="col" class="{th} pl-8" style="width:188px">At</th>
				<th scope="col" class={th} style="width:84px">Level</th>
				<th scope="col" class={th}>Classification</th>
				<th scope="col" class={th} style="width:68px">PID</th>
				<th scope="col" class={th} style="width:100px">Database</th>
				<th scope="col" class={th} style="width:112px">User</th>
				<th scope="col" class={th} style="width:132px">Application</th>
				<th scope="col" class={th} style="width:156px">Backend</th>
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
					aria-expanded={open}
					class="cursor-pointer transition-colors hover:bg-accent-soft"
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
									<div class="font-mono text-sm text-ink/55">No additional fields recorded for this event</div>
								{/if}
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>
