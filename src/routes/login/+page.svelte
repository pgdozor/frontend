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
		'flex h-[2.625rem] items-center gap-2.5 border border-line-strong bg-paper px-3.5 focus-within:border-command';
	const inputClass = 'min-w-0 flex-1 border-none bg-transparent font-mono text-md text-ink outline-none';
	const labelClass = 'mb-1.5 block font-condensed text-2xs font-semibold tracking-[1px] text-ink/55 uppercase';
</script>

<div class="flex min-h-screen items-center justify-center bg-paper p-8 font-sans">
	<div class="w-full max-w-[25.25rem]">
		<div class="mb-8 flex items-center justify-center gap-3">
			<PgdozorMark class="size-10 flex-none text-command" />
			<span class="font-condensed text-[27px] font-bold tracking-[3px] text-ink">PGDOZOR</span>
		</div>

		<form onsubmit={submit} class="border border-line-card bg-card px-8 pt-8 pb-7">
			<label class={labelClass} for="login-email">Email</label>
			<div class="{fieldClass} mb-4">
				<MailIcon class="size-4 flex-none text-ink/45" />
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
			<div class="{fieldClass} mb-5">
				<LockIcon class="size-4 flex-none text-ink/45" />
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
					class="mb-4 flex items-center gap-2 border border-danger/30 bg-danger/8 px-3 py-2.5 font-sans text-sm text-danger"
				>
					<CircleAlertIcon class="size-3.5 flex-none" />
					<span>{error}</span>
				</div>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="flex h-[2.75rem] w-full cursor-pointer items-center justify-center gap-2.5 bg-command font-condensed text-lg font-bold tracking-[1px] text-paper uppercase hover:bg-danger disabled:cursor-default disabled:opacity-70"
			>
				<span>{submitting ? 'Signing in…' : 'Sign in'}</span>
				<ArrowRightIcon class="size-4 stroke-[2.2]" />
			</button>
		</form>
	</div>
</div>
