import { useState, useCallback, useRef } from 'react';
import './index.css';
import './App.css';

import { useWatchers } from './hooks/useWatchers';
import WatcherCard from './components/WatcherCard';
import WatcherModal from './components/WatcherModal';
import GlobalControls from './components/GlobalControls';
import Toast from './components/Toast';

export default function App() {
  // ---- toast ----
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  // ---- notification permission ----
  const [notifPerm, setNotifPerm] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  async function requestNotifPerm() {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPerm(result);
  }

  // ---- watcher hook ----
  const {
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
  } = useWatchers(showToast);

  // ---- modal state ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWatcher, setEditingWatcher] = useState(null);

  function openAddModal() {
    setEditingWatcher(null);
    setModalOpen(true);
  }

  function openEditModal(watcher) {
    setEditingWatcher(watcher);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingWatcher(null);
  }

  function handleSave(formData) {
    if (editingWatcher) {
      updateWatcher(editingWatcher.id, formData);
    } else {
      addWatcher(formData);
    }
    closeModal();
  }

  function handleDelete(id) {
    deleteWatcher(id);
  }

  return (
    <div className="app-wrapper">
      <div className="app-inner">

        {/* ---- Header ---- */}
        <header className="app-header">
          <div className="header-top">
            <div>
              <h1 className="app-title">
                <span className="app-title-icon">🚀</span>
                Deploy Status Watcher
              </h1>
              <p className="app-sub">
                Track multiple endpoints — get notified the moment your deploy goes live.
              </p>
            </div>
            <button className="btn btn--primary add-btn" onClick={openAddModal}>
              + Add Watcher
            </button>
          </div>
        </header>

        {/* ---- Notification Banner ---- */}
        {notifPerm === 'granted' ? (
          <div className="notif-banner notif-banner--granted">
            <span className="notif-banner__icon">✅</span>
            <span>Chrome notifications enabled — you'll be alerted on deploy.</span>
          </div>
        ) : notifPerm === 'default' ? (
          <div className="notif-banner">
            <span className="notif-banner__icon">🔔</span>
            <span>Enable notifications to get alerted when a deploy completes, even in other tabs.</span>
            <button className="notif-banner__btn" onClick={requestNotifPerm}>Enable</button>
          </div>
        ) : notifPerm === 'denied' ? (
          <div className="notif-banner notif-banner--denied">
            <span className="notif-banner__icon">🔕</span>
            <span>Notifications blocked — enable them in browser settings for deploy alerts.</span>
          </div>
        ) : null}

        {/* ---- Global Controls ---- */}
        {watchers.length > 0 && (
          <GlobalControls onStartAll={startAll} onStopAll={stopAll} />
        )}

        {/* ---- Watcher Tiles Grid ---- */}
        {watchers.length === 0 ? (
          <div className="empty-state" onClick={openAddModal} style={{ cursor: 'pointer' }}>
            <div className="empty-state__icon">📡</div>
            <div className="empty-state__text">
              No watchers yet.<br />
              <span className="empty-cta">Click here or "+ Add Watcher" to get started.</span>
            </div>
          </div>
        ) : (
          <div className="tile-grid">
            {watchers.map((watcher) => (
              <WatcherCard
                key={watcher.id}
                watcher={watcher}
                runtime={getRuntime(watcher.id)}
                getDomain={getDomain}
                onStart={startWatcher}
                onStop={stopWatcher}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>

      {/* ---- Add / Edit Modal ---- */}
      <WatcherModal
        isOpen={modalOpen}
        editingWatcher={editingWatcher}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* ---- Toast ---- */}
      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
