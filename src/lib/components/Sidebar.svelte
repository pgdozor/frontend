<script lang="ts">
	import { LogOutIcon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { navItems, adminItems, isNavActive } from '$lib/nav';
	import { session } from '$lib/session.svelte';
	import PgdozorMark from '$lib/icons/PgdozorMark.svelte';

	const navClass = (active: boolean): string =>
		`flex flex-col gap-[2px] border-l-[3px] py-[9px] pr-[12px] pl-[13px] transition-colors ${
			active ? 'border-command bg-command/10 text-ink' : 'border-transparent text-ink/55 hover:bg-ink/4'
		}`;

	async function handleLogout() {
		await session.logout();
		goto('/login');
	}
</script>

<aside class="sticky top-0 hidden h-screen w-[250px] flex-none flex-col border-r border-ink/14 bg-shell md:flex">
	<div class="flex items-center gap-[11px] border-b border-ink/14 px-[18px] py-[20px]">
		<PgdozorMark class="size-[30px] flex-none text-command" />
		<span class="font-condensed text-[20px] font-bold tracking-[2.5px] text-ink">PGDOZOR</span>
	</div>

	<nav class="flex flex-col gap-[2px] px-[8px] py-[10px]">
		{#each navItems as item (item.key)}
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
