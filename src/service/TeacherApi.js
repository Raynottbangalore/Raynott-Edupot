// src/service/TeacherApi.js
import { auth } from './firebase';
import BASE_URL from './base_urls';

class TeacherApi {
  static async getAuthHeader() {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const token = await user.getIdToken(true);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ============ Teacher Management API ============

  /**
   * Get all teachers
   * @returns {Promise<{success: boolean, teachers: Array, error?: string}>}
   */
  static async getAllTeachers() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teachers');
      }

      return {
        success: true,
        teachers: data.teachers || []
      };
    } catch (error) {
      console.error('Get teachers error:', error);
      return { success: false, error: error.message, teachers: [] };
    }
  }

  /**
   * Get teacher by ID
   * @param {string} teacherId 
   * @returns {Promise<{success: boolean, teacher?: object, error?: string}>}
   */
  static async getTeacherById(teacherId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/${teacherId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teacher');
      }

      return {
        success: true,
        teacher: data.teacher
      };
    } catch (error) {
      console.error('Get teacher error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new teacher
   * @param {object} teacherData - Teacher details
   * @returns {Promise<{success: boolean, teacherId?: string, teacher?: object, error?: string}>}
   */
  static async createTeacher(teacherData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(teacherData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create teacher');
      }

      return {
        success: true,
        teacherId: data.teacherId,
        teacher: data.teacher
      };
    } catch (error) {
      console.error('Create teacher error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update teacher
   * @param {string} teacherId 
   * @param {object} updates - Fields to update
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async updateTeacher(teacherId, updates) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/${teacherId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update teacher error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete teacher
   * @param {string} teacherId 
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async deleteTeacher(teacherId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/${teacherId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete teacher error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update class performance for a teacher
   * @param {string} teacherId 
   * @param {string} className 
   * @param {object} performanceData - { averagePercentage, totalStudents, examCount }
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async updateClassPerformance(teacherId, className, performanceData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/${teacherId}/performance/${className}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(performanceData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update class performance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get teachers by subject
   * @param {string} subject 
   * @returns {Promise<{success: boolean, teachers: Array, error?: string}>}
   */
  static async getTeachersBySubject(subject) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/subject/${encodeURIComponent(subject)}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teachers');
      }

      return {
        success: true,
        teachers: data.teachers || []
      };
    } catch (error) {
      console.error('Get teachers by subject error:', error);
      return { success: false, error: error.message, teachers: [] };
    }
  }

  /**
   * Get teachers by class
   * @param {string} className 
   * @returns {Promise<{success: boolean, teachers: Array, error?: string}>}
   */
  static async getTeachersByClass(className) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/class/${encodeURIComponent(className)}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teachers');
      }

      return {
        success: true,
        teachers: data.teachers || []
      };
    } catch (error) {
      console.error('Get teachers by class error:', error);
      return { success: false, error: error.message, teachers: [] };
    }
  }

  /**
   * Get teacher statistics for dashboard
   * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
   */
  static async getTeacherStats() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/stats/dashboard`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teacher statistics');
      }

      return {
        success: true,
        stats: data.stats
      };
    } catch (error) {
      console.error('Get teacher stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk import teachers
   * @param {Array} teachersData - Array of teacher objects
   * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
   */
  static async bulkImportTeachers(teachersData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/bulk-import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ teachers: teachersData }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to import teachers');
      }

      return {
        success: true,
        results: data.results
      };
    } catch (error) {
      console.error('Bulk import teachers error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export teachers data
   * @returns {Promise<Blob>} - CSV/Excel file blob
   */
  static async exportTeachers() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/export`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to export teachers');
      }

      return await response.blob();
    } catch (error) {
      console.error('Export teachers error:', error);
      throw error;
    }
  }

  /**
   * Get teacher performance summary
   * @param {string} teacherId 
   * @returns {Promise<{success: boolean, performance?: object, error?: string}>}
   */
  static async getTeacherPerformance(teacherId) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teachers/${teacherId}/performance`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teacher performance');
      }

      return {
        success: true,
        performance: data.performance
      };
    } catch (error) {
      console.error('Get teacher performance error:', error);
      return { success: false, error: error.message };
    }
  }
  // src/service/TeacherApi.js

// Add to existing TeacherApi class

  /**
   * Get teacher attendance for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} teacherId - Optional teacher ID filter
   * @returns {Promise<{success: boolean, records: Array, summary: Object}>}
   */
  static async getTeacherAttendance(date, teacherId = null) {
    try {
      const headers = await this.getAuthHeader();
      let url = `${BASE_URL}/teacher-attendance?date=${date}`;
      if (teacherId) {
        url += `&teacherId=${teacherId}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teacher attendance');
      }

      return {
        success: true,
        records: data.records || [],
        summary: data.summary || { present: 0, absent: 0, total: 0 }
      };
    } catch (error) {
      console.error('Get teacher attendance error:', error);
      return { 
        success: false, 
        error: error.message,
        records: [],
        summary: { present: 0, absent: 0, total: 0 }
      };
    }
  }

  /**
   * Save teacher attendance
   * @param {Object} attendanceData - { date, records: [{ teacherId, status }], holiday: { reason } }
   * @returns {Promise<{success: boolean, count: number, message: string}>}
   */
  static async saveTeacherAttendance(attendanceData) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teacher-attendance`, {
        method: 'POST',
        headers,
        body: JSON.stringify(attendanceData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save teacher attendance');
      }

      return data;
    } catch (error) {
      console.error('Save teacher attendance error:', error);
      return { 
        success: false, 
        error: error.message,
        count: 0
      };
    }
  }

  /**
   * Get monthly teacher attendance statistics
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  static async getMonthlyTeacherAttendance(month) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teacher-attendance/stats/monthly?month=${month}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load monthly teacher attendance');
      }

      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('Get monthly teacher attendance error:', error);
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Get teacher attendance summary
   * @param {string} teacherId - Teacher ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  static async getTeacherAttendanceSummary(teacherId, startDate, endDate) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(
        `${BASE_URL}/teacher-attendance/teacher/${teacherId}/summary?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load teacher attendance summary');
      }

      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('Get teacher attendance summary error:', error);
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Delete teacher attendance
   * @param {string} teacherId - Teacher ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async deleteTeacherAttendance(teacherId, date) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(
        `${BASE_URL}/teacher-attendance/teacher/${teacherId}?date=${date}`,
        {
          method: 'DELETE',
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete teacher attendance');
      }

      return data;
    } catch (error) {
      console.error('Delete teacher attendance error:', error);
      return { 
        success: false, 
        error: error.message
      };
    }
  }

  /**
   * Export teacher attendance as CSV
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Blob>} - CSV file blob
   */
  static async exportTeacherAttendanceCSV(startDate, endDate) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${BASE_URL}/teacher-attendance/export`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to export teacher attendance');
      }

      return await response.blob();
    } catch (error) {
      console.error('Export teacher attendance CSV error:', error);
      throw error;
    }
  }
  // Add to src/service/TeacherApi.js

/**
 * Upload teacher photo for ID card
 * @param {string} teacherId 
 * @param {File} file 
 * @returns {Promise<{success: boolean, photoUrl?: string, error?: string}>}
 */
static async uploadTeacherPhoto(teacherId, file) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const token = await user.getIdToken(true);

    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${BASE_URL}/teachers/${teacherId}/photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload photo');
    }

    return {
      success: true,
      photoUrl: data.photoUrl
    };
  } catch (error) {
    console.error('Upload teacher photo error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get teacher photo
 * @param {string} teacherId 
 * @returns {Promise<{success: boolean, photoUrl?: string, error?: string}>}
 */
static async getTeacherPhoto(teacherId) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/teachers/${teacherId}/photo`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get photo');
    }

    return {
      success: true,
      photoUrl: data.photoUrl
    };
  } catch (error) {
    console.error('Get teacher photo error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete teacher photo
 * @param {string} teacherId 
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
static async deleteTeacherPhoto(teacherId) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/teachers/${teacherId}/photo`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete photo');
    }

    return data;
  } catch (error) {
    console.error('Delete teacher photo error:', error);
    return { success: false, error: error.message };
  }
}


/**
 * Get teacher photo as base64
 * @param {string} teacherId 
 * @returns {Promise<{success: boolean, photoData?: string, error?: string}>}
 */
static async getTeacherPhotoBase64(teacherId) {
  try {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${BASE_URL}/teachers/${teacherId}/photo/base64`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get photo');
    }

    return {
      success: true,
      photoData: data.photoData
    };
  } catch (error) {
    console.error('Get teacher photo base64 error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk upload teacher photos
 * @param {Array} files - Array of { teacherId, file }
 * @returns {Promise<{success: boolean, results?: Array, errors?: Array, error?: string}>}
 */
static async bulkUploadTeacherPhotos(files) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const token = await user.getIdToken(true);

    const formData = new FormData();
    files.forEach(({ teacherId, file }) => {
      formData.append('photos', file, `${teacherId}.jpg`);
    });

    const response = await fetch(`${BASE_URL}/teachers/photos/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to upload photos');
    }

    return data;
  } catch (error) {
    console.error('Bulk upload teacher photos error:', error);
    return { success: false, error: error.message };
  }
}
}

export default TeacherApi;