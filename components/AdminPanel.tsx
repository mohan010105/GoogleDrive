import React, { useEffect, useState } from 'react';
import { api } from '../services/supabaseService';
import { Users, File, HardDrive, Ban, User, Trash2 } from './Icons';
import { UserProfile } from '../types';
import AdminPaymentManagement from './AdminPaymentManagement';
import AdminPlansManagement from './AdminPlansManagement';

const AdminPanel = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'payments'>('users');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    // Mock fetching admin data
    api.getAdminStats().then(setStats);
    api.getUsers().then(setUsers);
  }, []);

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user.id);
    setEditName(user.full_name || '');
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      await api.updateUser(userId, { full_name: editName });
      setUsers(users.map(u => u.id === userId ? { ...u, full_name: editName } : u));
      setEditingUser(null);
      setEditName('');
    } catch (error) {
      alert('Failed to update user');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      await api.removeUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error: any) {
      alert(error.message || 'Failed to remove user');
    }
  };

  if (!stats) return <div className="p-8 text-center text-gray-500">Loading Admin Data...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-lg">
            <File size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Files</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-lg">
            <HardDrive size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Storage Used</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStorage}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Plan Management
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Joined</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {editingUser === user.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(user.id);
                              if (e.key === 'Escape') setEditingUser(null);
                            }}
                          />
                        ) : (
                          user.full_name
                        )}
                      </td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">{user.created_at}</td>
                      <td className="px-6 py-4 text-right flex gap-2 justify-end">
                        {editingUser === user.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(user.id)}
                              className="text-green-500 hover:text-green-700 text-xs font-medium border border-green-200 px-2 py-1 rounded hover:bg-green-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="text-gray-500 hover:text-gray-700 text-xs font-medium border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs font-medium border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                            >
                              <User size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleRemoveUser(user.id)}
                              className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs font-medium border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'plans' ? (
            <AdminPlansManagement />
          ) : (
            <AdminPaymentManagement />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
