<script lang="ts">
	import { Area, Axis, Chart, Grid, Svg } from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { fmtAxisTime } from '$lib/format';

	let {
		data,
		stroke,
		fill,
		format
	}: {
		data: { at: Date; value: number }[];
		stroke: string;
		fill: string;
		format: (value: number) => string;
	} = $props();
</script>

<div class="h-[240px]">
	<Chart {data} x="at" xScale={scaleTime()} y="value" yDomain={[0, null]} yNice padding={{ left: 40, bottom: 24 }}>
		<Svg>
			<Grid y={{ class: 'stroke-ink/10' }} />
			<Axis
				placement="left"
				rule
				ticks={4}
				{format}
				tickLabelProps={{ class: 'fill-ink/45 font-mono text-[10.5px]' }}
			/>
			<Axis
				placement="bottom"
				rule
				ticks={4}
				format={fmtAxisTime}
				tickLabelProps={{ class: 'fill-ink/45 font-mono text-[10.5px]' }}
			/>
			<Area curve={curveMonotoneX} {fill} line={{ stroke, 'stroke-width': 2 }} />
		</Svg>
	</Chart>
</div>
