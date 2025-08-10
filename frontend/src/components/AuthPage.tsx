import React, { useState } from 'react';
import { Camera, Eye, EyeOff, Mail, Lock, User as UserIcon, GraduationCap, Building, BookOpen } from 'lucide-react';
import { User } from '../App';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'instructor' | 'admin',
    department: '',
    program: '',
    studentId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login - use URLSearchParams for x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('username', formData.email);
        params.append('password', formData.password);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
          const detail = (Array.isArray(data?.detail)
            ? data.detail.map((d: any) => d.msg || d.loc?.join('.') || 'Error').join('; ')
            : (typeof data?.detail === 'string' ? data.detail : 'Login failed'));
          throw new Error(detail);
        }

        localStorage.setItem('smartfacetrack_token', data.access_token);
        localStorage.setItem('smartfacetrack_user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        // Register first
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            student_id: formData.studentId,
            department: formData.department,
            program: formData.program,
          }),
        });

        const regData = await response.json();

        if (!response.ok) {
          const detail = (Array.isArray(regData?.detail)
            ? regData.detail.map((d: any) => d.msg || d.loc?.join('.') || 'Error').join('; ')
            : (typeof regData?.detail === 'string' ? regData.detail : 'Registration failed'));
          throw new Error(detail);
        }

        // Auto-login after successful registration to obtain token
        const params = new URLSearchParams();
        params.append('username', formData.email);
        params.append('password', formData.password);

        const loginResp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const loginData = await loginResp.json();
        if (!loginResp.ok) {
          const detail = (Array.isArray(loginData?.detail)
            ? loginData.detail.map((d: any) => d.msg || d.loc?.join('.') || 'Error').join('; ')
            : (typeof loginData?.detail === 'string' ? loginData.detail : 'Login failed'));
          throw new Error(detail);
        }

        localStorage.setItem('smartfacetrack_token', loginData.access_token);
        localStorage.setItem('smartfacetrack_user', JSON.stringify(loginData.user));
        onLogin(loginData.user);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-gray-900">SmartFaceTrack</h1>
                <p className="text-xl text-gray-600 mt-1">Intelligent Attendance Management</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Revolutionize Your Attendance with 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 block mt-2">
                AI-Powered Face Recognition
              </span>
            </h2>
          </div>

          <div className="grid gap-6">
            <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Recognition</h3>
                <p className="text-gray-600">Instant face detection and attendance marking with 99.9% accuracy</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Multi-Role Dashboard</h3>
                <p className="text-gray-600">Tailored interfaces for students, instructors, and administrators</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Analytics</h3>
                <p className="text-gray-600">Comprehensive reporting and predictive insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-center">
              <h2 className="text-3xl font-bold text-white">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-blue-100 mt-2 text-lg">
                {isLogin ? 'Sign in to your account' : 'Register for SmartFaceTrack'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Student/Employee ID
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleChange}
                        placeholder="Enter your ID"
                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="Enter your department"
                        className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                        required
                      />
                    </div>
                  </div>

                  {formData.role === 'student' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Program
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="program"
                          value={formData.program}
                          onChange={handleChange}
                          placeholder="Enter your program"
                          className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;