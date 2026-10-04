import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, ListSkeleton, StatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { errMsg } from '../../services/api.js';
import { businessService } from '../../services/businessService.js';

const EMPTY = { name: '', type: 'SALON', genderCategory: 'UNISEX', address: '', city: '', description: '', phone: '', email: '', images: '' };
const TYPES = [['SALON', 'Salon', 'Haircuts, grooming, styling', 'scissors'], ['PARLOUR', 'Parlour', 'Facials, makeup, beauty', 'sparkles']];
const GENDERS = [['MALE_ONLY', 'Male only', 'Only male customers can book'], ['FEMALE_ONLY', 'Female only', 'Only female customers can book'], ['UNISEX', 'Unisex', 'Everyone can book']];

export default function BusinessProfile() {
  const { toast } = useAuth();
  const { data, loading, error, reload } = useAsync(() => businessService.mine().catch((e) => (e?.response?.status === 404 ? { business: null } : Promise.reject(e))), []);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const business = data?.business;

  useEffect(() => {
    if (business) setForm({ ...EMPTY, ...business, phone: business.phone || '', email: business.email || '', description: business.description || '', images: (business.images || []).join('\n') });
  }, [business]);

  if (loading) return <ListSkeleton />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault(); setFormError('');
    const body = {
      name: form.name, type: form.type, genderCategory: form.genderCategory, address: form.address, city: form.city,
      description: form.description || undefined, phone: form.phone || undefined, email: form.email || undefined,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (business) await businessService.updateMine(body); else await businessService.create(body);
      toast(business ? 'Business updated' : 'Submitted for admin approval', 'success');
      reload();
    } catch (err) { setFormError(errMsg(err)); }
  };

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: '1.2rem' }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>{business ? 'Business Profile' : 'Register your business'}</h1>
          <span className="muted">{business ? 'What customers see on your page.' : 'Your listing goes live after admin approval.'}</span></div>
        {business && <StatusBadge status={business.status} />}
      </div>
      <ErrorBox message={error} />
      <form className="form wide col" style={{ gap: '1.2rem' }} onSubmit={save}>
        <ErrorBox message={formError} />
        <div className="card pad col">
          <h3>Basics</h3>
          <label>Business name<input required value={form.name} onChange={set('name')} /></label>
          <div><div className="small muted" style={{ fontWeight: 600, marginBottom: '.4rem' }}>Business type</div>
            <div className="choice-grid" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup" aria-label="Business type">
              {TYPES.map(([v, l, d]) => <button type="button" key={v} className={`choice ${form.type === v ? 'on' : ''}`} onClick={() => setForm({ ...form, type: v })}><b>{l}</b><span>{d}</span></button>)}
            </div></div>
          <div><div className="small muted" style={{ fontWeight: 600, marginBottom: '.4rem' }}>Gender availability</div>
            <div className="choice-grid" role="radiogroup" aria-label="Gender availability">
              {GENDERS.map(([v, l, d]) => <button type="button" key={v} className={`choice ${form.genderCategory === v ? 'on' : ''}`} onClick={() => setForm({ ...form, genderCategory: v })}><b>{l}</b><span>{d}</span></button>)}
            </div></div>
          <label>Description<textarea rows={3} value={form.description} onChange={set('description')} placeholder="Tell customers what makes your place special" /></label>
        </div>
        <div className="card pad col">
          <h3>Contact &amp; location</h3>
          <div className="grid-2">
            <label>Business phone<input inputMode="numeric" pattern="[6-9][0-9]{9}" value={form.phone} onChange={set('phone')} /></label>
            <label>Business email<input type="email" value={form.email} onChange={set('email')} /></label>
          </div>
          <label>Address<input required value={form.address} onChange={set('address')} /></label>
          <label>City<input required value={form.city} onChange={set('city')} /></label>
        </div>
        <div className="card pad col">
          <h3>Photos</h3>
          <label>Image URLs (one per line)<textarea rows={3} value={form.images} onChange={set('images')} placeholder="https://…" /></label>
          <span className="xs faint">The first image is your cover. Stock photos are used until you add your own.</span>
        </div>
        <div><button className="btn lg"><Icon name="check" size={18} /> {business ? 'Save changes' : 'Submit for approval'}</button></div>
      </form>
    </>
  );
}
