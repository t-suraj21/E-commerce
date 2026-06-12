import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import apiClient from '../api/client';

// Configure how notifications are displayed when the app is open (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register device token with the backend
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    return null;
  }

  // Handle Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      // In SDK 51, getExpoPushTokenAsync takes projectId explicitly or fetches it from app.json
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.error('\n❌ CRITICAL: No EAS projectId found in app.json!');
        console.error('👉 You MUST run "npx eas init" in your terminal to get a real push token.');
        console.error('👉 Generating a fake token for now so the app does not crash.\n');
        token = { data: `MOCK-DEVICE-TOKEN-${Platform.OS}-${Math.random().toString(36).substring(7)}` };
      } else {
        token = await Notifications.getExpoPushTokenAsync({ projectId });
        console.log('🔥 Device Expo Push Token retrieved:', token.data);
      }
    } catch (err) {
      console.log('Error fetching real Expo push token:', err.message);
      // Fallback mock token for simulator/errors
      token = { data: `MOCK-DEVICE-TOKEN-${Platform.OS}-${Math.random().toString(36).substring(7)}` };
    }
  } else {
    // Simulator fallback so database integration works end-to-end
    const mockToken = `SIMULATED-${Platform.OS.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    console.log('⚠️ Simulator detected. Using simulated device token:', mockToken);
    token = { data: mockToken };
  }

  // Send token to the backend
  if (token && token.data) {
    try {
      const response = await apiClient.post('/auth/push-token', {
        pushToken: token.data
      });
      if (response.data.success) {
        console.log('✅ Push token synced with backend database successfully.');
      }
    } catch (error) {
      console.log('Error syncing push token with backend:', error.response?.data || error.message);
    }
  }

  return token ? token.data : null;
}

/**
 * Listen for notification events and handle routing on click
 * @param {object} navigation - Navigation reference
 */
export function setupNotificationListeners(navigation) {
  // 1. Listen for notification received when app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('🔔 Foreground Notification Received:', notification.request.content.title);
  });

  // 2. Listen for when user taps/clicks on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('🔔 Notification Tap Response detected. Payload:', data);

    if (data && data.orderId) {
      // Navigate to order details / tracking
      const orderIdVal = data.orderId;
      Alert.alert(
        response.notification.request.content.title,
        response.notification.request.content.body,
        [
          {
            text: 'Track Order',
            onPress: () => {
              navigation.navigate('OrderTracking', { orderId: orderIdVal });
            }
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    } else if (data && data.productId) {
      const productIdVal = data.productId;
      navigation.navigate('ProductDetails', { productId: productIdVal });
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
