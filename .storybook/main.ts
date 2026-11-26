import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.tsx'],
  framework: { name: '@storybook/react-vite', options: {} },
  staticDirs: ['../public'],
};
export default config;
