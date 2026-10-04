import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BusinessCard from '../components/BusinessCard.jsx';
import Icon from '../components/Icon.jsx';
import { CardSkeletons, Empty, ErrorBox } from '../components/ui.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { businessService } from '../services/businessService.js';
import { addDays, fmtDate, todayStr } from '../utils/format.js';

const PRICE = { '': [], '100-500': [100, 500], '500-1000': [500, 1000], '1000-': [1000] };

function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={`chip ${value === v ? 'on' : ''}`} aria-pressed={value === v} onClick={() => onChange(value === v ? '' : v)}>{label}</button>
      ))}
    </div>
  );
}

export default function Search() {
  const [sp, setSp] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const get = (k) => sp.get(k) || '';
  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v); else n.delete(k);
    if (k !== 'page') n.delete('page');
    setSp(n, { replace: true });
  };
  const clearAll = () => setSp({}, { replace: true });
  const price = get('price');
  const date = get('date') || todayStr();
  const avail = get('avail');
  const when = date === todayStr() ? 'today' : `on ${fmtDate(date, { day: 'numeric', month: 'short' })}`;
  const params = {
    q: get('q') || undefined, city: get('city') || undefined, type: get('type') || undefined, gender: get('gender') || undefined,
    minRating: get('minRating') || undefined, minPrice: PRICE[price]?.[0], maxPrice: PRICE[price]?.[1],
    availableToday: avail === 'today' || avail === 'now' ? true : undefined, availableNow: avail === 'now' ? true : undefined,
    sort: get('sort') || undefined, date: get('date') || undefined, page: get('page') || 1,
  };
  const { data, loading, error } = useAsync(() => businessService.list(params), [sp.toString()]);
  const activeCount = ['type', 'gender', 'minRating', 'price', 'avail'].filter(get).length;

  return (
    <div className="container page">
      <div className="search-panel" style={{ marginBottom: '1.6rem' }}>
        <div className="search-row">
          <div className="field-icon" style={{ flex: 2 }}><Icon name="search" /><input aria-label="Search" placeholder="Search salon, parlour or service" value={get('q')} onChange={(e) => set('q', e.target.value)} /></div>
          <div className="field-icon"><Icon name="pin" /><input aria-label="City" placeholder="Area or city" value={get('city')} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="field-icon"><Icon name="calendar" /><input aria-label="Date" type="date" min={todayStr()} max={addDays(todayStr(), 60)} value={date} onChange={(e) => set('date', e.target.value === todayStr() ? '' : e.target.value)} /></div>
        </div>
      </div>

      <div className="search-layout">
        <aside className={`card filters ${filtersOpen ? 'open' : ''}`} aria-label="Filters">
          <div className="row between" style={{ marginBottom: '1rem' }}><h3 style={{ margin: 0 }}>Filters</h3>{activeCount > 0 && <button className="link small" onClick={clearAll}>Clear all</button>}</div>
          <div className="filter-group"><h4>Business type</h4><Chips value={get('type')} onChange={(v) => set('type', v)} options={[['SALON', 'Salon'], ['PARLOUR', 'Parlour']]} /></div>
          <div className="filter-group"><h4>Gender</h4><Chips value={get('gender')} onChange={(v) => set('gender', v)} options={[['MALE_ONLY', 'Male'], ['FEMALE_ONLY', 'Female'], ['UNISEX', 'Unisex']]} /></div>
          <div className="filter-group"><h4>Rating</h4><Chips value={get('minRating')} onChange={(v) => set('minRating', v)} options={[['4', '4+ ★'], ['4.5', '4.5+ ★']]} /></div>
          <div className="filter-group"><h4>Price</h4><Chips value={price} onChange={(v) => set('price', v)} options={[['100-500', '₹100–₹500'], ['500-1000', '₹500–₹1000'], ['1000-', '₹1000+']]} /></div>
          <div className="filter-group" style={{ marginBottom: 0 }}><h4>Availability</h4><Chips value={avail} onChange={(v) => set('avail', v)} options={[['today', 'Available today'], ['now', 'Available now']]} /></div>
        </aside>

        <section>
          <div className="row between wrap" style={{ marginBottom: '1.1rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>{loading ? 'Searching…' : `${data?.total ?? 0} place${data?.total === 1 ? '' : 's'} available`}</h2>
              <span className="live">Live availability</span>
            </div>
            <div className="row">
              <button className="btn soft sm filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" size={16} /> Filters{activeCount > 0 && ` (${activeCount})`}</button>
              <label className="inline" style={{ gap: '.5rem' }}>
                <span className="muted small">Sort</span>
                <select aria-label="Sort" style={{ width: 'auto' }} value={get('sort') || 'recommended'} onChange={(e) => set('sort', e.target.value === 'recommended' ? '' : e.target.value)}>
                  <option value="recommended">Recommended</option><option value="rating">Rating</option><option value="price">Price</option>
                  <option value="earliest">Earliest available</option><option value="nearest" disabled>Nearest (coming soon)</option>
                </select>
              </label>
            </div>
          </div>
          <ErrorBox message={error} />
          {loading ? <CardSkeletons n={6} /> : data?.businesses.length ? (
            <>
              <div className="grid">{data.businesses.map((b) => <BusinessCard key={b._id} business={b} when={when} />)}</div>
              {data.pages > 1 && (
                <div className="pager">
                  <button className="btn ghost sm" disabled={data.page <= 1} onClick={() => set('page', String(data.page - 1))}><Icon name="chevL" size={16} /> Prev</button>
                  <span>Page {data.page} of {data.pages}</span>
                  <button className="btn ghost sm" disabled={data.page >= data.pages} onClick={() => set('page', String(data.page + 1))}>Next <Icon name="chevR" size={16} /></button>
                </div>
              )}
            </>
          ) : (
            <Empty icon="search" title="No places match your filters" action={activeCount > 0 || get('q') || get('city') ? <button className="btn soft" onClick={clearAll}>Clear filters</button> : null}>
              Try a different area, date or remove a filter.
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
