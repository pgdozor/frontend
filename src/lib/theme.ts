// PGDOZOR palette — kept in TS for data-driven (inline) colors such as severity
// shading, where the value is computed at runtime rather than known at authoring
// time. Mirrors the `@theme` tokens in routes/layout.css and the `const C` block
// in the source design.
export const C = {
	paper: '#F4EFE6',
	ink: '#3A2A1F',
	command: '#A83D2B',
	danger: '#8B1E1E',
	warn: '#C7771A',
	ok: '#6B7A3A',
	steel: '#6C8392',
	teal: '#4E7A86',
	panic: '#5E1414',
	taupe: '#9A8F7E',
	card: '#FBF8F1',
	shell: '#EFE8DB'
} as const;
