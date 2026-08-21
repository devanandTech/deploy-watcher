import { useRef, useState, useCallback, useEffect } from 'react';
import { parseResponsePayload, getValueByPath, flattenPayload } from '../utils/parser';
import { getDomain, requestNotifyPermission, fireLiveAlert } from '../utils/notify';

const STORAGE_KEY = 'watchers-list';

function uid() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToStorage(watchers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchers));
  } catch (e) {
    console.error('Storage save failed', e);
  }
}

/**
 * Core hook that manages all watcher state, localStorage persistence,
 * and polling logic — mirrors all functionality from the original HTML app.
 */
export function useWatchers(showToast) {
  // Persisted watcher configs: { id, name, url, field, interval, authHeader }
  const [watchers, setWatchers] = useState(() => loadFromStorage());

  // Keep a ref in sync with the state so closures (setInterval callbacks) always see fresh data
  const watchersRef = useRef(watchers);
  function setWatchersSync(updater) {
    setWatchers((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      watchersRef.current = next;
      return next;
    });
  }

  // Transient per-watcher runtime state (NOT persisted)
  // { running, baseline, checkCount, lastValue, completed, log, parsedLines, statusState, statusMain, statusSub }
  const runtimeRef = useRef({});

  // Initialize runtime entries for any watchers loaded from storage
  useEffect(() => {
    watchersRef.current.forEach((w) => {
      if (!runtimeRef.current[w.id]) {
        runtimeRef.current[w.id] = makeRuntime();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force re-renders when runtime state changes
  const [tick, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  function makeRuntime() {
    return {
      running: false,
      baseline: null,
      checkCount: 0,
      timerId: null,
      lastValue: null,
      completed: false,
      log: [],       // [{ time, msg, cls }]
      parsedLines: [], // [{ key, value }]
      statusState: 'idle',
      statusMain: 'Idle',
      statusSub: 'click Start to begin watching',
    };
  }

  function getRT(id) {
    if (!runtimeRef.current[id]) {
      runtimeRef.current[id] = makeRuntime();
    }
    return runtimeRef.current[id];
  }

  function logFor(id, msg, cls = '') {
    const rt = getRT(id);
    rt.log.unshift({ time: new Date().toLocaleTimeString(), msg, cls });
    if (rt.log.length > 30) rt.log.pop();
  }

  function setStatus(id, state, main, sub) {
    const rt = getRT(id);
    rt.statusState = state;
    rt.statusMain = main;
    rt.statusSub = sub;
  }

  async function checkWatcher(id, watcherRef) {
    const w = watcherRef.current;
    if (!w) return;
    const rt = getRT(id);
    if (!rt.running) return;

    rt.checkCount++;
    try {
      const headers = {};
      if (w.authHeader) headers['Authorization'] = w.authHeader;
      const res = await fetch(w.url, { headers });
      const rawText = await res.text();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${rawText || 'Endpoint not found'}`);
      }

      const parsedPayload = parseResponsePayload(rawText);

      // Update parsed lines for response preview
      rt.parsedLines = flattenPayload(parsedPayload);

      const value = getValueByPath(parsedPayload, w.field);
      if (value === undefined) throw new Error(`Field "${w.field}" not found in response`);

      const printableValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (rt.baseline === null) {
        rt.baseline = printableValue;
        rt.lastValue = printableValue;
        logFor(id, `Baseline captured — ${w.field}: "${printableValue}"`, 'ok');
        setStatus(id, 'pending', 'Watching…', `Baseline "${w.field}" = "${printableValue}"`);
      } else if (printableValue !== rt.baseline) {
        logFor(id, `CHANGE DETECTED — ${w.field}: "${rt.baseline}" → "${printableValue}"`, 'ok');
        logFor(id, 'Watcher stopped automatically after deploy.', 'ok');
        fireLiveAlert(w, rt.baseline, printableValue, showToast);
        const oldVal = rt.baseline;
        rt.baseline = printableValue;
        rt.lastValue = printableValue;
        rt.completed = true;
        stopWatcher(id);
        setStatus(id, 'live', 'Deployed ✅', `${w.field} changed: "${oldVal}" → "${printableValue}" · watcher stopped`);
      } else {
        rt.lastValue = printableValue;
        logFor(id, `Check #${rt.checkCount}: no change (${w.field}: "${printableValue}")`);
        setStatus(id, 'pending', 'No change yet', `Last checked ${new Date().toLocaleTimeString()} · ${w.field}: "${printableValue}"`);
      }
    } catch (err) {
      logFor(id, `ERROR — ${err.message}`, 'err');
      setStatus(id, 'error', 'Error', err.message);
    }

    rerender();
  }

  function startWatcher(id) {
    const watcher = watchersRef.current.find((w) => w.id === id);
    if (!watcher) return;
    const rt = getRT(id);
    if (rt.running) return;

    requestNotifyPermission();
    rt.running = true;
    rt.completed = false;
    rt.baseline = null;
    rt.checkCount = 0;

    // Use a plain object ref so the interval callback always reads the latest config
    const watcherRef = { current: watcher };

    checkWatcher(id, watcherRef);
    rt.timerId = setInterval(() => checkWatcher(id, watcherRef), watcher.interval * 1000);
    rerender();
  }

  function stopWatcher(id) {
    const rt = getRT(id);
    if (rt.timerId) clearInterval(rt.timerId);
    rt.timerId = null;
    rt.running = false;
    rerender();
  }

  function startAll() {
    watchersRef.current.forEach((w) => startWatcher(w.id));
  }

  function stopAll() {
    watchersRef.current.forEach((w) => stopWatcher(w.id));
  }

  function addWatcher(data) {
    const id = uid();
    const newWatcher = { id, ...data };
    runtimeRef.current[id] = makeRuntime();
    setWatchersSync((prev) => {
      const updated = [...prev, newWatcher];
      saveToStorage(updated);
      return updated;
    });
    showToast('✅ Watcher added');
  }

  function updateWatcher(id, data) {
    const rt = getRT(id);
    if (rt.running) stopWatcher(id);
    setWatchersSync((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, ...data } : w));
      saveToStorage(updated);
      return updated;
    });
    showToast('✅ Watcher updated');
  }

  function deleteWatcher(id) {
    stopWatcher(id);
    delete runtimeRef.current[id];
    setWatchersSync((prev) => {
      const updated = prev.filter((w) => w.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }

  function getRuntime(id) {
    return runtimeRef.current[id] || makeRuntime();
  }

  return {
    watchers,
    getRuntime,
    getDomain,
    startWatcher,
    stopWatcher,
    startAll,
    stopAll,
    addWatcher,
    updateWatcher,
    deleteWatcher,
  };
}
