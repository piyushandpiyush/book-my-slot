import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { GENDER_LABEL, TYPE_LABEL, fmtTime, money } from '../utils/format.js';
import { coverImage } from '../utils/images.js';

export function AvailabilityLine({ b, when = 'today' }) {
  if (b.slotsLeft === undefined) return null;
  if (!b.slotsLeft) return <span className="avail no">No slots left {when}</span>;
  if (b.slotsLeft <= 2) return <span className="avail few">Only {b.slotsLeft} slot{b.slotsLeft > 1 ? 's' : ''} left {when}</span>;
  return <span className="avail">Available {when} · from {fmtTime(b.nextSlot)}</span>;
}

export default function BusinessCard({ business: b, when }) {
  return (
    <Link to={`/business/${b._id}`} className="card business-card" style={{ display: 'block' }}>
      <div className="cover" style={{ backgroundImage: `url(${coverImage(b)})` }}>
        <div className="tags">
          <span className="tag"><Icon name={b.type === 'SALON' ? 'scissors' : 'sparkles'} size={13} /> {TYPE_LABEL[b.type]}</span>
          <span className={`tag g-${b.genderCategory}`}>{GENDER_LABEL[b.genderCategory]}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <h3 className="bc-title">{b.name}</h3>
          <span className="rating"><Icon name="star" size={15} fill /> {b.totalReviews ? b.rating.toFixed(1) : 'New'}{b.totalReviews > 0 && <span className="muted small" style={{ fontWeight: 500 }}>({b.totalReviews})</span>}</span>
        </div>
        <div className="muted small row gap-s"><Icon name="pin" size={15} /> {b.address}, {b.city}</div>
        <div className="row between" style={{ marginTop: '.5rem' }}>
          <div className="col" style={{ gap: '.2rem' }}>
            <span className="price-line">{b.minPrice ? <>From <b>{money(b.minPrice)}</b></> : 'Prices on request'}</span>
            <AvailabilityLine b={b} when={when} />
          </div>
          <span className="btn sm">View Slots</span>
        </div>
      </div>
    </Link>
  );
}
