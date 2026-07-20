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
		'border-b border-line px-5 py-3 text-left font-condensed text-xs font-semibold tracking-[0.7px] whitespace-nowrap text-ink/55 uppercase';
	const allChip =
		'inline-block border border-accent-line bg-accent px-2 py-0.5 font-condensed text-2xs font-bold tracking-[0.5px] whitespace-nowrap text-command uppercase';
	const serverChip =
		'inline-block border border-steel/28 bg-steel/10 px-2 py-0.5 font-mono text-xs whitespace-nowrap text-steel';
</script>

<PageBar>
	{#snippet actions()}
		<button
			type="button"
			onclick={openCreate}
			class="flex cursor-pointer items-center gap-2 bg-command px-3.5 py-2 font-condensed text-sm font-bold tracking-[0.8px] whitespace-nowrap text-paper uppercase hover:bg-danger"
		>
			<PlusIcon class="size-3.5 stroke-[2.4]" />
			<span>New User</span>
		</button>
	{/snippet}
</PageBar>

<div class="mx-auto w-full max-w-[82.5rem] min-w-0 px-7 pt-7 pb-16">
	<div class="border border-line-card bg-card">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[53.75rem] border-collapse font-sans">
				<thead>
					<tr class="bg-hover-soft">
						<th class="{th} w-[11.875rem]">Name</th>
						<th class="{th} w-[13.125rem]">Email</th>
						<th class="{th} w-[9.375rem]">Created</th>
						<th class={th}>Permissions</th>
						<th class="{th} w-[9.375rem] text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as u (u.id.toString())}
						<tr class="hover:bg-hover-soft">
							<td
								class="border-b border-line-soft px-5 py-3.5 align-top font-mono text-md font-semibold whitespace-nowrap text-ink"
							>
								{u.name}
							</td>
							<td class="border-b border-line-soft px-5 py-3.5 align-top font-sans text-sm text-ink/78">{u.email}</td>
							<td
								class="border-b border-line-soft px-5 py-3.5 align-top font-mono text-sm whitespace-nowrap text-ink/60"
							>
								{created(u)}
							</td>
							<td class="border-b border-line-soft px-5 py-3.5 align-top">
								<div class="flex flex-wrap gap-1.5">
									{#if u.isSuperAdmin}
										<span class={allChip}>All servers</span>
									{:else if u.allowedServers.length === 0}
										<span class="font-mono text-sm text-ink/40">—</span>
									{:else}
										{#each u.allowedServers as s (s)}
											<span class={serverChip}>{s}</span>
										{/each}
									{/if}
								</div>
							</td>
							<td class="border-b border-line-soft px-5 py-3.5 text-right align-top">
								<div class="inline-flex items-center justify-end gap-4">
									<button
										type="button"
										onclick={() => openEdit(u)}
										class="inline-flex cursor-pointer items-center gap-1.5 font-condensed text-xs font-bold tracking-[0.6px] text-command uppercase hover:text-danger"
									>
										<SquarePenIcon class="size-3.5" />
										<span>Edit</span>
									</button>
									{#if !u.isSuperAdmin}
										<button
											type="button"
											onclick={() => remove(u)}
											class="inline-flex cursor-pointer items-center gap-1.5 font-condensed text-xs font-bold tracking-[0.6px] text-ink/50 uppercase hover:text-danger"
										>
											<Trash2Icon class="size-3.5" />
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
			<div class="px-11 py-7 text-center font-mono text-sm text-ink/45">Loading…</div>
		{:else if error}
			<div class="px-11 py-7 text-center font-mono text-sm text-danger">{error}</div>
		{:else if users.length === 0}
			<div class="px-11 py-11 text-center font-mono text-sm text-ink/45">No users yet</div>
		{/if}
	</div>
</div>

{#if modal !== null}
	<Modal title={modal === 'edit' ? 'Edit User' : 'New User'} onclose={close} maxWidth="520px">
		<div class="p-5">
			<label
				class="mb-1.5 block font-condensed text-2xs font-semibold tracking-[1px] text-ink/55 uppercase"
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
				class="mb-4 h-[2.625rem] w-full border border-line-strong bg-paper px-3.5 font-mono text-md text-ink outline-none focus:border-command"
			/>

			<label
				class="mb-1.5 block font-condensed text-2xs font-semibold tracking-[1px] text-ink/55 uppercase"
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
				class="mb-4 h-[2.625rem] w-full border border-line-strong bg-paper px-3.5 font-mono text-md text-ink outline-none focus:border-command"
			/>

			<label
				class="mb-1.5 block font-condensed text-2xs font-semibold tracking-[1px] text-ink/55 uppercase"
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
				class="mb-5 h-[2.625rem] w-full border border-line-strong bg-paper px-3.5 font-mono text-md text-ink outline-none focus:border-command"
			/>

			{#if editingSuperAdmin}
				<div class="border border-line-card bg-hover-soft px-3.5 py-3 font-sans text-sm text-ink/60">
					The super admin can view every server.
				</div>
			{:else}
				<span class="mb-2 block font-condensed text-2xs font-semibold tracking-[1px] text-ink/55 uppercase">
					Allowed Servers
				</span>
				{#if serverOptions.length === 0}
					<div class="font-mono text-sm text-ink/45">No servers yet — create a collector token first</div>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each serverOptions as name (name)}
							{@const on = umServers.includes(name)}
							<button
								type="button"
								onclick={() => toggleServer(name)}
								class="inline-flex cursor-pointer items-center gap-2 border px-3 py-2 font-mono text-sm select-none {on
									? 'border-command bg-accent font-semibold text-command'
									: 'border-line-strong text-ink/60'}"
							>
								{#if on}<CheckIcon class="size-3.5" />{:else}<PlusIcon class="size-3.5" />{/if}{name}
							</button>
						{/each}
					</div>
				{/if}
			{/if}

			{#if userError}
				<div class="mt-4 flex items-center gap-2 border border-danger/30 bg-danger/8 px-3 py-2.5 text-sm text-danger">
					<CircleAlertIcon class="size-3.5 flex-none" />
					<span>{userError}</span>
				</div>
			{/if}
		</div>
		<div class="flex justify-end gap-2.5 border-t border-line px-5 py-3.5">
			<button
				type="button"
				onclick={close}
				class="cursor-pointer border border-line-strong px-4 py-2.5 font-condensed text-sm font-bold tracking-[0.8px] text-ink/60 uppercase hover:bg-hover"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={save}
				disabled={saving}
				class="cursor-pointer border border-command bg-command px-4 py-2.5 font-condensed text-sm font-bold tracking-[0.8px] text-paper uppercase hover:bg-danger disabled:opacity-70"
			>
				{saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Create User'}
			</button>
		</div>
	</Modal>
{/if}
