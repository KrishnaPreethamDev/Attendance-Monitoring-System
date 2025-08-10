import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, X, Search, GraduationCap, UserCheck, UserX,
  AlertCircle, CheckCircle, Clock, BookOpen 
} from 'lucide-react';
import { courseAPI, authAPI } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  student_id?: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
  instructor_id: number;
  department: string;
  enrolled_students: User[];
  max_students: number;
}

const StudentEnrollment: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch courses and students
      const [coursesResponse, usersResponse] = await Promise.all([
        courseAPI.getCourses(),
        authAPI.getUsers()
      ]);

      setCourses(coursesResponse.data);
      const students = usersResponse.data.filter((user: User) => user.role === 'student');
      setStudents(students);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    !selectedCourse?.enrolled_students.some(enrolled => enrolled.id === student.id) &&
    (student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleEnrollStudent = async () => {
    if (!selectedCourse || !selectedStudent) {
      alert('Please select both a course and a student');
      return;
    }

    try {
      await courseAPI.enrollStudent(selectedCourse.id, selectedStudent);
      alert('Student enrolled successfully!');
      setShowEnrollForm(false);
      setSelectedStudent(0);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      alert(error.response?.data?.detail || 'Failed to enroll student');
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedCourse) return;

    if (!confirm('Are you sure you want to remove this student from the course?')) {
      return;
    }

    try {
      await courseAPI.removeStudent(selectedCourse.id, studentId);
      alert('Student removed successfully!');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error removing student:', error);
      alert(error.response?.data?.detail || 'Failed to remove student');
    }
  };

  const getInstructorName = (instructorId: number) => {
    const instructor = students.find(user => user.id === instructorId);
    return instructor ? instructor.name : 'Unknown';
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
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Enrollment Management</h2>
          <p className="text-gray-600">Manage student enrollments across all courses</p>
        </div>
      </div>

      {/* Course Selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Course</h3>
        
        {courses.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No courses available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedCourse?.id === course.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{course.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    course.enrolled_students.length >= course.max_students
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {course.enrolled_students.length}/{course.max_students}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{course.code}</p>
                <p className="text-sm text-gray-600">{course.department}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <GraduationCap className="w-4 h-4" />
                  <span>{getInstructorName(course.instructor_id)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enrollment Management */}
      {selectedCourse && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedCourse.name} - {selectedCourse.code}
                </h3>
                <p className="text-gray-600">
                  {selectedCourse.enrolled_students.length} of {selectedCourse.max_students} students enrolled
                </p>
              </div>
              <button
                onClick={() => setShowEnrollForm(true)}
                disabled={selectedCourse.enrolled_students.length >= selectedCourse.max_students}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  selectedCourse.enrolled_students.length >= selectedCourse.max_students
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                Enroll Student
              </button>
            </div>

            {/* Enrolled Students */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Enrolled Students</h4>
              {selectedCourse.enrolled_students.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No students enrolled yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCourse.enrolled_students.map((student) => (
                    <div key={student.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-gray-500">{student.email}</p>
                            </div>
                          </div>
                          {student.student_id && (
                            <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                          )}
                          <p className="text-sm text-gray-600">{student.department}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove Student"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enroll New Student Form */}
            {showEnrollForm && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Enroll New Student</h4>
                  <button
                    onClick={() => {
                      setShowEnrollForm(false);
                      setSelectedStudent(0);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Students
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, or student ID..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {filteredStudents.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Student
                      </label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>Choose a student...</option>
                        {filteredStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.email}) - {student.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filteredStudents.length === 0 && searchTerm && (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No available students found</p>
                    </div>
                  )}

                  {selectedStudent > 0 && (
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowEnrollForm(false);
                          setSelectedStudent(0);
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEnrollStudent}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <UserCheck className="w-4 h-4" />
                        Enroll Student
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollment;
