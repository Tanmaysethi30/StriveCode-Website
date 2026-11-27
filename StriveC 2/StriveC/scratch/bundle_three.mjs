import { build } from 'vite';
import path from 'path';

async function bundle() {
  console.log('Bundling Three.js scene with Vite...');
  await build({
    configFile: false,
    publicDir: false,
    build: {
      lib: {
        entry: path.resolve('src/scripts/three-scene.js'),
        name: 'ThreeScene',
        formats: ['es'],
        fileName: () => 'three-scene.js'
      },
      outDir: path.resolve('public/assets/scripts'),
      emptyOutDir: false,
      minify: 'esbuild'
    }
  });
  console.log('Successfully bundled public/assets/scripts/three-scene.js');
}

bundle().catch(err => {
  console.error('Bundle failed:', err);
  process.exit(1);
});
