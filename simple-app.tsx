import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';

const LoginPage: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Simple mock login
    const mockUser = {
      id: 'u_admin_01',
      email: email || 'admin@example.com',
      full_name: 'Test User',
      role: 'admin'
    };
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">CloudDrive</h1>
          <p className="text-gray-500 mt-2">Simple Test Version</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="password"
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">CloudDrive Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">React is working</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Tailwind CSS is working</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Routing is working</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">UPI Payment System ready</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SimpleApp: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('cloud_drive_current_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cloud_drive_current_user');
  };

  // Check for existing session
  React.useEffect(() => {
    const storedUser = localStorage.getItem('cloud_drive_current_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('cloud_drive_current_user');
      }
    }
  }, []);

  return (
    <Routes>
      <Route
        path="/*"
        element={
          user ? (
            <Dashboard user={user} onLogout={handleLogout} />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
    </Routes>
  );
};

export default SimpleApp;
