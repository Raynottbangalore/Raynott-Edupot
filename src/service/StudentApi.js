// src/services/StudentApi.js
import { auth } from './firebase';  // Your Firebase config/import
import BASE_URL from './base_urls';  // e.g. http://localhost:5000/api or production URL

class StudentApi {
  static async getAuthHeader() {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const token = await user.getIdToken(/* forceRefresh */ true);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ────────────────────────────────────────────────
  // Student CRUD
  // ────────────────────────────────────────────────

  /**
   * Create a new student (school admin only)
   * @param {Object} studentData - Full student object from AddStudent component
   */
  static async createStudent(studentData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students`, {
        method: 'POST',
        headers,
        body: JSON.stringify(studentData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to create student');
      }

      return {
        success: true,
        studentId: data.studentId,
        student: data.student,
        message: 'Student created successfully',
      };
    } catch (error) {
      console.error('Create student error:', error);
      return { success: false, error: error.message || 'Could not create student' };
    }
  }

  /**
   * Get all students for the current school
   */
  // src/service/StudentApi.js
static async getAllStudents() {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/students`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load students');
    }

    return {
      success: true,
      students: data.students || [],
    };
  } catch (error) {
    console.error('Get all students error:', error);
    return { success: false, error: error.message || 'Could not fetch students' };
  }
}



/**
 * Get all students with their class exam marks merged - WITH FORCE REFRESH
 */
// src/service/StudentApi.js - Fix the getAllStudentsWithClassMarks method

/**
 * Get all students with their class exam marks merged - WITH FORCE REFRESH
 */
