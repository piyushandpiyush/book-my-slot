import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import SlotPicker, { SlotLegend } from '../components/SlotPicker.jsx';
import { Empty, ErrorBox, ListSkeleton, Skeleton } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useAvailabilitySocket } from '../hooks/useAvailabilitySocket.js';
import { errMsg } from '../services/api.js';
import { businessService } from '../services/businessService.js';
import { bookingService, paymentService } from '../services/bookingService.js';
import { addDays, fmtDate, fmtTime, money, todayStr } from '../utils/format.js';
import { openCheckout } from '../utils/razorpay.js';
import { DateStrip } from './BusinessDetails.jsx';

const STEPS = ['Service', 'Date', 'Time', 'Confirm'];

function Stepper({ current }) {
  return (
    <div className="stepper" aria-label="Booking steps">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const cls = n < current ? 'done' : n === current ? 'on' : '';
        return (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`step ${cls}`}><span className="n">{n < current ? <Icon name="check" size={14} /> : n}</span>{label}</div>
            {n < STEPS.length && <div className="step-line" />}
          </div>
        );
      })}
    </div>
  );
}

function useCountdown(until) {
  const [left, setLeft] = useState(() => (until ? Math.max(0, Math.floor((new Date(until) - Date.now()) / 1000)) : null));
  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(until) - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [until]);
  return left;
}

