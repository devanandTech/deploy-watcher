import { useState } from 'react';
import './WatcherCard.css';

function StatusDot({ state }) {
  return <span className={`dot dot--${state}`} aria-hidden="true" />;
}

function StatusBadge({ state, label }) {
  return <span className={`status-badge status-badge--${state}`}>{label}</span>;
}

export default function WatcherCard({ watcher, runtime, getDomain, onStart, onStop, onEdit, onDelete }) {
  const [logOpen, setLogOpen] = useState(false);
  const rt = runtime;
  const domain = getDomain(watcher.url);
  const displayName = watcher.name || domain;

  const dotState = rt.completed
    ? 'live'
    : rt.running
    ? 'pending'
    : rt.statusState === 'error'
    ? 'error'
    : 'idle';

  const badgeLabel =
    rt.completed ? 'Deployed ✅'
    : rt.running  ? 'Watching…'
    : rt.statusState === 'error' ? 'Error'
    : 'Idle';

  return (
    <div className={`watcher-tile${rt.completed ? ' watcher-tile--deployed' : ''}${rt.running ? ' watcher-tile--running' : ''}${rt.statusState === 'error' ? ' watcher-tile--error' : ''}`}>

      {/* Top accent bar */}
      <div className="tile-bar" />

      {/* Header row */}
      <div className="tile-header">
        <StatusDot state={dotState} />
        <div className="tile-name" title={displayName}>{displayName}</div>
        <div className="tile-actions">
          <button
            className="tile-icon-btn tile-icon-btn--edit"
            onClick={() => onEdit(watcher)}
            title="Edit"
          >✏️</button>
          <button
            className="tile-icon-btn tile-icon-btn--delete"
            onClick={() => onDelete(watcher.id)}
            title="Delete"
          >🗑️</button>
        </div>
      </div>

      {/* URL */}
      <div className="tile-url" title={watcher.url}>{domain}</div>

      {/* Meta chips */}
      <div className="tile-chips">
        <span className="chip">⏱ {watcher.interval}s</span>
        <span className="chip">🔑 <code>{watcher.field}</code></span>
      </div>

      {/* Status row */}
      <div className="tile-status">
        <StatusBadge state={dotState} label={badgeLabel} />
        {rt.statusSub && (
          <span className="tile-status-sub" title={rt.statusSub}>{rt.statusSub}</span>
        )}
      </div>

      {/* Primary action button */}
      <div className="tile-primary-action">
        {rt.running ? (
          <button className="btn btn--secondary btn--sm tile-btn-full" onClick={() => onStop(watcher.id)}>
            ■ Stop
          </button>
        ) : (
          <button className="btn btn--primary btn--sm tile-btn-full" onClick={() => onStart(watcher.id)}>
            {rt.completed ? '↺ Restart' : '▶ Start'}
          </button>
        )}
      </div>

      {/* Expandable log */}
      <details className="tile-details" onToggle={(e) => setLogOpen(e.target.open)}>
        <summary className="tile-details-summary">
          <span>{logOpen ? '▾' : '▸'}</span> Log &amp; response
          {rt.log.length > 0 && <span className="log-badge">{rt.log.length}</span>}
        </summary>

        <div className="tile-details-body">
          <div className="details-section">
            <div className="details-label">Activity</div>
            <div className="log-box">
              {rt.log.length === 0 ? (
                <div className="log-empty">No activity yet.</div>
              ) : (
                rt.log.map((entry, i) => (
                  <div key={i} className={`log-line${entry.cls ? ` log-line--${entry.cls}` : ''}`}>
                    <span className="log-time">[{entry.time}]</span> {entry.msg}
                  </div>
                ))
              )}
            </div>
          </div>

          {rt.parsedLines && rt.parsedLines.length > 0 && (
            <div className="details-section">
              <div className="details-label">Last Response</div>
              <div className="parsed-box">
                {rt.parsedLines.map((line, i) => (
                  <div key={i} className="parsed-line">
                    <span className="parsed-key">{line.key}</span>
                    <span className="parsed-colon">:</span>
                    <span className="parsed-value">{line.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
