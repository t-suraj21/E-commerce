import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';

// Screens
import DashboardScreen from '../screens/admin/DashboardScreen';
import ManageProductsScreen from '../screens/admin/ManageProductsScreen';
import AddEditProductScreen from '../screens/admin/AddEditProductScreen';
import ManageOrdersScreen from '../screens/admin/ManageOrdersScreen';
import OrderDetailsScreen from '../screens/admin/OrderDetailsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen'; // Shared profile screen!
import ManageCategoriesScreen from '../screens/admin/ManageCategoriesScreen';
import AddEditCategoryScreen from '../screens/admin/AddEditCategoryScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import PrivacyPolicyScreen from '../screens/customer/PrivacyPolicyScreen';
import TermsConditionsScreen from '../screens/customer/TermsConditionsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminBottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'DashboardTab') {
            iconName = 'stats-chart-outline';
          } else if (route.name === 'ProductsTab') {
            iconName = 'basket-outline';
          } else if (route.name === 'OrdersTab') {
            iconName = 'list-outline';
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
        name="DashboardTab"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ManageProductsScreen}
        options={{ title: 'Products' }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={ManageOrdersScreen}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function AdminTab() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="MainAdminTabs" component={AdminBottomTabs} />
      <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
      <Stack.Screen name="CategoryProducts" component={ManageProductsScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
      <Stack.Screen name="AddEditCategory" component={AddEditCategoryScreen} />
      <Stack.Screen name="InventoryManager" component={InventoryScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: true, title: 'Privacy Policy', headerBackTitleVisible: false }} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} options={{ headerShown: true, title: 'Terms & Conditions', headerBackTitleVisible: false }} />
    </Stack.Navigator>
  );
}
