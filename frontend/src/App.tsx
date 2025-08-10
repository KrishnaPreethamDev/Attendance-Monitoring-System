import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Camera, BookOpen, Settings, Menu, X, LogOut } from 'lucide-react';
import { NotificationProvider } from './contexts/NotificationContext';
import AuthPage from './components/AuthPage';
import StudentDashboard from './components/StudentDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AttendanceCapture from './components/AttendanceCapture';
import CourseManagement from './components/CourseManagement';
import ProfileManagement from './components/ProfileManagement';
import NotificationBell from './components/NotificationBell';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  department?: string;
  program?: string;
  student_id?: string;
  face_data?: string;
  avatar?: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications] = useState(0); // This will be managed by NotificationContext

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('smartfacetrack_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupted or non-JSON value from older versions
        localStorage.removeItem('smartfacetrack_user');
      }
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('smartfacetrack_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smartfacetrack_user');
    localStorage.removeItem('smartfacetrack_token');
    setCurrentView('dashboard');
  };

  const getNavItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'profile', label: 'Profile', icon: Users },
    ];

    if (user?.role === 'instructor') {
      baseItems.splice(1, 0, { id: 'attendance', label: 'Take Attendance', icon: Camera });
    }

    if (user?.role === 'admin') {
      baseItems.splice(1, 0, { id: 'courses', label: 'Course Management', icon: BookOpen });
      baseItems.push({ id: 'settings', label: 'Settings', icon: Settings });
    }

    return baseItems;
  };

  const renderCurrentView = () => {
    if (!user) return null;

    switch (currentView) {
      case 'dashboard':
        if (user.role === 'student') return <StudentDashboard user={user} />;
        if (user.role === 'instructor') return <InstructorDashboard user={user} />;
        if (user.role === 'admin') return <AdminDashboard user={user} />;
        break;
      case 'attendance':
        return <AttendanceCapture user={user} />;
      case 'courses':
        if (user.role === 'admin') return <CourseManagement />;
        break;
      case 'profile':
        return <ProfileManagement user={user} onUpdateUser={setUser} />;
      case 'settings':
        return <AdminDashboard user={user} />;
      default:
        return <StudentDashboard user={user} />;
    }
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold text-gray-900">SmartFaceTrack</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className={`
            fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200
            transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            lg:translate-x-0 transition-transform duration-300 ease-in-out
          `}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SmartFaceTrack</h1>
                  <p className="text-sm text-gray-500 capitalize">{user.role} Portal</p>
                </div>
              </div>
            </div>

            <nav className="p-4 space-y-2">
              {getNavItems().map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                      ${currentView === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <div className="flex-1 lg:ml-0">
            <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 capitalize">
                    {currentView === 'dashboard' ? `${user.role} Dashboard` : currentView}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Welcome back, {user.name}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <NotificationBell />
                  
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <main className="p-6">
              {renderCurrentView()}
            </main>
          </div>
        </div>
      </div>
    </NotificationProvider>
  );
}

export default App;