import axios from 'axios';

// API Configuration - Single Python FastAPI Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance for the Python FastAPI backend
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartfacetrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smartfacetrack_token');
      localStorage.removeItem('smartfacetrack_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  department: string;
  program?: string;
  student_id?: string;
  face_data?: string;
  avatar?: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

export interface LoginData {
  username: string; // FastAPI OAuth2 expects 'username' field
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'instructor' | 'admin';
  student_id?: string;
  department: string;
  program?: string;
}

export interface AttendanceData {
  course_id: string;
  course_name: string;
  course_code: string;
  instructor_id: number;
  session_start: string;
  session_end: string;
  status: 'present' | 'absent' | 'late';
  confidence?: number;
  face_data?: string;
  location?: string;
  device_info?: string;
}

export interface Course {
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

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Authentication API
export const authAPI = {
  register: (data: RegisterData) => 
    apiClient.post<User>('/auth/register', data),
  
  login: (data: LoginData) => 
    apiClient.post<TokenResponse>('/auth/login', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }),
  
  getProfile: () => 
    apiClient.get<User>('/auth/profile'),
  
  updateProfile: (data: Partial<User>) => 
    apiClient.put<User>('/auth/profile', data),
  
  getUsers: () => 
    apiClient.get<User[]>('/auth/users'),
  
  deleteUser: (userId: number) => 
    apiClient.delete(`/auth/users/${userId}`),
};

// Attendance API
export const attendanceAPI = {
  markAttendance: (data: AttendanceData) => 
    apiClient.post('/attendance/', data),
  
  getUserAttendance: (userId: number) => 
    apiClient.get(`/attendance/user/${userId}`),
  
  getCourseAttendance: (courseId: string) => 
    apiClient.get(`/attendance/course/${courseId}`),
  
  getAttendanceStats: (userId: number) => 
    apiClient.get(`/attendance/stats/${userId}`),
  
  markBulkAttendance: (attendances: AttendanceData[]) => 
    apiClient.post('/attendance/bulk', { attendances }),
  
  getInstructorAttendance: (instructorId: number) => 
    apiClient.get(`/attendance/instructor/${instructorId}`),
};

// Course API
export const courseAPI = {
  getCourses: () => 
    apiClient.get<Course[]>('/courses/'),
  
  getCourse: (courseId: number) => 
    apiClient.get<Course>(`/courses/${courseId}`),
  
  createCourse: (data: Omit<Course, 'id' | 'created_at' | 'updated_at' | 'enrolled_students'>) => 
    apiClient.post<Course>('/courses/', data),
  
  updateCourse: (courseId: number, data: Partial<Course>) => 
    apiClient.put<Course>(`/courses/${courseId}`, data),
  
  enrollStudent: (courseId: number, studentId: number) => 
    apiClient.post(`/courses/${courseId}/enroll/${studentId}`),
  
  removeStudent: (courseId: number, studentId: number) => 
    apiClient.delete(`/courses/${courseId}/enroll/${studentId}`),
  
  getInstructorCourses: (instructorId: number) => 
    apiClient.get<Course[]>(`/courses/instructor/${instructorId}`),
  
  getInstructorEnrolledStudents: (instructorId: number) => 
    apiClient.get(`/courses/instructor/${instructorId}/enrolled-students`),

  getStudentCourses: (studentId: number) => 
    apiClient.get<Course[]>(`/courses/student/${studentId}`),

  // Notification endpoints
  getNotifications: (params?: { skip?: number; limit?: number; unread_only?: boolean }) => 
    apiClient.get('/notifications', { params }),
  
  getUnreadCount: () => 
    apiClient.get('/notifications/unread-count'),
  
  markNotificationRead: (notificationId: number) => 
    apiClient.patch(`/notifications/${notificationId}/read`),
  
  markAllNotificationsRead: () => 
    apiClient.patch('/notifications/read-all'),
  
  deleteNotification: (notificationId: number) => 
    apiClient.delete(`/notifications/${notificationId}`),
  
  deleteAllNotifications: () => 
    apiClient.delete('/notifications'),
  
  createSystemNotification: (data: any) => 
    apiClient.post('/notifications/system', data),
  
  broadcastNotification: (data: any, userRoles?: string[]) => 
    apiClient.post('/notifications/broadcast', data, { params: { user_roles: userRoles } }),
  
  getAvailableCourses: () => 
    apiClient.get('/courses/available'),
  
  selfEnrollStudent: (courseId: number) => 
    apiClient.post(`/courses/${courseId}/self-enroll`),
  
  selfUnenrollStudent: (courseId: number) => 
    apiClient.delete(`/courses/${courseId}/self-unenroll`),
  
  getStudentDashboardCourses: () => 
    apiClient.get('/courses/dashboard/student'),
  
  getStudentDashboardSimple: () => 
    apiClient.get('/courses/dashboard/student/simple'),
  
  deleteCourse: (courseId: number) => 
    apiClient.delete(`/courses/${courseId}`),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => 
    apiClient.get('/admin/dashboard/stats'),
  
  getDashboardActivity: (limit: number = 10) => 
    apiClient.get(`/admin/dashboard/activity?limit=${limit}`),
};

// Face Recognition API
export const faceRecognitionAPI = {
  registerFace: (faceData: string) => 
    apiClient.post('/face/register-face', { face_data: faceData }),
  
  verifyFace: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/face/verify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  verifyFaceBase64: (faceData: string) => 
    apiClient.post('/face/verify-base64', { face_data: faceData }),
  
  extractEmbedding: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/face/extract-embedding', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  compareEmbeddings: (embedding1: number[], embedding2: number[]) => 
    apiClient.post('/face/compare', { embedding1, embedding2 }),
  
  healthCheck: () => 
    apiClient.get('/face/health'),
};

// Utility functions for managing auth tokens
export const setAuthToken = (token: string) => {
  localStorage.setItem('smartfacetrack_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('smartfacetrack_token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('smartfacetrack_token');
  localStorage.removeItem('smartfacetrack_user');
};
