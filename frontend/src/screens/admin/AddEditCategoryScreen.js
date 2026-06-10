import React, { useContext,  useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';

export default function AddEditCategoryScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const { category } = route.params || {};
  const isEditMode = !!category;

  const [name, setName] = useState(category ? category.name : '');
  const [description, setDescription] = useState(category ? category.description : '');
  const [imageUri, setImageUri] = useState(null);
  const [imageUrl, setImageUrl] = useState(category ? category.imageUrl : '');
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());

      if (imageUri) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('image', { uri: imageUri, name: filename, type });
      } else if (imageUrl) {
        formData.append('imageUrl', imageUrl);
      }

      let response;
      if (isEditMode) {
        response = await apiClient.put(`/categories/${category.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await apiClient.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (response.data.success) {
        Alert.alert('Success', `Category ${isEditMode ? 'updated' : 'created'} successfully!`);
        navigation.goBack();
      }
    } catch (error) {
      console.log('Save category error:', error.response?.data || error.message);
      Alert.alert(
        'Error',
        error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} category.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.title}>{isEditMode ? 'Edit Category' : 'Add Category'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.instruction}>
          {isEditMode
            ? 'Modify the details of this category below.'
            : 'Fill in the fields below to create a new product category.'}
        </Text>

        {/* Category Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Household Items, Fresh Fruits"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Category Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide a brief description of the products in this category..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category Image Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category Image</Text>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : imageUrl ? (
              <Image source={{ uri: getImageUrl(imageUrl) }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={theme.textLight} />
                <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.white} />
              <Text style={styles.saveBtnText}>{isEditMode ? 'Update Category' : 'Create Category'}</Text>
            </>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.primaryDark
  },
  formContainer: {
    flex: 1,
    padding: SPACING.lg
  },
  instruction: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20
  },
  inputGroup: {
    marginBottom: SPACING.md
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 6
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.md,
    height: 46,
    fontSize: 14,
    color: theme.text
  },
  textArea: {
    height: 100,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm
  },
  helpText: {
    fontSize: 11,
    color: theme.textLight,
    marginTop: 4
  },
  imagePickerBtn: {
    height: 120,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  imagePlaceholderText: {
    marginTop: SPACING.xs,
    fontSize: 12,
    color: theme.textLight
  },
  saveBtn: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
    borderRadius: SIZES.radiusMd,
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    marginBottom: 50,
    ...SHADOWS.sm
  },
  saveBtnText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700'
  }
});
