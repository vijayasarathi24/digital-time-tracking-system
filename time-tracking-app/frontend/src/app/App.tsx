import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Landing } from './pages/Landing';
import { AdminLogin } from './pages/AdminLogin';
import { UserLogin } from './pages/UserLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserDashboard } from './pages/UserDashboard';

export default function App() {
  return (
    <AppProvider>
      <Router>
        <div className="font-['Inter',sans-serif] antialiased">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminDashboard />} />
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/reports" element={<UserDashboard />} />
            <Route path="/user/settings" element={<UserDashboard />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}