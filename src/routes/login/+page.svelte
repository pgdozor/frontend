<script lang="ts">
	import { MailIcon, LockIcon, CircleAlertIcon, ArrowRightIcon } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { session } from '$lib/session.svelte';
	import { errMsg } from '$lib/format';
	import PgdozorMark from '$lib/icons/PgdozorMark.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	$effect(() => {
		if (session.loaded && session.isAuthenticated) goto('/queries');
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting) return;
		error = null;
		submitting = true;
		try {
			await session.login(email.trim(), password);
			goto('/queries');
		} catch (err) {
			// Drop the "[code]" prefix Connect errors carry.
			error = errMsg(err).replace(/^\[[a-z_]+\]\s*/, '');
		} finally {
			submitting = false;
		}
	}

	const fieldClass =
		'flex h-[42px] items-center gap-[10px] border border-ink/20 bg-paper px-[13px] focus-within:border-command';
	const inputClass = 'min-w-0 flex-1 border-none bg-transparent font-mono text-[13.5px] text-ink outline-none';
	const labelClass = 'mb-[6px] block font-condensed text-[10.5px] font-semibold tracking-[1px] text-ink/55 uppercase';
</script>

<div class="flex min-h-screen items-center justify-center bg-paper p-[32px] font-sans">
	<div class="w-full max-w-[404px]">
		<div class="mb-[30px] flex items-center justify-center gap-[12px]">
			<PgdozorMark class="size-[38px] flex-none text-command" />
			<span class="font-condensed text-[27px] font-bold tracking-[3px] text-ink">PGDOZOR</span>
		</div>

		<form onsubmit={submit} class="border border-ink/16 bg-card px-[30px] pt-[30px] pb-[28px]">
			<label class={labelClass} for="login-email">Email</label>
			<div class="{fieldClass} mb-[16px]">
				<MailIcon class="size-[15px] flex-none text-ink/45" />
				<input
					id="login-email"
					type="email"
					bind:value={email}
					placeholder="you@company.com"
					autocomplete="username"
					spellcheck="false"
					class={inputClass}
				/>
			</div>

			<label class={labelClass} for="login-password">Password</label>
			<div class="{fieldClass} mb-[18px]">
				<LockIcon class="size-[15px] flex-none text-ink/45" />
				<input
					id="login-password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					autocomplete="current-password"
					class={inputClass}
				/>
			</div>

			{#if error}
				<div
					class="mb-[16px] flex items-center gap-[8px] border border-danger/30 bg-danger/8 px-[12px] py-[9px] font-sans text-[12.5px] text-danger"
				>
					<CircleAlertIcon class="size-[14px] flex-none" />
					<span>{error}</span>
				</div>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="flex h-[44px] w-full cursor-pointer items-center justify-center gap-[9px] bg-command font-condensed text-[14px] font-bold tracking-[1px] text-paper uppercase hover:bg-danger disabled:cursor-default disabled:opacity-70"
			>
				<span>{submitting ? 'Signing in…' : 'Sign in'}</span>
				<ArrowRightIcon class="size-[16px] stroke-[2.2]" />
			</button>
		</form>
	</div>
</div>
