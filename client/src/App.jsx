import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerLayout, DashboardLayout } from './components/Layouts.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Toasts } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Search from './pages/Search.jsx';
import BusinessDetails from './pages/BusinessDetails.jsx';
import Booking from './pages/Booking.jsx';
import MyBookings from './pages/MyBookings.jsx';
import BookingDetails from './pages/BookingDetails.jsx';
import Profile from './pages/Profile.jsx';
import OwnerDashboard from './pages/owner/Dashboard.jsx';
import BusinessProfile from './pages/owner/BusinessProfile.jsx';
import Services from './pages/owner/Services.jsx';
import Appointments from './pages/owner/Appointments.jsx';
import Calendar from './pages/owner/Calendar.jsx';
import WorkingHours from './pages/owner/WorkingHours.jsx';
import Settings from './pages/owner/Settings.jsx';
import OwnerReviews from './pages/owner/OwnerReviews.jsx';
import { AdminBookings, AdminBusinesses, AdminDashboard, AdminReviews, AdminUsers } from './pages/admin/AdminPages.jsx';

export default function App() {
  const { toasts } = useAuth();
  return (
    <>
      <Routes>
        {/* Public + customer experience */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/businesses" element={<Search />} />
          <Route path="/business/:id" element={<BusinessDetails />} />
          <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
            <Route path="/booking/:id" element={<Booking />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/my-bookings/:id" element={<BookingDetails />} />
          </Route>
          <Route element={<ProtectedRoute roles={['CUSTOMER', 'OWNER', 'ADMIN']} />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Business owner shell */}
        <Route element={<ProtectedRoute roles={['OWNER']}><DashboardLayout role="OWNER" /></ProtectedRoute>}>
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/appointments" element={<Appointments />} />
          <Route path="/owner/calendar" element={<Calendar />} />
          <Route path="/owner/services" element={<Services />} />
          <Route path="/owner/business" element={<BusinessProfile />} />
          <Route path="/owner/hours" element={<WorkingHours />} />
          <Route path="/owner/reviews" element={<OwnerReviews />} />
          <Route path="/owner/settings" element={<Settings />} />
        </Route>

        {/* Admin shell */}
        <Route element={<ProtectedRoute roles={['ADMIN']}><DashboardLayout role="ADMIN" /></ProtectedRoute>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/businesses" element={<AdminBusinesses />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts toasts={toasts} />
    </>
  );
}
