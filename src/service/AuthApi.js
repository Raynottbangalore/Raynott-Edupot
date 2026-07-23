// src/services/AuthApi.js
import { signInWithEmailAndPassword, getIdToken } from 'firebase/auth';
import { auth } from './firebase';
import BASE_URL from './base_urls'

class AuthApi {
 
  static async login(email, password) {
    try {
      // Validate inputs
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Trim email
      const trimmedEmail = email.trim();
      
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const idToken = await getIdToken(userCredential.user, true);

      // Backend authentication
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle specific backend error messages
        const errorMessage = data.error || data.message || 'Backend authentication failed';
        
        // Map backend errors to user-friendly messages
        let userMessage = errorMessage;
        if (errorMessage.toLowerCase().includes('user not found') || 
            errorMessage.toLowerCase().includes('no user')) {
          userMessage = 'No account found with this email address';
        } else if (errorMessage.toLowerCase().includes('password') || 
                   errorMessage.toLowerCase().includes('credentials')) {
          userMessage = 'Incorrect password. Please try again.';
        } else if (errorMessage.toLowerCase().includes('disabled')) {
          userMessage = 'This account has been disabled. Please contact support.';
        } else if (errorMessage.toLowerCase().includes('verify') || 
                   errorMessage.toLowerCase().includes('verification')) {
          userMessage = 'Please verify your email address before logging in.';
        }
        
        throw new Error(userMessage);
      }

      // Ensure enabledTabs is always an array
      const user = {
        ...data.user,
        enabledTabs: data.user.enabledTabs || [],
        fullAccess: data.user.fullAccess || false,
        isAdmin: data.user.isAdmin || false,
        schoolId: data.user.schoolId || null,
      };

      return {
        success: true,
        user: user,
      };

    } catch (error) {
      console.error('Login error:', error.code, error.message);
      
      // Map Firebase error codes to user-friendly messages
      let errorMessage = error.message || 'Login failed. Please try again.';
      
      // Firebase specific errors
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address. Please check and try again.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email format. Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please use a different email.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid credentials.Please check your email and password.';
            break;
          default:
            // Keep the original error message if it's user-friendly
            if (!error.message || error.message.includes('Firebase')) {
              errorMessage = 'Login failed. Please try again.';
            }
        }
      }

      return {
        success: false,
        error: errorMessage,
        code: error.code || 'unknown',
      };
    }
  }
  
  static async logout() {
    try {
      await auth.signOut();
      // Clear any stored user data
      localStorage.removeItem('user');
      localStorage.removeItem('schoolId');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { 
        success: false, 
        error: error.message || 'Logout failed. Please try again.' 
      };
    }
  }

  static async getCurrentUser() {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      const idToken = await getIdToken(user, true);
      const response = await fetch(`${BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch profile');
      }

      const data = await response.json();
      
      if (!data.success || !data.user) {
        throw new Error(data.error || 'Invalid user data');
      }

      // Ensure consistent user data
      const userData = {
        ...data.user,
        enabledTabs: data.user.enabledTabs || [],
        fullAccess: data.user.fullAccess || false,
        isAdmin: data.user.isAdmin || false,
        schoolId: data.user.schoolId || null,
      };

      return { 
        success: true, 
        user: userData 
      };
      
    } catch (err) {
      console.error('Get current user failed:', err);
      return { 
        success: false, 
        error: err.message || 'Failed to get user profile' 
      };
    }
  }
}

export default AuthApi;