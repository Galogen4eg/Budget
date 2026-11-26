import '../terra-tailwind.css';
import type { Preview } from '@storybook/react-vite';
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Terra theme',
      toolbar: { title: 'Тема', icon: 'circlehollow', items: ['light', 'dark'] },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [(Story, context) => {
    document.documentElement.classList.toggle('dark', context.globals.theme === 'dark');
    document.body.style.backgroundColor = 'var(--terra-canvas)';
    document.body.style.color = 'var(--terra-ink)';
    return Story();
  }],
  parameters: { layout: 'fullscreen' },
};
export default preview;
