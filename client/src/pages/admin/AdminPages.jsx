import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Empty, ErrorBox, ListSkeleton, Skeleton, SourceTag, StatusBadge, Stars } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useConfirm } from '../../hooks/useConfirm.jsx';
import { errMsg } from '../../services/api.js';
import { adminService } from '../../services/bookingService.js';
import { GENDER_LABEL, TYPE_LABEL, fmtDate, fmtTime, money } from '../../utils/format.js';

const Table = ({ head, children }) => (
  <div className="table-wrap"><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
);
const Title = ({ children, sub }) => <div style={{ marginBottom: '1.2rem' }}><h1 style={{ fontSize: '1.9rem' }}>{children}</h1>{sub && <span className="muted">{sub}</span>}</div>;

export function AdminDashboard() {
  const { data, loading, error } = useAsync(() => adminService.stats(), []);
  const refunds = useAsync(() => adminService.refunds(), []);
  const items = data && [
    ['users', 'Total Users', data.totalCustomers], ['building', 'Total Businesses', data.totalBusinesses], ['clock', 'Pending Approvals', data.pendingBusinesses],
    ['calendar', 'Total Bookings', data.totalBookings], ['zap', "Today's Bookings", data.todaysBookings], ['check', 'Active Businesses', data.activeBusinesses], ['rupee', 'Total Revenue', money(data.totalRevenue)],
  ];
  return (
    <>
      <Title sub="Platform health at a glance.">Dashboard</Title>
      <ErrorBox message={error} />
      <div className="stats">
        {loading ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={118} r={16} />)
          : items?.map(([ic, k, v]) => <div key={k} className="stat"><div className="ico-wrap"><Icon name={ic} size={19} /></div><b>{v}</b><span>{k}</span></div>)}
      </div>
      {refunds.data?.payments.length > 0 && <div className="alert warn">{refunds.data.payments.length} payment(s) need a manual refund in Razorpay.</div>}
    </>
  );
}

