/**
 * Axios Configuration with Firebase Authentication
 * Ensures all requests include proper authentication
 */

import axios from 'axios';
import { auth } from './firebase';

// Configure axios defaults
axios.defaults.withCredentials = true; // Always send cookies

// Add request interceptor to include Firebase token
axios.interceptors.request.use(
  async (config) => {
    try {
      // Check if we have a current user
      const user = auth.currentUser;
      
      if (user) {
        // Get fresh token
        const token = await user.getIdToken();
        
        if (token) {
          // Add Authorization header
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 [AXIOS] Added Firebase token to request');
        }
      } else {
        console.log('🔓 [AXIOS] No authenticated user - sending request without token');
      }
    } catch (error) {
      console.warn('⚠️ [AXIOS] Error getting auth token:', error);
      // Continue without token - let backend handle auth via cookies
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axios.interceptors.response.use(
  (response) => {
    // Log successful authenticated requests
    if (response.config.headers?.Authorization) {
      console.log('✅ [AXIOS] Authenticated request successful:', response.config.url);
    }
    return response;
  },
  (error) => {
    // Log auth failures for debugging
    if (error.response?.status === 401) {
      console.error('❌ [AXIOS] Authentication failed:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default axios;