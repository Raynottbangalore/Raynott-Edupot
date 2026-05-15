// src/Components/HallTicket.jsx
import React, { useState, useEffect } from 'react';
import { Eye, Edit, Download, Search, X, Save, Printer, Calendar, BookOpen, FileText, User, Loader, Plus, Trash2, ChevronDown, ChevronRight, Users, FileDown, School, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';
import html2pdf from 'html2pdf.js';

const HallTicket = ({ students: propStudents, onUpdateStudent }) => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [savedHallTicket, setSavedHallTicket] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSectionData, setSelectedSectionData] = useState(null);
  const [viewMode, setViewMode] = useState('class');
  const [isDownloading, setIsDownloading] = useState(false);

  const emptyHallTicketData = {
    schoolName: '',
    schoolAffiliation: '',
    examTitle: '',
    studentName: '',
    fatherName: '',
    motherName: '',
    studentClass: '',
    section: '',
    admissionNumber: '',
    rollNumber: '',
    dateOfBirth: '',
    gender: '',
    examType: '',
    examDate: '',
    examTime: '',
    subjects: [],
    instructions: [],
    studentSignature: '',
    principalSignature: '',
    principalName: '',
  };

  const [hallTicketData, setHallTicketData] = useState(emptyHallTicketData);

  // Load students
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
    } else {
      loadStudents();
    }
  }, [propStudents]);

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

  // Get unique classes from students with statistics
  const getGroupedClasses = () => {
    // Safety check
    if (!students || students.length === 0) {
      return [];
    }
    
    const groups = new Map();
    
    students.forEach(student => {
      const basicInfo = student.basicInfo || {};
      const grade = basicInfo.grade || 'Unassigned';
      const section = basicInfo.section || 'Unassigned';
      const key = `${grade}-${section}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          grade,
          section,
          students: [],
          studentCount: 0,
          hasHallTicketCount: 0,
          noHallTicketCount: 0
        });
      }
      
      const group = groups.get(key);
      group.students.push(student);
      group.studentCount++;
      group.noHallTicketCount++;
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return a.section.localeCompare(b.section);
    });
  };

  const getStudentInfo = (student, field) => {
    if (!student || !student.basicInfo) return '';
    const basicInfo = student.basicInfo;
    switch (field) {
      case 'fullName': return basicInfo.name || '';
      case 'admissionNumber': return basicInfo.admissionNo || '';
      case 'className': return basicInfo.grade || '';
      case 'section': return basicInfo.section || '';
      case 'fatherName': return basicInfo.fatherName || '';
      case 'motherName': return basicInfo.motherName || '';
      case 'dob': return basicInfo.dob || '';
      case 'gender': return basicInfo.gender || '';
      default: return '';
    }
  };

  const generateHallTicket = async (student) => {
    if (!student) return;
    
    const admissionNo = getStudentInfo(student, 'admissionNumber');
    const className = getStudentInfo(student, 'className');
    const section = getStudentInfo(student, 'section');

    setHallTicketData({
      ...emptyHallTicketData,
      studentName: getStudentInfo(student, 'fullName'),
      fatherName: getStudentInfo(student, 'fatherName'),
      motherName: getStudentInfo(student, 'motherName'),
      studentClass: className,
      section: section,
      admissionNumber: admissionNo,
      rollNumber: admissionNo || `ROLL${student.studentId?.slice(-6)}`,
      dateOfBirth: getStudentInfo(student, 'dob'),
      gender: getStudentInfo(student, 'gender'),
    });

    setSelectedStudent(student);
    setPhotoPreview(null);
    setPhotoFile(null);
    setSavedHallTicket(null);

    try {
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        setHallTicketData(result.hallTicket.hallTicketData || emptyHallTicketData);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
        toast.info('Loaded existing hall ticket');
      }
    } catch (error) {
      console.log('No existing hall ticket found');
    }

    setIsViewModalOpen(true);
  };

  const handleEditHallTicket = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size should be less than 5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, GIF, and WEBP images are allowed');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      toast.success('Photo selected successfully');
    }
  };

  const handleSaveHallTicket = async () => {
    if (!selectedStudent) {
      toast.error('No student selected');
      return;
    }

    setIsSaving(true);
    try {
      const saveData = {
        ...hallTicketData,
        subjects: Array.isArray(hallTicketData.subjects) ? hallTicketData.subjects : [],
        instructions: Array.isArray(hallTicketData.instructions) ? hallTicketData.instructions : [],
        version: savedHallTicket?.version || 1,
      };

      const result = await StudentApi.saveHallTicket(
        selectedStudent.studentId,
        saveData,
        photoFile
      );

      if (result.success) {
        toast.success('Hall ticket saved successfully!');
        setSavedHallTicket(result.hallTicket);
        if (result.imageUrl) {
          setPhotoPreview(result.imageUrl);
        }
        setIsEditModalOpen(false);
        setIsViewModalOpen(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving hall ticket:', error);
      toast.error(error.message || 'Failed to save hall ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadPDF = async (data, photo, studentName) => {
    setIsDownloading(true);
    try {
      const element = document.createElement('div');
      element.innerHTML = getHallTicketHTML(data, photo);
      element.style.padding = '20px';
      element.style.background = 'white';
      
      document.body.appendChild(element);
      
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `HallTicket_${studentName || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
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

  const downloadHallTicket = () => {
    try {
      const printWindow = window.open('', '_blank');
      const content = getHallTicketHTML(hallTicketData, photoPreview);
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
      toast.success('Hall ticket ready for printing');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to print hall ticket');
    }
  };

  const handleFieldChange = (field, value) => {
    setHallTicketData({ ...hallTicketData, [field]: value });
  };

  const handleSubjectChange = (index, field, value) => {
    const updatedSubjects = [...(hallTicketData.subjects || [])];
    if (updatedSubjects[index]) {
      updatedSubjects[index][field] = value;
      setHallTicketData({ ...hallTicketData, subjects: updatedSubjects });
    }
  };

  const addSubject = () => {
    setHallTicketData({
      ...hallTicketData,
      subjects: [...(hallTicketData.subjects || []), { name: '', code: '', date: '', time: '', venue: '' }]
    });
  };

  const removeSubject = (index) => {
    const updatedSubjects = (hallTicketData.subjects || []).filter((_, i) => i !== index);
    setHallTicketData({ ...hallTicketData, subjects: updatedSubjects });
  };

  const handleInstructionChange = (index, value) => {
    const updatedInstructions = [...(hallTicketData.instructions || [])];
    updatedInstructions[index] = value;
    setHallTicketData({ ...hallTicketData, instructions: updatedInstructions });
  };

  const addInstruction = () => {
    setHallTicketData({
      ...hallTicketData,
      instructions: [...(hallTicketData.instructions || []), '']
    });
  };

  const removeInstruction = (index) => {
    const updatedInstructions = (hallTicketData.instructions || []).filter((_, i) => i !== index);
    setHallTicketData({ ...hallTicketData, instructions: updatedInstructions });
  };

  const getHallTicketHTML = (data, photo) => {
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const safeData = data || emptyHallTicketData;
    const hasSchoolInfo = safeData.schoolName || safeData.schoolAffiliation || safeData.examTitle;
    const hasSubjects = safeData.subjects && safeData.subjects.length > 0 && safeData.subjects.some(s => s && s.name);
    const hasInstructions = safeData.instructions && safeData.instructions.length > 0 && safeData.instructions.some(i => i && i.trim());

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hall Ticket - ${escapeHtml(safeData.studentName || 'Student')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #e0e0e0; }
          .hall-ticket { max-width: 900px; margin: 0 auto; background: white; border: 2px solid #1a1a2e; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative; }
          .hall-ticket::before { content: ""; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 1px solid #ddd; pointer-events: none; }
          .header { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 20px; }
          .school-name { font-size: 28px; font-weight: bold; color: #b45309; margin-bottom: 5px; }
          .school-affiliation { font-size: 12px; color: #666; }
          .title { font-size: 22px; font-weight: bold; margin: 15px 0; text-align: center; color: #1a1a2e; letter-spacing: 2px; }
          .info-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; background: #fafafa; }
          .info-row { display: flex; margin: 8px 0; padding: 5px; }
          .label { font-weight: bold; width: 130px; color: #555; }
          .value { flex: 1; color: #333; border-bottom: 1px dotted #ccc; }
          .subjects { margin: 20px 0; }
          .subjects h3 { margin-bottom: 10px; color: #1a1a2e; }
          .subjects table { width: 100%; border-collapse: collapse; }
          .subjects th, .subjects td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .subjects th { background: #f5f5f5; font-weight: bold; }
          .instructions { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #b45309; }
          .instructions h3 { margin-bottom: 10px; color: #1a1a2e; }
          .instructions ul { margin: 10px 0; padding-left: 20px; }
          .instructions li { margin: 5px 0; line-height: 1.4; }
          .signature { margin-top: 30px; display: flex; justify-content: space-between; padding-top: 20px; }
          .signature div { text-align: center; }
          .photo-container { float: right; width: 120px; height: 140px; border: 1px solid #ddd; margin-left: 20px; margin-bottom: 15px; text-align: center; overflow: hidden; background: #f5f5f5; display: flex; align-items: center; justify-content: center; }
          .photo-container img { width: 100%; height: 100%; object-fit: cover; }
          .photo-container span { color: #999; font-size: 12px; }
          .clearfix::after { content: ""; clear: both; display: table; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
          @media print { body { background: white; padding: 0; margin: 0; } .hall-ticket { box-shadow: none; padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="hall-ticket">
          ${hasSchoolInfo ? `
          <div class="header">
            <div class="school-name">${escapeHtml(safeData.schoolName || '')}</div>
            <div class="school-affiliation">${escapeHtml(safeData.schoolAffiliation || '')}</div>
            <div class="title">${escapeHtml(safeData.examTitle || 'HALL TICKET')}</div>
          </div>
          ` : ''}
          
          <div class="clearfix">
            <div class="photo-container">
              ${photo ? `<img src="${photo}" alt="Student Photo" />` : '<span>No Photo</span>'}
            </div>
            <div class="info-section">
              <div class="info-row"><div class="label">Student Name:</div><div class="value">${escapeHtml(safeData.studentName || 'N/A')}</div></div>
              <div class="info-row"><div class="label">Father's Name:</div><div class="value">${escapeHtml(safeData.fatherName || 'N/A')}</div></div>
              <div class="info-row"><div class="label">Mother's Name:</div><div class="value">${escapeHtml(safeData.motherName || 'N/A')}</div></div>
              <div class="info-row"><div class="label">Date of Birth:</div><div class="value">${escapeHtml(safeData.dateOfBirth || 'N/A')}</div></div>
              <div class="info-row"><div class="label">Roll Number:</div><div class="value">${escapeHtml(safeData.rollNumber || 'N/A')}</div></div>
              <div class="info-row"><div class="label">Class/Section:</div><div class="value">${escapeHtml(safeData.studentClass || 'N/A')} ${safeData.section ? `- ${escapeHtml(safeData.section)}` : ''}</div></div>
              <div class="info-row"><div class="label">Admission No:</div><div class="value">${escapeHtml(safeData.admissionNumber || 'N/A')}</div></div>
              <div class="info-row"><div class="label">Gender:</div><div class="value">${escapeHtml(safeData.gender || 'N/A')}</div></div>
            </div>
          </div>

          ${safeData.examType || safeData.examDate || safeData.examTime ? `
          <div class="info-section">
            ${safeData.examType ? `<div class="info-row"><div class="label">Exam Type:</div><div class="value">${escapeHtml(safeData.examType)}</div></div>` : ''}
            ${safeData.examDate ? `<div class="info-row"><div class="label">Exam Date:</div><div class="value">${escapeHtml(safeData.examDate)}</div></div>` : ''}
            ${safeData.examTime ? `<div class="info-row"><div class="label">Exam Time:</div><div class="value">${escapeHtml(safeData.examTime)}</div></div>` : ''}
          </div>
          ` : ''}

          ${hasSubjects ? `
          <div class="subjects">
            <h3>Examination Schedule</h3>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject Name</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Venue</th>
                </tr>
              </thead>
              <tbody>
                ${safeData.subjects.filter(s => s && s.name).map((subject, index) => `
                  <tr>
                    <td>${escapeHtml(subject.code || '')}</td>
                    <td>${escapeHtml(subject.name)}</td>
                    <td>${escapeHtml(subject.date || '')}</td>
                    <td>${escapeHtml(subject.time || '')}</td>
                    <td>${escapeHtml(subject.venue || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${hasInstructions ? `
          <div class="instructions">
            <h3>Important Instructions:</h3>
            <ul>
              ${safeData.instructions.filter(i => i && i.trim()).map(instruction => `<li>${escapeHtml(instruction)}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <div class="signature">
            <div>_________________<br>${escapeHtml(safeData.studentSignature || 'Student\'s Signature')}</div>
            <div>_________________<br>${escapeHtml(safeData.principalSignature || 'Principal')}<br>${escapeHtml(safeData.principalName || '')}</div>
          </div>
          <div class="footer">
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const viewHallTicket = async (student) => {
    if (!student) return;
    
    setSelectedStudent(student);
    setIsLoading(true);

    try {
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        setHallTicketData(result.hallTicket.hallTicketData || emptyHallTicketData);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
        setIsViewModalOpen(true);
      } else {
        generateHallTicket(student);
      }
    } catch (error) {
      console.error('Error viewing hall ticket:', error);
      generateHallTicket(student);
    } finally {
      setIsLoading(false);
    }
  };

  const editHallTicket = async (student) => {
    if (!student) return;
    
    setSelectedStudent(student);
    setIsLoading(true);

    try {
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        setHallTicketData(result.hallTicket.hallTicketData || emptyHallTicketData);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
      } else {
        const admissionNo = getStudentInfo(student, 'admissionNumber');
        setHallTicketData({
          ...emptyHallTicketData,
          studentName: getStudentInfo(student, 'fullName'),
          fatherName: getStudentInfo(student, 'fatherName'),
          motherName: getStudentInfo(student, 'motherName'),
          studentClass: getStudentInfo(student, 'className'),
          section: getStudentInfo(student, 'section'),
          admissionNumber: admissionNo,
          rollNumber: admissionNo || `ROLL${student.studentId?.slice(-6)}`,
          dateOfBirth: getStudentInfo(student, 'dob'),
          gender: getStudentInfo(student, 'gender'),
        });
        setPhotoPreview(null);
        setPhotoFile(null);
      }
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error editing hall ticket:', error);
      toast.error('Failed to load hall ticket data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectPDFDownload = async (student) => {
    if (!student) return;
    
    setIsLoading(true);
    try {
      const result = await StudentApi.getHallTicket(student.studentId);
      let ticketData, ticketPhoto;
      
      if (result.success && result.hallTicket) {
        ticketData = result.hallTicket.hallTicketData;
        ticketPhoto = result.hallTicket.imageUrl;
      } else {
        const admissionNo = getStudentInfo(student, 'admissionNumber');
        const className = getStudentInfo(student, 'className');
        const section = getStudentInfo(student, 'section');
        
        ticketData = {
          ...emptyHallTicketData,
          studentName: getStudentInfo(student, 'fullName'),
          fatherName: getStudentInfo(student, 'fatherName'),
          motherName: getStudentInfo(student, 'motherName'),
          studentClass: className,
          section: section,
          admissionNumber: admissionNo,
          rollNumber: admissionNo || `ROLL${student.studentId?.slice(-6)}`,
          dateOfBirth: getStudentInfo(student, 'dob'),
          gender: getStudentInfo(student, 'gender'),
        };
        ticketPhoto = null;
      }
      
      await downloadPDF(ticketData, ticketPhoto, student.basicInfo?.name);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassClick = (grade, section, studentsList) => {
    setSelectedClass({ grade, section });
    setSelectedSectionData({
      grade,
      section,
      students: studentsList || [],
      studentCount: studentsList?.length || 0,
      hasHallTicketCount: 0,
      noHallTicketCount: studentsList?.length || 0
    });
    setViewMode('students');
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSectionData(null);
    setViewMode('class');
    setSearchTerm('');
  };

  const getFilteredStudents = () => {
    if (!searchTerm) return selectedSectionData?.students || [];
    
    return (selectedSectionData?.students || []).filter(student => {
      const basicInfo = student?.basicInfo || {};
      return (
        basicInfo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        basicInfo.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        basicInfo.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        basicInfo.section?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  };

  // Render Class/Section View
  const renderClassView = () => {
    const groups = getGroupedClasses();
    
    if (groups.length === 0 && !isLoading) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <School size={32} className="text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">No classes found</h4>
          <p className="text-gray-500">Add students to create classes and sections</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {groups.map((group) => (
          <div 
            key={`${group.grade}-${group.section}`}
            onClick={() => handleClassClick(group.grade, group.section, group.students)}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group-hover"
          >
            <div className="bg-gradient-to-r from-amber-50 to-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                    <School size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Grade {group.grade}
                    </h3>
                    <p className="text-sm text-gray-600">Section {group.section}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-amber-600 transition-colors" size={24} />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users size={18} className="text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{group.studentCount}</p>
                  <p className="text-xs text-gray-500">Total Students</p>
                </div>
              </div>

              <button 
                className="w-full mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClassClick(group.grade, group.section, group.students);
                }}
              >
                <Eye size={16} />
                <span>View Hall Tickets</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render Students View
  const renderStudentsView = () => {
    if (!selectedSectionData) return null;
    
    const filteredStudentsList = getFilteredStudents();
    const { grade, section, studentCount } = selectedSectionData;

    return (
      <div className="space-y-6">
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
                  Hall Tickets: Grade {grade} - Section {section}
                </h2>
                <p className="text-gray-500 mt-1">Manage hall tickets for {studentCount} students</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-amber-600">{studentCount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
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
                <FileText size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hall Tickets</p>
                <p className="text-xl font-bold text-green-600">0 / {studentCount}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Printer size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ready to Print</p>
                <p className="text-xl font-bold text-amber-600">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={`Search students in Grade ${grade} - Section ${section}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <div className="flex justify-end mt-3">
              <button
                onClick={() => setSearchTerm('')}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Students ({filteredStudentsList.length})
          </h3>
        </div>

        <div className="space-y-4">
          {filteredStudentsList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="text-gray-400" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No students found</h4>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search" : "No students in this class"}
              </p>
            </div>
          ) : (
            filteredStudentsList.map((student) => {
              const basicInfo = student?.basicInfo || {};
              return (
                <div
                  key={student.studentId}
                  className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">
                            {basicInfo.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {basicInfo.name || 'Unnamed'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 mt-2">
                            <span>Adm: {basicInfo.admissionNo || '—'}</span>
                            <span>Roll: {basicInfo.rollNumber || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => viewHallTicket(student)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Hall Ticket"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => editHallTicket(student)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Hall Ticket"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDirectPDFDownload(student)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Download PDF"
                          disabled={isDownloading}
                        >
                          <FileDown size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const groups = getGroupedClasses();
  const summary = {
    totalClasses: groups.length,
    totalStudents: students?.length || 0,
    totalHallTickets: 0,
    pendingHallTickets: students?.length || 0
  };

  return (
    <div className="p-6">
      {viewMode === 'class' ? (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Hall Ticket Management</h2>
            <p className="text-gray-600 mt-1">Create and manage hall tickets for students - Organized by Class and Section</p>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Classes</p>
                  <p className="text-3xl font-bold text-gray-800">{summary.totalClasses}</p>
                </div>
                <div className="p-3 bg-amber-200 rounded-lg">
                  <School className="text-amber-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-gray-800">{summary.totalStudents}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hall Tickets</p>
                  <p className="text-3xl font-bold text-gray-800">{summary.totalHallTickets}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-lg">
                  <FileText className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-gray-800">{summary.pendingHallTickets}</p>
                </div>
                <div className="p-3 bg-red-200 rounded-lg">
                  <Printer className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div> */}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Classes & Sections
                <span className="ml-2 text-sm font-normal text-gray-500">({summary.totalClasses} classes)</span>
              </h3>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="animate-spin" size={40} />
              </div>
            ) : (
              renderClassView()
            )}
          </div>
        </>
      ) : (
        renderStudentsView()
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Hall Ticket Preview</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div dangerouslySetInnerHTML={{ __html: getHallTicketHTML(hallTicketData, photoPreview) }} />
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button onClick={handleEditHallTicket} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Edit Hall Ticket
                </button>
                <button 
                  onClick={() => downloadPDF(hallTicketData, photoPreview, selectedStudent?.basicInfo?.name)} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <FileDown size={18} />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
                <button onClick={downloadHallTicket} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Printer size={18} />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {savedHallTicket ? 'Edit Hall Ticket' : 'Create Hall Ticket'} - {hallTicketData.studentName || selectedStudent?.basicInfo?.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="animate-spin" size={40} />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText size={20} /> School Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                        <input type="text" value={hallTicketData.schoolName} onChange={(e) => handleFieldChange('schoolName', e.target.value)} placeholder="Enter school name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Affiliation</label>
                        <input type="text" value={hallTicketData.schoolAffiliation} onChange={(e) => handleFieldChange('schoolAffiliation', e.target.value)} placeholder="e.g., Affiliated to CBSE" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                        <input type="text" value={hallTicketData.examTitle} onChange={(e) => handleFieldChange('examTitle', e.target.value)} placeholder="e.g., ANNUAL EXAMINATION 2025" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User size={20} /> Student Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                        <input type="text" value={hallTicketData.studentName} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                        <input type="text" value={hallTicketData.fatherName} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                        <input type="text" value={hallTicketData.motherName} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input type="date" value={hallTicketData.dateOfBirth} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                        <input type="text" value={hallTicketData.rollNumber} onChange={(e) => handleFieldChange('rollNumber', e.target.value)} placeholder="Enter roll number" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <input type="text" value={hallTicketData.studentClass} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <input type="text" value={hallTicketData.section} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
                        <input type="text" value={hallTicketData.admissionNumber} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select value={hallTicketData.gender} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" disabled>
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
                        <div className="flex items-center space-x-4">
                          <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handlePhotoUpload} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
                          {photoPreview && <img src={photoPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Allowed: JPEG, PNG, GIF, WEBP</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar size={20} /> Exam Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                        <input type="text" value={hallTicketData.examType} onChange={(e) => handleFieldChange('examType', e.target.value)} placeholder="e.g., Annual Examination" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                        <input type="text" value={hallTicketData.examDate} onChange={(e) => handleFieldChange('examDate', e.target.value)} placeholder="e.g., March 15, 2025" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Time</label>
                        <input type="text" value={hallTicketData.examTime} onChange={(e) => handleFieldChange('examTime', e.target.value)} placeholder="e.g., 10:00 AM - 1:00 PM" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen size={20} /> Subjects
                      </h4>
                      <button onClick={addSubject} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm">
                        <Plus size={16} /> Add Subject
                      </button>
                    </div>
                    {(!hallTicketData.subjects || hallTicketData.subjects.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No subjects added. Click "Add Subject" to add exam subjects.</p>
                    )}
                    {hallTicketData.subjects && hallTicketData.subjects.map((subject, index) => (
                      <div key={index} className="border-b pb-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium">Subject {index + 1}</h5>
                          <button onClick={() => removeSubject(index)} className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1">
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <input type="text" placeholder="Subject Name" value={subject.name || ''} onChange={(e) => handleSubjectChange(index, 'name', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                          <input type="text" placeholder="Subject Code" value={subject.code || ''} onChange={(e) => handleSubjectChange(index, 'code', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                          <input type="text" placeholder="Date" value={subject.date || ''} onChange={(e) => handleSubjectChange(index, 'date', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                          <input type="text" placeholder="Time" value={subject.time || ''} onChange={(e) => handleSubjectChange(index, 'time', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                          <input type="text" placeholder="Venue" value={subject.venue || ''} onChange={(e) => handleSubjectChange(index, 'venue', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <FileText size={20} /> Instructions
                      </h4>
                      <button onClick={addInstruction} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm">
                        <Plus size={16} /> Add Instruction
                      </button>
                    </div>
                    {(!hallTicketData.instructions || hallTicketData.instructions.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No instructions added. Click "Add Instruction" to add exam instructions.</p>
                    )}
                    {hallTicketData.instructions && hallTicketData.instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input type="text" value={instruction || ''} onChange={(e) => handleInstructionChange(index, e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" placeholder={`Instruction ${index + 1}`} />
                        <button onClick={() => removeInstruction(index)} className="text-red-600 hover:text-red-700">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-4">Signatures</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Signature Label</label>
                        <input type="text" value={hallTicketData.studentSignature} onChange={(e) => handleFieldChange('studentSignature', e.target.value)} placeholder="e.g., Student's Signature" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Signature Label</label>
                        <input type="text" value={hallTicketData.principalSignature} onChange={(e) => handleFieldChange('principalSignature', e.target.value)} placeholder="e.g., Principal" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                        <input type="text" value={hallTicketData.principalName} onChange={(e) => handleFieldChange('principalName', e.target.value)} placeholder="Enter principal's name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400" disabled={isSaving}>
                  Cancel
                </button>
                <button onClick={handleSaveHallTicket} disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50">
                  {isSaving ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Hall Ticket</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    handleSaveHallTicket();
                    setTimeout(() => downloadHallTicket(), 1000);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Printer size={18} />
                  <span>Save & Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HallTicket;