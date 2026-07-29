import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');
const logoPath = path.join(publicDir, 'dwp-logo.png');

if (fs.existsSync(logoPath)) {
  const imgBuffer = fs.readFileSync(logoPath);
  const base64Img = imgBuffer.toString('base64');

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <circle cx="64" cy="64" r="62" fill="#ffffff" stroke="#2563eb" stroke-width="4"/>
  <image href="data:image/png;base64,${base64Img}" x="6" y="6" width="116" height="116" preserveAspectRatio="xMidYMid fit"/>
</svg>`;

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.copyFileSync(logoPath, path.join(publicDir, 'favicon.png'));
  fs.copyFileSync(logoPath, path.join(publicDir, 'favicon.ico'));
  console.log('Favicon files generated successfully!');
} else {
  console.error('dwp-logo.png not found!');
}
