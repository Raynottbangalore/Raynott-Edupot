// src/components/dashboard/components/MarksCard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Download, Loader, Eye, Printer, User, BookOpen, Calendar, Award, GraduationCap, Mail, Phone, MapPin } from 'lucide-react';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // View marks card states
  const [isViewMode, setIsViewMode] = useState(true);
  const [viewGrade, setViewGrade] = useState('');
  const [viewSection, setViewSection] = useState('');
  const [viewStudents, setViewStudents] = useState([]);
  
  // Download marks card states
  const [isDownloadMode, setIsDownloadMode] = useState(false);
  const [downloadGrade, setDownloadGrade] = useState('');
  const [downloadSection, setDownloadSection] = useState('');
  const [downloadStudents, setDownloadStudents] = useState([]);
  const [downloadSearchTerm, setDownloadSearchTerm] = useState('');
  
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: 'Your School Name',
    schoolAddress: '123 School Street, City, State - 123456',
    schoolPhone: '+91 1234567890',
    schoolEmail: 'info@school.edu',
    schoolLogo: '',
    principalName: 'Dr. Principal Name',
    classTeacherName: 'Mr. Ms. Teacher Name',
  });

  // Load students
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
    } else {
      loadStudents();
    }
  }, [propStudents]);

  // Load school info
  useEffect(() => {
    loadSchoolInfo();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const result = await StudentApi.getAllStudents();
      if (result.success && result.students) {
        setStudents(result.students);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

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
          basic.rollNumber?.toLowerCase().includes(term)
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

  // Load students for view mode
  useEffect(() => {
    if (isViewMode && viewGrade && viewSection) {
      const filtered = students.filter(student => 
        student.basicInfo?.grade === viewGrade &&
        student.basicInfo?.section === viewSection
      );
      setViewStudents(filtered);
    }
  }, [isViewMode, viewGrade, viewSection, students]);

  // Load students for download mode
  useEffect(() => {
    if (isDownloadMode && downloadGrade && downloadSection) {
      const filtered = students.filter(student => 
        student.basicInfo?.grade === downloadGrade &&
        student.basicInfo?.section === downloadSection
      );
      setDownloadStudents(filtered);
    }
  }, [isDownloadMode, downloadGrade, downloadSection, students]);

  // Get overall grade
  const getOverallGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    if (percentage > 0) return 'F';
    return 'N/A';
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

  // Calculate student performance
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
      
      (exam.subjects || []).forEach(subject => {
        if (!subjectMap.has(subject.name)) {
          subjectMap.set(subject.name, {
            name: subject.name,
            totalMarks: 0,
            totalPossible: 0,
            count: 0
          });
        }
        const subData = subjectMap.get(subject.name);
        subData.totalMarks += subject.marks || 0;
        subData.totalPossible += subject.total || 0;
        subData.count++;
      });
    });

    const averagePercentage = totalPercentage / totalExams;
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

  // Generate Marks Card HTML with professional layout
  const getMarksCardHTML = (student) => {
    if (!student) return '';
    
    const basicInfo = student.basicInfo || {};
    const exams = student.marks?.exams || [];
    const performance = getStudentPerformance(student);
    const rollNumber = getRollNumber(student);
    
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const hasExams = exams.length > 0;
    const schoolName = schoolInfo.schoolName || 'School Name';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Report - ${escapeHtml(basicInfo.name || 'Student')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Georgia', 'Times New Roman', serif;
            margin: 0; 
            padding: 20px; 
            background: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .marks-card {
            max-width: 1000px;
            width: 100%;
            background: #ffffff;
            border: 2px solid #1a2a3a;
            padding: 0;
            position: relative;
            box-shadow: 0 8px 40px rgba(26, 42, 58, 0.12);
          }

          .marks-card-inner {
            padding: 40px 45px 35px 45px;
          }

          /* Decorative top border */
          .marks-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: #1a2a3a;
          }

          /* School Header */
          .school-header {
            display: flex;
            align-items: center;
            justify-content: center;
            padding-bottom: 18px;
            border-bottom: 2px solid #1a2a3a;
            margin-bottom: 18px;
            gap: 18px;
          }

          .school-logo {
            width: 75px;
            height: 75px;
            border: 2px solid #1a2a3a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            font-weight: 700;
            color: #1a2a3a;
            flex-shrink: 0;
            background: #f8f9fa;
            font-family: 'Georgia', serif;
          }

          .school-info {
            text-align: center;
            flex: 1;
          }

          .school-name {
            font-size: 26px;
            font-weight: 700;
            color: #1a2a3a;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-family: 'Georgia', serif;
          }

          .school-details {
            font-size: 13px;
            color: #4a5a6a;
            margin-top: 5px;
            line-height: 1.6;
          }

          .school-details .detail-item {
            display: inline-block;
            margin: 0 8px;
          }

          .school-details .separator {
            color: #8a9aaa;
            margin: 0 4px;
          }

          /* Title Section */
          .title-section {
            background: #1a2a3a;
            color: #ffffff;
            padding: 10px 20px;
            margin: 14px 0 22px 0;
            text-align: center;
            letter-spacing: 2px;
          }

          .title-section h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin: 0;
            font-family: 'Georgia', serif;
          }

          /* Student Info */
          .student-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 30px;
            background: #f8f9fa;
            padding: 16px 22px;
            border-left: 4px solid #1a2a3a;
            margin-bottom: 26px;
          }

          .info-item {
            display: flex;
            align-items: center;
            padding: 4px 0;
            border-bottom: 1px dotted #e0e4e8;
          }

          .info-item:last-child {
            border-bottom: none;
          }

          .info-label {
            font-weight: 600;
            color: #1a2a3a;
            min-width: 120px;
            font-size: 13px;
            letter-spacing: 0.3px;
          }

          .info-value {
            color: #1a2a3a;
            font-size: 13px;
            font-weight: 500;
          }

          /* Performance Stats */
          .performance-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
            margin-bottom: 30px;
          }

          .stat-card {
            background: #f8f9fa;
            border: 1px solid #e0e4e8;
            padding: 14px 12px;
            text-align: center;
          }

          .stat-card .stat-label {
            font-size: 11px;
            color: #4a5a6a;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .stat-card .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #1a2a3a;
            margin-top: 4px;
          }

          /* Exam Section */
          .exam-section {
            margin-top: 26px;
          }

          .exam-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 2px solid #1a2a3a;
          }

          .exam-section-header h3 {
            font-size: 17px;
            font-weight: 700;
            color: #1a2a3a;
            font-family: 'Georgia', serif;
            letter-spacing: 0.5px;
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
            margin-bottom: 16px;
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
            font-family: 'Georgia', serif;
          }

          .exam-name {
            font-weight: 600;
            font-size: 15px;
            color: #1a2a3a;
            font-family: 'Georgia', serif;
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
            font-family: 'Georgia', serif;
          }

          .exam-grade-badge {
            font-weight: 700;
            font-size: 13px;
            padding: 4px 16px;
            border-radius: 20px;
            background: #1a2a3a;
            color: #ffffff;
          }

          .subjects-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          .subjects-table th {
            background: #1a2a3a;
            color: #ffffff;
            padding: 10px 14px;
            text-align: center;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .subjects-table td {
            padding: 9px 14px;
            text-align: center;
            border-bottom: 1px solid #e0e4e8;
          }

          .subjects-table tr:last-child td {
            border-bottom: none;
          }

          .subjects-table .subject-name {
            text-align: left;
            font-weight: 500;
            color: #1a2a3a;
            padding-left: 20px;
          }

          .subjects-table .total-row {
            background: #e8ecf0;
            font-weight: 700;
          }

          .subjects-table .total-row td {
            border-top: 2px solid #1a2a3a;
            padding: 12px 14px;
          }

          .subject-grade {
            font-weight: 600;
            padding: 3px 12px;
            border-radius: 12px;
            font-size: 11px;
            background: #f0f2f5;
            color: #1a2a3a;
          }

          .no-data {
            color: #7a8a9a;
            text-align: center;
            padding: 35px;
            font-style: italic;
          }

          /* Signature Section */
          .signature-section {
            margin-top: 38px;
            padding-top: 22px;
            border-top: 2px solid #1a2a3a;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
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
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .signature-name {
            font-size: 11px;
            color: #4a5a6a;
            margin-top: 3px;
          }

          .footer {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px solid #e0e4e8;
            text-align: center;
            font-size: 11px;
            color: #7a8a9a;
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
            font-family: 'Georgia', serif;
          }

          @media print {
            body { background: #ffffff; padding: 0; }
            .marks-card { border: 2px solid #1a2a3a; box-shadow: none; }
          }

          @media (max-width: 768px) {
            .marks-card-inner { padding: 20px 18px; }
            .school-header { flex-direction: column; gap: 12px; }
            .student-info { grid-template-columns: 1fr; gap: 4px; }
            .performance-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
            .signature-section { grid-template-columns: 1fr; gap: 16px; }
            .exam-card-header { flex-direction: column; align-items: flex-start; }
            .exam-score { width: 100%; justify-content: space-between; }
            .school-details .detail-item { display: block; margin: 2px 0; }
            .school-details .separator { display: none; }
          }

          @media (max-width: 480px) {
            .performance-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
            .stat-card { padding: 10px 8px; }
            .stat-card .stat-value { font-size: 18px; }
            .subjects-table { font-size: 11px; }
            .subjects-table th, .subjects-table td { padding: 6px 8px; }
          }
        </style>
      </head>
      <body>
        <div class="marks-card">
          <div class="marks-card-inner">
            <div class="watermark">PERFORMANCE REPORT</div>

            <!-- School Header -->
            <div class="school-header">
              <div class="school-info">
                <div class="school-name">${escapeHtml(schoolName)}</div>
                <div class="school-details">
                  <span class="detail-item">Phone : ${escapeHtml(schoolInfo.schoolPhone || '')}</span>
                  <span class="separator">|</span>
                  <span class="detail-item">Email : ${escapeHtml(schoolInfo.schoolEmail || '')}</span>
                  <span class="separator">|</span>
                  <span class="detail-item">Address : ${escapeHtml(schoolInfo.schoolAddress || '')}</span>
                </div>
              </div>
            </div>

            <div class="title-section">
              <h1>Performance Report</h1>
            </div>

            <!-- Student Info -->
            <div class="student-info">
              <div class="info-item">
                <span class="info-label">Student Name :</span>
                <span class="info-value">${escapeHtml(basicInfo.name || 'N/A')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Roll Number :</span>
                <span class="info-value">${escapeHtml(rollNumber)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Father's Name :</span>
                <span class="info-value">${escapeHtml(basicInfo.fatherName || 'N/A')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Class & Section :</span>
                <span class="info-value">${escapeHtml(basicInfo.grade || 'N/A')} - ${escapeHtml(basicInfo.section || 'N/A')}</span>
              </div>
            </div>

            ${hasExams ? `
            <!-- Performance Stats -->
            <div class="performance-stats">
              <div class="stat-card">
                <div class="stat-label">Total Examinations</div>
                <div class="stat-value">${performance.totalExams}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average Performance</div>
                <div class="stat-value">${performance.averagePercentage}%</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Overall Grade</div>
                <div class="stat-value">${performance.overallGrade}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Marks Obtained</div>
                <div class="stat-value">${performance.totalMarks}</div>
              </div>
            </div>
            ` : ''}

            <!-- Exam Section -->
            <div class="exam-section">
              <div class="exam-section-header">
                <h3>Examination Details</h3>
                ${hasExams ? `<span class="badge">${exams.length} Exams</span>` : ''}
              </div>

              ${hasExams ? exams.map((exam, index) => {
                const examPercentage = exam.percentage || 0;
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
                      <span class="exam-grade-badge">${escapeHtml(exam.overallGrade || 'N/A')}</span>
                    </div>
                  </div>
                  
                  ${(exam.subjects || []).length > 0 ? `
                  <table class="subjects-table">
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
                      ${exam.subjects.map(subject => {
                        const subPercentage = subject.total > 0 ? Math.round((subject.marks / subject.total) * 100) : 0;
                        return `
                        <tr>
                          <td class="subject-name">${escapeHtml(subject.name || 'N/A')}</td>
                          <td>${subject.marks || 0}</td>
                          <td>${subject.total || 0}</td>
                          <td>${subPercentage}%</td>
                          <td><span class="subject-grade">${escapeHtml(subject.grade || 'N/A')}</span></td>
                        </tr>
                        `;
                      }).join('')}
                      <tr class="total-row">
                        <td style="text-align:right;padding-right:20px;">Total</td>
                        <td>${exam.subjects.reduce((sum, s) => sum + (s.marks || 0), 0)}</td>
                        <td>${exam.subjects.reduce((sum, s) => sum + (s.total || 0), 0)}</td>
                        <td>${examPercentage}%</td>
                        <td><span class="subject-grade">${escapeHtml(exam.overallGrade || 'N/A')}</span></td>
                      </tr>
                    </tbody>
                  </table>
                  ` : '<div class="no-data">No subject records found for this examination</div>'}
                </div>
                `;
              }).join('') : `
                <div class="no-data">No examination records found for this student</div>
              `}
            </div>

            <!-- Signature Section -->
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
        </div>
      </body>
      </html>
    `;
  };

  // Download PDF
  const downloadPDF = async (student) => {
    if (!student) return;
    
    setIsDownloading(true);
    try {
      const element = document.createElement('div');
      element.innerHTML = getMarksCardHTML(student);
      document.body.appendChild(element);
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `PerformanceReport_${student.basicInfo?.name || 'Student'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          width: 1000,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        }
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

  // View marks preview
  const viewMarks = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedSection('');
  };

  // Clear view mode filters
  const clearViewFilters = () => {
    setViewGrade('');
    setViewSection('');
    setViewStudents([]);
  };

  // Clear download mode filters
  const clearDownloadFilters = () => {
    setDownloadGrade('');
    setDownloadSection('');
    setDownloadStudents([]);
    setDownloadSearchTerm('');
  };

  // Filter download students by search term
  const filteredDownloadStudents = useMemo(() => {
    if (!downloadSearchTerm) return downloadStudents;
    const term = downloadSearchTerm.toLowerCase().trim();
    return downloadStudents.filter(student => {
      const basic = student.basicInfo || {};
      return (
        basic.name?.toLowerCase().includes(term) ||
        basic.rollNumber?.toLowerCase().includes(term)
      );
    });
  }, [downloadStudents, downloadSearchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Marks Card</h2>
        <p className="text-gray-600">View and download academic marks cards</p>
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

      {/* View Marks Card Section */}
      {isViewMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Eye size={22} />
              View Marks Card Preview
            </h3>
            {(viewGrade || viewSection) && (
              <button
                onClick={clearViewFilters}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Grade</label>
              <select
                value={viewGrade}
                onChange={(e) => setViewGrade(e.target.value)}
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
                onChange={(e) => setViewSection(e.target.value)}
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
                onClick={() => {
                  if (!viewGrade || !viewSection) {
                    toast.warning('Please select both grade and section');
                    return;
                  }
                  const filtered = students.filter(student => 
                    student.basicInfo?.grade === viewGrade &&
                    student.basicInfo?.section === viewSection
                  );
                  setViewStudents(filtered);
                  if (filtered.length === 0) {
                    toast.info('No students found in this class');
                  } else {
                    toast.success(`Found ${filtered.length} students`);
                  }
                }}
                className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search size={18} />
                View Students
              </button>
            </div>
          </div>

          {viewStudents.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">
                  Showing <strong>{viewStudents.length}</strong> students in Grade {viewGrade} - Section {viewSection}
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No.</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Roll Number</th>
                      {viewStudents[0]?.marks?.exams?.length > 0 && 
                        viewStudents[0].marks.exams[viewStudents[0].marks.exams.length - 1].subjects.map((subject, idx) => (
                          <th key={idx} className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {subject.name}
                          </th>
                        ))
                      }
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Percentage</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Grade</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewStudents.map((student, studentIdx) => {
                      const basicInfo = student.basicInfo || {};
                      const exams = student.marks?.exams || [];
                      const latestExam = exams.length > 0 ? exams[exams.length - 1] : null;
                      const subjects = latestExam?.subjects || [];
                      const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);
                      const totalPossible = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
                      const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
                      const rollNumber = getRollNumber(student);
                      
                      return (
                        <tr key={student.studentId || studentIdx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-center">{studentIdx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium">{basicInfo.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rollNumber}</td>
                          {subjects.map((subject, subIdx) => (
                            <td key={subIdx} className="px-4 py-3 text-center text-sm">
                              {subject.marks || 0}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center text-sm font-medium">
                            {totalMarks}/{totalPossible}
                          </td>
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
                              onClick={() => viewMarks(student)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-sm mx-auto"
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
          )}

          {viewGrade && viewSection && viewStudents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No students found in Grade {viewGrade} - Section {viewSection}</p>
            </div>
          )}
        </div>
      )}

      {/* Download Marks Card Section */}
      {isDownloadMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Download size={22} />
              Download Marks Card
            </h3>
            {(downloadGrade || downloadSection || downloadSearchTerm) && (
              <button
                onClick={clearDownloadFilters}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Grade</label>
              <select
                value={downloadGrade}
                onChange={(e) => setDownloadGrade(e.target.value)}
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
                onChange={(e) => setDownloadSection(e.target.value)}
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
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  if (!downloadGrade || !downloadSection) {
                    toast.warning('Please select both grade and section');
                    return;
                  }
                  const filtered = students.filter(student => 
                    student.basicInfo?.grade === downloadGrade &&
                    student.basicInfo?.section === downloadSection
                  );
                  setDownloadStudents(filtered);
                  if (filtered.length === 0) {
                    toast.info('No students found in this class');
                  } else {
                    toast.success(`Found ${filtered.length} students`);
                  }
                }}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Search size={18} />
                Load Students
              </button>
            </div>
          </div>

          {filteredDownloadStudents.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">
                  Showing <strong>{filteredDownloadStudents.length}</strong> students in Grade {downloadGrade} - Section {downloadSection}
                </span>
                <button
                  onClick={() => {
                    if (filteredDownloadStudents.length === 1) {
                      downloadPDF(filteredDownloadStudents[0]);
                    } else {
                      toast.info(`Downloading ${filteredDownloadStudents.length} marks cards`);
                      filteredDownloadStudents.forEach((student, index) => {
                        setTimeout(() => {
                          downloadPDF(student);
                        }, index * 1500);
                      });
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Download All
                </button>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No.</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Roll Number</th>
                      {filteredDownloadStudents[0]?.marks?.exams?.length > 0 && 
                        filteredDownloadStudents[0].marks.exams[filteredDownloadStudents[0].marks.exams.length - 1].subjects.map((subject, idx) => (
                          <th key={idx} className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {subject.name}
                          </th>
                        ))
                      }
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Percentage</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Grade</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDownloadStudents.map((student, studentIdx) => {
                      const basicInfo = student.basicInfo || {};
                      const exams = student.marks?.exams || [];
                      const latestExam = exams.length > 0 ? exams[exams.length - 1] : null;
                      const subjects = latestExam?.subjects || [];
                      const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);
                      const totalPossible = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
                      const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
                      const rollNumber = getRollNumber(student);
                      
                      return (
                        <tr key={student.studentId || studentIdx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-center">{studentIdx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium">{basicInfo.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rollNumber}</td>
                          {subjects.map((subject, subIdx) => (
                            <td key={subIdx} className="px-4 py-3 text-center text-sm">
                              {subject.marks || 0}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center text-sm font-medium">
                            {totalMarks}/{totalPossible}
                          </td>
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
                              onClick={() => downloadPDF(student)}
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
          )}

          {downloadGrade && downloadSection && filteredDownloadStudents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No students found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Performance Report Preview
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedStudent.basicInfo?.name || 'Student'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => downloadPDF(selectedStudent)}
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
              <div dangerouslySetInnerHTML={{ __html: getMarksCardHTML(selectedStudent) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksCard;