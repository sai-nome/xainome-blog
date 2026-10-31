import redirects from './redirects.json';
import { redirectKey } from './redirect-path.mjs';

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
    const url = new URL(request.url);
    let target;
    let legacyId = false;
    if ((url.pathname === '/' || url.pathname === '/index.php') &&
        (url.searchParams.has('p') || url.searchParams.has('page_id'))) {
      legacyId = true;
      const param = url.searchParams.has('p') ? 'p' : 'page_id';
      const ids = param === 'p' ? redirects.postIds : redirects.pageIds;
      const id = url.searchParams.get(param);
      if (/^[1-9]\d*$/.test(id) && Object.hasOwn(ids, id)) target = ids[id];
      // Unknown/private/deleted IDs must not turn into a homepage soft 404.
      if (!target) return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404 });
    } else {
      const key = redirectKey(url.pathname);
      if (key === null) return new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404 });
      if (Object.hasOwn(redirects.paths, key)) target = redirects.paths[key];
    }
    if (!target) return env.ASSETS.fetch(request);
    const destination = new URL(target);
    destination.search = url.search;
    if (legacyId) {
      destination.searchParams.delete('p');
      destination.searchParams.delete('page_id');
    }
    return new Response(null, {
      status: 301,
      headers: { Location: destination.href },
    });
  },
};
