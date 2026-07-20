<script lang="ts">
	import { onMount } from 'svelte';
	import { LinkIcon, InfoIcon, XIcon } from '@lucide/svelte';
	import Alert from '$lib/components/Alert.svelte';
	import FormLabel from '$lib/components/FormLabel.svelte';
	import { AlertLevel } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/alert_pb';
	import type { ServerAlertSettings, AlertSetting } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/alert_pb';
	import { alertClient } from '$lib/connect';
	import StateBlock from '$lib/components/StateBlock.svelte';
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
</script>

<PageBar />

<div class="mx-auto w-full max-w-[68.75rem] min-w-0 px-7 pt-7 pb-16">
	{#if error && servers.length > 0}
		<Alert message={error} class="mb-5 px-3.5 py-2.5" />
	{/if}

	{#if loading}
		<StateBlock class="px-11 py-7" message="Loading…" />
	{:else if error && servers.length === 0}
		<StateBlock kind="error" class="px-11 py-7" message={error} />
	{:else if servers.length === 0}
		<StateBlock class="border border-line-card bg-card px-11 py-11" message="No servers to configure yet" />
	{:else}
		<div class="flex flex-col gap-6">
			{#each servers as s (s.serverName)}
				<div class="border border-line-card bg-card">
					<div class="border-b border-line px-5 py-3.5">
						<span class="font-mono text-lg font-semibold text-ink">{s.serverName}</span>
					</div>

					<div class="border-b border-line-soft px-5 py-4">
						<FormLabel for={`wh-${s.serverName}`}>Slack webhook URL</FormLabel>
						<div class="flex items-stretch gap-2.5">
							<div
								class="flex min-w-0 flex-1 items-center gap-2.5 border border-line-strong bg-paper px-3.5 focus-within:border-command"
							>
								<LinkIcon class="size-4 shrink-0 text-ink/55" />
								<input
									id={`wh-${s.serverName}`}
									type="text"
									spellcheck="false"
									placeholder="https://hooks.slack.com/services/T…/B…/…"
									bind:value={drafts[s.serverName]}
									class="h-[2.625rem] min-w-0 flex-1 border-none bg-transparent font-mono text-sm text-ink outline-none"
								/>
								{#if (drafts[s.serverName] ?? '') !== ''}
									<button
										type="button"
										aria-label="Remove webhook"
										title="Remove webhook"
										onclick={() => clearWebhook(s)}
										class="shrink-0 cursor-pointer text-ink/55 hover:text-danger"
									>
										<XIcon class="size-3.5" />
									</button>
								{/if}
							</div>
							<button
								type="button"
								onclick={() => saveWebhook(s)}
								disabled={!isDirty(s)}
								class="h-[2.625rem] shrink-0 border px-5 font-condensed text-sm font-bold tracking-[0.8px] uppercase {isDirty(
									s
								)
									? 'cursor-pointer border-command bg-command text-paper hover:bg-danger'
									: 'cursor-default border-line-soft bg-hover-strong text-ink/38'}"
							>
								Save
							</button>
						</div>
						{#if s.slackWebhookUrl.trim() === ''}
							<div class="mt-3 flex items-center gap-2 font-sans text-sm text-ink/50">
								<InfoIcon class="size-3.5 shrink-0" />
								<span>Add a webhook URL to configure alerts for this server.</span>
							</div>
						{/if}
					</div>

					{#if s.slackWebhookUrl.trim() !== ''}
						<div>
							{#each s.alerts as alert (alert.key)}
								<div class="flex items-center gap-3.5 border-b border-line-soft px-5 py-3.5 last:border-b-0">
									<span
										class="inline-flex w-[4.625rem] shrink-0 items-center justify-center border px-1.5 py-1 font-condensed text-2xs font-bold tracking-[0.7px] uppercase {sev[
											alert.level
										].chip}"
									>
										{sev[alert.level].label}
									</span>
									<div class="min-w-0 flex-1">
										<span class="group relative inline-flex items-center gap-2">
											<span class="font-sans text-lg font-semibold text-ink">{alert.title}</span>
											<span class="inline-flex shrink-0 text-ink/32 transition-colors group-hover:text-command">
												<InfoIcon class="size-4" />
											</span>
											<span
												role="tooltip"
												class="pointer-events-none invisible absolute bottom-[calc(100%+9px)] left-[-8px] z-40 w-[15.75rem] translate-y-[3px] bg-ink px-3 py-2.5 font-sans text-sm leading-[1.5] text-paper opacity-0 shadow-[0_8px_22px_rgba(58,42,31,0.3)] transition duration-[130ms] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
											>
												{alert.description}
												<span class="absolute top-full left-5 h-0 w-0 border-[6px] border-transparent border-t-ink"
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
										class="relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors {alert.enabled
											? 'bg-command'
											: 'bg-ink/22'}"
									>
										<span
											class="absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-[0_1px_2px_rgba(58,42,31,0.3)] transition-[left] {alert.enabled
												? 'left-5'
												: 'left-0.5'}"
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
