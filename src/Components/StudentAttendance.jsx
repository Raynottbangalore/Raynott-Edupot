// src/components/Components/StudentAttendance.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, CheckCircle, XCircle, Clock, 
  RefreshCw, Users, UserCheck, UserX, AlertCircle, 
  School, BookOpen, Gift, Save, Loader, Download, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-toastify';
import StudentApi from '../service/StudentApi';

const StudentAttendance = ({ students, onUpdateStudent }) => {
  // State for class/section selection
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classList, setClassList] = useState([]);
  const [sectionList, setSectionList] = useState([]);
  
  // State for date selection
  const [selectedDateStr, setSelectedDateStr] = useState('');
  
  // State for attendance
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0
  });
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Holiday state
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');

  // Get unique classes and sections from students
  useEffect(() => {
    const classes = new Set();
    const sections = new Set();
    
    students.forEach(student => {
      const grade = student.class || student.basicInfo?.grade;
      const section = student.section || student.basicInfo?.section;
      
      if (grade) {
        classes.add(grade);
      }
      if (section) {
        sections.add(section);
      }
    });
    
    setClassList(Array.from(classes).sort());
    setSectionList(Array.from(sections).sort());
  }, [students]);

  // Filter students when class and section are selected
  useEffect(() => {
    if (selectedClass && selectedSection) {
      const filtered = students.filter(student => {
        const grade = student.class || student.basicInfo?.grade;
        const section = student.section || student.basicInfo?.section;
        return grade === selectedClass && section === selectedSection;
      });
      setClassStudents(filtered);
    } else {
      setClassStudents([]);
    }
  }, [selectedClass, selectedSection, students]);

  // Load attendance when date or class changes
  useEffect(() => {
    if (selectedDateStr && selectedClass && selectedSection && classStudents.length > 0) {
      if (!hasLoaded) {
        loadAttendance();
      }
    }
  }, [selectedDateStr, selectedClass, selectedSection, classStudents.length]);

  // Update attendance stats
  useEffect(() => {
    const present = Object.values(attendanceData).filter(v => v === 'present').length;
    const absent = Object.values(attendanceData).filter(v => v === 'absent').length;
    const total = classStudents.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    setAttendanceStats({
      present,
      absent,
      total,
      percentage
    });
  }, [attendanceData, classStudents]);

  // Load attendance for selected date
  const loadAttendance = useCallback(async () => {
    if (!selectedDateStr || !selectedClass || !selectedSection) {
      return;
    }

    setIsLoading(true);
    try {
      const classFilter = `${selectedClass}-${selectedSection}`;
      const result = await StudentApi.getAttendance(selectedDateStr, classFilter);
      
      // Check for holiday
      if (result.success && result.records) {
        const holidayRecord = result.records.find(r => r.isHoliday === true);
        if (holidayRecord) {
          setIsHoliday(true);
          setHolidayReason(holidayRecord.reason || 'Holiday');
          setAttendanceData({});
          setHasLoaded(true);
          toast.info(`📅 Holiday: ${holidayRecord.reason || 'Holiday'}`);
          setIsLoading(false);
          return;
        }
      }

      // Not a holiday
      setIsHoliday(false);
      setHolidayReason('');
      
      if (result.success && result.records) {
        const attendanceMap = {};
        result.records.forEach(record => {
          if (record.studentId && !record.isHoliday) {
            attendanceMap[record.studentId] = record.status;
          }
        });
        
        // Initialize all students with default 'present' if no record exists
        classStudents.forEach(student => {
          if (!attendanceMap[student.studentId]) {
            attendanceMap[student.studentId] = 'present';
          }
        });
        
        setAttendanceData(attendanceMap);
        setHasLoaded(true);
        toast.success(`Attendance loaded for ${selectedDateStr}`);
      } else {
        // No attendance found - set all to present
        const defaultAttendance = {};
        classStudents.forEach(student => {
          defaultAttendance[student.studentId] = 'present';
        });
        setAttendanceData(defaultAttendance);
        setHasLoaded(true);
        toast.info('No attendance records found. Defaulting to present.');
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateStr, selectedClass, selectedSection, classStudents]);

  // Save attendance
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
        // Save as holiday
        records = [{
          isHoliday: true,
          reason: holidayReason || 'Holiday',
          date: selectedDateStr,
          class: selectedClass,
          section: selectedSection
        }];
      } else {
        // Save student attendance
        records = Object.entries(attendanceData).map(([studentId, status]) => {
          const student = classStudents.find(s => s.studentId === studentId);
          return {
            studentId,
            date: selectedDateStr,
            status,
            class: selectedClass,
            section: selectedSection,
            studentName: student?.name || student?.basicInfo?.name || 'Unknown'
          };
        });
      }

      const result = await StudentApi.saveAttendance({
        date: selectedDateStr,
        records: records,
        class: `${selectedClass}-${selectedSection}`,
        isHoliday: isHoliday
      });

      if (result.success) {
        toast.success(isHoliday ? 'Holiday marked successfully!' : 'Attendance saved successfully!');
        await loadAttendance();
        if (onUpdateStudent) {
          onUpdateStudent();
        }
      } else {
        toast.error('Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Error saving attendance');
    } finally {
      setIsSaving(false);
    }
  };

  // Export attendance as CSV
  const exportAttendance = async () => {
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
      // Prepare CSV data
      const headers = ['S.No', 'Roll No', 'Student Name', 'Class', 'Section', 'Date', 'Status'];
      
      const rows = classStudents.map((student, index) => {
        const status = attendanceData[student.studentId] || 'present';
        return [
          index + 1,
          getStudentRollNo(student),
          getStudentName(student),
          selectedClass,
          selectedSection,
          selectedDateStr,
          status.charAt(0).toUpperCase() + status.slice(1)
        ];
      });

      // If holiday, add a holiday row
      if (isHoliday) {
        rows.push([
          '-',
          '-',
          'HOLIDAY',
          selectedClass,
          selectedSection,
          selectedDateStr,
          holidayReason || 'Holiday'
        ]);
      }

      // Generate CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${selectedClass}-${selectedSection}_${selectedDateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Attendance exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance');
    } finally {
      setIsExporting(false);
    }
  };

  // Toggle attendance status for a student
  const toggleAttendance = (studentId) => {
    if (isHoliday) {
      toast.warning('Cannot modify attendance on a holiday');
      return;
    }
    setAttendanceData(prev => {
      const currentStatus = prev[studentId] || 'present';
      return { ...prev, [studentId]: currentStatus === 'present' ? 'absent' : 'present' };
    });
  };

  // Mark all students as present or absent
  const markAll = (status) => {
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
      updated[student.studentId] = status;
    });
    setAttendanceData(updated);
    toast.success(`All students marked as ${status}`);
  };

  // Toggle holiday mode
  const toggleHoliday = () => {
    if (!selectedDateStr) {
      toast.warning('Please select a date first');
      return;
    }
    
    if (isHoliday) {
      // Remove holiday
      setIsHoliday(false);
      setHolidayReason('');
      // Reset attendance to present for all students
      const defaultAttendance = {};
      classStudents.forEach(student => {
        defaultAttendance[student.studentId] = 'present';
      });
      setAttendanceData(defaultAttendance);
      toast.info('Holiday mode deactivated');
    } else {
      setIsHoliday(true);
      setAttendanceData({});
      toast.info('Holiday mode activated. Enter reason and save.');
    }
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    if (status === 'present') {
      return {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        icon: <CheckCircle size={16} className="text-emerald-600" />,
        label: 'Present'
      };
    } else {
      return {
        color: 'bg-rose-100 text-rose-700 border-rose-300',
        icon: <XCircle size={16} className="text-rose-600" />,
        label: 'Absent'
      };
    }
  };

  // Get student name safely
  const getStudentName = (student) => {
    return student.name || student.basicInfo?.name || 'Unknown';
  };

  // Get student roll number safely
  const getStudentRollNo = (student) => {
    return student.rollNumber || student.rollNo || student.basicInfo?.admissionNo || '-';
  };

  // Check if class and section are selected
  const isClassSelected = selectedClass && selectedSection;

  // Set today's date on load
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setSelectedDateStr(todayStr);
  }, []);

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
              onClick={loadAttendance}
              disabled={!isClassSelected || isLoading}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 text-sm"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Class, Section, and Date Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">Select Section</option>
              {sectionList.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar size={15} className="inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => {
                setSelectedDateStr(e.target.value);
                setHasLoaded(false);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={toggleHoliday}
              disabled={!isClassSelected || !selectedDateStr}
              className={`w-full px-4 py-2.5 text-sm rounded-lg transition flex items-center justify-center gap-2 ${
                isHoliday 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              } disabled:opacity-50`}
            >
              <Gift size={18} />
              {isHoliday ? 'Cancel Holiday' : 'Mark Holiday'}
            </button>
          </div>
        </div>

        {/* Holiday Reason Input */}
        {isHoliday && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter holiday reason..."
              value={holidayReason}
              onChange={(e) => setHolidayReason(e.target.value)}
              className="w-full border border-amber-300 bg-amber-50 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Main Content Area - Only show when class and section are selected */}
        {isClassSelected ? (
          <>
            {/* Holiday Banner */}
            {isHoliday && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4 flex items-center gap-3">
                <Gift size={24} className="text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Holiday</p>
                  <p className="text-sm text-amber-700">{holidayReason || 'No classes today'}</p>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            {!isHoliday && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{attendanceStats.present}</div>
                  <div className="text-xs text-emerald-700 font-medium">Present</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-rose-600">{attendanceStats.absent}</div>
                  <div className="text-xs text-rose-700 font-medium">Absent</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {isHoliday ? 1 : 0}
                  </div>
                  <div className="text-xs text-amber-700 font-medium">Holiday</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{attendanceStats.percentage}%</div>
                  <div className="text-xs text-indigo-700 font-medium">Rate</div>
                </div>
              </div>
            )}

            {/* Quick Action Buttons - Only show when not holiday */}
            {!isHoliday && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => markAll('present')}
                  disabled={!selectedDateStr || isLoading}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  All Present
                </button>
                <button
                  onClick={() => markAll('absent')}
                  disabled={!selectedDateStr || isLoading}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle size={14} />
                  All Absent
                </button>
                <span className="text-sm text-gray-500 ml-auto">
                  {classStudents.length} students • {selectedClass}-{selectedSection}
                </span>
              </div>
            )}

            {/* Attendance Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                    <span className="ml-3 text-gray-600">Loading...</span>
                  </div>
                ) : isHoliday ? (
                  <div className="text-center py-12">
                    <Gift size={48} className="mx-auto mb-3 text-amber-400" />
                    <p className="text-gray-500 font-medium text-lg">Holiday</p>
                    <p className="text-sm text-gray-400">{holidayReason || 'No classes today'}</p>
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500">No students in {selectedClass}-{selectedSection}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll No</th> */}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student Name</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classStudents.map((student, index) => {
                        const status = attendanceData[student.studentId] || 'present';
                        const statusInfo = getStatusInfo(status);
                        
                        return (
                          <tr key={student.studentId} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                            {/* <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {getStudentRollNo(student)}
                            </td> */}
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {getStudentName(student)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleAttendance(student.studentId)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition font-medium ${
                                  status === 'present'
                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                              >
                                {status === 'present' ? 'Mark Absent' : 'Mark Present'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Footer - Save and Export Buttons */}
            {!isLoading && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-400">
                  {selectedDateStr && (
                    <span>Date: {new Date(selectedDateStr).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={saveAttendance}
                    disabled={!isClassSelected || isSaving || isLoading || classStudents.length === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 text-sm font-medium"
                  >
                    {isSaving ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Attendance
                      </>
                    )}
                  </button>
                  <button
                    onClick={exportAttendance}
                    disabled={!isClassSelected || isExporting || isLoading || classStudents.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 text-sm font-medium"
                  >
                    {isExporting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={18} />
                        Export CSV
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <School size={56} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium text-lg">Select Class and Section</p>
            <p className="text-sm text-gray-400 mt-1">Choose from the dropdowns above to start marking attendance</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;