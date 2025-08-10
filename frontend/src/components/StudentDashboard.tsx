import React, { useState, useEffect } from 'react';
import { User as UserIcon, Calendar, Clock, TrendingUp, AlertCircle, BarChart3, CheckCircle, XCircle, Award, BookOpen } from 'lucide-react';
import { User } from '../App';
import { attendanceAPI, courseAPI } from '../services/api';

interface StudentDashboardProps {
  user: User;
}

interface AttendanceRecord {
  id: number;
  course_name: string;
  course_code: string;
  session_start: string;
  session_end: string;
  status: 'present' | 'absent' | 'late';
  instructor_id: number;
  created_at: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  instructor_id: number;
  department: string;
  description?: string;
  schedule?: string;
  room?: string;
  max_students: number;
  enrolled_students: User[];
  is_active: boolean;
  semester: string;
  academic_year: string;
  created_at: string;
  updated_at: string;
}

interface DashboardCourse {
  id: number;
  name: string;
  code: string;
  description?: string;
  instructor_name: string;
  instructor_id: number;
  is_active: boolean;
  max_students: number;
  enrolled_count: number;
  available_spots: number;
  is_enrolled: boolean;
  can_enroll: boolean;
  created_at: string;
  updated_at: string;
}

interface AttendanceStats {
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's attendance records
      const attendanceResponse = await attendanceAPI.getUserAttendance(user.id);
      setAttendanceRecords(attendanceResponse.data);

      // Fetch user's enrolled courses
      const coursesResponse = await courseAPI.getStudentCourses(user.id);
      setCourses(coursesResponse.data);

      // Fetch dashboard courses (all available + enrolled status)
      const dashboardResponse = await courseAPI.getStudentDashboardCourses();
      setDashboardCourses(dashboardResponse.data);

      // Fetch attendance statistics
      const statsResponse = await attendanceAPI.getAttendanceStats(user.id);
      setAttendanceStats(statsResponse.data);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />;
      case 'absent': return <XCircle className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleEnroll = async (courseId: number) => {
    try {
      await courseAPI.selfEnrollStudent(courseId);
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Failed to enroll in course');
    }
  };

  const handleUnenroll = async (courseId: number) => {
    try {
      await courseAPI.selfUnenrollStudent(courseId);
      // Refresh dashboard data
      fetchDashboardData();
    } catch (error) {
      console.error('Unenrollment error:', error);
      alert('Failed to unenroll from course');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats ? `${attendanceStats.attendance_rate.toFixed(1)}%` : '0%'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats ? attendanceStats.total_sessions : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceStats ? attendanceStats.present_count : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Attendance</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="semester">This Semester</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(record.status)}`}>
                      {getStatusIcon(record.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{record.course_name}</p>
                      <p className="text-sm text-gray-500">{record.course_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatDate(record.session_start)}</p>
                    <p className="text-sm text-gray-500">{formatTime(record.session_start)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Available Courses</h3>
          <p className="text-sm text-gray-600 mt-1">View and enroll in courses created by administrators</p>
        </div>
        
        <div className="p-6">
          {dashboardCourses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No courses available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardCourses.map((course) => (
                <div key={course.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{course.name}</h4>
                      <p className="text-sm text-gray-500">{course.code}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        course.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {course.is_enrolled && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Enrolled
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {course.description && <p><span className="font-medium">Description:</span> {course.description}</p>}
                    <p><span className="font-medium">Instructor:</span> {course.instructor_name}</p>
                    <p><span className="font-medium">Available Spots:</span> {course.available_spots}/{course.max_students}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {course.is_enrolled ? (
                      <button
                        onClick={() => handleUnenroll(course.id)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Unenroll
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={!course.can_enroll}
                        className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors ${
                          course.can_enroll
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {course.can_enroll ? 'Enroll' : 'Full'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;