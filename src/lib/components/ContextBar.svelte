<script lang="ts">
	import { DatabaseIcon, ClockIcon, ChevronDownIcon, CheckIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { screenTitle } from '$lib/nav';
	import { ctx, serversState, presets } from '$lib/state.svelte';

	let { dbSwitch = true }: { dbSwitch?: boolean } = $props();

	type Menu = 'server' | 'db' | 'time' | null;
	let open = $state<Menu>(null);

	const title = $derived(screenTitle(page.url.pathname));
	const selfHealth = $derived(serversState.health(ctx.server));

	function healthClass(server: string): string {
		return serversState.health(server) === 'ok' ? 'bg-ok' : 'bg-warn';
	}

	function toggle(m: Exclude<Menu, null>) {
		open = open === m ? null : m;
	}
	function close() {
		open = null;
	}
	function selectServer(name: string) {
		ctx.server = name;
		serversState.reconcile();
		open = null;
	}
	function selectDb(name: string) {
		ctx.db = name;
		open = null;
	}
	function selectPreset(key: string) {
		ctx.range = key;
		open = null;
	}
	function applyCustom() {
		ctx.range = 'custom';
		open = null;
	}
</script>

<div
	class="sticky top-0 z-30 flex items-center gap-[18px] border-b border-ink/14 bg-paper/70 px-[28px] py-[14px] backdrop-blur-[3px] backdrop-saturate-[1.1]"
>
	<div class="flex max-w-[46%] flex-none flex-col gap-[3px]">
		<div class="flex items-baseline gap-[9px] whitespace-nowrap">
			<span class="font-condensed text-[21px] font-bold tracking-[0.6px] text-ink uppercase">{title}</span>
		</div>
	</div>

	<div class="relative z-[3] ml-auto flex items-center gap-[10px]">
		{#if open !== null}
			<button
				type="button"
				aria-label="Close menu"
				onclick={close}
				class="fixed inset-0 z-[1] cursor-default bg-transparent"
			></button>
		{/if}

		<div class="relative z-[2] flex border border-ink/18 bg-card">
			<button
				type="button"
				onclick={() => toggle('server')}
				class="flex cursor-pointer items-center gap-[8px] border-r border-ink/14 px-[12px] py-[7px] hover:bg-ink/4"
			>
				<span
					class="h-[7px] w-[7px] rounded-full {selfHealth === 'ok' ? 'bg-ok' : 'bg-warn'}"
					title={selfHealth === 'ok'
						? 'Collector healthy · reported within 5 minutes'
						: 'Collector not responding · no health check in over 5 minutes'}
				></span>
				<span class="font-mono text-[12px] font-medium text-ink">{ctx.server || '—'}</span>
				<ChevronDownIcon class="size-[13px] text-ink/45" />
			</button>
			<button
				type="button"
				onclick={() => dbSwitch && toggle('db')}
				disabled={!dbSwitch}
				title={dbSwitch ? 'Select database' : 'Logs are server-wide — the database filter does not apply here'}
				class="flex items-center gap-[8px] px-[12px] py-[7px] {dbSwitch
					? 'cursor-pointer hover:bg-ink/4'
					: 'cursor-not-allowed opacity-40'}"
			>
				<DatabaseIcon class="size-[13px] flex-none text-steel" />
				<span class="font-mono text-[12px] font-medium text-ink">{ctx.db || '—'}</span>
				<ChevronDownIcon class="size-[13px] text-ink/45" />
			</button>

			{#if open === 'server'}
				<div
					class="absolute top-[calc(100%+6px)] left-0 z-[2] min-w-[210px] border border-ink/20 bg-card p-[5px] shadow-[0_8px_24px_rgba(58,42,31,0.18)]"
				>
					<div
						class="px-[9px] pt-[6px] pb-[4px] font-condensed text-[10px] font-semibold tracking-[1px] text-ink/50 uppercase"
					>
						Postgres server
					</div>
					{#each serversState.names as s (s)}
						<button
							type="button"
							onclick={() => selectServer(s)}
							class="flex w-full cursor-pointer items-center gap-[9px] px-[10px] py-[8px] font-mono text-[12px] text-ink hover:bg-ink/5 {ctx.server ===
							s
								? 'font-semibold'
								: ''}"
						>
							<span class="h-[7px] w-[7px] rounded-full {healthClass(s)}"></span>
							<span class="flex-1 text-left">{s}</span>
							{#if ctx.server === s}<CheckIcon class="size-[14px] text-command" />{/if}
						</button>
					{:else}
						<div class="px-[10px] py-[8px] font-mono text-[12px] text-ink/45">No servers</div>
					{/each}
				</div>
			{/if}

			{#if open === 'db'}
				<div
					class="absolute top-[calc(100%+6px)] right-0 z-[2] min-w-[190px] border border-ink/20 bg-card p-[5px] shadow-[0_8px_24px_rgba(58,42,31,0.18)]"
				>
					<div
						class="px-[9px] pt-[6px] pb-[4px] font-condensed text-[10px] font-semibold tracking-[1px] text-ink/50 uppercase"
					>
						Database
					</div>
					{#each serversState.databasesFor(ctx.server) as d (d)}
						<button
							type="button"
							onclick={() => selectDb(d)}
							class="flex w-full cursor-pointer items-center gap-[9px] px-[10px] py-[8px] font-mono text-[12px] text-ink hover:bg-ink/5 {ctx.db ===
							d
								? 'font-semibold'
								: ''}"
						>
							<span class="flex-1 text-left">{d}</span>
							{#if ctx.db === d}<CheckIcon class="size-[14px] text-command" />{/if}
						</button>
					{:else}
						<div class="px-[10px] py-[8px] font-mono text-[12px] text-ink/45">No databases</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="relative z-[2]">
			<button
				type="button"
				onclick={() => toggle('time')}
				class="flex cursor-pointer items-center gap-[8px] border border-ink/18 bg-card px-[12px] py-[7px] hover:bg-ink/4"
			>
				<ClockIcon class="size-[13px] flex-none text-warn" />
				<span class="font-mono text-[12px] font-medium whitespace-nowrap text-ink">{ctx.timeLabel}</span>
				<ChevronDownIcon class="size-[13px] text-ink/45" />
			</button>

			{#if open === 'time'}
				<div
					class="absolute top-[calc(100%+6px)] right-0 z-[2] flex border border-ink/20 bg-card shadow-[0_10px_28px_rgba(58,42,31,0.2)]"
				>
					<div class="min-w-[172px] border-r border-ink/12 px-[8px] py-[14px]">
						<div
							class="mb-[10px] px-[9px] font-condensed text-[10px] font-semibold tracking-[1px] text-ink/50 uppercase"
						>
							Quick ranges
						</div>
						{#each presets as { key, label } (key)}
							<button
								type="button"
								onclick={() => selectPreset(key)}
								class="block w-full cursor-pointer px-[11px] py-[8px] text-left font-sans text-[12.5px] whitespace-nowrap hover:bg-ink/5 {ctx.range ===
								key
									? 'bg-command/8 font-semibold text-command'
									: 'text-ink'}"
							>
								{label}
							</button>
						{/each}
					</div>
					<div class="w-[268px] px-[16px] py-[14px]">
						<div class="mb-[10px] font-condensed text-[10px] font-semibold tracking-[1px] text-ink/50 uppercase">
							Absolute time range
						</div>
						<label class="mb-[4px] block font-sans text-[11px] text-ink/65" for="ctx-from">From</label>
						<input
							id="ctx-from"
							type="text"
							bind:value={ctx.customFrom}
							placeholder="YYYY-MM-DD HH:MM:SS"
							spellcheck="false"
							class="mb-[11px] w-full border border-ink/22 bg-paper px-[9px] py-[7px] font-mono text-[12px] text-ink"
						/>
						<label class="mb-[4px] block font-sans text-[11px] text-ink/65" for="ctx-to">To</label>
						<input
							id="ctx-to"
							type="text"
							bind:value={ctx.customTo}
							placeholder="YYYY-MM-DD HH:MM:SS"
							spellcheck="false"
							class="mb-[14px] w-full border border-ink/22 bg-paper px-[9px] py-[7px] font-mono text-[12px] text-ink"
						/>
						<button
							type="button"
							onclick={applyCustom}
							class="w-full cursor-pointer bg-command px-[9px] py-[9px] text-center font-condensed text-[13px] font-semibold tracking-[0.6px] text-paper uppercase hover:bg-danger"
						>
							Apply range
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
