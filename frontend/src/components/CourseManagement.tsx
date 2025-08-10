import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Edit, Trash2, Users, Calendar, MapPin, 
  GraduationCap, Save, X, AlertCircle, CheckCircle, Clock 
} from 'lucide-react';
import { courseAPI, authAPI } from '../services/api';

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
  enrolled_students: any[];
  is_active: boolean;
  semester: string;
  academic_year: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface CourseFormData {
  name: string;
  code: string;
  instructor_id: number;
  department: string;
  description: string;
  schedule: string;
  room: string;
  max_students: number;
  semester: string;
  academic_year: string;
}

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    code: '',
    instructor_id: 0,
    department: '',
    description: '',
    schedule: '',
    room: '',
    max_students: 50,
    semester: 'Fall 2024',
    academic_year: '2024-2025'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch courses and instructors
      const [coursesResponse, usersResponse] = await Promise.all([
        courseAPI.getCourses(),
        authAPI.getUsers()
      ]);

      setCourses(coursesResponse.data);
      const instructors = usersResponse.data.filter((user: User) => user.role === 'instructor');
      setInstructors(instructors);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      instructor_id: 0,
      department: '',
      description: '',
      schedule: '',
      room: '',
      max_students: 50,
      semester: 'Fall 2024',
      academic_year: '2024-2025'
    });
    setEditingCourse(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_students' ? parseInt(value) || 50 : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      alert('Course name is required');
      return false;
    }
    if (!formData.code.trim()) {
      alert('Course code is required');
      return false;
    }
    if (!formData.instructor_id) {
      alert('Please select an instructor');
      return false;
    }
    if (!formData.department.trim()) {
      alert('Department is required');
      return false;
    }
    if (!formData.semester.trim()) {
      alert('Semester is required');
      return false;
    }
    if (!formData.academic_year.trim()) {
      alert('Academic year is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingCourse) {
        // Update existing course
        await courseAPI.updateCourse(editingCourse.id, formData);
        alert('Course updated successfully!');
      } else {
        // Create new course
        await courseAPI.createCourse(formData);
        alert('Course created successfully!');
      }
      
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert(error.response?.data?.detail || 'Failed to save course');
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      instructor_id: course.instructor_id,
      department: course.department,
      description: course.description || '',
      schedule: course.schedule || '',
      room: course.room || '',
      max_students: course.max_students,
      semester: course.semester,
      academic_year: course.academic_year
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await courseAPI.deleteCourse(courseId);
      alert('Course deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      alert(error.response?.data?.detail || 'Failed to delete course');
    }
  };

  const getInstructorName = (instructorId: number) => {
    const instructor = instructors.find(inst => inst.id === instructorId);
    return instructor ? instructor.name : 'Unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
          <p className="text-gray-600">Create, edit, and manage all courses in the system</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Course Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingCourse ? 'Edit Course' : 'Create New Course'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Computer Science"
                  required
                />
              </div>

              {/* Course Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CS101"
                  required
                />
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor *
                </label>
                <select
                  name="instructor_id"
                  value={formData.instructor_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select an instructor</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.name} ({instructor.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Computer Science"
                  required
                />
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Semester *
                </label>
                <input
                  type="text"
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Fall 2024"
                  required
                />
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year *
                </label>
                <input
                  type="text"
                  name="academic_year"
                  value={formData.academic_year}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>

              {/* Max Students */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students
                </label>
                <input
                  type="number"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="200"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule
                </label>
                <input
                  type="text"
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Mon/Wed/Fri 10:00 AM - 11:30 AM"
                />
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room
                </label>
                <input
                  type="text"
                  name="room"
                  value={formData.room}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Room 101, Building A"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Course description and objectives..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {editingCourse ? 'Update Course' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Courses List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Courses</h3>
          
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No courses found</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Your First Course
              </button>
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
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{getInstructorName(course.instructor_id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{course.department}</span>
                    </div>
                    {course.schedule && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{course.schedule}</span>
                      </div>
                    )}
                    {course.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{course.room}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{course.enrolled_students.length}/{course.max_students} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{course.semester} ({course.academic_year})</span>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(course.created_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit Course"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

export default CourseManagement;