function Summary({ business, service, date, time, action, note, sticky }) {
  return (
    <aside className={`card summary ${sticky ? 'sticky-m' : ''}`} aria-label="Your appointment">
      <h3 className="hide-sm">Your Appointment</h3>
      <div className="muted small hide-sm" style={{ marginBottom: '.6rem' }}>{business.name}</div>
      <div className="line"><span>Service</span><b>{service ? service.name : '—'}</b></div>
      <div className="line"><span>Duration</span><b>{service ? `${service.duration} min` : '—'}</b></div>
      <div className="line"><span>Date</span><b>{fmtDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
      <div className="line"><span>Time</span><b>{time ? fmtTime(time) : '—'}</b></div>
      <div className="total"><span>Total</span><b>{service ? money(service.price) : '₹0'}</b></div>
      {action}
      {note && <p className="muted xs hide-sm" style={{ marginTop: '.8rem', marginBottom: 0 }}>{note}</p>}
    </aside>
  );
}

export default function Booking() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { user, toast } = useAuth();
  const [serviceId, setServiceId] = useState(sp.get('service') || '');
  const [date, setDate] = useState(sp.get('date') && sp.get('date') >= todayStr() ? sp.get('date') : todayStr());
  const [time, setTime] = useState(sp.get('time') || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(null); // created booking (PENDING = awaiting payment)
  const [done, setDone] = useState(null);
  const [mock, setMock] = useState(false);
  const [flash, setFlash] = useState(new Set());
  const prevSlots = useRef([]);

  const biz = useAsync(() => businessService.get(id), [id]);
  const service = biz.data?.services.find((s) => s._id === serviceId);
  const slots = useAsync(() => (serviceId ? businessService.availability(id, { date, serviceId }) : Promise.resolve(null)), [id, serviceId, date]);
  const left = useCountdown(booking?.holdExpiresAt);

  useEffect(() => { paymentService.config().then((c) => setMock(c.mock)).catch(() => {}); }, []);

  // Detect slots that flipped to booked while the user was looking (live update) and flash them
  useEffect(() => {
    const cur = slots.data?.slots || [];
    const taken = new Set(cur.filter((s) => !s.available && prevSlots.current.find((p) => p.startTime === s.startTime)?.available).map((s) => s.startTime));
    if (taken.size) {
      setFlash(taken);
      setTimeout(() => setFlash(new Set()), 1500);
      if (time && taken.has(time)) { setTime(''); toast('That slot was just booked by someone else. Pick another time.', 'error'); }
    }
    prevSlots.current = cur;
  }, [slots.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = useCallback((p) => { if (p.date === date) slots.reload(); }, [date, slots.reload]); // eslint-disable-line react-hooks/exhaustive-deps
  useAvailabilitySocket(id, onChange);

  if (biz.loading) return <div className="container page"><Skeleton h={50} r={999} /><div style={{ height: 20 }} /><ListSkeleton n={3} /></div>;
  if (biz.error) return <div className="container page"><ErrorBox message={biz.error} /></div>;
  const b = biz.data.business;
  const list = slots.data?.slots || [];
  const freeCount = list.filter((s) => s.available).length;
  const need = b.genderCategory === 'MALE_ONLY' ? 'MALE' : b.genderCategory === 'FEMALE_ONLY' ? 'FEMALE' : null;
  const ineligible = need && user.gender !== need;
  const selected = list.find((s) => s.startTime === time);
  const current = !service ? 1 : !time ? 3 : 4;

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const res = await bookingService.create({ businessId: id, serviceId, bookingDate: date, startTime: time });
      if (res.booking.bookingStatus === 'PENDING') setBooking(res.booking);
      else setDone(res.booking);
    } catch (e) {
      setError(errMsg(e)); slots.reload();
      if (e?.response?.status === 409) setTime('');
    } finally { setBusy(false); }
  };

  const pay = async () => {
    setBusy(true); setError('');
    try {
      const order = await paymentService.createOrder(booking._id);
      const payload = order.mock
        ? { razorpay_order_id: order.orderId, razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_signature: 'mock_signature' }
        : await openCheckout({ order, user, name: b.name });
      const res = await paymentService.verify(payload); // the backend verifies; the browser result is never trusted
      toast('Payment verified. Booking confirmed!', 'success');
      setDone(res.booking);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  // ----- Success -----
  if (done) {
    return (
      <div className="container page">
        <div className="success">
          <div className="check"><Icon name="check" size={40} /></div>
          <h1 style={{ fontSize: '2rem' }}>Slot Reserved</h1>
          <p className="muted">Your appointment has been successfully booked.</p>
          <div className="ticket">
            <div className="muted xs">BOOKING ID</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold-2)' }}>{done.bookingNumber}</div>
            <hr className="divider" />
            <div className="row between small"><span className="muted">{b.name}</span><b>{done.serviceName}</b></div>
            <div className="row between small" style={{ marginTop: '.5rem' }}><span className="muted">{fmtDate(done.bookingDate, { weekday: 'short', day: 'numeric', month: 'long' })}</span><b>{fmtTime(done.startTime)} – {fmtTime(done.endTime)}</b></div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <Link className="btn" to={`/my-bookings/${done._id}`}>View booking</Link>
            <Link className="btn ghost" to="/businesses">Book another</Link>
          </div>
        </div>
      </div>
    );
  }

  // ----- Payment -----
  if (booking) {
    const expired = left === 0;
    const mm = String(Math.floor((left ?? 0) / 60)).padStart(2, '0');
    const ss = String((left ?? 0) % 60).padStart(2, '0');
    return (
      <div className="container page" style={{ maxWidth: 640 }}>
        <Link to={`/business/${id}`} className="link row gap-s" style={{ marginBottom: '1rem' }}><Icon name="back" size={16} /> Back to {b.name}</Link>
        <h1 style={{ fontSize: '2rem' }}>Payment</h1>
        <div className="card pad">
          {expired ? (
            <div className="alert bad">Your slot hold expired. Please choose a time again.</div>
          ) : (
            <div className="alert warn row between"><span>We're holding your slot.</span><b>{mm}:{ss}</b></div>
          )}
          <div className="col" style={{ gap: 0 }}>
            {[['Business', b.name], ['Service', booking.serviceName], ['Duration', `${service?.duration ?? ''} min`], ['Date', fmtDate(booking.bookingDate, { day: 'numeric', month: 'long', year: 'numeric' })], ['Time', fmtTime(booking.startTime)]].map(([k, v]) => (
              <div key={k} className="row between small" style={{ padding: '.7rem 0', borderBottom: '1px dashed var(--line)' }}><span className="muted">{k}</span><b>{v}</b></div>
            ))}
          </div>
          <div className="row between" style={{ padding: '1.1rem 0' }}><span>Total amount</span><b style={{ fontSize: '1.8rem', color: 'var(--gold-2)' }}>{money(booking.amount)}</b></div>
          <div className="pay-methods" style={{ marginBottom: '1.2rem' }}><div>Razorpay</div><div>UPI</div><div>Card</div></div>
          <ErrorBox message={error} />
          <button className="btn lg block" disabled={busy || expired} onClick={pay}><Icon name="wallet" size={18} /> {busy ? 'Processing…' : `Pay ${money(booking.amount)}`}</button>
          {mock && <p className="muted xs" style={{ marginTop: '.8rem', textAlign: 'center' }}>Test mode: payments are simulated because Razorpay keys are not configured.</p>}
          {expired && <button className="btn soft block" style={{ marginTop: '.7rem' }} onClick={() => { setBooking(null); slots.reload(); }}>Choose another time</button>}
        </div>
      </div>
    );
  }

  // ----- Select -----
  return (
    <div className="container page">
      <Link to={`/business/${id}`} className="link row gap-s" style={{ marginBottom: '1rem' }}><Icon name="back" size={16} /> {b.name}</Link>
      <h1 style={{ fontSize: '2rem' }}>Book an appointment</h1>
      <Stepper current={current} />

      {ineligible && (
        <div className="alert warn">
          This business is for {need === 'MALE' ? 'male' : 'female'} customers only.
          {user.gender === 'NOT_SPECIFIED' ? <> Set your gender in <Link className="link" to="/profile">your profile</Link> to book.</> : ' Your profile does not match, so booking will be rejected.'}
        </div>
      )}

      <div className="booking-layout">
        <div className="col" style={{ gap: '1.8rem' }}>
          <section>
            <h3>1 · Select service</h3>
            {biz.data.services.length === 0 ? <Empty icon="scissors" title="No services">This business has no services yet.</Empty> : biz.data.services.map((s) => (
              <button key={s._id} type="button" className={`service-pick ${serviceId === s._id ? 'on' : ''}`} aria-pressed={serviceId === s._id} onClick={() => { setServiceId(s._id); setTime(''); }}>
                <div className="service-ico"><Icon name={s.duration >= 45 ? 'sparkles' : 'scissors'} /></div>
                <div><b>{s.name}</b><div className="service-meta"><span><Icon name="clock" size={14} /> {s.duration} min</span></div></div>
                <b className="price" style={{ marginLeft: 'auto' }}>{money(s.price)}</b>
                <span className="radio-dot">{serviceId === s._id && <Icon name="check" size={12} />}</span>
              </button>
            ))}
          </section>

          <section>
            <h3>2 · Select date</h3>
            <DateStrip value={date} onChange={(d) => { setDate(d); setTime(''); }} />
          </section>

          <section>
            <div className="row between wrap"><h3>3 · Select time</h3><span className="live">Live availability</span></div>
            {!serviceId ? <Empty icon="scissors" title="Pick a service first">Slots depend on how long the service takes.</Empty>
              : slots.loading ? <Skeleton h={150} r={16} />
                : list.length === 0 ? <Empty icon="clock" title="Closed on this day" action={<button className="btn soft" onClick={() => setDate(addDays(date, 1))}>View tomorrow</button>}>Try another date.</Empty>
                  : freeCount === 0 ? <Empty icon="calendar" title="No slots available" action={<button className="btn soft" onClick={() => { setDate(addDays(date, 1)); setTime(''); }}>View tomorrow</button>}>Everything is booked. Try another date.</Empty>
                    : (
                      <>
                        {freeCount <= 2 && <div className="alert warn">Only {freeCount} slot{freeCount > 1 ? 's' : ''} left {date === todayStr() ? 'today' : 'on this day'}.</div>}
                        <SlotPicker slots={list} value={time} onChange={setTime} flash={flash} />
                        <div style={{ marginTop: '.9rem' }}><SlotLegend /></div>
                      </>
                    )}
          </section>
          <ErrorBox message={error} />
        </div>

        <Summary
          business={b} service={service} date={date} time={selected?.available ? time : ''} sticky
          note={b.requireOnlinePayment ? 'Your slot is held for a few minutes while you complete payment.' : 'No payment needed online. Pay at the shop.'}
          action={<button className="btn lg block" disabled={!service || !selected?.available || busy || ineligible} onClick={confirm}>{busy ? 'Reserving…' : 'Continue'}</button>}
        />
      </div>
    </div>
  );
}
