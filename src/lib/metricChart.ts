export type MetricSeriesPoint = { at: Date; value: number | null };

export type MetricSeriesRow = { at: Date; values: (number | null)[] };

export type MetricChartModel = {
	gapData: MetricSeriesPoint[];
	gaps: { from: Date; to: Date }[];
	xFrom: Date;
	xTo: Date;
	step: number;
};

export type MetricMultiChartModel = {
	rows: MetricSeriesRow[];
	gaps: { from: Date; to: Date }[];
	xFrom: Date;
	xTo: Date;
	step: number;
};

function resolveStep(fromMs: number, toMs: number, bucketMs: number): number {
	return bucketMs > 0 ? bucketMs : Math.max(60_000, (toMs - fromMs) / 60);
}

function buildSpan(
	times: number[],
	fromMs: number,
	toMs: number,
	step: number
): { gaps: { from: Date; to: Date }[]; xFrom: Date; xTo: Date } {
	const threshold = step * 1.5;

	const covered: { s: number; e: number }[] = [];
	let runStart: number | null = null;
	let prev: number | null = null;
	for (const cur of times) {
		if (prev === null) {
			runStart = cur - step;
		} else if (cur - prev > threshold) {
			covered.push({ s: runStart as number, e: prev });
			runStart = cur - step;
		}
		prev = cur;
	}
	if (prev !== null) covered.push({ s: runStart as number, e: prev });

	const firstSample = times.length ? times[0] - step : fromMs;
	const lastSample = times.length ? times[times.length - 1] : fromMs;
	const rightMs = toMs - lastSample <= threshold ? lastSample : toMs;
	const left = firstSample - fromMs <= 2 * step ? firstSample : fromMs;
	const [xLeft, xRight] = rightMs > left ? [left, rightMs] : [fromMs, rightMs];

	const gaps: { from: Date; to: Date }[] = [];
	let cursor = xLeft;
	for (const c of covered) {
		if (c.s > cursor) gaps.push({ from: new Date(cursor), to: new Date(Math.min(c.s, xRight)) });
		cursor = Math.max(cursor, c.e);
	}
	if (xRight - cursor > threshold) gaps.push({ from: new Date(cursor), to: new Date(xRight) });

	return { gaps, xFrom: new Date(xLeft), xTo: new Date(xRight) };
}

export function buildMetricChartModel(
	data: MetricSeriesPoint[],
	from: Date,
	to: Date,
	bucketMs: number
): MetricChartModel {
	const fromMs = from.getTime();
	const toMs = to.getTime();
	const step = resolveStep(fromMs, toMs, bucketMs);
	const threshold = step * 1.5;

	const gapData: MetricSeriesPoint[] = [];
	let prev: number | null = null;
	for (const p of data) {
		const cur = p.at.getTime();
		if (prev !== null && cur - prev > threshold) {
			gapData.push({ at: new Date((prev + cur) / 2), value: null });
		}
		gapData.push(p);
		prev = cur;
	}

	const span = buildSpan(
		data.map((p) => p.at.getTime()),
		fromMs,
		toMs,
		step
	);

	return { gapData, step, ...span };
}

export function buildMetricMultiChartModel(
	series: MetricSeriesPoint[][],
	from: Date,
	to: Date,
	bucketMs: number
): MetricMultiChartModel {
	const fromMs = from.getTime();
	const toMs = to.getTime();
	const step = resolveStep(fromMs, toMs, bucketMs);
	const threshold = step * 1.5;

	const times = new Set<number>();
	for (const points of series) {
		for (const p of points) times.add(p.at.getTime());
	}
	const sorted = [...times].sort((a, b) => a - b);
	const lookups = series.map((points) => new Map(points.map((p) => [p.at.getTime(), p.value])));

	const rows: MetricSeriesRow[] = [];
	let prev: number | null = null;
	for (const t of sorted) {
		if (prev !== null && t - prev > threshold) {
			rows.push({ at: new Date((prev + t) / 2), values: series.map(() => null) });
		}
		rows.push({ at: new Date(t), values: lookups.map((m) => m.get(t) ?? null) });
		prev = t;
	}

	return { rows, step, ...buildSpan(sorted, fromMs, toMs, step) };
}
