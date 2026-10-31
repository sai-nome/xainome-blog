import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir, stat, access, mkdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectKey } from '../../worker/redirect-path.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const publicDir = resolve(root, 'public');
const source = JSON.parse(await readFile(resolve(root, 'migration/wordpress-urls.json'), 'utf8'));
// Hugo is the authority for permalinks: never reconstruct them from dates/slugs.
function parseCSV(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if (c === '\n' && !quoted) {
      row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = '';
    } else value += c;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift();
  return rows.map(values => Object.fromEntries(headers.map((key, i) => [key, values[i]])));
}
const pages = parseCSV(execFileSync('hugo', ['list', 'published'], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
const byFile = new Map(pages.map(page => [page.path.replaceAll('\\', '/'), page]));
const canonicalPaths = new Set(pages.map(page => redirectKey(new URL(page.permalink).pathname)));
const paths = Object.create(null), postIds = Object.create(null), pageIds = Object.create(null);
const rows = [['wordpress_id', 'type', 'title', 'old_url', 'new_url', 'status', 'match', 'hugo_file']];
const sitemap = await readFile(resolve(publicDir, 'sitemap.xml'), 'utf8');
const unescapeHTML = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
function targetFile(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const filename = resolve(publicDir, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (!filename.startsWith(publicDir + sep)) throw new Error('Target outside public: ' + url);
  return filename;
}
function add(sourcePath, target) {
  const key = redirectKey(sourcePath), targetKey = redirectKey(new URL(target).pathname);
  if (!key || key === '/' || key === targetKey) throw new Error('Invalid/self redirect: ' + sourcePath);
  if (canonicalPaths.has(key)) throw new Error('Redirect shadows a published page: ' + sourcePath);
  if (paths[key] && paths[key] !== target) throw new Error('Conflicting redirect: ' + sourcePath);
  paths[key] = target;
}
for (const record of source.records) {
  const page = byFile.get(record.contentFile);
  if (!page) throw new Error('Missing/unpublished redirect target: ' + record.contentFile);
  const old = new URL(record.oldUrl), target = new URL(page.permalink);
  if (old.hostname !== target.hostname || target.protocol !== 'https:' || old.search || old.hash) throw new Error('Invalid migration origin: ' + record.oldUrl);
  await access(targetFile(page.permalink));
  if (!unescapeHTML(sitemap).includes('<loc>' + page.permalink + '</loc>')) throw new Error('Target absent from sitemap: ' + page.permalink);
  add(old.pathname, page.permalink);
  const ids = record.type === 'post' ? postIds : pageIds;
  if (ids[record.id]) throw new Error('Duplicate WordPress ID: ' + record.id);
  ids[record.id] = page.permalink;
  rows.push([record.id, record.type, record.title, record.oldUrl, page.permalink, '301', record.match, record.contentFile]);
}
// Inspect actual Hugo output so URL sanitization and any future alias templates
// are reflected in the HTTP redirects. Existing meta-refresh pages must not win.
let aliases = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = resolve(directory, entry.name);
    if (entry.isDirectory()) { await scan(filename); continue; }
    if (!entry.name.endsWith('.html') || (await stat(filename)).size > 8192) continue;
    const html = await readFile(filename, 'utf8');
    if (!/<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b/i.test(html)) continue;
    const href = html.match(/<link\b[^>]*rel\s*=\s*["']?canonical["']?\s+href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    if (!href) throw new Error('Alias without canonical URL: ' + filename);
    const target = unescapeHTML(href[1] || href[2] || href[3]);
    if (new URL(target).origin !== new URL(pages[0].permalink).origin) throw new Error('External alias: ' + filename);
    await access(targetFile(target));
    const pathname = '/' + relative(publicDir, filename).split(sep).join('/');
    add(pathname, target); aliases++;
  }
}
await scan(publicDir);
for (const target of Object.values(paths)) {
  if (paths[redirectKey(new URL(target).pathname)]) throw new Error('Redirect chain: ' + target);
}
const sorted = object => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
await mkdir(resolve(root, 'worker'), { recursive: true });
await writeFile(resolve(root, 'worker/redirects.json'), JSON.stringify({ paths: sorted(paths), postIds, pageIds }, null, 2) + '\n');
const csv = rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\r\n');
await writeFile(resolve(root, 'docs/wordpress-redirects.csv'), '\uFEFF' + csv + '\r\n');
console.log('Generated ' + source.records.length + ' WordPress mappings and ' + aliases + ' Hugo alias redirects.');
