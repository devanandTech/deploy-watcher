/**
 * Notification utilities for deploy alerts.
 */

export function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function requestNotifyPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * Fires a Chrome OS-level notification when a deploy is detected.
 * Falls back to the in-app toast callback if permission isn't granted.
 */
export function fireLiveAlert(watcher, oldVal, newVal, onFallback) {
  const domain = getDomain(watcher.url);
  const title = `🚀 ${domain} — deployed!`;
  const body = `${watcher.field} changed: "${oldVal}" → "${newVal}". Watching stopped.`;

  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      tag: `deploy-${watcher.id}`,  // replaces earlier notification for same watcher
      requireInteraction: true,      // stays on screen until dismissed
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } else {
    // In-app fallback
    if (onFallback) {
      const label = watcher.name ? `${watcher.name} (${domain})` : domain;
      onFallback(`🚀 ${label} just went live! (enable notifications to see this on other tabs)`);
    }
  }
}
