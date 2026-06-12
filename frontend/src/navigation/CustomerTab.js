import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

// Screens
import HomeScreen from '../screens/customer/HomeScreen';
import CategoriesScreen from '../screens/customer/CategoriesScreen';
import CategoryProductsScreen from '../screens/customer/CategoryProductsScreen';
import ProductDetailsScreen from '../screens/customer/ProductDetailsScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import OrderHistoryScreen from '../screens/customer/OrderHistoryScreen';
import AddressManagerScreen from '../screens/customer/AddressManagerScreen';
import OrderTrackingScreen from '../screens/customer/OrderTrackingScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import TransactionHistoryScreen from '../screens/customer/TransactionHistoryScreen';
import PrivacyPolicyScreen from '../screens/customer/PrivacyPolicyScreen';
import TermsConditionsScreen from '../screens/customer/TermsConditionsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const { cartCount } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const initialRoute = (user?.isGoogleLogin && !user?.phone) ? 'ProfileTab' : 'HomeTab';

  return (
    <Tab.Navigator
      initialRouteName={initialRoute}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = 'home-outline';
          } else if (route.name === 'CategoriesTab') {
            iconName = 'grid-outline';
          } else if (route.name === 'CartTab') {
            iconName = 'cart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Shop' }}
      />
      <Tab.Screen
        name="CategoriesTab"
        component={CategoriesScreen}
        options={{ title: 'Categories' }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.secondary, color: COLORS.white }
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Account' }}
      />
    </Tab.Navigator>
  );
}

export default function CustomerTab() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="AddressManager" component={AddressManagerScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: true, title: 'Privacy Policy', headerBackTitleVisible: false }} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} options={{ headerShown: true, title: 'Terms & Conditions', headerBackTitleVisible: false }} />
    </Stack.Navigator>
  );
}
