#!/usr/bin/env node
/*
 * Copies the Carmel Valley Ranch theme stylesheet (and, optionally, its web
 * fonts and the page's photos) into this repository so the prototype no
 * longer depends on carmelvalleyranch.com being reachable.
 *
 * Why: browsers only load web fonts from another domain when that domain
 * allows it, and carmelvalleyranch.com does not. Without a local copy the
 * prototype shows fallback fonts for headings and body text.
 *
 * Usage (Node 18+):
 *   node scripts/vendor-theme.mjs             stylesheet + theme images, no fonts
 *   node scripts/vendor-theme.mjs --fonts     also copy the web fonts (see README: licensing)
 *   node scripts/vendor-theme.mjs --images    also copy page photos into uploads/site/
 *
 * It can also be run from the "Copy theme files" GitHub Action.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEME_BASE = 'https://carmelvalleyranch.com/wp-content/themes/carmelvalleyranch/assets/';
const CSS_URL = THEME_BASE + 'stylesheets/app.css';
const LOCAL_THEME = 'assets/theme/';
const args = new Set(process.argv.slice(2));
const withFonts = args.has('--fonts');
const withImages = args.has('--images');

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'cvr-golf-academy-prototype/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function save(rel, buf) {
  const file = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
}

const isFont = (u) => /\.(woff2?|ttf|otf|eot)(\?|#|$)/i.test(u);

async function vendorStylesheet() {
  console.log('Downloading stylesheet');
  let css = (await download(CSS_URL)).toString('utf8');
  const refs = new Set();
  css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (_, __, ref) => { refs.add(ref); return _; });

  let copied = 0, skipped = 0;
  for (const ref of refs) {
    if (/^(data:|#)/i.test(ref)) continue;
    const abs = new URL(ref, CSS_URL);
    const clean = abs.origin + abs.pathname;
    if (!clean.startsWith(THEME_BASE)) {
      // Something outside the theme folder: point at it absolutely so it still loads.
      css = css.split(ref).join(abs.href);
      continue;
    }
    if (isFont(clean) && !withFonts) {
      css = css.split(ref).join(abs.href);
      skipped++;
      continue;
    }
    const rel = LOCAL_THEME + clean.slice(THEME_BASE.length);
    try {
      await save(rel, await download(clean));
      copied++;
    } catch (e) {
      console.warn('  could not copy', clean, '-', e.message);
      css = css.split(ref).join(abs.href);
    }
  }
  await save(LOCAL_THEME + 'stylesheets/app.css', Buffer.from(css));
  console.log(`  copied ${copied} theme files${skipped ? `, left ${skipped} font files on carmelvalleyranch.com (use --fonts to copy them)` : ''}`);

  const indexPath = path.join(ROOT, 'index.html');
  let html = await fs.readFile(indexPath, 'utf8');
  html = html.replace(/href="https:\/\/carmelvalleyranch\.com\/wp-content\/themes\/carmelvalleyranch\/assets\/stylesheets\/app\.css"/,
    `href="${LOCAL_THEME}stylesheets/app.css"`);
  await fs.writeFile(indexPath, html);
  console.log('  index.html now uses the local stylesheet');
}

async function vendorImages() {
  console.log('Copying page photos');
  const map = new Map();
  async function local(url) {
    if (map.has(url)) return map.get(url);
    const m = /^https:\/\/carmelvalleyranch\.com\/wp-content\/uploads\/(.+)$/.exec(url);
    if (!m) return url;
    const rel = 'uploads/site/' + m[1].replace(/\?.*$/, '');
    await save(rel, await download(url));
    map.set(url, rel);
    return rel;
  }
  const files = ['content/published.json'];
  try {
    for (const f of await fs.readdir(path.join(ROOT, 'content/drafts'))) if (f.endsWith('.json')) files.push('content/drafts/' + f);
  } catch { /* no drafts yet */ }
  for (const f of files) {
    const p = path.join(ROOT, f);
    const data = JSON.parse(await fs.readFile(p, 'utf8'));
    for (const b of data.blocks || []) if (typeof b.image === 'string') b.image = await local(b.image);
    await fs.writeFile(p, JSON.stringify(data, null, 2) + '\n');
  }
  const indexPath = path.join(ROOT, 'index.html');
  let html = await fs.readFile(indexPath, 'utf8');
  for (const m of html.matchAll(/<img src="(https:\/\/carmelvalleyranch\.com\/wp-content\/uploads\/[^"]+)"/g)) {
    html = html.split(m[1]).join(await local(m[1]));
  }
  await fs.writeFile(indexPath, html);
  console.log(`  copied ${map.size} photos into uploads/site/`);
}

try {
  await vendorStylesheet();
  if (withImages) await vendorImages();
  console.log('Done.');
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
