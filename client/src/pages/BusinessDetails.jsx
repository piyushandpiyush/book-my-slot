import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import SlotPicker, { SlotLegend } from '../components/SlotPicker.jsx';
import { Empty, ErrorBox, ListSkeleton, Skeleton, Stars, Tabs } from '../components/ui.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useAvailabilitySocket } from '../hooks/useAvailabilitySocket.js';
import { businessService } from '../services/businessService.js';
import { DAYS, GENDER_LABEL, TYPE_LABEL, addDays, dayParts, fmtDate, fmtTime, mapsLink, money, openingText, todayStr } from '../utils/format.js';
import { businessImages } from '../utils/images.js';

export function DateStrip({ value, onChange, days = 14 }) {
  const list = Array.from({ length: days }, (_, i) => addDays(todayStr(), i));
  return (
    <div className="datestrip" role="listbox" aria-label="Select date">
      {list.map((d, i) => {
        const p = dayParts(d);
        return (
          <button key={d} type="button" role="option" aria-selected={value === d} className={`date-pill ${value === d ? 'on' : ''}`} onClick={() => onChange(d)}>
            <small>{i === 0 ? 'Today' : p.dow}</small><b>{p.day}</b><small>{p.month}</small>
          </button>
        );
      })}
    </div>
  );
}

function LiveAvailability({ business, services }) {
  const nav = useNavigate();
  const [serviceId, setServiceId] = useState(services[0]?._id || '');
  const [date, setDate] = useState(todayStr());
  const slots = useAsync(() => (serviceId ? businessService.availability(business._id, { date, serviceId }) : Promise.resolve(null)), [serviceId, date]);
  useAvailabilitySocket(business._id, (p) => { if (p.date === date) slots.reload(); });
  const list = slots.data?.slots || [];
  const free = list.filter((s) => s.available).length;

  if (!services.length) return <Empty icon="calendar" title="No services yet">This business has not listed services, so slots are not available.</Empty>;
  return (
    <div className="card pad">
      <div className="row between wrap" style={{ marginBottom: '.8rem' }}>
        <label style={{ minWidth: 220 }}>Service
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((s) => <option key={s._id} value={s._id}>{s.name} · {s.duration} min</option>)}</select>
        </label>
        <span className="live">Live availability</span>
      </div>
      <DateStrip value={date} onChange={setDate} />
      {slots.loading ? <Skeleton h={120} r={16} /> : list.length === 0 ? (
        <Empty icon="clock" title="Closed or no slots on this day" action={<button className="btn soft" onClick={() => setDate(addDays(date, 1))}>View next day</button>}>Try another date.</Empty>
      ) : free === 0 ? (
        <Empty icon="calendar" title="No slots available" action={<button className="btn soft" onClick={() => setDate(addDays(date, 1))}>View tomorrow</button>}>Everything is booked on this day. Try another date.</Empty>
      ) : (
        <>
          {free <= 2 && <div className="alert warn">Only {free} slot{free > 1 ? 's' : ''} left on this day.</div>}
          <SlotPicker slots={list} onChange={(t) => nav(`/booking/${business._id}?service=${serviceId}&date=${date}&time=${t}`)} />
          <div style={{ marginTop: '.9rem' }}><SlotLegend /></div>
        </>
      )}
    </div>
  );
}

