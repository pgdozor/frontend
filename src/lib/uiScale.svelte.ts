import { browser } from '$app/environment';

const STORAGE_KEY = 'pgdozor:ui-scale';
const SCALES = [100, 110, 125] as const;
const BASE_PX = 16;

class UiScaleState {
	value = $state(browser ? Number(localStorage.getItem(STORAGE_KEY)) || 100 : 100);

	readonly options = SCALES;

	set(v: number): void {
		this.value = v;
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, String(v));
		this.apply();
	}

	cycle(): void {
		const i = SCALES.indexOf(this.value as (typeof SCALES)[number]);
		this.set(SCALES[(i + 1) % SCALES.length]);
	}

	// Everything is rem, so scaling the root font-size scales the whole UI.
	apply(): void {
		if (browser) document.documentElement.style.fontSize = `${(BASE_PX * this.value) / 100}px`;
	}
}

export const uiScale = new UiScaleState();
