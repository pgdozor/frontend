// Shared with SqlPopover.svelte so the positioning math and rendered element stay in sync.
export const POPOVER_WIDTH = 440;

export class SqlPopoverState {
	pop = $state<{
		text: string;
		left: number;
		top: number | null;
		bottom: number | null;
		maxHeight: number;
	} | null>(null);
	copied = $state(false);
	#timer: ReturnType<typeof setTimeout> | null = null;

	show(text: string, e: MouseEvent) {
		if (this.#timer) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const margin = 12;
		const left = Math.max(margin, Math.min(r.left, window.innerWidth - POPOVER_WIDTH - margin));
		const spaceBelow = window.innerHeight - r.bottom - margin;
		const spaceAbove = r.top - margin;
		// Flip above the trigger when a downward popover would be clipped and there
		// is more room above — keeps it on-screen for bottom-row samples. Anchoring
		// by `bottom` lets it grow upward without measuring its height first.
		const openUp = spaceBelow < 360 && spaceAbove > spaceBelow;
		const maxHeight = Math.max(140, Math.min(440, openUp ? spaceAbove : spaceBelow));
		this.pop = openUp
			? { text, left, top: null, bottom: window.innerHeight - r.top + 6, maxHeight }
			: { text, left, top: r.bottom + 6, bottom: null, maxHeight };
		this.copied = false;
	}

	// Brief grace delay so the cursor can travel from the trigger into the popover.
	hide = () => {
		this.#timer = setTimeout(() => {
			this.pop = null;
			this.copied = false;
		}, 140);
	};

	keep = () => {
		if (this.#timer) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
	};

	copy = () => {
		const text = this.pop?.text;
		if (!text) return;
		navigator.clipboard.writeText(text).then(
			() => (this.copied = true),
			() => {}
		);
	};
}
