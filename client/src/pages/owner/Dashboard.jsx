import { Link } from 'react-router-dom';
import BookingCard from '../../components/BookingCard.jsx';
import Icon from '../../components/Icon.jsx';
import { Empty, ErrorBox, ListSkeleton, Skeleton, StatusBadge } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useAvailabilitySocket } from '../../hooks/useAvailabilitySocket.js';
import { businessService } from '../../services/businessService.js';
import { bookingService } from '../../services/bookingService.js';
import { money, todayStr } from '../../utils/format.js';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const Stat = ({ icon, label, value }) => (
  <div className="stat"><div className="ico-wrap"><Icon name={icon} size={19} /></div><b>{value}</b><span>{label}</span></div>
);

export default function OwnerDashboard() {
  const biz = useAsync(() => businessService.mine(), []);
  const stats = useAsync(() => (biz.data ? businessService.ownerStats() : Promise.resolve(null)), [biz.data]);
  const today = useAsync(() => (biz.data ? bookingService.ownerList({ date: todayStr() }) : Promise.resolve(null)), [biz.data]);
  useAvailabilitySocket(biz.data?.business._id, () => { stats.reload(); today.reload(); });

  if (biz.loading) return <><Skeleton h={40} w="50%" /><div style={{ height: 20 }} /><ListSkeleton n={3} /></>;
  if (biz.error) {
    return (
      <Empty icon="building" title="Welcome to Book My Slot" action={<Link className="btn lg" to="/owner/business">Register your business</Link>}>
        You have not registered your salon or parlour yet. It only takes a minute.
      </Empty>
    );
  }
  const b = biz.data.business;
  const s = stats.data;
  const upcoming = (today.data?.bookings || []).filter((x) => ['PENDING', 'CONFIRMED', 'ARRIVED', 'IN_SERVICE'].includes(x.bookingStatus)).slice(0, 4);

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: '1.6rem' }}>
        <div><h1 style={{ fontSize: '1.9rem' }}>{greeting()}, {b.name}</h1><span className="muted">Here's how today is looking.</span></div>
        <div className="row"><StatusBadge status={b.status} /><Link className="btn" to="/owner/appointments"><Icon name="plus" size={17} /> Add Walk-in</Link></div>
      </div>
      {b.status === 'PENDING' && <div className="alert warn">Awaiting admin approval. You can set up services and hours meanwhile.</div>}
      {b.status === 'REJECTED' && <div className="alert bad">Your business was rejected. Please contact support.</div>}
      {b.status === 'SUSPENDED' && <div className="alert bad">Your business is suspended.</div>}
      <ErrorBox message={stats.error} />
      {s ? (
        <div className="stats s6">
          <Stat icon="calendar" label="Today's Appointments" value={s.todaysBookings} />
          <Stat icon="check" label="Completed" value={s.completed} />
          <Stat icon="clock" label="Upcoming" value={s.upcoming} />
          <Stat icon="walk" label="Walk-ins" value={s.walkIns} />
          <Stat icon="rupee" label="Today's Revenue" value={money(s.todaysRevenue)} />
          <Stat icon="star" label={`Rating (${s.totalReviews})`} value={s.totalReviews ? s.averageRating.toFixed(1) : '—'} />
        </div>
      ) : <div className="stats">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={118} r={16} />)}</div>}

      <div className="row between" style={{ marginBottom: '.8rem' }}><h2 style={{ margin: 0 }}>Up next</h2><Link className="link" to="/owner/appointments">Full schedule →</Link></div>
      {today.loading ? <ListSkeleton n={2} /> : upcoming.length === 0 ? (
        <Empty icon="calendar" title="Nothing scheduled right now">New online bookings and walk-ins appear here instantly.</Empty>
      ) : upcoming.map((x) => <BookingCard key={x._id} booking={x} showDate={false} />)}
    </>
  );
}