static async getAllStudentsWithClassMarks(forceRefresh = true) {
  try {
    console.log('🔍 Fetching all students with class marks...', forceRefresh ? '(FORCE REFRESH)' : '');
    
    // Add cache-busting parameter
    const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
    
    // First get all students with cache-busting
    const studentsResult = await this.getAllStudents(forceRefresh);
    console.log('📊 Students API response:', studentsResult);
    
    if (!studentsResult.success) {
      console.error('❌ Failed to get students:', studentsResult.error);
      return studentsResult;
    }

    const students = studentsResult.students || [];
    console.log(`👥 Found ${students.length} students`);
    
    if (students.length === 0) {
      return { success: true, students: [] };
    }

    // Get unique classes from students
    const classMap = new Map();
    students.forEach(student => {
      const grade = student.basicInfo?.grade;
      const section = student.basicInfo?.section;
      if (grade && section) {
        const key = `${grade}-${section}`;
        if (!classMap.has(key)) {
          classMap.set(key, { grade, section, studentIds: [] });
        }
        classMap.get(key).studentIds.push(student.studentId);
      }
    });

    console.log('📚 Unique classes found:', Array.from(classMap.keys()));

    // Fetch exams for each class with cache-busting
    const examMap = new Map();
    for (const [key, classData] of classMap) {
      try {
        console.log(`🔍 Fetching exams for class ${key}...`);
        const examsResult = await this.getClassExams(classData.grade, classData.section, forceRefresh);
        console.log(`📊 Class ${key} exams response:`, examsResult);
        
        if (examsResult.success && examsResult.exams && examsResult.exams.length > 0) {
          console.log(`✅ Found ${examsResult.exams.length} exams for class ${key}`);
          // Store the exams with their full structure
          examMap.set(key, examsResult.exams);
        } else {
          console.log(`⚠️ No exams found for class ${key}`);
          examMap.set(key, []);
        }
      } catch (error) {
        console.error(`❌ Error fetching exams for class ${key}:`, error);
        examMap.set(key, []);
      }
    }

    // Merge exam marks into students
    const studentsWithMarks = students.map(student => {
      const grade = student.basicInfo?.grade;
      const section = student.basicInfo?.section;
      const key = `${grade}-${section}`;
      const classExams = examMap.get(key) || [];
      
      // Extract this student's marks from each class exam
      const studentClassExams = classExams
        .filter(exam => exam.marks && exam.marks[student.studentId])
        .map(exam => {
          const studentMarks = exam.marks[student.studentId];
          
          // CRITICAL FIX: Ensure subjects are properly formatted
          let subjects = [];
          
          // Check if studentMarks has a marks array
          if (studentMarks && studentMarks.marks && Array.isArray(studentMarks.marks)) {
            // Use the marks from studentMarks.marks
            subjects = studentMarks.marks.map(mark => ({
              name: mark.name || 'Unknown Subject',
              marks: mark.marks || 0,
              total: mark.total || 0,
              grade: mark.grade || this.calculateGrade(((mark.marks || 0) / (mark.total || 1)) * 100)
            }));
          } else if (exam.subjects && Array.isArray(exam.subjects)) {
            // Fallback: use exam subjects with default values
            subjects = exam.subjects.map(subject => ({
              name: subject.name || 'Unknown Subject',
              marks: 0,
              total: subject.total || 0,
              grade: 'N/A'
            }));
          }
          
          // Calculate total marks and percentage from subjects
          const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);
          const totalPossible = subjects.reduce((sum, s) => sum + (s.total || 0), 0);
          const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
          
          return {
            id: exam.id || Date.now().toString(),
            examType: exam.examType || 'Class Exam',
            examDate: exam.examDate || new Date().toISOString().split('T')[0],
            subjects: subjects,
            totalMarks: totalMarks,
            totalPossible: totalPossible,
            percentage: Math.round(percentage * 10) / 10,
            overallGrade: this.calculateGrade(percentage)
          };
        });

      // Get existing individual exams from student's marks
      const existingExams = (student.marks?.exams || []).map(exam => {
        // Ensure existing exams also have proper subject structure
        if (exam.subjects && Array.isArray(exam.subjects)) {
          return exam;
        }
        return {
          ...exam,
          subjects: exam.subjects || []
        };
      });
      
      // Combine both - class exams first, then individual exams
      const allExams = [...studentClassExams, ...existingExams];
      
      // Sort by date if available
      allExams.sort((a, b) => {
        const dateA = a.examDate || '';
        const dateB = b.examDate || '';
        return dateA.localeCompare(dateB);
      });

      return {
        ...student,
        marks: {
          ...student.marks,
          exams: allExams
        }
      };
    });

    console.log(`✅ Final: ${studentsWithMarks.length} students with marks merged`);
    
    // Log first student's exam data for debugging
    if (studentsWithMarks.length > 0) {
      const firstStudent = studentsWithMarks[0];
      console.log('🔍 Sample student marks structure:', {
        name: firstStudent.basicInfo?.name,
        totalExams: firstStudent.marks?.exams?.length || 0,
        firstExam: firstStudent.marks?.exams?.[0] || null
      });
    }
    
    return {
      success: true,
      students: studentsWithMarks
    };
  } catch (error) {
    console.error('❌ Get all students with class marks error:', error);
    return { success: false, error: error.message || 'Failed to load students with marks', students: [] };
  }
}

/**
 * Get all students - WITH FORCE REFRESH
 */
