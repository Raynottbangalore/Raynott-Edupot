// src/components/dashboard/components/MarksTab.jsx

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, User, Award, Calendar, BookOpen, TrendingUp, Eye, X,
  School, Users, ArrowLeft, ChevronRight, Plus, Trash2, Save,
  Edit2, Check, AlertCircle, Settings, Sliders,
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';

const MarksTab = ({ students, onUpdateStudent, onRefreshMarksCard }) => {
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
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [selectedExamForMarks, setSelectedExamForMarks] = useState(null);
  const [selectedExamForEdit, setSelectedExamForEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examsLoaded, setExamsLoaded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // New Exam Form
  const [newExam, setNewExam] = useState({
    examType: '',
    examDate: new Date().toISOString().split('T')[0],
    isNewExam: true,
  });

  // Subject setup form
  const [subjectSetup, setSubjectSetup] = useState({
    subjects: [{ id: Date.now().toString(), name: '', total: '' }],
  });

  // Get unique grades and sections
  const grades = [...new Set(students.map((s) => s.basicInfo?.grade).filter(Boolean))].sort();
  const sections = [...new Set(students.map((s) => s.basicInfo?.section).filter(Boolean))].sort();

  // Load class exams and subjects when a class is selected
  useEffect(() => {
    if (selectedClass) {
      setIsInitialLoad(true);
      loadClassData(selectedClass.grade, selectedClass.section);
    } else {
      setClassExams([]);
      setClassSubjects([]);
      setExamsLoaded(false);
      setIsInitialLoad(true);
    }
  }, [selectedClass]);

  const loadClassData = async (grade, section) => {
    setLoading(true);
    setExamsLoaded(false);
    try {
      const subjectsResult = await StudentApi.getClassSubjectsForceRefresh(grade, section);
      if (subjectsResult.success && subjectsResult.subjects) {
        setClassSubjects(subjectsResult.subjects);
        if (subjectsResult.subjects.length > 0) {
          setSubjectSetup({
            subjects: subjectsResult.subjects.map((s) => ({
              id: s.id || Date.now().toString() + Math.random(),
              name: s.name || '',
              total: s.total || '',
            })),
          });
        } else {
          setSubjectSetup({
            subjects: [{ id: Date.now().toString(), name: '', total: '' }],
          });
        }
      } else {
        setClassSubjects([]);
        setSubjectSetup({
          subjects: [{ id: Date.now().toString(), name: '', total: '' }],
        });
      }

      const examsResult = await StudentApi.getClassExams(grade, section, true);
      if (examsResult.success) {
        const exams = Array.isArray(examsResult.exams) ? examsResult.exams : [];
        setClassExams(exams);
      } else {
        setClassExams([]);
      }
    } catch (error) {
      console.error('Load class data error:', error);
      setClassExams([]);
    } finally {
      setLoading(false);
      setExamsLoaded(true);
      setIsInitialLoad(false);
    }
  };

  // Setup class subjects (template for NEW exams only)
  const handleSetupSubjects = async () => {
    const validSubjects = subjectSetup.subjects.filter(
      (s) => s.name.trim() && s.total && parseFloat(s.total) > 0
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
        toast.success('Class subject template updated');
        setClassSubjects(validSubjects);
        setShowSetupSubjectsModal(false);
        await loadClassData(selectedClass.grade, selectedClass.section);
        if (onRefreshMarksCard) onRefreshMarksCard();
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

  const addSetupSubject = () => {
    setSubjectSetup({
      ...subjectSetup,
      subjects: [...subjectSetup.subjects, { id: Date.now().toString(), name: '', total: '' }],
    });
  };

  const removeSetupSubject = (index) => {
    if (subjectSetup.subjects.length <= 1) return;
    setSubjectSetup({
      ...subjectSetup,
      subjects: subjectSetup.subjects.filter((_, i) => i !== index),
    });
  };

  const updateSetupSubject = (index, field, value) => {
    const updatedSubjects = [...subjectSetup.subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
    setSubjectSetup({ ...subjectSetup, subjects: updatedSubjects });
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

  // Create new class exam — uses class-level subject template
  const handleCreateExam = async () => {
    if (!newExam.examType.trim()) {
      toast.error('Please select or enter exam type');
      return;
    }

    if (classSubjects.length === 0) {
      toast.error('Please set up class subject template first');
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
          isNewExam: true,
        });
        if (onRefreshMarksCard) onRefreshMarksCard();
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
        if (onRefreshMarksCard) onRefreshMarksCard();
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

  // Open Enter Marks modal — uses the EXAM'S OWN subjects
  const handleEnterMarks = (exam) => {
    const ownSubjects = Array.isArray(exam.subjects) && exam.subjects.length > 0
      ? exam.subjects
      : classSubjects;

    const examWithSubjects = {
      ...exam,
      subjects: ownSubjects,
      marks: exam.marks || {},
    };

    setSelectedExamForMarks(examWithSubjects);
    setShowEnterMarksModal(true);
  };

  // Open Edit Marks & Subjects modal
  const handleOpenEditExam = (exam) => {
    setSelectedExamForEdit(exam);
    setShowEditExamModal(true);
  };

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

        // Refresh the modal's local exam so already-saved marks persist
        const refreshed = await StudentApi.getClassExam(
          selectedClass.grade,
          selectedClass.section,
          selectedExamForMarks.id
        );
        if (refreshed.success && refreshed.exam) {
          setSelectedExamForMarks(refreshed.exam);
        }

        if (onRefreshMarksCard) onRefreshMarksCard();

        if (onUpdateStudent) {
          const studentResult = await StudentApi.getStudent(studentId);
          if (studentResult.success) {
            onUpdateStudent(studentResult.student);
          }
        }
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

  const handleClassClick = (grade, section, studentsList) => {
    setSelectedClass({ grade, section });
    setSelectedSectionData({
      grade,
      section,
      students: studentsList,
      studentCount: studentsList.length,
    });
    setViewMode('students');
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSectionData(null);
    setViewMode('class');
    setClassExams([]);
    setClassSubjects([]);
    setExamsLoaded(false);
    setIsInitialLoad(true);
    setSelectedExamForMarks(null);
    setSelectedExamForEdit(null);
    setShowEnterMarksModal(false);
    setShowEditExamModal(false);
  };

  const getExistingExamTypes = () => {
    const examTypes = new Set();
    classExams.forEach((exam) => {
      if (exam.examType) examTypes.add(exam.examType);
    });
    return Array.from(examTypes).sort();
  };

  // ────────────────────────────────────────────────
  // Class view
  // ────────────────────────────────────────────────
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
                    <h3 className="text-xl font-bold text-gray-800">Grade {group.grade}</h3>
                    <p className="text-sm text-gray-600">Section {group.section}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400" size={24} />
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center">
                <Users size={24} className="text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-800">{group.studentCount}</p>
                <p className="text-sm text-gray-500">Total Students</p>
              </div>

              <button
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClassClick(group.grade, group.section, group.students);
                }}
              >
                <Eye size={16} />
                <span>View &amp; Manage Marks</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────
  // Students view (exams list)
  // ────────────────────────────────────────────────
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
                  {selectedSectionData.studentCount} students • {exams.length} exams
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setSubjectSetup({
                    subjects:
                      classSubjects.length > 0
                        ? classSubjects.map((s) => ({
                            id: s.id || Date.now().toString() + Math.random(),
                            name: s.name || '',
                            total: s.total || '',
                          }))
                        : [{ id: Date.now().toString(), name: '', total: '' }],
                  });
                  setShowSetupSubjectsModal(true);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                title="Default subjects used when creating new exams. Editing this does NOT change existing exams."
              >
                <Settings size={18} />
                <span>{hasSubjects ? 'Edit Default Subjects' : 'Setup Default Subjects'}</span>
              </button>
              <button
                onClick={() => {
                  setNewExam({
                    examType: '',
                    examDate: new Date().toISOString().split('T')[0],
                    isNewExam: true,
                  });
                  setShowAddExamModal(true);
                }}
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
              <span className="text-sm">
                Please set up default subjects first so new exams can use them.
              </span>
            </div>
          )}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
            <strong>Tip:</strong> Each exam keeps its own subjects and totals. Use
            <span className="font-semibold"> Edit Marks &amp; Subjects</span> on an exam to change it
            without affecting other exams.
          </div>
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

          {loading && isInitialLoad ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading exams...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                No exams created yet
              </h4>
              <p className="text-gray-500 mb-4">
                Create an exam to start recording marks for this class
              </p>
              <button
                onClick={() => {
                  setNewExam({
                    examType: '',
                    examDate: new Date().toISOString().split('T')[0],
                    isNewExam: true,
                  });
                  setShowAddExamModal(true);
                }}
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
                const uniqueKey = exam.id ? `${exam.id}_${index}` : `exam_${index}`;

                // ⭐ IMPORTANT: each exam uses ITS OWN subjects
                const examSubjectsArr = Array.isArray(exam.subjects) && exam.subjects.length > 0
                  ? exam.subjects
                  : classSubjects;

                const totalPossible = examSubjectsArr.reduce(
                  (sum, s) => sum + (parseFloat(s.total) || 0),
                  0
                );
                const markedCount = Object.keys(exam.marks || {}).length;

                return (
                  <div
                    key={uniqueKey}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 flex-wrap gap-2">
                          <h4 className="text-lg font-semibold text-gray-800">
                            {exam.examType || 'Untitled Exam'}
                          </h4>
                          <span className="text-sm text-gray-500 flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {exam.examDate || 'Date not set'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {examSubjectsArr.length} subjects
                          </span>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Total: {totalPossible}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                            {markedCount} marked
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {examSubjectsArr.map((subject, idx) => (
                            <span
                              key={`${uniqueKey}_subject_${idx}`}
                              className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                            >
                              {subject.name || 'Unnamed'} ({subject.total || 0})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* ⭐ NEW: Edit Marks & Subjects button */}
                        <button
                          onClick={() => handleOpenEditExam(exam)}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-1 text-sm"
                          title="Edit this exam's subjects and totals"
                        >
                          <Sliders size={14} />
                          <span>Edit Marks &amp; Subjects</span>
                        </button>
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
                          title="Delete exam"
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
                  {classSubjects.length > 0 ? 'Edit Default Subjects' : 'Setup Default Subjects'}
                </h3>
                <button
                  onClick={() => setShowSetupSubjectsModal(false)}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  These subjects are the <strong>template for new exams only</strong>. Editing them
                  does not affect existing exams — use <em>Edit Marks &amp; Subjects</em> on an exam
                  to change that specific exam.
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
                    onClick={() => setShowSetupSubjectsModal(false)}
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

        {/* Add Exam Modal (unchanged) */}
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
                  <div className="flex flex-col space-y-2">
                    <select
                      value={newExam.isNewExam ? '' : newExam.examType}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          setNewExam({ ...newExam, isNewExam: true, examType: '' });
                        } else {
                          setNewExam({ ...newExam, isNewExam: false, examType: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select existing exam type</option>
                      {getExistingExamTypes().map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                      <option value="new">+ Add New Exam Type</option>
                    </select>

                    {newExam.isNewExam && (
                      <input
                        type="text"
                        value={newExam.examType}
                        onChange={(e) => setNewExam({ ...newExam, examType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter new exam type (e.g., Unit Test 1)"
                      />
                    )}
                  </div>
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
                    <strong>Note:</strong> This exam will start with the default subjects:
                    {classSubjects.map((s) => ` ${s.name}`).join(',')}. You can customize
                    per exam later via <em>Edit Marks &amp; Subjects</em>.
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

        {/* ⭐ NEW: Edit Marks & Subjects Modal */}
        {showEditExamModal && selectedExamForEdit && (
          <EditExamMarksSubjectsModal
            grade={selectedClass.grade}
            section={selectedClass.section}
            exam={selectedExamForEdit}
            students={selectedSectionData.students}
            onClose={() => {
              setShowEditExamModal(false);
              setSelectedExamForEdit(null);
            }}
            onSaved={async (updatedExam) => {
              setShowEditExamModal(false);
              setSelectedExamForEdit(null);
              await loadClassData(selectedClass.grade, selectedClass.section);
              if (onRefreshMarksCard) onRefreshMarksCard();
            }}
          />
        )}
      </div>
    );
  };

  const getGroupedClasses = () => {
    const groups = new Map();

    students.forEach((student) => {
      const grade = student.basicInfo?.grade || 'Unassigned';
      const section = student.basicInfo?.section || 'Unassigned';
      const key = `${grade}-${section}`;

      if (!groups.has(key)) {
        groups.set(key, {
          grade,
          section,
          students: [],
          studentCount: 0,
        });
      }

      const group = groups.get(key);
      group.students.push(student);
      group.studentCount++;
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return a.section.localeCompare(b.section);
    });
  };

  return (
    <div className="space-y-6">
      {viewMode === 'class' ? renderClassView() : renderStudentsView()}
    </div>
  );
};

// ────────────────────────────────────────────────
// Enter Marks Modal (unchanged logic, simpler inputs)
// ────────────────────────────────────────────────
const EnterMarksModal = ({ exam, students, onSaveMarks, onClose, loading }) => {
  const [marksData, setMarksData] = useState({});
  const [savedStudents, setSavedStudents] = useState({});

  const examSubjects = Array.isArray(exam.subjects) ? exam.subjects : [];

  useEffect(() => {
    const initialMarks = {};
    const saved = {};

    students.forEach((student) => {
      const studentId = student.studentId;
      const existingMarks = exam.marks?.[studentId]?.marks || [];

      const existingMarksMap = {};
      existingMarks.forEach((mark) => {
        existingMarksMap[mark.name] = mark;
      });

      const newMarks = examSubjects.map((subject) => {
        const existing = existingMarksMap[subject.name];
        return {
          name: subject.name,
          marks: existing ? (existing.marks ?? '') : '',
          total: subject.total || 0,
          grade: existing?.grade || '',
        };
      });

      if (newMarks.some((m) => m.marks !== '' && m.marks !== null)) {
        saved[studentId] = true;
      }

      initialMarks[studentId] = newMarks;
    });

    setMarksData(initialMarks);
    setSavedStudents(saved);
  }, [exam, students, examSubjects]);

  const updateStudentMarks = (studentId, subjectIndex, value) => {
    setMarksData((prev) => {
      const currentMarks = prev[studentId] || [];
      const updated = [...currentMarks];
      if (updated[subjectIndex]) {
        updated[subjectIndex] = { ...updated[subjectIndex], marks: value };
      }
      return { ...prev, [studentId]: updated };
    });
    setSavedStudents((prev) => ({ ...prev, [studentId]: false }));
  };

  const handleSaveStudentMarks = (studentId) => {
    const marks = marksData[studentId] || [];
    if (!marks.some((m) => m.marks !== '' && m.marks !== null)) {
      toast.warning('Please enter at least one mark');
      return;
    }

    const preparedMarks = marks.map((m) => ({
      name: m.name || 'Unnamed',
      marks: parseFloat(m.marks) || 0,
      total: parseFloat(m.total) || 0,
      grade: calculateGrade(m.marks, m.total),
    }));

    onSaveMarks(studentId, preparedMarks);
    setSavedStudents((prev) => ({ ...prev, [studentId]: true }));
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Enter Marks: {exam.examType || 'Untitled Exam'}
            </h3>
            <p className="text-sm text-gray-500">
              {students.length} students • {examSubjects.length} subjects (this exam only)
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
                    <th
                      key={`header_${idx}`}
                      className="px-2 py-3 text-center text-sm font-semibold text-gray-700 min-w-[80px]"
                    >
                      {subject.name || 'Unnamed'}
                      <div className="text-xs font-normal text-gray-500">
                        (Total: {subject.total || 0})
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center text-sm font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-2 py-3 text-center text-sm font-semibold text-gray-700">
                    %
                  </th>
                  <th className="px-2 py-3 text-center text-sm font-semibold text-gray-700">
                    Action
                  </th>
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
                  const totalPossible = studentMarks.reduce(
                    (sum, m) => sum + (parseFloat(m.total) || 0),
                    0
                  );
                  const percentage =
                    totalPossible > 0
                      ? Math.round((totalMarks / totalPossible) * 100 * 10) / 10
                      : 0;

                  return (
                    <tr
                      key={student.studentId || studentIdx}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {student.basicInfo?.name || 'N/A'}
                      </td>
                      {studentMarks.map((subject, subIdx) => (
                        <td
                          key={`${student.studentId}_${subIdx}`}
                          className="px-2 py-2 text-center"
                        >
                          <input
                            type="number"
                            value={subject.marks}
                            onChange={(e) =>
                              updateStudentMarks(student.studentId, subIdx, e.target.value)
                            }
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

// ────────────────────────────────────────────────
// ⭐ NEW: Edit Exam Marks & Subjects Modal
// Edits ONLY this exam's subjects + totals + per-student marks
// ────────────────────────────────────────────────
const EditExamMarksSubjectsModal = ({
  grade,
  section,
  exam,
  students,
  onClose,
  onSaved,
}) => {
  const [subjects, setSubjects] = useState([]); // [{name,total}]
  const [studentMarks, setStudentMarks] = useState({}); // {studentId: {subjectName: marks}}
  const [saving, setSaving] = useState(false);

  // Initialize from exam's OWN subjects + marks
  useEffect(() => {
    const initSubjects =
      Array.isArray(exam.subjects) && exam.subjects.length > 0
        ? exam.subjects.map((s) => ({ name: s.name || '', total: s.total ?? '' }))
        : [{ name: '', total: '' }];
    setSubjects(initSubjects);

    const initialMarks = {};
    const examMarks = exam.marks || {};
    (students || []).forEach((stu) => {
      const existing = examMarks[stu.studentId];
      const byName = {};
      (existing?.marks || []).forEach((m) => {
        if (m && m.name) byName[m.name] = m.marks ?? '';
      });
      initialMarks[stu.studentId] = byName;
    });
    setStudentMarks(initialMarks);
  }, [exam, students]);

  const addSubject = () => setSubjects((s) => [...s, { name: '', total: '' }]);
  const removeSubject = (idx) => setSubjects((s) => s.filter((_, i) => i !== idx));

  const updateSubject = (idx, field, value) => {
    setSubjects((s) => {
      const copy = [...s];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateStudentMark = (studentId, subjectName, value) => {
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subjectName]: value },
    }));
  };

  const handleSave = async () => {
    // Validate subjects
    const cleanSubjects = subjects
      .filter((s) => s.name && s.name.trim())
      .map((s) => ({ name: s.name.trim(), total: parseFloat(s.total) || 0 }));

    if (cleanSubjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    const seen = new Set();
    for (const s of cleanSubjects) {
      if (seen.has(s.name)) {
        toast.error(`Duplicate subject name: "${s.name}"`);
        return;
      }
      seen.add(s.name);
    }

    // Build studentMarks payload only with subjects we now have
    const payloadMarks = {};
    Object.entries(studentMarks).forEach(([studentId, byName]) => {
      payloadMarks[studentId] = cleanSubjects.map((sub) => {
        const raw = byName[sub.name];
        const marks =
          raw === '' || raw === undefined || raw === null
            ? 0
            : parseFloat(raw) || 0;
        return { name: sub.name, marks };
      });
    });

    setSaving(true);
    try {
      const res = await StudentApi.updateClassExamDetails(
        grade,
        section,
        exam.id,
        cleanSubjects,
        payloadMarks
      );

      if (res.success) {
        toast.success('Exam updated successfully');
        onSaved?.(res.exam);
      } else {
        toast.error(res.error || res.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update exam error:', err);
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Edit Exam — {exam.examType || 'Untitled Exam'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Changes here affect <strong>only this exam</strong>. Other exams are independent.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Subjects section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Subjects &amp; Total Marks (this exam only)
              </label>
              <button
                onClick={addSubject}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
              >
                <Plus size={12} /> Add Subject
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 mb-1">
              <div className="col-span-6">Subject Name</div>
              <div className="col-span-3">Total Marks</div>
              <div className="col-span-3"></div>
            </div>

            {subjects.map((sub, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                <input
                  type="text"
                  value={sub.name}
                  onChange={(e) => updateSubject(idx, 'name', e.target.value)}
                  className="col-span-6 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. Mathematics"
                />
                <input
                  type="number"
                  min="0"
                  value={sub.total}
                  onChange={(e) => updateSubject(idx, 'total', e.target.value)}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="100"
                />
                <div className="col-span-3 flex items-center">
                  {subjects.length > 1 && (
                    <button
                      onClick={() => removeSubject(idx)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove subject"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Student marks grid */}
          {/* <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Students' Obtained Marks
            </label>

            {(!students || students.length === 0) ? (
              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                No students loaded for this class.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 sticky left-0 bg-gray-50 min-w-[150px]">
                        Student
                      </th>
                      {subjects.map((sub, idx) => (
                        <th
                          key={idx}
                          className="text-center px-3 py-2 whitespace-nowrap min-w-[90px]"
                        >
                          {sub.name || `Subject ${idx + 1}`}
                          <div className="text-[10px] text-gray-500 font-normal">
                            / {sub.total || '?'}
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-2">Total</th>
                      <th className="text-center px-3 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((stu) => {
                      const byName = studentMarks[stu.studentId] || {};
                      let totalObtained = 0;
                      let totalPossible = 0;
                      subjects.forEach((s) => {
                        const raw = byName[s.name];
                        const m =
                          raw === '' || raw === undefined || raw === null
                            ? 0
                            : parseFloat(raw) || 0;
                        totalObtained += m;
                        totalPossible += parseFloat(s.total) || 0;
                      });
                      const pct =
                        totalPossible > 0
                          ? Math.round((totalObtained / totalPossible) * 1000) / 10
                          : 0;

                      return (
                        <tr key={stu.studentId} className="border-t border-gray-100">
                          <td className="px-3 py-2 sticky left-0 bg-white whitespace-nowrap">
                            <div className="font-medium text-gray-800">
                              {stu.basicInfo?.name || stu.studentId}
                            </div>
                            <div className="text-xs text-gray-500">
                              {stu.basicInfo?.admissionNo || ''}
                            </div>
                          </td>
                          {subjects.map((sub, idx) => (
                            <td key={idx} className="px-2 py-1 text-center">
                              <input
                                type="number"
                                min="0"
                                max={sub.total || undefined}
                                value={
                                  byName[sub.name] === undefined ? '' : byName[sub.name]
                                }
                                onChange={(e) =>
                                  updateStudentMark(stu.studentId, sub.name, e.target.value)
                                }
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-medium">
                            {totalObtained} / {totalPossible}
                          </td>
                          <td className="px-3 py-2 text-center text-green-700 font-medium">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div> */}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarksTab;