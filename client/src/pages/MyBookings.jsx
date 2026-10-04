import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BookingCard from '../components/BookingCard.jsx';
import { RescheduleModal, ReviewModal } from '../components/BookingModals.jsx';
import { Empty, ErrorBox, ListSkeleton, Tabs } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { errMsg } from '../services/api.js';
import { bookingService, paymentService } from '../services/bookingService.js';

export default function MyBookings() {
  const { toast } = useAuth();
  const nav = useNavigate();
  const [confirm, dialog] = useConfirm();
  const { data, loading, error, reload } = useAsync(() => bookingService.mine(), []);
  const [tab, setTab] = useState('upcoming');
  const [resched, setResched] = useState(null);
  const [rate, setRate] = useState(null);

  const all = data?.bookings || [];
  const by = (g) => all.filter((b) => b.group === g);
  const list = by(tab);

  const cancel = async (b) => {
    if (!(await confirm({ title: 'Cancel appointment?', message: `${b.serviceName} at ${b.businessId?.name} will be cancelled and the slot released.`, confirmLabel: 'Cancel appointment', danger: true }))) return;
    try { await bookingService.cancel(b._id); toast('Appointment cancelled', 'success'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const payNow = async (b) => {
    try {
      const order = await paymentService.createOrder(b._id);
      if (!order.mock) { nav(`/booking/${b.businessId._id}?service=${b.serviceId}&date=${b.bookingDate}&time=${b.startTime}`); return; }
      await paymentService.verify({ razorpay_order_id: order.orderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock_signature' });
      toast('Payment verified', 'success'); reload();
    } catch (e) { toast(errMsg(e), 'error'); reload(); }
  };

  return (
    <div className="container page">
      <h1 style={{ fontSize: '2rem' }}>My Bookings</h1>
      <ErrorBox message={error} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'upcoming', label: 'Upcoming', count: by('upcoming').length },
        { id: 'past', label: 'Completed', count: by('past').length },
        { id: 'cancelled', label: 'Cancelled', count: by('cancelled').length },
      ]} />
      {loading ? <ListSkeleton /> : list.length === 0 ? (
        <Empty icon="calendar" title={tab === 'upcoming' ? 'No upcoming appointments' : tab === 'past' ? 'No completed visits yet' : 'No cancelled bookings'}
          action={tab === 'upcoming' ? <Link className="btn" to="/businesses">Find a Slot</Link> : null}>
          {tab === 'upcoming' ? 'Book your next appointment in a few taps.' : 'Nothing to show here.'}
        </Empty>
      ) : list.map((b) => (
        <BookingCard key={b._id} booking={b} title={b.businessId?.name} actions={
          <>
            {b.bookingStatus === 'PENDING' && b.paymentStatus !== 'PAID' && <button className="btn sm" onClick={() => payNow(b)}>Pay now</button>}
            <Link className="btn sm soft" to={`/my-bookings/${b._id}`}>View Details</Link>
            {['PENDING', 'CONFIRMED'].includes(b.bookingStatus) && <button className="btn sm ghost" onClick={() => setResched(b)}>Reschedule</button>}
            {['PENDING', 'CONFIRMED'].includes(b.bookingStatus) && <button className="btn sm danger" onClick={() => cancel(b)}>Cancel</button>}
            {b.bookingStatus === 'COMPLETED' && !b.reviewed && <button className="btn sm" onClick={() => setRate(b)}>Rate &amp; Review</button>}
            {b.reviewed && <span className="tag">Reviewed ✓</span>}
          </>
        } />
      ))}
      {resched && <RescheduleModal booking={resched} businessName={resched.businessId?.name} onClose={() => setResched(null)} onDone={() => { setResched(null); toast('Appointment rescheduled', 'success'); reload(); }} />}
      {rate && <ReviewModal booking={rate} businessName={rate.businessId?.name} onClose={() => setRate(null)} onDone={() => { setRate(null); toast('Thanks for your review!', 'success'); reload(); }} />}
      {dialog}
    </div>
  );
}
