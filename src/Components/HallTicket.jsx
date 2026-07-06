// src/Components/HallTicket.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Edit, Download, Search, X, Save, Printer, Calendar, BookOpen, FileText, User, Loader, Plus, Trash2, ChevronDown, ChevronRight, Users, FileDown, School, ArrowLeft, DownloadCloud } from 'lucide-react';
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
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentGrade, setCurrentGrade] = useState('');
  const [currentSection, setCurrentSection] = useState('');
  const [commonHallTicketData, setCommonHallTicketData] = useState({
    schoolName: '',
    schoolAffiliation: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    examTitle: '',
    examType: '',
    examDate: '',
    examTime: '',
    examDuration: '',
    subjects: [],
    instructions: [],
    studentSignature: "Student's Signature",
    principalSignature: 'Principal',
    principalName: '',
    examController: 'Exam Controller',
    examControllerName: '',
  });
  const [isCommonEditModalOpen, setIsCommonEditModalOpen] = useState(false);
  const [isCommonDataLoaded, setIsCommonDataLoaded] = useState(false);

  const emptyHallTicketData = {
    schoolName: '',
    schoolAffiliation: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
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
    examDuration: '',
    subjects: [],
    instructions: [],
    studentSignature: '',
    principalSignature: '',
    principalName: '',
    examController: '',
    examControllerName: '',
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
  const getGroupedClasses = useCallback(() => {
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
  }, [students]);

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

  // Helper function to get the storage key for a class/section
  const getStorageKey = useCallback((grade, section) => {
    const normalizedGrade = String(grade || '').trim();
    const normalizedSection = String(section || '').trim().toUpperCase();
    return `hallTicketCommon_${normalizedGrade}_${normalizedSection}`;
  }, []);

  // Helper function to merge common data with student data
  const mergeWithCommonData = useCallback((studentData) => {
    const merged = {
      ...emptyHallTicketData,
      ...commonHallTicketData,
      ...studentData,
    };
    
    if (commonHallTicketData.subjects && commonHallTicketData.subjects.length > 0) {
      merged.subjects = commonHallTicketData.subjects;
    } else if (studentData.subjects && studentData.subjects.length > 0) {
      merged.subjects = studentData.subjects;
    } else {
      merged.subjects = [];
    }
    
    if (commonHallTicketData.instructions && commonHallTicketData.instructions.length > 0) {
      merged.instructions = commonHallTicketData.instructions;
    } else if (studentData.instructions && studentData.instructions.length > 0) {
      merged.instructions = studentData.instructions;
    } else {
      merged.instructions = [];
    }
    
    return merged;
  }, [commonHallTicketData]);

  // Load common settings for a specific grade and section
  const loadCommonSettings = useCallback((grade, section) => {
    try {
      const key = getStorageKey(grade, section);
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setCommonHallTicketData(parsedData);
        setIsCommonDataLoaded(true);
        return parsedData;
      } else {
        const emptyData = {
          schoolName: '',
          schoolAffiliation: '',
          schoolAddress: '',
          schoolPhone: '',
          schoolEmail: '',
          examTitle: '',
          examType: '',
          examDate: '',
          examTime: '',
          examDuration: '',
          subjects: [],
          instructions: [],
          studentSignature: "Student's Signature",
          principalSignature: 'Principal',
          principalName: '',
          examController: 'Exam Controller',
          examControllerName: '',
        };
        setCommonHallTicketData(emptyData);
        setIsCommonDataLoaded(true);
        return emptyData;
      }
    } catch (error) {
      console.error('Error loading common data:', error);
      setIsCommonDataLoaded(true);
      return null;
    }
  }, [getStorageKey]);

  const generateHallTicket = async (student) => {
    if (!student) return;
    
    const admissionNo = getStudentInfo(student, 'admissionNumber');
    const className = getStudentInfo(student, 'className');
    const section = getStudentInfo(student, 'section');

    const commonData = loadCommonSettings(className, section);
    
    const studentSpecificData = {
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

    const mergedData = mergeWithCommonData(studentSpecificData);
    setHallTicketData(mergedData);

    setSelectedStudent(student);
    setPhotoPreview(null);
    setPhotoFile(null);
    setSavedHallTicket(null);

    try {
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        const savedData = result.hallTicket.hallTicketData || emptyHallTicketData;
        const mergedSavedData = mergeWithCommonData(savedData);
        setHallTicketData(mergedSavedData);
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
      const mergedData = mergeWithCommonData(data);
      
      const element = document.createElement('div');
      element.innerHTML = getHallTicketHTML(mergedData, photo);
      element.style.padding = '20px';
      element.style.background = '#f0f0f0';
      
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

  const downloadAllHallTickets = async () => {
    const studentsList = selectedSectionData?.students || [];
    if (studentsList.length === 0) {
      toast.error('No students in this class');
      return;
    }

    setIsDownloadingAll(true);
    setDownloadProgress(0);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < studentsList.length; i++) {
        const student = studentsList[i];
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
            
            loadCommonSettings(className, section);
            
            const studentSpecificData = {
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
            
            ticketData = mergeWithCommonData(studentSpecificData);
            ticketPhoto = null;
          }

          const mergedData = mergeWithCommonData(ticketData);
          
          const element = document.createElement('div');
          element.innerHTML = getHallTicketHTML(mergedData, ticketPhoto);
          element.style.padding = '20px';
          element.style.background = '#f0f0f0';
          
          document.body.appendChild(element);
          
          const opt = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `HallTicket_${student.basicInfo?.name || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
          };
          
          await html2pdf().set(opt).from(element).save();
          document.body.removeChild(element);
          
          successCount++;
          setDownloadProgress(((i + 1) / studentsList.length) * 100);
          
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error downloading hall ticket for ${student.basicInfo?.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Downloaded ${successCount} hall tickets${failCount > 0 ? `, ${failCount} failed` : ''}`);
      } else {
        toast.error('Failed to download any hall tickets');
      }
    } catch (error) {
      console.error('Error downloading all hall tickets:', error);
      toast.error('Failed to download all hall tickets');
    } finally {
      setIsDownloadingAll(false);
      setDownloadProgress(0);
    }
  };

  const downloadHallTicket = () => {
    try {
      const printWindow = window.open('', '_blank');
      const mergedData = mergeWithCommonData(hallTicketData);
      const content = getHallTicketHTML(mergedData, photoPreview);
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

  const handleCommonFieldChange = (field, value) => {
    setCommonHallTicketData({ ...commonHallTicketData, [field]: value });
  };

  const handleSubjectChange = (index, field, value) => {
    const updatedSubjects = [...(hallTicketData.subjects || [])];
    if (updatedSubjects[index]) {
      updatedSubjects[index][field] = value;
      setHallTicketData({ ...hallTicketData, subjects: updatedSubjects });
    }
  };

  const handleCommonSubjectChange = (index, field, value) => {
    const updatedSubjects = [...(commonHallTicketData.subjects || [])];
    if (updatedSubjects[index]) {
      updatedSubjects[index][field] = value;
      setCommonHallTicketData({ ...commonHallTicketData, subjects: updatedSubjects });
    }
  };

  const addSubject = () => {
    setHallTicketData({
      ...hallTicketData,
      subjects: [...(hallTicketData.subjects || []), { name: '', code: '', date: '', time: '', venue: '' }]
    });
  };

  const addCommonSubject = () => {
    setCommonHallTicketData({
      ...commonHallTicketData,
      subjects: [...(commonHallTicketData.subjects || []), { name: '', code: '', date: '', time: '', venue: '' }]
    });
  };

  const removeSubject = (index) => {
    const updatedSubjects = (hallTicketData.subjects || []).filter((_, i) => i !== index);
    setHallTicketData({ ...hallTicketData, subjects: updatedSubjects });
  };

  const removeCommonSubject = (index) => {
    const updatedSubjects = (commonHallTicketData.subjects || []).filter((_, i) => i !== index);
    setCommonHallTicketData({ ...commonHallTicketData, subjects: updatedSubjects });
  };

  const handleInstructionChange = (index, value) => {
    const updatedInstructions = [...(hallTicketData.instructions || [])];
    updatedInstructions[index] = value;
    setHallTicketData({ ...hallTicketData, instructions: updatedInstructions });
  };

  const handleCommonInstructionChange = (index, value) => {
    const updatedInstructions = [...(commonHallTicketData.instructions || [])];
    updatedInstructions[index] = value;
    setCommonHallTicketData({ ...commonHallTicketData, instructions: updatedInstructions });
  };

  const addInstruction = () => {
    setHallTicketData({
      ...hallTicketData,
      instructions: [...(hallTicketData.instructions || []), '']
    });
  };

  const addCommonInstruction = () => {
    setCommonHallTicketData({
      ...commonHallTicketData,
      instructions: [...(commonHallTicketData.instructions || []), '']
    });
  };

  const removeInstruction = (index) => {
    const updatedInstructions = (hallTicketData.instructions || []).filter((_, i) => i !== index);
    setHallTicketData({ ...hallTicketData, instructions: updatedInstructions });
  };

  const removeCommonInstruction = (index) => {
    const updatedInstructions = (commonHallTicketData.instructions || []).filter((_, i) => i !== index);
    setCommonHallTicketData({ ...commonHallTicketData, instructions: updatedInstructions });
  };

  const getHallTicketHTML = (data, photo) => {
    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const safeData = data || emptyHallTicketData;
    
    const hasSubjects = safeData.subjects && safeData.subjects.length > 0 && safeData.subjects.some(s => s && s.name);
    const hasInstructions = safeData.instructions && safeData.instructions.length > 0 && safeData.instructions.some(i => i && i.trim());

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hall Ticket - ${escapeHtml(safeData.studentName || 'Student')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Times New Roman', Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #e8e8e8;
          }
          
          .hall-ticket-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border: 3px solid #1a1a2e;
            padding: 0;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          }
          
          .hall-ticket-border {
            border: 2px solid #2c3e50;
            margin: 8px;
            padding: 25px 30px;
            position: relative;
          }
          
          .hall-ticket-border::before {
            content: "HALL TICKET";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: bold;
            color: rgba(0,0,0,0.04);
            letter-spacing: 10px;
            pointer-events: none;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px double #1a1a2e;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .school-name {
            font-size: 28px;
            font-weight: bold;
            color: #1a1a2e;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          
          .school-affiliation {
            font-size: 13px;
            color: #555;
            letter-spacing: 1px;
          }
          
          .school-contact {
            font-size: 12px;
            color: #666;
            margin-top: 2px;
          }
          
          .title-section {
            background: #1a1a2e;
            color: white;
            padding: 8px 0;
            margin: 15px -30px 20px -30px;
            text-align: center;
          }
          
          .title-section h1 {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin: 0;
          }
          
          .title-section .sub-title {
            font-size: 14px;
            letter-spacing: 2px;
            opacity: 0.9;
          }
          
          .student-info-section {
            display: flex;
            gap: 20px;
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border: 1px solid #ddd;
          }
          
          .photo-container {
            flex: 0 0 120px;
            height: 150px;
            border: 2px solid #1a1a2e;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          
          .photo-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .photo-container span {
            color: #999;
            font-size: 12px;
            text-align: center;
          }
          
          .info-grid {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px 20px;
          }
          
          .info-item {
            display: flex;
            padding: 4px 0;
            border-bottom: 1px dotted #ddd;
          }
          
          .info-label {
            font-weight: bold;
            color: #1a1a2e;
            min-width: 120px;
            font-size: 13px;
          }
          
          .info-value {
            flex: 1;
            color: #333;
            font-size: 13px;
            text-transform: uppercase;
          }
          
          .exam-details {
            margin: 20px 0;
            padding: 15px;
            background: #f0f4f8;
            border: 1px solid #c8d6e5;
          }
          
          .exam-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
          }
          
          .exam-detail-item {
            text-align: center;
          }
          
          .exam-detail-item .label {
            font-size: 12px;
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .exam-detail-item .value {
            font-size: 15px;
            color: #1a1a2e;
            font-weight: bold;
            margin-top: 2px;
          }
          
          .subjects-section {
            margin: 20px 0;
          }
          
          .subjects-section h3 {
            background: #1a1a2e;
            color: white;
            padding: 8px 15px;
            font-size: 16px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          
          .subjects-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          
          .subjects-table th {
            background: #2c3e50;
            color: white;
            padding: 10px 8px;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
          }
          
          .subjects-table td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
          }
          
          .subjects-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          
          .instructions-section {
            margin: 20px 0;
            padding: 15px;
            background: #fef9e7;
            border-left: 4px solid #f39c12;
          }
          
          .instructions-section h3 {
            font-size: 14px;
            color: #1a1a2e;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          
          .instructions-section ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .instructions-section ul li {
            padding: 4px 0 4px 25px;
            position: relative;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
          }
          
          .instructions-section ul li::before {
            content: "•";
            position: absolute;
            left: 8px;
            color: #f39c12;
            font-weight: bold;
            font-size: 16px;
          }
          
          .signature-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #1a1a2e;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
          }
          
          .signature-box {
            text-align: center;
          }
          
          .signature-box .line {
            width: 80%;
            margin: 0 auto;
            border-bottom: 1px solid #1a1a2e;
            height: 40px;
          }
          
          .signature-box .label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .signature-box .name {
            font-size: 13px;
            font-weight: bold;
            color: #1a1a2e;
            margin-top: 2px;
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11px;
            color: #888;
            letter-spacing: 1px;
          }
          
          .serial-number {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 11px;
            color: #999;
            font-weight: bold;
          }

          .no-data {
            color: #999;
            font-style: italic;
            text-align: center;
            padding: 10px;
          }
          
          @media print {
            body { background: white; padding: 10px; }
            .hall-ticket-container { box-shadow: none; }
            .hall-ticket-border { border: 1px solid #000; }
          }
          
          @media (max-width: 768px) {
            .student-info-section {
              flex-direction: column;
              align-items: center;
            }
            .info-grid {
              grid-template-columns: 1fr;
            }
            .exam-details-grid {
              grid-template-columns: 1fr 1fr;
            }
            .signature-section {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="hall-ticket-container">
          <div class="hall-ticket-border">
            <div class="serial-number">HT-${escapeHtml(safeData.admissionNumber || 'NA')}</div>
            
            <div class="header">
              <div class="school-name">${escapeHtml(safeData.schoolName || 'School Name Not Set')}</div>
              ${safeData.schoolAffiliation ? `<div class="school-affiliation">${escapeHtml(safeData.schoolAffiliation)}</div>` : ''}
              ${safeData.schoolAddress ? `<div class="school-contact">${escapeHtml(safeData.schoolAddress)}</div>` : ''}
              ${safeData.schoolPhone || safeData.schoolEmail ? `<div class="school-contact">${safeData.schoolPhone ? 'Phone: ' + escapeHtml(safeData.schoolPhone) : ''} ${safeData.schoolEmail ? ' | Email: ' + escapeHtml(safeData.schoolEmail) : ''}</div>` : ''}
            </div>

            <div class="title-section">
              <h1>${escapeHtml(safeData.examTitle || 'HALL TICKET')}</h1>
              ${safeData.examType ? `<div class="sub-title">${escapeHtml(safeData.examType)}</div>` : ''}
            </div>

            <div class="student-info-section">
              <div class="photo-container">
                ${photo ? `<img src="${photo}" alt="Student Photo" />` : '<span>PHOTO<br>NOT<br>AVAILABLE</span>'}
              </div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Name of Student</span>
                  <span class="info-value">${escapeHtml(safeData.studentName || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Father's Name</span>
                  <span class="info-value">${escapeHtml(safeData.fatherName || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Mother's Name</span>
                  <span class="info-value">${escapeHtml(safeData.motherName || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date of Birth</span>
                  <span class="info-value">${escapeHtml(safeData.dateOfBirth || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Class</span>
                  <span class="info-value">${escapeHtml(safeData.studentClass || 'N/A')} ${safeData.section ? '- ' + escapeHtml(safeData.section) : ''}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Roll Number</span>
                  <span class="info-value">${escapeHtml(safeData.rollNumber || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Admission No.</span>
                  <span class="info-value">${escapeHtml(safeData.admissionNumber || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Gender</span>
                  <span class="info-value">${escapeHtml(safeData.gender || 'N/A')}</span>
                </div>
              </div>
            </div>

            <div class="exam-details">
              <div class="exam-details-grid">
                <div class="exam-detail-item">
                  <div class="label">Examination</div>
                  <div class="value">${escapeHtml(safeData.examType || 'Not Set')}</div>
                </div>
                <div class="exam-detail-item">
                  <div class="label">Date</div>
                  <div class="value">${escapeHtml(safeData.examDate || 'Not Set')}</div>
                </div>
                <div class="exam-detail-item">
                  <div class="label">Time</div>
                  <div class="value">${escapeHtml(safeData.examTime || 'Not Set')}</div>
                </div>
                <div class="exam-detail-item">
                  <div class="label">Duration</div>
                  <div class="value">${escapeHtml(safeData.examDuration || 'Not Set')}</div>
                </div>
              </div>
            </div>

            <div class="subjects-section">
              <h3>Examination Schedule</h3>
              ${hasSubjects ? `
              <table class="subjects-table">
                <thead>
                  <tr>
                    <th style="width:15%">Code</th>
                    <th style="width:35%">Subject Name</th>
                    <th style="width:20%">Date</th>
                    <th style="width:15%">Time</th>
                    <th style="width:15%">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  ${safeData.subjects.filter(s => s && s.name).map((subject, index) => `
                    <tr>
                      <td>${escapeHtml(subject.code || '-')}</td>
                      <td style="text-align:left;padding-left:15px;">${escapeHtml(subject.name)}</td>
                      <td>${escapeHtml(subject.date || '-')}</td>
                      <td>${escapeHtml(subject.time || '-')}</td>
                      <td>${escapeHtml(subject.venue || '-')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : `
              <div class="no-data" style="padding: 20px;">No subjects added. Please add subjects in common settings.</div>
              `}
            </div>

            <div class="instructions-section">
              <h3>Important Instructions</h3>
              ${hasInstructions ? `
              <ul>
                ${safeData.instructions.filter(i => i && i.trim()).map(instruction => `<li>${escapeHtml(instruction)}</li>`).join('')}
              </ul>
              ` : `
              <div class="no-data">No instructions added. Please add instructions in common settings.</div>
              `}
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <div class="line"></div>
                <div class="label">${escapeHtml(safeData.studentSignature || "Student's Signature")}</div>
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div class="label">${escapeHtml(safeData.principalSignature || 'Principal')}</div>
                ${safeData.principalName ? `<div class="name">${escapeHtml(safeData.principalName)}</div>` : ''}
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div class="label">${escapeHtml(safeData.examController || 'Exam Controller')}</div>
                ${safeData.examControllerName ? `<div class="name">${escapeHtml(safeData.examControllerName)}</div>` : ''}
              </div>
            </div>

            <div class="footer">
              This Hall Ticket is issued for the above-mentioned examination. Please carry this ticket to the examination hall.
              <br>Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
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
      const className = getStudentInfo(student, 'className');
      const section = getStudentInfo(student, 'section');
      
      loadCommonSettings(className, section);
      
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        const savedData = result.hallTicket.hallTicketData || emptyHallTicketData;
        const mergedData = mergeWithCommonData(savedData);
        setHallTicketData(mergedData);
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
      const className = getStudentInfo(student, 'className');
      const section = getStudentInfo(student, 'section');
      
      loadCommonSettings(className, section);
      
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        const savedData = result.hallTicket.hallTicketData || emptyHallTicketData;
        const mergedData = mergeWithCommonData(savedData);
        setHallTicketData(mergedData);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
      } else {
        const admissionNo = getStudentInfo(student, 'admissionNumber');
        const studentSpecificData = {
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
        const mergedData = mergeWithCommonData(studentSpecificData);
        setHallTicketData(mergedData);
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
      const className = getStudentInfo(student, 'className');
      const section = getStudentInfo(student, 'section');
      
      loadCommonSettings(className, section);
      
      const result = await StudentApi.getHallTicket(student.studentId);
      let ticketData, ticketPhoto;
      
      if (result.success && result.hallTicket) {
        ticketData = result.hallTicket.hallTicketData;
        ticketPhoto = result.hallTicket.imageUrl;
      } else {
        const admissionNo = getStudentInfo(student, 'admissionNumber');
        const studentSpecificData = {
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
        ticketData = mergeWithCommonData(studentSpecificData);
        ticketPhoto = null;
      }
      
      const mergedData = mergeWithCommonData(ticketData);
      await downloadPDF(mergedData, ticketPhoto, student.basicInfo?.name);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassClick = (grade, section, studentsList) => {
    setSelectedClass({ grade, section });
    setCurrentGrade(grade);
    setCurrentSection(section);
    setSelectedSectionData({
      grade,
      section,
      students: studentsList || [],
      studentCount: studentsList?.length || 0,
      hasHallTicketCount: 0,
      noHallTicketCount: studentsList?.length || 0
    });
    setViewMode('students');
    setIsCommonDataLoaded(false);
    loadCommonSettings(grade, section);
  };

  const saveCommonData = async () => {
    try {
      const { grade, section } = selectedSectionData;
      const key = getStorageKey(grade, section);
      
      localStorage.setItem(key, JSON.stringify(commonHallTicketData));
      toast.success(`Common settings saved for Grade ${grade} - Section ${section}!`);
      setIsCommonEditModalOpen(false);
      
      if (selectedStudent) {
        const updatedData = mergeWithCommonData(hallTicketData);
        setHallTicketData(updatedData);
      }
    } catch (error) {
      console.error('Error saving common data:', error);
      toast.error('Failed to save common settings');
    }
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

    // Check if common data is loaded
    if (!isCommonDataLoaded) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader className="animate-spin" size={40} />
        </div>
      );
    }

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
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCommonEditModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Common Settings</span>
              </button>
              <button
                onClick={downloadAllHallTickets}
                disabled={isDownloadingAll || studentCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloadingAll ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    <span>Downloading... {Math.round(downloadProgress)}%</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud size={16} />
                    <span>Download All ({studentCount})</span>
                  </>
                )}
              </button>
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

      {/* Common Settings Modal */}
      {isCommonEditModalOpen && selectedSectionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                Common Settings - Grade {selectedSectionData.grade} Section {selectedSectionData.section}
              </h3>
              <button onClick={() => setIsCommonEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* School Information */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <School size={20} /> School Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                      <input type="text" value={commonHallTicketData.schoolName} onChange={(e) => handleCommonFieldChange('schoolName', e.target.value)} placeholder="Enter school name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Affiliation</label>
                      <input type="text" value={commonHallTicketData.schoolAffiliation} onChange={(e) => handleCommonFieldChange('schoolAffiliation', e.target.value)} placeholder="e.g., Affiliated to CBSE" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                      <input type="text" value={commonHallTicketData.schoolAddress} onChange={(e) => handleCommonFieldChange('schoolAddress', e.target.value)} placeholder="Enter school address" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="text" value={commonHallTicketData.schoolPhone} onChange={(e) => handleCommonFieldChange('schoolPhone', e.target.value)} placeholder="Enter phone number" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={commonHallTicketData.schoolEmail} onChange={(e) => handleCommonFieldChange('schoolEmail', e.target.value)} placeholder="Enter email" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
                      <input type="text" value={commonHallTicketData.examTitle} onChange={(e) => handleCommonFieldChange('examTitle', e.target.value)} placeholder="e.g., ANNUAL EXAMINATION 2025" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                </div>

                {/* Exam Information */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar size={20} /> Exam Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                      <input type="text" value={commonHallTicketData.examType} onChange={(e) => handleCommonFieldChange('examType', e.target.value)} placeholder="e.g., Annual Examination" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                      <input type="text" value={commonHallTicketData.examDate} onChange={(e) => handleCommonFieldChange('examDate', e.target.value)} placeholder="e.g., 15 March 2025" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Time</label>
                      <input type="text" value={commonHallTicketData.examTime} onChange={(e) => handleCommonFieldChange('examTime', e.target.value)} placeholder="e.g., 10:00 AM - 1:00 PM" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Duration</label>
                      <input type="text" value={commonHallTicketData.examDuration} onChange={(e) => handleCommonFieldChange('examDuration', e.target.value)} placeholder="e.g., 3 Hours" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen size={20} /> Subjects
                    </h4>
                    <button onClick={addCommonSubject} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm">
                      <Plus size={16} /> Add Subject
                    </button>
                  </div>
                  {(!commonHallTicketData.subjects || commonHallTicketData.subjects.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No subjects added. Click "Add Subject" to add exam subjects.</p>
                  )}
                  {commonHallTicketData.subjects && commonHallTicketData.subjects.map((subject, index) => (
                    <div key={index} className="border-b pb-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium">Subject {index + 1}</h5>
                        <button onClick={() => removeCommonSubject(index)} className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1">
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input type="text" placeholder="Subject Name *" value={subject.name || ''} onChange={(e) => handleCommonSubjectChange(index, 'name', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                        <input type="text" placeholder="Subject Code" value={subject.code || ''} onChange={(e) => handleCommonSubjectChange(index, 'code', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                        <input type="text" placeholder="Date" value={subject.date || ''} onChange={(e) => handleCommonSubjectChange(index, 'date', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                        <input type="text" placeholder="Time" value={subject.time || ''} onChange={(e) => handleCommonSubjectChange(index, 'time', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                        <input type="text" placeholder="Venue" value={subject.venue || ''} onChange={(e) => handleCommonSubjectChange(index, 'venue', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <FileText size={20} /> Instructions
                    </h4>
                    <button onClick={addCommonInstruction} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm">
                      <Plus size={16} /> Add Instruction
                    </button>
                  </div>
                  {(!commonHallTicketData.instructions || commonHallTicketData.instructions.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No instructions added. Click "Add Instruction" to add exam instructions.</p>
                  )}
                  {commonHallTicketData.instructions && commonHallTicketData.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input type="text" value={instruction || ''} onChange={(e) => handleCommonInstructionChange(index, e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2" placeholder={`Instruction ${index + 1}`} />
                      <button onClick={() => removeCommonInstruction(index)} className="text-red-600 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Signatures */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-4">Signatures</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student Signature Label</label>
                      <input type="text" value={commonHallTicketData.studentSignature} onChange={(e) => handleCommonFieldChange('studentSignature', e.target.value)} placeholder="e.g., Student's Signature" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Principal Signature Label</label>
                      <input type="text" value={commonHallTicketData.principalSignature} onChange={(e) => handleCommonFieldChange('principalSignature', e.target.value)} placeholder="e.g., Principal" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                      <input type="text" value={commonHallTicketData.principalName} onChange={(e) => handleCommonFieldChange('principalName', e.target.value)} placeholder="Enter principal's name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Label</label>
                      <input type="text" value={commonHallTicketData.examController} onChange={(e) => handleCommonFieldChange('examController', e.target.value)} placeholder="e.g., Exam Controller" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Name</label>
                      <input type="text" value={commonHallTicketData.examControllerName} onChange={(e) => handleCommonFieldChange('examControllerName', e.target.value)} placeholder="Enter exam controller's name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button onClick={() => setIsCommonEditModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
                <button onClick={saveCommonData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Save size={18} />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
              {(() => {
                const mergedData = mergeWithCommonData(hallTicketData);
                return <div dangerouslySetInnerHTML={{ __html: getHallTicketHTML(mergedData, photoPreview) }} />;
              })()}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button onClick={handleEditHallTicket} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Edit Hall Ticket
                </button>
                <button 
                  onClick={() => {
                    const mergedData = mergeWithCommonData(hallTicketData);
                    downloadPDF(mergedData, photoPreview, selectedStudent?.basicInfo?.name);
                  }} 
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
                      <School size={20} /> School Information
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                        <input type="text" value={hallTicketData.schoolAddress} onChange={(e) => handleFieldChange('schoolAddress', e.target.value)} placeholder="Enter school address" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="text" value={hallTicketData.schoolPhone} onChange={(e) => handleFieldChange('schoolPhone', e.target.value)} placeholder="Enter phone number" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={hallTicketData.schoolEmail} onChange={(e) => handleFieldChange('schoolEmail', e.target.value)} placeholder="Enter email" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Time</label>
                        <input type="text" value={hallTicketData.examTime} onChange={(e) => handleFieldChange('examTime', e.target.value)} placeholder="e.g., 10:00 AM - 1:00 PM" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Duration</label>
                        <input type="text" value={hallTicketData.examDuration} onChange={(e) => handleFieldChange('examDuration', e.target.value)} placeholder="e.g., 3 Hours" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                        <input type="text" value={hallTicketData.principalName} onChange={(e) => handleFieldChange('principalName', e.target.value)} placeholder="Enter principal's name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Label</label>
                        <input type="text" value={hallTicketData.examController} onChange={(e) => handleFieldChange('examController', e.target.value)} placeholder="e.g., Exam Controller" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Name</label>
                        <input type="text" value={hallTicketData.examControllerName} onChange={(e) => handleFieldChange('examControllerName', e.target.value)} placeholder="Enter exam controller's name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
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