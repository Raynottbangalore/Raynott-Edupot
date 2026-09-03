// src/service/StudentApi.js
import { auth } from './firebase';
import BASE_URL from './base_urls';

class StudentApi {
  // ────────────────────────────────────────────────
  // Token Cache & Quota Management
  // ────────────────────────────────────────────────

  static tokenCache = {
    token: null,
    expiry: null,
    userId: null,
    refreshTimer: null
  };

  static quotaState = {
    exceeded: false,
    retryAfter: null,
    requestTimestamps: [],
    maxRequestsPerMinute: 30
  };

  /**
   * Get auth header with token caching (NO force refresh)
   */
  static async getAuthHeader() {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    // Check if quota is exceeded
    if (this.isQuotaExceeded()) {
      await this.waitForQuotaReset();
    }

    // Check rate limit
    if (this.shouldRateLimit()) {
      const waitTime = 1000;
      console.log(`⏳ Rate limiting, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check if cached token is still valid (5-minute buffer)
    const now = Date.now();
    if (
      this.tokenCache.token &&
      this.tokenCache.userId === user.uid &&
      this.tokenCache.expiry &&
      now < this.tokenCache.expiry - 300000
    ) {
      return {
        Authorization: `Bearer ${this.tokenCache.token}`,
        'Content-Type': 'application/json',
      };
    }

    // Get new token WITHOUT force refresh
    try {
      const token = await user.getIdToken(false);
      const result = await user.getIdTokenResult();
      
      // Update cache
      this.tokenCache.token = token;
      this.tokenCache.userId = user.uid;
      this.tokenCache.expiry = new Date(result.expirationTime).getTime();
      
      // Schedule automatic refresh
      this.scheduleTokenRefresh();
      
      // Track this request
      this.trackRequest();

      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('❌ Auth header error:', error);
      if (error.code === 'auth/quota-exceeded') {
        this.setQuotaExceeded(60);
        throw new Error('Authentication quota exceeded. Please try again in a minute.');
      }
      throw error;
    }
  }

  /**
   * Schedule token refresh before expiry
   */
  static scheduleTokenRefresh() {
    if (this.tokenCache.refreshTimer) {
      clearTimeout(this.tokenCache.refreshTimer);
      this.tokenCache.refreshTimer = null;
    }
    
    if (!this.tokenCache.expiry) return;
    
    const refreshTime = this.tokenCache.expiry - Date.now() - 300000;
    if (refreshTime > 0) {
      this.tokenCache.refreshTimer = setTimeout(async () => {
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken(false);
            const result = await user.getIdTokenResult();
            this.tokenCache.token = token;
            this.tokenCache.expiry = new Date(result.expirationTime).getTime();
            this.scheduleTokenRefresh();
          }
        } catch (error) {
          console.error('Scheduled token refresh failed:', error);
        }
      }, refreshTime);
    }
  }

  /**
   * Clear token cache (call on logout)
   */
  static clearTokenCache() {
    this.tokenCache.token = null;
    this.tokenCache.expiry = null;
    this.tokenCache.userId = null;
    if (this.tokenCache.refreshTimer) {
      clearTimeout(this.tokenCache.refreshTimer);
      this.tokenCache.refreshTimer = null;
    }
  }

  // ────────────────────────────────────────────────
  // Quota Management Methods
  // ────────────────────────────────────────────────

  static isQuotaExceeded() {
    if (!this.quotaState.exceeded) return false;
    if (this.quotaState.retryAfter && Date.now() > this.quotaState.retryAfter) {
      this.quotaState.exceeded = false;
      this.quotaState.retryAfter = null;
      return false;
    }
    return true;
  }

  static setQuotaExceeded(retryAfterSeconds = 60) {
    this.quotaState.exceeded = true;
    this.quotaState.retryAfter = Date.now() + (retryAfterSeconds * 1000);
    console.warn(`⚠️ Quota exceeded. Retry after ${retryAfterSeconds} seconds.`);
  }

  static shouldRateLimit() {
    const now = Date.now();
    this.quotaState.requestTimestamps = this.quotaState.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    );
    return this.quotaState.requestTimestamps.length >= this.quotaState.maxRequestsPerMinute;
  }

  static trackRequest() {
    this.quotaState.requestTimestamps.push(Date.now());
  }

  static async waitForQuotaReset() {
    if (!this.isQuotaExceeded()) return;
    const waitTime = this.quotaState.retryAfter - Date.now();
    if (waitTime > 0) {
      console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)} seconds for quota reset...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.quotaState.exceeded = false;
      this.quotaState.retryAfter = null;
    }
  }

  static getRetryDelay(attempt) {
    return Math.min(Math.pow(2, attempt) * 2000, 30000) + Math.random() * 1000;
  }

  // ────────────────────────────────────────────────
  // Generic API Request with Retry Logic
  // ────────────────────────────────────────────────

  static async makeRequest(url, options = {}, retries = 3) {
    let lastError = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Check quota before making request
        if (this.isQuotaExceeded()) {
          await this.waitForQuotaReset();
        }

        // Get auth header
        const headers = await this.getAuthHeader();
        
        // Remove cache-control header to avoid CORS issues
        const requestOptions = { ...options };
        if (requestOptions.headers) {
          // Create a new headers object without cache-control
          const newHeaders = { ...requestOptions.headers };
          delete newHeaders['Cache-Control'];
          delete newHeaders['cache-control'];
          requestOptions.headers = newHeaders;
        }
        
        const response = await fetch(url, {
          ...requestOptions,
          headers: {
            ...headers,
            ...requestOptions.headers,
          },
        });

        // Check if response is OK
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          
          // Handle quota exceeded
          if (
            response.status === 429 || 
            data.error?.includes('quota') ||
            data.code === 'auth/quota-exceeded' ||
            response.statusText?.includes('quota')
          ) {
            let retryAfter = 60;
            if (data.retryAfter) {
              retryAfter = parseInt(data.retryAfter);
            } else if (response.headers?.get('Retry-After')) {
              retryAfter = parseInt(response.headers.get('Retry-After'));
            }
            
            this.setQuotaExceeded(retryAfter);
            
            if (attempt < retries - 1) {
              const delay = this.getRetryDelay(attempt);
              console.warn(`⏳ Quota exceeded, retrying in ${Math.ceil(delay/1000)}s... (Attempt ${attempt + 1}/${retries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            throw new Error('Authentication quota exceeded. Please try again in a few minutes.');
          }
          
          throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse successful response
        const data = await response.json();
        this.trackRequest();
        return data;

      } catch (error) {
        lastError = error;
        
        // Check if it's a CORS error
        if (error.message?.includes('blocked by CORS policy') || 
            error.message?.includes('CORS') ||
            error.message?.includes('Failed to fetch')) {
          console.warn(' CORS error detected, retrying without custom headers...');
          
          if (attempt < retries - 1) {
            const delay = this.getRetryDelay(attempt);
            console.warn(` CORS/Network error, retrying in ${Math.ceil(delay/1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // On CORS error, retry with minimal headers
            try {
              const headers = await this.getAuthHeader();
              const minimalOptions = { ...options };
              // Remove all custom headers except Authorization
              if (minimalOptions.headers) {
                delete minimalOptions.headers['Cache-Control'];
                delete minimalOptions.headers['cache-control'];
                delete minimalOptions.headers['Content-Type'];
              }
              
              const response = await fetch(url, {
                ...minimalOptions,
                headers: {
                  'Authorization': headers.Authorization,
                  'Content-Type': 'application/json',
                },
              });
              
              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
              }
              
              const data = await response.json();
              this.trackRequest();
              return data;
            } catch (retryError) {
              console.warn('Retry with minimal headers failed:', retryError);
              continue;
            }
          }
        }
        
        // If it's a network error, retry
        if (error.message?.includes('network') || 
            error.message?.includes('fetch') ||
            error.message?.includes('Failed to fetch')) {
          if (attempt < retries - 1) {
            const delay = this.getRetryDelay(attempt);
            console.warn(`🌐 Network error, retrying in ${Math.ceil(delay/1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If it's not a retryable error, break
        if (!error.message?.includes('quota') && 
            !error.message?.includes('network') &&
            !error.message?.includes('CORS') &&
            !error.message?.includes('timeout') &&
            !error.message?.includes('Failed to fetch')) {
          break;
        }
      }
    }
    
    throw lastError || new Error('Request failed after multiple retries');
  }

  // ────────────────────────────────────────────────
  // Student CRUD Operations
  // ────────────────────────────────────────────────

  /**
   * Create a new student
   */
  static async createStudent(studentData) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/students`, {
        method: 'POST',
        body: JSON.stringify(studentData),
      });

      return {
        success: true,
        studentId: data.studentId,
        student: data.student,
        message: 'Student created successfully',
      };
    } catch (error) {
      console.error('❌ Create student error:', error);
      return { success: false, error: error.message || 'Could not create student' };
    }
  }

  /**
   * Get all students - NO force refresh by default
   */
  static async getAllStudents(forceRefresh = false) {
    try {
      const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
      const data = await this.makeRequest(`${BASE_URL}/students${cacheBuster}`, {
        method: 'GET',
      });

      return {
        success: true,
        students: data.students || [],
      };
    } catch (error) {
      console.error('❌ Get all students error:', error);
      return { success: false, error: error.message || 'Could not fetch students' };
    }
  }

/**
 * Get all students with class exam marks merged
 */
static async getAllStudentsWithClassMarks(forceRefresh = false) {
  try {
    console.log('🔍 Fetching all students with class marks...', forceRefresh ? '(FORCE REFRESH)' : '');
    
    const studentsResult = await this.getAllStudents(forceRefresh);
    if (!studentsResult.success) {
      return studentsResult;
    }

    const students = studentsResult.students || [];
    console.log(`👥 Found ${students.length} students`);
    
    if (students.length === 0) {
      return { success: true, students: [] };
    }

    // Group students by class and section
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

    // Fetch exams for each class
    const examMap = new Map();
    for (const [key, classData] of classMap) {
      try {
        const examsResult = await this.getClassExams(
          classData.grade, 
          classData.section, 
          forceRefresh
        );
        
        if (examsResult.success && examsResult.exams?.length > 0) {
          examMap.set(key, examsResult.exams);
          console.log(`📚 Class ${key} has ${examsResult.exams.length} exams`);
        } else {
          examMap.set(key, []);
        }
      } catch (error) {
        console.error(`❌ Error fetching exams for class ${key}:`, error);
        examMap.set(key, []);
      }
    }

    // Process students with the latest exam data
    const studentsWithMarks = students.map(student => {
      const grade = student.basicInfo?.grade;
      const section = student.basicInfo?.section;
      const key = `${grade}-${section}`;
      const classExams = examMap.get(key) || [];
      
      // Process each exam from the class
      const processedExams = classExams.map(exam => {
        // Get the latest subjects from the exam
        const latestSubjects = exam.subjects || [];
        
        // Get the student's marks for this exam
        const studentMarks = exam.marks?.[student.studentId];
        let subjects = [];
        
        if (studentMarks?.marks && Array.isArray(studentMarks.marks)) {
          // Create a map of subject name to obtained marks
          const marksMap = {};
          studentMarks.marks.forEach(mark => {
            //  FIX: Ensure marks are parsed as numbers
            const marksObtained = parseFloat(mark.marks) || 0;
            marksMap[mark.name] = marksObtained;
          });
          
          // Build subjects using the latest subject configuration
          subjects = latestSubjects.map(subject => {
            const marksObtained = marksMap[subject.name] || 0;
            //  FIX: Ensure total is parsed as number
            const total = parseFloat(subject.total) || 0;
            const percentage = total > 0 ? (marksObtained / total) * 100 : 0;
            
            return {
              name: subject.name || 'Unknown Subject',
              marks: marksObtained,
              total: total,
              grade: this.calculateGrade(percentage)
            };
          });
        } else {
          // If no marks exist, create empty subject entries
          subjects = latestSubjects.map(subject => ({
            name: subject.name || 'Unknown Subject',
            marks: 0,
            total: parseFloat(subject.total) || 0,
            grade: 'N/A'
          }));
        }
        
        //  FIX: Use reduce with proper number parsing
        const totalMarks = subjects.reduce((sum, s) => {
          const marks = parseFloat(s.marks) || 0;
          return sum + marks;
        }, 0);
        
        const totalPossible = subjects.reduce((sum, s) => {
          const total = parseFloat(s.total) || 0;
          return sum + total;
        }, 0);
        
        const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
        
        return {
          id: exam.id || Date.now().toString(),
          examType: exam.examType || 'Class Exam',
          examDate: exam.examDate || new Date().toISOString().split('T')[0],
          subjects: subjects,
          totalMarks: Math.round(totalMarks * 100) / 100,  // Round to 2 decimal places
          totalPossible: Math.round(totalPossible * 100) / 100,
          percentage: Math.round(percentage * 10) / 10,
          overallGrade: this.calculateGrade(percentage)
        };
      });

      // Merge with existing student exams (for individual marks added outside class exams)
      const existingExams = (student.marks?.exams || []).map(exam => ({
        ...exam,
        subjects: exam.subjects || []
      }));
      
      // Combine and deduplicate by exam id
      const allExamsMap = {};
      processedExams.forEach(exam => {
        allExamsMap[exam.id] = exam;
      });
      existingExams.forEach(exam => {
        if (!allExamsMap[exam.id]) {
          allExamsMap[exam.id] = exam;
        }
      });
      
      const allExams = Object.values(allExamsMap);
      allExams.sort((a, b) => (a.examDate || '').localeCompare(b.examDate || ''));

      return {
        ...student,
        marks: {
          ...student.marks,
          exams: allExams
        }
      };
    });

    return {
      success: true,
      students: studentsWithMarks
    };
  } catch (error) {
    console.error('❌ Get all students with class marks error:', error);
    return { success: false, error: error.message || 'Failed to load students with marks' };
  }
}

  /**
   * Get single student by ID
   */
  static async getStudent(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/students/${studentId}`, {
        method: 'GET',
      });

      return { success: true, student: data.student };
    } catch (error) {
      console.error('❌ Get student error:', error);
      return { success: false, error: error.message || 'Could not fetch student' };
    }
  }

  /**
   * Update student
   */
  static async updateStudent(studentId, updates) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return data;
    } catch (error) {
      console.error('❌ Update student error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete student
   */
  static async deleteStudent(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/students/${studentId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Delete student error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search students
   */
  static async searchStudents(criteria = {}) {
    try {
      const cleanCriteria = {};
      Object.entries(criteria).forEach(([key, value]) => {
        if (value && String(value).trim() !== '') {
          cleanCriteria[key] = value.trim();
        }
      });

      const params = new URLSearchParams(cleanCriteria).toString();
      const data = await this.makeRequest(`${BASE_URL}/students/search?${params}`, {
        method: 'GET',
      });

      return {
        success: true,
        students: data.students || [],
        count: data.count || 0
      };
    } catch (error) {
      console.error('❌ Search students error:', error);
      return { success: false, error: error.message || 'Could not search students' };
    }
  }

  /**
   * Get students by school
   */
  static async getStudentsBySchool(schoolId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/students?schoolId=${schoolId}`, {
        method: 'GET',
      });

      return {
        success: true,
        students: data.students || [],
      };
    } catch (error) {
      console.error('❌ Get students by school error:', error);
      return { success: false, error: error.message || 'Could not fetch students' };
    }
  }

  // ────────────────────────────────────────────────
  // Class Exams Operations
  // ────────────────────────────────────────────────

  /**
   * Get class subjects with force refresh
   */
  static async getClassSubjectsForceRefresh(grade, section) {
    try {
      // Use a cache-buster to force fresh data
      const cacheBuster = `?_=${Date.now()}`;
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/subjects${cacheBuster}`,
        {
          method: 'GET',
        }
      );
      return { success: true, subjects: data.subjects || [] };
    } catch (error) {
      console.error('❌ Force refresh class subjects error:', error);
      return { success: false, error: error.message, subjects: [] };
    }
  }

  /**
   * Get class subjects
   */
  static async getClassSubjects(grade, section) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/subjects`,
        { method: 'GET' }
      );
      return { success: true, subjects: data.subjects || [] };
    } catch (error) {
      console.error('❌ Get class subjects error:', error);
      return { success: false, error: error.message, subjects: [] };
    }
  }

  /**
   * Setup class subjects
   */
  static async setupClassSubjects(grade, section, subjects) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/subjects`,
        {
          method: 'POST',
          body: JSON.stringify({ subjects }),
        }
      );
      return data;
    } catch (error) {
      console.error('❌ Setup class subjects error:', error);
      return { success: false, error: error.message };
    }
  }


/**
 * Update exam subjects and migrate existing marks
 * @param {string} grade - Grade
 * @param {string} section - Section
 * @param {string} examId - Exam ID
 * @param {Array} newSubjects - New subjects array
 * @returns {Promise<Object>} - Result
 */
static async updateExamSubjects(grade, section, examId, newSubjects) {
  try {
    const data = await this.makeRequest(
      `${BASE_URL}/class-exams/${grade}/${section}/exams/${examId}/subjects`,
      {
        method: 'PUT',
        body: JSON.stringify({ subjects: newSubjects }),
      }
    );
    return data;
  } catch (error) {
    console.error('❌ Update exam subjects error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Migrate existing marks to new subject structure
 * @param {string} grade - Grade
 * @param {string} section - Section
 * @param {string} examId - Exam ID
 * @param {Array} newSubjects - New subjects array
 * @returns {Promise<Object>} - Result
 */
static async migrateExamMarks(grade, section, examId, newSubjects) {
  try {
    const data = await this.makeRequest(
      `${BASE_URL}/class-exams/${grade}/${section}/exams/${examId}/migrate`,
      {
        method: 'POST',
        body: JSON.stringify({ subjects: newSubjects }),
      }
    );
    return data;
  } catch (error) {
    console.error('❌ Migrate exam marks error:', error);
    return { success: false, error: error.message };
  }
}

static async getClassExams(grade, section, forceRefresh = false) {
  try {
    // ⭐ Always use cache buster when forceRefresh is true
    const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
    const data = await this.makeRequest(
      `${BASE_URL}/class-exams/${grade}/${section}/exams${cacheBuster}`,
      {
        method: 'GET',
        // ⭐ Add headers to prevent caching
        headers: forceRefresh ? {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        } : {}
      }
    );
    
    // ⭐ Ensure subjects are always present
    const exams = Array.isArray(data.exams) ? data.exams : [];
    const processedExams = exams.map(exam => ({
      ...exam,
      subjects: exam.subjects || []
    }));
    
    return { 
      success: true, 
      exams: processedExams
    };
  } catch (error) {
    console.error('❌ Get class exams error:', error);
    return { success: false, error: error.message, exams: [] };
  }
}
  /**
   * Create class exam
   */
  static async createClassExam(grade, section, examData) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/exams`,
        {
          method: 'POST',
          body: JSON.stringify(examData),
        }
      );
      return data;
    } catch (error) {
      console.error('❌ Create class exam error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete class exam
   */
  static async deleteClassExam(grade, section, examId) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/exams/${examId}`,
        { method: 'DELETE' }
      );
      return data;
    } catch (error) {
      console.error('❌ Delete class exam error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update student class exam marks
   */
  static async updateStudentClassExamMarks(grade, section, examId, studentId, marks) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/${examId}/${studentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ marks }),
        }
      );
      return data;
    } catch (error) {
      console.error('❌ Update class exam marks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get student's marks for all class exams
   */
  static async getStudentClassExamMarks(grade, section, studentId) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/class-exams/${grade}/${section}/${studentId}`,
        { method: 'GET' }
      );
      return data;
    } catch (error) {
      console.error('❌ Get student class exam marks error:', error);
      return { success: false, error: error.message, marks: [] };
    }
  }

  // ────────────────────────────────────────────────
  // Hall Ticket Management
  // ────────────────────────────────────────────────

  /**
   * Save hall ticket
   */
  static async saveHallTicket(studentId, hallTicketData, photoFile = null) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
      
      const token = await user.getIdToken(false);
      
      const formData = new FormData();
      formData.append('hallTicketData', JSON.stringify(hallTicketData));
      
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      
      const response = await fetch(`${BASE_URL}/halltickets/${studentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save hall ticket');
      }
      
      this.trackRequest();
      return {
        success: true,
        hallTicket: data.hallTicket,
        imageUrl: data.imageUrl,
        message: 'Hall ticket saved successfully'
      };
    } catch (error) {
      console.error('❌ Save hall ticket error:', error);
      return { success: false, error: error.message || 'Could not save hall ticket' };
    }
  }

