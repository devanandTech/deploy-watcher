/**
 * Robust fetch utility with automatic fallback to Vite local proxy
 * and public CORS proxies to bypass browser CORS restrictions.
 */
export async function fetchWithFallback(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  // 1. Attempt direct browser fetch first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${rawText || 'Endpoint returned error'}`);
    }
    return { text: rawText, viaProxy: false };
  } catch (directErr) {
    const isCorsOrNetwork =
      directErr.name === 'AbortError' ||
      directErr.name === 'TypeError' ||
      directErr.message?.toLowerCase().includes('failed to fetch') ||
      directErr.message?.toLowerCase().includes('cors') ||
      directErr.message?.toLowerCase().includes('networkerror');

    // If it's an HTTP 4xx/5xx returned by the server, don't proxy
    if (!isCorsOrNetwork && directErr.message?.startsWith('HTTP ')) {
      throw directErr;
    }

    console.warn(`[fetcher] Direct fetch to "${url}" failed (${directErr.message}). Retrying via local proxy...`);
  }

  // 2. Fallback to Vite dev server proxy (/api/proxy?url=...)
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(proxyUrl, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await res.text();
    if (res.ok) {
      return { text: rawText, viaProxy: 'local' };
    }
  } catch (proxyErr) {
    console.warn(`[fetcher] Local proxy failed (${proxyErr.message}). Retrying via public CORS proxy...`);
  }

  // 3. Fallback to public CORS proxy (e.g. allorigins or corsproxy)
  try {
    const publicUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(publicUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const rawText = await res.text();
    if (res.ok) {
      return { text: rawText, viaProxy: 'public' };
    }
    throw new Error(`Public proxy returned HTTP ${res.status}`);
  } catch (publicErr) {
    throw new Error(
      `Unable to reach "${url}". Direct fetch blocked by CORS, and proxies failed (${publicErr.message}).`
    );
  }
}
