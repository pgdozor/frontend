<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatementTable, { type StatementRow, type StatementSortCol } from './StatementTable.svelte';

	const { Story } = defineMeta({
		title: 'Queries/StatementTable',
		component: StatementTable,
		parameters: { layout: 'fullscreen' }
	});
</script>

<script lang="ts">
	import { SqlPopoverState } from '$lib/sqlPopover.svelte';
	import { C } from '$lib/theme';

	const sql = new SqlPopoverState(async () => 'SELECT * FROM orders WHERE id = $1');

	const rows: StatementRow[] = [
		{
			id: '1',
			query:
				'SELECT o.id, o.total, o.status, c.email FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = $1 ORDER BY o.created_at DESC',
			usr: 'app',
			meanMs: 46.3,
			calls: 4220,
			rowsPerCall: 2.04,
			pctIo: 10.1,
			pctTime: 17.4,
			sev: C.danger,
			tags: ['service=checkout-api', 'env=production']
		},
		{
			id: '2',
			query: 'SELECT date_trunc($1, created_at) AS bucket, count(*), sum(total) FROM orders GROUP BY 1 ORDER BY 1',
			usr: 'reporting',
			meanMs: 21.3,
			calls: 5610,
			rowsPerCall: 7.11,
			pctIo: 15.9,
			pctTime: 10.7,
			sev: C.warn,
			tags: []
		},
		{
			id: '3',
			query: 'UPDATE users SET last_login = now(), visits = visits + 1 WHERE id = $1',
			usr: 'worker',
			meanMs: 6.86,
			calls: 2420,
			rowsPerCall: 2.81,
			pctIo: 1.5,
			pctTime: 1.5,
			sev: C.ok,
			tags: []
		},
		{
			id: '4',
			query: 'SELECT * FROM loadtest_table_1 WHERE col = $1 AND status = $2',
			usr: 'analytics',
			meanMs: 8.36,
			calls: 1850,
			rowsPerCall: 3.37,
			pctIo: 1.4,
			pctTime: 1.4,
			sev: C.steel,
			tags: []
		}
	];

	let sort = $state<{ col: StatementSortCol; dir: 'asc' | 'desc' }>({ col: 'pctTime', dir: 'desc' });
</script>

<Story name="Default">
	{#snippet template()}
		<div class="border border-ink/16 bg-card">
			<StatementTable {rows} bind:sort {sql} onOpen={() => {}} onFilterTag={() => {}} />
		</div>
	{/snippet}
</Story>

<Story name="Empty">
	{#snippet template()}
		<div class="border border-ink/16 bg-card">
			<StatementTable rows={[]} bind:sort {sql} onOpen={() => {}} onFilterTag={() => {}} />
		</div>
	{/snippet}
</Story>
