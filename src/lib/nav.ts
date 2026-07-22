export interface NavItem {
	key: string;
	label: string;
	href: string;
}

// `query-detail` is a sub-view of Queries (reached by clicking a row), so it is not listed here.
export const navItems: NavItem[] = [
	{ key: 'slow-queries', label: 'QUERIES', href: '/queries' },
	{ key: 'transactions', label: 'TRANSACTIONS', href: '/transactions' },
	{ key: 'blocking', label: 'BLOCKING', href: '/blocking' },
	{ key: 'logs', label: 'LOGS', href: '/logs' },
	{ key: 'alerts', label: 'ALERTS', href: '/alerts' }
];

export const adminItems: NavItem[] = [
	{ key: 'admin-collectors', label: 'COLLECTORS', href: '/admin/collectors' },
	{ key: 'admin-users', label: 'USERS', href: '/admin/users' }
];

export const screenMeta: Record<string, { title: string; description: string }> = {
	'slow-queries': {
		title: 'QUERIES',
		description: 'How often queries ran, how long they took, and how each one compares'
	},
	'query-detail': {
		title: 'QUERY DETAIL',
		description: 'How often this query ran, how long it took, and real samples'
	},
	transactions: {
		title: 'TRANSACTIONS',
		description: 'Transactions in flight, with the statements and wait events behind each one'
	},
	blocking: {
		title: 'BLOCKING',
		description: 'Sessions blocked by locks, and the transactions holding them'
	},
	logs: {
		title: 'LOGS',
		description: 'Log events collected from this server, by level and classification'
	},
	alerts: {
		title: 'ALERTS',
		description: 'Slack notifications and per-alert toggles for each monitored server'
	},
	'admin-collectors': {
		title: 'COLLECTORS',
		description: 'Access tokens that let collectors report into querysheriff'
	},
	'admin-users': {
		title: 'USERS',
		description: 'User accounts and which servers each one can see'
	}
};

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

export function screenDescription(pathname: string): string {
	return screenMeta[screenKeyForPath(pathname)]?.description ?? '';
}

export function isNavActive(item: NavItem, pathname: string): boolean {
	if (item.key === 'slow-queries') return pathname === '/' || pathname.startsWith('/queries');
	return pathname.startsWith(item.href);
}
