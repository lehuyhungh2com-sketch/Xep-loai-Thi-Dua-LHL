import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createSourceZip(outputPath: string): Promise<string> {
  const rootDir = path.resolve(__dirname, '..');
  const zip = new JSZip();

  const excludeDirs = new Set(['node_modules', '.git', 'dist', '.aistudio', '.cache']);
  const excludeFiles = new Set(['source_code_thcs_le_huu_lap.zip', 'test.zip', '.DS_Store']);

  function addDirectoryToZip(currentDir: string, zipFolder: JSZip) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.has(entry.name)) {
          const nextFolder = zipFolder.folder(entry.name);
          if (nextFolder) {
            addDirectoryToZip(fullPath, nextFolder);
          }
        }
      } else if (entry.isFile()) {
        if (!excludeFiles.has(entry.name) && !entry.name.endsWith('.zip')) {
          const fileData = fs.readFileSync(fullPath);
          zipFolder.file(entry.name, fileData, {
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
          });
        }
      }
    }
  }

  addDirectoryToZip(rootDir, zip);

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'DOS',
  });

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content);
  console.log(`Source package successfully created at: ${outputPath} (${content.length} bytes)`);
  return outputPath;
}

if (process.argv[1]?.includes('export_source_zip_jszip')) {
  const dest = process.argv[2] || path.resolve(__dirname, '../public/source_code_thcs_le_huu_lap.zip');
  createSourceZip(dest)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error creating source zip:', err);
      process.exit(1);
    });
}
