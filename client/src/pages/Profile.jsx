import { useState } from 'react';
import { ErrorBox, Avatar } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../services/api.js';

export default function Profile() {
  const { user, updateProfile, toast } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', gender: user.gender });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isCustomer = user.role === 'CUSTOMER';

  const save = async (e) => {
    e.preventDefault(); setError('');
    const body = { name: form.name, phone: form.phone || undefined, ...(isCustomer && { gender: form.gender }) };
    try { await updateProfile(body); toast('Profile updated', 'success'); }
    catch (err) { setError(errMsg(err)); }
  };

  return (
    <div className="container page" style={{ maxWidth: 620 }}>
      <div className="row" style={{ marginBottom: '1.4rem', gap: '1.2rem' }}>
        <div style={{ transform: 'scale(1.5)', margin: '0 .6rem' }}><Avatar user={user} /></div>
        <div><h1 style={{ fontSize: '1.7rem', margin: 0 }}>{user.name}</h1><div className="muted small">{user.email} · {user.role.toLowerCase()}</div></div>
      </div>
      <form className="form wide card pad" onSubmit={save}>
        <h3>Personal details</h3>
        <ErrorBox message={error} />
        <label>Email<input value={user.email} disabled /></label>
        <label>Name<input required minLength={2} value={form.name} onChange={set('name')} /></label>
        <label>Mobile<input inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" value={form.phone} onChange={set('phone')} /></label>
        {isCustomer && (
          <label>Gender
            <select value={form.gender} onChange={set('gender')}>
              <option value="NOT_SPECIFIED">Prefer not to say</option><option value="MALE">Male</option><option value="FEMALE">Female</option>
            </select>
            <span className="xs faint">Needed to book male-only or female-only businesses.</span>
          </label>
        )}
        <button className="btn">Save changes</button>
      </form>
    </div>
  );
}
