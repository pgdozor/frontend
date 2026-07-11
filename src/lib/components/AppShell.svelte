<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate, goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ContextBar from '$lib/components/ContextBar.svelte';
	import { ctx, serversState } from '$lib/state.svelte';
	import { session } from '$lib/session.svelte';

	type Props = {
		children: Snippet;
		contextBar?: boolean;
		/** LOGS disables this because log events are server-wide, not per-database. */
		dbSwitch?: boolean;
		requireSuperAdmin?: boolean;
	};

	let { children, contextBar = true, dbSwitch = true, requireSuperAdmin = false }: Props = $props();

	const REFRESH_MS = 30_000;

	const allowed = $derived(session.isAuthenticated && (!requireSuperAdmin || session.isSuperAdmin));

	// Wait until the session loads, then redirect anyone not allowed here.
	$effect(() => {
		if (!session.loaded) return;
		if (!session.isAuthenticated) goto('/login');
		else if (requireSuperAdmin && !session.isSuperAdmin) goto('/queries');
	});

	$effect(() => {
		if (!contextBar || !allowed) return;
		serversState.load();
		const id = setInterval(() => serversState.load(), REFRESH_MS);
		return () => clearInterval(id);
	});

	let urlSynced = $state(false);
	afterNavigate(() => {
		if (!urlSynced && contextBar) ctx.applyQuery(new URLSearchParams(page.url.search));
		urlSynced = true;
	});

	$effect(() => {
		if (!urlSynced || !contextBar) return;
		const qs = ctx.queryString();
		if (qs !== page.url.search.replace(/^\?/, '')) replaceState(`?${qs}`, page.state);
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
				{@render children()}
			{/if}
		</div>
	</div>
{/if}
