<script lang="ts">
	import { onMount } from 'svelte';
	import { PlusIcon, SquarePenIcon, Trash2Icon, CircleAlertIcon, CheckIcon } from '@lucide/svelte';
	import { timestampDate } from '@bufbuild/protobuf/wkt';
	import type { User } from '@buf/pgdozor_backend.bufbuild_es/pgdozor/v1/auth_pb';
	import { adminClient } from '$lib/connect';
	import { errMsg, fmtDateTime } from '$lib/format';
	import Modal from '$lib/components/Modal.svelte';
	import PageBar from '$lib/components/PageBar.svelte';

	let users = $state<User[]>([]);
	let serverOptions = $state<string[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let modal = $state<'create' | 'edit' | null>(null);
	let editingId = $state<bigint | null>(null);
	let editingSuperAdmin = $state(false);
	let umName = $state('');
	let umEmail = $state('');
	let umPassword = $state('');
	let umServers = $state<string[]>([]);
	let userError = $state<string | null>(null);
	let saving = $state(false);

	async function load() {
		loading = true;
		error = null;
		try {
			const [usersRes, tokensRes] = await Promise.all([adminClient.listUsers({}), adminClient.listCollectorTokens({})]);
			users = usersRes.users;
			serverOptions = [...new Set(tokensRes.tokens.map((t) => t.serverName))].sort((a, b) => a.localeCompare(b));
		} catch (e) {
			error = errMsg(e);
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function created(u: User): string {
		return u.createdAt ? fmtDateTime(timestampDate(u.createdAt)) : '—';
	}

	function openCreate() {
		editingId = null;
		editingSuperAdmin = false;
		umName = '';
		umEmail = '';
		umPassword = '';
		umServers = [];
		userError = null;
		modal = 'create';
	}

	function openEdit(u: User) {
		editingId = u.id;
		editingSuperAdmin = u.isSuperAdmin;
		umName = u.name;
		umEmail = u.email;
		umPassword = '';
		umServers = [...u.allowedServers];
		userError = null;
		modal = 'edit';
	}

	function close() {
		modal = null;
		umPassword = '';
	}

	function toggleServer(name: string) {
		umServers = umServers.includes(name) ? umServers.filter((s) => s !== name) : [...umServers, name];
	}

	async function save() {
		const name = umName.trim();
		const email = umEmail.trim();
		if (!name || !email) {
			userError = 'Name and email are required.';
			return;
		}
		if (modal === 'create' && !umPassword) {
			userError = 'Set a password.';
			return;
		}
		if (saving) return;
		saving = true;
		userError = null;
		try {
			if (modal === 'edit' && editingId !== null) {
				await adminClient.updateUser({ id: editingId, name, email, password: umPassword, allowedServers: umServers });
			} else {
				await adminClient.createUser({ name, email, password: umPassword, allowedServers: umServers });
			}
			close();
			await load();
		} catch (e) {
			userError = errMsg(e).replace(/^\[[a-z_]+\]\s*/, '');
		} finally {
			saving = false;
		}
	}

	async function remove(u: User) {
		if (!confirm(`Delete user "${u.name}" (${u.email})?`)) return;
		try {
			await adminClient.deleteUser({ id: u.id });
			await load();
		} catch (e) {
			error = errMsg(e);
		}
	}

	const th =
		'border-b border-ink/14 px-[20px] py-[11px] text-left font-condensed text-[11px] font-semibold tracking-[0.7px] whitespace-nowrap text-ink/55 uppercase';
	const allChip =
		'inline-block border border-command/40 bg-command/10 px-[8px] py-[2px] font-condensed text-[10.5px] font-bold tracking-[0.5px] whitespace-nowrap text-command uppercase';
	const serverChip =
		'inline-block border border-steel/28 bg-steel/10 px-[7px] py-[2px] font-mono text-[11px] whitespace-nowrap text-steel';
</script>

<PageBar>
	{#snippet actions()}
		<button
			type="button"
			onclick={openCreate}
			class="flex cursor-pointer items-center gap-[8px] bg-command px-[14px] py-[8px] font-condensed text-[12px] font-bold tracking-[0.8px] whitespace-nowrap text-paper uppercase hover:bg-danger"
		>
			<PlusIcon class="size-[14px] stroke-[2.4]" />
			<span>New User</span>
		</button>
	{/snippet}
</PageBar>

<div class="mx-auto w-full max-w-[1320px] min-w-0 px-[28px] pt-[26px] pb-[60px]">
	<div class="border border-ink/16 bg-card">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[860px] border-collapse font-sans">
				<thead>
					<tr class="bg-ink/4">
						<th class="{th} w-[190px]">Name</th>
						<th class="{th} w-[210px]">Email</th>
						<th class="{th} w-[150px]">Created</th>
						<th class={th}>Permissions</th>
						<th class="{th} w-[150px] text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as u (u.id.toString())}
						<tr class="hover:bg-ink/3">
							<td
								class="border-b border-ink/8 px-[20px] py-[13px] align-top font-mono text-[13px] font-semibold whitespace-nowrap text-ink"
							>
								{u.name}
							</td>
							<td class="border-b border-ink/8 px-[20px] py-[13px] align-top font-sans text-[12.5px] text-ink/78"
								>{u.email}</td
							>
							<td
								class="border-b border-ink/8 px-[20px] py-[13px] align-top font-mono text-[12.5px] whitespace-nowrap text-ink/60"
							>
								{created(u)}
							</td>
							<td class="border-b border-ink/8 px-[20px] py-[13px] align-top">
								<div class="flex flex-wrap gap-[5px]">
									{#if u.isSuperAdmin}
										<span class={allChip}>All servers</span>
									{:else if u.allowedServers.length === 0}
										<span class="font-mono text-[12px] text-ink/40">—</span>
									{:else}
										{#each u.allowedServers as s (s)}
											<span class={serverChip}>{s}</span>
										{/each}
									{/if}
								</div>
							</td>
							<td class="border-b border-ink/8 px-[20px] py-[13px] text-right align-top">
								<div class="inline-flex items-center justify-end gap-[16px]">
									<button
										type="button"
										onclick={() => openEdit(u)}
										class="inline-flex cursor-pointer items-center gap-[6px] font-condensed text-[11px] font-bold tracking-[0.6px] text-command uppercase hover:text-danger"
									>
										<SquarePenIcon class="size-[13px]" />
										<span>Edit</span>
									</button>
									{#if !u.isSuperAdmin}
										<button
											type="button"
											onclick={() => remove(u)}
											class="inline-flex cursor-pointer items-center gap-[6px] font-condensed text-[11px] font-bold tracking-[0.6px] text-ink/50 uppercase hover:text-danger"
										>
											<Trash2Icon class="size-[13px]" />
											<span>Delete</span>
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if loading}
			<div class="px-[44px] py-[28px] text-center font-mono text-[12px] text-ink/45">Loading…</div>
		{:else if error}
			<div class="px-[44px] py-[28px] text-center font-mono text-[12px] text-danger">{error}</div>
		{:else if users.length === 0}
			<div class="px-[44px] py-[44px] text-center font-mono text-[12px] text-ink/45">No users yet</div>
		{/if}
	</div>
</div>

{#if modal !== null}
	<Modal title={modal === 'edit' ? 'Edit User' : 'New User'} onclose={close} maxWidth="520px">
		<div class="p-[20px]">
			<label
				class="mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase"
				for="um-name"
			>
				Name
			</label>
			<input
				id="um-name"
				type="text"
				bind:value={umName}
				placeholder="Jane Doe"
				spellcheck="false"
				class="mb-[15px] h-[42px] w-full border border-ink/22 bg-paper px-[13px] font-mono text-[13.5px] text-ink outline-none focus:border-command"
			/>

			<label
				class="mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase"
				for="um-email"
			>
				Email
			</label>
			<input
				id="um-email"
				type="email"
				bind:value={umEmail}
				placeholder="jdoe@company.com"
				spellcheck="false"
				class="mb-[15px] h-[42px] w-full border border-ink/22 bg-paper px-[13px] font-mono text-[13.5px] text-ink outline-none focus:border-command"
			/>

			<label
				class="mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase"
				for="um-password"
			>
				Password
			</label>
			<input
				id="um-password"
				type="password"
				bind:value={umPassword}
				placeholder={modal === 'edit' ? 'Leave blank to keep current' : 'Set a password'}
				autocomplete="new-password"
				class="mb-[18px] h-[42px] w-full border border-ink/22 bg-paper px-[13px] font-mono text-[13.5px] text-ink outline-none focus:border-command"
			/>

			{#if editingSuperAdmin}
				<div class="border border-ink/16 bg-ink/4 px-[13px] py-[11px] font-sans text-[12.5px] text-ink/60">
					The super admin can view every server.
				</div>
			{:else}
				<span class="mb-[8px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase">
					Allowed Servers
				</span>
				{#if serverOptions.length === 0}
					<div class="font-mono text-[12px] text-ink/45">No servers yet — create a collector token first</div>
				{:else}
					<div class="flex flex-wrap gap-[8px]">
						{#each serverOptions as name (name)}
							{@const on = umServers.includes(name)}
							<button
								type="button"
								onclick={() => toggleServer(name)}
								class="inline-flex cursor-pointer items-center gap-[7px] border px-[11px] py-[7px] font-mono text-[12px] select-none {on
									? 'border-command bg-command/10 font-semibold text-command'
									: 'border-ink/22 text-ink/60'}"
							>
								{#if on}<CheckIcon class="size-[13px]" />{:else}<PlusIcon class="size-[13px]" />{/if}{name}
							</button>
						{/each}
					</div>
				{/if}
			{/if}

			{#if userError}
				<div
					class="mt-[16px] flex items-center gap-[8px] border border-danger/30 bg-danger/8 px-[12px] py-[9px] text-[12.5px] text-danger"
				>
					<CircleAlertIcon class="size-[14px] flex-none" />
					<span>{userError}</span>
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
				onclick={save}
				disabled={saving}
				class="cursor-pointer border border-command bg-command px-[16px] py-[9px] font-condensed text-[12.5px] font-bold tracking-[0.8px] text-paper uppercase hover:bg-danger disabled:opacity-70"
			>
				{saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Create User'}
			</button>
		</div>
	</Modal>
{/if}
