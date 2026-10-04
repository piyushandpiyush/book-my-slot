import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, ListSkeleton } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { bookingService } from '../../services/bookingService.js';
import { addDays, fmtDate, fmtTime, todayStr } from '../../utils/format.js';

export default function Calendar() {
  const [start, setStart] = useState(todayStr());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const { data, loading, error } = useAsync(() => bookingService.ownerList({ from: days[0], to: days[6] }), [start]);

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: '1.2rem' }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>Calendar</h1><span className="muted">{fmtDate(days[0])} – {fmtDate(days[6])}</span></div>
        <div className="row">
          <button className="icon-btn" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week"><Icon name="chevL" /></button>
          <button className="btn soft sm" onClick={() => setStart(todayStr())}>Today</button>
          <button className="icon-btn" onClick={() => setStart(addDays(start, 7))} aria-label="Next week"><Icon name="chevR" /></button>
        </div>
      </div>
      <ErrorBox message={error} />
      {loading ? <ListSkeleton /> : (
        <div className="week">
          {days.map((d) => {
            const items = (data?.bookings || []).filter((b) => b.bookingDate === d);
            return (
              <div key={d} className={`week-day ${d === todayStr() ? 'today' : ''}`}>
                <strong>{fmtDate(d)}</strong>
                {items.length === 0 && <div className="faint small" style={{ marginTop: '.5rem' }}>No appointments</div>}
                {items.map((b) => (
                  <div key={b._id} className={`week-item ${b.bookingSource} ${['CANCELLED', 'NO_SHOW'].includes(b.bookingStatus) ? 'off' : ''}`}>
                    <b>{fmtTime(b.startTime)}</b> {b.customerName}<br /><span className="muted">{b.serviceName} · {b.bookingStatus.replace('_', ' ').toLowerCase()}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
