import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Empty, ErrorBox, ListSkeleton } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { errMsg } from '../../services/api.js';
import { businessService } from '../../services/businessService.js';
import { DAYS } from '../../utils/format.js';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

export default function WorkingHours() {
  const { toast } = useAuth();
  const { data, loading, error, reload } = useAsync(() => businessService.mine(), []);
  const [hours, setHours] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { const b = data?.business; if (b) { setHours(b.workingHours); setBreaks(b.breakHours); } }, [data]);

  if (loading) return <ListSkeleton />;
  if (error) return <Empty icon="building" title="Register your business first">Add your salon or parlour from the Business Profile tab.</Empty>;

  const setDay = (day, patch) => setHours(hours.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  const save = async () => {
    setSaveError('');
    try { await businessService.updateMine({ workingHours: hours, breakHours: breaks }); toast('Working hours saved', 'success'); reload(); }
    catch (e) { setSaveError(errMsg(e)); }
  };

  return (
    <>
      <h1 style={{ fontSize: '1.9rem' }}>Working Hours</h1>
      <p className="muted">Customers can only book inside these hours. Closed days show no slots.</p>
      <div className="card pad" style={{ marginBottom: '1.2rem' }}>
        {ORDER.map((d) => {
          const h = hours.find((x) => x.day === d);
          if (!h) return null;
          return (
            <div className={`hours-row ${h.isOpen ? '' : 'closed'}`} key={d}>
              <strong>{DAYS[d]}</strong>
              <label className="inline"><input type="checkbox" checked={h.isOpen} onChange={(e) => setDay(d, { isOpen: e.target.checked })} /> {h.isOpen ? 'Open' : 'Closed'}</label>
              {h.isOpen ? (<>
                <input type="time" aria-label={`${DAYS[d]} opens`} value={h.open} onChange={(e) => setDay(d, { open: e.target.value })} />
                <input type="time" aria-label={`${DAYS[d]} closes`} value={h.close} onChange={(e) => setDay(d, { close: e.target.value })} />
              </>) : <span className="faint" style={{ gridColumn: 'span 2' }}>Closed all day</span>}
            </div>
          );
        })}
      </div>

      <div className="card pad">
        <h3>Break time</h3>
        <p className="muted small">Applies every working day. No slot can overlap a break.</p>
        {breaks.map((b, i) => (
          <div className="row" key={i} style={{ marginBottom: '.6rem' }}>
            <input type="time" value={b.start} onChange={(e) => setBreaks(breaks.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
            <span className="muted">to</span>
            <input type="time" value={b.end} onChange={(e) => setBreaks(breaks.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
            <button className="icon-btn" onClick={() => setBreaks(breaks.filter((_, j) => j !== i))} aria-label="Remove break"><Icon name="trash" size={16} /></button>
          </div>
        ))}
        <button className="btn sm soft" onClick={() => setBreaks([...breaks, { start: '14:00', end: '15:00' }])}><Icon name="plus" size={14} /> Add break</button>
      </div>
      <ErrorBox message={saveError} />
      <button className="btn lg" style={{ marginTop: '1.2rem' }} onClick={save}>Save working hours</button>
    </>
  );
}
