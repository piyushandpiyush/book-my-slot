import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

export function Modal({ title, onClose, children, drawer = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  // Portal to <body>: a transformed/animated ancestor would otherwise become the containing block for `position: fixed`.
  return createPortal(
    <div className={`modal-backdrop ${drawer ? 'drawer' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
export const Drawer = (props) => <Modal drawer {...props} />;

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="muted">{message}</p>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1.2rem' }}>
        <button className="btn ghost" onClick={onCancel}>Keep it</button>
        <button className={`btn ${danger ? 'danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

const STATUS = {
  PENDING: ['warn', 'Pending'], CONFIRMED: ['info', 'Confirmed'], ARRIVED: ['purple', 'Arrived'], IN_SERVICE: ['coral', 'In service'],
  COMPLETED: ['ok', 'Completed'], CANCELLED: ['bad', 'Cancelled'], NO_SHOW: ['grey', 'No show'],
  ACTIVE: ['ok', 'Active'], REJECTED: ['bad', 'Rejected'], SUSPENDED: ['bad', 'Suspended'],
};
export const StatusBadge = ({ status }) => {
  const [cls, label] = STATUS[status] || ['grey', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};
export const SourceTag = ({ source }) => (
  source === 'WALK_IN'
    ? <span className="tag walkin"><Icon name="walk" size={13} /> Walk-in</span>
    : <span className="tag"><Icon name="zap" size={13} /> Online</span>
);

export const Skeleton = ({ h = 20, w = '100%', r }) => <div className="skel" style={{ height: h, width: w, borderRadius: r }} />;
export const CardSkeletons = ({ n = 6 }) => (
  <div className="grid">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="card"><Skeleton h={170} r={0} /><div className="card-body"><Skeleton h={20} w="70%" /><Skeleton h={14} w="40%" /><Skeleton h={14} w="55%" /><Skeleton h={38} r={999} /></div></div>
    ))}
  </div>
);
export const ListSkeleton = ({ n = 4, h = 84 }) => <div className="col">{Array.from({ length: n }, (_, i) => <Skeleton key={i} h={h} r={16} />)}</div>;
export const Spinner = () => <div className="container page"><ListSkeleton n={3} /></div>;

export const ErrorBox = ({ message }) => (message ? <div className="alert bad">{message}</div> : null);
export function Empty({ icon = 'sparkles', title, children, action }) {
  return (
    <div className="empty">
      <div className="ico-wrap"><Icon name={icon} size={24} /></div>
      {title && <h3>{title}</h3>}
      <div>{children}</div>
      {action && <div style={{ marginTop: '1.1rem' }}>{action}</div>}
    </div>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <Icon name={t.type === 'error' ? 'x' : 'check'} /> <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function Stars({ value = 0 }) {
  const n = Math.round(value);
  return <span className="stars" title={`${value} / 5`}>{'★'.repeat(n)}<span style={{ opacity: .25 }}>{'★'.repeat(5 - n)}</span></span>;
}

export const Avatar = ({ user }) => (
  <div className="avatar">{user.profileImage ? <img src={user.profileImage} alt="" referrerPolicy="no-referrer" /> : user.name?.[0]?.toUpperCase()}</div>
);

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
