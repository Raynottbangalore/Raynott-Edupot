// src/Components/IdCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Download, 
  Printer, 
  X, 
  Loader, 
  Users,
  User,
  School,
  MapPin,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  FileText,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Camera,
  Upload,
  Palette,
  Layout,
  Star,
  Award,
  BookOpen,
  GraduationCap,
  Shield,
  CreditCard,
  Fingerprint,
  BadgeCheck,
  QrCode,
  Heart,
  Home,
  User2,
  Building2,
  Hash,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  MoreVertical
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';
import html2canvas from 'html2canvas';
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

  // Design templates - 3 completely different designs
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
          basicInfo: stu.basicInfo || {}
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

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setStudentImage(e.target.result);
        setStudentImageFile(file);
        setShowImageUpload(false);
        toast.success('Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate single ID card
  const generateSingleCard = (student) => {
    setSelectedStudent(student);
    setStudentImage(null);
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

  // Download single PDF
  const downloadSinglePDF = async () => {
    if (!cardRef.current || !selectedStudent) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [54, 85] // Vertical format
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 54, 85);
      pdf.save(`ID-Card-${selectedStudent.basicInfo?.name || 'Student'}.pdf`);
      toast.success('ID Card downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download bulk PDF
  const downloadBulkPDF = async () => {
    if (!cardRef.current || generatedCards.length === 0) return;

    setIsGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const cardsPerPage = 9;
      const cardWidth = 54;
      const cardHeight = 85;
      const marginX = 15;
      const marginY = 15;
      const gapX = 8;
      const gapY = 8;

      for (let i = 0; i < generatedCards.length; i++) {
        const index = i % cardsPerPage;
        const page = Math.floor(i / cardsPerPage);
        
        if (index === 0 && i > 0) {
          pdf.addPage();
        }

        const col = index % 3;
        const row = Math.floor(index / 3);
        
        const x = marginX + (col * (cardWidth + gapX));
        const y = marginY + (row * (cardHeight + gapY));

        setCurrentCardIndex(i);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);
      }

      pdf.save('ID-Cards-Bulk.pdf');
      toast.success('All ID Cards downloaded successfully!');
    } catch (error) {
      console.error('Bulk PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
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

  // DESIGN 1: Classic Heritage - Light/White theme with highlighted school info
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
      <div className="w-[340px] h-[220px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Decorative corner patterns - light gray */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-300 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-300 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-300 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-300 rounded-br-lg"></div>
        
        {/* Decorative line - light gray */}
        <div className="absolute left-6 right-6 top-1.5 border-t border-indigo-200"></div>
        <div className="absolute left-6 right-6 bottom-1.5 border-t border-indigo-200"></div>
        
        {/* School Name Header - Highlighted with bold and background */}
        <div className="bg-gradient-to-r from-indigo-100 via-indigo-50 to-indigo-100 px-4 py-1.5 text-center relative border-b-2 border-indigo-300">
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <Shield size={16} className="text-indigo-700 font-bold" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Shield size={16} className="text-indigo-700 font-bold" />
          </div>
          <div className="text-indigo-900 font-extrabold text-sm tracking-wider">
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div className="text-indigo-700 font-bold text-[8px] tracking-widest">
            {schoolInfo.schoolAffiliation || 'EST. 1985 • GOVT. RECOGNISED'}
          </div>
        </div>

        {/* Content */}
        <div className="p-2.5 flex gap-3">
          {/* Photo with light frame */}
          <div className="flex-shrink-0 relative">
            {image ? (
              <div className="w-[70px] h-[85px] rounded border-2 border-indigo-300 overflow-hidden shadow-sm">
                <img src={image} alt="Student" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-[70px] h-[85px] rounded bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center border-2 border-indigo-300 shadow-sm">
                <span className="text-indigo-700 font-bold text-3xl">
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            {/* Blood group badge */}
            <div className="absolute -bottom-1 -right-1 bg-rose-400 text-white text-[6px] font-bold px-2 py-0.5 rounded-full border border-rose-300">
              {bloodGroup}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <h3 className="font-bold text-gray-800 text-base border-b-2 border-indigo-200 pb-0.5">{name}</h3>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
              <div className="flex items-baseline gap-1">
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider">Father</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-700 text-[9px] font-medium">{fatherName}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider">Mother</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-700 text-[9px] font-medium">{motherName}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider">DOB</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-700 text-[9px] font-medium">{dob}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider">Contact</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-700 text-[9px] font-medium">{phone}</span>
              </div>
              
              <div className="flex items-baseline gap-1 col-span-2">
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider">Address</span>
                <span className="text-gray-700 text-[8px] truncate font-medium">{address}</span>
              </div>
              
              <div className="flex items-baseline gap-1 col-span-2">
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider">Class</span>
                <span className="text-gray-800 text-[9px] font-bold">{grade} {section ? `- ${section}` : ''}</span>
                <span className="text-indigo-700 text-[8px] font-bold uppercase tracking-wider ml-2">Adm. No.</span>
                <span className="text-gray-800 text-[9px] font-bold">{admissionNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Principal Signature at bottom */}
        {/* <div className="absolute bottom-0 left-0 right-0 px-3 py-1 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-indigo-100 border-t-2 border-indigo-300">
          <div className="flex items-center gap-2 text-[7px] text-indigo-800">
            <BadgeCheck size={10} className="text-indigo-600" />
            <span className="font-extrabold">PRINCIPAL SIGNATURE</span>
          </div>
          
        </div> */}
      </div>
    );
  };

  // DESIGN 2: Modern Vertical - With highlighted school info
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
    const address = basicInfo.address || 'N/A';
    const bloodGroup = basicInfo.bloodGroup || 'N/A';

    return (
      <div className="w-[200px] h-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative font-sans flex flex-col">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        {/* School Header - Highlighted with bold and gradient background */}
        <div className="px-3 pt-3 pb-2 text-center bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-b-2 border-indigo-300">
          <div className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div className="text-[6px] font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
            {schoolInfo.schoolAffiliation || 'EDUCATION FOR ALL'}
          </div>
        </div>

        {/* Photo - Centered */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="relative">
            {image ? (
              <div className="w-[75px] h-[95px] rounded-xl border-2 border-indigo-300 overflow-hidden shadow-sm bg-white">
                <img src={image} alt="Student" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-[75px] h-[95px] rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-2 border-indigo-300 shadow-sm">
                <span className="text-indigo-700 font-bold text-2xl">
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            
          </div>
        </div>

        {/* Student Name */}
        <div className="text-center mt-1">
          <h3 className="font-bold text-gray-800 text-sm leading-tight">{name}</h3>
          <div className="text-[7px] text-indigo-600 font-bold">#{admissionNo}</div>
        </div>

        {/* Details in compact grid */}
        <div className="px-3 py-1.5 flex-1">
          <div className="space-y-0.5 text-[8px]">
            <div className="flex justify-between border-b border-indigo-100 pb-0.5">
              <span className="text-indigo-700 font-bold">Father</span>
              <span className="text-gray-700 font-medium truncate max-w-[90px]">{fatherName}</span>
            </div>
            <div className="flex justify-between border-b border-indigo-100 pb-0.5">
              <span className="text-indigo-700 font-bold">Mother</span>
              <span className="text-gray-700 font-medium truncate max-w-[90px]">{motherName}</span>
            </div>
            <div className="flex justify-between border-b border-indigo-100 pb-0.5">
              <span className="text-indigo-700 font-bold">DOB</span>
              <span className="text-gray-700 font-medium">{dob}</span>
            </div>
            <div className="flex justify-between border-b border-indigo-100 pb-0.5">
              <span className="text-indigo-700 font-bold">Class</span>
              <span className="text-gray-800 font-bold">{grade} {section ? `- ${section}` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-700 font-bold">Contact</span>
              <span className="text-gray-700 font-medium">{phone}</span>
            </div>
          </div>
        </div>

        {/* Footer - Principal Signature at bottom */}
        {/* <div className="mt-auto border-t-2 border-indigo-300 px-3 py-1.5 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="text-[7px] text-indigo-800 flex items-center gap-1">
            <BadgeCheck size={10} className="text-indigo-600" />
            <span className="font-extrabold">PRINCIPAL</span>
          </div>
          <div className="text-[6px] text-indigo-600 font-bold">
            <span>{admissionNo}</span>
          </div>
        </div> */}
      </div>
    );
  };

  // DESIGN 3: Premium Split - Vertical text from bottom to top, highlighted school info
  const renderDesign3 = (student, image) => {
  const basicInfo = student.basicInfo || {};

  const name = basicInfo.name || 'Student Name';
  const grade = basicInfo.grade || 'Class';
  const section = basicInfo.section || 'Section';
  const admissionNo = basicInfo.admissionNo || 'N/A';
  const phone = basicInfo.fatherPhone || basicInfo.motherPhone || 'N/A';
  const dob = basicInfo.dob || 'N/A';

  return (
    <div
      className="w-[200px] h-[320px] bg-white border border-black overflow-hidden flex"
      style={{
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* LEFT SIDEBAR - With Background Color */}
      <div
        className="w-[55px] h-full flex-shrink-0 flex items-center justify-center border-r border-black"
        style={{
          background: 'linear-gradient(180deg, #1a1a2e, #16213e, #0f3460)',
        }}
      >
        <div
          className="flex flex-col items-center justify-center text-white"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            whiteSpace: 'nowrap',
            lineHeight: '1.5',
          }}
        >
          {/* School Name - Highlighted with larger font and bold */}
          <span className="font-black text-[13px] tracking-wider">
            {schoolInfo.schoolName || 'ABC SCHOOL'}
          </span>

          {/* Address, Contact, Email in straight line with " || " */}
          <span className="text-[7px] opacity-80 mt-1">
            {schoolInfo.schoolAddress || 'Address'} 
            {' || '}
            {schoolInfo.schoolPhone || 'Phone'} 
            {' || '}
            {schoolInfo.schoolEmail || 'Email'}
          </span>
        </div>
      </div>

      {/* RIGHT CONTENT - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-2">
        
        {/* STUDENT IMAGE - Centered */}
        <div className="w-[70px] h-[85px] border border-black overflow-hidden">
          {image ? (
            <img
              src={image}
              alt="Student"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
              Image
            </div>
          )}
        </div>

        {/* STUDENT DETAILS - Centered, No Labels */}
        <div className="mt-[12px] text-center space-y-[3px]">
          
          {/* Name */}
          <div className="text-[11px] font-bold text-black">
            {name}
          </div>

          {/* Class - Section */}
          <div className="text-[10px] text-gray-800">
            {grade} {section ? `- ${section}` : ''}
          </div>

          {/* Phone */}
          <div className="text-[9px] text-gray-700">
            {phone}
          </div>

          {/* DOB */}
          <div className="text-[9px] text-gray-700">
            {dob}
          </div>

          {/* Admission No */}
          <div className="text-[8px] text-gray-500 mt-1">
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
                            <button
                              onClick={() => {
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
                        onClick={() => {
                          setStudentImage(null);
                          setStudentImageFile(null);
                          toast.info('Image removed');
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                    >
                      <Upload size={14} />
                      <span>{studentImage ? 'Change' : 'Upload'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                {studentImage && (
                  <p className="text-xs text-green-600 mt-1">Image uploaded successfully!</p>
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
                  onClick={downloadSinglePDF}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
                </button>
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
                  {renderIdCard(generatedCards[currentCardIndex], null)}
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
                  onClick={downloadBulkPDF}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>{isGenerating ? 'Generating...' : 'Download All PDF'}</span>
                </button>
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