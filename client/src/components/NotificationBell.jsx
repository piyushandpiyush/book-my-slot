import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';

export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return { open, setOpen, ref };
}

export default function NotificationBell() {
  const { notifications, markAllRead } = useAuth();
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Icon name="bell" />{notifications.unread > 0 && <span className="dot">{notifications.unread}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="row between" style={{ marginBottom: '.4rem' }}>
            <strong>Notifications</strong>
            <button className="link small" onClick={markAllRead}>Mark all read</button>
          </div>
          {notifications.items.length === 0 && <p className="muted small" style={{ padding: '.8rem 0' }}>You're all caught up.</p>}
          {notifications.items.slice(0, 15).map((n) => (
            <div key={n._id} className={`notif ${n.isRead ? '' : 'unread'}`}><b>{n.title}</b><div className="muted">{n.message}</div></div>
          ))}
        </div>
      )}
    </div>
  );
}
