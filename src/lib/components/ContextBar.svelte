<script lang="ts">
	import { DatabaseIcon, ClockIcon, ChevronDownIcon, CheckIcon, ArrowRightIcon } from '@lucide/svelte';
	import { Select, Popover } from 'bits-ui';
	import { page } from '$app/state';
	import { screenDescription, screenTitle } from '$lib/nav';
	import { ctx, scopeLock, serversState, presets } from '$lib/state.svelte';
	import SidebarToggle from '$lib/components/SidebarToggle.svelte';

	let { dbSwitch = true }: { dbSwitch?: boolean } = $props();

	let timeOpen = $state(false);
	let draftFrom = $state(ctx.customFrom);
	let draftTo = $state(ctx.customTo);

	const title = $derived(screenTitle(page.url.pathname));
	const description = $derived(screenDescription(page.url.pathname));
	const activeServer = $derived(scopeLock.server ?? ctx.server);
	const selfHealth = $derived(serversState.health(activeServer));

	function healthClass(server: string): string {
		return serversState.health(server) === 'ok' ? 'bg-ok' : 'bg-warn';
	}
	function selectServer(name: string) {
		ctx.server = name;
		serversState.reconcile();
	}
	function selectPreset(key: string) {
		ctx.range = key;
		timeOpen = false;
	}
	function applyCustom() {
		ctx.customFrom = draftFrom;
		ctx.customTo = draftTo;
		ctx.range = 'custom';
		timeOpen = false;
	}

	const triggerCls = 'flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-hover-soft';
	const panelCls = 'z-50 max-w-[calc(100vw-24px)] border border-line-strong bg-card p-1.5 shadow-dropdown';
	const itemCls =
		'flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 font-mono text-sm text-ink hover:bg-hover data-[highlighted]:bg-hover';
	const labelCls = 'px-2.5 pt-1.5 pb-1 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase';
	const dotTitle = (ok: boolean) =>
		ok
			? 'Collector healthy · reported within 5 minutes'
			: 'Collector not responding · no health check in over 5 minutes';
</script>

<div
	class="sticky top-0 z-30 flex flex-wrap items-center gap-2.5 border-b border-line bg-paper/70 px-4 py-3.5 backdrop-blur-[3px] backdrop-saturate-[1.1] sm:px-5 md:gap-5 md:px-7"
