// src/Components/HallTicket.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, Edit, Download, Search, X, Save, Printer, Calendar, BookOpen, FileText, User, Loader, Plus, Trash2, ChevronRight, Users, FileDown, School, ArrowLeft, DownloadCloud, Building } from 'lucide-react';
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
  const [isCommonDataLoaded, setIsCommonDataLoaded] = useState(false);
  
  // Store current class/section key for tracking
  const [currentContext, setCurrentContext] = useState({ grade: '', section: '' });
  
  // School info - common for all classes
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: '',
  });
  
  // Common hall ticket data per class/section
  const [commonHallTicketData, setCommonHallTicketData] = useState({
    examTitle: '',
    examType: '',
    subjects: [],
    instructions: [],
    teacherSignature: "Teacher's Signature",
    principalSignature: 'Principal',
    principalName: '',
    examController: 'Exam Controller',
    examControllerName: '',
  });
  
  const [isCommonEditModalOpen, setIsCommonEditModalOpen] = useState(false);
  const [isSchoolInfoEditModalOpen, setIsSchoolInfoEditModalOpen] = useState(false);

  // Ref to track if common settings are being updated
  const isCommonUpdateRef = useRef(false);

  const emptyHallTicketData = {
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: '',
    examTitle: '',
    studentName: '',
    fatherName: '',
    motherName: '',
    studentClass: '',
    section: '',
    rollNumber: '',
    gender: '',
    examType: '',
    examDate: '',
    examTime: '',
    examDuration: '',
    subjects: [],
    instructions: [],
    teacherSignature: "Teacher's Signature",
    principalSignature: 'Principal',
    principalName: '',
    examController: 'Exam Controller',
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

  // Load school info from database
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

  // Load school info from database
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

  // Save school info to database
  const saveSchoolInfo = async () => {
    try {
      setIsSaving(true);
      const result = await StudentApi.saveSchoolInfo(schoolInfo);
      if (result.success) {
        toast.success('School information saved successfully!');
        setIsSchoolInfoEditModalOpen(false);
        setSchoolInfo(result.data);
        // Update current hall ticket data if in edit mode
        if (isEditModalOpen && selectedStudent) {
          refreshCurrentHallTicketData();
        }
        if (isViewModalOpen && selectedStudent) {
          const mergedData = mergeWithCommonData(hallTicketData);
          setHallTicketData(mergedData);
        }
      } else {
        throw new Error(result.error || 'Failed to save school info');
      }
    } catch (error) {
      console.error('Error saving school info:', error);
      toast.error(error.message || 'Failed to save school information');
    } finally {
      setIsSaving(false);
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
      case 'className': return basicInfo.grade || '';
      case 'section': return basicInfo.section || '';
      case 'fatherName': return basicInfo.fatherName || '';
      case 'motherName': return basicInfo.motherName || '';
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

  // Enhanced merge function that properly combines common and student data
  const mergeWithCommonData = useCallback((studentData, commonData = commonHallTicketData, schoolData = schoolInfo) => {
    const merged = {
      ...emptyHallTicketData,
      schoolName: schoolData.schoolName || '',
      schoolAddress: schoolData.schoolAddress || '',
      schoolAffiliation: schoolData.schoolAffiliation || '',
      ...studentData,
    };
    
    // Always use common data for exam title and type
    merged.examTitle = commonData.examTitle || studentData.examTitle || '';
    merged.examType = commonData.examType || studentData.examType || '';
    
    // Always use common data for subjects if available
    if (commonData.subjects && commonData.subjects.length > 0 && commonData.subjects.some(s => s && s.name)) {
      merged.subjects = commonData.subjects;
    } else if (studentData.subjects && studentData.subjects.length > 0) {
      merged.subjects = studentData.subjects;
    } else {
      merged.subjects = [];
    }
    
    // Always use common data for instructions if available
    if (commonData.instructions && commonData.instructions.length > 0 && commonData.instructions.some(i => i && i.trim())) {
      merged.instructions = commonData.instructions;
    } else if (studentData.instructions && studentData.instructions.length > 0) {
      merged.instructions = studentData.instructions;
    } else {
      merged.instructions = [];
    }
    
    // Use common data for signature fields, but allow student override for teacher signature
    merged.teacherSignature = studentData.teacherSignature || commonData.teacherSignature || "Teacher's Signature";
    merged.principalSignature = commonData.principalSignature || 'Principal';
    merged.principalName = commonData.principalName || '';
    merged.examController = commonData.examController || 'Exam Controller';
    merged.examControllerName = commonData.examControllerName || '';
    
    // Student-specific fields (always from student data)
    merged.studentName = studentData.studentName || '';
    merged.fatherName = studentData.fatherName || '';
    merged.motherName = studentData.motherName || '';
    merged.studentClass = studentData.studentClass || '';
    merged.section = studentData.section || '';
    merged.rollNumber = studentData.rollNumber || '';
    merged.gender = studentData.gender || '';
    merged.examDate = studentData.examDate || '';
    merged.examTime = studentData.examTime || '';
    merged.examDuration = studentData.examDuration || '';
    
    return merged;
  }, [commonHallTicketData, schoolInfo]);

  // Load common settings for a specific grade and section
  const loadCommonSettings = useCallback(async (grade, section, forceReload = false) => {
    if (!grade || !section) return null;
    
    try {
      const key = getStorageKey(grade, section);
      const result = await StudentApi.getHallTicketSettings(key);
      
      let commonData;
      if (result.success && result.data) {
        commonData = result.data;
        setCommonHallTicketData(commonData);
      } else {
        commonData = {
          examTitle: '',
          examType: '',
          subjects: [],
          instructions: [],
          teacherSignature: "Teacher's Signature",
          principalSignature: 'Principal',
          principalName: '',
          examController: 'Exam Controller',
          examControllerName: '',
        };
        setCommonHallTicketData(commonData);
      }
      
      setIsCommonDataLoaded(true);
      setCurrentContext({ grade, section });
      
      // If edit modal is open, refresh the hall ticket data
      if (isEditModalOpen && selectedStudent) {
        refreshCurrentHallTicketData(commonData);
      }
      
      return commonData;
    } catch (error) {
      console.error('Error loading common data:', error);
      setIsCommonDataLoaded(true);
      return null;
    }
  }, [getStorageKey, isEditModalOpen, selectedStudent]);

  // Function to refresh current hall ticket data with latest common settings
  const refreshCurrentHallTicketData = useCallback(async (commonDataOverride = null) => {
    if (!selectedStudent) return;
    
    try {
      const commonData = commonDataOverride || commonHallTicketData;
      
      // Get the saved hall ticket data if exists
      const result = await StudentApi.getHallTicket(selectedStudent.studentId);
      let studentSpecificData = {};
      
      if (result.success && result.hallTicket) {
        // Merge existing student data with common data
        const existingData = result.hallTicket.hallTicketData || {};
        studentSpecificData = {
          studentName: existingData.studentName || getStudentInfo(selectedStudent, 'fullName'),
          fatherName: existingData.fatherName || getStudentInfo(selectedStudent, 'fatherName'),
          motherName: existingData.motherName || getStudentInfo(selectedStudent, 'motherName'),
          studentClass: existingData.studentClass || getStudentInfo(selectedStudent, 'className'),
          section: existingData.section || getStudentInfo(selectedStudent, 'section'),
          rollNumber: existingData.rollNumber || `ROLL${selectedStudent.studentId?.slice(-6)}`,
          gender: existingData.gender || getStudentInfo(selectedStudent, 'gender'),
          examTitle: existingData.examTitle || '',
          examType: existingData.examType || '',
          examDate: existingData.examDate || '',
          examTime: existingData.examTime || '',
          examDuration: existingData.examDuration || '',
          teacherSignature: existingData.teacherSignature || '',
          principalSignature: existingData.principalSignature || '',
          principalName: existingData.principalName || '',
          examController: existingData.examController || '',
          examControllerName: existingData.examControllerName || '',
          subjects: existingData.subjects || [],
          instructions: existingData.instructions || [],
        };
        
        // Update saved hall ticket reference
        setSavedHallTicket(result.hallTicket);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
      } else {
        // No existing hall ticket, create from student info
        const className = getStudentInfo(selectedStudent, 'className');
        const section = getStudentInfo(selectedStudent, 'section');
        studentSpecificData = {
          studentName: getStudentInfo(selectedStudent, 'fullName'),
          fatherName: getStudentInfo(selectedStudent, 'fatherName'),
          motherName: getStudentInfo(selectedStudent, 'motherName'),
          studentClass: className,
          section: section,
          rollNumber: `ROLL${selectedStudent.studentId?.slice(-6)}`,
          gender: getStudentInfo(selectedStudent, 'gender'),
          subjects: [],
          instructions: [],
        };
      }
      
      // Merge with latest common data
      const mergedData = mergeWithCommonData(studentSpecificData, commonData);
      setHallTicketData(mergedData);
      
    } catch (error) {
      console.error('Error refreshing hall ticket data:', error);
    }
  }, [selectedStudent, commonHallTicketData, mergeWithCommonData]);

  const generateHallTicket = async (student) => {
    if (!student) return;
    
    const className = getStudentInfo(student, 'className');
    const section = getStudentInfo(student, 'section');

    // Load common settings first
    const commonData = await loadCommonSettings(className, section);
    
    const studentSpecificData = {
      studentName: getStudentInfo(student, 'fullName'),
      fatherName: getStudentInfo(student, 'fatherName'),
      motherName: getStudentInfo(student, 'motherName'),
      studentClass: className,
      section: section,
      rollNumber: `ROLL${student.studentId?.slice(-6)}`,
      gender: getStudentInfo(student, 'gender'),
    };

    const mergedData = mergeWithCommonData(studentSpecificData, commonData);
    setHallTicketData(mergedData);

    setSelectedStudent(student);
    setPhotoPreview(null);
    setPhotoFile(null);
    setSavedHallTicket(null);

    try {
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        const savedData = result.hallTicket.hallTicketData || {};
        const mergedSavedData = mergeWithCommonData(savedData, commonData);
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
    // Refresh data before opening edit modal
    if (selectedStudent) {
      const className = getStudentInfo(selectedStudent, 'className');
      const section = getStudentInfo(selectedStudent, 'section');
      loadCommonSettings(className, section).then(() => {
        setIsEditModalOpen(true);
      });
    } else {
      setIsEditModalOpen(true);
    }
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
      // Ensure we have the latest common data
      const className = getStudentInfo(selectedStudent, 'className');
      const section = getStudentInfo(selectedStudent, 'section');
      const commonData = await loadCommonSettings(className, section);
      
      // Merge student-specific data with common data
      const mergedData = mergeWithCommonData(hallTicketData, commonData);
      
      const saveData = {
        ...mergedData,
        schoolName: schoolInfo.schoolName,
        schoolAddress: schoolInfo.schoolAddress,
        schoolAffiliation: schoolInfo.schoolAffiliation,
        subjects: Array.isArray(mergedData.subjects) ? mergedData.subjects : [],
        instructions: Array.isArray(mergedData.instructions) ? mergedData.instructions : [],
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
        // Update the hall ticket data with saved data
        setHallTicketData(saveData);
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
      // Ensure we have the latest common data for the download
      const className = data.studentClass || '';
      const section = data.section || '';
      const commonData = await loadCommonSettings(className, section);
      const mergedData = mergeWithCommonData(data, commonData);
      
      const element = document.createElement('div');
      element.innerHTML = getHallTicketHTML(mergedData, photo);
      element.style.padding = '10px';
      element.style.background = '#ffffff';
      element.style.display = 'flex';
      element.style.justifyContent = 'center';
      element.style.alignItems = 'center';
      element.style.minHeight = '100vh';
      
      document.body.appendChild(element);
      
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `HallTicket_${studentName || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          width: 794,
          height: 1123
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
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

      // Get common settings once for the class
      const grade = selectedSectionData.grade;
      const section = selectedSectionData.section;
      const commonData = await loadCommonSettings(grade, section);

      for (let i = 0; i < studentsList.length; i++) {
        const student = studentsList[i];
        try {
          const result = await StudentApi.getHallTicket(student.studentId);
          let ticketData, ticketPhoto;
          
          if (result.success && result.hallTicket) {
            ticketData = result.hallTicket.hallTicketData;
            ticketPhoto = result.hallTicket.imageUrl;
          } else {
            const studentSpecificData = {
              studentName: getStudentInfo(student, 'fullName'),
              fatherName: getStudentInfo(student, 'fatherName'),
              motherName: getStudentInfo(student, 'motherName'),
              studentClass: grade,
              section: section,
              rollNumber: `ROLL${student.studentId?.slice(-6)}`,
              gender: getStudentInfo(student, 'gender'),
            };
            
            ticketData = mergeWithCommonData(studentSpecificData, commonData);
            ticketPhoto = null;
          }

          const mergedData = mergeWithCommonData(ticketData, commonData);
          
          const element = document.createElement('div');
          element.innerHTML = getHallTicketHTML(mergedData, ticketPhoto);
          element.style.padding = '10px';
          element.style.background = '#ffffff';
          element.style.display = 'flex';
          element.style.justifyContent = 'center';
          element.style.alignItems = 'center';
          element.style.minHeight = '100vh';
          
          document.body.appendChild(element);
          
          const opt = {
            margin: [0, 0, 0, 0],
            filename: `HallTicket_${student.basicInfo?.name || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              width: 794,
              height: 1123
            },
            jsPDF: { 
              unit: 'mm', 
              format: 'a4', 
              orientation: 'portrait',
              compress: true
            }
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

  const handleSchoolInfoChange = (field, value) => {
    setSchoolInfo({ ...schoolInfo, [field]: value });
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
      subjects: [...(hallTicketData.subjects || []), { name: '', code: '', date: '', time: '', invigilatorSignature: '' }]
    });
  };

  const addCommonSubject = () => {
    setCommonHallTicketData({
      ...commonHallTicketData,
      subjects: [...(commonHallTicketData.subjects || []), { name: '', code: '', date: '', time: '', invigilatorSignature: '' }]
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

  // Save common data and refresh all views
  const saveCommonData = async () => {
    if (!selectedSectionData) {
      toast.error('No class/section selected');
      return;
    }
    
    try {
      setIsSaving(true);
      const { grade, section } = selectedSectionData;
      const key = getStorageKey(grade, section);
      
      // Save common settings
      const result = await StudentApi.saveHallTicketSettings(key, commonHallTicketData);
      
      if (result.success) {
        toast.success(`Common settings saved for Grade ${grade} - Section ${section}!`);
        setIsCommonEditModalOpen(false);
        
        // IMPORTANT: Reload common settings to ensure consistency
        await loadCommonSettings(grade, section, true);
        
        // If edit modal is open, refresh the current hall ticket data
        if (isEditModalOpen && selectedStudent) {
          await refreshCurrentHallTicketData(commonHallTicketData);
        }
        
        // If view modal is open, refresh the view
        if (isViewModalOpen && selectedStudent) {
          const viewData = mergeWithCommonData(hallTicketData, commonHallTicketData);
          setHallTicketData(viewData);
        }
        
        // Update the hall ticket data in state with merged data
        const updatedHallTicketData = mergeWithCommonData(hallTicketData, commonHallTicketData);
        setHallTicketData(updatedHallTicketData);
        
      } else {
        throw new Error(result.error || 'Failed to save common settings');
      }
    } catch (error) {
      console.error('Error saving common data:', error);
      toast.error(error.message || 'Failed to save common settings');
    } finally {
      setIsSaving(false);
    }
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
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          body { 
            font-family: 'Times New Roman', Times, serif; 
            margin: 0; 
            padding: 0; 
            background: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .hall-ticket-container {
            width: 210mm;
            min-height: 297mm;
            max-height: 297mm;
            background: white;
            border: 2px solid #1a1a2e;
            padding: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            page-break-after: avoid;
            overflow: hidden;
          }
          
          .hall-ticket-border {
            border: 2px solid #2c3e50;
            margin: 6mm;
            padding: 5mm 7mm;
            position: relative;
            min-height: 277mm;
            display: flex;
            flex-direction: column;
          }
          
          .hall-ticket-border::before {
            content: "HALL TICKET";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 60px;
            font-weight: bold;
            color: rgba(0,0,0,0.03);
            letter-spacing: 8px;
            pointer-events: none;
            white-space: nowrap;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px double #1a1a2e;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          
          .school-name {
            font-size: 22px;
            font-weight: bold;
            color: #1a1a2e;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          .school-affiliation {
            font-size: 11px;
            color: #555;
            letter-spacing: 1px;
          }
          
          .school-contact {
            font-size: 10px;
            color: #666;
            margin-top: 1px;
          }
          
          .title-section {
            background: #1a1a2e;
            color: white;
            padding: 4px 0;
            margin: 8px -7mm 10px -7mm;
            text-align: center;
          }
          
          .title-section h1 {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin: 0;
          }
          
          .title-section .sub-title {
            font-size: 12px;
            letter-spacing: 2px;
            opacity: 0.9;
          }
          
          .student-info-section {
            display: flex;
            gap: 12px;
            margin: 10px 0;
            padding: 10px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            flex: 0 0 auto;
          }
          
          .photo-container {
            flex: 0 0 90px;
            height: 110px;
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
            font-size: 10px;
            text-align: center;
          }
          
          .info-grid {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px 15px;
          }
          
          .info-item {
            display: flex;
            padding: 2px 0;
            border-bottom: 1px dotted #ddd;
            align-items: center;
          }
          
          .info-label {
            font-weight: bold;
            color: #1a1a2e;
            min-width: 100px;
            font-size: 11px;
          }
          
          .info-value {
            flex: 1;
            color: #333;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 500;
          }
          
          .exam-details {
            margin: 8px 0;
            padding: 10px;
            background: #f0f4f8;
            border: 1px solid #c8d6e5;
            flex: 0 0 auto;
          }
          
          .exam-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
          }
          
          .exam-detail-item {
            text-align: center;
          }
          
          .exam-detail-item .label {
            font-size: 10px;
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .exam-detail-item .value {
            font-size: 13px;
            color: #1a1a2e;
            font-weight: bold;
            margin-top: 1px;
          }
          
          .subjects-section {
            margin: 8px 0;
            flex: 1;
            min-height: 80px;
          }
          
          .subjects-section h3 {
            background: #1a1a2e;
            color: white;
            padding: 5px 12px;
            font-size: 13px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          
          .subjects-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          
          .subjects-table th {
            background: #2c3e50;
            color: white;
            padding: 6px 6px;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          
          .subjects-table td {
            padding: 5px 6px;
            text-align: center;
            border: 1px solid #ddd;
            font-size: 11px;
          }
          
          .subjects-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          
          .instructions-section {
            margin: 8px 0;
            padding: 10px;
            background: #fef9e7;
            border-left: 4px solid #f39c12;
            flex: 0 0 auto;
          }
          
          .instructions-section h3 {
            font-size: 12px;
            color: #1a1a2e;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          
          .instructions-section ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .instructions-section ul li {
            padding: 2px 0 2px 20px;
            position: relative;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
          }
          
          .instructions-section ul li::before {
            content: "•";
            position: absolute;
            left: 6px;
            color: #f39c12;
            font-weight: bold;
            font-size: 14px;
          }
          
          .signature-section {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #1a1a2e;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            flex: 0 0 auto;
          }
          
          .signature-box {
            text-align: center;
          }
          
          .signature-box .line {
            width: 80%;
            margin: 0 auto;
            border-bottom: 1px solid #1a1a2e;
            height: 35px;
          }
          
          .signature-box .label {
            font-size: 10px;
            color: #666;
            margin-top: 3px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .signature-box .name {
            font-size: 11px;
            font-weight: bold;
            color: #1a1a2e;
            margin-top: 1px;
          }
          
          .footer {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9px;
            color: #888;
            letter-spacing: 0.5px;
            flex: 0 0 auto;
          }
          
          .serial-number {
            position: absolute;
            top: 4mm;
            right: 6mm;
            font-size: 9px;
            color: #999;
            font-weight: bold;
          }

          .no-data {
            color: #999;
            font-style: italic;
            text-align: center;
            padding: 10px;
            font-size: 11px;
          }
          
          @media print {
            body { 
              background: white; 
              padding: 0;
              margin: 0;
            }
            .hall-ticket-container { 
              box-shadow: none;
              border: 2px solid #000;
              width: 100%;
              min-height: 100vh;
              max-height: none;
            }
            .hall-ticket-border {
              border: 2px solid #000;
            }
          }
          
          @media screen and (max-width: 768px) {
            .hall-ticket-container {
              width: 100%;
              min-height: auto;
              max-height: none;
            }
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
            <div class="serial-number">HT-${escapeHtml(safeData.rollNumber || 'NA')}</div>
            
            <div class="header">
              <div class="school-name">${escapeHtml(safeData.schoolName || 'School Name Not Set')}</div>
              ${safeData.schoolAffiliation ? `<div class="school-affiliation">${escapeHtml(safeData.schoolAffiliation)}</div>` : ''}
              ${safeData.schoolAddress ? `<div class="school-contact">${escapeHtml(safeData.schoolAddress)}</div>` : ''}
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
                  <span class="info-label">Class</span>
                  <span class="info-value">${escapeHtml(safeData.studentClass || 'N/A')} ${safeData.section ? '- ' + escapeHtml(safeData.section) : ''}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Roll Number</span>
                  <span class="info-value">${escapeHtml(safeData.rollNumber || 'N/A')}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Gender</span>
                  <span class="info-value">${escapeHtml(safeData.gender || 'N/A')}</span>
                </div>
                
              </div>
            </div>

            <div class="subjects-section">
              <h3>Examination Schedule</h3>
              ${hasSubjects ? `
              <table class="subjects-table">
                <thead>
                  <tr>
                    <th style="width:10%">Code</th>
                    <th style="width:35%">Subject Name</th>
                    <th style="width:15%">Date</th>
                    <th style="width:15%">Time</th>
                    <th style="width:25%">Invigilator Signature</th>
                  </tr>
                </thead>
                <tbody>
                  ${safeData.subjects.filter(s => s && s.name).map((subject, index) => `
                    <tr>
                      <td>${escapeHtml(subject.code || '-')}</td>
                      <td style="text-align:left;padding-left:12px;">${escapeHtml(subject.name)}</td>
                      <td>${escapeHtml(subject.date || '-')}</td>
                      <td>${escapeHtml(subject.time || '-')}</td>
                      <td style="text-align:center;">${escapeHtml(subject.invigilatorSignature || '')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : `
              <div class="no-data" style="padding: 15px;">No subjects added. Please add subjects in common settings.</div>
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
                <div class="label">${escapeHtml(safeData.teacherSignature || "Teacher's Signature")}</div>
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
      
      const commonData = await loadCommonSettings(className, section);
      
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        const savedData = result.hallTicket.hallTicketData || {};
        const mergedData = mergeWithCommonData(savedData, commonData);
        setHallTicketData(mergedData);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
        setIsViewModalOpen(true);
      } else {
        await generateHallTicket(student);
      }
    } catch (error) {
      console.error('Error viewing hall ticket:', error);
      await generateHallTicket(student);
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
      
      const commonData = await loadCommonSettings(className, section);
      
      const result = await StudentApi.getHallTicket(student.studentId);
      if (result.success && result.hallTicket) {
        setSavedHallTicket(result.hallTicket);
        const savedData = result.hallTicket.hallTicketData || {};
        const mergedData = mergeWithCommonData(savedData, commonData);
        setHallTicketData(mergedData);
        if (result.hallTicket.imageUrl) {
          setPhotoPreview(result.hallTicket.imageUrl);
        }
      } else {
        const studentSpecificData = {
          studentName: getStudentInfo(student, 'fullName'),
          fatherName: getStudentInfo(student, 'fatherName'),
          motherName: getStudentInfo(student, 'motherName'),
          studentClass: className,
          section: section,
          rollNumber: `ROLL${student.studentId?.slice(-6)}`,
          gender: getStudentInfo(student, 'gender'),
        };
        const mergedData = mergeWithCommonData(studentSpecificData, commonData);
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
      
      const commonData = await loadCommonSettings(className, section);
      
      const result = await StudentApi.getHallTicket(student.studentId);
      let ticketData, ticketPhoto;
      
      if (result.success && result.hallTicket) {
        ticketData = result.hallTicket.hallTicketData;
        ticketPhoto = result.hallTicket.imageUrl;
      } else {
        const studentSpecificData = {
          studentName: getStudentInfo(student, 'fullName'),
          fatherName: getStudentInfo(student, 'fatherName'),
          motherName: getStudentInfo(student, 'motherName'),
          studentClass: className,
          section: section,
          rollNumber: `ROLL${student.studentId?.slice(-6)}`,
          gender: getStudentInfo(student, 'gender'),
        };
        ticketData = mergeWithCommonData(studentSpecificData, commonData);
        ticketPhoto = null;
      }
      
      const mergedData = mergeWithCommonData(ticketData, commonData);
      await downloadPDF(mergedData, ticketPhoto, student.basicInfo?.name);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassClick = async (grade, section, studentsList) => {
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
    await loadCommonSettings(grade, section);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSectionData(null);
    setViewMode('class');
    setSearchTerm('');
    // Reset common data when going back
    setCommonHallTicketData({
      examTitle: '',
      examType: '',
      subjects: [],
      instructions: [],
      teacherSignature: "Teacher's Signature",
      principalSignature: 'Principal',
      principalName: '',
      examController: 'Exam Controller',
      examControllerName: '',
    });
    setIsCommonDataLoaded(false);
  };

  const getFilteredStudents = () => {
    if (!searchTerm) return selectedSectionData?.students || [];
    
    return (selectedSectionData?.students || []).filter(student => {
      const basicInfo = student?.basicInfo || {};
      return (
        basicInfo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                onClick={() => setIsSchoolInfoEditModalOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Building size={16} />
                <span>School Info</span>
              </button>
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
                            <span>Class: {basicInfo.grade || '—'}</span>
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

      {/* School Info Modal */}
      {isSchoolInfoEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Building size={24} /> School Information
              </h3>
              <button onClick={() => setIsSchoolInfoEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                  <input 
                    type="text" 
                    value={schoolInfo.schoolName} 
                    onChange={(e) => handleSchoolInfoChange('schoolName', e.target.value)} 
                    placeholder="Enter school name" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                  <input 
                    type="text" 
                    value={schoolInfo.schoolAddress} 
                    onChange={(e) => handleSchoolInfoChange('schoolAddress', e.target.value)} 
                    placeholder="Enter school address" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Affiliation</label>
                  <input 
                    type="text" 
                    value={schoolInfo.schoolAffiliation} 
                    onChange={(e) => handleSchoolInfoChange('schoolAffiliation', e.target.value)} 
                    placeholder="e.g., Affiliated to CBSE" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button 
                  onClick={() => setIsSchoolInfoEditModalOpen(false)} 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveSchoolInfo} 
                  disabled={isSaving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSaving ? (
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
                {/* Exam Information - Only Title and Type */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar size={20} /> Exam Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.examTitle} 
                        onChange={(e) => handleCommonFieldChange('examTitle', e.target.value)} 
                        placeholder="e.g., ANNUAL EXAMINATION 2025" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.examType} 
                        onChange={(e) => handleCommonFieldChange('examType', e.target.value)} 
                        placeholder="e.g., Annual Examination" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                </div>

                {/* Subjects - Common */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen size={20} /> Subjects
                    </h4>
                    <button 
                      onClick={addCommonSubject} 
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                    >
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
                        <button 
                          onClick={() => removeCommonSubject(index)} 
                          className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input 
                          type="text" 
                          placeholder="Subject Name *" 
                          value={subject.name || ''} 
                          onChange={(e) => handleCommonSubjectChange(index, 'name', e.target.value)} 
                          className="border border-gray-300 rounded-lg px-3 py-2" 
                        />
                        <input 
                          type="text" 
                          placeholder="Subject Code" 
                          value={subject.code || ''} 
                          onChange={(e) => handleCommonSubjectChange(index, 'code', e.target.value)} 
                          className="border border-gray-300 rounded-lg px-3 py-2" 
                        />
                        <input 
                          type="text" 
                          placeholder="Date" 
                          value={subject.date || ''} 
                          onChange={(e) => handleCommonSubjectChange(index, 'date', e.target.value)} 
                          className="border border-gray-300 rounded-lg px-3 py-2" 
                        />
                        <input 
                          type="text" 
                          placeholder="Time" 
                          value={subject.time || ''} 
                          onChange={(e) => handleCommonSubjectChange(index, 'time', e.target.value)} 
                          className="border border-gray-300 rounded-lg px-3 py-2" 
                        />
                        <input 
                          type="text" 
                          placeholder="Invigilator Signature" 
                          value={subject.invigilatorSignature || ''} 
                          onChange={(e) => handleCommonSubjectChange(index, 'invigilatorSignature', e.target.value)} 
                          className="border border-gray-300 rounded-lg px-3 py-2" 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instructions - Common */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <FileText size={20} /> Instructions
                    </h4>
                    <button 
                      onClick={addCommonInstruction} 
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                    >
                      <Plus size={16} /> Add Instruction
                    </button>
                  </div>
                  {(!commonHallTicketData.instructions || commonHallTicketData.instructions.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No instructions added. Click "Add Instruction" to add exam instructions.</p>
                  )}
                  {commonHallTicketData.instructions && commonHallTicketData.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        value={instruction || ''} 
                        onChange={(e) => handleCommonInstructionChange(index, e.target.value)} 
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2" 
                        placeholder={`Instruction ${index + 1}`} 
                      />
                      <button 
                        onClick={() => removeCommonInstruction(index)} 
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Signatures - Common */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-4">Signatures</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Signature Label</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.teacherSignature} 
                        onChange={(e) => handleCommonFieldChange('teacherSignature', e.target.value)} 
                        placeholder="e.g., Teacher's Signature" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Principal Signature Label</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.principalSignature} 
                        onChange={(e) => handleCommonFieldChange('principalSignature', e.target.value)} 
                        placeholder="e.g., Principal" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.principalName} 
                        onChange={(e) => handleCommonFieldChange('principalName', e.target.value)} 
                        placeholder="Enter principal's name" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Label</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.examController} 
                        onChange={(e) => handleCommonFieldChange('examController', e.target.value)} 
                        placeholder="e.g., Exam Controller" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Name</label>
                      <input 
                        type="text" 
                        value={commonHallTicketData.examControllerName} 
                        onChange={(e) => handleCommonFieldChange('examControllerName', e.target.value)} 
                        placeholder="Enter exam controller's name" 
                        className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button 
                  onClick={() => setIsCommonEditModalOpen(false)} 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveCommonData} 
                  disabled={isSaving} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Save Settings</span>
                    </>
                  )}
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
                <button 
                  onClick={handleEditHallTicket} 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
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
                <button 
                  onClick={downloadHallTicket} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
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
                  {/* School Information - Read Only */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Building size={20} /> School Information (Global)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                        <input 
                          type="text" 
                          value={schoolInfo.schoolName} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Affiliation</label>
                        <input 
                          type="text" 
                          value={schoolInfo.schoolAffiliation} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Address</label>
                        <input 
                          type="text" 
                          value={schoolInfo.schoolAddress} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setIsSchoolInfoEditModalOpen(true);
                      }}
                      className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Edit size={14} /> Edit School Info
                    </button>
                  </div>

                  {/* Student Information - Read Only */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User size={20} /> Student Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                        <input 
                          type="text" 
                          value={hallTicketData.studentName} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                        <input 
                          type="text" 
                          value={hallTicketData.fatherName} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                        <input 
                          type="text" 
                          value={hallTicketData.motherName} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <input 
                          type="text" 
                          value={hallTicketData.studentClass} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                        <input 
                          type="text" 
                          value={hallTicketData.section} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select 
                          value={hallTicketData.gender} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" 
                          disabled
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Individual Editable Fields */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Edit size={20} /> Individual Student Details (Editable)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                        <input 
                          type="text" 
                          value={hallTicketData.rollNumber} 
                          onChange={(e) => handleFieldChange('rollNumber', e.target.value)} 
                          placeholder="Enter roll number" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examDate} 
                          onChange={(e) => handleFieldChange('examDate', e.target.value)} 
                          placeholder="e.g., March 15, 2025" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Time</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examTime} 
                          onChange={(e) => handleFieldChange('examTime', e.target.value)} 
                          placeholder="e.g., 10:00 AM - 1:00 PM" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Duration</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examDuration} 
                          onChange={(e) => handleFieldChange('examDuration', e.target.value)} 
                          placeholder="e.g., 3 Hours" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="file" 
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
                            onChange={handlePhotoUpload} 
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white" 
                          />
                          {photoPreview && <img src={photoPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Max size: 5MB. Allowed: JPEG, PNG, GIF, WEBP</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Signature Label</label>
                        <input 
                          type="text" 
                          value={hallTicketData.teacherSignature} 
                          onChange={(e) => handleFieldChange('teacherSignature', e.target.value)} 
                          placeholder="e.g., Teacher's Signature" 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Common Information - Read Only */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <BookOpen size={20} /> Common Information (From Common Settings)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examTitle} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examType} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
                      {hallTicketData.subjects && hallTicketData.subjects.length > 0 ? (
                        <div className="space-y-2">
                          {hallTicketData.subjects.map((subject, index) => (
                            <div key={index} className="border rounded p-2 bg-white">
                              <div className="grid grid-cols-5 gap-2 text-sm">
                                <div><span className="font-medium">Name:</span> {subject.name || '-'}</div>
                                <div><span className="font-medium">Code:</span> {subject.code || '-'}</div>
                                <div><span className="font-medium">Date:</span> {subject.date || '-'}</div>
                                <div><span className="font-medium">Time:</span> {subject.time || '-'}</div>
                                <div><span className="font-medium">Invigilator:</span> {subject.invigilatorSignature || '-'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-2">No subjects added in common settings.</p>
                      )}
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                      {hallTicketData.instructions && hallTicketData.instructions.length > 0 ? (
                        <ul className="list-disc list-inside border rounded p-2 bg-white">
                          {hallTicketData.instructions.map((instruction, index) => (
                            <li key={index} className="text-sm">{instruction}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-center py-2">No instructions added in common settings.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Signature Label</label>
                        <input 
                          type="text" 
                          value={hallTicketData.principalSignature} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                        <input 
                          type="text" 
                          value={hallTicketData.principalName} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Label</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examController} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exam Controller Name</label>
                        <input 
                          type="text" 
                          value={hallTicketData.examControllerName} 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100" 
                          readOnly 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setIsCommonEditModalOpen(true);
                      }}
                      className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Edit size={14} /> Edit Common Settings
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700 flex items-center gap-2">
                      <span className="font-semibold">ℹ️ Note:</span> 
                      Subjects, Instructions, Principal, and Exam Controller details are managed in Common Settings. 
                      Changes there will reflect for all students in this class/section.
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400" 
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveHallTicket} 
                  disabled={isSaving} 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
                >
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