import { useState } from 'react';
import { DateStrip } from '../pages/BusinessDetails.jsx';
import Icon from './Icon.jsx';
import SlotPicker from './SlotPicker.jsx';
import { ErrorBox, Modal, Skeleton } from './ui.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { errMsg } from '../services/api.js';
import { businessService } from '../services/businessService.js';
import { bookingService } from '../services/bookingService.js';
import { fmtDate, fmtTime, todayStr } from '../utils/format.js';

export function RescheduleModal({ booking, businessName, onClose, onDone }) {
  const [date, setDate] = useState(booking.bookingDate >= todayStr() ? booking.bookingDate : todayStr());
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const bizId = booking.businessId?._id || booking.businessId;
  const slots = useAsync(() => businessService.availability(bizId, { date, serviceId: booking.serviceId }), [date]);
  const list = slots.data?.slots || [];

  const save = async () => {
    try { await bookingService.reschedule(booking._id, { bookingDate: date, startTime: time }); onDone(); }
    catch (e) { setError(errMsg(e)); slots.reload(); setTime(''); }
  };
  return (
    <Modal title="Reschedule appointment" onClose={onClose}>
      <p className="muted small">{booking.serviceName} at {businessName}. Currently {fmtDate(booking.bookingDate)} · {fmtTime(booking.startTime)}</p>
      <DateStrip value={date} onChange={(d) => { setDate(d); setTime(''); }} />
      {slots.loading ? <Skeleton h={110} r={16} /> : list.length ? <SlotPicker slots={list} value={time} onChange={setTime} /> : <p className="muted">No slots on this day.</p>}
      <ErrorBox message={error} />
      <button className="btn lg block" style={{ marginTop: '1.1rem' }} disabled={!time} onClick={save}>Confirm new time</button>
    </Modal>
  );
}

export function ReviewModal({ booking, businessName, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    try { await bookingService.review({ bookingId: booking._id, rating, comment: comment || undefined }); onDone(); }
    catch (e) { setError(errMsg(e)); }
  };
  return (
    <Modal title={`Rate ${businessName}`} onClose={onClose}>
      <div className="row" style={{ gap: '.2rem', marginBottom: '.8rem' }} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className="icon-btn" style={{ border: 0, width: 48, height: 48, color: n <= rating ? 'var(--gold)' : 'var(--s4)' }} onClick={() => setRating(n)} aria-label={`${n} stars`} aria-checked={n === rating} role="radio">
            <Icon name="star" size={34} fill />
          </button>
        ))}
      </div>
      <label>Your review<textarea rows={4} maxLength={1000} placeholder="How was your experience?" value={comment} onChange={(e) => setComment(e.target.value)} /></label>
      <ErrorBox message={error} />
      <button className="btn lg block" style={{ marginTop: '1.1rem' }} onClick={save}>Submit review</button>
    </Modal>
  );
}
