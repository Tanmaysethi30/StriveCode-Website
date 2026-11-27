const fs = require('fs');

function diff(fileA, fileB) {
  // if backup exists
  if (fs.existsSync(fileA) && fs.existsSync(fileB)) {
    console.log(`Diff between ${fileA} and ${fileB}:`);
  }
}

// Let's check git status just in case git is present
const { execSync } = require('child_process');
try {
  const status = execSync('git diff src/pages/aboutus.astro', { encoding: 'utf8' });
  console.log("GIT DIFF aboutus.astro:\n", status);
} catch (e) {
  console.log("Git error / not a git repo");
}
