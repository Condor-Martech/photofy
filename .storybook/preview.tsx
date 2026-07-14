import type { Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'

const photofyViewports = {
  mobileSmall: {
    name: 'Mobile S (360px)',
    styles: { width: '360px', height: '640px' },
  },
  mobileMedium: {
    name: 'Mobile M (375px)',
    styles: { width: '375px', height: '667px' },
  },
  mobileLarge: {
    name: 'Mobile L (428px)',
    styles: { width: '428px', height: '926px' },
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
    name: 'Desktop L (1440px)',
    styles: { width: '1440px', height: '900px' },
  },
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: photofyViewports,
      defaultViewport: 'mobileMedium',
    },
    a11y: {
      test: 'todo',
    },
  },
}

export default preview
