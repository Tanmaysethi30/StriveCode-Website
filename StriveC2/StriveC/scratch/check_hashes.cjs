const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function getHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

const routes = [
  'dist/404.html',
  'dist/index.html',
  'dist/careers/index.html',
  'dist/contact/index.html',
  'dist/courses/index.html',
  'dist/mentorship/index.html',
  'dist/product/index.html',
  'dist/services/index.html',
  'dist/aboutus/index.html'
];

routes.forEach(r => {
  if (fs.existsSync(r)) {
    console.log(`${r}: ${getHash(r)}`);
  }
});
