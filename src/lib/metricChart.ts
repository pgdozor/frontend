export type MetricSeriesPoint = { at: Date; value: number | null };

export type MetricChartModel = {
	gapData: MetricSeriesPoint[];
	gaps: { from: Date; to: Date }[];
	xFrom: Date;
	xTo: Date;
};

export function buildMetricChartModel(
	data: MetricSeriesPoint[],
	from: Date,
	to: Date,
	bucketMs: number
): MetricChartModel {
	const fromMs = from.getTime();
	const toMs = to.getTime();
	const step = bucketMs > 0 ? bucketMs : Math.max(60_000, (toMs - fromMs) / 60);
	const threshold = step * 1.5;

	const covered: { s: number; e: number }[] = [];
	const gapData: MetricSeriesPoint[] = [];
	let runStart: number | null = null;
	let prev: number | null = null;
	for (const p of data) {
		const cur = p.at.getTime();
		if (prev === null) {
			runStart = cur;
		} else if (cur - prev > threshold) {
			covered.push({ s: runStart as number, e: prev });
			gapData.push({ at: new Date((prev + cur) / 2), value: null });
			runStart = cur;
		}
		gapData.push(p);
		prev = cur;
	}
	if (prev !== null) covered.push({ s: runStart as number, e: prev });

	const firstSample = data.length ? data[0].at.getTime() : fromMs;
	const lastSample = data.length ? data[data.length - 1].at.getTime() : fromMs;
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

	return { gapData, gaps, xFrom: new Date(xLeft), xTo: new Date(xRight) };
}
