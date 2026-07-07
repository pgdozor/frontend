<script lang="ts">
	import { onMount } from 'svelte';
	import { PlusIcon, Trash2Icon, CircleAlertIcon, TriangleAlertIcon, CopyIcon } from '@lucide/svelte';
	import { timestampDate } from '@bufbuild/protobuf/wkt';
	import type { CollectorToken } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/admin_pb';
	import { adminClient } from '$lib/connect';
	import { errMsg, fmtDateTime } from '$lib/format';
	import Modal from '$lib/components/Modal.svelte';
	import PageBar from '$lib/components/PageBar.svelte';

	let tokens = $state<CollectorToken[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let modal = $state<'form' | 'reveal' | null>(null);
	let serverName = $state('');
	let formError = $state<string | null>(null);
	let creating = $state(false);
	let newToken = $state('');
	let newTokenServer = $state('');
	let copied = $state(false);

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await adminClient.listCollectorTokens({});
			tokens = res.tokens;
		} catch (e) {
			error = errMsg(e);
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function created(t: CollectorToken): string {
		return t.createdAt ? fmtDateTime(timestampDate(t.createdAt)) : '—';
	}

	function openForm() {
		serverName = '';
		formError = null;
		modal = 'form';
	}

	function close() {
		modal = null;
	}

	async function create() {
		const name = serverName.trim();
		if (!name) {
			formError = 'Enter a Postgres server name.';
			return;
		}
		if (creating) return;
		creating = true;
		formError = null;
		try {
			const res = await adminClient.createCollectorToken({ serverName: name });
			newToken = res.tokenValue;
			newTokenServer = res.token?.serverName ?? name;
			copied = false;
			modal = 'reveal';
			await load();
		} catch (e) {
			formError = errMsg(e).replace(/^\[[a-z_]+\]\s*/, '');
		} finally {
			creating = false;
		}
	}

	async function copyToken() {
		try {
			await navigator.clipboard.writeText(newToken);
			copied = true;
		} catch {
			// Clipboard may be unavailable; the token stays visible to copy manually.
		}
	}

	async function remove(token: CollectorToken) {
		if (!confirm(`Delete the collector token for "${token.serverName}"? That collector will stop reporting.`)) return;
		try {
			await adminClient.deleteCollectorToken({ id: token.id });
			await load();
		} catch (e) {
			error = errMsg(e);
		}
	}

	const th =
		'border-b border-ink/14 px-[20px] py-[11px] font-condensed text-[11px] font-semibold tracking-[0.7px] whitespace-nowrap text-ink/55 uppercase';
</script>

<PageBar title="Collectors">
	{#snippet actions()}
		<button
			type="button"
			onclick={openForm}
			class="flex cursor-pointer items-center gap-[8px] bg-command px-[14px] py-[8px] font-condensed text-[12px] font-bold tracking-[0.8px] whitespace-nowrap text-paper uppercase hover:bg-danger"
		>
			<PlusIcon class="size-[14px] stroke-[2.4]" />
			<span>New Token</span>
		</button>
	{/snippet}
</PageBar>

<div class="mx-auto w-full max-w-[1320px] min-w-0 px-[28px] pt-[26px] pb-[60px]">
	<div class="border border-ink/16 bg-card">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[560px] border-collapse font-sans">
				<thead>
					<tr class="bg-ink/4">
						<th class="{th} text-left">Postgres Server</th>
						<th class="{th} text-left">Created</th>
						<th class="{th} w-[120px] text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each tokens as token (token.id.toString())}
						<tr class="hover:bg-ink/3">
							<td class="border-b border-ink/8 px-[20px] py-[13px]">
								<span class="font-mono text-[13px] font-medium text-ink">{token.serverName}</span>
							</td>
							<td
								class="border-b border-ink/8 px-[20px] py-[13px] font-mono text-[12.5px] whitespace-nowrap text-ink/60"
							>
								{created(token)}
							</td>
							<td class="border-b border-ink/8 px-[20px] py-[13px] text-right">
								<button
									type="button"
									onclick={() => remove(token)}
									class="inline-flex cursor-pointer items-center gap-[6px] font-condensed text-[11px] font-bold tracking-[0.6px] text-ink/50 uppercase hover:text-danger"
								>
									<Trash2Icon class="size-[13px]" />
									<span>Delete</span>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if loading}
			<div class="px-[44px] py-[28px] text-center font-mono text-[13px] text-ink/45">Loading…</div>
		{:else if error}
			<div class="px-[44px] py-[28px] text-center font-mono text-[13px] text-danger">{error}</div>
		{:else if tokens.length === 0}
			<div class="px-[44px] py-[44px] text-center font-mono text-[13px] text-ink/45">
				No collector tokens yet. Create one to connect a collector.
			</div>
		{/if}
	</div>
</div>

{#if modal !== null}
	<Modal title={modal === 'reveal' ? 'Token Created' : 'Create Collector Token'} onclose={close}>
		{#if modal === 'form'}
			<div class="p-[20px]">
				<label
					class="mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase"
					for="token-server"
				>
					Postgres Server
				</label>
				<input
					id="token-server"
					type="text"
					bind:value={serverName}
					placeholder="e.g. shdp-prod-5"
					spellcheck="false"
					onkeydown={(e) => e.key === 'Enter' && create()}
					class="h-[42px] w-full border border-ink/22 bg-paper px-[13px] font-mono text-[13.5px] text-ink outline-none focus:border-command"
				/>
				{#if formError}
					<div
						class="mt-[14px] flex items-center gap-[8px] border border-danger/30 bg-danger/8 px-[12px] py-[9px] text-[12.5px] text-danger"
					>
						<CircleAlertIcon class="size-[14px] flex-none" />
						<span>{formError}</span>
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-[10px] border-t border-ink/12 px-[20px] py-[14px]">
				<button
					type="button"
					onclick={close}
					class="cursor-pointer border border-ink/22 px-[16px] py-[9px] font-condensed text-[12.5px] font-bold tracking-[0.8px] text-ink/60 uppercase hover:bg-ink/5"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={create}
					disabled={creating}
					class="cursor-pointer border border-command bg-command px-[16px] py-[9px] font-condensed text-[12.5px] font-bold tracking-[0.8px] text-paper uppercase hover:bg-danger disabled:opacity-70"
				>
					{creating ? 'Creating…' : 'Create Token'}
				</button>
			</div>
		{:else}
			<div class="p-[20px]">
				<div class="mb-[16px] flex items-center gap-[10px] border border-danger/30 bg-danger/8 px-[14px] py-[12px]">
					<TriangleAlertIcon class="size-[16px] flex-none text-danger" />
					<div class="font-condensed text-[12px] font-bold tracking-[0.6px] text-danger uppercase">
						Copy this token now. It will not be shown again.
					</div>
				</div>
				<span class="mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase"
					>Token</span
				>
				<div class="flex items-center gap-[12px] border border-ink/40 bg-ink px-[14px] py-[13px]">
					<code class="min-w-0 flex-1 font-mono text-[13px] leading-[1.5] break-all text-paper">{newToken}</code>
					<button
						type="button"
						onclick={copyToken}
						class="inline-flex flex-none cursor-pointer items-center gap-[6px] bg-command px-[11px] py-[6px] font-condensed text-[11px] font-bold tracking-[0.6px] whitespace-nowrap text-paper uppercase hover:bg-danger"
					>
						<CopyIcon class="size-[12px] stroke-[2.2]" />
						<span>{copied ? 'Copied' : 'Copy'}</span>
					</button>
				</div>
				<div class="mt-[11px] font-sans text-[12px] text-ink/55">
					Server <span class="font-mono text-ink">{newTokenServer}</span>
				</div>
			</div>
			<div class="flex justify-end gap-[10px] border-t border-ink/12 px-[20px] py-[14px]">
				<button
					type="button"
					onclick={close}
					class="cursor-pointer border border-command bg-command px-[16px] py-[9px] font-condensed text-[12.5px] font-bold tracking-[0.8px] text-paper uppercase hover:bg-danger"
				>
					Done
				</button>
			</div>
		{/if}
	</Modal>
{/if}
