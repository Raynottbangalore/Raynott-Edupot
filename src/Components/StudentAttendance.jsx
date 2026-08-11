// src/components/Components/StudentAttendance.jsx
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
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';

// ────────────────────────────────────────────────
// Calendar Component
// ────────────────────────────────────────────────

const Calendar = ({ selectedDate, onDateSelect, onClose, holidayDates = {} }) => {
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

  const isHoliday = (day, month, year) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidayDates[dateStr] === true;
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
              const isHolidayDate = isHoliday(day, month, year);
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day, month, year)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm transition relative
                    ${isSelectedDate 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' 
                      : isHolidayDate
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-2 border-amber-300'
                        : isTodayDate 
                          ? 'bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 border-2 border-indigo-300' 
                          : isCurrentMonth 
                            ? 'text-gray-700 hover:bg-gray-100' 
                            : 'text-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {day}
                  {isHolidayDate && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 px-2 pb-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
              Holiday
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-indigo-600 rounded"></span>
              Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-indigo-50 border-2 border-indigo-300 rounded"></span>
              Today
            </span>
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
// Main Attendance Component
// ────────────────────────────────────────────────

const StudentAttendance = ({ 
  students, 
  onUpdateStudent,
  hallTicketData: propHallTicketData = {},
  getHallTicketData = null
}) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState([]);
  
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [holidayDates, setHolidayDates] = useState({});
  
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // State for hall ticket data
  const [hallTicketDataMap, setHallTicketDataMap] = useState({});
  const [hallTicketsLoaded, setHallTicketsLoaded] = useState(false);
  
  // Monthly export states
  const [showMonthlyExport, setShowMonthlyExport] = useState(false);
  const [exportMonth, setExportMonth] = useState('');
  const [exportYear, setExportYear] = useState('');
  const [isExportingMonthly, setIsExportingMonthly] = useState(false);
  
  const loadTimeoutRef = useRef(null);
  const calendarRef = useRef(null);
  const monthlyExportRef = useRef(null);

  const isClassSelected = selectedClass && selectedSection;
  const todayStr = new Date().toISOString().split('T')[0];

  // ─── Helper Functions ──────────────────────
  const getStudentName = (student) => {
    return student.name || student.basicInfo?.name || student.studentName || 'Unknown';
  };

  // ⭐ Get roll number from hall ticket data
  const getRollNumber = useCallback((student) => {
    if (!student) return '-';
    
    const studentId = student.studentId;
    
    // 1. Check hallTicketDataMap (fetched silently)
    if (hallTicketDataMap && hallTicketDataMap[studentId]) {
      const rollNum = hallTicketDataMap[studentId].rollNumber;
      if (rollNum) {
        return rollNum;
      }
    }
    
    // 2. Check propHallTicketData (from parent)
    if (propHallTicketData && propHallTicketData[studentId]) {
      const rollNum = propHallTicketData[studentId].rollNumber;
      if (rollNum) {
        return rollNum;
      }
    }
    
    // 3. Use getHallTicketData function
    if (getHallTicketData) {
      const data = getHallTicketData(studentId);
      if (data && data.rollNumber) {
        return data.rollNumber;
      }
    }
    
    // 4. Check if roll number is directly on student
    if (student.rollNumber) {
      return student.rollNumber;
    }
    
    // 5. Check basicInfo
    if (student.basicInfo?.rollNumber) {
      return student.basicInfo.rollNumber;
    }
    
    // 6. Fallback to admission number
    if (student.basicInfo?.admissionNo) {
      return student.basicInfo.admissionNo;
    }
    
    return '-';
  }, [hallTicketDataMap, propHallTicketData, getHallTicketData]);

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

  const filteredStudents = useMemo(() => {
    let filtered = classStudents;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const name = getStudentName(student).toLowerCase();
        const rollNo = getRollNumber(student).toLowerCase();
        return name.includes(term) || rollNo.includes(term);
      });
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(student => {
        const status = attendanceData[student.studentId];
        if (filterStatus === 'unmarked') {
          return !status || status === 'unmarked';
        }
        return status === filterStatus;
      });
    }
    
    return filtered;
  }, [classStudents, searchTerm, filterStatus, attendanceData]);

  // ─── Load Hall Tickets Silently ──────────────────────
  const loadHallTicketsForClass = useCallback(async () => {
    if (classStudents.length === 0) {
      setHallTicketsLoaded(true);
      return;
    }
    
    try {
      const dataMap = {};
      
      // Load all hall tickets in parallel
      const promises = classStudents.map(async (student) => {
        try {
          const result = await StudentApi.getHallTicket(student.studentId);
          if (result.success && result.hallTicket) {
            const data = result.hallTicket.hallTicketData || {};
            dataMap[student.studentId] = {
              rollNumber: data.rollNumber || '',
              studentName: data.studentName || '',
              studentClass: data.studentClass || '',
              section: data.section || '',
              ...data
            };
            if (data.rollNumber) {
              console.log(`📋 Found hall ticket for ${student.studentId} with roll number: ${data.rollNumber}`);
            }
          }
        } catch (error) {
          console.log(`No hall ticket found for student ${student.studentId}`);
        }
      });
      
      await Promise.all(promises);
      
      setHallTicketDataMap(dataMap);
      setHallTicketsLoaded(true);
      console.log(`✅ Loaded ${Object.keys(dataMap).length} hall tickets silently`);
    } catch (error) {
      console.error('Error loading hall tickets:', error);
      setHallTicketsLoaded(true);
    }
  }, [classStudents]);

  // ─── Effects ──────────────────────────────────
  useEffect(() => {
    const classes = new Set();
    const sections = new Set();
    
    students.forEach(student => {
      const grade = student.class || student.basicInfo?.grade || student.grade;
      const section = student.section || student.basicInfo?.section;
      
      if (grade) classes.add(grade);
      if (section) sections.add(section);
    });
    
    setClassList(Array.from(classes).sort());
    setSectionList(Array.from(sections).sort());
  }, [students]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      const filtered = students.filter(student => {
        const grade = student.class || student.basicInfo?.grade || student.grade;
        const section = student.section || student.basicInfo?.section;
        return grade === selectedClass && section === selectedSection;
      });
      setClassStudents(filtered);
    } else {
      setClassStudents([]);
    }
  }, [selectedClass, selectedSection, students]);

  // ⭐ Load hall tickets silently when class students change
  useEffect(() => {
    if (classStudents.length > 0) {
      // Reset states
      setHasLoaded(false);
      setAttendanceData({});
      setHallTicketsLoaded(false);
      
      // Load hall tickets silently in background
      loadHallTicketsForClass().then(() => {
        // After hall tickets are loaded, load attendance
        if (selectedDateStr) {
          loadAttendance();
        }
      });
    } else {
      setHallTicketsLoaded(true);
    }
  }, [classStudents]);

  // ⭐ Load attendance when hall tickets are loaded and date changes
  useEffect(() => {
    if (selectedDateStr && hallTicketsLoaded && classStudents.length > 0) {
      if (!hasLoaded) {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        loadTimeoutRef.current = setTimeout(() => {
          loadAttendance();
        }, 100);
      }
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [selectedDateStr, hallTicketsLoaded, classStudents.length]);

  useEffect(() => {
    const present = Object.values(attendanceData).filter(v => v === 'present').length;
    const absent = Object.values(attendanceData).filter(v => v === 'absent').length;
    const unmarked = Object.values(attendanceData).filter(v => !v || v === 'unmarked').length;
    const total = classStudents.length;
    const marked = present + absent;
    const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;
    
    setAttendanceStats({
      present,
      absent,
      unmarked,
      total,
      percentage
    });
  }, [attendanceData, classStudents]);

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

  useEffect(() => {
    if (!selectedDateStr) {
      setSelectedDateStr(todayStr);
    }
    const now = new Date();
    setExportMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setExportYear(String(now.getFullYear()));
  }, []);

  // ─── API Functions ──────────────────────────
  
  const loadAttendance = useCallback(async () => {
    if (!selectedDateStr || !selectedClass || !selectedSection || !hallTicketsLoaded) {
      return;
    }

    setIsLoading(true);
    try {
      const classFilter = `${selectedClass}-${selectedSection}`;
      console.log(`📥 Loading attendance for ${selectedDateStr}, class: ${classFilter}`);
      
      const result = await StudentApi.getAttendance(selectedDateStr, classFilter);
      
      console.log('📥 Raw API response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load attendance');
      }
      
      if (result.records && result.records.length > 0 && result.records[0].isHoliday === true) {
        const holidayRecord = result.records[0];
        setIsHoliday(true);
        setHolidayReason(holidayRecord.reason || 'Holiday');
        setAttendanceData({});
        setHasLoaded(true);
        
        setHolidayDates(prev => ({
          ...prev,
          [selectedDateStr]: true
        }));
        
        toast.info(` Holiday: ${holidayRecord.reason || 'Holiday'}`);
        setIsLoading(false);
        return;
      }

      setIsHoliday(false);
      setHolidayReason('');
      setHolidayDates(prev => {
        const updated = { ...prev };
        delete updated[selectedDateStr];
        return updated;
      });
      
      const attendanceMap = {};
      
      classStudents.forEach(student => {
        attendanceMap[student.studentId] = null;
      });
      
      if (result.records && result.records.length > 0) {
        console.log('📥 Processing records from API:', result.records);
        
        result.records.forEach(record => {
          if (record.studentId) {
            if (record.status === 'present' || record.status === 'absent') {
              attendanceMap[record.studentId] = record.status;
              console.log(`📥 Loaded ${record.studentId} as ${record.status}`);
            } else {
              console.warn(`⚠️ Unknown status for ${record.studentId}: ${record.status}`);
            }
          }
        });
      }
      
      setAttendanceData(attendanceMap);
      setHasLoaded(true);
      
      const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;
      const absentCount = Object.values(attendanceMap).filter(v => v === 'absent').length;
      const unmarkedCount = Object.values(attendanceMap).filter(v => !v || v === 'unmarked').length;
      
      toast.success(`Attendance loaded: ${presentCount} present, ${absentCount} absent, ${unmarkedCount} unmarked`);
      
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance: ' + (error.message || 'Unknown error'));
      
      const defaultAttendance = {};
      classStudents.forEach(student => {
        defaultAttendance[student.studentId] = null;
      });
      setAttendanceData(defaultAttendance);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateStr, selectedClass, selectedSection, classStudents, hallTicketsLoaded]);

  const handleRefresh = useCallback(async () => {
    if (!isClassSelected) return;
    
    setIsLoading(true);
    try {
      // Reload hall tickets silently
      await loadHallTicketsForClass();
      // Then reload attendance
      await loadAttendance();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isClassSelected, loadHallTicketsForClass, loadAttendance]);

  const saveAttendance = async () => {
    if (!selectedDateStr || !selectedClass || !selectedSection) {
      toast.warning('Please select class, section, and date');
      return;
    }

    if (classStudents.length === 0) {
      toast.warning('No students in this class/section');
      return;
    }

    setIsSaving(true);
    try {
      let records = [];

      if (isHoliday) {
        records = [{
          isHoliday: true,
          reason: holidayReason || 'Holiday',
          class: selectedClass,
          section: selectedSection
        }];
      } else {
        records = classStudents
          .filter(student => {
            const status = attendanceData[student.studentId];
            return status === 'present' || status === 'absent';
          })
          .map(student => {
            return {
              studentId: student.studentId,
              status: attendanceData[student.studentId],
              class: selectedClass,
              section: selectedSection
            };
          });
      }

      if (records.length === 0 && !isHoliday) {
        toast.warning('No students marked. Please mark attendance before saving.');
        setIsSaving(false);
        return;
      }

      const result = await StudentApi.saveAttendance({
        date: selectedDateStr,
        records: records,
        class: `${selectedClass}-${selectedSection}`
      });

      if (result.success) {
        toast.success(isHoliday ? 'Holiday marked successfully!' : `Attendance saved for ${records.length} students!`);
        
        if (isHoliday) {
          setHolidayDates(prev => ({
            ...prev,
            [selectedDateStr]: true
          }));
        } else {
          setHolidayDates(prev => {
            const updated = { ...prev };
            delete updated[selectedDateStr];
            return updated;
          });
        }
        
        await loadAttendance();
        if (onUpdateStudent) {
          onUpdateStudent();
        }
      } else {
        toast.error('Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Error saving attendance: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };


  // Daily Export
  const exportDailyAttendance = async () => {
    if (!selectedDateStr || !selectedClass || !selectedSection) {
      toast.warning('Please select class, section, and date');
      return;
    }

    if (classStudents.length === 0) {
      toast.warning('No students to export');
      return;
    }

    setIsExporting(true);
    try {
      const formattedDate = selectedDateStr;
      
      const headers = ['S.No', 'Roll No', 'Student Name', 'Class', 'Section', 'Date', 'Status'];
      
      const rows = classStudents.map((student, index) => {
        const status = attendanceData[student.studentId] || 'unmarked';
        const statusDisplay = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Unmarked';
        return [
          index + 1,
          getRollNumber(student),
          getStudentName(student),
          selectedClass,
          selectedSection,
          formattedDate,
          statusDisplay
        ];
      });

      if (isHoliday) {
        rows.push([
          '-',
          '-',
          'HOLIDAY',
          selectedClass,
          selectedSection,
          formattedDate,
          holidayReason || 'Holiday'
        ]);
      }

      rows.push([]);
      rows.push(['Summary', '', '', '', '', '', '']);
      rows.push(['Total Students', classStudents.length, '', '', '', '', '']);
      rows.push(['Present', attendanceStats.present, '', '', '', '', '']);
      rows.push(['Absent', attendanceStats.absent, '', '', '', '', '']);
      rows.push(['Unmarked', attendanceStats.unmarked, '', '', '', '', '']);
      if (attendanceStats.present + attendanceStats.absent > 0) {
        rows.push(['Attendance %', attendanceStats.percentage + '%', '', '', '', '', '']);
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const fileName = `daily_attendance_${selectedClass}_${selectedSection}_${selectedDateStr}.csv`;
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
    if (!selectedClass || !selectedSection) {
      toast.warning('Please select class and section');
      return;
    }

    if (!exportMonth || !exportYear) {
      toast.warning('Please select month and year');
      return;
    }

    setIsExportingMonthly(true);
    try {
      const month = `${exportYear}-${exportMonth}`;
      const daysInMonth = new Date(parseInt(exportYear), parseInt(exportMonth), 0).getDate();
      
      const studentsInClass = students.filter(student => {
        const grade = student.class || student.basicInfo?.grade || student.grade;
        const section = student.section || student.basicInfo?.section;
        return grade === selectedClass && section === selectedSection;
      });

      if (studentsInClass.length === 0) {
        toast.warning('No students in this class/section');
        setIsExportingMonthly(false);
        return;
      }

      const headers = ['S.No', 'Roll No', 'Student Name'];
      const dateHeaders = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${exportYear}-${exportMonth}-${String(day).padStart(2, '0')}`;
        dateHeaders.push(dateStr);
      }
      const fullHeaders = [...headers, ...dateHeaders, 'Present Days', 'Absent Days', 'Attendance %'];

      const rows = [];
      for (let studentIndex = 0; studentIndex < studentsInClass.length; studentIndex++) {
        const student = studentsInClass[studentIndex];
        const row = [
          studentIndex + 1,
          getRollNumber(student),
          getStudentName(student)
        ];

        let presentCount = 0;
        let absentCount = 0;
        let totalDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${exportYear}-${exportMonth}-${String(day).padStart(2, '0')}`;
          try {
            const result = await StudentApi.getAttendance(dateStr, `${selectedClass}-${selectedSection}`);
            let status = '-';
            
            if (result.success && result.records) {
              const holidayRecord = result.records.find(r => r.isHoliday === true);
              if (holidayRecord) {
                status = 'H';
              } else {
                const record = result.records.find(r => r.studentId === student.studentId);
                if (record) {
                  if (record.status === 'present') {
                    status = 'P';
                    presentCount++;
                    totalDays++;
                  } else if (record.status === 'absent') {
                    status = 'A';
                    absentCount++;
                    totalDays++;
                  }
                }
              }
            }
            row.push(status);
          } catch (error) {
            console.error(`Error fetching attendance for ${dateStr}:`, error);
            row.push('E');
          }
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
      const fileName = `monthly_attendance_${selectedClass}_${selectedSection}_${exportYear}-${exportMonth}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Monthly attendance exported successfully!`);
    } catch (error) {
      console.error('Monthly export error:', error);
      toast.error('Failed to export monthly attendance: ' + (error.message || 'Unknown error'));
    } finally {
      setIsExportingMonthly(false);
      setShowMonthlyExport(false);
    }
  };

  // ─── UI Actions ─────────────────────────────
  const setStudentStatus = (studentId, status) => {
    if (isHoliday) {
      toast.warning('Cannot modify attendance on a holiday');
      return;
    }
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAllPresent = () => {
    if (isHoliday) {
      toast.warning('Cannot mark attendance on a holiday');
      return;
    }
    if (classStudents.length === 0) {
      toast.warning('No students to mark');
      return;
    }

    const updated = {};
    classStudents.forEach(student => {
      updated[student.studentId] = 'present';
    });
    setAttendanceData(updated);
    toast.success('All students marked as Present');
  };

  const markAllAbsent = () => {
    if (isHoliday) {
      toast.warning('Cannot mark attendance on a holiday');
      return;
    }
    if (classStudents.length === 0) {
      toast.warning('No students to mark');
      return;
    }

    const updated = {};
    classStudents.forEach(student => {
      updated[student.studentId] = 'absent';
    });
    setAttendanceData(updated);
    toast.success('All students marked as Absent');
  };

  const clearAllMarks = () => {
    if (isHoliday) {
      toast.warning('Cannot modify attendance on a holiday');
      return;
    }

    const updated = {};
    classStudents.forEach(student => {
      updated[student.studentId] = null;
    });
    setAttendanceData(updated);
    toast.info('All marks cleared');
  };

  const toggleHoliday = () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date first');
      return;
    }
    
    if (isHoliday) {
      setIsHoliday(false);
      setHolidayReason('');
      const defaultAttendance = {};
      classStudents.forEach(student => {
        defaultAttendance[student.studentId] = null;
      });
      setAttendanceData(defaultAttendance);
      setHolidayDates(prev => {
        const updated = { ...prev };
        delete updated[selectedDateStr];
        return updated;
      });
      toast.info('Holiday mode deactivated');
    } else {
      setIsHoliday(true);
      setAttendanceData({});
      toast.info('Holiday mode activated. Enter reason and save.');
    }
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDateStr(dateStr);
    setHasLoaded(false);
    setShowCalendar(false);
  };

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="text-white" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Student Attendance</h2>
              <p className="text-indigo-100 text-sm">Mark and manage daily attendance</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={!isClassSelected || isLoading}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <School size={15} className="inline mr-1" />
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setHasLoaded(false);
                setAttendanceData({});
                setIsHoliday(false);
                setHallTicketDataMap({});
                setHallTicketsLoaded(false);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">Select Class</option>
              {classList.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <BookOpen size={15} className="inline mr-1" />
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setHasLoaded(false);
                setAttendanceData({});
                setIsHoliday(false);
                setHallTicketDataMap({});
                setHallTicketsLoaded(false);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">Select Section</option>
              {sectionList.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white cursor-pointer"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            
            {showCalendar && (
              <div className="absolute top-full left-0 mt-2 z-50 w-full min-w-[280px]">
                <Calendar
                  selectedDate={selectedDateStr}
                  onDateSelect={handleDateSelect}
                  onClose={() => setShowCalendar(false)}
                  holidayDates={holidayDates}
                />
              </div>
            )}
          </div>

          <div className="flex items-end">
            <button
              onClick={toggleHoliday}
              disabled={!isClassSelected || !selectedDateStr}
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

          <div className="flex items-end">
            <button
              onClick={exportDailyAttendance}
              disabled={!isClassSelected || isExporting || isLoading || classStudents.length === 0}
              className="w-full px-4 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Daily Export
            </button>
          </div>

          <div className="flex items-end relative" ref={monthlyExportRef}>
            <button
              onClick={() => setShowMonthlyExport(!showMonthlyExport)}
              disabled={!isClassSelected || isLoading}
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

        {/* Main Content Area */}
        {isClassSelected ? (
          <>
            {/* Stats */}
            {!isHoliday && (
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
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {attendanceStats.total > 0 && attendanceStats.unmarked < attendanceStats.total
                      ? attendanceStats.percentage + '%'
                      : '-'}
                  </div>
                  <div className="text-xs text-indigo-700 font-medium flex items-center justify-center gap-1">
                    <BarChart3 size={12} /> Rate
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-600">{classStudents.length}</div>
                  <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                    <Users size={12} /> Total
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isHoliday && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={markAllPresent}
                  disabled={!selectedDateStr || isLoading}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle size={14} /> All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  disabled={!selectedDateStr || isLoading}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle size={14} /> All Absent
                </button>
                <button
                  onClick={clearAllMarks}
                  disabled={!selectedDateStr || isLoading}
                  className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={14} /> Clear All
                </button>
                <div className="flex-1"></div>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="unmarked">Unmarked</option>
                  </select>
                </div>
                <span className="text-sm text-gray-500 ml-2">{filteredStudents.length} students</span>
              </div>
            )}

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader size={32} className="animate-spin text-indigo-500" />
                    <span className="ml-3 text-gray-600">Loading attendance...</span>
                  </div>
                ) : isHoliday ? (
                  <div className="text-center py-16">
                    <Gift size={48} className="mx-auto mb-3 text-amber-400" />
                    <p className="text-gray-500 font-medium text-lg">Holiday</p>
                    <p className="text-sm text-gray-400">{holidayReason || 'No classes today'}</p>
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="text-center py-16">
                    <AlertCircle size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500 font-medium text-lg">No Students Found</p>
                    <p className="text-sm text-gray-400">No students in {selectedClass}-{selectedSection}</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16">
                    <Search size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500 font-medium text-lg">No Matching Students</p>
                    <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Name</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((student, index) => {
                        const status = attendanceData[student.studentId] || null;
                        const statusInfo = getStatusInfo(status);
                        const rollNo = getRollNumber(student);
                        
                        return (
                          <tr key={student.studentId} className="hover:bg-gray-50 transition group">
                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {rollNo}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {getStudentName(student)}
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
                                  onClick={() => setStudentStatus(student.studentId, 'present')}
                                  className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                                    status === 'present'
                                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  }`}
                                >
                                  <CheckCircle size={14} className="inline mr-1" /> Present
                                </button>
                                <button
                                  onClick={() => setStudentStatus(student.studentId, 'absent')}
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
                                    onClick={() => setStudentStatus(student.studentId, null)}
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
            {!isLoading && (
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
                      {!isHoliday && classStudents.length > 0 && (
                        <span className="ml-3 text-gray-500">
                          • {attendanceStats.present} present • {attendanceStats.absent} absent • {attendanceStats.unmarked} unmarked
                        </span>
                      )}
                      {isHoliday && (
                        <span className="ml-3 text-amber-600">• Holiday: {holidayReason || 'No classes today'}</span>
                      )}
                    </span>
                  )}
                </div>
                <button
                  onClick={saveAttendance}
                  disabled={!isClassSelected || isSaving || isLoading || classStudents.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 text-sm font-medium shadow-md shadow-emerald-200"
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
            <School size={56} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium text-lg">Select Class and Section</p>
            <p className="text-sm text-gray-400 mt-1">Choose from the dropdowns above to start marking attendance</p>
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

export default StudentAttendance;