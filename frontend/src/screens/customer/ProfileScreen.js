import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateProfile, deleteAccount } = useContext(AuthContext);
  const { locale, changeLanguage, t } = useContext(LanguageContext);
  const { isDarkMode, toggleTheme, theme } = useContext(ThemeContext);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setIsSaving(true);
    const result = await updateProfile(editName, editPhone);
    setIsSaving(false);
    
    if (result.success) {
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('signOut'),
      locale === 'en' 
        ? 'Are you sure you want to log out from Tarun Kirana Store?' 
        : 'क्या आप तरुण किराना स्टोर से लॉग आउट करना चाहते हैं?',
      [
        { text: locale === 'en' ? 'Cancel' : 'रद्द करें', style: 'cancel' },
        { text: t('signOut'), style: 'destructive', onPress: async () => await logout() }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      locale === 'en'
        ? 'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.'
        : 'क्या आप वाकई अपना खाता स्थायी रूप से हटाना चाहते हैं? इस कार्रवाई को पूर्ववत नहीं किया जा सकता है और आपका सारा डेटा खो जाएगा।',
      [
        { text: locale === 'en' ? 'Cancel' : 'रद्द करें', style: 'cancel' },
        { 
          text: locale === 'en' ? 'Delete Permanently' : 'स्थायी रूप से हटाएं', 
          style: 'destructive', 
          onPress: async () => {
            const result = await deleteAccount();
            if (!result.success) {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('changeLanguage'),
      'Select your preferred language / अपनी पसंदीदा भाषा चुनें',
      [
        { text: 'English', onPress: () => changeLanguage('en') },
        { text: 'हिंदी (Hindi)', onPress: () => changeLanguage('hi') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderMenuItem = (icon, label, onPress, color = theme.text) => (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color={color === theme.text ? theme.primary : color} />
        <Text style={[styles.menuItemText, { color: color === theme.text ? theme.text : color }]}>{label}</Text>
      </View>
      
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Header Profile Section */}
      <View style={[styles.profileHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTopRight}>
          {isEditing ? (
            isSaving ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.editBtn} />
            ) : (
              <TouchableOpacity onPress={handleSaveProfile} style={styles.editBtn}>
                <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
              <Ionicons name="create-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.avatarWrapper, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="person" size={50} color={theme.primary} />
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.editInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              placeholderTextColor={theme.textLight}
            />
            <TextInput
              style={[styles.editInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background, marginTop: 10 }]}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Phone Number"
              placeholderTextColor={theme.textLight}
              keyboardType="phone-pad"
            />
          </View>
        ) : (
          <>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'Store Guest'}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email || 'guest@tks.com'}</Text>
            <Text style={[styles.userPhone, { color: theme.textSecondary }]}>{user?.phone || 'No phone added'}</Text>
          </>
        )}

        <View style={[styles.roleBadge, { backgroundColor: theme.secondary }]}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={[styles.menuContainer, { backgroundColor: theme.surface, borderTopColor: theme.border, borderBottomColor: theme.border }]}>
        <Text style={[styles.menuSectionTitle, { color: theme.textLight }]}>{t('settings')}</Text>

        {user?.role === 'customer' ? (
          <>
            {renderMenuItem('location-outline', t('manageAddresses'), () => navigation.navigate('AddressManager'))}
            {renderMenuItem('receipt-outline', t('orderHistory'), () => navigation.navigate('OrderHistory'))}
            {renderMenuItem('card-outline', t('transactionHistory'), () => navigation.navigate('TransactionHistory'))}
          </>
        ) : (
          <>
            {renderMenuItem('stats-chart-outline', t('salesDashboard'), () => navigation.navigate('DashboardTab'))}
            {renderMenuItem('grid-outline', 'Manage Categories', () => navigation.navigate('ManageCategories'))}
            {renderMenuItem('basket-outline', 'Manage Catalog', () => navigation.navigate('ProductsTab'))}
            {renderMenuItem('cube-outline', 'Inventory Management', () => navigation.navigate('InventoryManager'))}
            {renderMenuItem('list-outline', 'Manage Orders', () => navigation.navigate('OrdersTab'))}
          </>
        )}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.menuSectionTitle, { color: theme.textLight }]}>{t('settings')}</Text>
        
        {/* Language selector menu item */}
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={handleLanguageChange}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="language-outline" size={22} color={theme.primary} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('changeLanguage')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{locale === 'en' ? 'English' : 'हिंदी'}</Text>
            
          </View>
        </TouchableOpacity>

        {/* Dark Mode toggle item */}
        <View style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="moon-outline" size={22} color={theme.primary} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('darkMode')}</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={isDarkMode ? theme.white : '#f4f3f4'}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Text style={[styles.menuSectionTitle, { color: theme.textLight }]}>Support & App</Text>
        {renderMenuItem('document-text-outline', 'Privacy Policy', () => navigation.navigate('PrivacyPolicy'))}
        {renderMenuItem('document-outline', 'Terms & Conditions', () => navigation.navigate('TermsConditions'))}
        {renderMenuItem('call-outline', t('contactUs'), () => {
          Alert.alert('Contact Support', 'Email: sky053200@gmail.com\nPhone: +91 8252490197');
        })}
        {renderMenuItem('information-circle-outline', t('aboutApp'), () => {
          Alert.alert('Tarun Kirana Store', 'v1.1.0. Made with React Native and Node.js.');
        })}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {renderMenuItem('log-out-outline', t('signOut'), handleLogout, theme.error)}
        {user?.role !== 'admin' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: 0 }]} />
            {renderMenuItem('trash-outline', locale === 'en' ? 'Delete Account' : 'खाता हटाएं', handleDeleteAccount, theme.error)}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  profileHeader: {
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    position: 'relative',
    ...SHADOWS.sm
  },
  headerTopRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10
  },
  editBtn: {
    padding: SPACING.xs
  },
  editForm: {
    width: '80%',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  editInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center'
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm
  },
  userName: {
    fontSize: 22,
    fontWeight: '850'
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2
  },
  userPhone: {
    fontSize: 14,
    marginTop: 2
  },
  roleBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
    marginTop: SPACING.md
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  menuContainer: {
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 40
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    letterSpacing: 0.5
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md
  }
});
