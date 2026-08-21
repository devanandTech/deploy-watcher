import { useState, useEffect } from 'react';
import './WatcherForm.css';

const DEFAULT_FORM = {
  name: '',
  url: '',
  field: 'upTime',
  interval: 4,
  authHeader: '',
};

export default function WatcherForm({ editingWatcher, onSave, onCancel, insideModal }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (editingWatcher) {
      setForm({
        name: editingWatcher.name || '',
        url: editingWatcher.url || '',
        field: editingWatcher.field || 'upTime',
        interval: editingWatcher.interval || 4,
        authHeader: editingWatcher.authHeader || '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editingWatcher]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.url.trim()) return;
    onSave({
      name: form.name.trim(),
      url: form.url.trim(),
      field: form.field.trim() || 'upTime',
      interval: Math.max(2, parseInt(form.interval, 10) || 4),
      authHeader: form.authHeader.trim(),
    });
    if (!editingWatcher) setForm(DEFAULT_FORM);
  }

  const isEditing = !!editingWatcher;

  // When inside a modal the parent modal-box already provides padding/bg
  const wrapClass = insideModal ? 'watcher-form watcher-form--modal' : 'panel watcher-form';

  return (
    <div className={wrapClass}>
      <div className="form-title">
        {isEditing ? (
          <><span className="form-title__icon">✏️</span> Edit watcher</>
        ) : (
          <><span className="form-title__icon">➕</span> Add a watcher</>
        )}
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="field">
          <label htmlFor="wName">Label <span className="field__hint">(optional — defaults to domain)</span></label>
          <input
            id="wName"
            name="name"
            type="text"
            placeholder="e.g. Prisma API"
            value={form.name}
            onChange={handleChange}
            autoFocus={insideModal}
          />
        </div>

        <div className="field">
          <label htmlFor="wUrl">API URL <span className="field__required">*</span></label>
          <input
            id="wUrl"
            name="url"
            type="text"
            placeholder="https://api.example.com/v1/status"
            value={form.url}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="wField">
              Field to track <span className="field__hint">(supports deep paths like: info.version)</span>
            </label>
            <input
              id="wField"
              name="field"
              type="text"
              value={form.field}
              onChange={handleChange}
            />
          </div>
          <div className="field field--narrow">
            <label htmlFor="wInterval">Interval <span className="field__hint">(seconds)</span></label>
            <input
              id="wInterval"
              name="interval"
              type="number"
              min="2"
              value={form.interval}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="wAuth">Auth header <span className="field__hint">(optional)</span></label>
          <input
            id="wAuth"
            name="authHeader"
            type="text"
            placeholder="e.g. Bearer xyz — leave blank if none"
            value={form.authHeader}
            onChange={handleChange}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            {isEditing ? 'Save Changes' : 'Add Watcher'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <div className="storage-note">
          💾 Watchers persist across reloads via browser localStorage.
        </div>
      </form>
    </div>
  );
}
