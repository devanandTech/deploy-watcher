/**
 * Parses raw HTTP response text into a structured payload object.
 * Supports JSON and plain-text key:value formats.
 */
export function parseResponsePayload(text) {
  const cleanText = text.replace(/^\uFEFF/, '').trim();

  try {
    return { type: 'json', data: JSON.parse(cleanText) };
  } catch {
    // fall through to key:value parsing
  }

  const flatResult = {};
  cleanText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const idx = trimmed.indexOf(':');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) flatResult[key] = value;
  });

  return { type: 'text', data: flatResult };
}

/**
 * Resolves a dot-path value from a parsed payload.
 * e.g. "info.version" works on nested JSON.
 */
export function getValueByPath(payloadObj, pathString) {
  if (payloadObj.type === 'text') {
    return payloadObj.data[pathString];
  }
  try {
    return pathString.split('.').reduce((acc, part) => {
      return acc !== null && acc !== undefined ? acc[part] : undefined;
    }, payloadObj.data);
  } catch {
    return undefined;
  }
}

/**
 * Flattens a parsed payload into an array of { key, value } pairs
 * suitable for rendering in a response preview.
 */
export function flattenPayload(payloadObj) {
  const lines = [];

  if (payloadObj.type === 'json') {
    const walk = (obj, prefix = '') => {
      if (obj === null || obj === undefined) return;
      if (typeof obj !== 'object' || Array.isArray(obj)) {
        lines.push({ key: prefix, value: JSON.stringify(obj) });
        return;
      }
      Object.entries(obj).forEach(([k, v]) => {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          walk(v, path);
        } else {
          lines.push({ key: path, value: JSON.stringify(v) });
        }
      });
    };
    walk(payloadObj.data);
  } else {
    Object.entries(payloadObj.data).forEach(([k, v]) => {
      lines.push({ key: k, value: v });
    });
  }

  return lines;
}
