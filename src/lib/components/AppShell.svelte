<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ContextBar from '$lib/components/ContextBar.svelte';
	import { serversState } from '$lib/state.svelte';
	import { session } from '$lib/session.svelte';

	type Props = {
		children: Snippet;
		/** Show the server/database/time selector bar (monitoring screens only). */
		contextBar?: boolean;
		/** Enable the database selector in the context bar. LOGS disables it
		 *  because log events are server-wide, not scoped to one database. */
		dbSwitch?: boolean;
		/** Restrict the section to the super admin (the ADMIN pages). */
		requireSuperAdmin?: boolean;
	};

	let { children, contextBar = true, dbSwitch = true, requireSuperAdmin = false }: Props = $props();

	const REFRESH_MS = 30_000;

	const allowed = $derived(session.isAuthenticated && (!requireSuperAdmin || session.isSuperAdmin));

	// Once the session state is known, bounce anyone who may not be here.
	$effect(() => {
		if (!session.loaded) return;
		if (!session.isAuthenticated) goto('/login');
		else if (requireSuperAdmin && !session.isSuperAdmin) goto('/queries');
	});

	// Poll monitored servers for the context bar while allowed in.
	$effect(() => {
		if (!contextBar || !allowed) return;
		serversState.load();
		const id = setInterval(() => serversState.load(), REFRESH_MS);
		return () => clearInterval(id);
	});
</script>

{#if allowed}
	<div class="flex min-h-screen flex-row bg-paper text-ink">
		<Sidebar />
		<div class="flex min-w-0 flex-1 flex-col">
			{#if contextBar}
				<ContextBar {dbSwitch} />
				<div class="mx-auto w-full max-w-[1320px] min-w-0 flex-1 px-[28px] pt-[26px] pb-[60px]">
					{@render children()}
				</div>
			{:else}
				<!-- Admin sections render their own PageBar (full-width sticky bar) + content. -->
				{@render children()}
			{/if}
		</div>
	</div>
{/if}
