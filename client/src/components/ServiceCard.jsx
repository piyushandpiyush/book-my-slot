import Icon from './Icon.jsx';
import { money } from '../utils/format.js';

export default function ServiceCard({ service: s, action, hidePrice }) {
  return (
    <div className="service-card">
      <div className="service-ico"><Icon name={s.duration >= 45 ? 'sparkles' : 'scissors'} size={22} /></div>
      <div className="grow" style={{ minWidth: 0 }}>
        <strong>{s.name}</strong>
        {s.description && <div className="muted small">{s.description}</div>}
        <div className="service-meta"><span><Icon name="clock" size={14} /> {s.duration} min</span></div>
      </div>
      {!hidePrice && <div className="price">{money(s.price)}</div>}
      {action}
    </div>
  );
}
