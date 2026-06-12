const axios = require('axios').default || require('axios');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// Dynamically determine the backend URL based on the Metro bundler's IP
export const getBaseUrl = () => {
  // If a production API URL is explicitly configured via environment variables, use it first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  try {
    // This gets the IP address of the machine running the Metro bundler
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:]+)/);
      if (match && match[1]) {
        const ip = match[1];
        // If it's a real IP address (not localhost), use it
        if (ip !== 'localhost' && ip !== '127.0.0.1') {
          return `http://${ip}:8001/api`;
        }
      }
    }
  } catch (e) {
    console.warn('Could not determine bundler IP, falling back to defaults');
  }

  // Fallback for emulators and web
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8001/api';
  }
  return 'http://localhost:8001/api';
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor to inject JWT token into header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
