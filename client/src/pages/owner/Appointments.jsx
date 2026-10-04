import { useCallback, useMemo, useState } from 'react';
import BookingCard from '../../components/BookingCard.jsx';
import Icon from '../../components/Icon.jsx';
import SlotPicker, { SlotLegend } from '../../components/SlotPicker.jsx';
import { Drawer, Empty, ErrorBox, ListSkeleton, Skeleton } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAvailabilitySocket } from '../../hooks/useAvailabilitySocket.js';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { errMsg } from '../../services/api.js';
import { businessService, serviceService } from '../../services/businessService.js';
import { bookingService } from '../../services/bookingService.js';
import { addDays, fmtDate, fmtTime, todayStr } from '../../utils/format.js';

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function WalkInDrawer({ services, date, onClose, onAdded }) {
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerGender: 'MALE', serviceId: services[0]?._id || '' });
  const [wDate, setWDate] = useState(date);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(null);
  const slots = useAsync(
    () => (form.serviceId ? bookingService.ownerSlots({ date: wDate, serviceId: form.serviceId }) : Promise.resolve(null)),
    [wDate, form.serviceId],
  );
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (k === 'serviceId') setTime(''); };
  const list = slots.data?.slots || [];

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const { booking } = await bookingService.walkIn({ ...form, customerPhone: form.customerPhone || undefined, bookingDate: wDate, startTime: time });
      setAdded(booking); onAdded();
    } catch (err) { setError(errMsg(err)); slots.reload(); setTime(''); } finally { setBusy(false); }
  };

  if (added) {
    return (
      <Drawer title="Add Walk-in Customer" onClose={onClose}>
        <div className="success" style={{ padding: '1.5rem 0' }}>
          <div className="check"><Icon name="check" size={38} /></div>
          <h2>Walk-in added</h2>
          <p className="muted"><b>{fmtTime(added.startTime)}</b> is now reserved for {added.customerName}. It is already blocked on the customer website.</p>
          <div className="row wrap" style={{ justifyContent: 'center', marginTop: '1.2rem' }}>
            <button className="btn" onClick={onClose}>Done</button>
            <button className="btn ghost" onClick={() => { setAdded(null); setTime(''); setForm({ ...form, customerName: '', customerPhone: '' }); slots.reload(); }}>Add another</button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer title="Add Walk-in Customer" onClose={onClose}>
      <form className="form wide" onSubmit={submit}>
        <label>Customer name<input required placeholder="e.g. Rahul Kumar" value={form.customerName} onChange={set('customerName')} /></label>
        <label>Phone number (optional)<input inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile" placeholder="98XXXXXXXX" value={form.customerPhone} onChange={set('customerPhone')} /></label>
        <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup" aria-label="Gender">
          {['MALE', 'FEMALE'].map((g) => (
            <button key={g} type="button" className={`choice ${form.customerGender === g ? 'on' : ''}`} onClick={() => setForm({ ...form, customerGender: g })}><b>{g === 'MALE' ? 'Male' : 'Female'}</b></button>
          ))}
        </div>
        <label>Service
          <select required value={form.serviceId} onChange={set('serviceId')}>
            {services.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.duration} min · ₹{s.price}</option>)}
          </select>
        </label>
        <label>Date<input type="date" min={todayStr()} value={wDate} onChange={(e) => { setWDate(e.target.value); setTime(''); }} /></label>
        <div>
          <div className="row between" style={{ marginBottom: '.5rem' }}><b className="small">Select time</b><span className="live">Live</span></div>
          {slots.loading ? <Skeleton h={120} r={16} /> : list.length ? <SlotPicker slots={list} value={time} onChange={setTime} /> : <p className="muted small">Closed on this day.</p>}
          <div style={{ marginTop: '.7rem' }}><SlotLegend /></div>
        </div>
        <ErrorBox message={error} />
        <button className="btn lg block" disabled={busy || !time || !form.serviceId}>{busy ? 'Saving…' : `Confirm Walk-in${time ? ` · ${fmtTime(time)}` : ''}`}</button>
      </form>
    </Drawer>
  );
}

