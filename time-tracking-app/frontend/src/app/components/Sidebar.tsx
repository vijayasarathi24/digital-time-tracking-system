import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, Settings, LogOut, Clock } from 'lucide-react';

interface SidebarProps {
  type: 'admin' | 'user';
}

export function Sidebar({ type }: SidebarProps) {
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
    <div className="w-64 h-screen bg-white border-r border-[#E2E8F0] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-[#1F2937]">TimeTrack Pro</h1>
            <p className="text-xs text-[#64748B]">{type === 'admin' ? 'Admin Panel' : 'User Panel'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#4F46E5] text-white'
                      : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#EF4444] hover:bg-[#FEE2E2] transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
