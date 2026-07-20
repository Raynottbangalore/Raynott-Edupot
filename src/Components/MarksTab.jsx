// src/components/dashboard/components/MarksTab.jsx - Updated

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, User, Award, Calendar, BookOpen, TrendingUp, Eye, X, 
  School, Users, ArrowLeft, ChevronRight, Plus, Trash2, Save,
  Edit2, Check, AlertCircle, Settings
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';

const MarksTab = ({ students, onUpdateStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedPerformance, setSelectedPerformance] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSectionData, setSelectedSectionData] = useState(null);
  const [viewMode, setViewMode] = useState('class');
  
  // Class Exam Management States
  const [classExams, setClassExams] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showSetupSubjectsModal, setShowSetupSubjectsModal] = useState(false);
  const [showEnterMarksModal, setShowEnterMarksModal] = useState(false);
  const [selectedExamForMarks, setSelectedExamForMarks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examsLoaded, setExamsLoaded] = useState(false);
  
  // New Exam Form
  const [newExam, setNewExam] = useState({
    examType: '',
    examDate: new Date().toISOString().split('T')[0],
  });

  // Subject setup form
  const [subjectSetup, setSubjectSetup] = useState({
    subjects: [{ id: Date.now().toString(), name: '', total: 100 }]
  });

  // Get unique grades and sections
  const grades = [...new Set(students.map(s => s.basicInfo?.grade).filter(Boolean))].sort();
  const sections = [...new Set(students.map(s => s.basicInfo?.section).filter(Boolean))].sort();

  // Load class exams and subjects when a class is selected
  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass.grade, selectedClass.section);
    } else {
      setClassExams([]);
      setClassSubjects([]);
      setExamsLoaded(false);
    }
  }, [selectedClass]);

  // Load both subjects and exams
  const loadClassData = async (grade, section) => {
    setLoading(true);
    setExamsLoaded(false);
    try {
      // Load subjects first
      const subjectsResult = await StudentApi.getClassSubjects(grade, section);
      if (subjectsResult.success && subjectsResult.subjects) {
        setClassSubjects(subjectsResult.subjects);
      } else {
        setClassSubjects([]);
      }

      // Then load exams
      const examsResult = await StudentApi.getClassExams(grade, section);
      if (examsResult.success) {
        const exams = Array.isArray(examsResult.exams) ? examsResult.exams : [];
        // Ensure each exam uses the class subjects
        const examsWithSubjects = exams.map(exam => ({
          ...exam,
          subjects: exam.subjects && exam.subjects.length > 0 
            ? exam.subjects 
            : classSubjects // Use the class subjects if exam has no subjects
        }));
        setClassExams(examsWithSubjects);
      } else {
        setClassExams([]);
      }
    } catch (error) {
      console.error('Load class data error:', error);
      setClassExams([]);
    } finally {
      setLoading(false);
      setExamsLoaded(true);
    }
  };

  // Setup class subjects
  const handleSetupSubjects = async () => {
    const validSubjects = subjectSetup.subjects.filter(
      s => s.name.trim() && s.total && parseFloat(s.total) > 0
    );

    if (validSubjects.length === 0) {
      toast.error('Please add at least one valid subject');
      return;
    }

    setLoading(true);
    try {
      const result = await StudentApi.setupClassSubjects(
        selectedClass.grade,
        selectedClass.section,
        validSubjects
      );

      if (result.success) {
        toast.success('Subjects set up successfully');
        setClassSubjects(validSubjects);
        setShowSetupSubjectsModal(false);
        // Reload exams with new subjects
        await loadClassData(selectedClass.grade, selectedClass.section);
      } else {
        toast.error(result.error || 'Failed to setup subjects');
      }
    } catch (error) {
      console.error('Setup subjects error:', error);
      toast.error('Failed to setup subjects');
    } finally {
      setLoading(false);
    }
  };

  // Add subject to setup
  const addSetupSubject = () => {
    setSubjectSetup({
      ...subjectSetup,
      subjects: [...subjectSetup.subjects, { id: Date.now().toString(), name: '', total: 100 }]
    });
  };

  // Remove subject from setup
  const removeSetupSubject = (index) => {
    if (subjectSetup.subjects.length <= 1) return;
    const updatedSubjects = subjectSetup.subjects.filter((_, i) => i !== index);
    setSubjectSetup({
      ...subjectSetup,
      subjects: updatedSubjects
    });
  };

  // Update subject in setup
  const updateSetupSubject = (index, field, value) => {
    const updatedSubjects = [...subjectSetup.subjects];
    updatedSubjects[index] = {
      ...updatedSubjects[index],
      [field]: field === 'total' ? parseFloat(value) || 0 : value
    };
    setSubjectSetup({
      ...subjectSetup,
      subjects: updatedSubjects
    });
  };

  // Calculate grade
  const calculateGrade = (marks, total) => {
    if (!marks || !total) return '';
    const percentage = (parseFloat(marks) / parseFloat(total)) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Create new class exam
  const handleCreateExam = async () => {
    if (!newExam.examType.trim()) {
      toast.error('Please enter exam type');
      return;
    }

    if (classSubjects.length === 0) {
      toast.error('Please set up subjects first');
      setShowSetupSubjectsModal(true);
      return;
    }

    setLoading(true);
    try {
      const examData = {
        examType: newExam.examType.trim(),
        examDate: newExam.examDate,
      };

      const result = await StudentApi.createClassExam(
        selectedClass.grade,
        selectedClass.section,
        examData
      );

      if (result.success) {
        toast.success('Exam created successfully');
        await loadClassData(selectedClass.grade, selectedClass.section);
        setShowAddExamModal(false);
        setNewExam({
          examType: '',
          examDate: new Date().toISOString().split('T')[0],
        });
      } else {
        toast.error(result.error || 'Failed to create exam');
      }
    } catch (error) {
      console.error('Create exam error:', error);
      toast.error('Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  // Delete class exam
  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;

    setLoading(true);
    try {
      const result = await StudentApi.deleteClassExam(
        selectedClass.grade,
        selectedClass.section,
        examId
      );

      if (result.success) {
        toast.success('Exam deleted successfully');
        await loadClassData(selectedClass.grade, selectedClass.section);
      } else {
        toast.error(result.error || 'Failed to delete exam');
      }
    } catch (error) {
      console.error('Delete exam error:', error);
      toast.error('Failed to delete exam');
    } finally {
      setLoading(false);
    }
  };

  // Open enter marks modal
  const handleEnterMarks = (exam) => {
    // Ensure exam has the class subjects
    const examWithSubjects = {
      ...exam,
      subjects: exam.subjects && exam.subjects.length > 0 
        ? exam.subjects 
        : classSubjects
    };
    setSelectedExamForMarks(examWithSubjects);
    setShowEnterMarksModal(true);
  };

  // Save student marks for exam
  const handleSaveMarks = async (studentId, marks) => {
    setLoading(true);
    try {
      const result = await StudentApi.updateStudentClassExamMarks(
        selectedClass.grade,
        selectedClass.section,
        selectedExamForMarks.id,
        studentId,
        marks
      );

      if (result.success) {
        toast.success('Marks saved successfully');
        await loadClassData(selectedClass.grade, selectedClass.section);
      } else {
        toast.error(result.error || 'Failed to save marks');
      }
    } catch (error) {
      console.error('Save marks error:', error);
      toast.error('Failed to save marks');
    } finally {
      setLoading(false);
    }
  };

  // Handle class click
  const handleClassClick = (grade, section, studentsList) => {
    setSelectedClass({ grade, section });
    setSelectedSectionData({
      grade,
      section,
      students: studentsList,
      studentCount: studentsList.length
    });
    setViewMode('students');
  };

  // Go back to classes view
  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSectionData(null);
    setViewMode('class');
    setClassExams([]);
    setClassSubjects([]);
    setExamsLoaded(false);
  };

  // Render class view
  const renderClassView = () => {
    const groups = getGroupedClasses();
    
    if (groups.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <School size={48} className="text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-800 mb-2">No classes found</h4>
          <p className="text-gray-500">Add students to view class-wise performance</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {groups.map((group) => (
          <div 
            key={`${group.grade}-${group.section}`}
            onClick={() => handleClassClick(group.grade, group.section, group.students)}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="bg-gradient-to-r from-blue-50 to-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <School size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Grade {group.grade}
                    </h3>
                    <p className="text-sm text-gray-600">Section {group.section}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={24} />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Users size={18} className="text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{group.studentCount}</p>
                  <p className="text-xs text-gray-500">Total Students</p>
                </div>
                <div className="text-center">
                  <Award size={18} className="text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">
                    {group.totalExams > 0 ? group.averagePerformance : 0}%
                  </p>
                  <p className="text-xs text-gray-500">Avg Performance</p>
                </div>
              </div>

              <button 
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClassClick(group.grade, group.section, group.students);
                }}
              >
                <Eye size={16} />
                <span>View & Manage Marks</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render students view with class exam management
  const renderStudentsView = () => {
    if (!selectedSectionData || !selectedClass) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No class selected</p>
        </div>
      );
    }

    const exams = Array.isArray(classExams) ? classExams : [];
    const hasSubjects = classSubjects.length > 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToClasses}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Grade {selectedClass.grade} - Section {selectedClass.section}
                </h2>
                <p className="text-gray-500 mt-1">
                  {selectedSectionData.studentCount} students
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSetupSubjectsModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <Settings size={18} />
                <span>{hasSubjects ? 'Edit Subjects' : 'Setup Subjects'}</span>
              </button>
              <button
                onClick={() => setShowAddExamModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                disabled={!hasSubjects}
              >
                <Plus size={18} />
                <span>Add New Exam</span>
              </button>
            </div>
          </div>
          {!hasSubjects && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center text-yellow-800">
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <span className="text-sm">Please set up subjects first before creating exams</span>
            </div>
          )}
        </div>

        {/* Class Exams List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <BookOpen size={20} className="mr-2 text-blue-600" />
            Class Exams
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({exams.length} exams)
            </span>
          </h3>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No exams created yet</h4>
              <p className="text-gray-500 mb-4">Create an exam to start recording marks for this class</p>
              <button
                onClick={() => setShowAddExamModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!hasSubjects}
              >
                <Plus size={18} className="inline mr-2" />
                Create First Exam
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam, index) => {
                const uniqueKey = exam.id 
                  ? `${exam.id}_${index}` 
                  : `exam_${index}_${Date.now()}`;
                
                const subjects = Array.isArray(exam.subjects) && exam.subjects.length > 0
                  ? exam.subjects
                  : classSubjects;
                
                return (
                  <div 
                    key={uniqueKey} 
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-semibold text-gray-800">
                            {exam.examType || 'Untitled Exam'}
                          </h4>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {exam.examDate || 'Date not set'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {subjects.length} subjects
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {subjects.map((subject, idx) => (
                            <span 
                              key={`${uniqueKey}_subject_${idx}`} 
                              className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                            >
                              {subject.name || 'Unnamed'} ({subject.total || 0})
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEnterMarks(exam)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-1 text-sm"
                        >
                          <Edit2 size={14} />
                          <span>Enter Marks</span>
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Setup Subjects Modal */}
        {showSetupSubjectsModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {classSubjects.length > 0 ? 'Edit Class Subjects' : 'Setup Class Subjects'}
                </h3>
                <button
                  onClick={() => {
                    setShowSetupSubjectsModal(false);
                    // Reset form
                    setSubjectSetup({
                      subjects: classSubjects.length > 0 
                        ? classSubjects 
                        : [{ id: Date.now().toString(), name: '', total: 100 }]
                    });
                  }}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  These subjects will be common for all exams in this class.
                  {classSubjects.length > 0 && ' You can add or remove subjects here.'}
                </p>
                
                <div className="space-y-3">
                  {subjectSetup.subjects.map((subject, index) => (
                    <div key={subject.id || index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={subject.name}
                        onChange={(e) => updateSetupSubject(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Subject name"
                      />
                      <input
                        type="number"
                        value={subject.total}
                        onChange={(e) => updateSetupSubject(index, 'total', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Total"
                        min="1"
                      />
                      {subjectSetup.subjects.length > 1 && (
                        <button
                          onClick={() => removeSetupSubject(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addSetupSubject}
                  className="mt-3 text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add Subject</span>
                </button>

                <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                  <button
                    onClick={() => {
                      setShowSetupSubjectsModal(false);
                      setSubjectSetup({
                        subjects: classSubjects.length > 0 
                          ? classSubjects 
                          : [{ id: Date.now().toString(), name: '', total: 100 }]
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetupSubjects}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Subjects</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Exam Modal */}
        {showAddExamModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Create New Exam</h3>
                <button
                  onClick={() => setShowAddExamModal(false)}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Type *
                  </label>
                  <input
                    type="text"
                    value={newExam.examType}
                    onChange={(e) => setNewExam({ ...newExam, examType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Unit Test 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={newExam.examDate}
                    onChange={(e) => setNewExam({ ...newExam, examDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This exam will use the class subjects: 
                    {classSubjects.map(s => ` ${s.name}`).join(',')}
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowAddExamModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateExam}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Create Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enter Marks Modal */}
        {showEnterMarksModal && selectedExamForMarks && (
          <EnterMarksModal
            exam={selectedExamForMarks}
            students={selectedSectionData.students}
            onSaveMarks={handleSaveMarks}
            onClose={() => {
              setShowEnterMarksModal(false);
              setSelectedExamForMarks(null);
            }}
            loading={loading}
          />
        )}
      </div>
    );
  };

  // Group students by class and section (moved up for use in renderClassView)
  const getGroupedClasses = () => {
    const groups = new Map();
    
    students.forEach(student => {
      const grade = student.basicInfo?.grade || 'Unassigned';
      const section = student.basicInfo?.section || 'Unassigned';
      const key = `${grade}-${section}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          grade,
          section,
          students: [],
          studentCount: 0,
          totalExams: 0,
          totalAvgPercentage: 0,
          excellentCount: 0,
          goodCount: 0,
          averageCount: 0,
          belowAverageCount: 0,
          poorCount: 0,
          noExamsCount: 0
        });
      }
      
      const group = groups.get(key);
      const marks = student.marks || {};
      const exams = marks.exams || [];
      const examCount = exams.length;
      
      let avgPercentage = 0;
      if (examCount > 0) {
        const totalPercentage = exams.reduce((sum, exam) => sum + (exam.percentage || 0), 0);
        avgPercentage = totalPercentage / examCount;
      }
      
      group.students.push(student);
      group.studentCount++;
      
      if (examCount > 0) {
        group.totalExams += examCount;
        group.totalAvgPercentage += avgPercentage;
        
        if (avgPercentage >= 90) group.excellentCount++;
        else if (avgPercentage >= 75) group.goodCount++;
        else if (avgPercentage >= 60) group.averageCount++;
        else if (avgPercentage >= 40) group.belowAverageCount++;
        else group.poorCount++;
      } else {
        group.noExamsCount++;
      }
    });
    
    return Array.from(groups.values()).map(group => ({
      ...group,
      averagePerformance: group.totalExams > 0 
        ? Math.round((group.totalAvgPercentage / group.students.filter(s => (s.marks?.exams?.length || 0) > 0).length) * 10) / 10
        : 0
    })).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return a.section.localeCompare(b.section);
    });
  };

  return (
    <div className="space-y-6">
      {viewMode === 'class' ? (
        renderClassView()
      ) : (
        renderStudentsView()
      )}
    </div>
  );
};

// Enter Marks Modal Component (same as before)
const EnterMarksModal = ({ exam, students, onSaveMarks, onClose, loading }) => {
  const [marksData, setMarksData] = useState({});
  const [savedStudents, setSavedStudents] = useState({});

  useEffect(() => {
    const initialMarks = {};
    const saved = {};
    const examSubjects = Array.isArray(exam.subjects) ? exam.subjects : [];
    
    students.forEach((student) => {
      const studentMarks = exam.marks?.[student.studentId]?.marks || [];
      const studentId = student.studentId;
      
      if (studentMarks.length > 0) {
        saved[studentId] = true;
        initialMarks[studentId] = studentMarks;
      } else {
        initialMarks[studentId] = examSubjects.map((subject) => ({
          name: subject.name || 'Unnamed',
          marks: '',
          total: subject.total || 0
        }));
      }
    });
    setMarksData(initialMarks);
    setSavedStudents(saved);
  }, [exam, students]);

  const updateStudentMarks = (studentId, subjectIndex, value) => {
    setMarksData(prev => {
      const currentMarks = prev[studentId] || [];
      const updated = [...currentMarks];
      if (updated[subjectIndex]) {
        updated[subjectIndex] = {
          ...updated[subjectIndex],
          marks: value
        };
      }
      return { ...prev, [studentId]: updated };
    });
    setSavedStudents(prev => ({ ...prev, [studentId]: false }));
  };

  const handleSaveStudentMarks = (studentId) => {
    const marks = marksData[studentId] || [];
    const hasMarks = marks.some(m => m.marks !== '' && m.marks !== null);
    if (!hasMarks) {
      toast.warning('Please enter at least one mark');
      return;
    }
    
    const preparedMarks = marks.map(m => ({
      name: m.name || 'Unnamed',
      marks: parseFloat(m.marks) || 0,
      total: parseFloat(m.total) || 0,
      grade: calculateGrade(m.marks, m.total)
    }));

    onSaveMarks(studentId, preparedMarks);
    setSavedStudents(prev => ({ ...prev, [studentId]: true }));
  };

  const calculateGrade = (marks, total) => {
    if (!marks || !total) return '';
    const percentage = (parseFloat(marks) / parseFloat(total)) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const examSubjects = Array.isArray(exam.subjects) ? exam.subjects : [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Enter Marks: {exam.examType || 'Untitled Exam'}
            </h3>
            <p className="text-sm text-gray-500">
              {students.length} students • {examSubjects.length} subjects
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 min-w-[150px]">
                    Student Name
                  </th>
                  {examSubjects.map((subject, idx) => (
                    <th key={`header_${idx}`} className="px-2 py-3 text-center text-sm font-semibold text-gray-700 min-w-[80px]">
                      {subject.name || 'Unnamed'}
                      <div className="text-xs font-normal text-gray-500">(Total: {subject.total || 0})</div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-2 py-3 text-center text-sm font-semibold text-gray-700">%</th>
                  <th className="px-2 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, studentIdx) => {
                  const studentMarks = marksData[student.studentId] || [];
                  const isSaved = savedStudents[student.studentId] || false;
                  
                  const totalMarks = studentMarks.reduce((sum, m) => {
                    const val = parseFloat(m.marks);
                    return sum + (isNaN(val) ? 0 : val);
                  }, 0);
                  const totalPossible = studentMarks.reduce((sum, m) => 
                    sum + (parseFloat(m.total) || 0), 0
                  );
                  const percentage = totalPossible > 0 
                    ? Math.round((totalMarks / totalPossible) * 100 * 10) / 10 
                    : 0;

                  return (
                    <tr key={student.studentId || studentIdx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {student.basicInfo?.name || 'N/A'}
                      </td>
                      {studentMarks.map((subject, subIdx) => (
                        <td key={`${student.studentId}_${subIdx}`} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            value={subject.marks}
                            onChange={(e) => updateStudentMarks(student.studentId, subIdx, e.target.value)}
                            className={`w-16 px-2 py-1 border rounded-lg text-center focus:ring-2 focus:ring-blue-500 ${
                              isSaved ? 'bg-gray-50' : ''
                            }`}
                            min="0"
                            max={subject.total || 0}
                            placeholder="-"
                            disabled={loading}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center text-sm font-medium">
                        {totalMarks}/{totalPossible}
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold">
                        {totalPossible > 0 ? `${percentage}%` : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleSaveStudentMarks(student.studentId)}
                          disabled={loading || isSaved}
                          className={`px-3 py-1.5 rounded-lg text-sm flex items-center justify-center mx-auto ${
                            isSaved 
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isSaved ? (
                            <Check size={14} className="mr-1" />
                          ) : (
                            <Save size={14} className="mr-1" />
                          )}
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarksTab;