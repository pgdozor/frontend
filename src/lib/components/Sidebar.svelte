<script lang="ts">
	import { clsx } from 'clsx';
	import { LogOutIcon, XIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
	import { navItems, adminItems, isNavActive } from '$lib/nav';
	import { session } from '$lib/session.svelte';
	import { sidebar } from '$lib/sidebar.svelte';
	import PgdozorMark from '$lib/icons/PgdozorMark.svelte';

	const visibleNav = $derived(session.isSuperAdmin ? navItems : navItems.filter((i) => i.key === 'slow-queries'));

	const navClass = (active: boolean): string =>
		clsx(
			'flex flex-col gap-[2px] border-l-[3px] py-[9px] pr-[12px] pl-[13px] transition-colors',
			active ? 'border-command bg-command/10 text-ink' : 'border-transparent text-ink/55 hover:bg-ink/4'
		);

	afterNavigate(() => sidebar.closeDrawer());

	async function handleLogout() {
		await session.logout();
		goto('/login');
	}
</script>

{#if sidebar.drawerOpen}
	<button
		type="button"
		aria-label="Close navigation"
		onclick={() => sidebar.closeDrawer()}
		class="fixed inset-0 z-40 cursor-default bg-ink/40 md:hidden"
	></button>
{/if}

<aside
	class="fixed inset-y-0 left-0 z-50 flex h-screen w-[250px] flex-none flex-col border-r border-ink/14 bg-shell transition-transform duration-200 motion-reduce:transition-none md:sticky md:top-0 md:z-auto md:translate-x-0 md:shadow-none md:transition-none {sidebar.drawerOpen
		? 'translate-x-0 shadow-[0_0_40px_rgba(58,42,31,0.28)]'
		: '-translate-x-full'} {sidebar.collapsed ? 'md:hidden' : 'md:flex'}"
>
	<div class="flex items-center gap-[11px] border-b border-ink/14 px-[18px] py-[20px]">
		<PgdozorMark class="size-[30px] flex-none text-command" />
		<span class="font-condensed text-[20px] font-bold tracking-[2.5px] text-ink">PGDOZOR</span>
		<button
			type="button"
			aria-label="Close navigation"
			onclick={() => sidebar.closeDrawer()}
			class="ml-auto flex size-[30px] flex-none cursor-pointer items-center justify-center text-ink/50 hover:text-command md:hidden"
		>
			<XIcon class="size-[19px]" />
		</button>
	</div>

	<nav class="flex flex-col gap-[2px] px-[8px] py-[10px]">
		{#each visibleNav as item (item.key)}
			<a href={item.href} title={item.label} class={navClass(isNavActive(item, page.url.pathname))}>
				<span class="font-condensed text-[14px] font-semibold tracking-[0.4px] uppercase">{item.label}</span>
			</a>
		{/each}
	</nav>

	{#if session.isSuperAdmin}
		<div class="mt-auto border-t border-ink/14 px-[8px] pt-[8px] pb-[4px]">
			<div
				class="px-[13px] pt-[8px] pb-[7px] font-condensed text-[10px] font-bold tracking-[1.4px] text-ink/40 uppercase"
			>
				Admin
			</div>
			<div class="flex flex-col gap-[2px]">
				{#each adminItems as item (item.key)}
					<a href={item.href} title={item.label} class={navClass(isNavActive(item, page.url.pathname))}>
						<span class="font-condensed text-[14px] font-semibold tracking-[0.4px] uppercase">{item.label}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<div class="{session.isSuperAdmin ? '' : 'mt-auto'} border-t border-ink/14 p-[14px]">
		<div class="flex items-center gap-[11px] px-[10px] py-[8px] hover:bg-ink/4">
			<span
				class="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-command font-condensed text-[16px] font-bold text-paper"
				>{session.displayName.charAt(0).toUpperCase()}</span
			>
			<span class="min-w-0 flex-1 truncate font-sans text-[13.5px] font-semibold text-ink">{session.displayName}</span>
			<button
				type="button"
				title="Sign out"
				onclick={handleLogout}
				class="flex h-[28px] w-[28px] flex-none cursor-pointer items-center justify-center text-ink/50 hover:text-danger"
			>
				<LogOutIcon class="size-[17px]" />
			</button>
		</div>
	</div>
</aside>
