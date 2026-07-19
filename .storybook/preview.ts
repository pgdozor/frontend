import type { Preview } from '@storybook/sveltekit';
import '../src/routes/layout.css';

const preview: Preview = {
	parameters: {
		layout: 'fullscreen',
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		a11y: {
			// 'todo' shows violations in the a11y panel; 'error' would fail the test run.
			test: 'todo'
		},
		viewport: {
			options: {
				mobile: { name: 'Mobile · 375', styles: { width: '375px', height: '812px' } },
				tablet: { name: 'Tablet · 768', styles: { width: '768px', height: '1024px' } },
				ipadLandscape: { name: 'iPad L · 1024', styles: { width: '1024px', height: '768px' } },
				desktop: { name: 'Desktop · 1440', styles: { width: '1440px', height: '900px' } }
			}
		}
	},
	initialGlobals: {
		viewport: { value: 'desktop', isRotated: false }
	}
};

export default preview;
