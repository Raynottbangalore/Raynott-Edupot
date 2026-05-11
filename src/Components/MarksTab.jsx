// src/components/dashboard/components/MarksTab.jsx
import React, { useState, useMemo } from 'react';
import { Search, User, Award, Calendar, BookOpen, TrendingUp, Eye, X, School, Users, ArrowLeft, ChevronRight } from 'lucide-react';
import Marks from './Marks';

const MarksTab = ({ students, onUpdateStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedPerformance, setSelectedPerformance] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSectionData, setSelectedSectionData] = useState(null);
  const [viewMode, setViewMode] = useState('class'); // 'class' or 'students'

  // Get unique grades and sections for filters
  const grades = [...new Set(students.map(s => s.basicInfo?.grade).filter(Boolean))].sort();
  const sections = [...new Set(students.map(s => s.basicInfo?.section).filter(Boolean))].sort();

  // Group students by class and section with performance summary
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
    
    // Calculate average performance for each group
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

  // Calculate performance summary for each student
  const studentsWithPerformance = useMemo(() => {
    return students.map(student => {
      const marks = student.marks || {};
      const exams = marks.exams || [];
      
      let totalPercentage = 0;
      let examCount = exams.length;
      
      if (examCount > 0) {
        totalPercentage = exams.reduce((sum, exam) => sum + (exam.percentage || 0), 0);
      }

      const averagePercentage = examCount > 0 ? totalPercentage / examCount : 0;
      
      let performanceGrade = 'N/A';
      let performanceColor = 'gray';
      
      if (averagePercentage >= 90) {
        performanceGrade = 'A+';
        performanceColor = 'green';
      } else if (averagePercentage >= 80) {
        performanceGrade = 'A';
        performanceColor = 'blue';
      } else if (averagePercentage >= 70) {
        performanceGrade = 'B+';
        performanceColor = 'amber';
      } else if (averagePercentage >= 60) {
        performanceGrade = 'B';
        performanceColor = 'yellow';
      } else if (averagePercentage >= 50) {
        performanceGrade = 'C';
        performanceColor = 'purple';
      } else if (averagePercentage >= 40) {
        performanceGrade = 'D';
        performanceColor = 'orange';
      } else if (averagePercentage > 0) {
        performanceGrade = 'F';
        performanceColor = 'red';
      }

      return {
        ...student,
        performance: {
          averagePercentage: Math.round(averagePercentage * 10) / 10,
          examCount,
          totalMarks: marks.totalMarks || 0,
          grade: performanceGrade,
          color: performanceColor,
          lastExamDate: exams.length > 0 
            ? exams.sort((a, b) => new Date(b.examDate) - new Date(a.examDate))[0]?.examDate 
            : null
        }
      };
    });
  }, [students]);

  // Filter students within a selected class
  const getFilteredStudentsForClass = (studentsList) => {
    return studentsList.filter(student => {
      const avgPercentage = student.performance?.averagePercentage || 0;
      const examCount = student.performance?.examCount || 0;
      
      let performanceCategory = 'no-exams';
      if (examCount > 0) {
        if (avgPercentage >= 90) performanceCategory = 'excellent';
        else if (avgPercentage >= 75) performanceCategory = 'good';
        else if (avgPercentage >= 60) performanceCategory = 'average';
        else if (avgPercentage >= 40) performanceCategory = 'below-average';
        else performanceCategory = 'poor';
      }
      
      const matchesSearch = !searchTerm || 
        student.basicInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.basicInfo?.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.basicInfo?.fatherName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPerformance = !selectedPerformance || performanceCategory === selectedPerformance;
      
      return matchesSearch && matchesPerformance;
    });
  };

  // Calculate overall summary statistics
  const summary = useMemo(() => {
    const total = {
      totalStudents: students.length,
      studentsWithMarks: 0,
      totalExams: 0,
      averagePerformance: 0,
      excellentCount: 0,
      goodCount: 0,
      averageCount: 0,
      belowAverageCount: 0,
      poorCount: 0,
      noExamsCount: 0,
      totalClasses: getGroupedClasses().length
    };

    studentsWithPerformance.forEach(student => {
      if (student.performance.examCount > 0) {
        total.studentsWithMarks++;
        total.totalExams += student.performance.examCount;
        
        const avg = student.performance.averagePercentage;
        if (avg >= 90) total.excellentCount++;
        else if (avg >= 75) total.goodCount++;
        else if (avg >= 60) total.averageCount++;
        else if (avg >= 40) total.belowAverageCount++;
        else if (avg > 0) total.poorCount++;
      } else {
        total.noExamsCount++;
      }
    });

    total.averagePerformance = total.studentsWithMarks > 0 
      ? Math.round((studentsWithPerformance.reduce((sum, s) => sum + (s.performance.averagePercentage || 0), 0) / studentsWithPerformance.length) * 10) / 10
      : 0;

    return total;
  }, [studentsWithPerformance]);

  const handleViewMarks = (student) => {
    console.log('Opening marks modal for student:', student?.basicInfo?.name);
    console.log('Student marks data:', student?.marks);
    
    // Make sure we have the complete student object
    if (student && student.studentId) {
      setSelectedStudent(student);
      setShowMarksModal(true);
    } else {
      console.error('Invalid student data:', student);
    }
  };

  const handleCloseModal = () => {
    console.log('Closing marks modal');
    setShowMarksModal(false);
    setSelectedStudent(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedPerformance('');
  };

  // Handle class/section click
  const handleClassClick = (grade, section, studentsList) => {
    // Enhance students with performance data for this class
    const studentsWithPerf = studentsList.map(student => {
      const perf = studentsWithPerformance.find(s => s.studentId === student.studentId);
      return perf || student;
    });
    
    setSelectedClass({ grade, section });
    setSelectedSectionData({
      grade,
      section,
      students: studentsWithPerf,
      studentCount: studentsList.length,
      totalExams: studentsList.reduce((sum, s) => sum + (s.marks?.exams?.length || 0), 0),
      studentsWithMarks: studentsList.filter(s => (s.marks?.exams?.length || 0) > 0).length,
      excellentCount: studentsWithPerf.filter(s => s.performance?.averagePercentage >= 90).length,
      goodCount: studentsWithPerf.filter(s => s.performance?.averagePercentage >= 75 && s.performance?.averagePercentage < 90).length,
      averageCount: studentsWithPerf.filter(s => s.performance?.averagePercentage >= 60 && s.performance?.averagePercentage < 75).length,
      belowAverageCount: studentsWithPerf.filter(s => s.performance?.averagePercentage >= 40 && s.performance?.averagePercentage < 60).length,
      poorCount: studentsWithPerf.filter(s => s.performance?.averagePercentage > 0 && s.performance?.averagePercentage < 40).length,
      noExamsCount: studentsWithPerf.filter(s => (s.performance?.examCount || 0) === 0).length
    });
    setViewMode('students');
  };

  // Go back to classes view
  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSectionData(null);
    setViewMode('class');
    setSearchTerm('');
    setSelectedPerformance('');
  };

  const getPerformanceColor = (performance) => {
    const colors = {
      green: 'bg-green-100 text-green-800 border-green-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[performance.color] || colors.gray;
  };

  // Render Class/Section View
  const renderClassView = () => {
    const groups = getGroupedClasses();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {groups.map((group) => {
          const performanceRate = group.studentCount > 0 
            ? Math.round(((group.excellentCount + group.goodCount) / group.studentCount) * 100) 
            : 0;
          
          return (
            <div 
              key={`${group.grade}-${group.section}`}
              onClick={() => handleClassClick(group.grade, group.section, group.students)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group-hover"
            >
              {/* Card Header */}
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
                  <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
                </div>
              </div>
              
              {/* Card Content */}
              <div className="p-6 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users size={18} className="text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{group.studentCount}</p>
                    <p className="text-xs text-gray-500">Total Students</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Award size={18} className="text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{performanceRate}%</p>
                    <p className="text-xs text-gray-500">Success Rate</p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Avg Performance</span>
                    <span className="font-medium text-blue-700">{group.averagePerformance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500"
                      style={{ width: `${group.averagePerformance}%` }}
                    />
                  </div>
                </div>

                {/* Performance Distribution */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Excellent (90%+):</span>
                    <span className="font-semibold text-green-600">{group.excellentCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Good (75-90%):</span>
                    <span className="font-semibold text-blue-600">{group.goodCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Average (60-75%):</span>
                    <span className="font-semibold text-amber-600">{group.averageCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">No Exams:</span>
                    <span className="font-semibold text-gray-600">{group.noExamsCount}</span>
                  </div>
                </div>

                {/* Total Exams */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen size={14} className="text-gray-600" />
                      <span className="text-sm text-gray-600">Total Exams</span>
                    </div>
                    <span className="font-semibold text-gray-800">{group.totalExams}</span>
                  </div>
                </div>

                {/* View Button */}
                <button 
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClassClick(group.grade, group.section, group.students);
                  }}
                >
                  <Eye size={16} />
                  <span>View Performance Details</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Students View for selected class
  const renderStudentsView = () => {
    if (!selectedSectionData) return null;
    
    const filteredClassStudents = getFilteredStudentsForClass(selectedSectionData.students);
    const { grade, section, studentCount, totalExams, studentsWithMarks, excellentCount, goodCount, averageCount, belowAverageCount, poorCount, noExamsCount } = selectedSectionData;

    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 ">
          <div className="flex items-center justify-between ">
            <div className="flex items-center space-x-4 gap-7">
              <button
                onClick={handleBackToClasses}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors "
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 ">
                  Performance Details: Grade {grade} - Section {section}
                </h2>
                <p className="text-gray-500 mt-1">Academic performance for {studentCount} students</p>
              </div>
            </div>
            
            {/* Class Summary */}
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-500">Students with Marks</p>
                <p className="text-2xl font-bold text-blue-600">
                  {studentsWithMarks}/{studentCount}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats for the class */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-xl font-bold text-gray-800">{studentCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Exams</p>
                <p className="text-xl font-bold text-gray-800">{totalExams}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Award size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Exams/Student</p>
                <p className="text-xl font-bold text-amber-600">
                  {studentCount > 0 ? (totalExams / studentCount).toFixed(1) : 0}
                </p>
              </div>
            </div>
          </div>

          {/* Performance Distribution Chips */}
          <div className="flex flex-wrap gap-3 pt-4">
            {excellentCount > 0 && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                Excellent: {excellentCount}
              </div>
            )}
            {goodCount > 0 && (
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                Good: {goodCount}
              </div>
            )}
            {averageCount > 0 && (
              <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                Average: {averageCount}
              </div>
            )}
            {belowAverageCount > 0 && (
              <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                Below Average: {belowAverageCount}
              </div>
            )}
            {poorCount > 0 && (
              <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
                Poor: {poorCount}
              </div>
            )}
            {noExamsCount > 0 && (
              <div className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium">
                No Exams: {noExamsCount}
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters for this class */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={`Search students in Grade ${grade} - Section ${section}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <select
                value={selectedPerformance}
                onChange={(e) => setSelectedPerformance(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Performance Categories</option>
                <option value="excellent">Excellent (90%+)</option>
                <option value="good">Good (75-90%)</option>
                <option value="average">Average (60-75%)</option>
                <option value="below-average">Below Average (40-60%)</option>
                <option value="poor">Poor (&lt;40%)</option>
                <option value="no-exams">No Exams Yet</option>
              </select>
            </div>
          </div>

          {(searchTerm || selectedPerformance) && (
            <div className="flex justify-end mt-3">
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Students ({filteredClassStudents.length})
          </h3>
        </div>

        {/* Student Cards */}
        <div className="space-y-4">
          {filteredClassStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Award className="text-gray-400" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No students found</h4>
              <p className="text-gray-600">
                {searchTerm || selectedPerformance
                  ? "Try adjusting your filters"
                  : "No students with academic records in this class"}
              </p>
            </div>
          ) : (
            filteredClassStudents.map(student => (
              <div
                key={student.id || student.studentId}
                className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {student.basicInfo?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">
                            {student.basicInfo?.name || 'Unnamed'}
                          </h3>
                          {student.performance?.examCount > 0 ? (
                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPerformanceColor(student.performance)}`}>
                              {student.performance.grade} • {student.performance.averagePercentage}%
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                              No Exams
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 mt-2">
                          <span>Adm: {student.basicInfo?.admissionNo || '—'}</span>
                          <span>Exams: {student.performance?.examCount || 0}</span>
                          {student.performance?.lastExamDate && (
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" />
                              Last: {student.performance.lastExamDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Performance Bar */}
                      {student.performance?.examCount > 0 && (
                        <div className="hidden md:block w-48">
                          <div className="text-xs text-gray-600 mb-1">Average Performance</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${student.performance.averagePercentage}%`,
                                backgroundColor: 
                                  student.performance.averagePercentage >= 90 ? '#059669' :
                                  student.performance.averagePercentage >= 75 ? '#2563eb' :
                                  student.performance.averagePercentage >= 60 ? '#d97706' :
                                  student.performance.averagePercentage >= 40 ? '#7c3aed' : '#dc2626'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleViewMarks(student)}
                      className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Eye size={18} />
                      <span>View Marks</span>
                    </button>
                  </div>

                  {/* Mobile Summary */}
                  <div className="mt-4 md:hidden border-t pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Exams</p>
                        <p className="font-semibold">{student.performance?.examCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Average</p>
                        <p className="font-semibold text-blue-600">
                          {student.performance?.averagePercentage || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Grade</p>
                        <p className="font-semibold">{student.performance?.grade || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Main render - show class view or students view based on selection
  return (
    <div className="space-y-6">
      {viewMode === 'class' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-800">{summary.totalClasses}</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-800">{summary.totalStudents}</p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-sm text-gray-600">With Marks</p>
              <p className="text-2xl font-bold text-green-700">{summary.studentsWithMarks}</p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
              <p className="text-sm text-gray-600">Avg Performance</p>
              <p className="text-2xl font-bold text-amber-700">{summary.averagePerformance}%</p>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
              <p className="text-sm text-gray-600">Excellent (90%+)</p>
              <p className="text-2xl font-bold text-emerald-700">{summary.excellentCount}</p>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <p className="text-sm text-gray-600">No Exams</p>
              <p className="text-2xl font-bold text-red-700">{summary.noExamsCount}</p>
            </div>
          </div>

          {/* Classes and Sections Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Classes & Sections
                <span className="ml-2 text-sm font-normal text-gray-500">({getGroupedClasses().length} classes)</span>
              </h3>
            </div>

            {students.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School size={32} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">No classes found</h4>
                <p className="text-gray-500">Add students to view class-wise performance</p>
              </div>
            ) : (
              renderClassView()
            )}
          </div>
        </>
      ) : (
        renderStudentsView()
      )}

      {/* Marks Modal - Always rendered outside conditional to ensure it works */}
      {showMarksModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Academic Marks: {selectedStudent.basicInfo?.name}
                </h2>
                <p className="text-gray-600">
                  Adm No: {selectedStudent.basicInfo?.admissionNo} • Grade {selectedStudent.basicInfo?.grade} - {selectedStudent.basicInfo?.section}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={28} />
              </button>
            </div>
            
            <div className="p-6">
              <Marks 
                student={selectedStudent} 
                onUpdateStudent={(updatedStudent) => {
                  console.log('Student updated in modal:', updatedStudent);
                  onUpdateStudent(updatedStudent);
                  setSelectedStudent(updatedStudent);
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksTab;