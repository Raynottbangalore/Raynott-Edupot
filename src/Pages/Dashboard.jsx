// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, Users, UserPlus, List, BarChart3, Search, DollarSign, Award, Ticket, School, MapPin, Award as AwardIcon, Edit, X, Save, Loader, Building } from 'lucide-react';
import StudentList from '../Components/StudentList';
import AllStudents from '../Components/AllStudents';
import AddStudent from '../Components/AddStudents';
import StudentApi from '../service/StudentApi';
import { toast } from 'react-toastify';
import { auth } from '../service/firebase';
import { useNavigate } from 'react-router-dom';
import FeesTab from '../Components/FeesTab';
import MarksTab from '../Components/MarksTab';
import AssessmentTab from '../Components/AssessmentTab';
import TeachersAssessment from '../Components/TeachersAssessment';
import HallTicket from '../Components/HallTicket';
import MarksCard from '../Components/MarksCard';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: ''
  });
  const [isSchoolInfoLoading, setIsSchoolInfoLoading] = useState(true);
  
  // School Info Modal States
  const [isSchoolInfoModalOpen, setIsSchoolInfoModalOpen] = useState(false);
  const [editingSchoolInfo, setEditingSchoolInfo] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: ''
  });
  const [isSavingSchoolInfo, setIsSavingSchoolInfo] = useState(false);

  const navigate = useNavigate();

  // Load school info
  const loadSchoolInfo = useCallback(async () => {
    setIsSchoolInfoLoading(true);
    try {
      const result = await StudentApi.getSchoolInfo();
      if (result.success && result.data) {
        setSchoolInfo(result.data);
        setEditingSchoolInfo(result.data);
      }
    } catch (error) {
      console.error('Error loading school info:', error);
    } finally {
      setIsSchoolInfoLoading(false);
    }
  }, []);

  // Create a refresh function
  const refreshStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await StudentApi.getAllStudents();
      if (result.success) {
        const normalized = result.students.map(stu => ({
          ...stu,
          id: stu.studentId,
        }));
        setStudents(normalized);
        setFilteredStudents(normalized);
        console.log('Students refreshed:', normalized.length);
      } else {
        setError(result.error || 'Failed to load students');
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      setError(err.message || 'Network error while loading students');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshStudents();
    loadSchoolInfo();
  }, [refreshStudents, loadSchoolInfo]);

  // Refresh when tab changes to 'allStudents'
  useEffect(() => {
    if (activeTab === 'allStudents') {
      refreshStudents();
    }
  }, [activeTab, refreshStudents]);

  const handleAddStudent = async (newStudentData) => {
    try {
      console.log('Adding student with data:', newStudentData);

      const result = await StudentApi.createStudent(newStudentData);
      console.log('API response:', result);

      if (result.success) {
        toast.success('Student added successfully!');

        // Switch to all students tab
        setActiveTab('allStudents');

        // Refresh immediately without delay
        await refreshStudents();

        // Optionally scroll to the newly added student
        setTimeout(() => {
          const newStudentElement = document.getElementById(`student-${result.studentId}`);
          if (newStudentElement) {
            newStudentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newStudentElement.classList.add('highlight-new-student');
            setTimeout(() => {
              newStudentElement.classList.remove('highlight-new-student');
            }, 3000);
          }
        }, 100);

      } else {
        toast.error('Failed to add student: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Add student failed:', err);
      toast.error('Error adding student: ' + err.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      const result = await StudentApi.deleteStudent(studentId);
      if (result.success) {
        toast.success('Student deleted successfully');
        await refreshStudents(); // Refresh immediately
        if (selectedStudent?.studentId === studentId) {
          setSelectedStudent(null);
        }
      } else {
        toast.error('Delete failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Error deleting student');
    }
  };

  const handleUpdateStudent = async () => {
    await refreshStudents(); 
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('user');
      localStorage.removeItem('schoolId');
      toast.success("Logged out successfully");
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  // School Info Modal Handlers
  const openSchoolInfoModal = () => {
    setEditingSchoolInfo({ ...schoolInfo });
    setIsSchoolInfoModalOpen(true);
  };

  const closeSchoolInfoModal = () => {
    setIsSchoolInfoModalOpen(false);
  };

  const handleSchoolInfoChange = (field, value) => {
    setEditingSchoolInfo({ ...editingSchoolInfo, [field]: value });
  };

  const handleSaveSchoolInfo = async () => {
    if (!editingSchoolInfo.schoolName.trim()) {
      toast.error('School name is required');
      return;
    }

    setIsSavingSchoolInfo(true);
    try {
      const result = await StudentApi.saveSchoolInfo(editingSchoolInfo);
      if (result.success) {
        toast.success('School information saved successfully!');
        setSchoolInfo(result.data);
        setIsSchoolInfoModalOpen(false);
      } else {
        throw new Error(result.error || 'Failed to save school info');
      }
    } catch (error) {
      console.error('Error saving school info:', error);
      toast.error(error.message || 'Failed to save school information');
    } finally {
      setIsSavingSchoolInfo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header with School Info */}
      <header className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-600 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left Side - School Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-600/30 rounded-xl">
                  <School className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {isSchoolInfoLoading ? 'Loading...' : schoolInfo.schoolName || 'School Name'}
                  </h1>
                  <div className="flex flex-wrap items-center space-x-3 text-xs">
                    {schoolInfo.schoolAffiliation && (
                      <span className="flex items-center space-x-1 text-amber-100">
                        <AwardIcon size={12} />
                        <span>{schoolInfo.schoolAffiliation}</span>
                      </span>
                    )}
                    {schoolInfo.schoolAddress && (
                      <>
                        <span className="text-amber-300/50">|</span>
                        <span className="flex items-center space-x-1 text-amber-200/80">
                          <MapPin size={12} />
                          <span>{schoolInfo.schoolAddress}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Side - Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* School Info Edit Button - Purple Color */}
              <button
                onClick={openSchoolInfoModal}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition-all duration-300 text-white text-sm font-medium shadow-lg hover:shadow-xl"
                title="Edit School Information"
              >
                <Building size={16} />
                <span>School Info</span>
                <Edit size={14} />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl transition-all duration-300 backdrop-blur-sm text-white text-sm font-medium"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white shadow-sm overflow-x-auto">
        <div className="px-6">
          <nav className="flex space-x-4 md:space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'search'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Search size={16} />
                <span>Search & Filter</span>
              </div>
              {activeTab === 'search' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('allStudents')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'allStudents'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <List size={16} />
                <span>All Students</span>
              </div>
              {activeTab === 'allStudents' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('addStudent')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'addStudent'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UserPlus size={16} />
                <span>Add New Student</span>
              </div>
              {activeTab === 'addStudent' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'fees'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <DollarSign size={16} />
                <span>Fees</span>
              </div>
              {activeTab === 'fees' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('marks')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'marks'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Award size={16} />
                <span>Marks</span>
              </div>
              {activeTab === 'marks' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('marksCard')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'marksCard'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Award size={16} />
                <span>Marks Card</span>
              </div>
              {activeTab === 'marksCard' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>


            <button
              onClick={() => setActiveTab('assessment')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'assessment'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 size={16} />
                <span>Assessment Reports</span>
              </div>
              {activeTab === 'assessment' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'teachers'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 size={16} />
                <span>Teachers Assessment</span>
              </div>
              {activeTab === 'teachers' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('hallticket')}
              className={`px-3 py-4 font-medium text-sm transition-all relative whitespace-nowrap ${
                activeTab === 'hallticket'
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Ticket size={16} />
                <span>Hall Ticket</span>
              </div>
              {activeTab === 'hallticket' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>
              )}
            </button>

                      </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'marksCard' ? (
          <MarksCard
            students={students}
            onUpdateStudent={handleUpdateStudent}
            schoolInfo={schoolInfo}
          />
        ) : activeTab === 'addStudent' ? (
          <AddStudent
            onAddStudent={handleAddStudent}
            onCancel={() => setActiveTab('allStudents')}
          />
        ) : activeTab === 'search' ? (
          <StudentList
            students={filteredStudents}
            onSelectStudent={setSelectedStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddNew={() => setActiveTab('addStudent')}
          />
        ) : activeTab === 'fees' ? (
          <FeesTab
            students={students}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : activeTab === 'marks' ? (
          <MarksTab
            students={students}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : activeTab === 'assessment' ? (
          <AssessmentTab
            students={students}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : activeTab === 'teachers' ? (
          <TeachersAssessment
            students={students}
            onUpdateStudent={handleUpdateStudent}
          />
        ) : activeTab === 'hallticket' ? (
          <HallTicket 
            students={students} 
            onUpdateStudent={handleUpdateStudent}
            schoolInfo={schoolInfo}
          />
        ) : (
          <AllStudents
            students={students}
            onViewDetails={setSelectedStudent}
            onDelete={handleDeleteStudent}
            onUpdateStudent={handleUpdateStudent}
            onRefresh={refreshStudents}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* School Info Edit Modal */}
      {isSchoolInfoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Building size={24} /> School Information
              </h3>
              <button 
                onClick={closeSchoolInfoModal} 
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Name *
                  </label>
                  <input 
                    type="text" 
                    value={editingSchoolInfo.schoolName} 
                    onChange={(e) => handleSchoolInfoChange('schoolName', e.target.value)} 
                    placeholder="Enter school name" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Address
                  </label>
                  <input 
                    type="text" 
                    value={editingSchoolInfo.schoolAddress} 
                    onChange={(e) => handleSchoolInfoChange('schoolAddress', e.target.value)} 
                    placeholder="Enter school address" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School Affiliation
                  </label>
                  <input 
                    type="text" 
                    value={editingSchoolInfo.schoolAffiliation} 
                    onChange={(e) => handleSchoolInfoChange('schoolAffiliation', e.target.value)} 
                    placeholder="e.g., Affiliated to CBSE" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" 
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button 
                  onClick={closeSchoolInfoModal} 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSchoolInfo} 
                  disabled={isSavingSchoolInfo}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50 transition"
                >
                  {isSavingSchoolInfo ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save School Info</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add some CSS for highlighting new students */}
      <style jsx>{`
        .highlight-new-student {
          animation: highlight 3s ease-out;
        }
        
        @keyframes highlight {
          0% { background-color: rgba(251, 191, 36, 0.2); }
          100% { background-color: transparent; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;