import type { Preview } from '@storybook/nextjs-vite'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo'
    },

    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '667px' },
        },
        mobileLarge: {
          name: 'Mobile Large (414px)',
          styles: { width: '414px', height: '896px' },
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop (1024px)',
          styles: { width: '1024px', height: '768px' },
        },
        desktopLarge: {
          name: 'Desktop Large (1280px)',
          styles: { width: '1280px', height: '800px' },
        },
      },
    },
  },
};

export default preview;
