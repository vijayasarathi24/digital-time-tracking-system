import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut, Clock } from 'lucide-react';

interface TopNavProps {
  type: 'admin' | 'user';
}

export function TopNav({ type }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const userMenuItems = [
    { icon: Clock, label: 'Timer', path: '/user/dashboard' },
    { icon: BarChart3, label: 'Reports', path: '/user/reports' },
    { icon: Settings, label: 'Settings', path: '/user/settings' },
  ];

  const menuItems = type === 'admin' ? adminMenuItems : userMenuItems;

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-[#1F2937] text-lg">Digital Time Tracking System</h1>
              <p className="text-xs text-[#64748B]">{type === 'admin' ? 'Admin Panel' : 'User Panel'}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#4F46E5] text-white'
                      : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#EF4444] hover:bg-[#FEE2E2] transition-all ml-4"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}