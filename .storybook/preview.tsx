import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: {
        mobileSmall: {
          name: 'Mobile S (375px)',
          styles: { width: '375px', height: '667px' },
        },
        mobile: {
          name: 'Mobile (414px)',
          styles: { width: '414px', height: '896px' },
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
        },
        laptop: {
          name: 'Laptop (1024px)',
          styles: { width: '1024px', height: '768px' },
        },
        desktop: {
          name: 'Desktop (1280px)',
          styles: { width: '1280px', height: '800px' },
        },
        desktopLarge: {
          name: 'Desktop Large (1536px)',
          styles: { width: '1536px', height: '900px' },
        },
      },
      defaultViewport: 'mobile',
    },
    a11y: {
      test: 'todo'
    }
  },
};

export default preview;