static async getAllStudents(forceRefresh = true) {
  try {
    const headers = await this.getAuthHeader();
    const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
    const response = await fetch(`${BASE_URL}/students${cacheBuster}`, {
      method: 'GET',
      headers,
      cache: 'no-store' // Prevent caching
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load students');
    }

    return {
      success: true,
      students: data.students || [],
    };
  } catch (error) {
    console.error('Get all students error:', error);
    return { success: false, error: error.message || 'Could not fetch students' };
  }
}

/**
 * Get class exams - WITH FORCE REFRESH
 */
static async getClassExams(grade, section, forceRefresh = true) {
  try {
    const headers = await this.getAuthHeader();
    const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
    const response = await fetch(`${BASE_URL}/class-exams/${grade}/${section}/exams${cacheBuster}`, {
      method: 'GET',
      headers,
      cache: 'no-store' // Prevent caching
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch class exams', exams: [] };
    }
    
    return { 
      success: true, 
      exams: Array.isArray(data.exams) ? data.exams : [] 
    };
  } catch (error) {
    console.error('Get class exams error:', error);
    return { success: false, error: error.message, exams: [] };
  }
}

/**
 * Helper: Calculate grade based on percentage
 */
static calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  if (percentage > 0) return 'F';
  return 'N/A';
}

  /**
   * Get single student by ID
   * @param {string} studentId 
   */
  static async getStudent(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Student not found');
      }

      return { success: true, student: data.student };
    } catch (error) {
      console.error('Get student error:', error);
      return { success: false, error: error.message || 'Could not fetch student' };
    }
  }

  /**
   * Update any student fields (basicInfo, feeStructure, etc.)
   * @param {string} studentId 
   * @param {Object} updates 
   */
  static async updateStudent(studentId, updates) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data; // { success: true } or { success: false, message }
    } catch (error) {
      console.error('Update student error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a student (permanent)
   */
  static async deleteStudent(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Delete failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete student error:', error);
      return { success: false, error: error.message };
    }
  }

  // ────────────────────────────────────────────────
  // Fee Installments CRUD
  // ────────────────────────────────────────────────

  /**
   * Add a new installment
   * @param {string} studentId 
   * @param {Object} installmentData - { amount, dueDate, paymentMode?, notes?, ... }
   */
  static async addInstallment(studentId, installmentData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/installments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(installmentData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add installment');
      }

      return { success: true, installment: data.installment };
    } catch (error) {
      console.error('Add installment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing installment (amount, paid, status, dueDate, etc.)
   */
  static async updateInstallment(studentId, installmentId, updates) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/installments/${installmentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update installment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an installment
   */
  static async deleteInstallment(studentId, installmentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/installments/${installmentId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete installment error:', error);
      return { success: false, error: error.message };
    }
  }

  // ────────────────────────────────────────────────
  // Marks / Academic Configuration
  // ────────────────────────────────────────────────
/**
   * Get only the marks object for a student
   * @param {string} studentId
   * @returns {Promise<{success: boolean, marks?: object, error?: string}>}
   */
  static async getMarks(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/marks`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch marks');
      }

      return {
        success: true,
        marks: data.marks || null,
      };
    } catch (error) {
      console.error('Get marks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a new exam to the student's marks
   * @param {string} studentId
   * @param {object} examData - { examType, examDate, subjects: [...], ... }
   */
  static async addExam(studentId, examData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/marks/exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(examData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to add exam');
      }

      return {
        success: true,
        exam: data.exam,
      };
    } catch (error) {
      console.error('Add exam error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an exam by its ID
   * @param {string} studentId
   * @param {string} examId
   */
  static async deleteExam(studentId, examId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/marks/exams/${examId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to delete exam');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete exam error:', error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Update full marks object (subjects, examTypes, gradingScale, exams array, totals, etc.)
   * This replaces the entire marks field — matches how Marks.jsx updates
   * @param {string} studentId 
   * @param {Object} marksData - Full { subjects, examTypes, gradingScale, maxMarks, exams: [...] }
   */
  static async updateMarks(studentId, marksData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/marks`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(marksData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update marks');
      }

      return { success: true };
    } catch (error) {
      console.error('Update marks error:', error);
      return { success: false, error: error.message };
    }
  }

static async searchStudents(criteria = {}) {
  try {
    const headers = await this.getAuthHeader();
    
    // Remove empty fields to make URL cleaner
    const cleanCriteria = {};
    Object.entries(criteria).forEach(([key, value]) => {
      if (value && String(value).trim() !== '') {
        cleanCriteria[key] = value.trim();
      }
    });

    const params = new URLSearchParams(cleanCriteria).toString();
    const url = `${BASE_URL}/students/search?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    // Even if no students found → success with empty array
    if (response.ok) {
      return {
        success: true,
        students: data.students || [],
        count: data.count || 0
      };
    }

    // Only throw on real server errors (4xx/5xx with meaningful message)
    throw new Error(data.error || data.message || `Server responded with status ${response.status}`);
  } catch (error) {
    console.error('Search students error:', error);
    return { 
      success: false, 
      error: error.message || 'Could not search students. Please try again.' 
    };
  }
}


  // ────────────────────────────────────────────────
  // Assessment Reports
  // ────────────────────────────────────────────────

  /**
   * Get all assessments for a student
   */
  static async getAssessments(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch assessments');
      }

      return {
        success: true,
        assessments: data.assessments || { categories: [], assessments: [] }
      };
    } catch (error) {
      console.error('Get assessments error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a new assessment category
   */
  static async addAssessmentCategory(studentId, categoryData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add category');
      }

      return { success: true, category: data.category };
    } catch (error) {
      console.error('Add category error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an assessment category
   */
  static async updateAssessmentCategory(studentId, categoryId, updates) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments/categories/${categoryId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update category error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an assessment category
   */
  static async deleteAssessmentCategory(studentId, categoryId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments/categories/${categoryId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete category error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add an assessment record
   */
  static async addAssessment(studentId, assessmentData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify(assessmentData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to add assessment');
      }

      return { success: true, assessment: data.assessment };
    } catch (error) {
      console.error('Add assessment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an assessment record
   */
  static async updateAssessment(studentId, assessmentId, updates) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments/records/${assessmentId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update assessment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an assessment record
   */
  static async deleteAssessment(studentId, assessmentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/students/${studentId}/assessments/records/${assessmentId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete assessment error:', error);
      return { success: false, error: error.message };
    }
  }

  // Add this to StudentApi.js if needed
static async getStudentsBySchool(schoolId) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/students?schoolId=${schoolId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to load students');
    }

    return {
      success: true,
      students: data.students || [],
    };
  } catch (error) {
    console.error('Get students by school error:', error);
    return { success: false, error: error.message || 'Could not fetch students' };
  }
}
// Add these methods to your StudentApi class in src/service/StudentApi.js

  // ────────────────────────────────────────────────
  // Hall Ticket Management
  // ────────────────────────────────────────────────

  /**
   * Save or update hall ticket for a student
   * @param {string} studentId - Student ID
   * @param {Object} hallTicketData - Hall ticket data object
   * @param {File|null} photoFile - Optional photo file for upload
   * @returns {Promise<{success: boolean, hallTicket?: Object, imageUrl?: string, error?: string}>}
   */
  static async saveHallTicket(studentId, hallTicketData, photoFile = null) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
      const token = await user.getIdToken(true);
      
      const formData = new FormData();
      
      // Stringify the hall ticket data
      formData.append('hallTicketData', JSON.stringify(hallTicketData));
      
      // Append photo if provided
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      
      const response = await fetch(`${BASE_URL}/halltickets/${studentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set with boundary
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save hall ticket');
      }
      
      return {
        success: true,
        hallTicket: data.hallTicket,
        imageUrl: data.imageUrl,
        message: 'Hall ticket saved successfully'
      };
    } catch (error) {
      console.error('Save hall ticket error:', error);
      return { success: false, error: error.message || 'Could not save hall ticket' };
    }
  }
  
  /**
   * Get hall ticket for a specific student
   * @param {string} studentId - Student ID
   * @returns {Promise<{success: boolean, hallTicket?: Object, error?: string}>}
   */
  static async getHallTicket(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/${studentId}`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (response.status === 404) {
          return { success: false, error: 'Hall ticket not found' };
        }
        throw new Error(data.error || 'Failed to fetch hall ticket');
      }
      
      return { 
        success: true, 
        hallTicket: data.hallTicket 
      };
    } catch (error) {
      console.error('Get hall ticket error:', error);
      return { success: false, error: error.message || 'Could not fetch hall ticket' };
    }
  }
  
  /**
   * Get all hall tickets for the current school
   * @returns {Promise<{success: boolean, hallTickets?: Array, count?: number, error?: string}>}
   */
  static async getAllHallTickets() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch hall tickets');
      }
      
      return {
        success: true,
        hallTickets: data.hallTickets || [],
        count: data.count || 0
      };
    } catch (error) {
      console.error('Get all hall tickets error:', error);
      return { success: false, error: error.message || 'Could not fetch hall tickets' };
    }
  }
  
  /**
   * Check if hall ticket exists for a student
   * @param {string} studentId - Student ID
   * @returns {Promise<boolean>}
   */
  static async hallTicketExists(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/${studentId}/exists`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('Check hall ticket exists error:', error);
      return false;
    }
  }
  
  /**
   * Delete hall ticket for a student
   * @param {string} studentId - Student ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async deleteHallTicket(studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/${studentId}`, {
        method: 'DELETE',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete hall ticket');
      }
      
      return { success: true, message: 'Hall ticket deleted successfully' };
    } catch (error) {
      console.error('Delete hall ticket error:', error);
      return { success: false, error: error.message || 'Could not delete hall ticket' };
    }
  }
  
  /**
   * Get hall tickets by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, hallTickets?: Array, error?: string}>}
   */
  static async getHallTicketsByDateRange(startDate, endDate) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/reports/date-range?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch hall tickets');
      }
      
      return { success: true, hallTickets: data.hallTickets || [] };
    } catch (error) {
      console.error('Get hall tickets by date range error:', error);
      return { success: false, error: error.message || 'Could not fetch hall tickets' };
    }
  }
  
  /**
   * Bulk generate hall tickets for multiple students (Admin only)
   * @param {Array<string>} studentIds - Array of student IDs
   * @param {Object} templateData - Hall ticket template data
   * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
   */
  static async bulkGenerateHallTickets(studentIds, templateData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/bulk/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentIds, templateData }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to bulk generate hall tickets');
      }
      
      return { 
        success: true, 
        results: data.results,
        message: data.message
      };
    } catch (error) {
      console.error('Bulk generate hall tickets error:', error);
      return { success: false, error: error.message || 'Could not bulk generate hall tickets' };
    }
  }
  
  /**
   * Get hall ticket template for the school
   * @returns {Promise<Object|null>}
   */
  static async getHallTicketTemplate() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/template/settings`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        return null;
      }
      
      return data.template || null;
    } catch (error) {
      console.error('Get hall ticket template error:', error);
      return null;
    }
  }
  
  /**
   * Save hall ticket template (Admin only)
   * @param {Object} templateData - Template data to save
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  static async saveHallTicketTemplate(templateData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/template/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(templateData),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save template');
      }
      
      return { success: true, message: 'Template saved successfully' };
    } catch (error) {
      console.error('Save hall ticket template error:', error);
      return { success: false, error: error.message || 'Could not save template' };
    }
  }
  
  /**
   * Export hall tickets as CSV (Admin only)
   * @returns {Promise<{success: boolean, data?: Array, count?: number, error?: string}>}
   */
  static async exportHallTicketsCSV() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/halltickets/export/csv`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to export hall tickets');
      }
      
      return {
        success: true,
        data: data.data || [],
        count: data.count || 0
      };
    } catch (error) {
      console.error('Export hall tickets CSV error:', error);
      return { success: false, error: error.message || 'Could not export hall tickets' };
    }
  }
  
  /**
   * Get hall ticket with student details (for display)
   * @param {string} studentId - Student ID
   * @returns {Promise<{success: boolean, hallTicket?: Object, student?: Object, error?: string}>}
   */
  static async getHallTicketWithStudentDetails(studentId) {
    try {
      // Get hall ticket and student data in parallel
      const [hallTicketResult, studentResult] = await Promise.all([
        this.getHallTicket(studentId),
        this.getStudent(studentId)
      ]);
      
      if (!hallTicketResult.success) {
        return { success: false, error: hallTicketResult.error };
      }
      
      return {
        success: true,
        hallTicket: hallTicketResult.hallTicket,
        student: studentResult.success ? studentResult.student : null
      };
    } catch (error) {
      console.error('Get hall ticket with student details error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Print hall ticket (opens print dialog)
   * @param {string} studentId - Student ID
   * @returns {Promise<{success: boolean, html?: string, error?: string}>}
   */
  static async getHallTicketHTML(studentId) {
    try {
      const result = await this.getHallTicketWithStudentDetails(studentId);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Generate HTML for printing
      const html = this.generateHallTicketHTML(result.hallTicket, result.student);
      
      return { success: true, html };
    } catch (error) {
      console.error('Get hall ticket HTML error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Generate HTML for hall ticket printing
   * @private
   */
  static generateHallTicketHTML(hallTicket, student) {
    const data = hallTicket?.hallTicketData || {};
    const basicInfo = student?.basicInfo || {};
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hall Ticket - ${data.studentName || basicInfo.name || 'Student'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f0f0f0;
          }
          .hall-ticket {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border: 2px solid #333;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .school-name {
            font-size: 28px;
            font-weight: bold;
            color: #b45309;
            margin-bottom: 5px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .info-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
          }
          .info-row {
            display: flex;
            margin: 10px 0;
            padding: 5px;
          }
          .label {
            font-weight: bold;
            width: 150px;
          }
          .value {
            flex: 1;
          }
          .subjects table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .subjects th, .subjects td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          .subjects th {
            background: #f5f5f5;
          }
          .instructions {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
          }
          .instructions ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .signature {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
          }
          .photo-container {
            float: right;
            width: 100px;
            height: 120px;
            border: 1px solid #ddd;
            margin-left: 15px;
            margin-bottom: 15px;
            text-align: center;
            overflow: hidden;
          }
          .photo-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .clearfix::after {
            content: "";
            clear: both;
            display: table;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="hall-ticket">
          <div class="header">
            <div class="school-name">${data.schoolName || 'School Name'}</div>
            <div>${data.schoolAffiliation || ''}</div>
            <div class="title">${data.examTitle || 'HALL TICKET'}</div>
          </div>
          
          <div class="clearfix">
            ${hallTicket?.imageUrl ? `<div class="photo-container"><img src="${hallTicket.imageUrl}" alt="Student Photo" /></div>` : ''}
            
            <div class="info-section">
              <div class="info-row">
                <div class="label">Student Name:</div>
                <div class="value">${data.studentName || basicInfo.name || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="label">Father's Name:</div>
                <div class="value">${data.fatherName || basicInfo.fatherName || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="label">Roll Number:</div>
                <div class="value">${data.rollNumber || basicInfo.admissionNo || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="label">Class/Section:</div>
                <div class="value">${data.studentClass || basicInfo.grade || 'N/A'} - ${data.section || basicInfo.section || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="subjects">
            <h3>Examination Schedule</h3>
            <table>
              <thead>
                <tr><th>Subject</th><th>Date</th><th>Time</th><th>Venue</th></tr>
              </thead>
              <tbody>
                ${(data.subjects || []).map(subject => `
                  <tr>
                    <td>${subject.name} ${subject.code ? `(${subject.code})` : ''}</td>
                    <td>${subject.date || data.examDate || 'TBA'}</td>
                    <td>${subject.time || data.examTime || 'TBA'}</td>
                    <td>${subject.venue || 'Main Hall'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="instructions">
            <h3>Important Instructions:</h3>
            <ul>
              ${(data.instructions || []).map(instruction => `<li>${instruction}</li>`).join('')}
            </ul>
          </div>

          <div class="signature">
            <div>_________________<br>${data.studentSignature || "Student's Signature"}</div>
            <div>_________________<br>${data.principalSignature || 'Principal'}<br>${data.principalName || ''}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  // Add these methods to src/service/StudentApi.js

// ────────────────────────────────────────────────
// School Information Management
// ────────────────────────────────────────────────

/**
 * Get school information
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
static async getSchoolInfo() {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/school-info`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch school info');
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Get school info error:', error);
    return { success: false, error: error.message || 'Could not fetch school info' };
  }
}
/**
 * Save school information
 * @param {Object} schoolData - { schoolName, schoolAddress, schoolAffiliation }
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
static async saveSchoolInfo(schoolData) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/school-info`, {
      method: 'POST',
      headers,
      body: JSON.stringify(schoolData),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to save school info');
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Save school info error:', error);
    return { success: false, error: error.message || 'Could not save school info' };
  }
}

// ────────────────────────────────────────────────
// Hall Ticket Settings Management
// ────────────────────────────────────────────────

/**
 * Get hall ticket settings for a specific class/section
 * @param {string} key - The storage key (e.g., "hallTicketCommon_10-A")
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
static async getHallTicketSettings(key) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/hallticket-settings/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      return { 
        success: false, 
        error: data.error || 'Settings not found',
        data: null
      };
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Get hall ticket settings error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save hall ticket settings for a specific class/section
 * @param {string} key - The storage key
 * @param {Object} settingsData - The settings data to save
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
static async saveHallTicketSettings(key, settingsData) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/hallticket-settings/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(settingsData),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to save settings');
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Save hall ticket settings error:', error);
    return { success: false, error: error.message || 'Could not save settings' };
  }
}

/**
 * Get all hall ticket settings for the school
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
static async getAllHallTicketSettings() {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/hallticket-settings`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch settings');
    }
    
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Get all hall ticket settings error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete hall ticket settings for a class/section
 * @param {string} key - The storage key
 * @returns {Promise<{success: boolean, error?: string}>}
 */
static async deleteHallTicketSettings(key) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/hallticket-settings/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete settings');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete hall ticket settings error:', error);
    return { success: false, error: error.message };
  }
}

 /**
   * Setup class subjects (common for all exams in this class)
   */
  static async setupClassSubjects(grade, section, subjects) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/class-exams/${grade}/${section}/subjects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subjects }),
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to setup class subjects');
      }
      return data;
    } catch (error) {
      console.error('Setup class subjects error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get class subjects
   */
  static async getClassSubjects(grade, section) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/class-exams/${grade}/${section}/subjects`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    if (!response.ok || !data.success) {
      // Return empty subjects instead of throwing
      return { success: false, error: data.error || 'Failed to fetch class subjects', subjects: [] };
    }
    return { success: true, subjects: data.subjects || [] };
  } catch (error) {
    console.error('Get class subjects error:', error);
    return { success: false, error: error.message, subjects: [] };
  }
}

 /**
   * Create a class exam
   */
 static async createClassExam(grade, section, examData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/class-exams/${grade}/${section}/exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(examData),
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create class exam');
      }
      return data;
    } catch (error) {
      console.error('Create class exam error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all exams for a class
   */
  static async getClassExams(grade, section) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/class-exams/${grade}/${section}/exams`, {
        method: 'GET',
        headers,
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch class exams');
      }
      return { 
        success: true, 
        exams: Array.isArray(data.exams) ? data.exams : [] 
      };
    } catch (error) {
      console.error('Get class exams error:', error);
      return { success: false, error: error.message, exams: [] };
    }
  }

  /**
   * Update student marks for a class exam
   */
  static async updateStudentClassExamMarks(grade, section, examId, studentId, marks) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(
        `${BASE_URL}/class-exams/${grade}/${section}/${examId}/${studentId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ marks }),
        }
      );
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update marks');
      }
      return data;
    } catch (error) {
      console.error('Update class exam marks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get student's marks for all class exams
   */
  static async getStudentClassExamMarks(grade, section, studentId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(
        `${BASE_URL}/class-exams/${grade}/${section}/${studentId}`,
        {
          method: 'GET',
          headers,
        }
      );
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch student marks');
      }
      return data;
    } catch (error) {
      console.error('Get student class exam marks error:', error);
      return { success: false, error: error.message, marks: [] };
    }
  }

  /**
   * Delete a class exam
   */
 static async deleteClassExam(grade, section, examId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/class-exams/${grade}/${section}/exams/${examId}`, {
        method: 'DELETE',
        headers,
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete exam');
      }
      return data;
    } catch (error) {
      console.error('Delete class exam error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default StudentApi;
