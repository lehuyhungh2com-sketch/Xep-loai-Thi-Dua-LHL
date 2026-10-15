const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Helper to recursively find JS files in node_modules/html2canvas and node_modules/html2pdf.js
function findJsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git') {
        findJsFiles(fullPath, fileList);
      }
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs') || entry.name.endsWith('.cjs')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const targetDirs = [
  path.join(rootDir, 'node_modules/html2canvas'),
  path.join(rootDir, 'node_modules/html2pdf.js'),
  path.join(rootDir, 'node_modules/.vite/deps'),
];

const allCandidates = new Set();
for (const dir of targetDirs) {
  findJsFiles(dir).forEach((f) => allCandidates.add(f));
}

let patchedCount = 0;
// Regex matches any variation of `throw new Error("Attempting to parse an unsupported color function ... ");`
const rx = /throw new Error\(['"]Attempting to parse an unsupported color function [^;]+;?/g;

for (const filePath of allCandidates) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('Attempting to parse an unsupported color function')) {
      // 253176575 is 32-bit unsigned RGBA (15, 23, 42, 1) - default slate-900 color
      content = content.replace(rx, 'return 253176575;');
      fs.writeFileSync(filePath, content, 'utf8');
      patchedCount++;
      console.log(`[Patch] Successfully patched: ${filePath}`);
    }
  } catch (err) {
    console.error(`[Patch] Error patching ${filePath}:`, err.message);
  }
}

console.log(`[Patch] Finished. Total patched files: ${patchedCount}`);
