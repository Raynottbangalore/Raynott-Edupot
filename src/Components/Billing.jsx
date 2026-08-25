// src/Components/Billing.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Download, Eye, Printer, Mail, Calendar, DollarSign, Users, CreditCard, TrendingUp, AlertCircle, CheckCircle, Clock, XCircle,Receipt,FileText,Send,ArrowLeft,ChevronRight,RefreshCw,Settings,Trash2,Edit,Save,X,Loader,User,Building,Phone,Mail as MailIcon,MapPin,Home,School} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';

const Billing = ({ students = [], onUpdateStudent }) => {
  // State
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSectionData, setSelectedSectionData] = useState(null);
  const [viewMode, setViewMode] = useState('class');
  const [invoiceData, setInvoiceData] = useState({
    studentId: '',
    items: [{ description: '', amount: 0, quantity: 1 }],
    dueDate: '',
    notes: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  // Get unique grades and sections for filtering
  const grades = useMemo(() => 
    [...new Set(students.map(s => s.basicInfo?.grade).filter(Boolean))].sort(),
    [students]
  );
  const sections = useMemo(() => 
    [...new Set(students.map(s => s.basicInfo?.section).filter(Boolean))].sort(),
    [students]
  );

  // Group students by class and section for billing overview
  const getGroupedClasses = useMemo(() => {
    const groups = new Map();
    
    students.forEach(student => {
      const grade = student.basicInfo?.grade || 'Unassigned';
      const section = student.basicInfo?.section || 'Unassigned';
      const key = `${grade}-${section}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          grade,
          section,
          students: [],
          totalInvoiced: 0,
          totalPaid: 0,
          totalPending: 0,
          studentCount: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0
        });
      }
      
      const group = groups.get(key);
      const pending = student.pendingAmount || 0;
      const paid = student.totalPaid || 0;
      
      group.students.push(student);
      group.totalInvoiced += student.feeStructure?.total || 0;
      group.totalPaid += paid;
      group.totalPending += pending;
      group.studentCount++;
      
      if (pending === 0) group.paidCount++;
      else if (paid > 0) group.partialCount++;
      else group.pendingCount++;
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return a.section.localeCompare(b.section);
    });
  }, [students]);

  // Calculate overall summary
  const summary = useMemo(() => {
    const total = {
      totalInvoiced: 0,
      totalPaid: 0,
      totalPending: 0,
      paidCount: 0,
      partialCount: 0,
      pendingCount: 0,
      totalStudents: students.length,
      totalClasses: getGroupedClasses.length
    };

    students.forEach(student => {
      const pending = student.pendingAmount || 0;
      const paid = student.totalPaid || 0;
      
      total.totalInvoiced += student.feeStructure?.total || 0;
      total.totalPaid += paid;
      total.totalPending += pending;
      
      if (pending === 0) total.paidCount++;
      else if (paid > 0) total.partialCount++;
      else total.pendingCount++;
    });

    return total;
  }, [students, getGroupedClasses]);

  // Filter students
  const getFilteredStudents = (studentsList) => {
    return studentsList.filter(student => {
      const pendingAmount = student.pendingAmount || 0;
      const paidAmount = student.totalPaid || 0;
      
      let feeStatus = 'pending';
      if (pendingAmount === 0) feeStatus = 'paid';
      else if (paidAmount > 0) feeStatus = 'partial';
      
      const matchesSearch = !searchTerm || 
        student.basicInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.basicInfo?.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.basicInfo?.fatherName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !selectedStatus || feeStatus === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  };

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = invoices.length + 1;
    return `INV-${year}${month}-${String(count).padStart(4, '0')}`;
  };

  // Handle invoice generation
  const handleGenerateInvoice = async () => {
    if (!invoiceData.studentId) {
      toast.error('Please select a student');
      return;
    }

    setIsLoading(true);
    try {
      const newInvoice = {
        ...invoiceData,
        invoiceNumber: generateInvoiceNumber(),
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        total: invoiceData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
      };
 
      setInvoices(prev => [newInvoice, ...prev]);
      toast.success('Invoice generated successfully!');
      setShowGenerateInvoiceModal(false);
      setInvoiceData({
        studentId: '',
        items: [{ description: '', amount: 0, quantity: 1 }],
        dueDate: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment
  const handlePayment = async () => {
    if (!selectedInvoice) return;
    
    setIsLoading(true);
    try {
      // Update invoice status
      const updatedInvoice = {
        ...selectedInvoice,
        status: paymentData.amount >= selectedInvoice.total ? 'paid' : 'partial',
        payments: [
          ...(selectedInvoice.payments || []),
          {
            ...paymentData,
            date: new Date().toISOString().split('T')[0]
          }
        ]
      };

      setInvoices(prev => prev.map(inv => 
        inv.invoiceNumber === selectedInvoice.invoiceNumber ? updatedInvoice : inv
      ));
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setPaymentData({
        amount: 0,
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle class/section click
  const handleClassClick = (grade, section, studentsList) => {
    setSelectedClass({ grade, section });
    setSelectedSectionData({
      grade,
      section,
      students: studentsList,
      totalInvoiced: studentsList.reduce((sum, s) => sum + (s.feeStructure?.total || 0), 0),
      totalPaid: studentsList.reduce((sum, s) => sum + (s.totalPaid || 0), 0),
      totalPending: studentsList.reduce((sum, s) => sum + (s.pendingAmount || 0), 0),
      studentCount: studentsList.length,
      paidCount: studentsList.filter(s => (s.pendingAmount || 0) === 0).length,
      partialCount: studentsList.filter(s => (s.pendingAmount || 0) > 0 && (s.totalPaid || 0) > 0).length,
      pendingCount: studentsList.filter(s => (s.pendingAmount || 0) > 0 && (s.totalPaid || 0) === 0).length
    });
    setViewMode('students');
  };

  // Back to classes view
  const handleBackToClasses = () => {
    setSelectedClass(null);
    setSelectedSectionData(null);
    setViewMode('class');
    setSearchTerm('');
    setSelectedStatus('');
  };

  const getFeeStatusColor = (student) => {
    const pending = student.pendingAmount || 0;
    const paid = student.totalPaid || 0;
    
    if (pending === 0) return 'bg-green-100 text-green-800 border-green-200';
    if (paid > 0) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getFeeStatusText = (student) => {
    const pending = student.pendingAmount || 0;
    const paid = student.totalPaid || 0;
    
    if (pending === 0) return 'Paid';
    if (paid > 0) return 'Partial';
    return 'Pending';
  };

  // Render Class/Section View
  const renderClassView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {getGroupedClasses.map((group) => {
        const progress = group.totalInvoiced > 0 ? Math.round((group.totalPaid / group.totalInvoiced) * 100) : 0;
        
        return (
          <div 
            key={`${group.grade}-${group.section}`}
            onClick={() => handleClassClick(group.grade, group.section, group.students)}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                    <School size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Grade {group.grade}</h3>
                    <p className="text-sm text-gray-600">Section {group.section}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-indigo-600 transition-colors" size={24} />
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Users size={18} className="text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{group.studentCount}</p>
                  <p className="text-xs text-gray-500">Total Students</p>
                </div>
                <div className="text-center">
                  <DollarSign size={18} className="text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{progress}%</p>
                  <p className="text-xs text-gray-500">Collection Rate</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Fee Collection</span>
                  <span className="font-medium text-indigo-700">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold text-green-600">{group.paidCount}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Partial:</span>
                  <span className="font-semibold text-amber-600">{group.partialCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-semibold text-red-600">{group.pendingCount}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Fees:</span>
                  <span className="font-semibold text-gray-800">₹{group.totalInvoiced.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Collected:</span>
                  <span className="font-semibold text-green-600">₹{group.totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-semibold text-red-600">₹{group.totalPending.toLocaleString()}</span>
                </div>
              </div>

              <button 
                className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClassClick(group.grade, group.section, group.students);
                }}
              >
                <Eye size={16} />
                <span>View Billing</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render Students View
  const renderStudentsView = () => {
    if (!selectedSectionData) return null;
    
    const filteredStudents = getFilteredStudents(selectedSectionData.students);
    const { grade, section, totalInvoiced, totalPaid, totalPending, studentCount, paidCount, partialCount, pendingCount } = selectedSectionData;
    const progress = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 gap-7">
              <button
                onClick={handleBackToClasses}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Billing: Grade {grade} - Section {section}
                </h2>
                <p className="text-gray-500 mt-1">Managing billing for {studentCount} students</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-500">Collection Progress</p>
                <p className="text-2xl font-bold text-indigo-600">{progress}%</p>
              </div>
              <div className="w-32">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <button
                onClick={() => setShowGenerateInvoiceModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>New Invoice</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
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
                <DollarSign size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Invoiced</p>
                <p className="text-xl font-bold text-gray-800">₹{totalInvoiced.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Amount</p>
                <p className="text-xl font-bold text-red-600">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CreditCard size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Collection Rate</p>
                <p className="text-xl font-bold text-indigo-600">{progress}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
              Paid: {paidCount}
            </div>
            <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
              Partial: {partialCount}
            </div>
            <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
              Pending: {pendingCount}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder={`Search students in Grade ${grade} - Section ${section}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Fee Status</option>
                <option value="paid">Paid (No Dues)</option>
                <option value="partial">Partial Payment</option>
                <option value="pending">Pending (No Payment)</option>
              </select>
            </div>
          </div>

          {(searchTerm || selectedStatus) && (
            <div className="flex justify-end mt-3">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('');
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Student Cards */}
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="text-gray-400" size={32} />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No students found</h4>
              <p className="text-gray-600">
                {searchTerm || selectedStatus
                  ? "Try adjusting your filters"
                  : "No students with billing records in this class"}
              </p>
            </div>
          ) : (
            filteredStudents.map(student => (
              <div
                key={student.id || student.studentId}
                className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {student.basicInfo?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">
                            {student.basicInfo?.name || 'Unnamed'}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getFeeStatusColor(student)}`}>
                            {getFeeStatusText(student)}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 mt-2">
                          <span>Adm: {student.basicInfo?.admissionNo || '—'}</span>
                          <span>Phone: {student.basicInfo?.fatherPhone || '—'}</span>
                          <span>Total: ₹{(student.feeStructure?.total || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="hidden md:block w-48">
                        <div className="text-xs text-gray-600 mb-1">Fee Progress</div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-green-600">₹{(student.totalPaid || 0).toLocaleString()}</span>
                          <span className="font-medium text-red-600">₹{(student.pendingAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full"
                            style={{ width: `${((student.totalPaid || 0) / (student.feeStructure?.total || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setInvoiceData(prev => ({ ...prev, studentId: student.studentId }));
                          setShowGenerateInvoiceModal(true);
                        }}
                        className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Generate Invoice"
                      >
                        <FileText size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                        }}
                        className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Invoices"
                      >
                        <Receipt size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Summary */}
                  <div className="mt-4 md:hidden border-t pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Total</p>
                        <p className="font-semibold">₹{(student.feeStructure?.total || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Paid</p>
                        <p className="font-semibold text-green-600">₹{(student.totalPaid || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Pending</p>
                        <p className="font-semibold text-red-600">₹{(student.pendingAmount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Generate Invoice Modal
  const renderGenerateInvoiceModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Generate Invoice</h2>
          <button
            onClick={() => setShowGenerateInvoiceModal(false)}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Student *</label>
              <select
                value={invoiceData.studentId}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, studentId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a student</option>
                {students.map(student => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.basicInfo?.name} ({student.basicInfo?.admissionNo}) - Grade {student.basicInfo?.grade} {student.basicInfo?.section}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Invoice Items</label>
                <button
                  onClick={() => setInvoiceData(prev => ({
                    ...prev,
                    items: [...prev.items, { description: '', amount: 0, quantity: 1 }]
                  }))}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center space-x-1"
                >
                  <Plus size={16} />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {invoiceData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-lg">
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...invoiceData.items];
                          newItems[index].description = e.target.value;
                          setInvoiceData(prev => ({ ...prev, items: newItems }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...invoiceData.items];
                          newItems[index].amount = parseFloat(e.target.value) || 0;
                          setInvoiceData(prev => ({ ...prev, items: newItems }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...invoiceData.items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setInvoiceData(prev => ({ ...prev, items: newItems }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="1"
                        min="1"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => {
                          if (invoiceData.items.length > 1) {
                            const newItems = invoiceData.items.filter((_, i) => i !== index);
                            setInvoiceData(prev => ({ ...prev, items: newItems }));
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-indigo-700">
                    ₹{invoiceData.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={() => setShowGenerateInvoiceModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateInvoice}
              disabled={isLoading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2 disabled:opacity-50 transition"
            >
              {isLoading ? (
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
  );

  // Render main
  if (viewMode === 'students' && selectedSectionData) {
    return (
      <>
        {renderStudentsView()}
        {showGenerateInvoiceModal && renderGenerateInvoiceModal()}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-3xl font-bold text-gray-800">{summary.totalClasses}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <School className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-800">{summary.totalStudents}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-3xl font-bold text-gray-800">₹{summary.totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <CreditCard className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-3xl font-bold text-gray-800">₹{summary.totalPending.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-lg">
              <DollarSign className="text-red-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Collection Rate</p>
              <p className="text-3xl font-bold text-gray-800">
                {summary.totalInvoiced > 0 
                  ? Math.round((summary.totalPaid / summary.totalInvoiced) * 100) 
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-amber-200 rounded-lg">
              <TrendingUp className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoiced</p>
              <p className="text-3xl font-bold text-gray-800">₹{summary.totalInvoiced.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-indigo-200 rounded-lg">
              <Receipt className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-800">Classes & Sections</h3>
          <span className="text-sm text-gray-500">({getGroupedClasses.length} classes)</span>
        </div>
        <button
          onClick={() => {
            setInvoiceData({
              studentId: '',
              items: [{ description: '', amount: 0, quantity: 1 }],
              dueDate: '',
              notes: ''
            });
            setShowGenerateInvoiceModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Classes Grid */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <School size={32} className="text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">No classes found</h4>
          <p className="text-gray-500">Add students to create classes and sections for billing</p>
        </div>
      ) : (
        renderClassView()
      )}

      {/* Modals */}
      {showGenerateInvoiceModal && renderGenerateInvoiceModal()}
    </div>
  );
};

export default Billing;