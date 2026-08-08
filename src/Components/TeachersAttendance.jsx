// src/components/Components/TeachersAttendance.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  School,
  BookOpen,
  Gift,
  Save,
  Loader,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search,
  BarChart3,
  CalendarDays,
  Download,
  ChevronDown,
  Clock,
  User,
  Mail,
  Phone,
  Book,
  GraduationCap,
  Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import TeacherApi from '../service/TeacherApi';

// ────────────────────────────────────────────────
// Calendar Component
// ────────────────────────────────────────────────

const Calendar = ({ selectedDate, onDateSelect, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    const totalSlots = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true
      });
    }
    
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (day, month, year) => {
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const isSelected = (day, month, year) => {
    if (!selectedDate) return false;
    const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
    return day === selDay && month === selMonth - 1 && year === selYear;
  };

  const handleDateClick = (day, month, year) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(dateStr);
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    onDateSelect(todayStr);
  };

  const toggleView = () => {
    setView(view === 'month' ? 'year' : 'month');
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push({
        month: i,
        name: monthNames[i].slice(0, 3),
        hasDate: selectedDate && parseInt(selectedDate.split('-')[0]) === year && parseInt(selectedDate.split('-')[1]) === i + 1
      });
    }

    return (
      <div className="grid grid-cols-4 gap-2 p-2">
        {months.map(({ month, name, hasDate }) => (
          <button
            key={month}
            onClick={() => {
              setCurrentDate(new Date(year, month, 1));
              setView('month');
            }}
            className={`p-3 rounded-lg text-sm font-medium transition ${
              hasDate
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-indigo-50 text-gray-700'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm calendar-dropdown">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          
          <button
            onClick={toggleView}
            className="text-sm font-semibold text-gray-800 hover:text-indigo-600 transition px-2 py-1 rounded-lg hover:bg-indigo-50"
          >
            {view === 'month' 
              ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : currentDate.getFullYear()
            }
          </button>
          
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {view === 'month' ? 'Click date to select' : 'Click month to view days'}
          </span>
          <button
            onClick={goToToday}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition"
          >
            Today
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <>
          <div className="grid grid-cols-7 gap-1 px-2 pt-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 p-2">
            {days.map(({ day, month, year, isCurrentMonth }, index) => {
              const isTodayDate = isToday(day, month, year);
              const isSelectedDate = isSelected(day, month, year);
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day, month, year)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm transition
                    ${isSelectedDate 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' 
                      : isTodayDate 
                        ? 'bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 border-2 border-indigo-300' 
                        : isCurrentMonth 
                          ? 'text-gray-700 hover:bg-gray-100' 
                          : 'text-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        renderYearView()
      )}

      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {selectedDate ? (
            <span>Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}</span>
          ) : (
            <span>No date selected</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded-lg hover:bg-gray-200 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────
// Main Teachers Attendance Component
// ────────────────────────────────────────────────

const TeachersAttendance = ({ onUpdateTeacher }) => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [subjects, setSubjects] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Monthly export states
  const [showMonthlyExport, setShowMonthlyExport] = useState(false);
  const [exportMonth, setExportMonth] = useState('');
  const [exportYear, setExportYear] = useState('');
  const [isExportingMonthly, setIsExportingMonthly] = useState(false);
  
  const loadTimeoutRef = useRef(null);
  const calendarRef = useRef(null);
  const monthlyExportRef = useRef(null);
  
  const todayStr = new Date().toISOString().split('T')[0];

  // ─── Helper Functions ──────────────────────
  const getTeacherName = (teacher) => {
    return teacher.name || teacher.teacherName || 'Unknown';
  };

  const getTeacherSubject = (teacher) => {
    return teacher.subject || 'N/A';
  };

  const getTeacherClasses = (teacher) => {
    return teacher.classesAssigned || [];
  };

  const getStatusInfo = (status) => {
    if (status === 'present') {
      return {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        icon: <CheckCircle size={16} className="text-emerald-600" />,
        label: 'Present'
      };
    } else if (status === 'absent') {
      return {
        color: 'bg-rose-100 text-rose-700 border-rose-300',
        icon: <XCircle size={16} className="text-rose-600" />,
        label: 'Absent'
      };
    } else {
      return {
        color: 'bg-gray-100 text-gray-500 border-gray-300',
        icon: <AlertCircle size={16} className="text-gray-400" />,
        label: 'Unmarked'
      };
    }
  };

  // ─── Load Teachers ──────────────────────────
  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await TeacherApi.getAllTeachers();
      if (result.success) {
        setTeachers(result.teachers || []);
        setFilteredTeachers(result.teachers || []);
        
        // Extract unique subjects
        const uniqueSubjects = [...new Set((result.teachers || []).map(t => t.subject).filter(Boolean))];
        setSubjects(uniqueSubjects);
        
        // Initialize attendance data with null (unmarked)
        const initialAttendance = {};
        (result.teachers || []).forEach(teacher => {
          initialAttendance[teacher.teacherId || teacher.id] = null;
        });
        setAttendanceData(initialAttendance);
      } else {
        toast.error(result.error || 'Failed to load teachers');
      }
    } catch (error) {
      console.error('Load teachers error:', error);
      toast.error('Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Load Attendance ────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!selectedDateStr) return;

    setIsLoading(true);
    try {
      // Get attendance for the selected date from the API
      // Note: You'll need to implement this endpoint in the backend
      // For now, we'll simulate loading from localStorage or default to null
      
      // Try to load from localStorage
      const storageKey = `teacher_attendance_${selectedDateStr}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setAttendanceData(parsedData);
        setHasLoaded(true);
        
        // Update stats
        const present = Object.values(parsedData).filter(v => v === 'present').length;
        const absent = Object.values(parsedData).filter(v => v === 'absent').length;
        const total = Object.keys(parsedData).length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        setAttendanceStats({ present, absent, total, percentage });
        toast.success(`Attendance loaded: ${present} present, ${absent} absent`);
        return;
      }
      
      // If no stored data, initialize with null
      const initialAttendance = {};
      teachers.forEach(teacher => {
        initialAttendance[teacher.teacherId || teacher.id] = null;
      });
      setAttendanceData(initialAttendance);
      setHasLoaded(true);
      toast.info('No attendance records found for this date');
      
    } catch (error) {
      console.error('Load attendance error:', error);
      toast.error('Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateStr, teachers]);

  // ─── Save Attendance ────────────────────────
  const saveAttendance = async () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date');
      return;
    }

    if (teachers.length === 0) {
      toast.warning('No teachers to mark attendance');
      return;
    }

    // Check if any teacher is marked
    const markedCount = Object.values(attendanceData).filter(v => v === 'present' || v === 'absent').length;
    if (markedCount === 0) {
      toast.warning('Please mark attendance for at least one teacher');
      return;
    }

    setIsSaving(true);
    try {
      // Save to localStorage for now (you can replace with API call)
      const storageKey = `teacher_attendance_${selectedDateStr}`;
      localStorage.setItem(storageKey, JSON.stringify(attendanceData));
      
      toast.success(`Attendance saved for ${markedCount} teachers!`);
      
      // Update stats
      const present = Object.values(attendanceData).filter(v => v === 'present').length;
      const absent = Object.values(attendanceData).filter(v => v === 'absent').length;
      const total = Object.keys(attendanceData).length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      setAttendanceStats({ present, absent, total, percentage });
      
      if (onUpdateTeacher) {
        onUpdateTeacher();
      }
    } catch (error) {
      console.error('Save attendance error:', error);
      toast.error('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Functions ──────────────────────

  // Daily Export
  const exportDailyAttendance = async () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date');
      return;
    }

    if (teachers.length === 0) {
      toast.warning('No teachers to export');
      return;
    }

    setIsExporting(true);
    try {
      const formattedDate = new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const headers = ['S.No', 'Teacher Name', 'Subject', 'Classes', 'Date', 'Status'];
      
      const rows = teachers.map((teacher, index) => {
        const status = attendanceData[teacher.teacherId || teacher.id] || 'unmarked';
        const statusDisplay = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Unmarked';
        return [
          index + 1,
          getTeacherName(teacher),
          getTeacherSubject(teacher),
          getTeacherClasses(teacher).join(', '),
          formattedDate,
          statusDisplay
        ];
      });

      rows.push([]);
      rows.push(['Summary', '', '', '', '', '']);
      rows.push(['Total Teachers', teachers.length, '', '', '', '']);
      rows.push(['Present', attendanceStats.present, '', '', '', '']);
      rows.push(['Absent', attendanceStats.absent, '', '', '', '']);
      if (attendanceStats.total > 0) {
        rows.push(['Attendance %', attendanceStats.percentage + '%', '', '', '', '']);
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `teacher_attendance_${selectedDateStr}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Daily attendance exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance');
    } finally {
      setIsExporting(false);
    }
  };

  // Monthly Export
  const exportMonthlyAttendance = async () => {
    if (!exportMonth || !exportYear) {
      toast.warning('Please select month and year');
      return;
    }

    setIsExportingMonthly(true);
    try {
      const month = `${exportYear}-${exportMonth}`;
      const daysInMonth = new Date(parseInt(exportYear), parseInt(exportMonth), 0).getDate();
      
      // Build headers
      const headers = ['S.No', 'Teacher Name', 'Subject'];
      const dateHeaders = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${exportYear}-${exportMonth}-${String(day).padStart(2, '0')}`;
        dateHeaders.push(dateStr);
      }
      const fullHeaders = [...headers, ...dateHeaders, 'Present Days', 'Absent Days', 'Attendance %'];

      const rows = [];
      for (let teacherIndex = 0; teacherIndex < teachers.length; teacherIndex++) {
        const teacher = teachers[teacherIndex];
        const row = [
          teacherIndex + 1,
          getTeacherName(teacher),
          getTeacherSubject(teacher)
        ];

        let presentCount = 0;
        let absentCount = 0;
        let totalDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${exportYear}-${exportMonth}-${String(day).padStart(2, '0')}`;
          const storageKey = `teacher_attendance_${dateStr}`;
          const storedData = localStorage.getItem(storageKey);
          
          let status = '-';
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            const teacherStatus = parsedData[teacher.teacherId || teacher.id];
            if (teacherStatus === 'present') {
              status = 'P';
              presentCount++;
              totalDays++;
            } else if (teacherStatus === 'absent') {
              status = 'A';
              absentCount++;
              totalDays++;
            }
          }
          row.push(status);
        }

        const totalMarked = presentCount + absentCount;
        const percentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;
        row.push(presentCount, absentCount, percentage + '%');
        rows.push(row);
      }

      rows.push([]);
      const summaryRow = ['', '', 'SUMMARY'];
      const emptyDays = Array(daysInMonth).fill('');
      rows.push([...summaryRow, ...emptyDays, '', '', '']);

      const csvContent = [
        fullHeaders.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `teacher_attendance_${exportYear}-${exportMonth}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Monthly attendance exported successfully!`);
    } catch (error) {
      console.error('Monthly export error:', error);
      toast.error('Failed to export monthly attendance');
    } finally {
      setIsExportingMonthly(false);
      setShowMonthlyExport(false);
    }
  };

  // ─── UI Actions ─────────────────────────────
  const setTeacherStatus = (teacherId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: status
    }));
  };

  const markAllPresent = () => {
    const updated = {};
    teachers.forEach(teacher => {
      updated[teacher.teacherId || teacher.id] = 'present';
    });
    setAttendanceData(updated);
    toast.success('All teachers marked as Present');
  };

  const markAllAbsent = () => {
    const updated = {};
    teachers.forEach(teacher => {
      updated[teacher.teacherId || teacher.id] = 'absent';
    });
    setAttendanceData(updated);
    toast.success('All teachers marked as Absent');
  };

  const clearAllMarks = () => {
    const updated = {};
    teachers.forEach(teacher => {
      updated[teacher.teacherId || teacher.id] = null;
    });
    setAttendanceData(updated);
    toast.info('All marks cleared');
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDateStr(dateStr);
    setHasLoaded(false);
    setShowCalendar(false);
  };

  // ─── Effects ──────────────────────────────────
  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    if (!selectedDateStr) {
      setSelectedDateStr(todayStr);
    }
    const now = new Date();
    setExportMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setExportYear(String(now.getFullYear()));
  }, []);

  useEffect(() => {
    if (selectedDateStr && teachers.length > 0 && !hasLoaded) {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      loadTimeoutRef.current = setTimeout(() => {
        loadAttendance();
      }, 300);
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [selectedDateStr, teachers.length, hasLoaded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (monthlyExportRef.current && !monthlyExportRef.current.contains(event.target)) {
        setShowMonthlyExport(false);
      }
    };
    
    if (showCalendar || showMonthlyExport) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCalendar, showMonthlyExport]);

  // ─── Filter Teachers ──────────────────────
  useEffect(() => {
    let filtered = teachers;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(teacher => {
        const name = getTeacherName(teacher).toLowerCase();
        const subject = getTeacherSubject(teacher).toLowerCase();
        return name.includes(term) || subject.includes(term);
      });
    }
    
    if (filterSubject !== 'all') {
      filtered = filtered.filter(teacher => 
        getTeacherSubject(teacher) === filterSubject
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(teacher => {
        const status = attendanceData[teacher.teacherId || teacher.id];
        return status === filterStatus;
      });
    }
    
    setFilteredTeachers(filtered);
  }, [teachers, searchTerm, filterSubject, filterStatus, attendanceData]);

  // ─── Update Stats ──────────────────────────
  useEffect(() => {
    const present = Object.values(attendanceData).filter(v => v === 'present').length;
    const absent = Object.values(attendanceData).filter(v => v === 'absent').length;
    const total = Object.keys(attendanceData).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    setAttendanceStats({ present, absent, total, percentage });
  }, [attendanceData]);

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="text-white" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Teachers Attendance</h2>
              <p className="text-purple-100 text-sm">Mark and manage daily teacher attendance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                loadAttendance();
              }}
              disabled={isLoading}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 text-sm"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition text-sm"
            >
              <CalendarDays size={16} />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="relative" ref={calendarRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <CalendarIcon size={15} className="inline mr-1" />
              Date
            </label>
            <div 
              className="relative cursor-pointer"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <input
                type="text"
                value={selectedDateStr ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Select Date'}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white cursor-pointer"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            
            {showCalendar && (
              <div className="absolute top-full left-0 mt-2 z-50 w-full min-w-[280px]">
                <Calendar
                  selectedDate={selectedDateStr}
                  onDateSelect={handleDateSelect}
                  onClose={() => setShowCalendar(false)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Search size={15} className="inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Book size={15} className="inline mr-1" />
              Subject
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            >
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="null">Unmarked</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportDailyAttendance}
              disabled={isExporting || isLoading || teachers.length === 0}
              className="w-full px-4 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={18} />
              )}
              Daily Export
            </button>
          </div>

          <div className="flex items-end relative" ref={monthlyExportRef}>
            <button
              onClick={() => setShowMonthlyExport(!showMonthlyExport)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              Monthly Export
              <ChevronDown size={16} className={showMonthlyExport ? 'rotate-180' : ''} />
            </button>

            {showMonthlyExport && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Select Month</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                    <select
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = String(i + 1).padStart(2, '0');
                        return (
                          <option key={month} value={month}>
                            {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                    <select
                      value={exportYear}
                      onChange={(e) => setExportYear(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button
                    onClick={exportMonthlyAttendance}
                    disabled={isExportingMonthly}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isExportingMonthly ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Export Monthly
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {teachers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{attendanceStats.present}</div>
              <div className="text-xs text-emerald-700 font-medium flex items-center justify-center gap-1">
                <UserCheck size={12} /> Present
              </div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-rose-600">{attendanceStats.absent}</div>
              <div className="text-xs text-rose-700 font-medium flex items-center justify-center gap-1">
                <UserX size={12} /> Absent
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {teachers.length - attendanceStats.present - attendanceStats.absent}
              </div>
              <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                <AlertCircle size={12} /> Unmarked
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {attendanceStats.total > 0 ? attendanceStats.percentage + '%' : '-'}
              </div>
              <div className="text-xs text-purple-700 font-medium flex items-center justify-center gap-1">
                <BarChart3 size={12} /> Rate
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{teachers.length}</div>
              <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                <Users size={12} /> Total
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {teachers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={markAllPresent}
              disabled={isLoading}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle size={14} /> All Present
            </button>
            <button
              onClick={markAllAbsent}
              disabled={isLoading}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <XCircle size={14} /> All Absent
            </button>
            <button
              onClick={clearAllMarks}
              disabled={isLoading}
              className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={14} /> Clear All
            </button>
            <div className="flex-1"></div>
            <span className="text-sm text-gray-500 ml-2">
              {filteredTeachers.length} teachers
            </span>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader size={32} className="animate-spin text-purple-500" />
                <span className="ml-3 text-gray-600">Loading teachers...</span>
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 font-medium text-lg">No Teachers Found</p>
                <p className="text-sm text-gray-400">Add teachers to start marking attendance</p>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-16">
                <Search size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 font-medium text-lg">No Matching Teachers</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Classes</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTeachers.map((teacher, index) => {
                    const teacherId = teacher.teacherId || teacher.id;
                    const status = attendanceData[teacherId] || null;
                    const statusInfo = getStatusInfo(status);
                    
                    return (
                      <tr key={teacherId} className="hover:bg-gray-50 transition group">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <User size={14} className="text-purple-600" />
                            </div>
                            {getTeacherName(teacher)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                            {getTeacherSubject(teacher)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {getTeacherClasses(teacher).map((cls, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {cls}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {status ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                              {statusInfo.icon} {statusInfo.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-500 border-gray-300">
                              <AlertCircle size={14} className="text-gray-400" /> Unmarked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setTeacherStatus(teacherId, 'present')}
                              className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                                status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                            >
                              <CheckCircle size={14} className="inline mr-1" /> Present
                            </button>
                            <button
                              onClick={() => setTeacherStatus(teacherId, 'absent')}
                              className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                                status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              }`}
                            >
                              <XCircle size={14} className="inline mr-1" /> Absent
                            </button>
                            {status && (
                              <button
                                onClick={() => setTeacherStatus(teacherId, null)}
                                className="px-2 py-1.5 text-xs rounded-lg transition font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
                                title="Clear status"
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isLoading && teachers.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-400">
              {selectedDateStr && (
                <span>
                   {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  <span className="ml-3 text-gray-500">
                    • {attendanceStats.present} present • {attendanceStats.absent} absent
                  </span>
                </span>
              )}
            </div>
            <button
              onClick={saveAttendance}
              disabled={isSaving || isLoading || teachers.length === 0}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 text-sm font-medium shadow-md shadow-purple-200"
            >
              {isSaving ? (
                <>
                  <Loader size={18} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Save Attendance
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .calendar-dropdown {
          animation: slideDown 0.2s ease-out;
          transform-origin: top center;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: scaleY(0.8) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TeachersAttendance;