>
	<SidebarToggle />

	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<div class="flex items-baseline gap-2.5">
			<h1 class="truncate font-condensed text-xl leading-[1.15] font-bold tracking-[0.6px] text-ink uppercase">
				{title}
			</h1>
		</div>
		<p class="truncate text-xs leading-[1.2] text-ink/55">{description}</p>
	</div>

	<div class="flex flex-wrap items-center gap-2.5">
		<div class="flex border border-line-card bg-card">
			{#if scopeLock.locked}
				<div
					class="flex items-center gap-2 border-r border-line px-3 py-2"
					title="This query lives on {scopeLock.server} — the server is fixed here"
				>
					<span
						class="h-2 w-2 rounded-full {selfHealth === 'ok' ? 'bg-ok' : 'bg-warn'}"
						title={dotTitle(selfHealth === 'ok')}
					></span>
					<span class="font-mono text-sm font-medium text-ink">{scopeLock.server}</span>
				</div>
				<div
					class="flex items-center gap-2 px-3 py-2"
					title="This query lives in {scopeLock.db} — the database is fixed here"
				>
					<DatabaseIcon class="size-3.5 flex-none text-steel" />
					<span class="font-mono text-sm font-medium text-ink">{scopeLock.db}</span>
				</div>
			{:else}
				<Select.Root type="single" value={ctx.server} onValueChange={selectServer}>
					<Select.Trigger>
						{#snippet child({ props })}
							<button {...props} class="{triggerCls} border-r border-line" aria-label="Select Postgres server">
								<span
									class="h-2 w-2 rounded-full {selfHealth === 'ok' ? 'bg-ok' : 'bg-warn'}"
									title={dotTitle(selfHealth === 'ok')}
								></span>
								<span class="font-mono text-sm font-medium text-ink">{ctx.server || '—'}</span>
								<ChevronDownIcon class="size-3.5 text-ink/55" />
							</button>
						{/snippet}
					</Select.Trigger>
					<Select.Portal>
						<Select.Content sideOffset={6} align="start" class="{panelCls} min-w-[13.125rem]">
							<div class={labelCls}>Postgres server</div>
							{#each serversState.names as s (s)}
								<Select.Item value={s} label={s}>
									{#snippet child({ props, selected })}
										<div {...props} class="{itemCls} {selected ? 'font-semibold' : ''}">
											<span class="h-2 w-2 rounded-full {healthClass(s)}"></span>
											<span class="flex-1 text-left">{s}</span>
											{#if selected}<CheckIcon class="size-3.5 text-command" />{/if}
										</div>
									{/snippet}
								</Select.Item>
							{:else}
								<div class="px-2.5 py-2 font-mono text-sm text-ink/55">No servers</div>
							{/each}
						</Select.Content>
					</Select.Portal>
				</Select.Root>

				<Select.Root type="single" value={ctx.db} onValueChange={(v) => (ctx.db = v)} disabled={!dbSwitch}>
					<Select.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								title={dbSwitch ? 'Select database' : 'Logs are server-wide — the database filter does not apply here'}
								class="{triggerCls} {dbSwitch ? '' : 'cursor-not-allowed opacity-40'}"
							>
								<DatabaseIcon class="size-3.5 flex-none text-steel" />
								<span class="font-mono text-sm font-medium text-ink">{ctx.db || '—'}</span>
								<ChevronDownIcon class="size-3.5 text-ink/55" />
							</button>
						{/snippet}
					</Select.Trigger>
					<Select.Portal>
						<Select.Content sideOffset={6} align="end" class="{panelCls} min-w-[11.875rem]">
							<div class={labelCls}>Database</div>
							{#each serversState.databasesFor(ctx.server) as d (d)}
								<Select.Item value={d} label={d}>
									{#snippet child({ props, selected })}
										<div {...props} class="{itemCls} {selected ? 'font-semibold' : ''}">
											<span class="flex-1 text-left">{d}</span>
											{#if selected}<CheckIcon class="size-3.5 text-command" />{/if}
										</div>
									{/snippet}
								</Select.Item>
							{:else}
								<div class="px-2.5 py-2 font-mono text-sm text-ink/55">No databases</div>
							{/each}
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			{/if}
		</div>

		<Popover.Root
			bind:open={timeOpen}
			onOpenChange={(o) => {
				if (o) {
					draftFrom = ctx.customFrom;
					draftTo = ctx.customTo;
				}
			}}
		>
			<Popover.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="flex cursor-pointer items-center gap-2 border border-line-card bg-card px-3 py-2 hover:bg-hover-soft"
					>
						<ClockIcon class="size-3.5 flex-none text-warn" />
						{#if ctx.isCustom}
							<span class="flex items-center gap-1.5 font-mono text-sm font-medium whitespace-nowrap text-ink">
								{ctx.customFromLabel}
								<ArrowRightIcon class="size-3 flex-none text-ink/55" />
								{ctx.customToLabel}
							</span>
						{:else}
							<span class="font-mono text-sm font-medium whitespace-nowrap text-ink">{ctx.timeLabel}</span>
						{/if}
						<ChevronDownIcon class="size-3.5 text-ink/55" />
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					sideOffset={6}
					align="end"
					class="z-50 flex max-w-[calc(100vw-24px)] flex-col border border-line-strong bg-card shadow-popover sm:flex-row"
				>
					<div class="border-b border-line px-2 py-3.5 sm:min-w-[10.75rem] sm:border-r sm:border-b-0">
						<div class="mb-2.5 px-2.5 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
							Quick ranges
						</div>
						{#each presets as { key, label } (key)}
							<button
								type="button"
								onclick={() => selectPreset(key)}
								class="block w-full cursor-pointer px-3 py-2 text-left font-sans text-sm whitespace-nowrap hover:bg-hover {ctx.range ===
								key
									? 'bg-accent font-semibold text-command'
									: 'text-ink'}"
							>
								{label}
							</button>
						{/each}
					</div>
					<div class="w-[16.75rem] max-w-full px-4 py-3.5">
						<div class="mb-2.5 font-condensed text-2xs font-semibold tracking-[1px] text-ink/50 uppercase">
							Absolute time range
						</div>
						<label class="mb-1 block font-sans text-xs text-ink/65" for="ctx-from">From</label>
						<input
							id="ctx-from"
							type="text"
							bind:value={draftFrom}
							placeholder="YYYY-MM-DD HH:MM:SS"
							spellcheck="false"
							class="mb-3 w-full border border-line-strong bg-paper px-2.5 py-2 font-mono text-sm text-ink"
						/>
						<label class="mb-1 block font-sans text-xs text-ink/65" for="ctx-to">To</label>
						<input
							id="ctx-to"
							type="text"
							bind:value={draftTo}
							placeholder="YYYY-MM-DD HH:MM:SS"
							spellcheck="false"
							class="mb-3.5 w-full border border-line-strong bg-paper px-2.5 py-2 font-mono text-sm text-ink"
						/>
						<button
							type="button"
							onclick={applyCustom}
							class="w-full cursor-pointer bg-command px-2.5 py-2.5 text-center font-condensed text-md font-semibold tracking-[0.6px] text-paper uppercase hover:bg-danger"
						>
							Apply range
						</button>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	</div>
</div>
