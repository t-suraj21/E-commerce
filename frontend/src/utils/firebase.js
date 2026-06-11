import { NativeModules } from 'react-native';

let nativeAnalyticsInstance = null;
let nativeCrashlyticsInstance = null;
const hasNativeFirebase = !!NativeModules.RNFBAppModule;

// Mock implementations for when native Firebase modules are not available (e.g. Expo Go)
const mockAnalytics = {
  logEvent: async () => {},
  logLogin: async () => {},
  logSignUp: async () => {},
  logAddToCart: async () => {},
  logPurchase: async () => {},
  logScreenView: async () => {},
};

const mockCrashlytics = {
  recordError: () => {},
  log: () => {},
  crash: () => {},
  setAttribute: () => {},
};

export const analytics = () => {
  if (!hasNativeFirebase) {
    return mockAnalytics;
  }
  try {
    if (!nativeAnalyticsInstance) {
      const nativeAnalytics = require('@react-native-firebase/analytics').default;
      nativeAnalyticsInstance = nativeAnalytics();
    }
    return nativeAnalyticsInstance;
  } catch (error) {
    console.warn("React Native Firebase (Analytics) native module failed to load. Falling back to mocks.");
    return mockAnalytics;
  }
};

export const crashlytics = () => {
  if (!hasNativeFirebase) {
    return mockCrashlytics;
  }
  try {
    if (!nativeCrashlyticsInstance) {
      const nativeCrashlytics = require('@react-native-firebase/crashlytics').default;
      nativeCrashlyticsInstance = nativeCrashlytics();
    }
    return nativeCrashlyticsInstance;
  } catch (error) {
    console.warn("React Native Firebase (Crashlytics) native module failed to load. Falling back to mocks.");
    return mockCrashlytics;
  }
};


