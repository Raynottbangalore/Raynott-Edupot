// src/components/dashboard/components/FeesInstallment.jsx
import React, { useState } from 'react';
import { Plus, Trash2, Save, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi'; // Adjust path as needed

// Module-level cache for school info (avoid refetching per installment)
let __schoolInfoCache = null;
let __schoolInfoPromise = null;

const FeesInstallment = ({ student, onUpdateStudent }) => {
  const [showCustomStatus, setShowCustomStatus] = useState({});
  const [customStatusText, setCustomStatusText] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Local pending changes — key = installment.id
  const [localChanges, setLocalChanges] = useState({});

  const studentId = student.studentId || student.id;

  // ────────────────────────────────────────────────
  // School info helpers (cached)
  // ────────────────────────────────────────────────
  const loadSchoolInfo = async () => {
    if (__schoolInfoCache) return __schoolInfoCache;
    if (__schoolInfoPromise) return __schoolInfoPromise;

    __schoolInfoPromise = (async () => {
      try {
        const res = await StudentApi.getSchoolInfo();
        if (res.success && res.data) {
          __schoolInfoCache = res.data;
          return res.data;
        }
      } catch (err) {
        console.warn('Could not load school info:', err);
      } finally {
        __schoolInfoPromise = null;
      }
      return null;
    })();

    return __schoolInfoPromise;
  };

  const getSchoolName = async () => {
    const info = await loadSchoolInfo();
    return (
      info?.name?.trim() ||
      info?.schoolName?.trim() ||
      'Your School Name'
    );
  };

  // ────────────────────────────────────────────────
  // WhatsApp helpers
  // ────────────────────────────────────────────────
  const normalizePhone = (phone) => {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const buildInstallmentMessage = (inst) => {
    const amount = Number(inst.amount) || 0;
    const paid = Number(inst.paid) || 0;
    const due = Math.max(amount - paid, 0);
    const status = (inst.status || 'pending').toLowerCase();

    const parentName = student.basicInfo?.fatherName || 'Parent';
    const studentName = student.basicInfo?.name || 'your child';
    const grade = student.basicInfo?.grade || 'N/A';
    const section = student.basicInfo?.section || '';
    const classInfo = section ? `${grade}-${section}` : grade;
    const installmentNo = inst.number ?? '—';

    let title = '';
    let body = '';

    switch (status) {
      //  Fully paid
      case 'paid':
      case 'completed': {
        title = ' *Payment Received*';
        body =
          `We have received *₹${paid.toLocaleString()}* for *${studentName}* ` +
          `(Class ${classInfo}) towards *Installment ${installmentNo}*.`;
        break;
      }

      //  Partially paid
      case 'partial': {
        title = ' *Partial Payment Received*';
        body =
          `We have received *₹${paid.toLocaleString()}* for *${studentName}* ` +
          `(Class ${classInfo}) towards *Installment ${installmentNo}*.\n` +
          `Outstanding balance: *₹${due.toLocaleString()}* of ₹${amount.toLocaleString()}.`;
        break;
      }

      //  Overdue
      case 'overdue': {
        title = ' *Overdue Fee Notice*';
        body =
          `The fee for *${studentName}* (Class ${classInfo}) — ` +
          `*Installment ${installmentNo}* is *overdue*.\n` +
          `Pending amount: *₹${due.toLocaleString()}* of ₹${amount.toLocaleString()}.\n` +
          `Kindly clear the dues at the earliest to avoid any inconvenience.`;
        break;
      }

      //  Cancelled
      case 'cancelled': {
        title = ' *Installment Cancelled*';
        body =
          `Please note that *Installment ${installmentNo}* for ` +
          `*${studentName}* (Class ${classInfo}) of ₹${amount.toLocaleString()} ` +
          `has been *cancelled*.\n` +
          `If you believe this is an error, please contact the school office.`;
        break;
      }

      //  Refunded
      case 'refunded': {
        title = ' *Refund Processed*';
        const refundAmount = paid > 0 ? paid : amount;
        body =
          `A refund of *₹${refundAmount.toLocaleString()}* has been processed for ` +
          `*${studentName}* (Class ${classInfo}) against *Installment ${installmentNo}*.\n` +
          `The amount will be credited to your original payment method within 5–7 working days.`;
        break;
      }

      // Default — pending
      default: {
        title = ' *Fee Payment Reminder*';
        body =
          `This is a gentle reminder for *${studentName}* (Class ${classInfo}) — ` +
          `*Installment ${installmentNo}* of *₹${amount.toLocaleString()}* is pending.`;
        break;
      }
    }

    const lines = [
      `Dear ${parentName},`,
      '',
      title,
      '',
      body,
    ];

    const showDueDate = ['pending', 'partial', 'overdue'].includes(status);

    const showPaidInfo = ['paid', 'completed', 'partial', 'refunded'].includes(status);

    if (showDueDate && inst.dueDate) {
      lines.push('', ` Due Date: ${formatDate(inst.dueDate)}`);
    }
    if (showPaidInfo && inst.paidDate) {
      lines.push(` Paid Date: ${formatDate(inst.paidDate)}`);
    }
    if (showPaidInfo && inst.paymentMode) {
      lines.push(` Payment Mode: ${inst.paymentMode}`);
    }
    if (inst.notes && String(inst.notes).trim()) {
      lines.push('', ` Note: ${String(inst.notes).trim()}`);
    }

    lines.push('', 'Thank you!');

    return { lines, title, due, paid, amount };
  };
  const sendWhatsApp = async (inst) => {
    try {
      const phone = normalizePhone(student.basicInfo?.fatherPhone);
      if (!phone) {
        toast.error('No phone number available for this student');
        return;
      }

      const base = student.installments?.find(i => i.id === inst.id) || inst;

      const { lines } = buildInstallmentMessage(base);
      const schoolName = await getSchoolName();

      lines.push('', `— *${schoolName}*`);

      const text = encodeURIComponent(lines.join('\n'));
      const url = `https://wa.me/${phone}?text=${text}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('WhatsApp send failed:', err);
      toast.error('Failed to open WhatsApp');
    }
  };

  // ────────────────────────────────────────────────
  // Refresh from backend after successful operations
  // ────────────────────────────────────────────────
  const refreshStudent = async () => {
    try {
      const res = await StudentApi.getStudent(studentId);
      if (res.success && res.student) {
        onUpdateStudent(res.student);
        setLocalChanges({});
        setShowCustomStatus({});
        setCustomStatusText({});
      } else {
        console.warn("Refresh didn't return valid student", res);
      }
    } catch (err) {
      console.error("Failed to refresh student data", err);
    }
  };

  const getValue = (instId, field) => {
    if (localChanges[instId]?.hasOwnProperty(field)) {
      return localChanges[instId][field];
    }
    const inst = student.installments?.find(i => i.id === instId);
    const val = inst?.[field];
    if (['amount', 'paid'].includes(field)) {
      return (val == null || Number(val) === 0) ? '' : val;
    }
    return val ?? '';
  };

  const hasChanges = (instId) => !!localChanges[instId];

  const updateLocal = (instId, field, value) => {
    setLocalChanges(prev => ({
      ...prev,
      [instId]: {
        ...prev[instId],
        [field]: value,
      },
    }));
  };

  const saveInstallment = async (instId) => {
    if (savingId) return;
    setSavingId(instId);
    setErrorMsg(null);

    try {
      const changes = localChanges[instId] || {};
      if (Object.keys(changes).length === 0) return;

      const payload = { ...changes };
      if ('amount' in payload) payload.amount = Number(payload.amount) || 0;
      if ('paid' in payload) payload.paid = Number(payload.paid) || 0;

      const result = await StudentApi.updateInstallment(studentId, instId, payload);

      if (result.success) {
        await refreshStudent();
        toast.success('Installment saved');
      } else {
        setErrorMsg(result.message || result.error || 'Failed to save');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network/server error');
      console.error('Save failed:', err);
    } finally {
      setSavingId(null);
    }
  };

  const addInstallment = async () => {
    if (savingId) return;
    setSavingId('add');
    setErrorMsg(null);

    try {
      const count = student.installments?.length || 0;
      const suggested = Math.round((student.feeStructure?.total || 0) / (count + 1)) || 0;

      const newData = {
        amount: suggested,
        dueDate: '',
        paid: 0,
        paidDate: '',
        paymentMode: '',
        notes: '',
      };

      const result = await StudentApi.addInstallment(studentId, newData);

      if (result.success) {
        await refreshStudent();
      } else {
        setErrorMsg(result.error || 'Failed to add installment');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error adding installment');
    } finally {
      setSavingId(null);
    }
  };

  const deleteInstallment = async (instId) => {
    if (savingId) return;
    if (!window.confirm('Delete this installment?')) return;

    setSavingId(instId);
    setErrorMsg(null);

    try {
      const result = await StudentApi.deleteInstallment(studentId, instId);
      if (result.success) {
        await refreshStudent();
      } else {
        setErrorMsg(result.message || result.error || 'Delete failed');
      }
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMsg(err.message || 'Network/server error during delete');
    } finally {
      setSavingId(null);
    }
  };

  const handleStatusChange = (instId, value) => {
    if (value === 'custom') {
      setShowCustomStatus(prev => ({ ...prev, [instId]: true }));
      return;
    }
    updateLocal(instId, 'status', value);
  };

  const saveCustomStatus = (instId) => {
    const custom = (customStatusText[instId] || '').trim();
    if (!custom) return;

    updateLocal(instId, 'status', custom);
    setShowCustomStatus(prev => ({ ...prev, [instId]: false }));
    setCustomStatusText(prev => ({ ...prev, [instId]: '' }));
  };

  const totalFees = student.feeStructure?.total || 0;
  const totalPaid = student.totalPaid || 0;
  const pendingAmount = student.pendingAmount || 0;
  const progress = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'custom', label: 'Custom…' },
  ];

  return (
    <div className="relative">
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Fee Installments</h3>
          <p className="text-sm text-gray-600 mt-1">
            Edit → click <strong>Save</strong> → values & progress update → Send Updates on{' '}
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
              WhatsApp
            </span>
          </p>
        </div>

        <button
          onClick={addInstallment}
          disabled={!!savingId}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 disabled:opacity-60 flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Add Installment
        </button>
      </div>

      <div className="space-y-6">
        {(student.installments || []).map(inst => {
          const isSaving = savingId === inst.id;
          const hasUnsaved = hasChanges(inst.id);
          const currentStatus = getValue(inst.id, 'status') || 'pending';

          return (
            <div
              key={inst.id}
              className={`border rounded-xl p-5 transition-all ${hasUnsaved
                  ? 'border-amber-400 bg-amber-50/40 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full ${currentStatus === 'paid' || currentStatus === 'completed' ? 'bg-green-500' :
                        currentStatus === 'partial' ? 'bg-amber-500' :
                          currentStatus === 'overdue' ? 'bg-orange-500' :
                            'bg-red-500'
                      }`}
                  />
                  <span className="font-bold text-lg text-gray-900">
                    Installment {inst.number}
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                    {currentStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* WhatsApp Button */}
                  <button
                    onClick={() => sendWhatsApp(inst)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                    title="Send update via WhatsApp"
                    type="button"
                  >
                    <MessageCircle size={16} />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => saveInstallment(inst.id)}
                    disabled={isSaving || !hasUnsaved}
                    className={`px-5 py-2 rounded-lg text-white flex items-center gap-2 text-sm font-medium transition ${hasUnsaved && !isSaving
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-green-400 cursor-not-allowed opacity-70'
                      }`}
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>

                  <button
                    onClick={() => deleteInstallment(inst.id)}
                    disabled={isSaving}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>

                {showCustomStatus[inst.id] ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customStatusText[inst.id] || ''}
                      onChange={e => setCustomStatusText(p => ({ ...p, [inst.id]: e.target.value }))}
                      placeholder="Custom status..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      disabled={isSaving}
                    />
                    <button
                      onClick={() => saveCustomStatus(inst.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 text-sm"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomStatus(p => ({ ...p, [inst.id]: false }));
                        setCustomStatusText(p => ({ ...p, [inst.id]: '' }));
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-60 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={currentStatus}
                    onChange={e => handleStatusChange(inst.id, e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={getValue(inst.id, 'amount')}
                    onChange={e => updateLocal(inst.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paid</label>
                  <input
                    type="number"
                    value={getValue(inst.id, 'paid')}
                    onChange={e => updateLocal(inst.id, 'paid', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={getValue(inst.id, 'dueDate')}
                    onChange={e => updateLocal(inst.id, 'dueDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paid Date</label>
                  <input
                    type="date"
                    value={getValue(inst.id, 'paidDate')}
                    onChange={e => updateLocal(inst.id, 'paidDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                  <select
                    value={getValue(inst.id, 'paymentMode')}
                    onChange={e => updateLocal(inst.id, 'paymentMode', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                    disabled={isSaving}
                  >
                    <option value="">— Select —</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={getValue(inst.id, 'notes')}
                    onChange={e => updateLocal(inst.id, 'notes', e.target.value)}
                    placeholder="Transaction ID, remarks, etc..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 min-h-[90px]"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 p-6 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl border border-amber-200">
        <h4 className="font-semibold text-gray-800 mb-4 text-lg">Fee Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-600">Total Fees</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalFees.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-2xl font-bold text-green-700">₹{totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-red-700">₹{pendingAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Installments</p>
            <p className="text-2xl font-bold text-blue-700">{student.installments?.length || 0}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-700 mb-2 font-medium">
            <span>Collection Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeesInstallment;