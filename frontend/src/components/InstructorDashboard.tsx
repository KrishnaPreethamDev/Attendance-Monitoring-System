import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, BookOpen, Download, Filter, Search, Plus, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { User } from '../App';
import { courseAPI, attendanceAPI } from '../services/api';

interface InstructorDashboardProps {
  user: User;
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

interface Student {
  id: number;
  name: string;
  email: string;
  department: string;
  program?: string;
  student_id?: string;
  face_data?: string;
  avatar?: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
  enrolled_courses?: Array<{
    course_id: number;
    course_name: string;
    course_code: string;
    semester: string;
    academic_year: string;
  }>;
}

interface AttendanceSession {
  id: number;
  course_id: string;
  course_name: string;
  course_code: string;
  instructor_id: number;
  session_start: string;
  session_end: string;
  status: 'present' | 'absent' | 'late';
  confidence: number;
  face_data?: string;
  location?: string;
  device_info?: string;
  created_at: string;
}

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch instructor's courses
      const coursesResponse = await courseAPI.getInstructorCourses(user.id);
      setCourses(coursesResponse.data);

      // Fetch enrolled students for instructor's courses
      const enrolledStudentsResponse = await courseAPI.getInstructorEnrolledStudents(user.id);
      setStudents(enrolledStudentsResponse.data);

      // Fetch attendance sessions for instructor
      const attendanceResponse = await attendanceAPI.getInstructorAttendance(user.id);
      setAttendanceSessions(attendanceResponse.data);

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
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const exportToCSV = () => {
    // Implementation for CSV export
    console.log('Exporting to CSV...');
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCourse === 'all') {
      return matchesSearch;
    }
    
    // Filter by specific course if selected
    return matchesSearch && student.enrolled_courses?.some(course => course.course_id === parseInt(selectedCourse));
  });

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
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{attendanceSessions.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendanceSessions.filter(s => 
                  new Date(s.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'students', label: 'Students', icon: Users },
              { id: 'attendance', label: 'Attendance', icon: Calendar }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h3>
                {courses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No courses found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div key={course.id} className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{course.name}</h4>
                            <p className="text-sm text-gray-500">{course.code}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            course.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {course.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><span className="font-medium">Department:</span> {course.department}</p>
                          {course.schedule && <p><span className="font-medium">Schedule:</span> {course.schedule}</p>}
                          {course.room && <p><span className="font-medium">Room:</span> {course.room}</p>}
                          <p><span className="font-medium">Students:</span> {course.enrolled_students.length}/{course.max_students}</p>
                          <p><span className="font-medium">Semester:</span> {course.semester}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Students</h3>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No students found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Courses</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {student.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.student_id || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.department}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="space-y-1">
                              {student.enrolled_courses?.map((course, index) => (
                                <div key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  {course.course_code} - {course.course_name}
                                </div>
                              )) || <span className="text-gray-400">No courses</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {student.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(student.last_login)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Sessions</h3>
              </div>

              {attendanceSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance sessions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceSessions.map((session) => (
                    <div key={session.id} className="p-6 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">{session.course_name}</h4>
                          <p className="text-sm text-gray-500">{session.course_code}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.status === 'present' ? 'bg-green-100 text-green-800' :
                          session.status === 'absent' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Session Start:</span>
                          <p>{formatDate(session.session_start)} {formatTime(session.session_start)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Session End:</span>
                          <p>{formatDate(session.session_end)} {formatTime(session.session_end)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span>
                          <p>{(session.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>
                          <p>{formatDate(session.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;