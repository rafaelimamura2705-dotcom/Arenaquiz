import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Exporta os recursos do build Vite para um HTML autônomo que funciona por file://.
const dist = resolve('dist');
let html = await readFile(resolve(dist, 'index.html'), 'utf8');
const script = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/);
const stylesheet = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/);
if (!script || !stylesheet) throw new Error('Build incompleto: execute npm run build primeiro.');
const assetPath = (url) => {
  const path = resolve(dist, url.replace(/^\//, ''));
  if (!path.startsWith(`${dist}/`)) throw new Error('Recurso fora da pasta de build.');
  return path;
};
const js = await readFile(assetPath(script[1]), 'utf8');
const css = await readFile(assetPath(stylesheet[1]), 'utf8');
if (/\bimport\s*\(/.test(js) || /import\.meta/.test(js)) throw new Error('O build contém módulos externos; a exportação precisa ser atualizada.');
html = html.replace(script[0], () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(stylesheet[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
const favicon = await readFile(resolve(dist, 'favicon.svg'));
html = html.replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${favicon.toString('base64')}"`);
await mkdir('downloads', {recursive:true});
await writeFile('downloads/Arena-Quiz.html', html);
console.log('Versão portátil criada: downloads/Arena-Quiz.html. Abra esse arquivo no Edge ou Chrome.');
