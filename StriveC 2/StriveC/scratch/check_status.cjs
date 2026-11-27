const fs = require('fs');
const path = require('path');

console.log("Checking project files...");
console.log("src/pages/aboutus.astro exists:", fs.existsSync('src/pages/aboutus.astro'));
console.log("src/scripts/three-scene.js exists:", fs.existsSync('src/scripts/three-scene.js'));
console.log("public/assets/scripts/three-scene.js exists:", fs.existsSync('public/assets/scripts/three-scene.js'));
console.log("public/assets/models/robot-arm-poster.webp exists:", fs.existsSync('public/assets/models/robot-arm-poster.webp'));