export function AdminUsers() {
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const { data, loading, error, reload } = useAsync(() => adminService.users(), []);
  const toggle = async (u) => {
    if (u.isActive && !(await confirm({ title: `Block ${u.name}?`, message: 'They will be signed out and unable to use the platform.', confirmLabel: 'Block user', danger: true }))) return;
    try { await adminService.setUserBlocked(u._id, u.isActive); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  return (
    <>
      <Title>Users</Title><ErrorBox message={error} />
      {loading ? <ListSkeleton /> : (
        <Table head={['Name', 'Email', 'Role', 'Gender', 'Status', '']}>
          {data?.users.map((u) => (
            <tr key={u._id}><td><b>{u.name}</b></td><td className="muted">{u.email}</td><td>{u.role}</td><td className="muted">{u.gender.replace('_', ' ').toLowerCase()}</td>
              <td><span className={`badge ${u.isActive ? 'ok' : 'bad'}`}>{u.isActive ? 'Active' : 'Blocked'}</span></td>
              <td>{u.role !== 'ADMIN' && <button className={`btn sm ${u.isActive ? 'danger' : 'ok'}`} onClick={() => toggle(u)}>{u.isActive ? 'Block' : 'Unblock'}</button>}</td></tr>
          ))}
        </Table>
      )}
      {dialog}
    </>
  );
}

export function AdminBusinesses() {
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useAsync(() => adminService.businesses(status), [status]);
  const act = async (b, action) => {
    if (action !== 'approve' && !(await confirm({ title: `${action === 'reject' ? 'Reject' : 'Suspend'} ${b.name}?`, message: 'The business will not be visible to customers.', confirmLabel: action === 'reject' ? 'Reject' : 'Suspend', danger: true }))) return;
    try { await adminService.setBusiness(b._id, action); toast(`Business ${action}d`, 'success'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  return (
    <>
      <div className="row between wrap"><Title sub="Approve new listings and manage existing ones.">Businesses</Title>
        <select aria-label="Filter by status" style={{ width: 190 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <ErrorBox message={error} />
      {loading ? <ListSkeleton /> : !data?.businesses.length ? <Empty icon="building" title="Nothing here">No businesses match this filter.</Empty> : (
        <Table head={['Business', 'Type', 'Gender', 'Owner', 'Location', 'Status', 'Action']}>
          {data.businesses.map((b) => (
            <tr key={b._id}><td><b>{b.name}</b></td><td>{TYPE_LABEL[b.type]}</td><td><span className={`tag g-${b.genderCategory}`}>{GENDER_LABEL[b.genderCategory]}</span></td>
              <td>{b.ownerId?.name}<div className="muted xs">{b.ownerId?.email}</div></td><td className="muted">{b.city}</td><td><StatusBadge status={b.status} /></td>
              <td><div className="row gap-s wrap">
                {b.status !== 'ACTIVE' && <button className="btn sm ok" onClick={() => act(b, 'approve')}>Approve</button>}
                {b.status === 'PENDING' && <button className="btn sm danger" onClick={() => act(b, 'reject')}>Reject</button>}
                {b.status === 'ACTIVE' && <button className="btn sm danger" onClick={() => act(b, 'suspend')}>Suspend</button>}
              </div></td></tr>
          ))}
        </Table>
      )}
      {dialog}
    </>
  );
}

export function AdminBookings() {
  const { data, loading, error } = useAsync(() => adminService.bookings(), []);
  return (
    <>
      <Title>Bookings</Title><ErrorBox message={error} />
      {loading ? <ListSkeleton /> : !data?.bookings.length ? <Empty icon="calendar" title="No bookings yet">Bookings appear here as customers book.</Empty> : (
        <Table head={['ID', 'Business', 'Customer', 'Service', 'When', 'Source', 'Status', 'Payment', 'Amount']}>
          {data.bookings.map((b) => (
            <tr key={b._id}><td className="small muted">{b.bookingNumber}</td><td>{b.businessId?.name}</td><td>{b.customerName}</td><td>{b.serviceName}</td>
              <td>{fmtDate(b.bookingDate)} · {fmtTime(b.startTime)}</td><td><SourceTag source={b.bookingSource} /></td><td><StatusBadge status={b.bookingStatus} /></td>
              <td className="muted">{b.paymentStatus.replace('_', ' ').toLowerCase()}</td><td>{money(b.amount)}</td></tr>
          ))}
        </Table>
      )}
    </>
  );
}

export function AdminReviews() {
  const { toast } = useAuth();
  const [confirm, dialog] = useConfirm();
  const [onlyReported, setOnly] = useState(true);
  const { data, loading, error, reload } = useAsync(() => adminService.reviews(onlyReported), [onlyReported]);
  const run = async (fn) => { try { await fn(); reload(); } catch (e) { toast(errMsg(e), 'error'); } };
  const del = async (r) => {
    if (await confirm({ title: 'Delete this review?', message: 'This permanently removes it and recalculates the business rating.', confirmLabel: 'Delete review', danger: true })) run(() => adminService.deleteReview(r._id));
  };
  return (
    <>
      <div className="row between wrap"><Title sub="Moderate reviews reported by businesses.">Reviews</Title>
        <label className="inline"><input type="checkbox" checked={onlyReported} onChange={(e) => setOnly(e.target.checked)} /> Reported only</label></div>
      <ErrorBox message={error} />
      {loading ? <ListSkeleton /> : !data?.reviews.length ? <Empty icon="star" title="No reviews to moderate">Nothing reported right now.</Empty> : data.reviews.map((r) => (
        <div key={r._id} className="card review row between" style={{ alignItems: 'flex-start' }}>
          <div><Stars value={r.rating} /> <b>{r.customerId?.name}</b> <span className="muted">on</span> <b>{r.businessId?.name}</b> {r.reported && <span className="badge bad">Reported</span>}
            {r.comment && <p style={{ margin: '.5rem 0 0' }}>“{r.comment}”</p>}</div>
          <div className="row gap-s">
            {r.reported && <button className="btn sm ghost" onClick={() => run(() => adminService.dismissReport(r._id))}>Dismiss</button>}
            <button className="btn sm danger" onClick={() => del(r)}>Delete</button>
          </div>
        </div>
      ))}
      {dialog}
    </>
  );
}
