import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://strivecode.in',
  output: 'static',
  integrations: [tailwind({ applyBaseStyles: false })]
});
