// src/components/dashboard/components/MarksCard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Download, Loader, Eye, Filter, ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import html2pdf from 'html2pdf.js';
import StudentApi from '../service/StudentApi';

const MarksCard = ({ students: propStudents, onUpdateStudent }) => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // NEW: Exam selection states
  const [selectedExamType, setSelectedExamType] = useState('');
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [isExamFilterActive, setIsExamFilterActive] = useState(false);
  
  // View marks card states
  const [isViewMode, setIsViewMode] = useState(true);
  const [viewGrade, setViewGrade] = useState('');
  const [viewSection, setViewSection] = useState('');
  const [viewStudents, setViewStudents] = useState([]);
  const [viewSelectedExamType, setViewSelectedExamType] = useState('');
  const [viewAvailableExamTypes, setViewAvailableExamTypes] = useState([]);
  const [viewHasLoadedStudents, setViewHasLoadedStudents] = useState(false); // NEW: Track if students loaded
  
  // Download marks card states
  const [isDownloadMode, setIsDownloadMode] = useState(false);
  const [downloadGrade, setDownloadGrade] = useState('');
  const [downloadSection, setDownloadSection] = useState('');
  const [downloadStudents, setDownloadStudents] = useState([]);
  const [downloadSearchTerm, setDownloadSearchTerm] = useState('');
  const [downloadSelectedExamType, setDownloadSelectedExamType] = useState('');
  const [downloadAvailableExamTypes, setDownloadAvailableExamTypes] = useState([]);
  const [downloadHasLoadedStudents, setDownloadHasLoadedStudents] = useState(false); // NEW: Track if students loaded
  
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: 'Your School Name',
    schoolAddress: '123 School Street, City, State - 123456',
    schoolPhone: '+91 1234567890',
    schoolEmail: 'info@school.edu',
    schoolLogo: '',
    principalName: 'Dr. Principal Name',
    classTeacherName: 'Mr. Ms. Teacher Name',
  });

  // Load students with force refresh
  const loadStudents = async (forceRefresh = true) => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching students with marks...', forceRefresh ? '(FORCE REFRESH)' : '');
      const result = await StudentApi.getAllStudentsWithClassMarks(forceRefresh);
      console.log('📊 API Response:', result);
      
      if (result.success && result.students) {
        console.log(`✅ Loaded ${result.students.length} students`);
        
        // Log detailed marks for each student
        result.students.forEach((student, index) => {
          console.log(`📝 Student ${index + 1}: ${student.basicInfo?.name}`);
          const exams = student.marks?.exams || [];
          console.log(`   Exams: ${exams.length}`);
          if (exams.length > 0) {
            exams.forEach((exam, examIdx) => {
              console.log(`   Exam ${examIdx + 1}: ${exam.examType}`);
              const subjects = exam.subjects || [];
              console.log(`   Subjects (${subjects.length}):`, subjects);
              subjects.forEach(sub => {
                console.log(`     ${sub.name}: ${sub.marks}/${sub.total}`);
              });
            });
          }
        });
        
        setStudents(result.students);
        
        // Extract unique exam types from all students
        const examTypes = new Set();
        result.students.forEach(student => {
          const exams = student.marks?.exams || [];
          exams.forEach(exam => {
            if (exam.examType) {
              examTypes.add(exam.examType);
            }
          });
        });
        const sortedExamTypes = Array.from(examTypes).sort();
        setAvailableExamTypes(sortedExamTypes);
        console.log(' Available exam types:', sortedExamTypes);
        
        // Auto-select first grade and section if available
        if (result.students.length > 0) {
          const firstStudent = result.students[0];
          if (firstStudent.basicInfo?.grade) {
            setSelectedGrade(firstStudent.basicInfo.grade);
          }
          if (firstStudent.basicInfo?.section) {
            setSelectedSection(firstStudent.basicInfo.section);
          }
        }
        
        toast.success(`Loaded ${result.students.length} students with latest marks`);
      } else {
        console.error('❌ Failed to load students:', result.error);
        setStudents([]);
        toast.error(result.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('❌ Error loading students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Manual refresh function
  const refreshData = async () => {
    setIsRefreshing(true);
    await loadStudents(true);
  };

  // Load school info
  const loadSchoolInfo = async () => {
    try {
      const result = await StudentApi.getSchoolInfo();
      if (result.success && result.data) {
        setSchoolInfo(prev => ({ ...prev, ...result.data }));
      }
    } catch (error) {
      console.error('Error loading school info:', error);
    }
  };

  // Load students on mount
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
      // Extract exam types from prop students
      const examTypes = new Set();
      propStudents.forEach(student => {
        const exams = student.marks?.exams || [];
        exams.forEach(exam => {
          if (exam.examType) {
            examTypes.add(exam.examType);
          }
        });
      });
      setAvailableExamTypes(Array.from(examTypes).sort());
    } else {
      loadStudents(true);
    }
  }, [propStudents]);

  // Load school info
  useEffect(() => {
    loadSchoolInfo();
  }, []);

  // Get unique grades and sections
  const grades = useMemo(() => {
    return [...new Set(students.map(s => s.basicInfo?.grade).filter(Boolean))].sort();
  }, [students]);

  const sections = useMemo(() => {
    return [...new Set(students.map(s => s.basicInfo?.section).filter(Boolean))].sort();
  }, [students]);

  // Filter students for main view
  useEffect(() => {
    let filtered = [...students];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const basic = student.basicInfo || {};
        return (
          basic.name?.toLowerCase().includes(term) ||
          basic.rollNumber?.toLowerCase().includes(term) ||
          student.studentId?.toLowerCase().includes(term)
        );
      });
    }

    if (selectedGrade) {
      filtered = filtered.filter(student => 
        student.basicInfo?.grade === selectedGrade
      );
    }

    if (selectedSection) {
      filtered = filtered.filter(student => 
        student.basicInfo?.section === selectedSection
      );
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, selectedGrade, selectedSection]);

  /**
   * STEP 1: Load students for view mode - This is the first step
   * User selects Grade & Section, clicks "View Students"
   * This loads the students and extracts available exam types
   */
  const handleViewStudents = async () => {
    if (!viewGrade || !viewSection) {
      toast.warning('Please select both grade and section');
      return;
    }
    
    setIsLoading(true);
    setViewHasLoadedStudents(false); // Reset loaded state
    try {
      const result = await StudentApi.getAllStudentsWithClassMarks(true);
      if (result.success && result.students) {
        setStudents(result.students);
        
        // STEP 2: Extract exam types from the filtered students
        const filtered = result.students.filter(student => 
          student.basicInfo?.grade === viewGrade &&
          student.basicInfo?.section === viewSection
        );
        setViewStudents(filtered);
        
        // STEP 3: Extract unique exam types from these filtered students
        const examTypes = new Set();
        filtered.forEach(student => {
          const exams = student.marks?.exams || [];
          exams.forEach(exam => {
            if (exam.examType) {
              examTypes.add(exam.examType);
            }
          });
        });
        const sortedExamTypes = Array.from(examTypes).sort();
        setViewAvailableExamTypes(sortedExamTypes);
        setAvailableExamTypes(sortedExamTypes);
        
        // STEP 4: Auto-select first exam type if available
        if (sortedExamTypes.length > 0) {
          setViewSelectedExamType(sortedExamTypes[0]);
        } else {
          setViewSelectedExamType('');
        }
        
        setViewHasLoadedStudents(true); // Mark as loaded
        
        if (filtered.length === 0) {
          toast.info('No students found in this class');
        } else {
          toast.success(`Found ${filtered.length} students with ${sortedExamTypes.length} exam type(s)`);
        }
      }
    } catch (error) {
      console.error('Error refreshing students:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 1: Load students for download mode
   * User selects Grade & Section, clicks "Load Students"
   * This loads the students and extracts available exam types
   */
  const handleLoadDownloadStudents = async () => {
    if (!downloadGrade || !downloadSection) {
      toast.warning('Please select both grade and section');
      return;
    }
    
    setIsLoading(true);
    setDownloadHasLoadedStudents(false); // Reset loaded state
    try {
      const result = await StudentApi.getAllStudentsWithClassMarks(true);
      if (result.success && result.students) {
        setStudents(result.students);
        
        // STEP 2: Extract exam types from the filtered students
        const filtered = result.students.filter(student => 
          student.basicInfo?.grade === downloadGrade &&
          student.basicInfo?.section === downloadSection
        );
        setDownloadStudents(filtered);
        
        // STEP 3: Extract unique exam types from these filtered students
        const examTypes = new Set();
        filtered.forEach(student => {
          const exams = student.marks?.exams || [];
          exams.forEach(exam => {
            if (exam.examType) {
              examTypes.add(exam.examType);
            }
          });
        });
        const sortedExamTypes = Array.from(examTypes).sort();
        setDownloadAvailableExamTypes(sortedExamTypes);
        setAvailableExamTypes(sortedExamTypes);
        
        // STEP 4: Auto-select first exam type if available
        if (sortedExamTypes.length > 0) {
          setDownloadSelectedExamType(sortedExamTypes[0]);
        } else {
          setDownloadSelectedExamType('');
        }
        
        setDownloadHasLoadedStudents(true); // Mark as loaded
        
        if (filtered.length === 0) {
          toast.info('No students found in this class');
        } else {
          toast.success(`Found ${filtered.length} students with ${sortedExamTypes.length} exam type(s)`);
        }
      }
    } catch (error) {
      console.error('Error refreshing students:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get overall grade
  const getOverallGrade = (percentage) => {
    if (isNaN(percentage) || percentage === 0) return 'N/A';
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    if (percentage > 0) return 'F';
    return 'N/A';
  };

  // Get grade for a subject based on percentage
  const getSubjectGrade = (marks, total) => {
    if (total === 0 || marks === 0) return 'N/A';
    const percentage = (marks / total) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Get roll number from student
  const getRollNumber = (student) => {
    if (student.basicInfo?.rollNumber) {
      return student.basicInfo.rollNumber;
    }
    if (student.studentId) {
      return `ROLL${student.studentId.slice(-6)}`;
    }
    return 'N/A';
  };

  // Calculate student performance for filtered exams
  const getStudentPerformance = (student) => {
    const exams = student.marks?.exams || [];
    const totalExams = exams.length;
    
    if (totalExams === 0) {
      return {
        totalExams: 0,
        averagePercentage: 0,
        overallGrade: 'N/A',
        totalMarks: 0,
        totalPossible: 0,
        subjects: []
      };
    }

    let totalPercentage = 0;
    let totalMarks = 0;
    let totalPossible = 0;
    const subjectMap = new Map();

    exams.forEach(exam => {
      totalPercentage += exam.percentage || 0;
      totalMarks += exam.totalMarks || 0;
      totalPossible += exam.totalPossible || 0;
      
      const subjects = exam.subjects || [];
      subjects.forEach(subject => {
        const subjectName = subject.name || 'Unknown';
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, {
            name: subjectName,
            totalMarks: 0,
            totalPossible: 0,
            count: 0
          });
        }
        const subData = subjectMap.get(subjectName);
        subData.totalMarks += subject.marks || 0;
        subData.totalPossible += subject.total || 0;
        subData.count++;
      });
    });

    const averagePercentage = totalExams > 0 ? totalPercentage / totalExams : 0;
    const overallGrade = getOverallGrade(averagePercentage);

    const subjects = Array.from(subjectMap.values()).map(sub => ({
      name: sub.name,
      averageMarks: sub.count > 0 ? Math.round((sub.totalMarks / sub.count) * 10) / 10 : 0,
      averageTotal: sub.count > 0 ? Math.round((sub.totalPossible / sub.count) * 10) / 10 : 0,
      averagePercentage: sub.totalPossible > 0 
        ? Math.round(((sub.totalMarks / sub.totalPossible) * 100) * 10) / 10 
        : 0,
      count: sub.count
    })).sort((a, b) => b.averagePercentage - a.averagePercentage);

    return {
      totalExams,
      averagePercentage: Math.round(averagePercentage * 10) / 10,
      overallGrade,
      totalMarks,
      totalPossible,
      subjects
    };
  };

  // Generate Marks Card HTML with exam type filter
  const getMarksCardHTML = (student, examType = null) => {
    if (!student) return '';
    
    const basicInfo = student.basicInfo || {};
    let exams = student.marks?.exams || [];
    
    // Filter exams if examType is provided
    if (examType) {
      exams = exams.filter(exam => exam.examType === examType);
    }
    
    const studentWithFilteredExams = {
      ...student,
      marks: {
        ...student.marks,
        exams: exams
      }
    };
    
    const performance = getStudentPerformance(studentWithFilteredExams);
    const rollNumber = getRollNumber(student);
    
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const hasExams = exams.length > 0;
    const schoolName = schoolInfo.schoolName || 'School Name';
    const examTypeDisplay = examType || 'All Exams';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Report - ${escapeHtml(basicInfo.name || 'Student')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Georgia', 'Times New Roman', serif;
            padding: 20px; 
            background: #f0f2f5;
            display: flex;
            justify-content: center;
            min-height: 100vh;
          }
          .marks-card { 
            max-width: 1100px; 
            width: 100%;
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border: 2px solid #1a2a3a;
            box-shadow: 0 8px 40px rgba(26, 42, 58, 0.12);
          }
          .school-name { 
            text-align: center; 
            font-size: 26px; 
            font-weight: 700; 
            color: #1a2a3a;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .school-details {
            text-align: center;
            font-size: 13px;
            color: #4a5a6a;
            margin-bottom: 15px;
          }
          .title { 
            text-align: center; 
            font-size: 22px; 
            font-weight: 700; 
            margin: 20px 0; 
            background: #1a2a3a; 
            color: white; 
            padding: 12px;
            letter-spacing: 3px;
            text-transform: uppercase;
          }
          .exam-filter-badge {
            text-align: center;
            font-size: 14px;
            color: #1a2a3a;
            background: #f0f2f5;
            padding: 8px 20px;
            border-radius: 20px;
            display: inline-block;
            margin: 0 auto 15px auto;
            font-weight: 600;
          }
          .student-info { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 10px; 
            background: #f8f9fa; 
            padding: 16px 22px; 
            margin: 15px 0; 
            border-left: 4px solid #1a2a3a;
          }
          .info-item { 
            display: flex; 
            padding: 4px 0;
            border-bottom: 1px dotted #e0e4e8;
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label { 
            font-weight: 600; 
            color: #1a2a3a;
            width: 130px; 
            font-size: 13px;
          }
          .info-value {
            color: #1a2a3a;
            font-size: 13px;
            font-weight: 500;
          }
          .stats { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px; 
            margin: 20px 0; 
          }
          .stat-card { 
            background: #f8f9fa; 
            padding: 15px; 
            text-align: center; 
            border: 1px solid #e0e4e8;
          }
          .stat-label { 
            font-size: 11px; 
            color: #4a5a6a; 
            font-weight: 600; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .stat-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #1a2a3a;
            margin-top: 4px;
          }
          .exam-section {
            margin-top: 30px;
          }
          .exam-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1a2a3a;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .exam-section-header h3 {
            font-size: 18px;
            font-weight: 700;
            color: #1a2a3a;
          }
          .exam-section-header .badge {
            font-size: 12px;
            color: #4a5a6a;
            background: #f0f2f5;
            padding: 4px 14px;
            border-radius: 20px;
            font-weight: 500;
          }
          .exam-card { 
            background: #f8f9fa; 
            border: 1px solid #e0e4e8; 
            margin: 15px 0; 
            overflow: hidden;
          }
          .exam-card-header {
            background: #ffffff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e0e4e8;
            flex-wrap: wrap;
            gap: 8px;
          }
          .exam-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .exam-number {
            background: #1a2a3a;
            color: #ffffff;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
          }
          .exam-name {
            font-weight: 600;
            font-size: 15px;
            color: #1a2a3a;
          }
          .exam-date {
            font-size: 12px;
            color: #4a5a6a;
          }
          .exam-score {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .exam-percentage {
            font-weight: 700;
            font-size: 18px;
            color: #1a2a3a;
          }
          .exam-grade-badge {
            font-weight: 700;
            font-size: 13px;
            padding: 4px 16px;
            border-radius: 20px;
            background: #1a2a3a;
            color: #ffffff;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          th { 
            background: #1a2a3a; 
            color: white; 
            padding: 10px 14px; 
            text-align: center; 
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td { 
            padding: 8px 14px; 
            text-align: center; 
            border-bottom: 1px solid #e0e4e8;
            font-size: 13px;
          }
          .subject-name {
            text-align: left;
            font-weight: 500;
            color: #1a2a3a;
            padding-left: 20px;
          }
          .total-row { 
            background: #e8ecf0; 
            font-weight: 700;
          }
          .total-row td {
            border-top: 2px solid #1a2a3a;
            padding: 12px 14px;
          }
          .subject-grade-badge {
            font-weight: 600;
            padding: 3px 12px;
            border-radius: 12px;
            font-size: 11px;
            background: #f0f2f5;
            color: #1a2a3a;
          }
          .no-data { 
            text-align: center; 
            padding: 30px; 
            color: #7a8a9a;
            font-style: italic;
          }
          .signature-section { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin-top: 30px; 
            padding-top: 22px; 
            border-top: 2px solid #1a2a3a;
          }
          .signature-block { 
            text-align: center; 
          }
          .signature-line { 
            margin-top: 38px; 
            border-top: 1px solid #1a2a3a; 
            width: 70%; 
            margin-left: auto; 
            margin-right: auto; 
          }
          .signature-label {
            font-size: 12px;
            font-weight: 600;
            color: #1a2a3a;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 14px;
            border-top: 1px solid #e0e4e8;
            color: #7a8a9a; 
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(26, 42, 58, 0.03);
            pointer-events: none;
            letter-spacing: 10px;
            white-space: nowrap;
          }
          .marks-card {
            position: relative;
          }
          @media print { 
            body { background: white; padding: 0; } 
            .marks-card { border: 2px solid #1a2a3a; box-shadow: none; }
          }
          @media (max-width: 768px) {
            .marks-card { padding: 20px; }
            .student-info { grid-template-columns: 1fr; }
            .stats { grid-template-columns: 1fr 1fr; }
            .exam-card-header { flex-direction: column; align-items: flex-start; }
            .exam-score { width: 100%; justify-content: space-between; }
            .signature-section { grid-template-columns: 1fr; }
          }
          .no-subjects-message {
            text-align: center;
            padding: 20px;
            color: #7a8a9a;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="marks-card">
          <div class="watermark">PERFORMANCE REPORT</div>
          
          <div class="school-name">${escapeHtml(schoolName)}</div>
          <div class="school-details">
            Phone: ${escapeHtml(schoolInfo.schoolPhone || '')} | 
            Email: ${escapeHtml(schoolInfo.schoolEmail || '')} | 
            Address: ${escapeHtml(schoolInfo.schoolAddress || '')}
          </div>
          
          <div class="title">Performance Report</div>
          
          <div style="text-align:center;">
            <span class="exam-filter-badge">${escapeHtml(examTypeDisplay)}</span>
          </div>
          
          <div class="student-info">
            <div class="info-item"><span class="info-label">Student Name:</span> <span class="info-value">${escapeHtml(basicInfo.name || 'N/A')}</span></div>
            <div class="info-item"><span class="info-label">Roll Number:</span> <span class="info-value">${escapeHtml(rollNumber)}</span></div>
            <div class="info-item"><span class="info-label">Father's Name:</span> <span class="info-value">${escapeHtml(basicInfo.fatherName || 'N/A')}</span></div>
            <div class="info-item"><span class="info-label">Class & Section:</span> <span class="info-value">${escapeHtml(basicInfo.grade || 'N/A')} - ${escapeHtml(basicInfo.section || 'N/A')}</span></div>
          </div>

          ${hasExams ? `
          <div class="stats">
            <div class="stat-card"><div class="stat-label">Total Exams</div><div class="stat-value">${performance.totalExams}</div></div>
            <div class="stat-card"><div class="stat-label">Average Performance</div><div class="stat-value">${performance.averagePercentage}%</div></div>
            <div class="stat-card"><div class="stat-label">Overall Grade</div><div class="stat-value">${performance.overallGrade}</div></div>
            <div class="stat-card"><div class="stat-label">Total Marks</div><div class="stat-value">${performance.totalMarks}</div></div>
          </div>
          ` : ''}

          <div class="exam-section">
            <div class="exam-section-header">
              <h3>Examination Details</h3>
              ${hasExams ? `<span class="badge">${exams.length} Exams</span>` : ''}
            </div>

            ${hasExams ? exams.map((exam, index) => {
              const examPercentage = exam.percentage || 0;
              const examGrade = exam.overallGrade || getOverallGrade(examPercentage);
              const subjects = exam.subjects || [];
              
              const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);
              const totalPossible = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
              
              return `
              <div class="exam-card">
                <div class="exam-card-header">
                  <div class="exam-title-group">
                    <div class="exam-number">${index + 1}</div>
                    <div>
                      <div class="exam-name">${escapeHtml(exam.examType || 'Examination ' + (index + 1))}</div>
                      <div class="exam-date">${exam.examDate ? escapeHtml(exam.examDate) : ''}</div>
                    </div>
                  </div>
                  <div class="exam-score">
                    <span class="exam-percentage">${examPercentage}%</span>
                    <span class="exam-grade-badge">${escapeHtml(examGrade)}</span>
                  </div>
                </div>
                
                ${subjects && subjects.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th style="text-align:left;padding-left:20px;">Subject</th>
                      <th>Marks Obtained</th>
                      <th>Total Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subjects.map(subject => {
                      const subMarks = subject.marks || 0;
                      const subTotal = subject.total || 0;
                      const subPercentage = subTotal > 0 ? Math.round((subMarks / subTotal) * 100) : 0;
                      const subGrade = subject.grade || getSubjectGrade(subMarks, subTotal);
                      return `
                      <tr>
                        <td class="subject-name">${escapeHtml(subject.name || 'N/A')}</td>
                        <td>${subMarks}</td>
                        <td>${subTotal}</td>
                        <td>${subPercentage}%</td>
                        <td><span class="subject-grade-badge">${escapeHtml(subGrade)}</span></td>
                      </tr>
                      `;
                    }).join('')}
                    <tr class="total-row">
                      <td style="text-align:right;padding-right:20px;">Total</td>
                      <td>${totalMarks}</td>
                      <td>${totalPossible}</td>
                      <td>${examPercentage}%</td>
                      <td><span class="subject-grade-badge">${escapeHtml(examGrade)}</span></td>
                    </tr>
                  </tbody>
                </table>
                ` : `
                <div class="no-subjects-message">
                  No subject records found for this examination
                </div>
                `}
              </div>
              `;
            }).join('') : `
              <div class="no-data">No examination records found for this student</div>
            `}
          </div>

          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-label">Class Teacher</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-label">Parent/Guardian</div>
            </div>
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-label">Principal</div>
            </div>
          </div>
          
          <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Download PDF with exam filter
  const downloadPDF = async (student, examType = null) => {
    if (!student) return;
    
    setIsDownloading(true);
    try {
      // Fetch fresh data before downloading
      const result = await StudentApi.getAllStudentsWithClassMarks(true);
      let studentData = student;
      if (result.success && result.students) {
        const updatedStudent = result.students.find(s => s.studentId === student.studentId);
        if (updatedStudent) {
          studentData = updatedStudent;
          setStudents(result.students);
        }
      }
      
      const element = document.createElement('div');
      element.innerHTML = getMarksCardHTML(studentData, examType);
      document.body.appendChild(element);
      
      const fileName = `PerformanceReport_${studentData.basicInfo?.name || 'Student'}${examType ? '_' + examType.replace(/\s+/g, '_') : ''}.pdf`;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // View marks preview with exam filter
  const viewMarks = async (student, examType = null) => {
    setIsLoading(true);
    try {
      const result = await StudentApi.getAllStudentsWithClassMarks(true);
      if (result.success && result.students) {
        const updatedStudent = result.students.find(s => s.studentId === student.studentId);
        if (updatedStudent) {
          console.log('📝 Updated student data:', updatedStudent);
          console.log('📚 Exams with subjects:', updatedStudent.marks?.exams);
          
          // Store the exam type to filter in the modal
          setSelectedStudent({
            ...updatedStudent,
            _filterExamType: examType
          });
          setStudents(result.students);
        } else {
          console.log('⚠️ Student not found in updated data, using existing');
          setSelectedStudent({
            ...student,
            _filterExamType: examType
          });
        }
      } else {
        setSelectedStudent({
          ...student,
          _filterExamType: examType
        });
      }
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error viewing marks:', error);
      setSelectedStudent({
        ...student,
        _filterExamType: examType
      });
      setIsViewModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedExamType('');
    setIsExamFilterActive(false);
  };

  // Clear view mode filters
  const clearViewFilters = () => {
    setViewGrade('');
    setViewSection('');
    setViewStudents([]);
    setViewSelectedExamType('');
    setViewAvailableExamTypes([]);
    setViewHasLoadedStudents(false);
  };

  // Clear download mode filters
  const clearDownloadFilters = () => {
    setDownloadGrade('');
    setDownloadSection('');
    setDownloadStudents([]);
    setDownloadSearchTerm('');
    setDownloadSelectedExamType('');
    setDownloadAvailableExamTypes([]);
    setDownloadHasLoadedStudents(false);
  };

  // Filter students by exam type for main view
  const filteredStudentsByExam = useMemo(() => {
    if (!selectedExamType) return filteredStudents;
    return filteredStudents.map(student => {
      const exams = student.marks?.exams || [];
      const filteredExams = exams.filter(exam => exam.examType === selectedExamType);
      return {
        ...student,
        marks: {
          ...student.marks,
          exams: filteredExams
        }
      };
    });
  }, [filteredStudents, selectedExamType]);

  // Filter view students by exam type - STEP 5: Apply the selected exam filter
  const filteredViewStudentsByExam = useMemo(() => {
    if (!viewSelectedExamType || !viewHasLoadedStudents) return viewStudents;
    return viewStudents.map(student => {
      const exams = student.marks?.exams || [];
      const filteredExams = exams.filter(exam => exam.examType === viewSelectedExamType);
      return {
        ...student,
        marks: {
          ...student.marks,
          exams: filteredExams
        }
      };
    });
  }, [viewStudents, viewSelectedExamType, viewHasLoadedStudents]);

  // Filter download students by search term and exam type - STEP 5: Apply the selected exam filter
  const filteredDownloadStudentsByExam = useMemo(() => {
    let filtered = downloadStudents;
    
    if (downloadSearchTerm) {
      const term = downloadSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const basic = student.basicInfo || {};
        return (
          basic.name?.toLowerCase().includes(term) ||
          basic.rollNumber?.toLowerCase().includes(term) ||
          student.studentId?.toLowerCase().includes(term)
        );
      });
    }
    
    if (downloadSelectedExamType && downloadHasLoadedStudents) {
      filtered = filtered.map(student => {
        const exams = student.marks?.exams || [];
        const filteredExams = exams.filter(exam => exam.examType === downloadSelectedExamType);
        return {
          ...student,
          marks: {
            ...student.marks,
            exams: filteredExams
          }
        };
      });
    }
    
    return filtered;
  }, [downloadStudents, downloadSearchTerm, downloadSelectedExamType, downloadHasLoadedStudents]);

  // Count total exams across all students in view
  const totalViewExams = useMemo(() => {
    let count = 0;
    viewStudents.forEach(student => {
      count += (student.marks?.exams || []).length;
    });
    return count;
  }, [viewStudents]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Marks Card</h2>
          <p className="text-gray-600">View and download academic marks cards</p>
        </div>
        <button
          onClick={refreshData}
          disabled={isRefreshing || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Mode Selection Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => {
            setIsViewMode(true);
            setIsDownloadMode(false);
          }}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors ${
            isViewMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Eye size={18} />
          View Marks Card
        </button>
        <button
          onClick={() => {
            setIsDownloadMode(true);
            setIsViewMode(false);
          }}
          className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors ${
            isDownloadMode 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Download size={18} />
          Download Marks Card
        </button>
      </div>

      {/* ============================================================ */}
      {/* VIEW MARKS CARD SECTION */}
      {/* ============================================================ */}
      {isViewMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Eye size={22} />
              View Marks Card Preview
            </h3>
            {(viewGrade || viewSection || viewSelectedExamType) && (
              <button
                onClick={clearViewFilters}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* STEP 1: Grade & Section Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Grade</label>
              <select
                value={viewGrade}
                onChange={(e) => {
                  setViewGrade(e.target.value);
                  setViewHasLoadedStudents(false); // Reset when grade changes
                  setViewStudents([]);
                  setViewAvailableExamTypes([]);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Select Grade</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
              <select
                value={viewSection}
                onChange={(e) => {
                  setViewSection(e.target.value);
                  setViewHasLoadedStudents(false); // Reset when section changes
                  setViewStudents([]);
                  setViewAvailableExamTypes([]);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Select Section</option>
                {sections.map(section => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleViewStudents}
                disabled={isLoading}
                className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Search size={18} />}
                {isLoading ? 'Loading...' : 'View Students'}
              </button>
            </div>
          </div>

          {/* STEP 2-4: Show results after students are loaded */}
          {viewHasLoadedStudents && (
            <>
              {/* STEP 3: Show available exam types dropdown */}
              {viewAvailableExamTypes.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter size={18} className="text-blue-600" />
                      <span className="font-medium text-gray-700">Filter by Exam:</span>
                    </div>
                    <select
                      value={viewSelectedExamType}
                      onChange={(e) => setViewSelectedExamType(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[200px]"
                    >
                      <option value="">All Exams</option>
                      {viewAvailableExamTypes.map(examType => (
                        <option key={examType} value={examType}>{examType}</option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500 ml-2">
                      ({viewAvailableExamTypes.length} exam type{viewAvailableExamTypes.length > 1 ? 's' : ''} available)
                    </span>
                    {viewSelectedExamType && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        Showing: {viewSelectedExamType}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Show students table */}
              {filteredViewStudentsByExam.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">
                      Showing <strong>{filteredViewStudentsByExam.length}</strong> students in Grade {viewGrade} - Section {viewSection}
                      {viewSelectedExamType && (
                        <span className="ml-2 text-blue-600">(Filtered: {viewSelectedExamType})</span>
                      )}
                    </span>
                    <span className="text-sm text-gray-500">
                      Total Exams: {totalViewExams}
                    </span>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Roll Number</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Exams</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Marks</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Percentage</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Grade</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredViewStudentsByExam.map((student, studentIdx) => {
                          const basicInfo = student.basicInfo || {};
                          const exams = student.marks?.exams || [];
                          
                          let totalMarks = 0;
                          let totalPossible = 0;
                          exams.forEach(exam => {
                            if (exam.subjects) {
                              exam.subjects.forEach(subject => {
                                totalMarks += subject.marks || 0;
                                totalPossible += subject.total || 0;
                              });
                            }
                          });
                          const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
                          const rollNumber = getRollNumber(student);
                          
                          return (
                            <tr key={student.studentId || studentIdx} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-center">{studentIdx + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium">{basicInfo.name || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{rollNumber}</td>
                              <td className="px-4 py-3 text-center text-sm">{exams.length}</td>
                              <td className="px-4 py-3 text-center text-sm">{totalMarks}/{totalPossible}</td>
                              <td className="px-4 py-3 text-center text-sm font-semibold">
                                {percentage.toFixed(1)}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                  {getOverallGrade(percentage)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => viewMarks(student, viewSelectedExamType || null)}
                                  disabled={isLoading}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm mx-auto disabled:opacity-50"
                                >
                                  <Eye size={14} />
                                  Preview
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No students found in Grade {viewGrade} - Section {viewSection}
                    {viewSelectedExamType && ` with exam type "${viewSelectedExamType}"`}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Show message when no students loaded yet */}
          {!viewHasLoadedStudents && !isLoading && viewGrade && viewSection && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Search size={48} className="mx-auto" />
              </div>
              <p className="text-gray-500">Click "View Students" to load students for this class</p>
            </div>
          )}

          {/* Show message when grade/section not selected */}
          {!viewGrade || !viewSection && (
            <div className="text-center py-8">
              <p className="text-gray-400">Please select a grade and section to view students</p>
            </div>
          )}
          
          {isLoading && (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-500 mt-2">Loading students...</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* DOWNLOAD MARKS CARD SECTION */}
      {/* ============================================================ */}
      {isDownloadMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Download size={22} />
              Download Marks Card
            </h3>
            {(downloadGrade || downloadSection || downloadSearchTerm || downloadSelectedExamType) && (
              <button
                onClick={clearDownloadFilters}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* STEP 1: Grade & Section Selection for Download */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Grade</label>
              <select
                value={downloadGrade}
                onChange={(e) => {
                  setDownloadGrade(e.target.value);
                  setDownloadHasLoadedStudents(false);
                  setDownloadStudents([]);
                  setDownloadAvailableExamTypes([]);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Select Grade</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
              <select
                value={downloadSection}
                onChange={(e) => {
                  setDownloadSection(e.target.value);
                  setDownloadHasLoadedStudents(false);
                  setDownloadStudents([]);
                  setDownloadAvailableExamTypes([]);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Select Section</option>
                {sections.map(section => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={downloadSearchTerm}
                  onChange={(e) => setDownloadSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLoadDownloadStudents}
                disabled={isLoading}
                className="w-full px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Search size={18} />}
                {isLoading ? 'Loading...' : 'Load Students'}
              </button>
            </div>
          </div>

          {/* STEP 2-4: Show download results after students are loaded */}
          {downloadHasLoadedStudents && (
            <>
              {/* STEP 3: Show available exam types dropdown for download */}
              {downloadAvailableExamTypes.length > 0 && (
                <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter size={18} className="text-green-600" />
                      <span className="font-medium text-gray-700">Filter by Exam:</span>
                    </div>
                    <select
                      value={downloadSelectedExamType}
                      onChange={(e) => setDownloadSelectedExamType(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white min-w-[200px]"
                    >
                      <option value="">All Exams</option>
                      {downloadAvailableExamTypes.map(examType => (
                        <option key={examType} value={examType}>{examType}</option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-500 ml-2">
                      ({downloadAvailableExamTypes.length} exam type{downloadAvailableExamTypes.length > 1 ? 's' : ''} available)
                    </span>
                    {downloadSelectedExamType && (
                      <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                         Downloading: {downloadSelectedExamType}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Show students table with download buttons */}
              {filteredDownloadStudentsByExam.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">
                      Showing <strong>{filteredDownloadStudentsByExam.length}</strong> students in Grade {downloadGrade} - Section {downloadSection}
                      {downloadSelectedExamType && (
                        <span className="ml-2 text-green-600">(Filtered: {downloadSelectedExamType})</span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (filteredDownloadStudentsByExam.length === 1) {
                            downloadPDF(filteredDownloadStudentsByExam[0], downloadSelectedExamType || null);
                          } else {
                            toast.info(`Downloading ${filteredDownloadStudentsByExam.length} marks cards`);
                            filteredDownloadStudentsByExam.forEach((student, index) => {
                              setTimeout(() => {
                                downloadPDF(student, downloadSelectedExamType || null);
                              }, index * 1500);
                            });
                          }
                        }}
                        disabled={isDownloading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download size={16} />
                        Download All ({filteredDownloadStudentsByExam.length})
                      </button>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Roll Number</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Exams</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Marks</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Percentage</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Grade</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDownloadStudentsByExam.map((student, studentIdx) => {
                          const basicInfo = student.basicInfo || {};
                          const exams = student.marks?.exams || [];
                          
                          let totalMarks = 0;
                          let totalPossible = 0;
                          exams.forEach(exam => {
                            if (exam.subjects) {
                              exam.subjects.forEach(subject => {
                                totalMarks += subject.marks || 0;
                                totalPossible += subject.total || 0;
                              });
                            }
                          });
                          const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
                          const rollNumber = getRollNumber(student);
                          
                          return (
                            <tr key={student.studentId || studentIdx} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-center">{studentIdx + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium">{basicInfo.name || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{rollNumber}</td>
                              <td className="px-4 py-3 text-center text-sm">{exams.length}</td>
                              <td className="px-4 py-3 text-center text-sm">{totalMarks}/{totalPossible}</td>
                              <td className="px-4 py-3 text-center text-sm font-semibold">
                                {percentage.toFixed(1)}%
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                  {getOverallGrade(percentage)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => downloadPDF(student, downloadSelectedExamType || null)}
                                  disabled={isDownloading}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm mx-auto disabled:opacity-50"
                                >
                                  <Download size={14} />
                                  PDF
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No students found matching your criteria
                    {downloadSelectedExamType && ` with exam type "${downloadSelectedExamType}"`}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Show message when no students loaded yet */}
          {!downloadHasLoadedStudents && !isLoading && downloadGrade && downloadSection && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <Search size={48} className="mx-auto" />
              </div>
              <p className="text-gray-500">Click "Load Students" to load students for this class</p>
            </div>
          )}

          {/* Show message when grade/section not selected */}
          {!downloadGrade || !downloadSection && (
            <div className="text-center py-8">
              <p className="text-gray-400">Please select a grade and section to load students</p>
            </div>
          )}
          
          {isLoading && (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto text-green-600" />
              <p className="text-gray-500 mt-2">Loading students...</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Performance Report Preview
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedStudent.basicInfo?.name || 'Student'} - {selectedStudent.basicInfo?.grade || ''} {selectedStudent.basicInfo?.section || ''}
                  {selectedStudent._filterExamType && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                       {selectedStudent._filterExamType}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => downloadPDF(selectedStudent, selectedStudent._filterExamType || null)}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download size={18} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50">
              <div dangerouslySetInnerHTML={{ 
                __html: getMarksCardHTML(selectedStudent, selectedStudent._filterExamType || null) 
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksCard;