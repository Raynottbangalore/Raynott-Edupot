import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Download, Printer, X, Loader, Users, User, School, MapPin, Phone, Mail,
  Calendar, UserCheck, FileText, Eye, RefreshCw, ChevronLeft, ChevronRight, Camera,
  Upload, Palette, Layout, Star, Award, BookOpen, GraduationCap, Shield, CreditCard,
  Fingerprint, BadgeCheck, QrCode, Heart, Home, User2, Building2, Hash, Edit, Trash2, CheckCircle, Clock, MoreVertical
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';

const IdCard = () => {
  // State
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolAffiliation: '',
    schoolEmail: '',
    schoolPhone: ''
  });
  const [selectedDesign, setSelectedDesign] = useState('design1');
  const [studentImage, setStudentImage] = useState(null);
  const [studentImageFile, setStudentImageFile] = useState(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  // Refs for PDF generation
  const cardRef = useRef(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [previewScale, setPreviewScale] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

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

  // Load students and school info
  useEffect(() => {
    loadStudents();
    loadSchoolInfo();
  }, []);

  // Apply filters
  useEffect(() => {
    if (searchTerm.trim() || selectedGrade || selectedSection) {
      applyFilters();
      setHasSearched(true);
    } else {
      setFilteredStudents([]);
      setHasSearched(false);
    }
  }, [students, searchTerm, selectedGrade, selectedSection]);

  // Load students from API
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const result = await StudentApi.getAllStudents();
      if (result.success) {
        const normalized = result.students.map(stu => ({
          ...stu,
          id: stu.studentId,
          basicInfo: {
            ...stu.basicInfo,
            photoUrl: stu.basicInfo?.photoUrl || null
          }
        }));
        setStudents(normalized);
        console.log('✅ Loaded students:', normalized.length);
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

  // Load school info
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

  // Apply search and filters
  const applyFilters = () => {
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
  };

  // Handle search
  const handleSearch = () => {
    if (searchTerm.trim() || selectedGrade || selectedSection) {
      applyFilters();
      setHasSearched(true);
    } else {
      toast.info('Please enter a search term or select filters');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedSection('');
    setFilteredStudents([]);
    setHasSearched(false);
  };

  // Get unique grades and sections
  const grades = [...new Set(students.map(s => s.basicInfo?.grade).filter(Boolean))].sort();
  const sections = [...new Set(students.map(s => s.basicInfo?.section).filter(Boolean))].sort();

  const uploadPhotoToServer = async (studentId, file) => {
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

  const handleImageUploadWithServer = async (event) => {
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

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setStudentImage(e.target.result);
      setStudentImageFile(file);
    };
    reader.readAsDataURL(file);

    if (selectedStudent) {
      const photoUrl = await uploadPhotoToServer(selectedStudent.studentId, file);
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
    setIsUploading(false);
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
      } else {
        toast.error(result.error || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    }
  };

  // Generate single ID card
  const generateSingleCard = (student) => {
    setSelectedStudent(student);
    if (student.basicInfo?.photoUrl) {
      setStudentImage(student.basicInfo.photoUrl);
    } else {
      setStudentImage(null);
    }
    setStudentImageFile(null);
    setPreviewScale(1);
    setShowPreview(true);
  };

  // Generate bulk ID cards
  const generateBulkCards = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to generate ID cards');
      return;
    }
    setGeneratedCards(filteredStudents);
    setCurrentCardIndex(0);
    setShowBulkPreview(true);
  };

  // Get student photo as base64 using the API
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

const downloadSinglePDF = async () => {
  if (!selectedStudent) return;

  setIsGenerating(true);
  try {
    let imageDataUrl = studentImage;
    if (selectedStudent.basicInfo?.photoUrl && !imageDataUrl?.startsWith('data:image')) {
      const base64Photo = await getStudentPhotoBase64(selectedStudent.studentId);
      if (base64Photo) {
        imageDataUrl = base64Photo;
      }
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.zIndex = '-9999';
    tempDiv.innerHTML = renderCardHTML(selectedStudent, imageDataUrl, selectedDesign);
    document.body.appendChild(tempDiv);

    await new Promise(resolve => setTimeout(resolve, 500));

    let pdfFormat;
    let pdfOrientation;
    let cardWidth;
    let cardHeight;
    
    if (selectedDesign === 'design1') {
      pdfFormat = [85, 54]; // width: 85mm (8.5cm), height: 54mm (5.4cm) - Landscape
      pdfOrientation = 'landscape';
      cardWidth = 323; // 8.56cm in px
      cardHeight = 204; // 5.40cm in px
    } else {
      pdfFormat = [54, 85]; // width: 54mm (5.4cm), height: 85mm (8.5cm) - Portrait
      pdfOrientation = 'portrait';
      cardWidth = 204; // 5.40cm in px
      cardHeight = 323; // 8.56cm in px
    }

    const opt = {
      margin: 0,
      filename: `ID-Card-${selectedStudent.basicInfo?.name || 'Student'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        width: cardWidth,
        height: cardHeight,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach(el => {
            if (el.style.color && el.style.color.includes('oklch')) {
              el.style.color = '#1f2937';
            }
            if (el.style.backgroundColor && el.style.backgroundColor.includes('oklch')) {
              el.style.backgroundColor = '#ffffff';
            }
            if (el.style.background && el.style.background.includes('oklch')) {
              el.style.background = '#ffffff';
            }
            if (el.style.borderColor && el.style.borderColor.includes('oklch')) {
              el.style.borderColor = '#e5e7eb';
            }
          });
        }
      },
      jsPDF: { 
        unit: 'mm', 
        format: pdfFormat, 
        orientation: pdfOrientation 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(tempDiv).save();
    
    document.body.removeChild(tempDiv);
    toast.success('ID Card downloaded successfully!');
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error('Failed to generate PDF: ' + error.message);
  } finally {
    setIsGenerating(false);
  }
};

  // Download bulk PDF
  const downloadBulkPDF = async () => {
  if (generatedCards.length === 0) return;

  setIsGenerating(true);
  try {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.zIndex = '-9999';
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(3, 1fr)';
    container.style.gap = '20px';
    container.style.padding = '20px';
    container.style.background = '#ffffff';
    container.style.width = '800px';
    document.body.appendChild(container);

    for (let i = 0; i < generatedCards.length; i++) {
      const student = generatedCards[i];
      let imageDataUrl = null;
      
      if (student.basicInfo?.photoUrl) {
        const base64Photo = await getStudentPhotoBase64(student.studentId);
        if (base64Photo) {
          imageDataUrl = base64Photo;
        }
      }
      
      const cardHTML = renderCardHTML(student, imageDataUrl, selectedDesign);
      const cardDiv = document.createElement('div');
      cardDiv.innerHTML = cardHTML;
      container.appendChild(cardDiv.firstElementChild);
      
      setCurrentCardIndex(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'ID-Cards-Bulk.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    await html2pdf().set(opt).from(container).save();
    
    document.body.removeChild(container);
    toast.success('All ID Cards downloaded successfully!');
  } catch (error) {
    console.error('Bulk PDF generation error:', error);
    toast.error('Failed to generate PDF: ' + error.message);
  } finally {
    setIsGenerating(false);
  }
};

  // Render card as HTML string for PDF generation
  const renderCardHTML = (student, image, design) => {
    const basicInfo = student.basicInfo || {};
    const name = basicInfo.name || 'Student Name';
    const admissionNo = basicInfo.admissionNo || 'N/A';
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const fatherName = basicInfo.fatherName || 'N/A';
    const motherName = basicInfo.motherName || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || 'N/A';
    const address = basicInfo.address || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';

    // Design 2: Modern Vertical (Portrait: 5.40cm x 8.56cm)
    if (design === 'design2') {
      return `
        <div style="width:204px;height:323px;background:#ffffff;border-radius:16px;box-shadow:0 8px 16px rgba(0,0,0,0.15);border:1px solid #f3f4f6;overflow:hidden;font-family:Arial,sans-serif;display:flex;flex-direction:column;">
          <div style="height:6px;background:#6366f1;"></div>
          <div style="padding:12px 12px 8px 12px;text-align:center;background:#e0e7ff;border-bottom:2px solid #a5b4fc;">
            <div style="font-size:10px;font-weight:900;color:#312e81;text-transform:uppercase;letter-spacing:0.05em;">${schoolInfo.schoolName || 'SCHOOL NAME'}</div>
            <div style="font-size:6px;font-weight:700;color:#4338ca;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">${schoolInfo.schoolAffiliation || 'EDUCATION FOR ALL'}</div>
          </div>
          <div style="display:flex;justify-content:center;padding-top:8px;padding-bottom:4px;">
            <div style="position:relative;">
              ${image ? `<div style="width:75px;height:95px;border-radius:12px;border:2px solid #a5b4fc;overflow:hidden;background:#ffffff;"><img src="${image}" style="width:100%;height:100%;object-fit:cover;" /></div>` : 
                `<div style="width:75px;height:95px;border-radius:12px;background:#e0e7ff;display:flex;align-items:center;justify-content:center;border:2px solid #a5b4fc;"><span style="color:#4338ca;font-weight:700;font-size:20px;">${name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span></div>`}
              <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#ef4444;color:#ffffff;font-size:6px;font-weight:700;padding:2px 6px;border-radius:9999px;">${bloodGroup}</div>
            </div>
          </div>
          <div style="text-align:center;margin-top:4px;">
            <div style="font-weight:700;color:#1f2937;font-size:14px;line-height:1.2;">${name}</div>
            <div style="font-size:7px;color:#4f46e5;font-weight:700;">#${admissionNo}</div>
          </div>
          <div style="padding:6px 12px;flex:1;">
            <div style="font-size:8px;">
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">Father</span><span style="color:#374151;font-weight:500;">${fatherName}</span></div>
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">Mother</span><span style="color:#374151;font-weight:500;">${motherName}</span></div>
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">DOB</span><span style="color:#374151;font-weight:500;">${dob}</span></div>
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e7ff;padding-bottom:2px;margin-bottom:2px;"><span style="color:#4338ca;font-weight:700;">Class</span><span style="color:#1f2937;font-weight:700;">${grade} ${section ? `- ${section}` : ''}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#4338ca;font-weight:700;">Contact</span><span style="color:#374151;font-weight:500;">${phone}</span></div>
            </div>
          </div>
        </div>
      `;
    }

    // Design 3: Premium Split (Portrait: 5.40cm x 8.56cm)
    if (design === 'design3') {
      return `
        <div style="width:204px;height:323px;background:#ffffff;border:1px solid #000000;overflow:hidden;display:flex;font-family:Arial,sans-serif;">
          <div style="width:55px;height:100%;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-right:1px solid #000000;background:#1a1a2e;">
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
              <div style="font-size:10px;color:#1f2937;">${grade} ${section ? `- ${section}` : ''}</div>
              <div style="font-size:9px;color:#374151;">${phone}</div>
              <div style="font-size:9px;color:#374151;">${dob}</div>
              <div style="font-size:8px;color:#6b7280;margin-top:4px;">ID: ${admissionNo}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Default: Design 1 - Classic Heritage (Landscape: 8.56cm x 5.40cm)
    return `
      <div style="width:323px;height:204px;background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);border:1px solid #e5e7eb;overflow:hidden;position:relative;font-family:Arial,sans-serif;">
        <div style="position:absolute;top:0;left:0;width:24px;height:24px;border-top:2px solid #a5b4fc;border-left:2px solid #a5b4fc;border-top-left-radius:8px;"></div>
        <div style="position:absolute;top:0;right:0;width:24px;height:24px;border-top:2px solid #a5b4fc;border-right:2px solid #a5b4fc;border-top-right-radius:8px;"></div>
        <div style="position:absolute;bottom:0;left:0;width:24px;height:24px;border-bottom:2px solid #a5b4fc;border-left:2px solid #a5b4fc;border-bottom-left-radius:8px;"></div>
        <div style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-bottom:2px solid #a5b4fc;border-right:2px solid #a5b4fc;border-bottom-right-radius:8px;"></div>
        <div style="position:absolute;left:24px;right:24px;top:6px;border-top:1px solid #c7d2fe;"></div>
        <div style="position:absolute;left:24px;right:24px;bottom:6px;border-top:1px solid #c7d2fe;"></div>
        <div style="background:#e0e7ff;padding:6px 16px;text-align:center;position:relative;border-bottom:2px solid #a5b4fc;">
          <div style="position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:16px;">🛡</div>
          <div style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:16px;">🛡</div>
          <div style="color:#312e81;font-weight:900;font-size:14px;letter-spacing:0.05em;">${schoolInfo.schoolName || 'SCHOOL NAME'}</div>
          <div style="color:#4338ca;font-weight:700;font-size:8px;letter-spacing:0.1em;">${schoolInfo.schoolAffiliation || 'EST. 1985 • GOVT. RECOGNISED'}</div>
        </div>
        <div style="padding:10px;display:flex;gap:12px;">
          <div style="flex-shrink:0;position:relative;">
            ${image ? `<div style="width:70px;height:85px;border-radius:4px;border:2px solid #a5b4fc;overflow:hidden;"><img src="${image}" style="width:100%;height:100%;object-fit:cover;" /></div>` : 
              `<div style="width:70px;height:85px;border-radius:4px;background:#e0e7ff;display:flex;align-items:center;justify-content:center;border:2px solid #a5b4fc;"><span style="color:#4338ca;font-weight:700;font-size:24px;">${name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span></div>`}
            <div style="position:absolute;bottom:-4px;right:-4px;background:#ef4444;color:#ffffff;font-size:6px;font-weight:700;padding:2px 6px;border-radius:9999px;">${bloodGroup}</div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;color:#1f2937;font-size:16px;border-bottom:2px solid #c7d2fe;padding-bottom:2px;margin-bottom:2px;">${name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:12px;">
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Father</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${fatherName}</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Mother</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${motherName}</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">DOB</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${dob}</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Contact</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;"><span style="color:#374151;font-size:9px;font-weight:500;">${phone}</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;grid-column:span 2;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Address</span><span style="color:#374151;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">${address}</span></div>
              <div style="display:flex;align-items:baseline;gap:4px;grid-column:span 2;"><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;">Class</span><span style="color:#1f2937;font-size:9px;font-weight:700;">${grade} ${section ? `- ${section}` : ''}</span><span style="color:#4338ca;font-size:8px;font-weight:700;text-transform:uppercase;margin-left:8px;">Adm. No.</span><span style="color:#1f2937;font-size:9px;font-weight:700;">${admissionNo}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Print single card
  const printSingleCard = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const element = cardRef.current;
    const htmlContent = element.outerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ID Card</title>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            background: #f0f0f0;
          }
          * { box-sizing: border-box; }
          .id-card-container {
            transform: scale(1.5);
            transform-origin: center;
          }
          @media print {
            body { background: white; padding: 0; }
            .id-card-container { transform: scale(1); }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="id-card-container">
          ${htmlContent}
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print bulk cards
  const printBulkCards = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    let cardsHTML = '';
    generatedCards.forEach((student, index) => {
      setCurrentCardIndex(index);
      const element = cardRef.current;
      if (element) {
        cardsHTML += element.outerHTML;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ID Cards</title>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            background: white;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          * { box-sizing: border-box; }
          .id-card-container {
            page-break-inside: avoid;
          }
          @media print {
            body { padding: 10px; gap: 10px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${cardsHTML}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // DESIGN 1: Classic Heritage - INLINE STYLES ONLY (Landscape: 8.56cm x 5.40cm)
  const renderDesign1 = (student, image) => {
    const basicInfo = student.basicInfo || {};
    const name = basicInfo.name || 'Student Name';
    const admissionNo = basicInfo.admissionNo || 'N/A';
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const fatherName = basicInfo.fatherName || 'N/A';
    const motherName = basicInfo.motherName || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || 'N/A';
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
          borderTop: '2px solid #a5b4fc',
          borderLeft: '2px solid #a5b4fc',
          borderTopLeftRadius: '8px'
        }}></div>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '24px',
          height: '24px',
          borderTop: '2px solid #a5b4fc',
          borderRight: '2px solid #a5b4fc',
          borderTopRightRadius: '8px'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '24px',
          height: '24px',
          borderBottom: '2px solid #a5b4fc',
          borderLeft: '2px solid #a5b4fc',
          borderBottomLeftRadius: '8px'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '24px',
          height: '24px',
          borderBottom: '2px solid #a5b4fc',
          borderRight: '2px solid #a5b4fc',
          borderBottomRightRadius: '8px'
        }}></div>
        
        <div style={{
          position: 'absolute',
          left: '24px',
          right: '24px',
          top: '6px',
          borderTop: '1px solid #c7d2fe'
        }}></div>
        <div style={{
          position: 'absolute',
          left: '24px',
          right: '24px',
          bottom: '6px',
          borderTop: '1px solid #c7d2fe'
        }}></div>
        
        <div style={{
          backgroundColor: '#e0e7ff',
          padding: '6px 16px',
          textAlign: 'center',
          position: 'relative',
          borderBottom: '2px solid #a5b4fc'
        }}>
          <div style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px'
          }}>🛡</div>
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px'
          }}>🛡</div>
          <div style={{
            color: '#312e81',
            fontWeight: 900,
            fontSize: '14px',
            letterSpacing: '0.05em'
          }}>
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div style={{
            color: '#4338ca',
            fontWeight: 700,
            fontSize: '8px',
            letterSpacing: '0.1em'
          }}>
            {schoolInfo.schoolAffiliation || 'EST. 1985 • GOVT. RECOGNISED'}
          </div>
        </div>

        <div style={{
          padding: '10px',
          display: 'flex',
          gap: '12px'
        }}>
          <div style={{
            flexShrink: 0,
            position: 'relative'
          }}>
            {image ? (
              <div style={{
                width: '70px',
                height: '85px',
                borderRadius: '4px',
                border: '2px solid #a5b4fc',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <img src={image} alt="Student" style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }} />
              </div>
            ) : (
              <div style={{
                width: '70px',
                height: '85px',
                borderRadius: '4px',
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #a5b4fc',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <span style={{
                  color: '#4338ca',
                  fontWeight: 700,
                  fontSize: '24px'
                }}>
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

          <div style={{
            flex: 1,
            minWidth: 0
          }}>
            <h3 style={{
              fontWeight: 700,
              color: '#1f2937',
              fontSize: '16px',
              borderBottom: '2px solid #c7d2fe',
              paddingBottom: '2px',
              marginBottom: '2px'
            }}>{name}</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2px 8px',
              fontSize: '12px'
            }}>
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
                <span style={{ color: '#1f2937', fontSize: '9px', fontWeight: 700 }}>{admissionNo}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // DESIGN 2: Modern Vertical - INLINE STYLES ONLY (Portrait: 5.40cm x 8.56cm)
  const renderDesign2 = (student, image) => {
    const basicInfo = student.basicInfo || {};
    const name = basicInfo.name || 'Student Name';
    const admissionNo = basicInfo.admissionNo || 'N/A';
    const grade = basicInfo.grade || 'N/A';
    const section = basicInfo.section || 'N/A';
    const fatherName = basicInfo.fatherName || 'N/A';
    const motherName = basicInfo.motherName || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || 'N/A';
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
        position: 'relative',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          height: '6px',
          backgroundColor: '#6366f1'
        }}></div>
        
        <div style={{
          padding: '12px 12px 8px 12px',
          textAlign: 'center',
          backgroundColor: '#e0e7ff',
          borderBottom: '2px solid #a5b4fc'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 900,
            color: '#312e81',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div style={{
            fontSize: '6px',
            fontWeight: 700,
            color: '#4338ca',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginTop: '2px'
          }}>
            {schoolInfo.schoolAffiliation || 'EDUCATION FOR ALL'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '8px',
          paddingBottom: '4px'
        }}>
          <div style={{
            position: 'relative'
          }}>
            {image ? (
              <div style={{
                width: '75px',
                height: '95px',
                borderRadius: '12px',
                border: '2px solid #a5b4fc',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                backgroundColor: '#ffffff'
              }}>
                <img src={image} alt="Student" style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }} />
              </div>
            ) : (
              <div style={{
                width: '75px',
                height: '95px',
                borderRadius: '12px',
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #a5b4fc',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                <span style={{
                  color: '#4338ca',
                  fontWeight: 700,
                  fontSize: '20px'
                }}>
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

        <div style={{
          textAlign: 'center',
          marginTop: '4px'
        }}>
          <h3 style={{
            fontWeight: 700,
            color: '#1f2937',
            fontSize: '14px',
            lineHeight: '1.2',
            margin: 0
          }}>{name}</h3>
          <div style={{
            fontSize: '7px',
            color: '#4f46e5',
            fontWeight: 700
          }}>#{admissionNo}</div>
        </div>

        <div style={{
          padding: '6px 12px',
          flex: 1
        }}>
          <div style={{
            fontSize: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e0e7ff',
              paddingBottom: '2px',
              marginBottom: '2px'
            }}>
              <span style={{ color: '#4338ca', fontWeight: 700 }}>Father</span>
              <span style={{ color: '#374151', fontWeight: 500, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fatherName}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e0e7ff',
              paddingBottom: '2px',
              marginBottom: '2px'
            }}>
              <span style={{ color: '#4338ca', fontWeight: 700 }}>Mother</span>
              <span style={{ color: '#374151', fontWeight: 500, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{motherName}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e0e7ff',
              paddingBottom: '2px',
              marginBottom: '2px'
            }}>
              <span style={{ color: '#4338ca', fontWeight: 700 }}>DOB</span>
              <span style={{ color: '#374151', fontWeight: 500 }}>{dob}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e0e7ff',
              paddingBottom: '2px',
              marginBottom: '2px'
            }}>
              <span style={{ color: '#4338ca', fontWeight: 700 }}>Class</span>
              <span style={{ color: '#1f2937', fontWeight: 700 }}>{grade} {section ? `- ${section}` : ''}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#4338ca', fontWeight: 700 }}>Contact</span>
              <span style={{ color: '#374151', fontWeight: 500 }}>{phone}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // DESIGN 3: Premium Split - INLINE STYLES ONLY (Portrait: 5.40cm x 8.56cm)
  const renderDesign3 = (student, image) => {
    const basicInfo = student.basicInfo || {};

    const name = basicInfo.name || 'Student Name';
    const grade = basicInfo.grade || 'Class';
    const section = basicInfo.section || 'Section';
    const admissionNo = basicInfo.admissionNo || 'N/A';
    const phone = basicInfo.fatherPhone || basicInfo.motherPhone || 'N/A';
    const dob = basicInfo.dob || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';

    return (
      <div
        style={{
          width: '204px',
          height: '323px',
          backgroundColor: '#ffffff',
          border: '1px solid #968d8d',
          overflow: 'hidden',
          display: 'flex',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <div
          style={{
            width: '55px',
            height: '100%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid #000000',
            backgroundColor: '#1a1a2e'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              whiteSpace: 'nowrap',
              lineHeight: '1.5'
            }}
          >
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
          <div style={{
            position: 'relative'
          }}>
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
                  alt="Student"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280'
                }}>
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

          <div style={{
            marginTop: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#000000'
            }}>
              {name}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#1f2937'
            }}>
              {grade} {section ? `- ${section}` : ''}
            </div>
            <div style={{
              fontSize: '9px',
              color: '#374151'
            }}>
              {phone}
            </div>
            <div style={{
              fontSize: '9px',
              color: '#374151'
            }}>
              {dob}
            </div>
            <div style={{
              fontSize: '8px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              ID: {admissionNo}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render function
  const renderIdCard = (student, image) => {
    if (!student) return null;

    switch (selectedDesign) {
      case 'design2':
        return renderDesign2(student, image);
      case 'design3':
        return renderDesign3(student, image);
      default:
        return renderDesign1(student, image);
    }
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    setSelectedStudentForEdit(student);
    setEditFormData({
      name: student.basicInfo?.name || '',
      admissionNo: student.basicInfo?.admissionNo || '',
      grade: student.basicInfo?.grade || '',
      section: student.basicInfo?.section || '',
      fatherName: student.basicInfo?.fatherName || '',
      motherName: student.basicInfo?.motherName || '',
      dob: student.basicInfo?.dob || '',
      fatherPhone: student.basicInfo?.fatherPhone || '',
      motherPhone: student.basicInfo?.motherPhone || '',
      address: student.basicInfo?.address || '',
      bloodGroup: student.basicInfo?.bloodGroup || '',
      religion: student.basicInfo?.religion || '',
      nationality: student.basicInfo?.nationality || '',
    });
    setShowEditModal(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      const updatedStudents = students.map(s => {
        if (s.studentId === selectedStudentForEdit.studentId) {
          return {
            ...s,
            basicInfo: {
              ...s.basicInfo,
              ...editFormData
            }
          };
        }
        return s;
      });
      setStudents(updatedStudents);
      toast.success('Student updated successfully!');
      setShowEditModal(false);
      setSelectedStudentForEdit(null);
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  };

  return (
    <div className="space-y-6">
      {/* Design Selection */}
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
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                  selectedDesign === key
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

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, admission no, father name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

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

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <Search size={18} />
              <span>Search</span>
            </button>
            {(searchTerm || selectedGrade || selectedSection) && (
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
          <span>Search students to generate ID cards individually or in bulk</span>
        </div>
      </div>

      {/* Results Section with Table */}
      {hasSearched && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-600">
              {isLoading ? (
                <span>Loading...</span>
              ) : (
                <>
                  Found <span className="font-semibold text-gray-800">{filteredStudents.length}</span> student(s)
                  {searchTerm && <span className="ml-1">matching "<span className="font-medium">{searchTerm}</span>"</span>}
                  {selectedGrade && <span className="ml-1">in Grade <span className="font-medium">{selectedGrade}</span></span>}
                  {selectedSection && <span className="ml-1">Section <span className="font-medium">{selectedSection}</span></span>}
                </>
              )}
            </div>
            {filteredStudents.length > 0 && (
              <button
                onClick={generateBulkCards}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm"
              >
                <FileText size={16} />
                <span>Generate All ID Cards ({filteredStudents.length})</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader className="animate-spin text-indigo-600" size={40} />
                <p className="text-gray-500">Loading students...</p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-gray-400" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No students found</h4>
              <p className="text-gray-500">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admission No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Section</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Father Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Photo</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student, index) => (
                      <tr key={student.studentId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {student.basicInfo?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{student.basicInfo?.name || 'Unnamed'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{student.basicInfo?.admissionNo || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.basicInfo?.grade || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.basicInfo?.section || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.basicInfo?.fatherName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.basicInfo?.fatherPhone || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {student.basicInfo?.photoUrl ? (
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
                              onClick={() => generateSingleCard(student)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Generate ID Card"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEditStudent(student)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Student"
                            >
                              <Edit size={18} />
                            </button>
                            <button                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this student?')) {
                                  toast.info('Delete functionality will be implemented');
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Student"
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

      {/* Initial State */}
      {!hasSearched && !isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <School size={48} className="text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Generate ID Cards</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Search for students to generate individual or bulk ID cards with professional designs
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm text-gray-400">
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Student Name</span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Admission No</span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Father Name</span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Phone Number</span>
          </div>
        </div>
      )}

      {/* Single ID Card Preview Modal */}
      {showPreview && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">ID Card Preview</h2>
                <p className="text-sm text-gray-500">{selectedStudent.basicInfo?.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedStudent(null);
                  setStudentImage(null);
                  setStudentImageFile(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {/* Image Upload Button */}
              <div className="mb-4 w-full max-w-md">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-indigo-600" />
                    <span className="text-sm text-gray-600">Student Photo</span>
                  </div>
                  <div className="flex gap-2">
                    {studentImage && (
                      <button
                        onClick={deleteStudentPhoto}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                        disabled={isUploading}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-1 disabled:opacity-50"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      <span>{isUploading ? 'Uploading...' : studentImage ? 'Change' : 'Upload'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUploadWithServer}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {studentImage && !isUploading && (
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
                  {renderIdCard(selectedStudent, studentImage)}
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

      {/* Bulk ID Cards Preview Modal */}
      {showBulkPreview && generatedCards.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Bulk ID Cards</h2>
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
                  {renderIdCard(generatedCards[currentCardIndex], 
                    generatedCards[currentCardIndex]?.basicInfo?.photoUrl || null
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
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
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

      {/* Edit Student Modal */}
      {showEditModal && selectedStudentForEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Student</h2>
                <p className="text-sm text-gray-500">Update student information</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedStudentForEdit(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admission No</label>
                  <input
                    type="text"
                    value={editFormData.admissionNo || ''}
                    onChange={(e) => setEditFormData({...editFormData, admissionNo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <select
                    value={editFormData.grade || ''}
                    onChange={(e) => setEditFormData({...editFormData, grade: e.target.value})}
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
                    onChange={(e) => setEditFormData({...editFormData, section: e.target.value})}
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
                    onChange={(e) => setEditFormData({...editFormData, fatherName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mother Name</label>
                  <input
                    type="text"
                    value={editFormData.motherName || ''}
                    onChange={(e) => setEditFormData({...editFormData, motherName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editFormData.dob || ''}
                    onChange={(e) => setEditFormData({...editFormData, dob: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={editFormData.bloodGroup || ''}
                    onChange={(e) => setEditFormData({...editFormData, bloodGroup: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father Phone</label>
                  <input
                    type="tel"
                    value={editFormData.fatherPhone || ''}
                    onChange={(e) => setEditFormData({...editFormData, fatherPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mother Phone</label>
                  <input
                    type="tel"
                    value={editFormData.motherPhone || ''}
                    onChange={(e) => setEditFormData({...editFormData, motherPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedStudentForEdit(null);
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