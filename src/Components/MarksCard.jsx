// src/components/dashboard/components/MarksCard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Award, BookOpen, Calendar, Download, User, GraduationCap, Loader, FileDown } from 'lucide-react';
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
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: '',
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
        setSchoolInfo(result.data);
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

  // Filter students
  useEffect(() => {
    let filtered = [...students];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const basic = student.basicInfo || {};
        return (
          basic.name?.toLowerCase().includes(term) ||
          basic.admissionNo?.toLowerCase().includes(term) ||
          basic.fatherName?.toLowerCase().includes(term)
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

  // Generate Marks Card HTML - Black and White
  const getMarksCardHTML = (student) => {
    if (!student) return '';
    
    const basicInfo = student.basicInfo || {};
    const exams = student.marks?.exams || [];
    const performance = getStudentPerformance(student);
    
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
        <title>Marks Card - ${escapeHtml(basicInfo.name || 'Student')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Times New Roman', Times, serif;
            margin: 0; 
            padding: 20px; 
            background: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .marks-card {
            max-width: 900px;
            width: 100%;
            background: white;
            border: 2px solid #000000;
            padding: 40px;
            position: relative;
          }

          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #000000;
            margin-bottom: 25px;
          }

          .school-name {
            font-size: 24px;
            font-weight: 700;
            color: #000000;
            letter-spacing: 1px;
            margin-bottom: 4px;
            text-transform: uppercase;
          }

          .school-affiliation {
            font-size: 13px;
            color: #333333;
          }

          .title-section {
            background: #000000;
            color: white;
            padding: 10px 20px;
            margin: 20px 0 25px 0;
            text-align: center;
          }

          .title-section h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
          }

          .title-section .sub-title {
            font-size: 13px;
            opacity: 0.8;
            margin-top: 2px;
          }

          .student-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 30px;
            background: #f9f9f9;
            padding: 16px 20px;
            border: 1px solid #cccccc;
            margin-bottom: 25px;
          }

          .info-item {
            display: flex;
            align-items: center;
            padding: 3px 0;
          }

          .info-label {
            font-weight: 600;
            color: #000000;
            min-width: 110px;
            font-size: 13px;
          }

          .info-value {
            color: #000000;
            font-size: 13px;
            font-weight: 500;
          }

          .performance-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 30px;
          }

          .perf-card {
            background: #f9f9f9;
            border: 1px solid #cccccc;
            padding: 12px;
            text-align: center;
          }

          .perf-card .label {
            font-size: 11px;
            color: #333333;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .perf-card .value {
            font-size: 22px;
            font-weight: 700;
            color: #000000;
            margin-top: 4px;
          }

          .exam-section {
            margin-top: 25px;
          }

          .exam-section h3 {
            font-size: 16px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #000000;
          }

          .exam-block {
            background: #f9f9f9;
            border: 1px solid #cccccc;
            margin-bottom: 16px;
            overflow: hidden;
          }

          .exam-header {
            background: #ffffff;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #cccccc;
          }

          .exam-name {
            font-weight: 600;
            font-size: 14px;
            color: #000000;
          }

          .exam-meta {
            font-size: 12px;
            color: #333333;
          }

          .exam-grade {
            font-weight: 700;
            font-size: 13px;
            color: #000000;
          }

          .subjects-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          .subjects-table th {
            background: #000000;
            color: white;
            padding: 8px 12px;
            text-align: center;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .subjects-table td {
            padding: 8px 12px;
            text-align: center;
            border-bottom: 1px solid #dddddd;
          }

          .subjects-table tr:last-child td {
            border-bottom: none;
          }

          .subjects-table .subject-name {
            text-align: left;
            font-weight: 500;
            color: #000000;
          }

          .subjects-table .total-row {
            background: #e8e8e8;
            font-weight: 700;
          }

          .subjects-table .total-row td {
            border-top: 2px solid #000000;
            padding: 10px 12px;
          }

          .grade-text {
            font-weight: 600;
            color: #000000;
          }

          .no-data {
            color: #666666;
            text-align: center;
            padding: 30px;
            font-style: italic;
          }

          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #000000;
            text-align: center;
            font-size: 11px;
            color: #333333;
          }

          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.04);
            pointer-events: none;
            letter-spacing: 10px;
            white-space: nowrap;
          }

          @media print {
            body { background: white; padding: 0; }
            .marks-card { border: 2px solid #000; }
          }

          @media (max-width: 768px) {
            .marks-card { padding: 20px; }
            .student-info { grid-template-columns: 1fr; gap: 5px; }
            .performance-summary { grid-template-columns: 1fr 1fr; }
            .exam-header { flex-direction: column; gap: 8px; align-items: flex-start; }
          }
        </style>
      </head>
      <body>
        <div class="marks-card">
          <div class="watermark">MARKS CARD</div>

          <div class="header">
            <div class="school-name">${escapeHtml(schoolName)}</div>
            <div class="school-affiliation">Academic Performance Report</div>
          </div>

          <div class="title-section">
            <h1>MARKS CARD</h1>
            <div class="sub-title">${escapeHtml(new Date().toLocaleDateString())}</div>
          </div>

          <div class="student-info">
            <div class="info-item">
              <span class="info-label">Student Name</span>
              <span class="info-value">${escapeHtml(basicInfo.name || 'N/A')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Admission No</span>
              <span class="info-value">${escapeHtml(basicInfo.admissionNo || 'N/A')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Father's Name</span>
              <span class="info-value">${escapeHtml(basicInfo.fatherName || 'N/A')}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Class and Section</span>
              <span class="info-value">${escapeHtml(basicInfo.grade || 'N/A')} - ${escapeHtml(basicInfo.section || 'N/A')}</span>
            </div>
          </div>

          ${hasExams ? `
          <div class="performance-summary">
            <div class="perf-card">
              <div class="label">Total Exams</div>
              <div class="value">${performance.totalExams}</div>
            </div>
            <div class="perf-card">
              <div class="label">Average Performance</div>
              <div class="value">${performance.averagePercentage}%</div>
            </div>
            <div class="perf-card">
              <div class="label">Overall Grade</div>
              <div class="value">${performance.overallGrade}</div>
            </div>
            <div class="perf-card">
              <div class="label">Total Marks</div>
              <div class="value">${performance.totalMarks}</div>
            </div>
          </div>
          ` : ''}

          <div class="exam-section">
            <h3>Exam-wise Details</h3>
            ${hasExams ? exams.map((exam, index) => `
              <div class="exam-block">
                <div class="exam-header">
                  <div>
                    <div class="exam-name">${escapeHtml(exam.examType || 'Exam ' + (index + 1))}</div>
                    <div class="exam-meta">${exam.examDate ? escapeHtml(exam.examDate) : ''}</div>
                  </div>
                  <div>
                    <span class="exam-meta" style="margin-right:12px;">${exam.percentage || 0}%</span>
                    <span class="exam-grade">${escapeHtml(exam.overallGrade || 'N/A')}</span>
                  </div>
                </div>
                
                ${(exam.subjects || []).length > 0 ? `
                <table class="subjects-table">
                  <thead>
                    <tr>
                      <th style="text-align:left;">Subject</th>
                      <th>Marks</th>
                      <th>Total</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${exam.subjects.map(subject => `
                      <tr>
                        <td class="subject-name">${escapeHtml(subject.name || 'N/A')}</td>
                        <td>${subject.marks || 0}</td>
                        <td>${subject.total || 0}</td>
                        <td>${subject.total > 0 ? Math.round((subject.marks / subject.total) * 100) : 0}%</td>
                        <td><span class="grade-text">${escapeHtml(subject.grade || 'N/A')}</span></td>
                      </tr>
                    `).join('')}
                    <tr class="total-row">
                      <td style="text-align:right;padding-right:20px;">Total</td>
                      <td>${exam.subjects.reduce((sum, s) => sum + (s.marks || 0), 0)}</td>
                      <td>${exam.subjects.reduce((sum, s) => sum + (s.total || 0), 0)}</td>
                      <td>${exam.percentage || 0}%</td>
                      <td><span class="grade-text">${escapeHtml(exam.overallGrade || 'N/A')}</span></td>
                    </tr>
                  </tbody>
                </table>
                ` : '<div class="no-data">No subjects found for this exam</div>'}
              </div>
            `).join('') : `
              <div class="no-data">No exam records found for this student</div>
            `}
          </div>

          <div class="footer">
            Generated on: ${new Date().toLocaleDateString()} | Student ID: ${escapeHtml(student.studentId || 'N/A')}
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
        filename: `MarksCard_${student.basicInfo?.name || 'Student'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          width: 900,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        }
      };
      
      await html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // View marks
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Marks Card</h2>
        <p className="text-gray-600">Search and download marks cards for students</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Grades</option>
              {grades.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <X size={18} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {(searchTerm || selectedGrade || selectedSection) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {searchTerm && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <span className="font-medium">Search:</span>
                <span>{searchTerm}</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                  <X size={14} />
                </button>
              </div>
            )}
            {selectedGrade && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <span className="font-medium">Grade:</span>
                <span>{selectedGrade}</span>
                <button onClick={() => setSelectedGrade('')} className="hover:text-blue-900">
                  <X size={14} />
                </button>
              </div>
            )}
            {selectedSection && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <span className="font-medium">Section:</span>
                <span>{selectedSection}</span>
                <button onClick={() => setSelectedSection('')} className="hover:text-blue-900">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="animate-spin" size={40} />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="text-gray-400" size={32} />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">No students found</h4>
          <p className="text-gray-600">
            {searchTerm || selectedGrade || selectedSection
              ? "Try adjusting your search filters"
              : "No students available to display"}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">
            Showing <span className="font-semibold">{filteredStudents.length}</span> student(s)
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredStudents.map(student => {
              const basicInfo = student.basicInfo || {};
              const exams = student.marks?.exams || [];
              const performance = getStudentPerformance(student);
              const hasExams = exams.length > 0;

              return (
                <div
                  key={student.id || student.studentId}
                  className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {basicInfo.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {basicInfo.name || 'Unnamed'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Adm: {basicInfo.admissionNo || '-'}
                          </p>
                        </div>
                      </div>
                      {hasExams && (
                        <div className="text-right flex-shrink-0 ml-4">
                          <span className="px-3 py-1 rounded-full text-sm font-medium border border-gray-300 bg-gray-100 text-gray-800">
                            {performance.overallGrade}
                          </span>
                          <p className="text-sm font-semibold text-gray-700 mt-1">
                            {performance.averagePercentage}%
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Class</p>
                        <p className="font-medium text-gray-800">
                          {basicInfo.grade || '-'} - {basicInfo.section || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Exams</p>
                        <p className="font-medium text-gray-800">{exams.length}</p>
                      </div>
                    </div>

                    {hasExams && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Performance</span>
                          <span>{performance.averagePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(performance.averagePercentage, 100)}%`,
                              backgroundColor:
                                performance.averagePercentage >= 90 ? '#059669' :
                                performance.averagePercentage >= 75 ? '#2563eb' :
                                performance.averagePercentage >= 60 ? '#d97706' :
                                performance.averagePercentage >= 40 ? '#ea580c' :
                                performance.averagePercentage > 0 ? '#dc2626' :
                                '#9ca3af'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={() => viewMarks(student)}
                        className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        View Details
                      </button>
                      {/* <button
                        onClick={() => downloadPDF(student)}
                        disabled={isDownloading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50"
                      >
                        <Download size={16} />
                        <span>PDF</span>
                      </button> */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-800">
                Marks Card - {selectedStudent.basicInfo?.name || 'Student'}
              </h3>
              <div className="flex items-center space-x-3">
                {/* <button
                  onClick={() => downloadPDF(selectedStudent)}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Download size={18} />
                  <span>Download PDF</span>
                </button> */}
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