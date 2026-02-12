import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { SummaryCard } from '../components/SummaryCard';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useApp } from '../context/AppContext';
import { Users, Clock, Activity, UserCheck, Plus, Edit, Trash2, Eye, Key } from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { users, timeLogs, currentUser, addUser, updateUser, deleteUser } = useApp();
  const [filter, setFilter] = useState('day');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', password: '' });
  const [newPassword, setNewPassword] = useState('');

  // Redirect if not logged in as admin
  React.useEffect(() => {
    if (!currentUser || currentUser.type !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  const filteredUsers = users.filter(u => u.id !== 1); // Exclude admin

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let relevantLogs = timeLogs;
    if (filter === 'day') {
      relevantLogs = timeLogs.filter(log => log.date === today);
    } else if (filter === 'week') {
      relevantLogs = timeLogs.filter(log => log.date >= weekAgo);
    } else if (filter === 'month') {
      relevantLogs = timeLogs.filter(log => log.date >= monthAgo);
    }

    const totalHours = relevantLogs.reduce((sum, log) => sum + log.duration, 0) / 3600;
    const todayLogs = timeLogs.filter(log => log.date === today);
    const todayHours = todayLogs.reduce((sum, log) => sum + log.duration, 0) / 3600;
    const activeUsers = new Set(todayLogs.map(log => log.userId)).size;

    return {
      totalUsers: filteredUsers.length,
      totalHours: totalHours.toFixed(1),
      todayActivity: todayHours.toFixed(1),
      activeUsers,
    };
  }, [users, timeLogs, filter, filteredUsers]);

  const userReports = useMemo(() => {
    return filteredUsers.map(user => {
      const userLogs = timeLogs.filter(log => log.userId === user.id);
      const totalSeconds = userLogs.reduce((sum, log) => sum + log.duration, 0);
      const hours = (totalSeconds / 3600).toFixed(1);
      
      return {
        ...user,
        totalHours: `${hours}h`,
      };
    });
  }, [filteredUsers, timeLogs]);

  const handleAddUser = () => {
    if (!newUser.name || !newUser.username || !newUser.email || !newUser.password) {
      alert('Please fill in all fields');
      return;
    }

    if (users.some(u => u.username === newUser.username)) {
      alert('Username already exists');
      return;
    }

    addUser(newUser);
    setIsAddUserModalOpen(false);
    setNewUser({ name: '', username: '', email: '', password: '' });
  };

  const handleEditUser = () => {
    if (!selectedUser?.name || !selectedUser?.email) {
      alert('Please fill in all fields');
      return;
    }

    updateUser(selectedUser.id, {
      name: selectedUser.name,
      email: selectedUser.email,
    });
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = () => {
    deleteUser(selectedUser.id);
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }

    updateUser(selectedUser.id, { password: newPassword });
    setIsResetPasswordModalOpen(false);
    setSelectedUser(null);
    setNewPassword('');
    alert('Password reset successfully!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav type="admin" />
      
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">Dashboard</h1>
          <p className="text-[#64748B]">Overview of your team's time tracking</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<Users className="w-6 h-6" />}
          />
          <SummaryCard
            title="Total Hours Logged"
            value={`${stats.totalHours}h`}
            icon={<Clock className="w-6 h-6" />}
          />
          <SummaryCard
            title="Today's Activity"
            value={`${stats.todayActivity}h`}
            icon={<Activity className="w-6 h-6" />}
          />
          <SummaryCard
            title="Active Users"
            value={stats.activeUsers}
            icon={<UserCheck className="w-6 h-6" />}
          />
        </div>

        {/* Reports Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1F2937]">Time Reports</h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">User Name</th>
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">Total Hours</th>
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {userReports.length > 0 ? (
                  userReports.map((user) => (
                    <tr key={user.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 text-[#1F2937]">{user.name}</td>
                      <td className="py-3 px-4 text-[#1F2937]">{user.totalHours}</td>
                      <td className="py-3 px-4 text-[#64748B]">{user.lastActivity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#64748B]">
                      No data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1F2937]">User Management</h2>
            <Button
              onClick={() => setIsAddUserModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add User
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">Name</th>
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">Username</th>
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">Email</th>
                  <th className="text-left py-3 px-4 text-sm text-[#64748B]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 text-[#1F2937]">{user.name}</td>
                    <td className="py-3 px-4 text-[#64748B]">{user.username}</td>
                    <td className="py-3 px-4 text-[#64748B]">{user.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-[#4F46E5] hover:bg-[#F1F5F9] rounded transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsResetPasswordModalOpen(true);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-[#4F46E5] hover:bg-[#F1F5F9] rounded transition-colors"
                          title="Reset password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New User"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="Enter full name"
            required
          />
          <Input
            label="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder="Enter username"
            required
          />
          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="Enter email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Enter password"
            required
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button onClick={handleAddUser} fullWidth>
              Add User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
      >
        {selectedUser && (
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={selectedUser.name}
              onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
              placeholder="Enter full name"
            />
            <Input
              label="Email"
              type="email"
              value={selectedUser.email}
              onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
              placeholder="Enter email"
            />
            <div className="p-3 bg-[#F1F5F9] rounded-lg">
              <p className="text-sm text-[#64748B]">
                <strong>Username:</strong> {selectedUser.username} (cannot be changed)
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleEditUser} fullWidth>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Reset Password"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[#64748B]">
            Reset password for <span className="font-semibold text-[#1F2937]">{selectedUser?.name}</span>
          </p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsResetPasswordModalOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} fullWidth>
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[#64748B]">
            Are you sure you want to delete <span className="font-semibold text-[#1F2937]">{selectedUser?.name}</span>? 
            This will also delete all their time logs. This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} fullWidth>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