  /**
   * Get hall ticket
   */
  static async getHallTicket(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/halltickets/${studentId}`, {
        method: 'GET',
      });
      return { success: true, hallTicket: data.hallTicket };
    } catch (error) {
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return { success: false, error: 'Hall ticket not found' };
      }
      console.error('❌ Get hall ticket error:', error);
      return { success: false, error: error.message || 'Could not fetch hall ticket' };
    }
  }

  /**
   * Check if hall ticket exists
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
      console.error('❌ Check hall ticket exists error:', error);
      return false;
    }
  }

  /**
   * Get all hall tickets
   */
  static async getAllHallTickets() {
    try {
      const data = await this.makeRequest(`${BASE_URL}/halltickets`, {
        method: 'GET',
      });
      
      return {
        success: true,
        hallTickets: data.hallTickets || [],
        count: data.count || 0
      };
    } catch (error) {
      console.error('❌ Get all hall tickets error:', error);
      return { success: false, error: error.message || 'Could not fetch hall tickets' };
    }
  }

  /**
   * Delete hall ticket
   */
  static async deleteHallTicket(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/halltickets/${studentId}`, {
        method: 'DELETE',
      });
      return { success: true, message: 'Hall ticket deleted successfully' };
    } catch (error) {
      console.error('❌ Delete hall ticket error:', error);
      return { success: false, error: error.message || 'Could not delete hall ticket' };
    }
  }

  /**
   * Get hall ticket with student details
   */
  static async getHallTicketWithStudentDetails(studentId) {
    try {
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
      console.error('❌ Get hall ticket with student details error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get hall ticket HTML for printing
   */
  static async getHallTicketHTML(studentId) {
    try {
      const result = await this.getHallTicketWithStudentDetails(studentId);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const html = this.generateHallTicketHTML(result.hallTicket, result.student);
      return { success: true, html };
    } catch (error) {
      console.error('❌ Get hall ticket HTML error:', error);
      return { success: false, error: error.message };
    }
  }

  // ────────────────────────────────────────────────
  // School Information
  // ────────────────────────────────────────────────

  /**
   * Get school info
   */
  static async getSchoolInfo() {
    try {
      const data = await this.makeRequest(`${BASE_URL}/school-info`, {
        method: 'GET',
      });
      
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Get school info error:', error);
      return { success: false, error: error.message || 'Could not fetch school info' };
    }
  }

  /**
   * Save school info
   */
  static async saveSchoolInfo(schoolData) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/school-info`, {
        method: 'POST',
        body: JSON.stringify(schoolData),
      });
      
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Save school info error:', error);
      return { success: false, error: error.message || 'Could not save school info' };
    }
  }

  // ────────────────────────────────────────────────
  // Hall Ticket Settings
  // ────────────────────────────────────────────────

  /**
   * Get hall ticket settings
   */
  static async getHallTicketSettings(key) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/hallticket-settings/${encodeURIComponent(key)}`,
        { method: 'GET' }
      );
      
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Get hall ticket settings error:', error);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Save hall ticket settings
   */
  static async saveHallTicketSettings(key, settingsData) {
    try {
      const data = await this.makeRequest(
        `${BASE_URL}/hallticket-settings/${encodeURIComponent(key)}`,
        {
          method: 'POST',
          body: JSON.stringify(settingsData),
        }
      );
      
      return { success: true, data: data.data };
    } catch (error) {
      console.error('❌ Save hall ticket settings error:', error);
      return { success: false, error: error.message || 'Could not save settings' };
    }
  }

  // ────────────────────────────────────────────────
  // Helper Methods
  // ────────────────────────────────────────────────

  /**
   * Calculate grade based on percentage
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
   * Generate hall ticket HTML for printing
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

  /**
   * Get quota status
   */
  static getQuotaStatus() {
    return {
      quotaExceeded: this.isQuotaExceeded(),
      retryAfter: this.quotaState.retryAfter,
      requestsInLastMinute: this.quotaState.requestTimestamps.filter(
        t => Date.now() - t < 60000
      ).length,
      maxRequestsPerMinute: this.quotaState.maxRequestsPerMinute,
      timeUntilReset: this.quotaState.retryAfter ? 
        Math.max(0, Math.ceil((this.quotaState.retryAfter - Date.now()) / 1000)) : 0,
    };
  }

  /**
   * Reset quota state
   */
  static resetQuotaState() {
    this.quotaState.exceeded = false;
    this.quotaState.retryAfter = null;
    this.quotaState.requestTimestamps = [];
    this.clearTokenCache();
  }


// src/service/StudentApi.js

/**
 * Get attendance for a specific date and class - FIXED
 */
static async getAttendance(date, classFilter = 'all') {
  try {
    const params = new URLSearchParams({
      date,
      class: classFilter
    });
    
    console.log(`📥 Fetching attendance for ${date}, class: ${classFilter}`);
    
    const data = await this.makeRequest(
      `${BASE_URL}/attendance?${params.toString()}`,
      { method: 'GET' }
    );
    
    console.log('📥 Attendance API response:', data);
    
    // Ensure records is always an array
    const records = data.records || [];
    console.log(`📥 Found ${records.length} records`);
    
    if (records.length > 0) {
      console.log('📥 First record sample:', records[0]);
    }
    
    return {
      success: true,
      records: records,
      summary: data.summary || { present: 0, absent: 0, total: 0 }
    };
  } catch (error) {
    console.error('❌ Get attendance error:', error);
    return { 
      success: false, 
      error: error.message || 'Could not fetch attendance',
      records: [] 
    };
  }
}

/**
 * Save attendance records - FIXED
 */
static async saveAttendance(attendanceData) {
  try {
    // CRITICAL FIX: Ensure status is preserved correctly
    const records = attendanceData.records.map(record => {
      // If it's a holiday record
      if (record.isHoliday) {
        return {
          isHoliday: true,
          reason: record.reason || 'Holiday',
          class: record.class || attendanceData.class || '',
          section: record.section || ''
        };
      }
      
      // Regular attendance - PRESERVE the status exactly as passed
      return {
        studentId: record.studentId,
        status: record.status, // This is the key - keep as is
        class: record.class || attendanceData.class || '',
        section: record.section || '',
        date: attendanceData.date
      };
    });

    const payload = {
      date: attendanceData.date,
      records: records,
      class: attendanceData.class || ''
    };

    console.log('📤 Sending attendance payload:', JSON.stringify(payload, null, 2));

    const data = await this.makeRequest(`${BASE_URL}/attendance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    console.log('📤 Save response:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Save attendance error:', error);
    return { 
      success: false, 
      error: error.message || 'Could not save attendance' 
    };
  }
}

static async saveAttendance(attendanceData) {
  try {
    // CRITICAL FIX: Ensure status is preserved correctly
    const records = attendanceData.records.map(record => {
      // If it's a holiday record
      if (record.isHoliday) {
        return {
          isHoliday: true,
          reason: record.reason || 'Holiday',
          class: record.class || attendanceData.class || '',
          section: record.section || ''
        };
      }
      
      // Regular attendance - PRESERVE the status exactly as passed
      return {
        studentId: record.studentId,
        status: record.status, // This is the key - keep as is
        class: record.class || attendanceData.class || '',
        section: record.section || '',
        date: attendanceData.date
      };
    });

    const payload = {
      date: attendanceData.date,
      records: records,
      class: attendanceData.class || ''
    };

    console.log('📤 Sending attendance payload:', JSON.stringify(payload, null, 2));

    const data = await this.makeRequest(`${BASE_URL}/attendance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    return data;
  } catch (error) {
    console.error('❌ Save attendance error:', error);
    return { 
      success: false, 
      error: error.message || 'Could not save attendance' 
    };
  }
}
// Add to src/service/StudentApi.js

  // ────────────────────────────────────────────────
  // Billing Methods
  // ────────────────────────────────────────────────

  /**
   * Create a new invoice
   */
  static async createInvoice(invoiceData) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/invoices`, {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });
      return data;
    } catch (error) {
      console.error('❌ Create invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all invoices with filters
   */
  static async getAllInvoices(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const queryString = params.toString();
      const url = `${BASE_URL}/billing/invoices${queryString ? `?${queryString}` : ''}`;
      
      const data = await this.makeRequest(url, { method: 'GET' });
      return data;
    } catch (error) {
      console.error('❌ Get all invoices error:', error);
      return { success: false, error: error.message, invoices: [] };
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/invoices/${invoiceId}`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Get invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get invoices by student
   */
  static async getInvoicesByStudent(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/students/${studentId}/invoices`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Get invoices by student error:', error);
      return { success: false, error: error.message, invoices: [] };
    }
  }

  /**
   * Record payment for an invoice
   */
  static async recordPayment(invoiceId, paymentData) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
      return data;
    } catch (error) {
      console.error('❌ Record payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId, status) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return data;
    } catch (error) {
      console.error('❌ Update invoice status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(invoiceId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      return data;
    } catch (error) {
      console.error('❌ Delete invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment history for a student
   */
  static async getPaymentHistory(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/students/${studentId}/payments`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Get payment history error:', error);
      return { success: false, error: error.message, payments: [] };
    }
  }

  /**
   * Get student billing summary
   */
  static async getStudentBillingSummary(studentId) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/students/${studentId}/summary`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Get student billing summary error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get class billing report
   */
  static async getClassBillingReport(grade, section) {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/reports/class/${grade}/${section}`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Get class billing report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get billing stats
   */
  static async getBillingStats() {
    try {
      const data = await this.makeRequest(`${BASE_URL}/billing/stats`, {
        method: 'GET',
      });
      return data;
    } catch (error) {
      console.error('❌ Get billing stats error:', error);
      return { success: false, error: error.message };
    }
  }

  // src/service/StudentApi.js

/**
 * Upload student photo
 * @param {string} studentId - Student ID
 * @param {File} photoFile - Photo file
 * @returns {Promise<Object>} - Upload result
 */
static async uploadStudentPhoto(studentId, photoFile) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    
    const token = await user.getIdToken(false);
    
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    const response = await fetch(`${BASE_URL}/students/${studentId}/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload photo');
    }
    
    this.trackRequest();
    return {
      success: true,
      photoUrl: data.photoUrl,
      studentId: data.studentId,
      message: 'Photo uploaded successfully'
    };
  } catch (error) {
    console.error('❌ Upload student photo error:', error);
    return { success: false, error: error.message || 'Could not upload photo' };
  }
}

/**
 * Delete student photo
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Delete result
 */
static async deleteStudentPhoto(studentId) {
  try {
    const data = await this.makeRequest(`${BASE_URL}/students/${studentId}/photo`, {
      method: 'DELETE',
    });
    
    return {
      success: true,
      message: 'Photo deleted successfully'
    };
  } catch (error) {
    console.error('❌ Delete student photo error:', error);
    return { success: false, error: error.message || 'Could not delete photo' };
  }
}

/**
 * Get student photo URL
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Photo URL
 */
static async getStudentPhoto(studentId) {
  try {
    const data = await this.makeRequest(`${BASE_URL}/students/${studentId}/photo`, {
      method: 'GET',
    });
    
    return {
      success: true,
      photoUrl: data.photoUrl,
      studentId: data.studentId
    };
  } catch (error) {
    console.error('❌ Get student photo error:', error);
    return { success: false, error: error.message || 'Could not get photo' };
  }
}

/**
 * Upload school logo
 * @param {File} logoFile - Logo file
 * @returns {Promise<Object>} - Upload result
 */
static async uploadSchoolLogo(logoFile) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    
    const token = await user.getIdToken(false);
    
    const formData = new FormData();
    formData.append('photo', logoFile);
    
    const response = await fetch(`${BASE_URL}/school/logo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload logo');
    }
    
    this.trackRequest();
    return {
      success: true,
      logoUrl: data.logoUrl,
      message: 'School logo uploaded successfully'
    };
  } catch (error) {
    console.error('❌ Upload school logo error:', error);
    return { success: false, error: error.message || 'Could not upload logo' };
  }
}

/**
 * Delete school logo
 * @returns {Promise<Object>} - Delete result
 */
static async deleteSchoolLogo() {
  try {
    const data = await this.makeRequest(`${BASE_URL}/school/logo`, {
      method: 'DELETE',
    });
    
    return {
      success: true,
      message: 'School logo deleted successfully'
    };
  } catch (error) {
    console.error('❌ Delete school logo error:', error);
    return { success: false, error: error.message || 'Could not delete logo' };
  }
}

/**
 * Bulk upload student photos
 * @param {FileList} photoFiles - List of photo files
 * @returns {Promise<Object>} - Upload results
 */
static async bulkUploadStudentPhotos(photoFiles) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    
    const token = await user.getIdToken(false);
    
    const formData = new FormData();
    for (let i = 0; i < photoFiles.length; i++) {
      formData.append('photos', photoFiles[i]);
    }
    
    const response = await fetch(`${BASE_URL}/students/photos/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload photos');
    }
    
    this.trackRequest();
    return {
      success: true,
      results: data.results,
      errors: data.errors,
      message: data.message
    };
  } catch (error) {
    console.error('❌ Bulk upload student photos error:', error);
    return { success: false, error: error.message || 'Could not upload photos' };
  }
}
}

export default StudentApi;