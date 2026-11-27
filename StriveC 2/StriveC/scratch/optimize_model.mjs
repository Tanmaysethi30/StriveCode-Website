import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { KHRTextureBasisu, EXTTextureWebP } from '@gltf-transform/extensions';
import {
  resample,
  prune,
  dedup,
  weld,
  simplify
} from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

async function optimize() {
  const inputPath = path.resolve('source-assets/black_honey_-_robotic_arm.glb');
  const outputPath = path.resolve('public/assets/models/robot-arm.glb');

  console.log('Reading input:', inputPath);
  const io = new NodeIO();
  io.registerExtensions([EXTTextureWebP]);

  const document = await io.read(inputPath);
  const root = document.getRoot();

  console.log('Original summary:');
  console.log('- Materials:', root.listMaterials().map(m => m.getName()));
  console.log('- Textures:', root.listTextures().length);
  console.log('- Meshes:', root.listMeshes().length);
  console.log('- Animations:', root.listAnimations().map(a => a.getName()));

  // 1. Resize and convert textures to WebP
  console.log('\nProcessing textures...');
  const materials = root.listMaterials();
  const emissiveTextures = new Set();
  for (const mat of materials) {
    const emissive = mat.getEmissiveTexture();
    if (emissive) emissiveTextures.add(emissive);
  }

  for (const texture of root.listTextures()) {
    const isEmissive = emissiveTextures.has(texture);
    const targetSize = isEmissive ? 512 : 1024;
    const originalImage = texture.getImage();
    const originalMime = texture.getMimeType();

    console.log(`- Texture "${texture.getName() || 'unnamed'}" (${originalMime}, isEmissive: ${isEmissive})`);

    // Resize and compress with sharp to WebP
    let pipeline = sharp(originalImage)
      .resize(targetSize, targetSize, {
        fit: 'inside',
        withoutEnlargement: true
      });

    // Emissive can be slightly higher compression or quality 80
    pipeline = pipeline.webp({ quality: 80, effort: 6 });

    const webpBuffer = await pipeline.toBuffer();
    texture.setImage(webpBuffer);
    texture.setMimeType('image/webp');
    console.log(`  -> Resized to max ${targetSize}x${targetSize} WebP, size: ${(webpBuffer.length / 1024).toFixed(1)} KB`);
  }

  // 2. Resample animations (losslessly deduplicate keyframes)
  console.log('\nResampling animations...');
  await document.transform(resample());

  // 3. Deduplicate accessors and textures
  console.log('\nDeduplicating...');
  await document.transform(dedup());

  // 4. Weld vertices (required for clean simplification)
  console.log('\nWelding vertices...');
  await document.transform(weld({ tolerance: 0.0001 }));

  // 5. Simplify geometry to ~25,000 - 35,000 triangles
  console.log('\nSimplifying geometry with MeshoptSimplifier...');
  await document.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: 0.35, // ~35% of 73k = ~25,000 - 30,000 triangles
      error: 0.001
    })
  );

  // 6. Prune unused properties
  console.log('\nPruning unused properties...');
  await document.transform(prune());

  // Write output
  console.log('\nWriting optimized model to:', outputPath);
  await io.write(outputPath, document);

  const beforeStat = fs.statSync(inputPath);
  const afterStat = fs.statSync(outputPath);

  console.log('\n=== OPTIMIZATION COMPLETE ===');
  console.log(`Original size: ${(beforeStat.size / (1024 * 1024)).toFixed(2)} MB (${beforeStat.size} bytes)`);
  console.log(`Optimized size: ${(afterStat.size / (1024 * 1024)).toFixed(2)} MB (${afterStat.size} bytes)`);
}

optimize().catch(err => {
  console.error('Optimization error:', err);
  process.exit(1);
});
