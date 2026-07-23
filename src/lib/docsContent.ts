// Documentation shown in the right-side panel, keyed by the card's doc id.
// Each entry explains what a card's data means, why it's the right metric to
// look at, and how it's produced under the hood.

export type DocLink = { label: string; href: string };
export type DocSection = { heading: string; body: string[]; link?: DocLink };
export type DocEntry = { title: string; sections: DocSection[] };

export const docContent: Record<string, DocEntry> = {
	'q-volume': {
		title: 'Query volume over time',
		sections: [
			{
				heading: 'What it shows',
				body: [
					'How many times queries ran in each time bucket on this server and database, added up across every query shape that matches your current filters. Taller bars mean more traffic.'
				]
			},
			{
				heading: 'Why it matters',
				body: [
					'Volume is your load signal. Spikes line up with deploys, cron jobs, or incidents, and they give the speed numbers context — a query that is slow only when volume is high behaves very differently from one that is always slow.'
				]
			},
			{
				heading: 'Under the hood',
				body: [
					'pg_stat_statements keeps a running total of how many times each statement has executed. The collector samples that counter on an interval and the backend subtracts consecutive samples, then groups the result into time buckets. The bucket size grows as you widen the selected range.'
				]
			}
		]
	},

	'q-speed': {
		title: 'Query speed over time',
		sections: [
			{
				heading: 'What it shows',
				body: [
					'The p90, p95, and p99 of query execution time over the range. p90 means 9 of every 10 executions finished at least this fast; p99 means 99 of every 100 did.',
					'Rising lines mean queries are getting slower. A widening gap between p90 and p99 means the slow tail — the worst 1% — is getting worse even if the typical query is fine.'
				]
			},
			{
				heading: 'Why percentiles, not an average',
				body: [
					'An average hides its own outliers: a handful of very slow runs barely move the mean, yet they are exactly what users feel. Percentiles describe the distribution instead, so p95 and p99 track the experience of the slowest few percent — which is where latency problems actually surface.'
				]
			},
			{
				heading: 'How it is approximated',
				body: [
					'Postgres, through pg_stat_statements, never stores the timing of individual executions — only per-shape aggregates: total time, mean, standard deviation, and a call count. True percentiles over real executions therefore are not available.',
					'QuerySheriff estimates them by taking each query shape’s mean time and computing a percentile weighted by how often that shape ran in the bucket. Treat the values as directional, not exact.'
				],
				link: {
					label: 'How pganalyze approximates percentiles',
					href: 'https://pganalyze.com/docs/query-performance'
				}
			},
			{
				heading: 'Why it can look surprisingly high',
				body: [
					'Because the estimate is weighted by call volume and uses each shape’s average, extremely frequent statements dominate it. A flood of tiny, frequent statements like BEGIN and COMMIT (COMMIT often waits on a disk or WAL flush) carries enormous weight and can drag the percentile upward.',
					'So a high p95 or p99 may reflect that bookkeeping traffic rather than any one analytical query being slow. For the exact timing of a specific query, open it and read its captured samples.'
				]
			}
		]
	},

	'q-table': {
		title: 'Queries',
		sections: [
			{
				heading: 'What it shows',
				body: [
					'Every query shape seen in the range, one row each, with its aggregate stats: average time, call count, rows per call, the share of time spent on I/O, and its share of total execution time. Sort any column to reorder.'
				]
			},
			{
				heading: 'Why it matters',
				body: [
					'This is where you decide what to optimize. Sorting by % Time surfaces the queries that consume the most database time overall — usually a better target than the single slowest call, because a moderately slow query run millions of times costs far more than a very slow one run twice. It is the same guidance the Postgres docs give.'
				]
			},
			{
				heading: 'Reading the columns',
				body: [
					'Query is the normalized shape, with literal values replaced by $1, $2, … so all runs of the same statement collapse into one row. Avg is mean execution time, % IO is the fraction of that time spent reading from disk, and the colored dot flags shapes whose average time is in warning or slow territory.'
				]
			},
			{
				heading: 'Under the hood',
				body: [
					'Every figure comes from pg_stat_statements aggregates differenced over time — not from logging individual executions — so it is cheap to collect but describes the shape as a whole. To see real runs with actual values and plans, open a query.'
				]
			}
		]
	},

	'qd-volume': {
		title: 'Query volume over time',
		sections: [
			{
				heading: 'What it shows',
				body: [
					'How often this one query shape ran over time, in buckets — the same idea as the volume chart on the Queries list, narrowed to this statement.'
				]
			},
			{
				heading: 'Why it matters',
				body: [
					'Pairing volume with the speed chart below tells you whether a change in this query’s total database impact came from it getting slower or simply running more often.'
				]
			},
			{
				heading: 'Under the hood',
				body: [
					'Derived from this statement’s pg_stat_statements call counter, sampled and differenced by the collector, then grouped into time buckets.'
				]
			}
		]
	},

	'qd-speed': {
		title: 'Query speed over time',
		sections: [
			{
				heading: 'What it shows',
				body: [
					'Two lines for this query over time. Avg total is the mean wall-clock time per execution; avg IO is the part of that spent reading or writing data blocks. The gap between them is roughly time on CPU, locking, and everything else.'
				]
			},
			{
				heading: 'Why it matters',
				body: [
					'The trend tells you whether the query is degrading, and the I/O share tells you why: a query dominated by I/O usually needs an index or less data scanned, while one with little I/O but high total time is often CPU-bound or waiting.'
				]
			},
			{
				heading: 'Under the hood',
				body: [
					'Both come from pg_stat_statements — mean execution time and block read/write timing (which requires track_io_timing to be enabled in Postgres). Values are per-shape averages differenced over time, not individual runs.'
				]
			}
		]
	},

	'qd-samples': {
		title: 'Captured samples',
		sections: [
			{
				heading: 'What it shows',
				body: [
					'Individual captured executions of this query — the real parameter values each run used, when it ran, how long it took, and an EXPLAIN plan when one was captured.'
				]
			},
			{
				heading: 'Why it matters',
				body: [
					'Aggregates tell you a query is slow on average; samples tell you which actual inputs were slow and let you reproduce them. The plan shows exactly how Postgres executed that run — the fastest way to spot a missing index or a bad row estimate.'
				]
			},
			{
				heading: 'Under the hood',
				body: [
					'The collector captures a bounded sample of real executions — recording every one would add overhead — so this is a representative slice, not the complete history. Rows with a plan link have an EXPLAIN captured for that specific run.'
				]
			}
		]
	}
};
