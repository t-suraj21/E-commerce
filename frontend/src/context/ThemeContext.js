import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as LightColors } from '../styles/theme';

export const ThemeContext = createContext();

const DarkColors = {
  primary: '#4CAF50',        // Brighter pastel green for dark backgrounds
  primaryLight: '#1B5E20',   // Deep green background tint
  primaryDark: '#81C784',    // Light green text tint
  secondary: '#FFB74D',      // Golden Orange
  secondaryLight: '#E65100', // Dark Orange background tint
  background: '#121212',     // Dark charcoal background
  surface: '#1E1E1E',        // Card slate gray
  border: '#2C2C2C',         // Thin divider border
  error: '#EF5350',          // Pastel Red
  success: '#66BB6A',        // Pastel Green
  text: '#F8F9FA',           // White/Off-white main text
  textSecondary: '#B0BEC5',  // Muted gray text
  textLight: '#78909C',      // Sub-muted gray text
  white: '#FFFFFF'
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('tks_dark_mode');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }
    } catch (e) {
      console.log('Error loading theme:', e.message);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('tks_dark_mode', String(newMode));
    } catch (e) {
      console.log('Error saving theme:', e.message);
    }
  };

  const theme = isDarkMode ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
