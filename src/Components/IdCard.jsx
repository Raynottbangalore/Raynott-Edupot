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

  // Design templates - 3 completely different designs
  const designs = {
    design1: {
      name: 'Classic',
      icon: <Layout size={20} />,
      description: 'Traditional Indian school ID card with royal border and emblem',
      primaryColor: 'from-indigo-700 to-indigo-900',
      accentColor: 'from-amber-400 to-amber-600',
      bgPattern: 'bg-pattern-1'
    },
    design2: {
      name: 'Modern',
      icon: <Star size={20} />,
      description: 'Clean contemporary design with gradient accents and icons',
      primaryColor: 'from-cyan-500 to-blue-600',
      accentColor: 'from-pink-400 to-rose-500',
      bgPattern: 'bg-pattern-2'
    },
    design3: {
      name: 'Premium',
      icon: <Award size={20} />,
      description: 'Elegant premium design with gold accents and sophisticated styling',
      primaryColor: 'from-amber-700 to-amber-900',
      accentColor: 'from-yellow-400 to-amber-500',
      bgPattern: 'bg-pattern-3'
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
        format: [85, 54]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 85, 54);
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
      const cardWidth = 85;
      const cardHeight = 54;
      const marginX = 10;
      const marginY = 15;
      const gapX = 5;
      const gapY = 5;

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

  // DESIGN 1: Classic Heritage - Traditional with royal borders and emblem
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
    const religion = basicInfo.religion || 'N/A';
    const nationality = basicInfo.nationality || 'N/A';

    return (
      <div className="w-[340px] h-[220px] bg-white rounded-xl shadow-2xl border-4 border-double border-amber-600 overflow-hidden relative font-serif">
        {/* Decorative corner patterns */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-700 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-700 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-700 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-700 rounded-br-lg"></div>
        
        {/* Decorative line */}
        <div className="absolute left-8 right-8 top-2 border-t-2 border-amber-300/50"></div>
        <div className="absolute left-8 right-8 bottom-2 border-t-2 border-amber-300/50"></div>
        
        {/* School Name Header with Emblem */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 px-4 py-2 text-center relative">
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <Shield size={20} className="text-yellow-300" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Shield size={20} className="text-yellow-300" />
          </div>
          <div className="text-white font-bold text-sm tracking-wider">
            {schoolInfo.schoolName || 'SCHOOL NAME'}
          </div>
          <div className="text-amber-200 text-[8px] font-medium tracking-widest">
            {schoolInfo.schoolAffiliation || 'EST. 1985 • GOVT. RECOGNISED'}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex gap-3">
          {/* Photo with traditional frame */}
          <div className="flex-shrink-0 relative">
            {image ? (
              <div className="w-[75px] h-[90px] rounded border-2 border-amber-700 overflow-hidden shadow-md">
                <img src={image} alt="Student" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-[75px] h-[90px] rounded bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center border-2 border-amber-700 shadow-md">
                <span className="text-white font-bold text-3xl">
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            {/* Blood group badge */}
            <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[6px] font-bold px-2 py-0.5 rounded-full border border-red-400">
              {bloodGroup}
            </div>
          </div>

          {/* Details with traditional styling */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <h3 className="font-bold text-amber-900 text-base border-b border-amber-200 pb-0.5">{name}</h3>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
              <div className="flex items-baseline gap-1">
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider">Father</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-800 text-[9px] font-medium">{fatherName}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider">Mother</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-800 text-[9px] font-medium">{motherName}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider">DOB</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-800 text-[9px] font-medium">{dob}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider">Contact</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-gray-800 text-[9px] font-medium">{phone}</span>
              </div>
              
              <div className="flex items-baseline gap-1 col-span-2">
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider">Address</span>
                <span className="text-gray-800 text-[8px] truncate">{address}</span>
              </div>
              
              <div className="flex items-baseline gap-1 col-span-2">
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider">Class</span>
                <span className="text-gray-800 text-[9px] font-bold">{grade} {section ? `- ${section}` : ''}</span>
                <span className="text-amber-700 text-[8px] font-bold uppercase tracking-wider ml-2">Adm. No.</span>
                <span className="text-gray-800 text-[9px] font-bold">{admissionNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with seal */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1 flex items-center justify-between bg-amber-50 border-t-2 border-amber-300">
          <div className="flex items-center gap-2 text-[7px] text-amber-700">
            <BadgeCheck size={10} className="text-amber-600" />
            <span className="font-bold">PRINCIPAL SIGNATURE</span>
          </div>
          <div className="text-[7px] text-amber-700">
            <span className="font-bold">Valid Till: 2026</span>
          </div>
        </div>
      </div>
    );
  };

  // DESIGN 2: Modern Minimal - Clean contemporary with gradient accents
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

    // return (
    //   <div className="w-[340px] h-[220px] bg-white rounded-2xl shadow-2xl border-0 overflow-hidden relative font-sans">
    //     {/* Modern gradient background overlay */}
    //     <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 opacity-50"></div>
        
    //     {/* Top accent gradient bar */}
    //     <div className="h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600"></div>
        
    //     {/* School Name with modern design */}
    //     <div className="px-5 pt-3 pb-1 flex items-center justify-between">
    //       <div>
    //         <div className="text-xs font-bold text-blue-600 tracking-wider flex items-center gap-1">
    //           <GraduationCap size={12} className="text-blue-600" />
    //           {schoolInfo.schoolName || 'SCHOOL NAME'}
    //         </div>
    //         <div className="text-[7px] text-gray-400 font-medium tracking-wide">
    //           {schoolInfo.schoolAffiliation || 'MODERN EDUCATION SYSTEM'}
    //         </div>
    //       </div>
    //       <div className="flex items-center gap-1">
    //         <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
    //           <Star size={10} className="text-white" />
    //         </div>
    //       </div>
    //     </div>

    //     {/* Content */}
    //     <div className="px-4 py-1 flex gap-3">
    //       {/* Photo with modern frame */}
    //       <div className="flex-shrink-0 relative">
    //         {image ? (
    //           <div className="w-[70px] h-[85px] rounded-xl border-2 border-white shadow-lg overflow-hidden">
    //             <img src={image} alt="Student" className="w-full h-full object-cover" />
    //           </div>
    //         ) : (
    //           <div className="w-[70px] h-[85px] rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center border-2 border-white shadow-lg">
    //             <span className="text-white font-bold text-2xl">
    //               {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
    //             </span>
    //           </div>
    //         )}
    //         {/* Blood group chip */}
    //         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-400 to-rose-500 text-white text-[6px] font-bold px-2 py-0.5 rounded-full shadow-md">
    //           {bloodGroup}
    //         </div>
    //       </div>

    //       {/* Details with modern styling */}
    //       <div className="flex-1 min-w-0">
    //         <div className="flex items-center justify-between">
    //           <h3 className="font-bold text-gray-800 text-sm">{name}</h3>
    //           <span className="text-[7px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
    //             #{admissionNo}
    //           </span>
    //         </div>
            
    //         <div className="space-y-0.5 mt-1">
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <User size={10} className="text-cyan-500" />
    //             <span className="text-gray-500">Father:</span>
    //             <span className="text-gray-700 font-medium">{fatherName}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <User size={10} className="text-pink-500" />
    //             <span className="text-gray-500">Mother:</span>
    //             <span className="text-gray-700 font-medium">{motherName}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <Calendar size={10} className="text-blue-500" />
    //             <span className="text-gray-500">DOB:</span>
    //             <span className="text-gray-700 font-medium">{dob}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <Phone size={10} className="text-green-500" />
    //             <span className="text-gray-500">Contact:</span>
    //             <span className="text-gray-700 font-medium">{phone}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <MapPin size={10} className="text-amber-500" />
    //             <span className="text-gray-500">Class:</span>
    //             <span className="text-gray-700 font-bold">{grade} {section ? `- ${section}` : ''}</span>
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     {/* Footer with modern design */}
    //     <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 flex items-center justify-between bg-gradient-to-r from-cyan-50 to-blue-50 border-t border-blue-100">
    //       <div className="flex items-center gap-2 text-[7px] text-gray-500">
    //         <QrCode size={12} className="text-blue-500" />
    //         <span>ID: {admissionNo}</span>
    //       </div>
    //       <div className="text-[7px] text-gray-500 flex items-center gap-2">
    //         <span className="font-bold text-blue-600">Principal</span>
    //         <span className="w-12 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500"></span>
    //       </div>
    //     </div>
    //   </div>
    // );
  };

  // DESIGN 3: Premium Luxury - Elegant with gold accents
  const renderDesign3 = (student, image) => {
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

    // return (
    //   <div className="w-[340px] h-[220px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl border border-amber-400/30 overflow-hidden relative font-serif">
    //     {/* Gold decorative background pattern */}
    //     <div className="absolute inset-0 opacity-5">
    //       <div className="w-full h-full" style={{
    //         backgroundImage: 'radial-gradient(circle at 20% 50%, #ffd700 1px, transparent 1px)',
    //         backgroundSize: '30px 30px'
    //       }}></div>
    //     </div>
        
    //     {/* Gold corner accents */}
    //     <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-400/60"></div>
    //     <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-400/60"></div>
    //     <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-400/60"></div>
    //     <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-400/60"></div>
        
    //     {/* Gold shimmer line */}
    //     <div className="absolute left-6 right-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
    //     <div className="absolute left-6 right-6 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>

    //     {/* School Name with premium styling */}
    //     <div className="px-5 pt-3 pb-1 text-center">
    //       <div className="flex items-center justify-center gap-2">
    //         <Award size={14} className="text-amber-400" />
    //         <div className="text-amber-400 font-bold text-xs tracking-[0.3em] uppercase">
    //           {schoolInfo.schoolName || 'SCHOOL NAME'}
    //         </div>
    //         <Award size={14} className="text-amber-400" />
    //       </div>
    //       <div className="text-amber-500/60 text-[7px] font-medium tracking-widest mt-0.5">
    //         {schoolInfo.schoolAffiliation || 'PREMIUM INSTITUTION • EST. 1990'}
    //       </div>
    //     </div>

    //     {/* Gold divider */}
    //     <div className="mx-5 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent my-1"></div>

    //     {/* Content */}
    //     <div className="px-4 py-1 flex gap-3">
    //       {/* Photo with premium frame */}
    //       <div className="flex-shrink-0 relative">
    //         {image ? (
    //           <div className="w-[70px] h-[85px] rounded-lg border-2 border-amber-400/60 overflow-hidden shadow-lg shadow-amber-400/20">
    //             <img src={image} alt="Student" className="w-full h-full object-cover" />
    //           </div>
    //         ) : (
    //           <div className="w-[70px] h-[85px] rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center border-2 border-amber-400/60 shadow-lg shadow-amber-400/20">
    //             <span className="text-white font-bold text-2xl">
    //               {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
    //             </span>
    //           </div>
    //         )}
    //         {/* Premium badge */}
    //         <div className="absolute -top-1 -right-1">
    //           <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 text-[5px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
    //             <Star size={6} className="fill-gray-900" />
    //             PREMIUM
    //           </div>
    //         </div>
    //         {/* Blood group */}
    //         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-amber-400/30 text-amber-400 text-[6px] font-bold px-2 py-0.5 rounded-full">
    //           {bloodGroup}
    //         </div>
    //       </div>

    //       {/* Details with premium styling */}
    //       <div className="flex-1 min-w-0">
    //         <div className="flex items-center justify-between">
    //           <h3 className="font-bold text-amber-400 text-sm tracking-wide">{name}</h3>
    //           <Fingerprint size={12} className="text-amber-400/60" />
    //         </div>
            
    //         <div className="space-y-0.5 mt-1">
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <span className="text-amber-500/70 w-8 font-bold text-[7px] tracking-wider">FATHER</span>
    //             <span className="text-gray-300 font-medium">{fatherName}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <span className="text-amber-500/70 w-8 font-bold text-[7px] tracking-wider">MOTHER</span>
    //             <span className="text-gray-300 font-medium">{motherName}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <span className="text-amber-500/70 w-8 font-bold text-[7px] tracking-wider">DOB</span>
    //             <span className="text-gray-300 font-medium">{dob}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <span className="text-amber-500/70 w-8 font-bold text-[7px] tracking-wider">CONTACT</span>
    //             <span className="text-gray-300 font-medium">{phone}</span>
    //           </div>
              
    //           <div className="flex items-center gap-1 text-[8px]">
    //             <span className="text-amber-500/70 w-8 font-bold text-[7px] tracking-wider">CLASS</span>
    //             <span className="text-amber-400 font-bold">{grade} {section ? `- ${section}` : ''}</span>
    //             <span className="text-amber-500/50 ml-1 text-[6px]">ID: {admissionNo}</span>
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     {/* Footer with premium design */}
    //     <div className="absolute bottom-0 left-0 right-0 px-4 py-1 flex items-center justify-between bg-gradient-to-r from-transparent via-amber-400/10 to-transparent border-t border-amber-400/20">
    //       <div className="flex items-center gap-2 text-[6px] text-amber-500/60">
    //         <BadgeCheck size={10} className="text-amber-400" />
    //         <span className="tracking-wider">PRINCIPAL SIGNATURE</span>
    //       </div>
    //       <div className="text-[6px] text-amber-500/60 tracking-wider">
    //         <span>MEMBER • 2025-26</span>
    //       </div>
    //     </div>
    //   </div>
    // );
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
      // Here you would call your API to update the student
      // For now, we'll just update locally
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
                              <div className="text-xs text-gray-500">{student.basicInfo?.email || 'No email'}</div>
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
                                // Handle delete
                                if (window.confirm('Are you sure you want to delete this student?')) {
                                  // Delete logic here
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
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
              <div className="mb-4 w-full">
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
              <div ref={cardRef}>
                {renderIdCard(selectedStudent, studentImage)}
              </div>
              
              <div className="flex gap-3 mt-6 w-full">
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
              <div ref={cardRef}>
                {renderIdCard(generatedCards[currentCardIndex], null)}
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