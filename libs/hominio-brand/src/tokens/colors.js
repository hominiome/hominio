/**
 * Color tokens for Liquid Glass design system
 */

export const colors = {
	// Glass backgrounds
	glass: {
		bg: {
			default: 'rgba(255, 255, 255, 0.4)', // bg-white/40
			hover: 'rgba(255, 255, 255, 0.5)', // bg-white/50
			light: 'rgba(255, 255, 255, 0.6)', // bg-white/60
			strong: 'rgba(255, 255, 255, 0.8)', // bg-white/80
			subtle: 'rgba(255, 255, 255, 0.3)', // bg-white/30
			minimal: 'rgba(255, 255, 255, 0.05)', // bg-white/5
		},
		border: {
			default: 'rgba(255, 255, 255, 0.6)', // border-white/60
			hover: 'rgba(255, 255, 255, 0.8)', // border-white/80
			subtle: 'rgba(255, 255, 255, 0.5)', // border-white/50
			minimal: 'rgba(255, 255, 255, 0.1)', // border-white/10
		},
	},
	// Background gradients
	gradient: {
		background: {
			from: '#f8f9fa',
			via: '#f2f4f6',
			to: '#e9ecef',
		},
		accent: {
			from: '#eff6ff', // blue-50
			via: '#eef2ff', // indigo-50
			to: '#faf5ff', // purple-50
		},
	},
	// Decorative blobs
	blobs: {
		blue: 'rgba(191, 219, 254, 0.2)', // bg-blue-200/20
		purple: 'rgba(221, 214, 254, 0.2)', // bg-purple-200/20
		emerald: 'rgba(167, 243, 208, 0.2)', // bg-emerald-200/20
	},
	// Alert colors
	alert: {
		warning: {
			bg: 'rgba(254, 243, 199, 0.5)', // bg-yellow-50/50
			border: 'rgba(254, 240, 138, 1)', // border-yellow-100
			text: '#d97706', // text-yellow-600
		},
		error: {
			bg: 'rgba(254, 226, 226, 0.5)', // bg-red-50/50
			border: 'rgba(254, 202, 202, 1)', // border-red-100
			text: '#dc2626', // text-red-600
		},
	},
	// Text colors
	text: {
		primary: '#0f172a', // text-slate-900
		secondary: '#475569', // text-slate-600
		tertiary: '#64748b', // text-slate-500
		muted: '#94a3b8', // text-slate-400
		title: '#081b47', // Dark navy blue for titles/headings
	},
	// Brand navy/dark blue - darker marine blue (no purple tint)
	brand: {
		navy: {
			// Navy dark blue - primary brand color (from hominio-me design)
			50: '#f0f2f5',
			100: '#e0e5eb',
			200: '#c1cad7',
			300: '#a2b0c3',
			400: '#8395af',
			500: '#081b47', // Primary navy - dark marine blue
			600: '#061836',
			700: '#051529',
			800: '#040f1c',
			900: '#030a14',
			950: '#02050a',
			// Legacy/compatibility
			base: '#081b47', // Same as 500
			light: '#8395af', // Same as 400
			dark: '#040f1c', // Same as 800
			glass: {
				bg: 'rgba(8, 27, 71, 0.15)', // navy/15
				bgHover: 'rgba(8, 27, 71, 0.25)', // navy/25
				border: 'rgba(8, 27, 71, 0.3)', // navy/30
				borderHover: 'rgba(8, 27, 71, 0.5)', // navy/50
			},
		},
	},
};

