import { Empty, ErrorBox, ListSkeleton, Stars } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { errMsg } from '../../services/api.js';
import { businessService } from '../../services/businessService.js';
import { fmtDate } from '../../utils/format.js';

export default function OwnerReviews() {
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const { data, loading, error, reload } = useAsync(() => businessService.ownerReviews(), []);
  if (loading) return <ListSkeleton />;
  const reviews = data?.reviews || [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const report = async (id) => {
    if (!(await confirm({ title: 'Report this review?', message: 'An admin will review it and may remove it if it breaks the rules.', confirmLabel: 'Report' }))) return;
    try { await businessService.reportReview(id); toast('Reported to admin', 'success'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <>
      <h1 style={{ fontSize: '1.9rem' }}>Reviews</h1>
      <ErrorBox message={error} />
      {reviews.length > 0 && (
        <div className="card pad row" style={{ gap: '2rem', marginBottom: '1.2rem' }}>
          <div><div className="big-rating">{avg.toFixed(1)}</div><Stars value={avg} /></div>
          <div className="col" style={{ gap: '.4rem', flex: 1 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const c = reviews.filter((r) => r.rating === n).length;
              return <div key={n} className="dist-row"><span style={{ width: 14 }}>{n}</span><div className="dist-bar"><i style={{ width: `${(c / reviews.length) * 100}%` }} /></div><span style={{ width: 22, textAlign: 'right' }}>{c}</span></div>;
            })}
          </div>
        </div>
      )}
      {!reviews.length ? <Empty icon="star" title="No reviews yet">Reviews appear after customers complete a service.</Empty> : reviews.map((r) => (
        <div key={r._id} className="card review row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <Stars value={r.rating} /> <span className="muted small">· {r.customerId?.name} · {fmtDate(r.createdAt.slice(0, 10))}</span>
            {r.comment && <p style={{ margin: '.5rem 0 0' }}>“{r.comment}”</p>}
          </div>
          {r.reported ? <span className="badge warn">Reported</span> : <button className="btn sm ghost" onClick={() => report(r._id)}>Report</button>}
        </div>
      ))}
      {dialog}
    </>
  );
}
