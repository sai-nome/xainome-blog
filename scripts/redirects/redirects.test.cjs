const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
const root = path.resolve(__dirname, '../..');
const mapping = require('../../worker/redirects.json');
const source = require('../../migration/wordpress-urls.json');
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
let mf;
before(async () => {
  const { binding, run_worker_first, html_handling, not_found_handling } = config.assets;
  assert.equal(run_worker_first, true, 'Legacy alias HTML must not bypass the Worker');
  mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: 'xainome-blog',
    modulesRoot: root,
    modules: [
      { type: 'ESModule', path: path.join(root, config.main) },
      { type: 'ESModule', path: path.join(root, 'worker/redirect-path.mjs') },
      { type: 'ESModule', path: path.join(root, 'worker/redirects.json'), contents: 'export default ' + JSON.stringify(mapping) },
    ],
    compatibilityDate: config.compatibility_date,
    assets: { directory: path.join(root, config.assets.directory), binding, run_worker_first,
      routerConfig: { has_user_worker: true },
      assetConfig: { html_handling, not_found_handling } },
  }] }));
  await mf.ready;
});
after(async () => { await mf?.dispose(); });
const request = async (url, options = {}) => {
  const response = await mf.dispatchFetch(new URL(url, 'https://xainome.blog').href, { redirect: 'manual', ...options });
  assert.notEqual(response.status, 500, 'Worker error for ' + url + ': ' + (response.status === 500 ? await response.clone().text() : ''));
  return response;
};

test('every exported public article redirects once to a real canonical page', async () => {
  assert.equal(source.records.length, 265);
  assert.equal(source.records.filter(r => r.type === 'post').length, 261);
  assert.equal(source.records.filter(r => r.match === 'reviewed-content').length, 2);
  for (const record of source.records) {
    const target = (record.type === 'post' ? mapping.postIds : mapping.pageIds)[record.id];
    const response = await request(record.oldUrl);
    assert.equal(response.status, 301, record.oldUrl);
    assert.equal(response.headers.get('location'), target, record.oldUrl);
    const destination = await request(target);
    assert.equal(destination.status, 200, target);
    assert.equal(destination.headers.get('location'), null, target);
    const html = await destination.text();
    assert.ok(!/http-equiv=["']?refresh/i.test(html), target);
    const canonical = html.match(/<link\b[^>]*rel=["']?canonical["']?\s+href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    assert.equal(canonical?.slice(1).find(Boolean), target, target);
  }
});

test('all legacy paths support Japanese, percent-escape case, slash and index.html variants', async () => {
  for (const [old, target] of Object.entries(mapping.paths)) {
    const encoded = old.split('/').map(encodeURIComponent).join('/');
    const variants = new Set([old, old + '/', encoded, encoded + '/', encoded.replace(/%[A-F0-9]{2}/g, s => s.toLowerCase()) + '/', encoded + '/index.html']);
    for (const variant of variants) {
      const response = await request(variant, { method: 'HEAD' });
      assert.equal(response.status, 301, variant);
      assert.equal(response.headers.get('location'), target, variant);
      assert.equal(await response.text(), '');
    }
  }
});

test('WordPress shortlinks go directly to the final URL and retain tracking parameters', async () => {
  for (const [param, ids] of [['p', mapping.postIds], ['page_id', mapping.pageIds]]) {
    for (const [id, target] of Object.entries(ids)) {
      for (const pathname of ['/', '/index.php']) {
        const response = await request(pathname + '?utm_source=google&' + param + '=' + id);
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('location'), target + '?utm_source=google');
      }
    }
  }
  const response = await request('/hello-world/?utm_source=google');
  assert.equal(response.headers.get('location'), mapping.paths['/hello-world'] + '?utm_source=google');
});

test('unmatched URLs, invalid encoding and unknown IDs cannot redirect to the homepage', async () => {
  for (const url of ['/not-a-wordpress-post/', '/?p=999999999', '/?page_id=999999999', '/?p=__proto__', '/?p=0', '/%ZZ/', '/hello-world%2F']) {
    const response = await request(url);
    assert.equal(response.status, 404, url);
    assert.equal(response.headers.get('location'), null, url);
  }
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/sitemap.xml')).status, 200);
  assert.equal((await request('/ads.txt')).status, 200);
  assert.notEqual((await request('/hello-world/', { method: 'POST' })).status, 301);
});