export default function Appointments() {
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const [date, setDate] = useState(todayStr());
  const [walkIn, setWalkIn] = useState(false);
  const biz = useAsync(() => businessService.mine(), []);
  const services = useAsync(() => (biz.data ? serviceService.list(biz.data.business._id) : Promise.resolve(null)), [biz.data]);
  const list = useAsync(() => bookingService.ownerList({ date }), [date]);

  const onChange = useCallback((p) => { if (p.date === date) list.reload(); }, [date, list.reload]); // eslint-disable-line react-hooks/exhaustive-deps
  useAvailabilitySocket(biz.data?.business._id, onChange);

  const act = async (b, status, ask) => {
    if (ask && !(await confirm(ask))) return;
    try { await bookingService.setStatus(b._id, status); list.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  // Interleave bookings with free windows and breaks: the "Today" timeline
  const rows = useMemo(() => {
    const b = biz.data?.business;
    const bookings = list.data?.bookings || [];
    if (!b) return [];
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const cfg = b.workingHours.find((d) => d.day === dow);
    const live = bookings.filter((x) => !['CANCELLED', 'NO_SHOW'].includes(x.bookingStatus));
    const out = bookings.map((x) => ({ kind: 'booking', start: x.startMin, x }));
    if (cfg?.isOpen) {
      const blocks = [...live.map((x) => [x.startMin, x.endMin]), ...b.breakHours.map((x) => [toMin(x.start), toMin(x.end)])].sort((p, q) => p[0] - q[0]);
      let cursor = toMin(cfg.open);
      const close = toMin(cfg.close);
      for (const [s, e] of blocks) {
        if (s - cursor >= 15) out.push({ kind: 'free', start: cursor, end: Math.min(s, close) });
        cursor = Math.max(cursor, e);
      }
      if (close - cursor >= 15) out.push({ kind: 'free', start: cursor, end: close });
      b.breakHours.forEach((x) => out.push({ kind: 'break', start: toMin(x.start), end: toMin(x.end) }));
    }
    return out.sort((p, q) => p.start - q.start);
  }, [list.data, biz.data, date]);

  if (biz.loading) return <ListSkeleton />;
  if (biz.error) return <Empty icon="building" title="Register your business first">Add your salon or parlour from the Business Profile tab.</Empty>;
  const isToday = date === todayStr();
  const active = biz.data.business.status === 'ACTIVE';
  const closed = rows.length === 0;

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: '1.2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem' }}>{isToday ? 'Today' : 'Appointments'}</h1>
          <div className="row gap-s muted"><span>{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</span><span className="live">Live</span></div>
        </div>
        <button className="btn lg" disabled={!active || !services.data?.services.length} onClick={() => setWalkIn(true)}><Icon name="plus" size={18} /> Add Walk-in</button>
      </div>
      {!active && <div className="alert warn">Your business is {biz.data.business.status.toLowerCase()}. Bookings open after admin approval.</div>}
      <div className="row" style={{ marginBottom: '1.2rem' }}>
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="chevL" /></button>
        <input type="date" aria-label="Date" value={date} style={{ width: 'auto' }} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="chevR" /></button>
        {!isToday && <button className="btn soft sm" onClick={() => setDate(todayStr())}>Today</button>}
      </div>
      <ErrorBox message={list.error} />
      {list.loading ? <ListSkeleton /> : closed ? (
        <Empty icon="calendar" title="Closed or nothing scheduled" action={<button className="btn soft" onClick={() => setDate(addDays(date, 1))}>View next day</button>}>
          No working hours or appointments on this day.
        </Empty>
      ) : rows.map((r, i) => {
        if (r.kind === 'free') return <div key={`f${i}`} className="free-row"><b>{fmtTime(toHHMM(r.start))} – {fmtTime(toHHMM(r.end))}</b> AVAILABLE</div>;
        if (r.kind === 'break') return <div key={`b${i}`} className="free-row break"><b>{fmtTime(toHHMM(r.start))} – {fmtTime(toHHMM(r.end))}</b> BREAK</div>;
        const b = r.x;
        return (
          <BookingCard key={b._id} booking={b} showDate={false} actions={
            <>
              {b.bookingStatus === 'CONFIRMED' && <button className="btn sm ok" onClick={() => act(b, 'ARRIVED')}>Mark Arrived</button>}
              {b.bookingStatus === 'ARRIVED' && <button className="btn sm" onClick={() => act(b, 'IN_SERVICE')}>Start Service</button>}
              {b.bookingStatus === 'IN_SERVICE' && <button className="btn sm ok" onClick={() => act(b, 'COMPLETED')}>Complete</button>}
              {b.bookingStatus === 'CONFIRMED' && <button className="btn sm ghost" onClick={() => act(b, 'NO_SHOW', { title: 'Mark as no-show?', message: `${b.customerName} did not arrive. The slot will be released.`, confirmLabel: 'Mark no-show' })}>No-show</button>}
              {['PENDING', 'CONFIRMED', 'ARRIVED'].includes(b.bookingStatus) && <button className="btn sm danger" onClick={() => act(b, 'CANCELLED', { title: 'Cancel this appointment?', message: `${b.customerName}'s ${b.serviceName} at ${fmtTime(b.startTime)} will be cancelled and the slot reopens online.`, confirmLabel: 'Cancel appointment', danger: true })}>Cancel</button>}
            </>
          } />
        );
      })}
      {walkIn && <WalkInDrawer services={services.data?.services || []} date={date < todayStr() ? todayStr() : date} onClose={() => setWalkIn(false)} onAdded={() => { toast('Walk-in added. Slot is now blocked online.', 'success'); list.reload(); }} />}
      {dialog}
    </>
  );
}
