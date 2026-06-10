import React, { useContext,  useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient, { getBaseUrl } from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddEditProductScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const editProduct = route.params?.product; // If present, we are in Edit Mode
  const preselectedCategoryId = route.params?.preselectedCategoryId;
  const isEditMode = !!editProduct;

  const [categories, setCategories] = useState([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Form states
  const [name, setName] = useState(editProduct?.name || '');
  const [description, setDescription] = useState(editProduct?.description || '');
  const [price, setPrice] = useState(editProduct ? editProduct.price.toString() : '');
  const [stockQuantity, setStockQuantity] = useState(editProduct ? editProduct.stockQuantity.toString() : '');
  const [unit, setUnit] = useState(editProduct?.unit || '1 unit');
  const [categoryId, setCategoryId] = useState(editProduct?.categoryId || preselectedCategoryId || null);
  const [isActive, setIsActive] = useState(editProduct?.isActive !== undefined ? editProduct.isActive : true);
  const [discountPercent, setDiscountPercent] = useState(editProduct ? editProduct.discountPercent.toString() : '0');
  
  const [localImages, setLocalImages] = useState([]);

  const existingImages = [];
  if (editProduct?.imageUrl) existingImages.push(editProduct.imageUrl);
  try {
    if (editProduct?.images) {
      const parsed = typeof editProduct.images === 'string' ? JSON.parse(editProduct.images) : editProduct.images;
      if (Array.isArray(parsed)) existingImages.push(...parsed);
    }
  } catch(e) {}
  const uniqueExistingImages = [...new Set(existingImages)];

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need gallery permissions to upload images.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setLocalImages([...localImages, ...result.assets]);
    }
  };

  const removeLocalImage = (index) => {
    const newImages = [...localImages];
    newImages.splice(index, 1);
    setLocalImages(newImages);
  };

  // Pre-configured category list fallback if API fails
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      if (response.data.success) {
        setCategories(response.data.categories || []);
        if (!editProduct && !preselectedCategoryId && response.data.categories.length > 0) {
          setCategoryId(response.data.categories[0].id); // Default to first category
        }
      }
    } catch (error) {
      console.log('Error categories:', error.message);
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Category name cannot be empty');
      return;
    }
    setIsSavingCategory(true);
    try {
      const response = await apiClient.post('/categories', {
        name: newCategoryName.trim(),
        description: '',
        isActive: true
      });
      if (response.data.success) {
        const newCat = response.data.category;
        setCategories([...categories, newCat]);
        setCategoryId(newCat.id);
        setIsAddingCategory(false);
        setNewCategoryName('');
      }
    } catch (error) {
      console.error('Add category error:', error);
      Alert.alert('Error', 'Failed to add category. Make sure it does not already exist.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !price.trim() || !stockQuantity.trim() || !unit.trim() || !categoryId) {
      Alert.alert('Validation Error', 'Please fill in all required fields marked *');
      return;
    }

    const priceVal = parseFloat(price);
    const stockVal = parseInt(stockQuantity, 10);
    const discountVal = parseInt(discountPercent, 10);

    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    if (isNaN(stockVal) || stockVal < 0) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity');
      return;
    }

    if (isNaN(discountVal) || discountVal < 0 || discountVal > 100) {
      Alert.alert('Validation Error', 'Discount must be a percentage between 0 and 100');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('price', priceVal);
      formData.append('stockQuantity', stockVal);
      formData.append('unit', unit.trim());
      formData.append('categoryId', categoryId);
      formData.append('isActive', isActive);
      formData.append('discountPercent', discountVal);

      localImages.forEach((img, index) => {
        formData.append('images', {
          uri: img.uri,
          type: 'image/jpeg',
          name: img.fileName || `upload-${index}.jpg`
        });
      });

      const token = await AsyncStorage.getItem('token');
      const url = isEditMode ? `${getBaseUrl()}/products/${editProduct.id}` : `${getBaseUrl()}/products`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        Alert.alert('Success', `Product ${isEditMode ? 'updated' : 'added'} successfully!`);
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || 'Failed to save product details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Product' : 'Add New Product'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {/* Product Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fresh Mangoes"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Category Picker Selector */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category *</Text>
            {isCategoriesLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <View>
                <View style={styles.pickerDropdownContainer}>
                  <Picker
                    selectedValue={categoryId}
                    onValueChange={(itemValue) => {
                      if (itemValue === 'ADD_NEW') {
                        setIsAddingCategory(true);
                        setCategoryId(null);
                      } else {
                        setCategoryId(itemValue);
                        setIsAddingCategory(false);
                      }
                    }}
                    style={styles.pickerDropdown}
                  >
                    <Picker.Item label="Select a category..." value={null} />
                    {categories.map(cat => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                    <Picker.Item label="+ Add New Category" value="ADD_NEW" color={theme.primary} />
                  </Picker>
                </View>
                {isAddingCategory && (
                  <View style={styles.addCategoryContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="New Category Name"
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                    />
                    <TouchableOpacity style={styles.addCategoryBtn} onPress={handleAddNewCategory} disabled={isSavingCategory}>
                      {isSavingCategory ? (
                        <ActivityIndicator size="small" color={theme.white} />
                      ) : (
                        <Text style={styles.addCategoryBtnText}>Save</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelCategoryBtn} onPress={() => setIsAddingCategory(false)}>
                      <Ionicons name="close-circle" size={24} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Pricing and Unit */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 150"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Unit *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1 kg, 1 packet"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          {/* Stock Quantity */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Initial Stock Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="number-pad"
            />
          </View>

          {/* Discount Percentage */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Discount Percentage (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10 (for 10% off)"
              value={discountPercent}
              onChangeText={setDiscountPercent}
              keyboardType="number-pad"
            />
          </View>

          {/* Product Images */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Product Images</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {uniqueExistingImages.map((uri, index) => {
                const isLocal = uri.startsWith('/');
                const fullUri = isLocal ? `http://10.0.2.2:5000${uri}` : uri;
                return (
                  <View key={`existing-${index}`} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: fullUri }} style={styles.imagePreview} />
                    <View style={styles.existingBadge}><Text style={styles.existingBadgeText}>Saved</Text></View>
                  </View>
                );
              })}
              {localImages.map((img, index) => (
                <View key={`local-${index}`} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeLocalImage(index)}>
                    <Ionicons name="close-circle" size={24} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                <Ionicons name="camera-outline" size={32} color={theme.primary} />
                <Text style={styles.addImageText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Product Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter product features, ingredients, details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Active Switch Toggle */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Is Product Available</Text>
              <Text style={styles.hintText}>Turn off to hide product from customer list</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={theme.white}
            />
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            style={[styles.submitBtn, isSaving && styles.disabledBtn]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                {isEditMode ? 'Update Product' : 'Add Product'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
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
    color: theme.primaryDark
  },
  scrollContent: {
    flex: 1,
    padding: SPACING.lg
  },
  formCard: {
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    marginBottom: 40,
    gap: SPACING.md,
    ...SHADOWS.md
  },
  inputContainer: {
    gap: 4
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: theme.background
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  pickerDropdownContainer: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusSm,
    backgroundColor: theme.background,
    overflow: 'hidden'
  },
  pickerDropdown: {
    height: 50,
    width: '100%'
  },
  imageScroll: {
    flexDirection: 'row',
    marginTop: SPACING.xs
  },
  imagePreviewContainer: {
    marginRight: SPACING.sm,
    position: 'relative'
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusSm,
    backgroundColor: theme.border
  },
  existingBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderBottomLeftRadius: SIZES.radiusSm,
    borderBottomRightRadius: SIZES.radiusSm,
    paddingVertical: 2
  },
  existingBadgeText: {
    color: theme.white,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '700'
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.surface,
    borderRadius: 12
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: theme.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.primaryLight
  },
  addImageText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600',
    marginTop: 4
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 4
  },
  pickerOption: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface
  },
  selectedPickerOption: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight
  },
  pickerOptionText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  selectedPickerOptionText: {
    color: theme.primary,
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: SPACING.sm
  },
  hintText: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2
  },
  submitBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.sm
  },
  submitBtnText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700'
  },
  disabledBtn: {
    opacity: 0.7
  },
  addCategoryContainer: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center'
  },
  addCategoryBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  addCategoryBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 12
  },
  cancelCategoryBtn: {
    padding: 2
  }
});
