import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkLoginStatus = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Try to verify token with backend in background
        try {
          const response = await apiClient.get('/auth/profile', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          if (response.data.success) {
            setUser(response.data.user);
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          } else {
            await logout();
          }
        } catch (backendError) {
          // Check if it is an explicit auth error (401 or 403) from the server
          if (backendError.response && (backendError.response.status === 401 || backendError.response.status === 403)) {
            console.log('Token is invalid or expired. Resetting auth state.');
            await logout();
          } else {
            // Server is offline, network glitch, or connection timeout
            // DO NOT log out. Keep the offline session active!
            console.log('Server is offline or network error. Preserving cached session.');
          }
        }
      }
    } catch (error) {
      console.log('Error reading storage:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      console.error('Login request failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please verify credentials.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (idToken) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/auth/google', { idToken });
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      console.error('Google login failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Google Sign-In failed.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role, phone) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/auth/register', {
        name,
        email,
        password,
        role,
        phone
      });
      if (response.data.success) {
        const { token: userToken, user: userData } = response.data;
        await AsyncStorage.setItem('token', userToken);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (name, phone) => {
    try {
      setIsLoading(true);
      const response = await apiClient.put('/auth/profile', { name, phone }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUser(response.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        return { success: true };
      }
    } catch (error) {
      console.error('Update profile failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update profile.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error removing token during logout:', error);
    }
  };

  const deleteAccount = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.delete('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        await logout();
        return { success: true };
      }
    } catch (error) {
      console.error('Delete account failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete account.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, googleLogin, register, updateProfile, deleteAccount, logout, checkLoginStatus }}>
      {children}
    </AuthContext.Provider>
  );
};
