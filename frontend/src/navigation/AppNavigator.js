import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../services/notificationService';

// Navigators
import AuthNavigator from './AuthNavigator';
import CustomerTab from './CustomerTab';
import AdminTab from './AdminTab';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <NotificationListener />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.role === 'customer' ? (
            <Stack.Screen name="CustomerHome" component={CustomerTab} />
          ) : (
            <Stack.Screen name="AdminHome" component={AdminTab} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function NotificationListener() {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync();
      const unsubscribe = setupNotificationListeners(navigation);
      return unsubscribe;
    }
  }, [user, navigation]);

  return null;
}
