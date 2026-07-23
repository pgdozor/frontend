// Which card's documentation panel is open, if any. A single global selection:
// opening one card's docs closes any other. Arrow methods keep `this` bound so
// they can be passed straight to event handlers.
class DocsState {
	activeId = $state<string | null>(null);

	toggle = (id: string): void => {
		this.activeId = this.activeId === id ? null : id;
	};

	open = (id: string): void => {
		this.activeId = id;
	};

	close = (): void => {
		this.activeId = null;
	};
}

export const docs = new DocsState();
