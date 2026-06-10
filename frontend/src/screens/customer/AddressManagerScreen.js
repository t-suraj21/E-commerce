import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';

export default function AddressManagerScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null); // null means adding new
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await apiClient.get('/addresses');
      if (response.data.success) {
        setAddresses(response.data.addresses || []);
      }
    } catch (error) {
      console.log('Error fetching addresses:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!fullName.trim() || !mobile.trim() || !houseNumber.trim() || !street.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields marked *');
      return;
    }

    // Basic mobile validation
    if (mobile.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        houseNumber: houseNumber.trim(),
        street: street.trim(),
        landmark: landmark.trim() || null,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        isDefault
      };

      let response;
      if (editingAddressId) {
        response = await apiClient.put(`/addresses/${editingAddressId}`, payload);
      } else {
        response = await apiClient.post('/addresses', payload);
      }

      if (response.data.success) {
        Alert.alert('Success', editingAddressId ? 'Address updated successfully!' : 'Address added successfully!');
        resetForm();
        fetchAddresses();
      }
    } catch (error) {
      console.log('Error saving address:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setFullName(addr.fullName);
    setMobile(addr.mobile);
    setHouseNumber(addr.houseNumber);
    setStreet(addr.street);
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setIsDefault(addr.isDefault);
    setShowForm(true);
  };

  const handleDeleteAddress = async (id) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`/addresses/${id}`);
              if (response.data.success) {
                // If the deleted address was currently being edited, reset the form
                if (editingAddressId === id) {
                  resetForm();
                }
                fetchAddresses();
              }
            } catch (error) {
              console.log('Delete address error:', error.message);
              Alert.alert('Error', 'Failed to delete address.');
            }
          }
        }
      ]
    );
  };

  const handleToggleDefault = async (addr) => {
    if (addr.isDefault) return; // Already default

    try {
      setIsLoading(true);
      const response = await apiClient.put(`/addresses/${addr.id}`, {
        isDefault: true
      });
      if (response.data.success) {
        fetchAddresses();
      }
    } catch (error) {
      console.log('Error setting default address:', error.message);
      Alert.alert('Error', 'Failed to update default address.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingAddressId(null);
    setFullName('');
    setMobile('');
    setHouseNumber('');
    setStreet('');
    setLandmark('');
    setCity('');
    setState('');
    setPincode('');
    setIsDefault(false);
    setShowForm(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>Delivery Addresses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showForm ? (
          /* Address Form */
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingAddressId ? 'Edit Delivery Address' : 'Add New Address'}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Amit Kumar"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Flat / House No. / Building *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Flat 104, Block B"
                value={houseNumber}
                onChangeText={setHouseNumber}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Street / Locality / Sector *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sector 15, Dwarka"
                value={street}
                onChangeText={setStreet}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Landmark (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Near Mother Dairy booth"
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Delhi"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pincode *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 110001"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Set as Default Address</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.disabledBtn]}
                onPress={handleSaveAddress}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingAddressId ? 'Update Address' : 'Save Address'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Saved Addresses list */}
        <View style={styles.listSection}>
          <Text style={styles.sectionHeading}>Saved Delivery Addresses</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No addresses added yet</Text>
            </View>
          ) : (
            addresses.map(addr => (
              <View key={addr.id} style={[styles.addressCard, addr.isDefault && styles.defaultCard]}>
                <View style={styles.addressInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.contactName}>{addr.fullName}</Text>
                    {addr.isDefault ? (
                      <Text style={styles.defaultBadge}>DEFAULT</Text>
                    ) : (
                      <TouchableOpacity onPress={() => handleToggleDefault(addr)}>
                        <Text style={styles.setDefaultText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.contactMobile}>Mobile: {addr.mobile}</Text>
                  <Text style={styles.addressText}>
                    {addr.houseNumber}, {addr.street}
                  </Text>
                  {addr.landmark ? (
                    <Text style={styles.landmarkText}>Landmark: {addr.landmark}</Text>
                  ) : null}
                  <Text style={styles.addressCity}>{addr.city}, {addr.state} - {addr.pincode}</Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleEditAddress(addr)}
                  >
                    <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteAddress(addr.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    flex: 1,
    padding: SPACING.lg
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.primaryDark,
    marginBottom: SPACING.xs
  },
  inputContainer: {
    gap: 4
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: COLORS.background,
    color: COLORS.text
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.sm
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center'
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: '750'
  },
  disabledBtn: {
    opacity: 0.7
  },
  listSection: {
    marginTop: SPACING.sm,
    marginBottom: 40
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm
  },
  addressCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm
  },
  defaultCard: {
    borderColor: COLORS.primary
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4
  },
  addressInfo: {
    flex: 1,
    alignItems: 'flex-start'
  },
  contactName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text
  },
  contactMobile: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4
  },
  addressText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18
  },
  landmarkText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2
  },
  addressCity: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  setDefaultText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700'
  },
  cardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: SPACING.sm
  },
  actionBtn: {
    padding: 6
  }
});
