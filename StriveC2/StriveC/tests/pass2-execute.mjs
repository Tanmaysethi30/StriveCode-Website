import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const QUARANTINE_DIR = path.resolve('../strivecode-removed-files');
const BASELINE_DIR = path.resolve('../strivecode-baseline');

if (!fs.existsSync(QUARANTINE_DIR)) fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
if (!fs.existsSync(path.join(QUARANTINE_DIR, 'src'))) fs.mkdirSync(path.join(QUARANTINE_DIR, 'src'), { recursive: true });

const filesToMove = [
  // OS Junk
  '.DS_Store',
  'src/.DS_Store',

  // Debug scripts
  'audit_images.mjs',
  'audit_orig_images.mjs',
  'diagnose.mjs',
  'inspect_hero.mjs',

  // Obsolete background
  'Minimal_Pale_Gray_Dot_Matrix_Background.png',

  // Root HTML originals
  'Aboutus.html',
  'Careers.html',
  'Contact.html',
  'Courses.html',
  'Homepage.html',
  'Mentorship.html',
  'Product.html',
  'Services.html',

  // Root CSS/JS/images that are byte-identical across root, originals_backup, and public
  'grid-matrix.js',
  'logo.jpg',
  'mentorship-dots.css',
  'mentorship-dots.js',
  'mentorship-logo.css',
  'mentorship-logo.jpg',
  'mentorship-logo.png',
  'nav.css',
  'style.css',

  // Root CSS/JS that match originals_backup exactly (and whose runtime versions live in public/)
  'apply-modal.css',
  'apply-modal.js',
  'main.js'
];

console.log('--- Step 1: Moving approved files to quarantine folder ---');
const movedFiles = [];

try {
  for (const relPath of filesToMove) {
    const srcPath = path.resolve(relPath);
    const destPath = path.join(QUARANTINE_DIR, relPath);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    if (fs.existsSync(srcPath)) {
      fs.renameSync(srcPath, destPath);
      movedFiles.push({ relPath, srcPath, destPath });
      console.log(`Moved: ${relPath} -> ${destPath}`);
    } else {
      console.log(`Skipped (not found): ${relPath}`);
    }
  }

  console.log(`\nSuccessfully moved ${movedFiles.length} files to quarantine.`);

  // Step 2: Rebuild with Astro
  console.log('\n--- Step 2: Rebuilding static site with Astro ---');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 3: Compare dist hashes against baseline
  console.log('\n--- Step 3: Comparing dist hashes against baseline ---');
  const baselineHashesRaw = fs.readFileSync(path.join(BASELINE_DIR, 'dist-hashes.txt'), 'utf8');
  const baselineMap = {};
  baselineHashesRaw.trim().split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      baselineMap[parts[1]] = parts[0];
    }
  });

  function walk(dir, baseDir = '') {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const full = path.join(dir, file);
      const rel = path.join(baseDir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results = results.concat(walk(full, rel));
      } else {
        results.push({ full, rel });
      }
    });
    return results;
  }

  const newDistFiles = walk('dist');
  let hashMismatch = false;
  const comparisonResults = [];

  for (const f of newDistFiles) {
    const content = fs.readFileSync(f.full);
    const newHash = crypto.createHash('sha256').update(content).digest('hex');
    const baseHash = baselineMap[f.rel];

    const match = newHash === baseHash;
    comparisonResults.push({ file: f.rel, match, newHash, baseHash });
    if (!match) {
      console.error(`HASH MISMATCH for ${f.rel}: New=${newHash}, Base=${baseHash}`);
      hashMismatch = true;
    }
  }

  if (newDistFiles.length !== Object.keys(baselineMap).length) {
    console.error(`File count mismatch: New dist has ${newDistFiles.length}, Baseline has ${Object.keys(baselineMap).length}`);
    hashMismatch = true;
  }

  if (hashMismatch) {
    console.error('\nCRITICAL: Dist hash mismatch detected! Restoring files from quarantine...');
    for (const m of movedFiles) {
      fs.renameSync(m.destPath, m.srcPath);
    }
    console.error('All files restored to workspace.');
    process.exit(1);
  }

  console.log('✓ SUCCESS: All 26 dist files have 100% IDENTICAL SHA-256 hashes to the baseline!');

} catch (err) {
  console.error('Error during execution:', err);
  console.log('Rolling back moved files...');
  for (const m of movedFiles) {
    if (fs.existsSync(m.destPath)) {
      fs.renameSync(m.destPath, m.srcPath);
    }
  }
  process.exit(1);
}
