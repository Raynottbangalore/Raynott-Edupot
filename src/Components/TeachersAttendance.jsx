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
  Filter,
  X
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


const TeachersAttendance = ({ onUpdateTeacher }) => {
  const [allTeachers, setAllTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTeacherList, setShowTeacherList] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    unmarked: 0,
    total: 0,
    percentage: 0
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  
  // Monthly export states
  const [showMonthlyExport, setShowMonthlyExport] = useState(false);
  const [exportMonth, setExportMonth] = useState('');
  const [exportYear, setExportYear] = useState('');
  const [isExportingMonthly, setIsExportingMonthly] = useState(false);
  const [monthlyExportProgress, setMonthlyExportProgress] = useState(0);
  
  const loadTimeoutRef = useRef(null);
  const calendarRef = useRef(null);
  const monthlyExportRef = useRef(null);
  const searchRef = useRef(null);
  
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
        setAllTeachers(result.teachers || []);
        // Initialize attendance data with null (unmarked)
        const initialAttendance = {};
        (result.teachers || []).forEach(teacher => {
          initialAttendance[teacher.teacherId || teacher.id] = null;
        });
        setAttendanceData(initialAttendance);
        
        // Update stats with all teachers
        updateStats(initialAttendance);
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
    if (!selectedDateStr || !selectedTeacher) return;

    setIsLoading(true);
    try {
      const teacherId = selectedTeacher.teacherId || selectedTeacher.id;
      const result = await TeacherApi.getTeacherAttendance(selectedDateStr, teacherId);
      
      if (result.success) {
        // Check if it's a holiday
        if (result.records && result.records.length > 0 && result.records[0].isHoliday) {
          setIsHoliday(true);
          setHolidayReason(result.records[0].reason || 'Holiday');
          setAttendanceData({ [teacherId]: null });
          setHasLoaded(true);
          toast.info(` Holiday: ${result.records[0].reason || 'Holiday'}`);
          return;
        }

        setIsHoliday(false);
        
        const attendanceMap = {};
        // Initialize all teachers with null
        allTeachers.forEach(teacher => {
          attendanceMap[teacher.teacherId || teacher.id] = null;
        });
        
        // Set attendance for the selected teacher
        if (result.records && result.records.length > 0) {
          const record = result.records.find(r => r.teacherId === teacherId);
          if (record && record.status) {
            attendanceMap[teacherId] = record.status;
          }
        }
        
        setAttendanceData(attendanceMap);
        setHasLoaded(true);
        updateStats(attendanceMap);
        
        const status = attendanceMap[teacherId] || 'unmarked';
        toast.success(`Attendance loaded for ${getTeacherName(selectedTeacher)}: ${status}`);
      } else {
        toast.error(result.error || 'Failed to load attendance');
      }
    } catch (error) {
      console.error('Load attendance error:', error);
      toast.error('Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateStr, selectedTeacher, allTeachers]);

  // ─── Update Stats ──────────────────────────
  const updateStats = useCallback((data) => {
    const present = Object.values(data).filter(v => v === 'present').length;
    const absent = Object.values(data).filter(v => v === 'absent').length;
    const unmarked = Object.values(data).filter(v => !v || v === 'unmarked' || v === null).length;
    const total = Object.keys(data).length;
    const marked = present + absent;
    const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;
    
    setAttendanceStats({ present, absent, unmarked, total, percentage });
  }, []);

  // ─── Save Attendance ────────────────────────
  const saveAttendance = async () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date');
      return;
    }

    if (!selectedTeacher) {
      toast.warning('Please select a teacher');
      return;
    }

    const teacherId = selectedTeacher.teacherId || selectedTeacher.id;
    const status = attendanceData[teacherId];

    if (!status && !isHoliday) {
      toast.warning('Please mark attendance for the teacher');
      return;
    }

    setIsSaving(true);
    try {
      let payload = {
        date: selectedDateStr,
        records: []
      };

      if (isHoliday) {
        payload.holiday = {
          reason: holidayReason || 'Holiday'
        };
      } else {
        payload.records = [{
          teacherId: teacherId,
          status: status
        }];
      }

      console.log('📤 Saving payload:', payload);

      const result = await TeacherApi.saveTeacherAttendance(payload);
      
      if (result.success) {
        toast.success(isHoliday ? 'Holiday marked successfully!' : `Attendance saved for ${getTeacherName(selectedTeacher)}!`);
        await loadAttendance();
        if (onUpdateTeacher) {
          onUpdateTeacher();
        }
      } else {
        toast.error(result.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Save attendance error:', error);
      toast.error('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Functions ──────────────────────

  const exportDailyAttendance = async () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date');
      return;
    }

    if (allTeachers.length === 0) {
      toast.warning('No teachers to export');
      return;
    }

    setIsExporting(true);
    try {
      const dateObj = new Date(selectedDateStr + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const headers = ['S.No', 'Teacher Name', 'Subject', 'Status'];
      
      const rows = allTeachers.map((teacher, index) => {
        const teacherId = teacher.teacherId || teacher.id;
        const status = attendanceData[teacherId] || 'unmarked';
        const statusDisplay = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Unmarked';
        return [
          index + 1,
          getTeacherName(teacher),
          getTeacherSubject(teacher),
          statusDisplay
        ];
      });

      // Add summary
      rows.push([]);
      rows.push(['Summary', '', '', '']);
      rows.push(['Total Teachers', allTeachers.length, '', '']);
      rows.push(['Present', attendanceStats.present, '', '']);
      rows.push(['Absent', attendanceStats.absent, '', '']);
      rows.push(['Unmarked', attendanceStats.unmarked, '', '']);
      if (attendanceStats.present + attendanceStats.absent > 0) {
        rows.push(['Attendance %', attendanceStats.percentage + '%', '', '']);
      }
      rows.push(['Date', formattedDate, '', '']);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `teacher_attendance_daily_${selectedDateStr}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Daily attendance for ${allTeachers.length} teachers exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance');
    } finally {
      setIsExporting(false);
    }
  };

  const exportMonthlyAttendance = async () => {
    if (!exportMonth || !exportYear) {
      toast.warning('Please select month and year');
      return;
    }

    if (allTeachers.length === 0) {
      toast.warning('No teachers found to export');
      return;
    }

    setIsExportingMonthly(true);
    setMonthlyExportProgress(0);
    
    try {
      const daysInMonth = new Date(parseInt(exportYear), parseInt(exportMonth), 0).getDate();
      
      // Build headers: S.No, Teacher Name, Subject, then each day
      const headers = ['S.No', 'Teacher Name', 'Subject'];
      const dateHeaders = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${String(day).padStart(2, '0')}-${exportMonth}-${exportYear}`;
        dateHeaders.push(dateStr);
      }
      const fullHeaders = [...headers, ...dateHeaders];

      // Process each teacher
      const rows = [];
      let totalPresent = 0;
      let totalAbsent = 0;
      
      for (let teacherIndex = 0; teacherIndex < allTeachers.length; teacherIndex++) {
        const teacher = allTeachers[teacherIndex];
        const teacherId = teacher.teacherId || teacher.id;
        
        const row = [
          teacherIndex + 1,
          getTeacherName(teacher),
          getTeacherSubject(teacher)
        ];

        let presentCount = 0;
        let absentCount = 0;

        // Get attendance for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${exportYear}-${exportMonth}-${String(day).padStart(2, '0')}`;
          
          try {
            const result = await TeacherApi.getTeacherAttendance(dateStr);
            let status = '-';
            
            if (result.success && result.records) {
              const holidayRecord = result.records.find(r => r.isHoliday === true);
              if (holidayRecord) {
                status = 'H';
              } else {
                const record = result.records.find(r => r.teacherId === teacherId);
                if (record) {
                  const teacherStatus = (record.status || '').toLowerCase();
                  if (teacherStatus === 'present') {
                    status = 'P';
                    presentCount++;
                  } else if (teacherStatus === 'absent') {
                    status = 'A';
                    absentCount++;
                  }
                }
              }
            }
            row.push(status);
          } catch (error) {
            console.error(`Error fetching attendance for ${dateStr}:`, error);
            row.push('E');
          }
          
          // Update progress
          const progress = ((teacherIndex * daysInMonth + day) / (allTeachers.length * daysInMonth)) * 100;
          setMonthlyExportProgress(Math.round(progress));
        }

        totalPresent += presentCount;
        totalAbsent += absentCount;
        rows.push(row);
      }

      // Add summary rows
      rows.push([]);
      rows.push(['SUMMARY', '', '']);
      rows.push(['Total Teachers', allTeachers.length, '']);
      rows.push(['Total Present Days', totalPresent, '']);
      rows.push(['Total Absent Days', totalAbsent, '']);
      
      const totalDays = allTeachers.length * daysInMonth;
      const overallAttendance = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
      rows.push(['Overall Attendance %', overallAttendance + '%', '']);
      rows.push(['Month', `${exportMonth}-${exportYear}`, '']);

      // Build CSV
      const csvContent = [
        fullHeaders.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `teacher_attendance_monthly_${exportYear}-${exportMonth}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Monthly attendance for ${allTeachers.length} teachers exported successfully!`);
    } catch (error) {
      console.error('Monthly export error:', error);
      toast.error('Failed to export monthly attendance: ' + (error.message || 'Unknown error'));
    } finally {
      setIsExportingMonthly(false);
      setShowMonthlyExport(false);
      setMonthlyExportProgress(0);
    }
  };

  // ─── UI Actions ─────────────────────────────
  const setTeacherStatus = (status) => {
    if (!selectedTeacher) return;
    const teacherId = selectedTeacher.teacherId || selectedTeacher.id;
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: status
    }));
  };

  const clearStatus = () => {
    if (!selectedTeacher) return;
    const teacherId = selectedTeacher.teacherId || selectedTeacher.id;
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: null
    }));
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDateStr(dateStr);
    setHasLoaded(false);
    setShowCalendar(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowTeacherList(value.length > 0);
    
    if (value.length > 0) {
      const filtered = allTeachers.filter(teacher => {
        const name = getTeacherName(teacher).toLowerCase();
        const subject = getTeacherSubject(teacher).toLowerCase();
        const search = value.toLowerCase();
        return name.includes(search) || subject.includes(search);
      });
      setFilteredTeachers(filtered);
    } else {
      setFilteredTeachers([]);
    }
  };

  const selectTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setSearchTerm(getTeacherName(teacher));
    setShowTeacherList(false);
    setHasLoaded(false);
    
    const teacherId = teacher.teacherId || teacher.id;
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: null
    }));
    
    if (selectedDateStr) {
      setTimeout(() => {
        loadAttendance();
      }, 300);
    }
  };

  const clearSelectedTeacher = () => {
    setSelectedTeacher(null);
    setSearchTerm('');
    setShowTeacherList(false);
    setHasLoaded(false);
  };

  const toggleHoliday = () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date first');
      return;
    }
    
    if (isHoliday) {
      setIsHoliday(false);
      setHolidayReason('');
      toast.info('Holiday mode deactivated');
    } else {
      setIsHoliday(true);
      toast.info('Holiday mode activated. Enter reason and save.');
    }
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
    if (selectedDateStr && selectedTeacher && !hasLoaded) {
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
  }, [selectedDateStr, selectedTeacher, hasLoaded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowTeacherList(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
      if (monthlyExportRef.current && !monthlyExportRef.current.contains(event.target)) {
        setShowMonthlyExport(false);
      }
    };
    
    if (showTeacherList || showCalendar || showMonthlyExport) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTeacherList, showCalendar, showMonthlyExport]);

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
              <p className="text-purple-100 text-sm">Search, select, and mark teacher attendance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (selectedTeacher && selectedDateStr) {
                  loadAttendance();
                } else {
                  toast.warning('Please select a teacher and date');
                }
              }}
              disabled={isLoading || !selectedTeacher}
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
        {/* Search and Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search Teacher */}
          <div className="relative" ref={searchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Search size={15} className="inline mr-1" />
              Search Teacher
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or subject..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchTerm.length > 0) {
                    setShowTeacherList(true);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pl-10 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              {selectedTeacher && (
                <button
                  onClick={clearSelectedTeacher}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Teacher List Dropdown */}
            {showTeacherList && filteredTeachers.length > 0 && (
              <div className="absolute top-full left-0 mt-2 z-50 w-full bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto">
                {filteredTeachers.map((teacher) => {
                  const teacherId = teacher.teacherId || teacher.id;
                  const isSelected = selectedTeacher && (selectedTeacher.teacherId || selectedTeacher.id) === teacherId;
                  return (
                    <button
                      key={teacherId}
                      onClick={() => selectTeacher(teacher)}
                      className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition flex items-center justify-between ${
                        isSelected ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{getTeacherName(teacher)}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            {getTeacherSubject(teacher)}
                          </span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle size={16} className="text-purple-600" />}
                    </button>
                  );
                })}
              </div>
            )}

            {showTeacherList && searchTerm.length > 0 && filteredTeachers.length === 0 && (
              <div className="absolute top-full left-0 mt-2 z-50 w-full bg-white rounded-xl shadow-2xl border border-gray-200 p-4 text-center">
                <p className="text-gray-500">No teachers found matching "{searchTerm}"</p>
              </div>
            )}
          </div>

          {/* Date */}
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

          {/* Holiday Button */}
          <div className="flex items-end">
            <button
              onClick={toggleHoliday}
              disabled={!selectedDateStr || !selectedTeacher}
              className={`w-full px-4 py-2.5 text-sm rounded-lg transition flex items-center justify-center gap-2 ${
                isHoliday 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Gift size={18} />
              {isHoliday ? 'Cancel Holiday' : 'Mark Holiday'}
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex items-end gap-2">
            {/* Daily Export */}
            <button
              onClick={exportDailyAttendance}
              disabled={isExporting || allTeachers.length === 0}
              className="flex-1 px-4 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={18} />
              )}
              Daily
            </button>

            {/* Monthly Export */}
            <div className="relative" ref={monthlyExportRef}>
              <button
                onClick={() => setShowMonthlyExport(!showMonthlyExport)}
                disabled={isLoading || allTeachers.length === 0}
                className="px-4 py-2.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                <Download size={18} />
                Monthly
                <ChevronDown size={16} className={showMonthlyExport ? 'rotate-180' : ''} />
              </button>

              {showMonthlyExport && (
                <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Export Monthly Attendance</h4>
                  <p className="text-xs text-gray-500 mb-3">Exporting all teachers for selected month</p>
                  
                  {isExportingMonthly && (
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${monthlyExportProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">{monthlyExportProgress}%</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                      <select
                        value={exportMonth}
                        onChange={(e) => setExportMonth(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isExportingMonthly}
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
                        disabled={isExportingMonthly}
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
                      disabled={isExportingMonthly || allTeachers.length === 0}
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
                          Export ({allTeachers.length} teachers)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Teacher Info */}
        {selectedTeacher && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{getTeacherName(selectedTeacher)}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full">
                      {getTeacherSubject(selectedTeacher)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={clearSelectedTeacher}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Holiday Reason Input */}
        {isHoliday && (
          <div className="mb-4 animate-fadeIn">
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-center gap-3">
              <Gift size={24} className="text-amber-600 flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter holiday reason..."
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                className="flex-1 border border-amber-300 bg-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {selectedTeacher && !isHoliday && (
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
              <div className="text-2xl font-bold text-gray-600">{attendanceStats.unmarked}</div>
              <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                <AlertCircle size={12} /> Unmarked
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {attendanceStats.total > 0 && attendanceStats.unmarked < attendanceStats.total
                  ? attendanceStats.percentage + '%'
                  : '-'}
              </div>
              <div className="text-xs text-purple-700 font-medium flex items-center justify-center gap-1">
                <BarChart3 size={12} /> Rate
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{attendanceStats.total}</div>
              <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                <Users size={12} /> Total
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {selectedTeacher ? (
          <>
            {isHoliday ? (
              <div className="text-center py-12 bg-amber-50 rounded-xl border-2 border-dashed border-amber-300">
                <Gift size={48} className="mx-auto mb-3 text-amber-400" />
                <p className="text-gray-500 font-medium text-lg">Holiday</p>
                <p className="text-sm text-gray-400">{holidayReason || 'No classes today'}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader size={32} className="animate-spin text-purple-500" />
                      <span className="ml-3 text-gray-600">Loading attendance...</span>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const teacherId = selectedTeacher.teacherId || selectedTeacher.id;
                          const status = attendanceData[teacherId] || null;
                          const statusInfo = getStatusInfo(status);
                          
                          return (
                            <tr className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 text-sm text-gray-500">1</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <User size={14} className="text-purple-600" />
                                  </div>
                                  {getTeacherName(selectedTeacher)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                                  {getTeacherSubject(selectedTeacher)}
                                </span>
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
                                    onClick={() => setTeacherStatus('present')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                                      status === 'present'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    }`}
                                  >
                                    <CheckCircle size={14} className="inline mr-1" /> Present
                                  </button>
                                  <button
                                    onClick={() => setTeacherStatus('absent')}
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
                                      onClick={clearStatus}
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
                        })()}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            {!isLoading && selectedTeacher && (
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
                      {!isHoliday && (
                        <span className="ml-3 text-gray-500">
                          • {getTeacherName(selectedTeacher)}
                        </span>
                      )}
                      {isHoliday && (
                        <span className="ml-3 text-amber-600">• Holiday: {holidayReason || 'No classes today'}</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Save Button */}
                <button
                  onClick={saveAttendance}
                  disabled={isSaving || isLoading || !selectedTeacher}
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
          </>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Search size={56} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium text-lg">Search and Select a Teacher</p>
            <p className="text-sm text-gray-400 mt-1">Type a teacher name or subject to get started</p>
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