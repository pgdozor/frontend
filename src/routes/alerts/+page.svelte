<script lang="ts">
	import { onMount } from 'svelte';
	import { CircleAlertIcon, LinkIcon, InfoIcon, XIcon } from '@lucide/svelte';
	import { AlertLevel } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/alert_pb';
	import type { ServerAlertSettings, AlertSetting } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/alert_pb';
	import { alertClient } from '$lib/connect';
	import { errMsg } from '$lib/format';
	import PageBar from '$lib/components/PageBar.svelte';

	let servers = $state<ServerAlertSettings[]>([]);
	let drafts = $state<Record<string, string>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await alertClient.queryAlerts({});
			servers = res.servers;
			drafts = Object.fromEntries(res.servers.map((s) => [s.serverName, s.slackWebhookUrl]));
		} catch (e) {
			error = errMsg(e);
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function isDirty(s: ServerAlertSettings): boolean {
		return (drafts[s.serverName] ?? '').trim() !== s.slackWebhookUrl.trim();
	}

	async function persist(
		s: ServerAlertSettings,
		slackWebhookUrl: string,
		toggles: { key: string; enabled: boolean }[]
	) {
		await alertClient.updateAlertSettings({ serverName: s.serverName, slackWebhookUrl, toggles });
	}

	async function saveWebhook(s: ServerAlertSettings) {
		const url = (drafts[s.serverName] ?? '').trim();
		error = null;
		try {
			await persist(s, url, []);
			s.slackWebhookUrl = url;
			drafts[s.serverName] = url;
		} catch (e) {
			error = errMsg(e);
		}
	}

	function clearWebhook(s: ServerAlertSettings) {
		drafts[s.serverName] = '';
	}

	async function toggleAlert(s: ServerAlertSettings, alert: AlertSetting) {
		const next = !alert.enabled;
		alert.enabled = next; // optimistic; reverted on failure
		error = null;
		try {
			await persist(s, s.slackWebhookUrl, [{ key: alert.key, enabled: next }]);
		} catch (e) {
			alert.enabled = !next;
			error = errMsg(e);
		}
	}

	const sev: Record<AlertLevel, { label: string; chip: string }> = {
		[AlertLevel.CRITICAL]: { label: 'Critical', chip: 'border-danger/34 bg-danger/10 text-danger' },
		[AlertLevel.WARNING]: { label: 'Warning', chip: 'border-warn/34 bg-warn/10 text-warn' },
		[AlertLevel.INFO]: { label: 'Info', chip: 'border-steel/34 bg-steel/10 text-steel' },
		[AlertLevel.UNSPECIFIED]: { label: 'Info', chip: 'border-steel/34 bg-steel/10 text-steel' }
	};

	const label = 'mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase';
</script>

<PageBar />

<div class="mx-auto w-full max-w-[1100px] min-w-0 px-[28px] pt-[26px] pb-[60px]">
	{#if error && servers.length > 0}
		<div
			class="mb-[18px] flex items-center gap-[8px] border border-danger/30 bg-danger/8 px-[13px] py-[10px] text-[12.5px] text-danger"
		>
			<CircleAlertIcon class="size-[14px] flex-none" />
			<span>{error}</span>
		</div>
	{/if}

	{#if loading}
		<div class="px-[44px] py-[28px] text-center font-mono text-[12px] text-ink/45">Loading…</div>
	{:else if error && servers.length === 0}
		<div class="px-[44px] py-[28px] text-center font-mono text-[12px] text-danger">{error}</div>
	{:else if servers.length === 0}
		<div class="border border-ink/16 bg-card px-[44px] py-[44px] text-center font-mono text-[12px] text-ink/45">
			No servers to configure yet
		</div>
	{:else}
		<div class="flex flex-col gap-[22px]">
			{#each servers as s (s.serverName)}
				<div class="border border-ink/16 bg-card">
					<div class="border-b border-ink/12 px-[20px] py-[14px]">
						<span class="font-mono text-[14px] font-semibold text-ink">{s.serverName}</span>
					</div>

					<div class="border-b border-ink/10 px-[20px] py-[16px]">
						<label class={label} for={`wh-${s.serverName}`}>Slack webhook URL</label>
						<div class="flex items-stretch gap-[10px]">
							<div
								class="flex min-w-0 flex-1 items-center gap-[10px] border border-ink/20 bg-paper px-[13px] focus-within:border-command"
							>
								<LinkIcon class="size-[15px] shrink-0 text-ink/45" />
								<input
									id={`wh-${s.serverName}`}
									type="text"
									spellcheck="false"
									placeholder="https://hooks.slack.com/services/T…/B…/…"
									bind:value={drafts[s.serverName]}
									class="h-[42px] min-w-0 flex-1 border-none bg-transparent font-mono text-[12.5px] text-ink outline-none"
								/>
								{#if (drafts[s.serverName] ?? '') !== ''}
									<button
										type="button"
										aria-label="Remove webhook"
										title="Remove webhook"
										onclick={() => clearWebhook(s)}
										class="shrink-0 cursor-pointer text-ink/40 hover:text-danger"
									>
										<XIcon class="size-[13px]" />
									</button>
								{/if}
							</div>
							<button
								type="button"
								onclick={() => saveWebhook(s)}
								disabled={!isDirty(s)}
								class="h-[42px] shrink-0 border px-[18px] font-condensed text-[12px] font-bold tracking-[0.8px] uppercase {isDirty(
									s
								)
									? 'cursor-pointer border-command bg-command text-paper hover:bg-danger'
									: 'cursor-default border-ink/10 bg-ink/10 text-ink/38'}"
							>
								Save
							</button>
						</div>
						{#if s.slackWebhookUrl.trim() === ''}
							<div class="mt-[11px] flex items-center gap-[8px] font-sans text-[12.5px] text-ink/50">
								<InfoIcon class="size-[14px] shrink-0" />
								<span>Add a webhook URL to configure alerts for this server.</span>
							</div>
						{/if}
					</div>

					{#if s.slackWebhookUrl.trim() !== ''}
						<div>
							{#each s.alerts as alert (alert.key)}
								<div class="flex items-center gap-[14px] border-b border-ink/8 px-[20px] py-[13px] last:border-b-0">
									<span
										class="inline-flex w-[74px] shrink-0 items-center justify-center border px-[6px] py-[4px] font-condensed text-[10px] font-bold tracking-[0.7px] uppercase {sev[
											alert.level
										].chip}"
									>
										{sev[alert.level].label}
									</span>
									<div class="min-w-0 flex-1">
										<span class="group relative inline-flex items-center gap-[7px]">
											<span class="font-sans text-[14px] font-semibold text-ink">{alert.title}</span>
											<span class="inline-flex shrink-0 text-ink/32 transition-colors group-hover:text-command">
												<InfoIcon class="size-[15px]" />
											</span>
											<span
												role="tooltip"
												class="pointer-events-none invisible absolute bottom-[calc(100%+9px)] left-[-8px] z-40 w-[252px] translate-y-[3px] bg-ink px-[12px] py-[9px] font-sans text-[12px] leading-[1.5] text-paper opacity-0 shadow-[0_8px_22px_rgba(58,42,31,0.3)] transition duration-[130ms] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
											>
												{alert.description}
												<span class="absolute top-full left-[18px] h-0 w-0 border-[6px] border-transparent border-t-ink"
												></span>
											</span>
										</span>
									</div>
									<button
										type="button"
										role="switch"
										aria-checked={alert.enabled}
										aria-label={`Toggle ${alert.title}`}
										onclick={() => toggleAlert(s, alert)}
										class="relative h-[23px] w-[40px] shrink-0 cursor-pointer rounded-full transition-colors {alert.enabled
											? 'bg-command'
											: 'bg-ink/22'}"
									>
										<span
											class="absolute top-[2px] h-[19px] w-[19px] rounded-full bg-card shadow-[0_1px_2px_rgba(58,42,31,0.3)] transition-[left] {alert.enabled
												? 'left-[19px]'
												: 'left-[2px]'}"
										></span>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
