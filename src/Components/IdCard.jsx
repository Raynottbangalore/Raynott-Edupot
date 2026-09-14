// src/pages/IdCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Download, Printer, X, Loader, Users, User, School, MapPin, Phone, Mail,
  Calendar, UserCheck, FileText, Eye, RefreshCw, ChevronLeft, ChevronRight, Camera,
  Upload, Palette, Layout, Star, Award, BookOpen, GraduationCap, Shield, CreditCard,
  Fingerprint, BadgeCheck, QrCode, Heart, Home, User2, Building2, Hash, Edit, Trash2,
  CheckCircle, Clock, MoreVertical, Briefcase, Book
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';
import TeacherApi from '../service/TeacherApi';

const IdCard = () => {
  // ============ CARD TYPE STATE ============
  const [cardType, setCardType] = useState('student'); // 'student' or 'teacher'

  // ============ STUDENT STATE ============
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentImage, setStudentImage] = useState(null);
  const [studentImageFile, setStudentImageFile] = useState(null);
  const [isUploadingStudent, setIsUploadingStudent] = useState(false);

  // ============ TEACHER STATE ============
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherImage, setTeacherImage] = useState(null);
  const [teacherImageFile, setTeacherImageFile] = useState(null);
  const [isUploadingTeacher, setIsUploadingTeacher] = useState(false);

  // ============ SHARED STATE ============
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: '',
    schoolEmail: '',
    schoolPhone: ''
  });
  const [selectedDesign, setSelectedDesign] = useState('design1');

  // Refs
  const cardRef = useRef(null);
  const studentFileInputRef = useRef(null);
  const teacherFileInputRef = useRef(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  // Edit state
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Design templates
  const designs = {
    design1: {
      name: 'Classic Heritage',
      icon: <Layout size={20} />,
      description: 'Traditional Indian school ID card with royal border and emblem',
    },
    design2: {
      name: 'Modern Vertical',
      icon: <Star size={20} />,
      description: 'Vertical ID card with centered photo and clean layout',
    },
    design3: {
      name: 'Premium Split',
      icon: <Award size={20} />,
      description: 'Split design with colored sidebar and elegant styling',
    }
  };

  // Load data on mount and when card type changes
  useEffect(() => {
    loadSchoolInfo();
    if (cardType === 'student') {
      loadStudents();
    } else {
      loadTeachers();
    }
    // Reset search state
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedSubject('');
    setSelectedDesignation('');
    setFilteredStudents([]);
    setFilteredTeachers([]);
    setHasSearched(false);
  }, [cardType]);

  // Apply filters
  useEffect(() => {
    if (searchTerm.trim() || (cardType === 'student' && (selectedGrade || selectedSection)) ||
      (cardType === 'teacher' && (selectedSubject || selectedDesignation))) {
      applyFilters();
      setHasSearched(true);
    } else {
      setFilteredStudents([]);
      setFilteredTeachers([]);
      setHasSearched(false);
    }
  }, [students, teachers, searchTerm, selectedGrade, selectedSection, selectedSubject, selectedDesignation, cardType]);

  // ============ DATA LOADING ============
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const result = await StudentApi.getAllStudents();
      if (result.success) {
        const normalized = result.students.map(stu => ({
          ...stu,
          id: stu.studentId,
          type: 'student',
          basicInfo: {
            ...stu.basicInfo,
            photoUrl: stu.basicInfo?.photoUrl || null
          }
        }));
        setStudents(normalized);
      } else {
        toast.error(result.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Error loading students');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const result = await TeacherApi.getAllTeachers();
      if (result.success) {
        const normalized = result.teachers.map(teacher => ({
          ...teacher,
          id: teacher.teacherId,
          type: 'teacher',
          // Flatten the structure - teachers have flat fields, not nested basicInfo
          basicInfo: {
            name: teacher.name || '',
            employeeId: teacher.teacherId || '',
            designation: teacher.designation || 'Teacher',
            department: teacher.department || teacher.subject || '',
            subject: teacher.subject || '',
            subjects: teacher.subjects || (teacher.subject ? [teacher.subject] : []),
            qualification: teacher.qualification || '',
            phone: teacher.phone || teacher.mobile || '',
            email: teacher.email || '',
            address: teacher.address || '',
            dob: teacher.dob || teacher.dateOfBirth || '',
            bloodGroup: teacher.bloodGroup || '',
            joiningDate: teacher.joiningDate || teacher.dateOfJoining || '',
            photoUrl: teacher.photoUrl || teacher.basicInfo?.photoUrl || null,
            classesAssigned: teacher.classesAssigned || [],
             employeeId: teacher.employeeId || teacher.teacherId || '',
          }
        }));
        setTeachers(normalized);
        console.log('✅ Loaded teachers:', normalized.length);
        console.log('📋 Sample teacher:', normalized[0]);
      } else {
        toast.error(result.error || 'Failed to load teachers');
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Error loading teachers');
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

  // ============ FILTERING ============
  const applyFilters = () => {
    if (cardType === 'student') {
      let filtered = [...students];

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(student =>
          student.basicInfo?.name?.toLowerCase().includes(term) ||
          student.basicInfo?.admissionNo?.toLowerCase().includes(term) ||
          student.basicInfo?.fatherName?.toLowerCase().includes(term) ||
          student.basicInfo?.fatherPhone?.includes(term)
        );
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
    } else {
      let filtered = [...teachers];

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(teacher =>
          teacher.basicInfo?.name?.toLowerCase().includes(term) ||
          teacher.basicInfo?.employeeId?.toLowerCase().includes(term) ||
          teacher.basicInfo?.phone?.includes(term) ||
          teacher.basicInfo?.email?.toLowerCase().includes(term)
        );
      }

      if (selectedSubject) {
        filtered = filtered.filter(teacher =>
          teacher.basicInfo?.subjects?.includes(selectedSubject) ||
          teacher.basicInfo?.subject === selectedSubject
        );
      }

      if (selectedDesignation) {
        filtered = filtered.filter(teacher =>
          teacher.basicInfo?.designation === selectedDesignation
        );
      }

      setFilteredTeachers(filtered);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim() || (cardType === 'student' && (selectedGrade || selectedSection)) ||
      (cardType === 'teacher' && (selectedSubject || selectedDesignation))) {
      applyFilters();
      setHasSearched(true);
    } else {
      toast.info('Please enter a search term or select filters');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedSubject('');
    setSelectedDesignation('');
    setFilteredStudents([]);
    setFilteredTeachers([]);
    setHasSearched(false);
  };

  // Get unique values for filters
  const grades = [...new Set(students.map(s => s.basicInfo?.grade).filter(Boolean))].sort();
  const sections = [...new Set(students.map(s => s.basicInfo?.section).filter(Boolean))].sort();
  const subjects = [...new Set(teachers.flatMap(t =>
    t.basicInfo?.subjects || (t.basicInfo?.subject ? [t.basicInfo.subject] : [])
  ).filter(Boolean))].sort();
  const designations = [...new Set(teachers.map(t => t.basicInfo?.designation).filter(Boolean))].sort();

  // ============ PHOTO UPLOAD ============
  const uploadStudentPhotoToServer = async (studentId, file) => {
    try {
      const result = await StudentApi.uploadStudentPhoto(studentId, file);
      if (result.success) {
        toast.success('Photo uploaded successfully!');
        return result.photoUrl;
      } else {
        toast.error(result.error || 'Failed to upload photo');
        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      return null;
    }
  };

  const uploadTeacherPhotoToServer = async (teacherId, file) => {
    try {
      const result = await TeacherApi.uploadTeacherPhoto(teacherId, file);
      if (result.success) {
        toast.success('Photo uploaded successfully!');
        return result.photoUrl;
      } else {
        toast.error(result.error || 'Failed to upload photo');
        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      return null;
    }
  };

  const handleTeacherImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setIsUploadingTeacher(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setTeacherImage(e.target.result);
      setTeacherImageFile(file);
    };
    reader.readAsDataURL(file);

    if (selectedTeacher) {
      const photoUrl = await uploadTeacherPhotoToServer(selectedTeacher.teacherId, file);
      if (photoUrl) {
        setTeachers(prev => prev.map(t =>
          t.teacherId === selectedTeacher.teacherId
            ? { ...t, basicInfo: { ...t.basicInfo, photoUrl: photoUrl } }
            : t
        ));
        setSelectedTeacher(prev => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, photoUrl: photoUrl }
        }));
      }
    }
    setIsUploadingTeacher(false);
  };

  const handleStudentImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    setIsUploadingStudent(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setStudentImage(e.target.result);
      setStudentImageFile(file);
    };
    reader.readAsDataURL(file);

    if (selectedStudent) {
      const photoUrl = await uploadStudentPhotoToServer(selectedStudent.studentId, file);
      if (photoUrl) {
        setStudents(prev => prev.map(s =>
          s.studentId === selectedStudent.studentId
            ? { ...s, basicInfo: { ...s.basicInfo, photoUrl: photoUrl } }
            : s
        ));
        setSelectedStudent(prev => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, photoUrl: photoUrl }
        }));
      }
    }
    setIsUploadingStudent(false);
  };

  const deleteStudentPhoto = async () => {
    if (!selectedStudent) return;

    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      const result = await StudentApi.deleteStudentPhoto(selectedStudent.studentId);
      if (result.success) {
        setStudentImage(null);
        setStudentImageFile(null);
        toast.success('Photo deleted successfully');

        setStudents(prev => prev.map(s =>
          s.studentId === selectedStudent.studentId
            ? { ...s, basicInfo: { ...s.basicInfo, photoUrl: null } }
            : s
        ));
        setSelectedStudent(prev => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, photoUrl: null }
        }));

        setGeneratedCards(prev => prev.map(gc =>
          gc.studentId === selectedStudent.studentId
            ? { ...gc, basicInfo: { ...gc.basicInfo, photoUrl: null } }
            : gc
        ));
      } else {
        toast.error(result.error || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    }
  };

  const deleteTeacherPhoto = async () => {
    if (!selectedTeacher) return;

    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      const result = await TeacherApi.deleteTeacherPhoto(selectedTeacher.teacherId);
      if (result.success) {
        setTeacherImage(null);
        setTeacherImageFile(null);
        toast.success('Photo deleted successfully');

        setTeachers(prev => prev.map(t =>
          t.teacherId === selectedTeacher.teacherId
            ? { ...t, basicInfo: { ...t.basicInfo, photoUrl: null } }
            : t
        ));
        setSelectedTeacher(prev => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, photoUrl: null }
        }));

        setGeneratedCards(prev => prev.map(gc =>
          gc.teacherId === selectedTeacher.teacherId
            ? { ...gc, basicInfo: { ...gc.basicInfo, photoUrl: null } }
            : gc
        ));
      } else {
        toast.error(result.error || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    }
  };

  // ============ PHOTO BASE64 ============
  const getStudentPhotoBase64 = async (studentId) => {
    try {
      const result = await StudentApi.getStudentPhotoBase64(studentId);
      if (result.success && result.photoData) {
        return result.photoData;
      }
      return null;
    } catch (error) {
      console.error('Error getting photo base64:', error);
      return null;
    }
  };

  const getTeacherPhotoBase64 = async (teacherId) => {
    console.log('📸 getTeacherPhotoBase64 called for teacherId:', teacherId);
    try {
      const result = await TeacherApi.getTeacherPhotoBase64(teacherId);
      console.log('📸 API response:', result);
      if (result.success && result.photoData) {
        return result.photoData;
      }
      console.warn('⚠️ API returned no photoData:', result.error);
      return null;
    } catch (error) {
      console.error('❌ Error getting teacher photo base64:', error);
      return null;
    }
  };

  const getPhotoBase64 = async (person) => {
    if (person.type === 'student') {
      return await getStudentPhotoBase64(person.studentId);
    } else {
      return await getTeacherPhotoBase64(person.teacherId);
    }
  };

  // ============ CARD GENERATION ============
  const generateSingleCard = async (person) => {
    console.log('🔍 generateSingleCard called for:', person.basicInfo?.name);
    console.log('📋 person.basicInfo.photoUrl:', person.basicInfo?.photoUrl);
    console.log('📋 person.type:', person.type);

    if (cardType === 'student') {
      setSelectedStudent(person);
    } else {
      setSelectedTeacher(person);
    }

    setPreviewScale(1);
    setShowPreview(true);

    let imageDataUrl = person.basicInfo?.photoUrl || null;

    if (imageDataUrl && !imageDataUrl.startsWith('data:image')) {
      console.log('🌐 Fetching base64 from API...');
      try {
        const base64 = await getPhotoBase64(person);
        console.log('✅ Base64 received:', base64 ? `${base64.substring(0, 50)}... (length: ${base64?.length})` : 'NULL');
        if (base64) {
          imageDataUrl = base64;
        }
      } catch (err) {
        console.error('❌ Failed to load photo as base64:', err);
      }
    } else {
      console.log('ℹ️ Using existing image data:', imageDataUrl ? 'already base64 or null' : 'null');
    }

    console.log(' Final imageDataUrl:', imageDataUrl ? `${imageDataUrl.substring(0, 50)}...` : 'NULL');

    if (cardType === 'student') {
      setStudentImage(imageDataUrl);
      setStudentImageFile(null);
    } else {
      setTeacherImage(imageDataUrl);
      setTeacherImageFile(null);
    }
  };

  const generateBulkCards = async () => {
    const data = cardType === 'student' ? filteredStudents : filteredTeachers;
    if (data.length === 0) {
      toast.error(`No ${cardType}s to generate ID cards`);
      return;
    }

    const loadingToast = toast.loading(`Loading ${data.length} photos...`);

    try {
      const cardsWithImages = await Promise.all(
        data.map(async (person) => {
          let imageDataUrl = person.basicInfo?.photoUrl || null;

          if (imageDataUrl && !imageDataUrl.startsWith('data:image')) {
            try {
              const base64 = await getPhotoBase64(person);
              if (base64) {
                imageDataUrl = base64;
              }
            } catch (err) {
              console.warn(`Failed to load photo for ${person.basicInfo?.name}:`, err);
            }
          }

          return {
            ...person,
            basicInfo: {
              ...person.basicInfo,
              photoUrl: imageDataUrl
            }
          };
        })
      );

      setGeneratedCards(cardsWithImages);
      setCurrentCardIndex(0);
      setShowBulkPreview(true);
      toast.dismiss(loadingToast);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to load photos');
    }
  };

  // ============ PRINT SINGLE CARD ============
  const printSingleCard = async () => {
    const person = cardType === 'student' ? selectedStudent : selectedTeacher;
    if (!person) {
      toast.error('No card selected');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Loading...</title></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#f0f0f0;">
        <div style="text-align:center;">
          <div style="border:4px solid #e5e7eb;border-top:4px solid #4f46e5;border-radius:50%;width:48px;height:48px;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
          <p style="color:#374151;font-weight:600;">Loading photo...</p>
          <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
        </div>
      </body>
      </html>
    `);

    try {
      let imageDataUrl = currentImage;
      if (imageDataUrl && !imageDataUrl.startsWith('data:image')) {
        const base64 = await getPhotoBase64(person);
        if (base64) {
          imageDataUrl = base64;
        }
      }

      // Update state so cardRef reflects base64
      if (cardType === 'student') {
        setStudentImage(imageDataUrl);
      } else {
        setTeacherImage(imageDataUrl);
      }

      // Wait for React to re-render
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = cardRef.current;
      if (!element) {
        toast.error('Card not ready. Please try again.');
        printWindow.close();
        return;
      }

      const htmlContent = element.outerHTML;

      const isLandscape = selectedDesign === 'design1';
      const cardWidth = isLandscape ? '323px' : '204px';
      const cardHeight = isLandscape ? '204px' : '323px';

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>ID Card - ${person.basicInfo?.name || 'Print'}</title>
          <style>
            @page { size: ${isLandscape ? '85mm 54mm' : '54mm 85mm'}; margin: 0; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f0f0f0; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .id-card-container { width: ${cardWidth}; height: ${cardHeight}; display: flex; justify-content: center; align-items: center; page-break-inside: avoid; page-break-after: avoid; }
            .id-card-container > * { width: ${cardWidth} !important; height: ${cardHeight} !important; box-shadow: none !important; }
            img { max-width: 100%; height: auto; display: block; }
            @media print {
              html, body { background: #ffffff; padding: 0; margin: 0; width: ${isLandscape ? '85mm' : '54mm'}; height: ${isLandscape ? '54mm' : '85mm'}; }
              .id-card-container { width: ${cardWidth}; height: ${cardHeight}; margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
            @media screen {
              .id-card-container { transform: scale(1.8); transform-origin: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); border-radius: 12px; overflow: hidden; }
            }
            .print-toolbar { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1f2937; color: white; padding: 10px 20px; border-radius: 8px; display: flex; gap: 12px; align-items: center; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
            .print-toolbar button { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
            .print-toolbar button:hover { background: #4338ca; }
            .print-toolbar button.close-btn { background: #ef4444; }
            .print-toolbar button.close-btn:hover { background: #dc2626; }
            @media print { .print-toolbar { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="print-toolbar no-print">
            <span>${person.basicInfo?.name || 'ID Card'}</span>
            <button onclick="window.print()">Print</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
          <div class="id-card-container">${htmlContent}</div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to prepare print');
      printWindow.close();
    }
  };

  // ============ PRINT BULK CARDS ============
  const printBulkCards = async () => {
    if (generatedCards.length === 0) {
      toast.error('No cards to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Loading...</title></head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;background:#f0f0f0;">
        <div style="text-align:center;">
          <div style="border:4px solid #e5e7eb;border-top:4px solid #4f46e5;border-radius:50%;width:48px;height:48px;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
          <p style="color:#374151;font-weight:600;">Loading ${generatedCards.length} photos... Please wait</p>
          <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
        </div>
      </body>
      </html>
    `);

    try {
      // Pre-load all photos as base64
      const cardsWithImages = await Promise.all(
        generatedCards.map(async (person) => {
          let imageDataUrl = person.basicInfo?.photoUrl || null;

          if (imageDataUrl && !imageDataUrl.startsWith('data:image')) {
            try {
              const base64 = await getPhotoBase64(person);
              if (base64) {
                imageDataUrl = base64;
              }
            } catch (err) {
              console.warn(`Failed to load photo for ${person.basicInfo?.name}:`, err);
            }
          }

          return { person, imageDataUrl };
        })
      );

      const isLandscape = selectedDesign === 'design1';
      const cardsPerRow = isLandscape ? 2 : 4;
      const cardWidth = isLandscape ? '323px' : '204px';
      const cardHeight = isLandscape ? '204px' : '323px';

      let cardsHTML = '';
      cardsWithImages.forEach(({ person, imageDataUrl }) => {
        cardsHTML += `
          <div class="id-card-container">
            ${renderCardHTML(person, imageDataUrl, selectedDesign, person.type || cardType)}
          </div>
        `;
      });

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bulk ID Cards - ${cardType}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            html, body { margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif; }
            .toolbar { position: sticky; top: 0; background: #1f2937; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
            .toolbar h2 { margin: 0; font-size: 16px; }
            .toolbar-actions { display: flex; gap: 10px; }
            .toolbar button { background: #4f46e5; color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; }
            .toolbar button:hover { background: #4338ca; }
            .toolbar button.close-btn { background: #ef4444; }
            .toolbar button.close-btn:hover { background: #dc2626; }
            .cards-container { display: grid; grid-template-columns: repeat(${cardsPerRow}, ${cardWidth}); gap: 12px; padding: 20px; justify-content: center; background: #ffffff; min-height: 100vh; }
            .id-card-container { width: ${cardWidth}; height: ${cardHeight}; page-break-inside: avoid; page-break-after: avoid; overflow: hidden; }
            .id-card-container > * { width: ${cardWidth} !important; height: ${cardHeight} !important; box-shadow: none !important; }
            img { max-width: 100%; display: block; }
            @media print {
              html, body { background: #ffffff; }
              .toolbar { display: none !important; }
              .cards-container { padding: 0; gap: 8px; background: #ffffff; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <h2>${generatedCards.length} ${cardType === 'student' ? 'Student' : 'Teacher'} ID Cards</h2>
            <div class="toolbar-actions">
              <button onclick="window.print()">Print All</button>
              <button class="close-btn" onclick="window.close()">Close</button>
            </div>
          </div>
          <div class="cards-container">${cardsHTML}</div>
        </body>
        </html>
      `);

      printWindow.document.close();

    } catch (error) {
      console.error('Bulk print error:', error);
      toast.error('Failed to load photos for printing');
      printWindow.close();
    }
  };

  // ============ RENDER CARD HTML FOR PRINT ============
  const renderCardHTML = (person, image, design, type) => {
    const basicInfo = person.basicInfo || {};
    const isTeacher = type === 'teacher';

    const name = basicInfo.name || (isTeacher ? 'Teacher Name' : 'Student Name');
    const id = isTeacher
      ? (basicInfo.employeeId || 'N/A')
      : (basicInfo.admissionNo || 'N/A');
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const designation = basicInfo.designation || 'Teacher';
    const department = basicInfo.department || 'N/A';
    const qualification = basicInfo.qualification || 'N/A';
    const subjects = basicInfo.subjects?.join(', ') || basicInfo.subject || 'N/A';
    const fatherName = basicInfo.fatherName || 'N/A';
    const motherName = basicInfo.motherName || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || basicInfo.phone || 'N/A';
    const email = basicInfo.email || 'N/A';
    const address = basicInfo.address || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';
    const joiningDate = basicInfo.joiningDate || 'N/A';

    // Design 2: Modern Vertical (Portrait)
    if (design === 'design2') {
      return `
        <div style="width:204px;height:323px;background:#ffffff;border-radius:16px;box-shadow:0 8px 16px rgba(0,0,0,0.15);border:1px solid #f3f4f6;overflow:hidden;font-family:Arial,sans-serif;display:flex;flex-direction:column;">
          <div style="height:6px;background:${isTeacher ? '#059669' : '#6366f1'};"></div>
          <div style="padding:12px 12px 8px 12px;text-align:center;background:${isTeacher ? '#d1fae5' : '#e0e7ff'};border-bottom:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};">
            <div style="font-size:10px;font-weight:900;color:${isTeacher ? '#064e3b' : '#312e81'};text-transform:uppercase;letter-spacing:0.05em;">${schoolInfo.schoolName || 'SCHOOL NAME'}</div>
            <div style="font-size:6px;font-weight:700;color:${isTeacher ? '#047857' : '#4338ca'};text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">${schoolInfo.schoolAffiliation || 'EDUCATION FOR ALL'}</div>
          </div>
          <div style="display:flex;justify-content:center;padding-top:8px;padding-bottom:4px;">
            <div style="position:relative;">
              ${image ? `<div style="width:75px;height:95px;border-radius:12px;border:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};overflow:hidden;background:#ffffff;"><img src="${image}" style="width:100%;height:100%;object-fit:cover;" /></div>` :
          `<div style="width:75px;height:95px;border-radius:12px;background:${isTeacher ? '#d1fae5' : '#e0e7ff'};display:flex;align-items:center;justify-content:center;border:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};"><span style="color:${isTeacher ? '#047857' : '#4338ca'};font-weight:700;font-size:20px;">${name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span></div>`}
              <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#ef4444;color:#ffffff;font-size:6px;font-weight:700;padding:2px 6px;border-radius:9999px;">${bloodGroup}</div>
            </div>
          </div>
          <div style="text-align:center;margin-top:4px;">
            <div style="font-weight:700;color:#1f2937;font-size:14px;line-height:1.2;">${name}</div>
            <div style="font-size:7px;color:${isTeacher ? '#059669' : '#4f46e5'};font-weight:700;">#${id}</div>
          </div>
          <div style="padding:6px 12px;flex:1;">
            <div style="font-size:8px;">
              ${isTeacher ? `
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #d1fae5;padding-bottom:2px;margin-bottom:2px;"><span style="color:#047857;font-weight:700;">Dept</span><span style="color:#374151;font-weight:500;">${department}</span></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #d1fae5;padding-bottom:2px;margin-bottom:2px;"><span style="color:#047857;font-weight:700;">Subject</span><span style="color:#374151;font-weight:500;">${subjects}</span></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #d1fae5;padding-bottom:2px;margin-bottom:2px;"><span style="color:#047857;font-weight:700;">DOB</span><span style="color:#374151;font-weight:500;">${dob}</span></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #d1fae5;padding-bottom:2px;margin-bottom:2px;"><span style="color:#047857;font-weight:700;">Joined</span><span style="color:#374151;font-weight:500;">${joiningDate}</span></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:#047857;font-weight:700;">Contact</span><span style="color:#374151;font-weight:500;">${phone}</span></div>
              ` : `
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">Father</span><span style="color:#374151;font-weight:500;">${fatherName}</span></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">Mother</span><span style="color:#374151;font-weight:500;">${motherName}</span></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">DOB</span><span style="color:#374151;font-weight:500;">${dob}</span></div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">Class</span><span style="color:#1f2937;font-weight:700;">${grade} ${section ? `- ${section}` : ''}</span></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:#4338ca;font-weight:700;">Contact</span><span style="color:#374151;font-weight:500;">${phone}</span></div>
              `}
            </div>
          </div>
        </div>
      `;
    }

    // Design 3: Premium Split (Portrait)
    if (design === 'design3') {
      return `
        <div style="width:204px;height:323px;background:#ffffff;border:1px solid #000000;overflow:hidden;display:flex;font-family:Arial,sans-serif;">
          <div style="width:55px;height:100%;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-right:1px solid #000000;background:${isTeacher ? '#064e3b' : '#1a1a2e'};">
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffffff;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;line-height:1.5;">
              <span style="font-weight:900;font-size:13px;letter-spacing:0.05em;">${schoolInfo.schoolName || 'ABC SCHOOL'}</span>
              <span style="font-size:7px;opacity:0.8;margin-top:4px;">${schoolInfo.schoolAddress || 'Address'} || ${schoolInfo.schoolPhone || 'Phone'} || ${schoolInfo.schoolEmail || 'Email'}</span>
            </div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff;padding:0 8px;">
            <div style="position:relative;">
              <div style="width:70px;height:85px;border:1px solid #000000;overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center;">
                ${image ? `<img src="${image}" style="width:100%;height:100%;object-fit:cover;" />` : `<span style="font-size:10px;color:#6b7280;">Image</span>`}
              </div>
              ${bloodGroup && bloodGroup !== 'N/A' ? `<div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#ef4444;color:#ffffff;font-size:6px;font-weight:700;padding:2px 6px;border-radius:9999px;">${bloodGroup}</div>` : ''}
            </div>
            <div style="margin-top:12px;text-align:center;">
              <div style="font-size:11px;font-weight:700;color:#000000;">${name}</div>
              <div style="font-size:10px;color:#1f2937;">${isTeacher ? designation : `${grade} ${section ? `- ${section}` : ''}`}</div>
              <div style="font-size:9px;color:#374151;">${phone}</div>
              <div style="font-size:9px;color:#374151;">${dob}</div>
              <div style="font-size:8px;color:#6b7280;margin-top:4px;">ID: ${id}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Default: Design 1 - Classic Heritage (Landscape)
    return `
      <div style="width:323px;height:204px;background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border:1px solid #e5e7eb;overflow:hidden;position:relative;font-family:Arial,sans-serif;">
        <div style="position:absolute;top:0;left:0;width:24px;height:24px;border-top:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-left:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-top-left-radius:8px;"></div>
        <div style="position:absolute;top:0;right:0;width:24px;height:24px;border-top:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-right:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-top-right-radius:8px;"></div>
        <div style="position:absolute;bottom:0;left:0;width:24px;height:24px;border-bottom:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-left:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-bottom-left-radius:8px;"></div>
        <div style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-bottom:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-right:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};border-bottom-right-radius:8px;"></div>
        <div style="position:absolute;left:24px;right:24px;top:6px;border-top:1px solid ${isTeacher ? '#a7f3d0' : '#c7d2fe'};"></div>
        <div style="position:absolute;left:24px;right:24px;bottom:6px;border-top:1px solid ${isTeacher ? '#a7f3d0' : '#c7d2fe'};"></div>
        <div style="background:${isTeacher ? '#d1fae5' : '#e0e7ff'};padding:6px 16px;text-align:center;position:relative;border-bottom:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};">
          <div style="color:${isTeacher ? '#064e3b' : '#312e81'};font-weight:900;font-size:14px;letter-spacing:0.05em;">${schoolInfo.schoolName || 'SCHOOL NAME'}</div>
          <div style="color:${isTeacher ? '#047857' : '#4338ca'};font-weight:700;font-size:8px;letter-spacing:0.1em;">${schoolInfo.schoolAffiliation || 'EST. 1985 • GOVT. RECOGNISED'}</div>
        </div>
        <div style="padding:10px;display:flex;gap:12px;">
          <div style="flex-shrink:0;position:relative;">
            ${image ? `<div style="width:70px;height:85px;border-radius:4px;border:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};overflow:hidden;"><img src="${image}" style="width:100%;height:100%;object-fit:cover;" /></div>` :
        `<div style="width:70px;height:85px;border-radius:4px;background:${isTeacher ? '#d1fae5' : '#e0e7ff'};display:flex;align-items:center;justify-content:center;border:2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'};"><span style="color:${isTeacher ? '#047857' : '#4338ca'};font-weight:700;font-size:24px;">${name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span></div>`}
            <div style="position:absolute;bottom:-4px;right:-4px;background:#ef4444;color:#ffffff;font-size:6px;font-weight:700;padding:2px 6px;border-radius:9999px;">${bloodGroup}</div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:#1f2937;font-size:16px;border-bottom:2px solid ${isTeacher ? '#a7f3d0' : '#c7d2fe'};padding-bottom:2px;margin-bottom:2px;">${name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px;">
              ${isTeacher ? `
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#047857;font-size:8px;font-weight:700;text-transform:uppercase;">ID</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${id}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#047857;font-size:8px;font-weight:700;text-transform:uppercase;">Designation</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${designation}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#047857;font-size:8px;font-weight:700;text-transform:uppercase;">Subject</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${subjects}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#047857;font-size:8px;font-weight:700;text-transform:uppercase;">DOB</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${dob}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;grid-column:span 2;"><span style="color:#047857;font-size:8px;font-weight:700;text-transform:uppercase;">Phone</span><span style="color:#374151;font-size:9px;font-weight:500;">${phone}</span><span style="color:#047857;font-size:8px;font-weight:700;text-transform:uppercase;margin-left:8px;">Email</span><span style="color:#374151;font-size:8px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${email}</span></div>
              ` : `
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Father</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${fatherName}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Mother</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${motherName}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">DOB</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${dob}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Contact</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${phone}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;grid-column:span 2;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Address</span><span style="color:#374151;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">${address}</span></div>
                <div style="display:flex;align-items:baseline;gap:4px;grid-column:span 2;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Class</span><span style="color:#1f2937;font-size:9px;font-weight:700;">${grade} ${section ? `- ${section}` : ''}</span><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;margin-left:8px;">Adm. No.</span><span style="color:#1f2937;font-size:9px;font-weight:700;">${id}</span></div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // ============ CARD RENDERERS (JSX) ============
  const renderDesign1 = (person, image, type) => {
    const basicInfo = person.basicInfo || {};
    const isTeacher = type === 'teacher';

    const name = basicInfo.name || (isTeacher ? 'Teacher Name' : 'Student Name');
    const id = isTeacher
      ? (basicInfo.employeeId || 'N/A')
      : (basicInfo.admissionNo || 'N/A');
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const designation = basicInfo.designation || 'Teacher';
    const subjects = basicInfo.subjects?.join(', ') || basicInfo.subject || 'N/A';
    const fatherName = basicInfo.fatherName || 'N/A';
    const motherName = basicInfo.motherName || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || basicInfo.phone || 'N/A';
    const email = basicInfo.email || 'N/A';
    const address = basicInfo.address || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';

    return (
      <div style={{
        width: '323px',
        height: '204px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '24px',
          height: '24px',
          borderTop: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderLeft: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderTopLeftRadius: '8px'
        }}></div>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '24px',
          height: '24px',
          borderTop: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderRight: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderTopRightRadius: '8px'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '24px',
          height: '24px',
          borderBottom: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderLeft: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderBottomLeftRadius: '8px'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '24px',
          height: '24px',
          borderBottom: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderRight: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
          borderBottomRightRadius: '8px'
        }}></div>

        <div style={{
          position: 'absolute',
          left: '24px',
          right: '24px',
          top: '6px',
          borderTop: `1px solid ${isTeacher ? '#a7f3d0' : '#c7d2fe'}`
        }}></div>
        <div style={{
          position: 'absolute',
          left: '24px',
          right: '24px',
          bottom: '6px',
          borderTop: `1px solid ${isTeacher ? '#a7f3d0' : '#c7d2fe'}`
        }}></div>

        <div style={{
          backgroundColor: isTeacher ? '#d1fae5' : '#e0e7ff',
          padding: '6px 16px',
          textAlign: 'center',
          position: 'relative',
          borderBottom: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`
        }}>
          <div style={{
            color: isTeacher ? '#064e3b' : '#312e81',
            fontWeight: 900,
            fontSize: '14px',
            letterSpacing: '0.05em'
          }}>
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div style={{
            color: isTeacher ? '#047857' : '#4338ca',
            fontWeight: 700,
            fontSize: '8px',
            letterSpacing: '0.1em'
          }}>
            {schoolInfo.schoolAffiliation || 'EST. 1985 • GOVT. RECOGNISED'}
          </div>
        </div>

        <div style={{ padding: '10px', display: 'flex', gap: '12px' }}>
          <div style={{ flexShrink: 0, position: 'relative' }}>
            {image ? (
              <div style={{
                width: '70px',
                height: '85px',
                borderRadius: '4px',
                border: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <img src={image} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: '70px',
                height: '85px',
                borderRadius: '4px',
                backgroundColor: isTeacher ? '#d1fae5' : '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <span style={{ color: isTeacher ? '#047857' : '#4338ca', fontWeight: 700, fontSize: '24px' }}>
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '6px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '9999px'
            }}>
              {bloodGroup}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontWeight: 700,
              color: '#1f2937',
              fontSize: '16px',
              borderBottom: `2px solid ${isTeacher ? '#a7f3d0' : '#c7d2fe'}`,
              paddingBottom: '2px',
              marginBottom: '2px'
            }}>{name}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: '12px' }}>
              {isTeacher ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#047857', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#047857', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Designation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{designation}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#047857', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{subjects}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#047857', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{dob}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', gridColumn: 'span 2' }}>
                    <span style={{ color: '#047857', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</span>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{phone}</span>
                    <span style={{ color: '#047857', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '8px' }}>Email</span>
                    <span style={{ color: '#374151', fontSize: '8px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Father</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{fatherName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mother</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{motherName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{dob}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ color: '#374151', fontSize: '9px', fontWeight: 500 }}>{phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', gridColumn: 'span 2' }}>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</span>
                    <span style={{ color: '#374151', fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{address}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', gridColumn: 'span 2' }}>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Class</span>
                    <span style={{ color: '#1f2937', fontSize: '9px', fontWeight: 700 }}>{grade} {section ? `- ${section}` : ''}</span>
                    <span style={{ color: '#4338ca', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '8px' }}>Adm. No.</span>
                    <span style={{ color: '#1f2937', fontSize: '9px', fontWeight: 700 }}>{id}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDesign2 = (person, image, type) => {
    const basicInfo = person.basicInfo || {};
    const isTeacher = type === 'teacher';

    const name = basicInfo.name || (isTeacher ? 'Teacher Name' : 'Student Name');
    const id = isTeacher
      ? (basicInfo.employeeId || 'N/A')
      : (basicInfo.admissionNo || 'N/A');
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const designation = basicInfo.designation || 'Teacher';
    const department = basicInfo.department || 'N/A';
    const subjects = basicInfo.subjects?.join(', ') || basicInfo.subject || 'N/A';
    const fatherName = basicInfo.fatherName || 'N/A';
    const motherName = basicInfo.motherName || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || basicInfo.phone || 'N/A';
    const joiningDate = basicInfo.joiningDate || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';

    return (
      <div style={{
        width: '204px',
        height: '323px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ height: '6px', backgroundColor: isTeacher ? '#059669' : '#6366f1' }}></div>

        <div style={{
          padding: '12px 12px 8px 12px',
          textAlign: 'center',
          backgroundColor: isTeacher ? '#d1fae5' : '#e0e7ff',
          borderBottom: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 900,
            color: isTeacher ? '#064e3b' : '#312e81',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div style={{
            fontSize: '6px',
            fontWeight: 700,
            color: isTeacher ? '#047857' : '#4338ca',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '2px'
          }}>
            {schoolInfo.schoolAffiliation || 'EDUCATION FOR ALL'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px', paddingBottom: '4px' }}>
          <div style={{ position: 'relative' }}>
            {image ? (
              <div style={{
                width: '75px',
                height: '95px',
                borderRadius: '12px',
                border: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                backgroundColor: '#ffffff'
              }}>
                <img src={image} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: '75px',
                height: '95px',
                borderRadius: '12px',
                backgroundColor: isTeacher ? '#d1fae5' : '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isTeacher ? '#6ee7b7' : '#a5b4fc'}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <span style={{ color: isTeacher ? '#047857' : '#4338ca', fontWeight: 700, fontSize: '20px' }}>
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '6px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '9999px'
            }}>
              {bloodGroup}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <h3 style={{
            fontWeight: 700,
            color: '#1f2937',
            fontSize: '14px',
            lineHeight: '1.2',
            margin: 0
          }}>{name}</h3>
          <div style={{ fontSize: '7px', color: isTeacher ? '#059669' : '#4f46e5', fontWeight: 700 }}>
            #{id}
          </div>
          {isTeacher && (
            <div style={{ fontSize: '7px', color: '#6b7280', fontWeight: 600 }}>
              {designation}
            </div>
          )}
        </div>

        <div style={{ padding: '6px 12px', flex: 1 }}>
          <div style={{ fontSize: '8px' }}>
            {isTeacher ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d1fae5', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#047857', fontWeight: 700 }}>Dept</span>
                  <span style={{ color: '#374151', fontWeight: 500, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d1fae5', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#047857', fontWeight: 700 }}>Subject</span>
                  <span style={{ color: '#374151', fontWeight: 500, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subjects}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d1fae5', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#047857', fontWeight: 700 }}>DOB</span>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{dob}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #d1fae5', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#047857', fontWeight: 700 }}>Joined</span>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{joiningDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#047857', fontWeight: 700 }}>Contact</span>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{phone}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0e7ff', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#4338ca', fontWeight: 700 }}>Father</span>
                  <span style={{ color: '#374151', fontWeight: 500, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fatherName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0e7ff', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#4338ca', fontWeight: 700 }}>Mother</span>
                  <span style={{ color: '#374151', fontWeight: 500, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{motherName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0e7ff', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#4338ca', fontWeight: 700 }}>DOB</span>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{dob}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0e7ff', paddingBottom: '2px', marginBottom: '2px' }}>
                  <span style={{ color: '#4338ca', fontWeight: 700 }}>Class</span>
                  <span style={{ color: '#1f2937', fontWeight: 700 }}>{grade} {section ? `- ${section}` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4338ca', fontWeight: 700 }}>Contact</span>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{phone}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDesign3 = (person, image, type) => {
    const basicInfo = person.basicInfo || {};
    const isTeacher = type === 'teacher';

    const name = basicInfo.name || (isTeacher ? 'Teacher Name' : 'Student Name');
    const id = isTeacher
      ? (basicInfo.employeeId || 'N/A')
      : (basicInfo.admissionNo || 'N/A');
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const designation = basicInfo.designation || 'Teacher';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || basicInfo.phone || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';

    return (
      <div style={{
        width: '204px',
        height: '323px',
        backgroundColor: '#ffffff',
        border: '1px solid #968d8d',
        overflow: 'hidden',
        display: 'flex',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '55px',
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #000000',
          backgroundColor: isTeacher ? '#064e3b' : '#1a1a2e'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            whiteSpace: 'nowrap',
            lineHeight: '1.5'
          }}>
            <span style={{
              fontWeight: 900,
              fontSize: '13px',
              letterSpacing: '0.05em'
            }}>
              {schoolInfo.schoolName || 'ABC SCHOOL'}
            </span>
            <span style={{
              fontSize: '7px',
              opacity: 0.8,
              marginTop: '4px'
            }}>
              {schoolInfo.schoolAddress || 'Address'}
              {' || '}
              {schoolInfo.schoolPhone || 'Phone'}
              {' || '}
              {schoolInfo.schoolEmail || 'Email'}
            </span>
          </div>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          padding: '0 8px'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '70px',
              height: '85px',
              border: '1px solid #000000',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {image ? (
                <img
                  src={image}
                  alt="Photo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  Image
                </div>
              )}
            </div>
            {bloodGroup && bloodGroup !== 'N/A' && (
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '6px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '9999px'
              }}>
                {bloodGroup}
              </div>
            )}
          </div>

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#000000' }}>
              {name}
            </div>
            <div style={{ fontSize: '10px', color: '#1f2937' }}>
              {isTeacher ? designation : `${grade} ${section ? `- ${section}` : ''}`}
            </div>
            <div style={{ fontSize: '9px', color: '#374151' }}>
              {phone}
            </div>
            <div style={{ fontSize: '9px', color: '#374151' }}>
              {dob}
            </div>
            <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '4px' }}>
              ID: {id}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderIdCard = (person, image, type) => {
    if (!person) return null;

    switch (selectedDesign) {
      case 'design2':
        return renderDesign2(person, image, type);
      case 'design3':
        return renderDesign3(person, image, type);
      default:
        return renderDesign1(person, image, type);
    }
  };

  // ============ EDIT HANDLERS ============
  const handleEditPerson = (person) => {
    if (cardType === 'student') {
      setSelectedStudentForEdit(person);
    } else {
      setSelectedTeacherForEdit(person);
    }
    setEditFormData({
      name: person.basicInfo?.name || '',
      admissionNo: person.basicInfo?.admissionNo || '',
      employeeId: person.basicInfo?.employeeId || '',
      grade: person.basicInfo?.grade || '',
      section: person.basicInfo?.section || '',
      fatherName: person.basicInfo?.fatherName || '',
      motherName: person.basicInfo?.motherName || '',
      dob: person.basicInfo?.dob || '',
      fatherPhone: person.basicInfo?.fatherPhone || '',
      motherPhone: person.basicInfo?.motherPhone || '',
      phone: person.basicInfo?.phone || '',
      email: person.basicInfo?.email || '',
      address: person.basicInfo?.address || '',
      bloodGroup: person.basicInfo?.bloodGroup || '',
      designation: person.basicInfo?.designation || '',
      department: person.basicInfo?.department || '',
      subject: person.basicInfo?.subject || '',
      qualification: person.basicInfo?.qualification || '',
      joiningDate: person.basicInfo?.joiningDate || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (cardType === 'student' && selectedStudentForEdit) {
        // Prepare the update payload matching your backend field structure
        const updates = {
          basicInfo: {
            name: editFormData.name,
            admissionNo: editFormData.admissionNo,
            grade: editFormData.grade,
            section: editFormData.section,
            fatherName: editFormData.fatherName,
            motherName: editFormData.motherName,
            dob: editFormData.dob,
            fatherPhone: editFormData.fatherPhone,
            motherPhone: editFormData.motherPhone,
            phone: editFormData.phone,
            email: editFormData.email,
            address: editFormData.address,
            bloodGroup: editFormData.bloodGroup,
          }
        };

        // ✅ Call the API
        const result = await StudentApi.updateStudent(
          selectedStudentForEdit.studentId,
          updates
        );

        if (!result.success) {
          toast.error(result.error || 'Failed to update student');
          return;
        }

        // Update local state only after successful API call
        setStudents(prev => prev.map(s =>
          s.studentId === selectedStudentForEdit.studentId
            ? { ...s, basicInfo: { ...s.basicInfo, ...editFormData } }
            : s
        ));

      } else if (cardType === 'teacher' && selectedTeacherForEdit) {
        const updates = {
          name: editFormData.name,
          subject: editFormData.subject,
          phone: editFormData.phone,
          email: editFormData.email,
          designation: editFormData.designation,
          department: editFormData.department,
          qualification: editFormData.qualification,
          joiningDate: editFormData.joiningDate,
          dob: editFormData.dob,
          bloodGroup: editFormData.bloodGroup,
          address: editFormData.address,
          employeeId: editFormData.employeeId,
        };

        // Remove undefined/empty strings so backend's undefined-strip works
        Object.keys(updates).forEach(k => {
          if (updates[k] === undefined || updates[k] === null) delete updates[k];
        });

        const result = await TeacherApi.updateTeacher(
          selectedTeacherForEdit.teacherId,
          updates
        );

        if (!result.success) {
          toast.error(result.message || result.error || 'Failed to update teacher');
          return;
        }

        // ✅ Re-sync local state from what we actually sent
        setTeachers(prev => prev.map(t =>
          t.teacherId === selectedTeacherForEdit.teacherId
            ? {
              ...t,
              ...updates,                      // merge flat fields
              basicInfo: { ...t.basicInfo, ...editFormData }
            }
            : t
        ));
      }

      toast.success(`${cardType === 'student' ? 'Student' : 'Teacher'} updated successfully!`);
      setShowEditModal(false);
      setSelectedStudentForEdit(null);
      setSelectedTeacherForEdit(null);
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    }
  };

  // ============ RENDER HELPERS ============
  const currentFiltered = cardType === 'student' ? filteredStudents : filteredTeachers;
  const currentPerson = cardType === 'student' ? selectedStudent : selectedTeacher;
  const currentImage = cardType === 'student' ? studentImage : teacherImage;
  const isUploading = cardType === 'student' ? isUploadingStudent : isUploadingTeacher;
  const fileInputRef = cardType === 'student' ? studentFileInputRef : teacherFileInputRef;

  return (
    <div className="space-y-6">
      {/* ============ CARD TYPE SELECTOR ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-indigo-600" />
            <span className="font-semibold text-gray-700">ID Card Type</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCardType('student')}
              className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${cardType === 'student'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <GraduationCap size={18} />
              <span>Student ID Cards</span>
            </button>
            <button
              onClick={() => setCardType('teacher')}
              className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${cardType === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <Briefcase size={18} />
              <span>Teacher ID Cards</span>
            </button>
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {cardType === 'student' ? (
              <span className="flex items-center gap-1">
                <Users size={14} />
                {students.length} students loaded
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Users size={14} />
                {teachers.length} teachers loaded
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============ DESIGN SELECTION ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-indigo-600" />
            <span className="font-semibold text-gray-700">Select ID Card Design</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(designs).map(([key, design]) => (
              <button
                key={key}
                onClick={() => setSelectedDesign(key)}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${selectedDesign === key
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {design.icon}
                <span>{design.name}</span>
                {selectedDesign === key && (
                  <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {designs[selectedDesign].description}
        </p>
      </div>

      {/* ============ SEARCH AND FILTER ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={
                cardType === 'student'
                  ? "Search by name, admission no, father name..."
                  : "Search by name, employee ID, phone, email..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {cardType === 'student' ? (
            <>
              <div>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition"
                >
                  <option value="">All Sections</option>
                  {sections.map(section => (
                    <option key={section} value={section}>Section {section}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <select
                  value={selectedDesignation}
                  onChange={(e) => setSelectedDesignation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition"
                >
                  <option value="">All Designations</option>
                  {designations.map(des => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className={`flex-1 px-6 py-3 text-white rounded-xl transition flex items-center justify-center gap-2 ${cardType === 'student'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
            >
              <Search size={18} />
              <span>Search</span>
            </button>
            {(searchTerm || selectedGrade || selectedSection || selectedSubject || selectedDesignation) && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <span>Search {cardType}s to generate ID cards individually or in bulk</span>
        </div>
      </div>

      {/* ============ RESULTS TABLE ============ */}
      {hasSearched && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-600">
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <>
                  Found <span className="font-semibold text-gray-800">{currentFiltered.length}</span> {cardType}(s)
                  {searchTerm && <span className="ml-1">matching "<span className="font-medium">{searchTerm}</span>"</span>}
                  {selectedGrade && <span className="ml-1">in Grade <span className="font-medium">{selectedGrade}</span></span>}
                  {selectedSection && <span className="ml-1">Section <span className="font-medium">{selectedSection}</span></span>}
                  {selectedDesignation && <span className="ml-1">Designation <span className="font-medium">{selectedDesignation}</span></span>}
                  {selectedSubject && <span className="ml-1">Subject <span className="font-medium">{selectedSubject}</span></span>}
                </>
              )}
            </div>
            {currentFiltered.length > 0 && (
              <button
                onClick={generateBulkCards}
                className={`px-4 py-2 text-white rounded-lg transition flex items-center gap-2 text-sm ${cardType === 'student'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                  }`}
              >
                <FileText size={16} />
                <span>Generate All ID Cards ({currentFiltered.length})</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader className="animate-spin text-indigo-600" size={40} />
                <p className="text-gray-500">Loading {cardType}s...</p>
              </div>
            </div>
          ) : currentFiltered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-gray-400" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No {cardType}s found</h4>
              <p className="text-gray-500">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{cardType === 'student' ? 'Student' : 'Teacher'}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{cardType === 'student' ? 'Admission No' : 'Employee ID'}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {cardType === 'student' ? 'Class' : 'Subject'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {cardType === 'student' ? 'Section' : 'Department'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {cardType === 'student' ? 'Father Name' : 'Qualification'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Photo</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentFiltered.map((person, index) => (
                      <tr key={person.studentId || person.teacherId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cardType === 'student'
                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-800'
                                : 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                              }`}>
                              <span className="text-white font-bold text-sm">
                                {person.basicInfo?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{person.basicInfo?.name || 'Unnamed'}</div>
                              {cardType === 'teacher' && (
                                <div className="text-xs text-gray-400">{person.basicInfo?.email || ''}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {cardType === 'student'
                            ? (person.basicInfo?.admissionNo || 'N/A')
                            : (person.basicInfo?.employeeId || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cardType === 'student'
                            ? (person.basicInfo?.grade || 'N/A')
                            : (person.basicInfo?.subjects?.join(', ') || person.basicInfo?.subject || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cardType === 'student'
                            ? (person.basicInfo?.section || 'N/A')
                            : (person.basicInfo?.department || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cardType === 'student'
                            ? (person.basicInfo?.fatherName || 'N/A')
                            : (person.basicInfo?.qualification || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {cardType === 'student'
                            ? (person.basicInfo?.fatherPhone || 'N/A')
                            : (person.basicInfo?.phone || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3">
                          {person.basicInfo?.photoUrl ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              <CheckCircle size={12} className="mr-1" />
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                              <Clock size={12} className="mr-1" />
                              No Photo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => generateSingleCard(person)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Generate ID Card"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEditPerson(person)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={`Edit ${cardType}`}
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete this ${cardType}?`)) {
                                  toast.info('Delete functionality will be implemented');
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={`Delete ${cardType}`}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ INITIAL STATE ============ */}
      {!hasSearched && !isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${cardType === 'student' ? 'bg-indigo-50' : 'bg-emerald-50'
            }`}>
            {cardType === 'student' ? (
              <GraduationCap size={48} className="text-indigo-400" />
            ) : (
              <Briefcase size={48} className="text-emerald-400" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Generate {cardType === 'student' ? 'Student' : 'Teacher'} ID Cards
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Search for {cardType}s to generate individual or bulk ID cards with professional designs
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm text-gray-400">
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
              {cardType === 'student' ? 'Student Name' : 'Teacher Name'}
            </span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
              {cardType === 'student' ? 'Admission No' : 'Employee ID'}
            </span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">
              {cardType === 'student' ? 'Father Name' : 'Subject'}
            </span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Phone Number</span>
          </div>
        </div>
      )}

      {/* ============ SINGLE CARD PREVIEW MODAL ============ */}
      {showPreview && currentPerson && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {cardType === 'student' ? 'Student' : 'Teacher'} ID Card Preview
                </h2>
                <p className="text-sm text-gray-500">{currentPerson.basicInfo?.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedStudent(null);
                  setSelectedTeacher(null);
                  setStudentImage(null);
                  setTeacherImage(null);
                  setStudentImageFile(null);
                  setTeacherImageFile(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {/* Image Upload */}
              <div className="mb-4 w-full max-w-md">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className={cardType === 'student' ? 'text-indigo-600' : 'text-emerald-600'} />
                    <span className="text-sm text-gray-600">
                      {cardType === 'student' ? 'Student' : 'Teacher'} Photo
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {currentImage && (
                      <button
                        onClick={cardType === 'student' ? deleteStudentPhoto : deleteTeacherPhoto}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                        disabled={isUploading}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className={`px-3 py-1 text-sm text-white rounded-lg transition flex items-center gap-1 disabled:opacity-50 ${cardType === 'student'
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>{isUploading ? 'Uploading...' : currentImage ? 'Change' : 'Upload'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={cardType === 'student' ? handleStudentImageUpload : handleTeacherImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {currentImage && !isUploading && (
                  <p className="text-xs text-green-600 mt-1">Photo uploaded successfully!</p>
                )}
                {isUploading && (
                  <p className="text-xs text-blue-600 mt-1">Uploading photo...</p>
                )}
              </div>

              {/* Card Preview */}
              <div className="flex justify-center items-center p-4 bg-gray-50 rounded-xl border border-gray-200 w-full overflow-auto">
                <div
                  ref={cardRef}
                  className="transform transition-transform duration-200"
                  style={{ transform: `scale(${previewScale})` }}
                >
                  {renderIdCard(currentPerson, currentImage, cardType)}
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setPreviewScale(prev => Math.max(0.5, prev - 0.1))}
                  className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  -
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <button
                  onClick={() => setPreviewScale(prev => Math.min(2, prev + 0.1))}
                  className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  +
                </button>
                <button
                  onClick={() => setPreviewScale(1)}
                  className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 text-sm px-3"
                >
                  Reset
                </button>
              </div>

              <div className="flex gap-3 mt-6 w-full max-w-md">
                <button
                  onClick={printSingleCard}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ BULK CARD PREVIEW MODAL ============ */}
      {showBulkPreview && generatedCards.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Bulk {cardType === 'student' ? 'Student' : 'Teacher'} ID Cards
                </h2>
                <p className="text-sm text-gray-500">
                  {generatedCards.length} cards - {currentCardIndex + 1} of {generatedCards.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentCardIndex === 0}
                  className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentCardIndex(prev => Math.min(generatedCards.length - 1, prev + 1))}
                  disabled={currentCardIndex === generatedCards.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => {
                    setShowBulkPreview(false);
                    setGeneratedCards([]);
                    setCurrentCardIndex(0);
                  }}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="flex justify-center items-center p-4 bg-gray-50 rounded-xl border border-gray-200 w-full overflow-auto">
                <div ref={cardRef}>
                  {renderIdCard(
                    generatedCards[currentCardIndex],
                    generatedCards[currentCardIndex]?.basicInfo?.photoUrl || null,
                    cardType
                  )}
                </div>
              </div>

              <div className="w-full max-w-md mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{currentCardIndex + 1} / {generatedCards.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${cardType === 'student' ? 'bg-indigo-600' : 'bg-emerald-600'
                      }`}
                    style={{ width: `${((currentCardIndex + 1) / generatedCards.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 w-full max-w-md">
                <button
                  onClick={printBulkCards}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  <span>Print All</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ EDIT MODAL ============ */}
      {showEditModal && (selectedStudentForEdit || selectedTeacherForEdit) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit {cardType === 'student' ? 'Student' : 'Teacher'}
                </h2>
                <p className="text-sm text-gray-500">Update {cardType} information</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStudentForEdit(null);
                  setSelectedTeacherForEdit(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {cardType === 'student' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admission No</label>
                      <input
                        type="text"
                        value={editFormData.admissionNo || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, admissionNo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                      <select
                        value={editFormData.grade || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select Grade</option>
                        {grades.map(grade => (
                          <option key={grade} value={grade}>Grade {grade}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <select
                        value={editFormData.section || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Select Section</option>
                        {sections.map(section => (
                          <option key={section} value={section}>Section {section}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                      <input
                        type="text"
                        value={editFormData.fatherName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mother Name</label>
                      <input
                        type="text"
                        value={editFormData.motherName || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, motherName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Father Phone</label>
                      <input
                        type="tel"
                        value={editFormData.fatherPhone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, fatherPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mother Phone</label>
                      <input
                        type="tel"
                        value={editFormData.motherPhone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, motherPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                      <input
                        type="text"
                        value={editFormData.employeeId || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                      <input
                        type="text"
                        value={editFormData.designation || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={editFormData.department || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={editFormData.subject || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                      <input
                        type="text"
                        value={editFormData.qualification || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={editFormData.joiningDate || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, joiningDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editFormData.dob || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={editFormData.bloodGroup || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition flex items-center justify-center gap-2 ${cardType === 'student'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                  <CheckCircle size={18} />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedStudentForEdit(null);
                    setSelectedTeacherForEdit(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdCard;