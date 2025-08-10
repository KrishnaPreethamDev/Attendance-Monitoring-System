import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Loader2, BookOpen, Users, Clock } from 'lucide-react';
import { courseAPI, faceRecognitionAPI, attendanceAPI, Course } from '../services/api';
import { User } from '../App';

interface AttendanceCaptureProps {
  user: User;
}

interface DetectedFace {
  id: string;
  name: string;
  confidence: number;
  timestamp: string;
  status: 'recognized' | 'unknown' | 'processing';
}

const AttendanceCapture: React.FC<AttendanceCaptureProps> = ({ user }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [sessionStats, setSessionStats] = useState({
    totalDetected: 0,
    recognized: 0,
    unknown: 0,
    presentStudents: 0,
  });
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchInstructorCourses();
  }, [user.id]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const fetchInstructorCourses = async () => {
    try {
      setIsLoading(true);
      const response = await courseAPI.getInstructorCourses(Number(user.id));
      setCourses(response.data);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCapture = async () => {
    if (!selectedCourse) {
      alert('Please select a course first');
      return;
    }

    await startCamera();
    setIsCapturing(true);
    setSessionStartTime(new Date());
    setDetectedFaces([]);
    setSessionStats({ totalDetected: 0, recognized: 0, unknown: 0, presentStudents: 0 });
  };

  const stopCapture = () => {
    setIsCapturing(false);
    stopCamera();
    setSessionStartTime(null);
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        // Create a file from blob
        const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

        // Send to face recognition API
        const response = await faceRecognitionAPI.verifyFace(file);
        
        if (response.data.match && response.data.user) {
          const detectedUser = response.data.user;
          
          // Check if user is enrolled in the selected course
          const isEnrolled = selectedCourse?.enrolled_students.some(student => student.id === detectedUser.id);
          
          if (isEnrolled) {
            // Mark attendance
            await markAttendance(detectedUser.id, response.data.confidence || 0);
            
            // Add to detected faces
            const newFace: DetectedFace = {
              id: detectedUser.id.toString(),
              name: detectedUser.name,
              confidence: response.data.confidence || 0,
              timestamp: new Date().toISOString(),
              status: 'recognized'
            };
            
            setDetectedFaces(prev => [...prev, newFace]);
            setSessionStats(prev => ({
              ...prev,
              totalDetected: prev.totalDetected + 1,
              recognized: prev.recognized + 1,
              presentStudents: prev.presentStudents + 1
            }));
          } else {
            // User not enrolled in this course
            const newFace: DetectedFace = {
              id: 'unknown',
              name: 'Not enrolled in this course',
              confidence: response.data.confidence || 0,
              timestamp: new Date().toISOString(),
              status: 'unknown'
            };
            
            setDetectedFaces(prev => [...prev, newFace]);
            setSessionStats(prev => ({
              ...prev,
              totalDetected: prev.totalDetected + 1,
              unknown: prev.unknown + 1
            }));
          }
        } else {
          // No face recognized
          const newFace: DetectedFace = {
            id: 'unknown',
            name: 'Unknown Person',
            confidence: 0,
            timestamp: new Date().toISOString(),
            status: 'unknown'
          };
          
          setDetectedFaces(prev => [...prev, newFace]);
          setSessionStats(prev => ({
            ...prev,
            totalDetected: prev.totalDetected + 1,
            unknown: prev.unknown + 1
          }));
        }
      } catch (error) {
        console.error('Error processing face:', error);
      }
    }, 'image/jpeg', 0.8);
  };

  const markAttendance = async (userId: number, confidence: number) => {
    if (!selectedCourse || !sessionStartTime) return;

    try {
      const sessionEnd = new Date();
      sessionEnd.setMinutes(sessionEnd.getMinutes() + 1); // 1 minute session

      const attendanceData = {
        user_id: userId,
        course_id: selectedCourse.id.toString(),
        course_name: selectedCourse.name,
        course_code: selectedCourse.code,
        instructor_id: Number(user.id),
        session_start: sessionStartTime.toISOString(),
        session_end: sessionEnd.toISOString(),
        status: 'present' as const,
        confidence: confidence,
        face_data: '', // You could store the captured image data here
        location: 'Classroom',
        device_info: navigator.userAgent
      };

      await attendanceAPI.markAttendance(attendanceData);
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const exportAttendance = () => {
    const csvContent = [
      ['Student ID', 'Name', 'Status', 'Confidence', 'Timestamp'],
      ...detectedFaces.map(face => [
        face.id,
        face.name,
        face.status,
        `${(face.confidence * 100).toFixed(1)}%`,
        new Date(face.timestamp).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedCourse?.code}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
        <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchInstructorCourses}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Course Selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Course</h3>
        {courses.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No courses found. Please create a course first.</p>
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
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h4 className="font-semibold text-gray-900">{course.name}</h4>
                <p className="text-sm text-gray-500">{course.code}</p>
                <p className="text-sm text-gray-600">{course.enrolled_students.length} students enrolled</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Camera Section */}
      {selectedCourse && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Attendance Capture - {selectedCourse.name}
            </h3>
            <div className="flex items-center gap-3">
              {!isCapturing ? (
                <button
                  onClick={startCapture}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Clock className="w-4 h-4" />
                  Start Session
                </button>
              ) : (
                <button
                  onClick={stopCapture}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                  Stop Session
                </button>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Camera Feed */}
            <div className="space-y-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {!cameraStream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}
              </div>

              {isCapturing && (
                <div className="flex justify-center">
                  <button
                    onClick={captureAndProcess}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Loader2 className="w-4 h-4" />
                    Capture & Process
                  </button>
                </div>
              )}
            </div>

            {/* Session Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Total Detected</p>
                  <p className="text-2xl font-bold text-blue-900">{sessionStats.totalDetected}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Recognized</p>
                  <p className="text-2xl font-bold text-green-900">{sessionStats.recognized}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600">Unknown</p>
                  <p className="text-2xl font-bold text-yellow-900">{sessionStats.unknown}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600">Present</p>
                  <p className="text-2xl font-bold text-purple-900">{sessionStats.presentStudents}</p>
                </div>
              </div>

              {sessionStartTime && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Session Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)}s
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detected Faces */}
      {detectedFaces.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Detected Faces</h3>
            <button
              onClick={exportAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Loader2 className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {detectedFaces.map((face, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  face.status === 'recognized' ? 'bg-green-50 border-green-200' :
                  face.status === 'unknown' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    face.status === 'recognized' ? 'bg-green-100 text-green-600' :
                    face.status === 'unknown' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {face.status === 'recognized' ? <CheckCircle className="w-4 h-4" /> :
                     face.status === 'unknown' ? <AlertCircle className="w-4 h-4" /> :
                     <X className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{face.name}</p>
                    <p className="text-sm text-gray-500">
                      Confidence: {(face.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(face.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCapture;