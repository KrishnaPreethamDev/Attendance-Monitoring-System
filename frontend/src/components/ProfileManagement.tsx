import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Camera, Save, Edit, Upload, Trash2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { User } from '../App';
import { authAPI, faceRecognitionAPI } from '../services/api';

interface ProfileManagementProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    department: user.department || '',
    program: user.program || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [faceEnrollmentStatus, setFaceEnrollmentStatus] = useState<'none' | 'enrolled' | 'processing'>('enrolled');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await authAPI.updateProfile({
        name: formData.name,
        email: formData.email,
        department: formData.department,
        program: formData.program,
      });
      
      const updatedUser: User = {
        ...user,
        name: response.data.name,
        email: response.data.email,
        department: response.data.department,
        program: response.data.program,
      };
      
      onUpdateUser(updatedUser);
      setIsEditing(false);
      
      // Save to localStorage
      localStorage.setItem('smartfacetrack_user', JSON.stringify(updatedUser));
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setProfileImage(imageData);
        
        try {
          setFaceEnrollmentStatus('processing');
          
          // Register face with the API using base64 data
          await faceRecognitionAPI.registerFace(imageData);
          
          setFaceEnrollmentStatus('enrolled');
          alert('Face data updated successfully!');
        } catch (error) {
          console.error('Error registering face:', error);
          setFaceEnrollmentStatus('none');
          alert('Failed to register face data. Please try again.');
        }
        
        stopCamera();
        setShowCamera(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result as string;
        setProfileImage(imageData);
        
        try {
          setFaceEnrollmentStatus('processing');
          
          // Register face with the API using base64 data
          await faceRecognitionAPI.registerFace(imageData);
          
          setFaceEnrollmentStatus('enrolled');
          alert('Face data updated successfully!');
        } catch (error) {
          console.error('Error registering face:', error);
          setFaceEnrollmentStatus('none');
          alert('Failed to register face data. Please try again.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      // Note: You'll need to add a password change endpoint to your API
      // For now, we'll show a placeholder message
      alert('Password change functionality will be implemented with API endpoint');
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setShowChangePassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Profile Management</h1>
            <p className="text-indigo-100 text-lg">Manage your account and face recognition data</p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <UserIcon className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    isEditing
                      ? 'bg-green-500 text-white hover:shadow-lg'
                      : 'bg-indigo-500 text-white hover:shadow-lg'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                
                {user.role === 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program
                    </label>
                    <input
                      type="text"
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Account Security
                  </label>
                  <button
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    Change Password
                  </button>
                </div>
                
                {showChangePassword && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleChangePassword}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                      >
                        Update Password
                      </button>
                      <button
                        onClick={() => setShowChangePassword(false)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Face Recognition Management */}
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h3>
            
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600">
                    <span className="text-white text-3xl font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowCamera(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Take New Photo
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </button>
              </div>
            </div>
          </div>

          {/* Face Enrollment Status */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Face Recognition Status</h3>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                faceEnrollmentStatus === 'enrolled' 
                  ? 'border-green-200 bg-green-50' 
                  : faceEnrollmentStatus === 'processing'
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  {faceEnrollmentStatus === 'enrolled' && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  {faceEnrollmentStatus === 'processing' && (
                    <div className="w-6 h-6 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {faceEnrollmentStatus === 'none' && (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  
                  <div>
                    <p className={`font-semibold ${
                      faceEnrollmentStatus === 'enrolled' 
                        ? 'text-green-900' 
                        : faceEnrollmentStatus === 'processing'
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }`}>
                      {faceEnrollmentStatus === 'enrolled' && 'Face Data Enrolled'}
                      {faceEnrollmentStatus === 'processing' && 'Processing Face Data...'}
                      {faceEnrollmentStatus === 'none' && 'No Face Data'}
                    </p>
                    <p className={`text-sm ${
                      faceEnrollmentStatus === 'enrolled' 
                        ? 'text-green-700' 
                        : faceEnrollmentStatus === 'processing'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {faceEnrollmentStatus === 'enrolled' && 'Your face is successfully enrolled for attendance'}
                      {faceEnrollmentStatus === 'processing' && 'Please wait while we process your face data'}
                      {faceEnrollmentStatus === 'none' && 'Please enroll your face for attendance tracking'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Face Recognition Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Look directly at the camera</li>
                  <li>Ensure good lighting on your face</li>
                  <li>Remove glasses or masks if possible</li>
                  <li>Keep a neutral expression</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Take Profile Photo</h3>
                <button
                  onClick={() => {
                    stopCamera();
                    setShowCamera(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex gap-4 justify-center">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Start Camera
                  </button>
                ) : (
                  <>
                    <button
                      onClick={capturePhoto}
                      className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                    >
                      Stop Camera
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileManagement;