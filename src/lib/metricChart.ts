export type MetricSeriesPoint = { at: Date; value: number | null };

export type MetricSeriesRow = { at: Date; values: (number | null)[] };

export type MetricChartModel = {
	gaps: { from: Date; to: Date }[];
	xFrom: Date;
	xTo: Date;
	step: number;
};

export type MetricMultiChartModel = MetricChartModel & { rows: MetricSeriesRow[] };

function resolveStep(fromMs: number, toMs: number, bucketMs: number): number {
	return bucketMs > 0 ? bucketMs : Math.max(60_000, (toMs - fromMs) / 60);
}

function buildSpan(times: number[], fromMs: number, toMs: number, step: number): MetricChartModel {
	if (!times.length) return { gaps: [], xFrom: new Date(fromMs), xTo: new Date(toMs), step };

	const first = times[0];
	const last = times[times.length - 1];
	const gridFrom = first - Math.max(0, Math.ceil((first - fromMs) / step)) * step;
	const gridTo = last + Math.max(0, Math.floor((toMs - last) / step) - 1) * step;

	const present = new Set(times);
	const gaps: { from: Date; to: Date }[] = [];
	let runStart: number | null = null;
	for (let t = gridFrom; t <= gridTo; t += step) {
		if (!present.has(t)) {
			if (runStart === null) runStart = t;
		} else if (runStart !== null) {
			gaps.push({ from: new Date(runStart - step), to: new Date(t - step) });
			runStart = null;
		}
	}
	if (runStart !== null) gaps.push({ from: new Date(runStart - step), to: new Date(gridTo) });

	return { gaps, xFrom: new Date(gridFrom), xTo: new Date(gridTo), step };
}

export function buildMetricChartModel(
	data: MetricSeriesPoint[],
	from: Date,
	to: Date,
	bucketMs: number
): MetricChartModel {
	const fromMs = from.getTime();
	const toMs = to.getTime();

	return buildSpan(
		data.map((p) => p.at.getTime()),
		fromMs,
		toMs,
		resolveStep(fromMs, toMs, bucketMs)
	);
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

	const times = new Set<number>();
	for (const points of series) {
		for (const p of points) times.add(p.at.getTime());
	}
	const sorted = [...times].sort((a, b) => a - b);
	const lookups = series.map((points) => new Map(points.map((p) => [p.at.getTime(), p.value])));

	const rows: MetricSeriesRow[] = [];
	let prev: number | null = null;
	for (const t of sorted) {
		if (prev !== null && t - prev > step) {
			rows.push({ at: new Date(prev + step), values: series.map(() => null) });
		}
		rows.push({ at: new Date(t), values: lookups.map((m) => m.get(t) ?? null) });
		prev = t;
	}

	return { rows, ...buildSpan(sorted, fromMs, toMs, step) };
}
