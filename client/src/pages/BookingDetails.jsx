import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RescheduleModal, ReviewModal } from '../components/BookingModals.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorBox, ListSkeleton, SourceTag, StatusBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import api, { errMsg } from '../services/api.js';
import { bookingService } from '../services/bookingService.js';
import { GENDER_LABEL, fmtDate, fmtTime, mapsLink, money } from '../utils/format.js';

const Field = ({ k, children }) => <div><div className="k">{k}</div><div className="v">{children}</div></div>;

export default function BookingDetails() {
  const { id } = useParams();
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const [resched, setResched] = useState(false);
  const [rate, setRate] = useState(false);
  const { data, loading, error, reload } = useAsync(() => api.get(`/bookings/${id}`).then((r) => r.data.data), [id]);

  if (loading) return <div className="container page"><ListSkeleton n={3} h={120} /></div>;
  if (error) return <div className="container page"><ErrorBox message={error} /><Link to="/my-bookings" className="btn soft">Back to bookings</Link></div>;
  const b = data.booking;
  const biz = b.business;
  const upcoming = ['PENDING', 'CONFIRMED'].includes(b.bookingStatus);

  const cancel = async () => {
    if (!(await confirm({ title: 'Cancel appointment?', message: 'The slot will be released for other customers.', confirmLabel: 'Cancel appointment', danger: true }))) return;
    try { await bookingService.cancel(b._id); toast('Appointment cancelled', 'success'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <Link to="/my-bookings" className="link row gap-s" style={{ marginBottom: '1rem' }}><Icon name="back" size={16} /> My bookings</Link>
      <div className="row between wrap" style={{ marginBottom: '1.2rem' }}>
        <div><div className="muted xs">BOOKING ID</div><h1 style={{ fontSize: '1.8rem', margin: 0 }}>{b.bookingNumber}</h1></div>
        <StatusBadge status={b.bookingStatus} />
      </div>

      <div className="card pad">
        <div className="row between wrap" style={{ marginBottom: '1.2rem' }}>
          <div><h2 style={{ margin: 0 }}>{biz?.name}</h2><div className="muted small row gap-s"><Icon name="pin" size={15} /> {biz?.address}, {biz?.city}</div></div>
          {biz && <a className="btn ghost sm" href={mapsLink(biz)} target="_blank" rel="noreferrer"><Icon name="nav" size={15} /> Directions</a>}
        </div>
        <hr className="divider" />
        <div className="detail-grid">
          <Field k="Service">{b.serviceName}</Field>
          <Field k="Date">{fmtDate(b.bookingDate, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</Field>
          <Field k="Time">{fmtTime(b.startTime)} – {fmtTime(b.endTime)}</Field>
          <Field k="Duration">{b.endMin - b.startMin} min</Field>
          <Field k="Price">{money(b.amount)}</Field>
          <Field k="Payment">{b.paymentStatus.replace('_', ' ')}</Field>
          <Field k="Booking source"><SourceTag source={b.bookingSource} /></Field>
          <Field k="Business">{biz && GENDER_LABEL[biz.genderCategory]}</Field>
        </div>
      </div>

      <div className="row wrap" style={{ marginTop: '1.2rem' }}>
        {upcoming && <button className="btn ghost" onClick={() => setResched(true)}>Reschedule</button>}
        {upcoming && <button className="btn danger" onClick={cancel}>Cancel appointment</button>}
        {b.bookingStatus === 'COMPLETED' && !b.reviewed && <button className="btn" onClick={() => setRate(true)}>Rate &amp; Review</button>}
        {b.reviewed && <span className="tag">You reviewed this visit ✓</span>}
      </div>
      {resched && <RescheduleModal booking={b} businessName={biz?.name} onClose={() => setResched(false)} onDone={() => { setResched(false); toast('Appointment rescheduled', 'success'); reload(); }} />}
      {rate && <ReviewModal booking={b} businessName={biz?.name} onClose={() => setRate(false)} onDone={() => { setRate(false); toast('Thanks for your review!', 'success'); reload(); }} />}
      {dialog}
    </div>
  );
}
