import './GlobalControls.css';

export default function GlobalControls({ onStartAll, onStopAll }) {
  return (
    <div className="global-controls">
      <button className="btn btn--secondary" onClick={onStartAll}>
        <span className="btn-icon">▶</span> Start All
      </button>
      <button className="btn btn--secondary" onClick={onStopAll}>
        <span className="btn-icon">■</span> Stop All
      </button>
    </div>
  );
}
