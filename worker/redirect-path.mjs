// One decode makes lower/upper percent escapes and literal Japanese equivalent.
export function redirectKey(pathname) {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes('\\') || /%2f|%5c/i.test(pathname)) return null;
    return decoded.normalize('NFC').replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
  } catch {
    return null;
  }
}