function Reviews({ reviews }) {
  const stats = useMemo(() => {
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return { dist, avg };
  }, [reviews]);
  if (!reviews.length) return <Empty icon="star" title="No reviews yet">Be the first to review after your visit.</Empty>;
  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(240px, 320px) 1fr', alignItems: 'start' }}>
      <div className="card pad">
        <div className="big-rating">{stats.avg.toFixed(1)}</div>
        <Stars value={stats.avg} />
        <div className="muted small" style={{ margin: '.3rem 0 1rem' }}>{reviews.length} review{reviews.length > 1 ? 's' : ''}</div>
        <div className="col" style={{ gap: '.45rem' }}>
          {stats.dist.map(({ n, c }) => (
            <div key={n} className="dist-row"><span style={{ width: 14 }}>{n}</span><div className="dist-bar"><i style={{ width: `${(c / reviews.length) * 100}%` }} /></div><span style={{ width: 22, textAlign: 'right' }}>{c}</span></div>
          ))}
        </div>
      </div>
      <div>
        {reviews.map((r) => (
          <div key={r._id} className="card review">
            <div className="row between"><Stars value={r.rating} /><span className="muted xs">{fmtDate(r.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
            {r.comment && <p style={{ margin: '.6rem 0' }}>“{r.comment}”</p>}
            <div className="muted small">{r.customerId?.name || 'Customer'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessDetails() {
  const { id } = useParams();
  const [tab, setTab] = useState('services');
  const { data, loading, error } = useAsync(() => businessService.get(id), [id]);
  const reviews = useAsync(() => businessService.reviews(id), [id]);

  const go = (t) => { setTab(t); document.getElementById(`sec-${t}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  if (loading) return <div className="container page"><Skeleton h={390} r={22} /><div style={{ height: 24 }} /><ListSkeleton n={3} /></div>;
  if (error) return <div className="container page"><ErrorBox message={error} /><Link to="/businesses" className="btn soft">Back to explore</Link></div>;
  const { business: b, services } = data;
  const imgs = businessImages(b, 1100);
  const revs = reviews.data?.reviews || [];
  const todayOpen = openingText(b);
  const closedToday = todayOpen === 'Closed today';

  return (
    <div className="container page">
      <div className="gallery">{imgs.slice(0, 4).map((src, i) => <div key={i} style={{ backgroundImage: `url(${src})` }} role="img" aria-label={`${b.name} photo ${i + 1}`} />)}</div>

      <div className="biz-head">
        <div style={{ minWidth: 0 }}>
          <div className="row gap-s wrap" style={{ marginBottom: '.7rem' }}>
            <span className="tag"><Icon name={b.type === 'SALON' ? 'scissors' : 'sparkles'} size={13} /> {TYPE_LABEL[b.type]}</span>
            <span className={`tag g-${b.genderCategory}`}>{GENDER_LABEL[b.genderCategory]}</span>
            {b.isVerified && <span className="tag"><Icon name="shield" size={13} /> Verified</span>}
          </div>
          <h1>{b.name}</h1>
          <div className="row wrap muted" style={{ gap: '1.2rem' }}>
            <span className="rating"><Icon name="star" size={16} fill /> {b.totalReviews ? b.rating.toFixed(1) : 'New'}</span>
            <span>{b.totalReviews} review{b.totalReviews === 1 ? '' : 's'}</span>
            <span className="row gap-s"><Icon name="pin" size={16} /> {b.address}, {b.city}</span>
          </div>
          <div className="row gap-s" style={{ marginTop: '.6rem' }}>
            <Icon name="clock" size={16} /><span className={closedToday ? 'faint' : 'gold'} style={{ fontWeight: 700 }}>{closedToday ? 'Closed today' : `Open today · ${todayOpen}`}</span>
          </div>
        </div>
        <div className="row wrap">
          <a className="btn ghost" href={mapsLink(b)} target="_blank" rel="noreferrer"><Icon name="nav" size={17} /> Get Directions</a>
          <button className="btn lg" onClick={() => go('availability')}>Book a Slot</button>
        </div>
      </div>

      <Tabs value={tab} onChange={go} tabs={[
        { id: 'services', label: 'Services', count: services.length }, { id: 'availability', label: 'Availability' },
        { id: 'about', label: 'About' }, { id: 'reviews', label: 'Reviews', count: b.totalReviews },
      ]} />

      <section id="sec-services" className="section" style={{ marginTop: 0, scrollMarginTop: 140 }}>
        <h2>Services</h2>
        {services.length === 0 ? <Empty icon="scissors" title="No services listed">This business has not added services yet.</Empty> : (
          <div className="card">
            {services.map((s) => (
              <ServiceCard key={s._id} service={s} action={<Link className="btn sm" to={`/booking/${b._id}?service=${s._id}`}>Book</Link>} />
            ))}
          </div>
        )}
      </section>

      <section id="sec-availability" className="section" style={{ scrollMarginTop: 140 }}>
        <h2>Availability</h2>
        <LiveAvailability business={b} services={services} />
      </section>

      <section id="sec-about" className="section" style={{ scrollMarginTop: 140 }}>
        <h2>About</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="card pad">
            <p className="muted">{b.description || 'No description provided.'}</p>
            <hr className="divider" />
            <div className="row gap-s"><Icon name="pin" /> {b.address}, {b.city}</div>
            {b.phone && <div className="row gap-s" style={{ marginTop: '.6rem' }}><Icon name="phone" /> {b.phone}</div>}
          </div>
          <div className="card pad">
            <h3>Opening hours</h3>
            {b.workingHours.slice().sort((x, y) => ((x.day + 6) % 7) - ((y.day + 6) % 7)).map((d) => (
              <div key={d.day} className="row between small" style={{ padding: '.35rem 0' }}>
                <span className={d.day === new Date().getDay() ? 'gold' : 'muted'}>{DAYS[d.day]}</span>
                <span className={d.isOpen ? '' : 'faint'}>{d.isOpen ? `${fmtTime(d.open)} – ${fmtTime(d.close)}` : 'Closed'}</span>
              </div>
            ))}
            {b.breakHours?.length > 0 && <p className="muted xs" style={{ marginTop: '.6rem' }}>Break: {b.breakHours.map((x) => `${fmtTime(x.start)}–${fmtTime(x.end)}`).join(', ')}</p>}
          </div>
        </div>
      </section>

      <section id="sec-reviews" className="section" style={{ scrollMarginTop: 140 }}>
        <h2>Reviews</h2>
        {reviews.loading ? <Skeleton h={160} r={16} /> : <Reviews reviews={revs} />}
      </section>
    </div>
  );
}
