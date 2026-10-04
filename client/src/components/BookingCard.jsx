import { SourceTag, StatusBadge } from './ui.jsx';
import { fmtDate, fmtTime, money } from '../utils/format.js';

// Shared by the customer history and the owner day schedule.
export default function BookingCard({ booking: b, title, actions, showDate = true }) {
  return (
    <div className={`booking-card st-${b.bookingStatus}`}>
      <div className="bc-time">
        <strong>{fmtTime(b.startTime)}</strong>
        {showDate && <span className="muted small">{fmtDate(b.bookingDate)}</span>}
      </div>
      <div className="bc-main">
        <strong>{title || b.customerName}</strong>
        <div className="muted small">{b.serviceName} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)} · {money(b.amount)}</div>
        <div className="row gap-s wrap">
          <SourceTag source={b.bookingSource} />
          <StatusBadge status={b.bookingStatus} />
          {b.paymentStatus === 'PAID' && <span className="tag">Paid</span>}
          {b.paymentStatus === 'REFUNDED' && <span className="tag">Refunded</span>}
          {b.bookingStatus === 'PENDING' && b.paymentStatus === 'PENDING' && <span className="tag">Awaiting payment</span>}
        </div>
      </div>
      <div className="bc-actions">{actions}</div>
    </div>
  );
}
