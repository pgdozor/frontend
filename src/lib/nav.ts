export interface NavItem {
	key: string;
	label: string;
	href: string;
}

/** Top-level screens shown in the sidebar. `query-detail` is a sub-view of
 *  Queries (reached by clicking a row), so it is not listed here. */
export const navItems: NavItem[] = [
	{ key: 'slow-queries', label: 'QUERIES', href: '/queries' },
	{ key: 'transactions', label: 'TRANSACTIONS', href: '/transactions' },
	{ key: 'blocking', label: 'BLOCKING', href: '/blocking' },
	{ key: 'logs', label: 'LOGS', href: '/logs' },
	{ key: 'alerts', label: 'ALERTS', href: '/alerts' }
];

/** ADMIN sub-section, shown in the sidebar only to the super admin. */
export const adminItems: NavItem[] = [
	{ key: 'admin-collectors', label: 'COLLECTORS', href: '/admin/collectors' },
	{ key: 'admin-users', label: 'USERS', href: '/admin/users' }
];

export const screenMeta: Record<string, { title: string }> = {
	'slow-queries': { title: 'QUERIES' },
	'query-detail': { title: 'Query Detail' },
	transactions: { title: 'TRANSACTIONS' },
	blocking: { title: 'BLOCKING' },
	logs: { title: 'LOGS' },
	alerts: { title: 'ALERTS' },
	'admin-collectors': { title: 'COLLECTORS' },
	'admin-users': { title: 'USERS' }
};

/** Map a URL pathname to a screen key in `screenMeta`. */
export function screenKeyForPath(pathname: string): string {
	if (pathname.startsWith('/queries/')) return 'query-detail';
	if (pathname.startsWith('/transactions')) return 'transactions';
	if (pathname.startsWith('/blocking')) return 'blocking';
	if (pathname.startsWith('/logs')) return 'logs';
	if (pathname.startsWith('/alerts')) return 'alerts';
	if (pathname.startsWith('/admin/collectors')) return 'admin-collectors';
	if (pathname.startsWith('/admin/users')) return 'admin-users';
	return 'slow-queries';
}

export function screenTitle(pathname: string): string {
	return screenMeta[screenKeyForPath(pathname)]?.title ?? '';
}

/** Whether a nav item should render as the active screen. */
export function isNavActive(item: NavItem, pathname: string): boolean {
	if (item.key === 'slow-queries') return pathname === '/' || pathname.startsWith('/queries');
	return pathname.startsWith(item.href);
}
