import { browser } from '$app/environment';

const STORAGE_KEY = 'querysheriff:sidebar-collapsed';

class SidebarState {
	collapsed = $state(browser && localStorage.getItem(STORAGE_KEY) === '1');
	drawerOpen = $state(false);

	toggleCollapsed(): void {
		this.collapsed = !this.collapsed;
		if (browser) localStorage.setItem(STORAGE_KEY, this.collapsed ? '1' : '0');
	}

	openDrawer(): void {
		this.drawerOpen = true;
	}

	closeDrawer(): void {
		this.drawerOpen = false;
	}
}

export const sidebar = new SidebarState();
