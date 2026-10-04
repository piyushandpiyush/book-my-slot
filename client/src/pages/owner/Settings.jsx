import { useEffect, useState } from 'react';
import { Empty, ErrorBox, ListSkeleton } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { errMsg } from '../../services/api.js';
import { businessService } from '../../services/businessService.js';

export default function Settings() {
  const { toast } = useAuth();
  const { data, loading, error, reload } = useAsync(() => businessService.mine(), []);
  const [interval, setInterval_] = useState(30);
  const [payment, setPayment] = useState(true);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { const b = data?.business; if (b) { setInterval_(b.slotInterval); setPayment(b.requireOnlinePayment); } }, [data]);

  if (loading) return <ListSkeleton />;
  if (error) return <Empty icon="building" title="Register your business first">Add your salon or parlour from the Business Profile tab.</Empty>;

  const save = async () => {
    setSaveError('');
    try { await businessService.updateMine({ slotInterval: Number(interval), requireOnlinePayment: payment }); toast('Settings saved', 'success'); reload(); }
    catch (e) { setSaveError(errMsg(e)); }
  };

  return (
    <>
      <h1 style={{ fontSize: '1.9rem' }}>Settings</h1>
      <div className="card pad col" style={{ maxWidth: 640 }}>
        <h3>Booking rules</h3>
        <div>
          <div className="small muted" style={{ fontWeight: 600, marginBottom: '.4rem' }}>Slot interval</div>
          <div className="choice-grid" role="radiogroup" aria-label="Slot interval">
            {[15, 30, 60].map((m) => <button key={m} type="button" className={`choice ${Number(interval) === m ? 'on' : ''}`} onClick={() => setInterval_(m)}><b>{m} min</b><span>Slot start every {m} minutes</span></button>)}
          </div>
        </div>
        <label className="inline"><input type="checkbox" checked={payment} onChange={(e) => setPayment(e.target.checked)} /> Require online payment to confirm online bookings</label>
        <ErrorBox message={saveError} />
        <div><button className="btn lg" onClick={save}>Save settings</button></div>
      </div>
    </>
  );
}
