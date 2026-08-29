// src/Components/Billing.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search,Eye,FileText,Receipt,X,Plus,Trash2,Loader,User,Printer,Download,Users} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';
import html2pdf from 'html2pdf.js';

const Billing = () => {
  // State
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [studentInvoices, setStudentInvoices] = useState([]);
  const [showStudentInvoices, setShowStudentInvoices] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Refs for PDF generation
  const invoiceRef = useRef(null);
  
  // Invoice form state 
  const [invoiceData, setInvoiceData] = useState({
    studentId: '',
    items: [{ description: '', amount: '', quantity: 1 }],
    dueDate: '',
    notes: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Sample invoice for preview
  // const sampleInvoice = {
  //   invoiceNumber: 'INV-2024-0001',
  //   date: new Date().toISOString().split('T')[0],
  //   dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  //   studentName: 'Rahul Sharma',
  //   studentAdmission: 'ADM-2024-001',
  //   studentGrade: '10',
  //   studentSection: 'A',
  //   studentFather: 'Mr. Rajesh Sharma',
  //   studentPhone: '+91 9876543210',
  //   items: [
  //     { description: 'Tuition Fee', amount: 5000, quantity: 1 },
  //     { description: 'Lab Fee', amount: 1000, quantity: 1 },
  //     { description: 'Library Fee', amount: 500, quantity: 1 }
  //   ],
  //   total: 6500,
  //   status: 'pending',
  //   notes: 'Please make the payment before the due date'
  // };

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  // Apply filters whenever search or filters change
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
          basicInfo: stu.basicInfo || {},
          feeStructure: stu.feeStructure || {},
          totalPaid: stu.totalPaid || 0,
          pendingAmount: stu.pendingAmount || 0,
          installments: stu.installments || []
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
  const grades = useMemo(() => {
    const gradeSet = new Set();
    students.forEach(s => {
      if (s.basicInfo?.grade) gradeSet.add(s.basicInfo.grade);
    });
    return Array.from(gradeSet).sort();
  }, [students]);

  const sections = useMemo(() => {
    const sectionSet = new Set();
    students.forEach(s => {
      if (s.basicInfo?.section) sectionSet.add(s.basicInfo.section);
    });
    return Array.from(sectionSet).sort();
  }, [students]);

  // Handle generate invoice - UPDATED to use API
  const handleGenerateInvoice = async () => {
    if (!invoiceData.studentId) {
      toast.error('Please select a student');
      return;
    }

    const hasValidItems = invoiceData.items.some(item => 
      item.description.trim() && item.amount > 0
    );
    if (!hasValidItems) {
      toast.error('Please add at least one valid item with description and amount');
      return;
    }

    setIsSaving(true);
    try {
      // Get student details
      const student = students.find(s => s.studentId === invoiceData.studentId);
      
      // Prepare invoice data for API
      const invoicePayload = {
        studentId: invoiceData.studentId,
        studentName: student?.basicInfo?.name || '',
        studentAdmission: student?.basicInfo?.admissionNo || '',
        studentGrade: student?.basicInfo?.grade || '',
        studentSection: student?.basicInfo?.section || '',
        studentFather: student?.basicInfo?.fatherName || '',
        studentPhone: student?.basicInfo?.fatherPhone || '',
        items: invoiceData.items.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount) || 0,
          quantity: parseInt(item.quantity) || 1
        })),
        dueDate: invoiceData.dueDate,
        notes: invoiceData.notes,
        date: invoiceData.date
      };

      // Call API to create invoice
      const result = await StudentApi.createInvoice(invoicePayload);
      
      if (result.success) {
        setGeneratedInvoice(result.invoice);
        toast.success(`Invoice ${result.invoice.invoiceNumber} generated successfully!`);
        
        // Close invoice modal and open preview
        setShowInvoiceModal(false);
        setShowPreviewModal(true);
        resetInvoiceForm();
        
        // Refresh students to update pending amounts
        await loadStudents();
      } else {
        toast.error(result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset invoice form - EMPTY FIELDS
  const resetInvoiceForm = () => {
    setInvoiceData({
      studentId: '',
      items: [{ description: '', amount: '', quantity: 1 }],
      dueDate: '',
      notes: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedStudent(null);
  };

  // Add item row
  const addItemRow = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', amount: '', quantity: 1 }]
    }));
  };

  // Remove item row
  const removeItemRow = (index) => {
    if (invoiceData.items.length <= 1) {
      toast.warning('At least one item is required');
      return;
    }
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item
  const updateItem = (index, field, value) => {
    setInvoiceData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Calculate total
  const calculateTotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + ((parseFloat(item.amount) || 0) * (parseInt(item.quantity) || 1)), 0);
  };

  // View student's invoices 
  const viewStudentInvoices = async (student) => {
    try {
      const result = await StudentApi.getInvoicesByStudent(student.studentId);
      if (result.success) {
        setStudentInvoices(result.invoices || []);
        setSelectedStudent(student);
        setShowStudentInvoices(true);
      } else {
        toast.error('Failed to load invoices');
      }
    } catch (error) {
      console.error('Error loading student invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  // Download PDF using html2pdf
  const downloadPDF = async (invoice) => {
    if (!invoiceRef.current) {
      toast.error('Invoice not ready');
      return;
    }

    setIsDownloading(true);
    try {
      const element = invoiceRef.current;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Invoice
  const printInvoice = (invoice) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const statusColor = invoice.status === 'paid' ? '#16a34a' : 
                       invoice.status === 'partial' ? '#d97706' : '#dc2626';
    const statusBg = invoice.status === 'paid' ? '#dcfce7' : 
                    invoice.status === 'partial' ? '#fef3c7' : '#fee2e2';

    const itemsHTML = invoice.items.map((item, index) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.amount.toLocaleString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.amount * item.quantity).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            padding: 40px; 
            color: #1f2937; 
            background: #f9fafb;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            padding: 40px;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #4f46e5; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .header h1 { 
            color: #4f46e5; 
            font-size: 32px; 
            letter-spacing: 2px;
            margin: 0;
          }
          .header p {
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
          }
          .invoice-details { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .invoice-details p {
            margin: 4px 0;
            font-size: 14px;
          }
          .invoice-details strong {
            color: #374151;
          }
          .student-details { 
            margin-bottom: 30px; 
            padding: 20px; 
            background: #f3f4f6; 
            border-radius: 8px;
            border-left: 4px solid #4f46e5;
          }
          .student-details h3 { 
            margin: 0 0 12px 0; 
            color: #4f46e5; 
            font-size: 16px;
          }
          .student-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 30px;
            font-size: 14px;
          }
          .student-grid p {
            margin: 4px 0;
          }
          .student-grid strong {
            color: #374151;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          th { 
            background: #4f46e5; 
            color: white; 
            padding: 12px; 
            text-align: left; 
            font-size: 13px;
            font-weight: 600;
          }
          th:last-child, td:last-child {
            text-align: right;
          }
          td { 
            padding: 10px; 
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          tr:hover {
            background: #f9fafb;
          }
          .total { 
            text-align: right; 
            font-size: 20px; 
            font-weight: bold; 
            margin: 20px 0; 
            padding: 20px; 
            background: #eef2ff; 
            border-radius: 8px;
            color: #4f46e5;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 13px;
            background: ${statusBg};
            color: ${statusColor};
          }
          .notes { 
            margin-top: 30px; 
            padding: 20px; 
            background: #f9fafb; 
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .notes h4 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 14px;
          }
          .notes p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            color: #9ca3af; 
            font-size: 12px; 
            border-top: 1px solid #e5e7eb; 
            padding-top: 20px;
          }
          .print-btn { 
            background: #4f46e5; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer; 
            margin: 0 10px 20px 0;
          }
          .print-btn:hover { 
            background: #4338ca; 
          }
          .print-btn.secondary {
            background: #6b7280;
          }
          .print-btn.secondary:hover {
            background: #4b5563;
          }
          @media print {
            .no-print { display: none !important; }
            body { background: white; padding: 20px; }
            .invoice-container { box-shadow: none; padding: 20px; }
            tr:hover { background: transparent; }
          }
          @media (max-width: 640px) {
            .student-grid { grid-template-columns: 1fr; }
            .invoice-details { flex-direction: column; gap: 10px; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <button class="print-btn no-print" onclick="window.print()">Print Invoice</button>
          <button class="print-btn secondary no-print" onclick="window.close()">Close</button>
        </div>
        
        <div class="invoice-container">
          <div class="header">
            <h1>INVOICE</h1>
            <p>Payment Receipt</p>
          </div>
          
          <div class="invoice-details">
            <div>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              </div>
              <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>         
          </div>
          
          <div class="student-details">
            <h3>Student Details</h3>
            <div class="student-grid">
              <p><strong>Name:</strong> ${invoice.studentName || 'N/A'}</p>
              <p><strong>Admission Number:</strong> ${invoice.studentAdmission || 'N/A'}</p>
              <p><strong>Grade:</strong> ${invoice.studentGrade || 'N/A'} - ${invoice.studentSection || 'N/A'}</p>
              <p><strong>Father's Name:</strong> ${invoice.studentFather || 'N/A'}</p>
              <p><strong>Phone:</strong> ${invoice.studentPhone || 'N/A'}</p>
            </div>
          </div>
          
          <h3 style="margin: 20px 0 10px 0; color: #374151;">Invoice Items</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 10%; text-align: center;">#</th>
                <th style="width: 45%;">Description</th>
                <th style="width: 20%; text-align: right;">Amount (₹)</th>
                <th style="width: 15%; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="total">
            Total Amount: ₹${invoice.total.toLocaleString()}
          </div>
          
          ${invoice.notes ? `
            <div class="notes">
              <h4>Notes</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p style="margin-top: 4px; font-size: 11px;">This is a system generated invoice</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Render Invoice Preview Content
  const renderInvoicePreview = (invoice) => {
    const statusColor = invoice.status === 'paid' ? '#16a34a' : 
                       invoice.status === 'partial' ? '#d97706' : '#dc2626';
    const statusBg = invoice.status === 'paid' ? '#dcfce7' : 
                    invoice.status === 'partial' ? '#fef3c7' : '#fee2e2';

    return (
      <div className="border rounded-xl p-8 bg-white" id="invoice-content">
        {/* Header */}
        <div className="text-center border-b-2 border-indigo-600 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-600">INVOICE</h1>
          <p className="text-gray-500 text-sm mt-1">Payment Receipt</p>
        </div>

        {/* Invoice Details */}
        <div className="flex justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm"><span className="font-semibold">Invoice Number:</span> {invoice.invoiceNumber}</p>
            {/* <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p> */}
          </div>
          <div className="text-right">
            <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
           
            {/* <p className="text-sm"><span className="font-semibold">Due Date:</span> {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p> */}
            {/* <p className="text-sm">
              <span className="font-semibold">Status:</span>{' '}
              <span className={`px-3 py-1 rounded-full text-sm font-medium`}
                style={{ backgroundColor: statusBg, color: statusColor }}>
                {invoice.status.toUpperCase()}
              </span>
            </p> */}
          </div>
        </div>

        {/* Student Details */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 border-l-4 border-indigo-600">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">STUDENT DETAILS</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="font-semibold">Name:</span> {invoice.studentName || 'N/A'}</p>
            <p><span className="font-semibold">Admission Number:</span> {invoice.studentAdmission || 'N/A'}</p>
            <p><span className="font-semibold">Grade:</span> {invoice.studentGrade || 'N/A'} - {invoice.studentSection || 'N/A'}</p>
            <p><span className="font-semibold">Father's Name:</span> {invoice.studentFather || 'N/A'}</p>
            <p><span className="font-semibold">Phone:</span> {invoice.studentPhone || 'N/A'}</p>
          </div>
        </div>

        {/* Items Table */}
        <h3 className="font-semibold text-gray-800 mb-3">INVOICE ITEMS</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="p-3 text-left text-sm"></th>
              <th className="p-3 text-left text-sm">Description</th>
              <th className="p-3 text-center text-sm">Amount (₹)</th>
              {/* <th className="p-3 text-center text-sm">Quantity</th> */}
              <th className="p-3 text-center text-sm">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-3 text-center">{index + 1}</td>
                <td className="p-3">{item.description}</td>
                <td className="p-3 text-center">₹{item.amount.toLocaleString()}</td>
                {/* <td className="p-3 text-center">{item.quantity}</td> */}
                <td className="p-3 text-center">₹{(item.amount * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total Amount:</span>
            <span className="text-2xl font-bold text-indigo-700">
              ₹{invoice.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2 text-sm">NOTES</h4>
            <p className="text-gray-600 text-sm">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm border-t pt-4">
          <p className="text-xs mt-1">This is a system generated invoice</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
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
          <span>Search by student name, admission number, father name, or phone number</span>
        </div>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <>
          <div className="flex items-center justify-between">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStudents.map(student => (
                <div
                  key={student.studentId}
                  className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {student.basicInfo?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {student.basicInfo?.name || 'Unnamed'}
                          </h3>
                          <p className="text-xs text-gray-500">#{student.basicInfo?.admissionNo || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Student Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Grade</span>
                        <span className="font-medium text-gray-800">
                          {student.basicInfo?.grade || '—'} {student.basicInfo?.section ? `- ${student.basicInfo.section}` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Father</span>
                        <span className="font-medium text-gray-800">{student.basicInfo?.fatherName || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-medium text-gray-800">{student.basicInfo?.fatherPhone || '—'}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setInvoiceData(prev => ({ 
                            ...prev, 
                            studentId: student.studentId 
                          }));
                          setShowInvoiceModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <FileText size={16} />
                        <span>New Invoice</span>
                      </button>
                      <button
                        onClick={() => viewStudentInvoices(student)}
                        className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                        title="View Invoices"
                      >
                        <Receipt size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {!hasSearched && !isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-indigo-400" size={48} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Search for Students</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Enter a student name, admission number, father name, or phone number above to find students and generate invoices
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm text-gray-400">
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Student Name</span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Admission No</span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Father Name</span>
            <span className="px-3 py-1 bg-gray-50 rounded-full border border-gray-200">Phone Number</span>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Generate Invoice</h2>
                {selectedStudent && (
                  <p className="text-sm text-gray-500 mt-1">
                    Student: {selectedStudent.basicInfo?.name} ({selectedStudent.basicInfo?.admissionNo})
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  resetInvoiceForm();
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Invoice Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Invoice Items</label>
                    <button
                      onClick={addItemRow}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {invoiceData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-lg">
                        <div className="col-span-6">
                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Item description"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Amount (₹)</label>
                          <input
                            type="number"
                            value={item.amount || ''}
                            onChange={(e) => updateItem(index, 'amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="0"
                            min="0"
                            step="1"
                          />
                        </div>
                        {/* <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity || 1}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="1"
                            min="1"
                          />
                        </div> */}
                        <div className="col-span-1">
                          <label className="block text-xs text-gray-600 mb-1">Total</label>
                          <div className="text-sm font-semibold text-gray-800 py-2 px-1">
                            ₹{((parseFloat(item.amount) || 0) * (parseInt(item.quantity) || 1)).toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <button
                            onClick={() => removeItemRow(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={invoiceData.items.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800">Total Amount:</span>
                      <span className="text-2xl font-bold text-indigo-700">
                        ₹{calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Due Date */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div> */}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    placeholder="Additional notes or payment instructions..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    resetInvoiceForm();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={isSaving || !invoiceData.studentId}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2 disabled:opacity-50 transition"
                >
                  {isSaving ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={18} />
                      <span>Generate Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Invoice Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {generatedInvoice ? generatedInvoice.invoiceNumber : 'Sample Invoice'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadPDF(generatedInvoice )}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={() => printInvoice(generatedInvoice )}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <Printer size={18} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setGeneratedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="p-8" ref={invoiceRef}>
              {renderInvoicePreview(generatedInvoice )}
            </div>
          </div>
        </div>
      )}

      {/* Student Invoices Modal */}
      {showStudentInvoices && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedStudent.basicInfo?.name} ({selectedStudent.basicInfo?.admissionNo})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStudentInvoices(false);
                  setSelectedStudent(null);
                  setStudentInvoices([]);
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-6">
              {studentInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="text-gray-400" size={32} />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No invoices found</h4>
                  <p className="text-gray-500">This student has no invoices yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentInvoices.map((invoice, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-indigo-600">₹{invoice.total.toLocaleString()}</p>
                          <span className={`px-2 py-1 text-xs rounded-full
                            ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'}`}>
                            {invoice.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setGeneratedInvoice(invoice);
                            setShowStudentInvoices(false);
                            setShowPreviewModal(true);
                          }}
                          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                        >
                          <Eye size={14} />
                          Preview
                        </button>
                        <button
                          onClick={() => downloadPDF(invoice)}
                          disabled={isDownloading}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <Loader className="animate-spin" size={14} />
                          ) : (
                            <Download size={14} />
                          )}
                          Download
                        </button>
                        <button
                          onClick={() => printInvoice(invoice)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                        >
                          <Printer size={14} />
                          Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;