// Mock implementation of react-native-firebase for web platform
const mockAnalytics = () => ({
  logEvent: async () => {},
  logLogin: async () => {},
  logSignUp: async () => {},
  logAddToCart: async () => {},
  logPurchase: async () => {},
  logScreenView: async () => {},
});

const mockCrashlytics = () => ({
  recordError: () => {},
  log: () => {},
  crash: () => {},
  setAttribute: () => {},
});

export const analytics = mockAnalytics;
export const crashlytics = mockCrashlytics;
