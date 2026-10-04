import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BusinessCard from '../components/BusinessCard.jsx';
import Icon from '../components/Icon.jsx';
import { CardSkeletons, Empty } from '../components/ui.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { businessService } from '../services/businessService.js';
import { IMG } from '../utils/images.js';

function Rail({ title, subtitle, params, link, when }) {
  const { data, loading } = useAsync(() => businessService.list({ limit: 8, ...params }), []);
  return (
    <section className="section">
      <div className="section-head">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <Link to={link} className="link row gap-s">See all <Icon name="arrow" size={16} /></Link>
      </div>
      {loading ? <CardSkeletons n={3} /> : data?.businesses.length ? (
        <div className="hscroll">{data.businesses.map((b) => <BusinessCard key={b._id} business={b} when={when} />)}</div>
      ) : <Empty icon="calendar" title="Nothing here yet">Check back soon.</Empty>}
    </section>
  );
}

export default function Home() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const nav = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (city) p.set('city', city);
    nav(`/businesses?${p}`);
  };

  return (
    <>
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${IMG.hero})` }} />
        <div className="container">
          <div className="hero-inner">
            <div className="eyebrow"><Icon name="sparkles" size={14} /> Salons &amp; Parlours near you</div>
            <h1>Book your time.<br /><em>Skip the wait.</em></h1>
            <p className="lead">Discover trusted salons and parlours, choose your service, and book a convenient time slot.</p>
            <div className="row wrap">
              <Link to="/businesses" className="btn lg">Find a Slot <Icon name="arrow" size={18} /></Link>
              <Link to="/login" className="btn lg ghost">List Your Business</Link>
            </div>
            <div className="hero-stats">
              <div><b>Live</b><span>slot availability</span></div>
              <div><b>0 min</b><span>waiting at the shop</span></div>
              <div><b>Walk-in</b><span>&amp; online in sync</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <div className="cat-grid">
            <Link to="/businesses?type=SALON" className="cat-card" style={{ backgroundImage: `url(${IMG.salon})` }}>
              <div><div className="eyebrow" style={{ marginBottom: '.3rem' }}>Haircuts · Grooming</div><h3>Salons</h3></div>
              <span className="arrow"><Icon name="arrow" /></span>
            </Link>
            <Link to="/businesses?type=PARLOUR" className="cat-card" style={{ backgroundImage: `url(${IMG.parlour})` }}>
              <div><div className="eyebrow" style={{ marginBottom: '.3rem' }}>Facials · Makeup</div><h3>Parlours</h3></div>
              <span className="arrow"><Icon name="arrow" /></span>
            </Link>
          </div>
        </section>

        <section className="section">
          <form className="search-panel" onSubmit={submit}>
            <h2>What are you looking for?</h2>
            <div className="search-row" style={{ marginTop: '1rem' }}>
              <div className="field-icon" style={{ flex: 2 }}><Icon name="search" /><input aria-label="Search" placeholder="Search salon, parlour or service" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <div className="field-icon"><Icon name="pin" /><input aria-label="City" placeholder="Enter area or city" value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <button className="btn lg">Search</button>
            </div>
          </form>
        </section>

        <Rail title="Popular Near You" subtitle="Highly booked places in your city" params={{ sort: 'recommended' }} link="/businesses" />
        <Rail title="Top Rated" subtitle="Loved by customers" params={{ sort: 'rating', minRating: 4 }} link="/businesses?minRating=4" />
        <Rail title="Available Today" subtitle="Slots open right now" params={{ availableToday: true, sort: 'earliest' }} link="/businesses?avail=today" />

        <section className="section">
          <div className="section-head"><div><h2>How it works</h2><p>Three steps, no phone calls.</p></div></div>
          <div className="steps-info">
            {[['01', 'Pick a place & service', 'See price, duration and who the business serves — before you book.'],
              ['02', 'Choose a live slot', 'Slots update the moment a walk-in or online booking happens.'],
              ['03', 'Pay & show up', 'Get confirmation instantly. Walk in at your time — no waiting.']].map(([n, t, d]) => (
              <div key={n} className="card step-info"><div className="n">{n}</div><h3 style={{ marginTop: '.5rem' }}>{t}</h3><p className="muted small">{d}</p></div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
