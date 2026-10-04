import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ServiceCard from '../../components/ServiceCard.jsx';
import { Empty, ErrorBox, ListSkeleton, Modal } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { errMsg } from '../../services/api.js';
import { businessService, serviceService } from '../../services/businessService.js';

function ServiceForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState({ name: initial?.name || '', description: initial?.description || '', price: initial?.price ?? '', duration: initial?.duration ?? 30, isActive: initial?.isActive ?? true });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setError('');
    const body = { name: f.name, description: f.description || undefined, price: Number(f.price), duration: Number(f.duration), isActive: f.isActive };
    try { if (initial) await serviceService.update(initial._id, body); else await serviceService.create(body); onSaved(); }
    catch (err) { setError(errMsg(err)); }
  };
  return (
    <Modal title={initial ? 'Edit service' : 'Add service'} onClose={onClose}>
      <form className="form wide" onSubmit={save}>
        <ErrorBox message={error} />
        <label>Service name<input required placeholder="e.g. Haircut" value={f.name} onChange={set('name')} /></label>
        <label>Description<input placeholder="Optional" value={f.description} onChange={set('description')} /></label>
        <div className="grid-2">
          <label>Price (₹)<input type="number" min="0" required value={f.price} onChange={set('price')} /></label>
          <label>Duration (min)<input type="number" min="5" step="5" max="480" required value={f.duration} onChange={set('duration')} /></label>
        </div>
        <label className="inline"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Active — visible to customers</label>
        <button className="btn lg">Save Service</button>
      </form>
    </Modal>
  );
}

export default function Services() {
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const biz = useAsync(() => businessService.mine(), []);
  const list = useAsync(() => (biz.data ? serviceService.list(biz.data.business._id, true) : Promise.resolve(null)), [biz.data]);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit

  if (biz.loading) return <ListSkeleton />;
  if (biz.error) return <Empty icon="building" title="Register your business first">Add your salon or parlour from the Business Profile tab.</Empty>;

  const toggle = async (s) => {
    try { await serviceService.update(s._id, { isActive: !s.isActive }); toast(s.isActive ? 'Service deactivated' : 'Service activated', 'success'); list.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const remove = async (s) => {
    if (!(await confirm({ title: `Delete "${s.name}"?`, message: 'Services that already have bookings are deactivated instead, so history stays intact.', confirmLabel: 'Delete', danger: true }))) return;
    try { await serviceService.remove(s._id); toast('Service removed', 'success'); list.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: '1.2rem' }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>Services</h1><span className="muted">Price and duration drive how slots are generated.</span></div>
        <button className="btn lg" onClick={() => setEditing(null)}><Icon name="plus" size={18} /> Add Service</button>
      </div>
      <ErrorBox message={list.error} />
      {list.loading ? <ListSkeleton /> : !list.data?.services.length ? (
        <Empty icon="scissors" title="No services yet" action={<button className="btn" onClick={() => setEditing(null)}>Add your first service</button>}>Customers can book once you add at least one service.</Empty>
      ) : (
        <div className="card">
          {list.data.services.map((s) => (
            <ServiceCard key={s._id} service={s} action={
              <div className="row gap-s wrap" style={{ justifyContent: 'flex-end' }}>
                <span className={`badge ${s.isActive ? 'ok' : 'grey'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                <button className="btn sm ghost" onClick={() => setEditing(s)}><Icon name="edit" size={14} /> Edit</button>
                <button className="btn sm soft" onClick={() => toggle(s)}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                <button className="btn sm danger" onClick={() => remove(s)} aria-label={`Delete ${s.name}`}><Icon name="trash" size={14} /></button>
              </div>
            } />
          ))}
        </div>
      )}
      {editing !== undefined && <ServiceForm initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); toast('Service saved', 'success'); list.reload(); }} />}
      {dialog}
    </>
  );
}
