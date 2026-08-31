// src/Components/Billing.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Eye, FileText, Receipt, X, Plus, Trash2, Loader, User, Printer, Download, Users, Clock } from 'lucide-react';
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

  // Handle generate invoice
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
      const student = students.find(s => s.studentId === invoiceData.studentId);
      
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

      const result = await StudentApi.createInvoice(invoicePayload);
      
      if (result.success) {
        setGeneratedInvoice(result.invoice);
        toast.success(`Invoice ${result.invoice.invoiceNumber} generated successfully!`);
        setShowInvoiceModal(false);
        setShowPreviewModal(true);
        resetInvoiceForm();
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

  // Reset invoice form 
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

  // Render Invoice Preview Content with inline styles
  const renderInvoicePreview = (invoice) => {
    const styles = {
      container: {
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '32px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#1f2937'
      },
      header: {
        textAlign: 'center',
        borderBottom: '2px solid #4f46e5',
        paddingBottom: '24px',
        marginBottom: '24px'
      },
      headerTitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#4f46e5',
        margin: 0
      },
      headerSub: {
        color: '#6b7280',
        fontSize: '14px',
        marginTop: '4px'
      },
      detailsRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px'
      },
      detailsText: {
        fontSize: '14px',
        margin: '4px 0'
      },
      detailsLabel: {
        fontWeight: '600',
        color: '#374151'
      },
      studentBox: {
        backgroundColor: '#f3f4f6',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        borderLeft: '4px solid #4f46e5'
      },
      studentTitle: {
        fontWeight: '600',
        color: '#374151',
        marginBottom: '12px',
        fontSize: '14px'
      },
      studentGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px 30px',
        fontSize: '14px'
      },
      studentText: {
        margin: '4px 0'
      },
      studentLabel: {
        fontWeight: '600',
        color: '#374151'
      },
      table: {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '20px 0'
      },
      tableHead: {
        backgroundColor: '#4f46e5',
        color: 'white'
      },
      tableHeaderCenter: {
        padding: '12px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: '600'
      },
      tableHeader: {
        padding: '12px',
        textAlign: 'left',
        fontSize: '13px',
        fontWeight: '600'
      },
      tableHeaderRight: {
        padding: '12px',
        textAlign: 'right',
        fontSize: '13px',
        fontWeight: '600'
      },
      tableRow: {
        borderBottom: '1px solid #e5e7eb'
      },
      tableCell: {
        padding: '10px',
        fontSize: '14px'
      },
      tableCellCenter: {
        padding: '10px',
        textAlign: 'center',
        fontSize: '14px'
      },
      tableCellRight: {
        padding: '10px',
        textAlign: 'right',
        fontSize: '14px'
      },
      totalBox: {
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#eef2ff',
        borderRadius: '8px'
      },
      totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      },
      totalLabel: {
        fontWeight: '600',
        color: '#374151'
      },
      totalAmount: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#4f46e5'
      },
      notesBox: {
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      },
      notesTitle: {
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px',
        fontSize: '14px'
      },
      notesText: {
        color: '#6b7280',
        fontSize: '14px',
        margin: 0
      },
      footer: {
        marginTop: '32px',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '12px',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '16px'
      },
      footerText: {
        marginTop: '4px',
        fontSize: '11px'
      }
    };

    return (
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>INVOICE</h1>
          <p style={styles.headerSub}>Payment Receipt</p>
        </div>

        {/* Invoice Details */}
        <div style={styles.detailsRow}>
          <div>
            <p style={styles.detailsText}>
              <span style={styles.detailsLabel}>Invoice Number:</span> {invoice.invoiceNumber}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={styles.detailsText}>
              <span style={styles.detailsLabel}>Date:</span> {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Student Details */}
        <div style={styles.studentBox}>
          <h3 style={styles.studentTitle}>STUDENT DETAILS</h3>
          <div style={styles.studentGrid}>
            <p style={styles.studentText}>
              <span style={styles.studentLabel}>Name:</span> {invoice.studentName || 'N/A'}
            </p>
            <p style={styles.studentText}>
              <span style={styles.studentLabel}>Admission Number:</span> {invoice.studentAdmission || 'N/A'}
            </p>
            <p style={styles.studentText}>
              <span style={styles.studentLabel}>Grade:</span> {invoice.studentGrade || 'N/A'} - {invoice.studentSection || 'N/A'}
            </p>
            <p style={styles.studentText}>
              <span style={styles.studentLabel}>Father's Name:</span> {invoice.studentFather || 'N/A'}
            </p>
            <p style={styles.studentText}>
              <span style={styles.studentLabel}>Phone:</span> {invoice.studentPhone || 'N/A'}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <h3 style={{ fontWeight: '600', color: '#374151', marginBottom: '12px' }}>INVOICE ITEMS</h3>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHead}>
              <th style={{ ...styles.tableHeaderCenter, width: '10%' }}>#</th>
              <th style={{ ...styles.tableHeader, width: '45%' }}>Description</th>
              <th style={{ ...styles.tableHeaderRight, width: '20%' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCellCenter}>{index + 1}</td>
                <td style={styles.tableCell}>{item.description}</td>
                <td style={styles.tableCellRight}>₹{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={styles.totalBox}>
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>Total Amount:</span>
            <span style={styles.totalAmount}>₹{invoice.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={styles.notesBox}>
            <h4 style={styles.notesTitle}>NOTES</h4>
            <p style={styles.notesText}>{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>This is a system generated invoice</p>
        </div>
      </div>
    );
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
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach(el => {
              if (el.style.color && el.style.color.includes('oklch')) {
                el.style.color = '#1f2937';
              }
              if (el.style.backgroundColor && el.style.backgroundColor.includes('oklch')) {
                el.style.backgroundColor = '#ffffff';
              }
              if (el.className && typeof el.className === 'string') {
                const classes = el.className.split(' ');
                const safeClasses = classes.filter(cls => 
                  !cls.includes('oklch') && 
                  !cls.includes('bg-') && 
                  !cls.includes('text-')
                );
                el.className = safeClasses.join(' ');
              }
            });
          }
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

  // Print Invoice with exact design
  const printInvoice = (invoice) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const itemsHTML = invoice.items.map((item, index) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
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
            border-bottom: 2px solid #4f46e5; 
            padding-bottom: 24px; 
            margin-bottom: 24px; 
          }
          .header h1 { 
            color: #4f46e5; 
            font-size: 28px; 
            font-weight: bold;
            margin: 0;
          }
          .header p {
            color: #6b7280;
            font-size: 14px;
            margin-top: 4px;
          }
          .invoice-details { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 24px;
            padding: 16px;
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
            margin-bottom: 24px; 
            padding: 16px; 
            background: #f3f4f6; 
            border-radius: 8px;
            border-left: 4px solid #4f46e5;
          }
          .student-details h3 { 
            margin: 0 0 12px 0; 
            color: #374151; 
            font-size: 14px;
            font-weight: 600;
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
          .items-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
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
          th:first-child {
            text-align: center;
            width: 10%;
          }
          th:nth-child(2) {
            width: 45%;
          }
          th:nth-child(3) {
            text-align: right;
            width: 20%;
          }
          th:last-child {
            text-align: right;
            width: 25%;
          }
          td { 
            padding: 10px; 
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          td:first-child {
            text-align: center;
          }
          td:nth-child(3),
          td:last-child {
            text-align: right;
          }
          .total { 
            margin-top: 24px; 
            padding: 16px; 
            background: #eef2ff; 
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total .label {
            font-weight: 600;
            color: #374151;
          }
          .total .amount {
            font-size: 24px;
            font-weight: bold;
            color: #4f46e5;
          }
          .notes { 
            margin-top: 24px; 
            padding: 16px; 
            background: #f9fafb; 
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .notes h4 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 14px;
            font-weight: 600;
          }
          .notes p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
          }
          .footer { 
            text-align: center; 
            margin-top: 32px; 
            color: #9ca3af; 
            font-size: 12px; 
            border-top: 1px solid #e5e7eb; 
            padding-top: 16px;
          }
          .footer p {
            margin-top: 4px;
            font-size: 11px;
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
            font-weight: 500;
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
            .invoice-container { 
              box-shadow: none; 
              padding: 30px;
              border-radius: 0;
            }
          }
          @media (max-width: 640px) {
            .student-grid { grid-template-columns: 1fr; }
            .invoice-details { flex-direction: column; gap: 10px; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <button class="print-btn no-print" onclick="window.print()">
            <span style="margin-right: 8px;">🖨️</span> Print Invoice
          </button>
          <button class="print-btn secondary no-print" onclick="window.close()">
            <span style="margin-right: 8px;">✕</span> Close
          </button>
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
            <div style="text-align: right;">
              <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          
          <div class="student-details">
            <h3>STUDENT DETAILS</h3>
            <div class="student-grid">
              <p><strong>Name:</strong> ${invoice.studentName || 'N/A'}</p>
              <p><strong>Admission Number:</strong> ${invoice.studentAdmission || 'N/A'}</p>
              <p><strong>Grade:</strong> ${invoice.studentGrade || 'N/A'} - ${invoice.studentSection || 'N/A'}</p>
              <p><strong>Father's Name:</strong> ${invoice.studentFather || 'N/A'}</p>
              <p><strong>Phone:</strong> ${invoice.studentPhone || 'N/A'}</p>
            </div>
          </div>
          
          <h3 class="items-title">INVOICE ITEMS</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div class="total">
            <span class="label">Total Amount:</span>
            <span class="amount">₹${invoice.total.toLocaleString()}</span>
          </div>
          
          ${invoice.notes ? `
            <div class="notes">
              <h4>NOTES</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>This is a system generated invoice</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Function to handle new invoice button
  const handleNewInvoice = (student) => {
    setSelectedStudent(student);
    setInvoiceData(prev => ({ 
      ...prev, 
      studentId: student.studentId 
    }));
    setShowInvoiceModal(true);
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

                    {/* Two Action Buttons - New Invoice & Previous Invoices */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => handleNewInvoice(student)}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <FileText size={16} />
                        <span>New Invoice</span>
                      </button>
                      <button
                        onClick={() => viewStudentInvoices(student)}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Clock size={16} />
                        <span>Previous Invoices</span>
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
            Enter a student name, admission number, father name, or phone number above to find students and manage invoices
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
                  onClick={() => downloadPDF(generatedInvoice)}
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
                  onClick={() => printInvoice(generatedInvoice)}
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
              {generatedInvoice && renderInvoicePreview(generatedInvoice)}
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
                <h2 className="text-2xl font-bold text-gray-900">Previous Invoices</h2>
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
                  <p className="text-gray-500">This student has no previous invoices</p>
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