// Runtime mirror for inline colors (chart fills, severity shading via style:color).
// Canonical source is the @theme block in routes/layout.css; only the colors read
// at runtime are mirrored here (ink/card/shell live solely in CSS).
export const C = {
	paper: '#F4EFE6',
	command: '#A83D2B',
	danger: '#8B1E1E',
	warn: '#C7771A',
	ok: '#6B7A3A',
	steel: '#6C8392',
	teal: '#4E7A86',
	panic: '#5E1414',
	taupe: '#9A8F7E'
} as const;
