import './WatcherModal.css';
import WatcherForm from './WatcherForm';

export default function WatcherModal({ isOpen, editingWatcher, onSave, onClose }) {
  if (!isOpen) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={editingWatcher ? 'Edit watcher' : 'Add watcher'}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <WatcherForm
          editingWatcher={editingWatcher}
          onSave={onSave}
          onCancel={onClose}
          insideModal
        />
      </div>
    </div>
  );
}
