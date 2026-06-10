import React, { useContext,  useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';


const { width } = Dimensions.get('window');

export default function ManageCategoriesScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Refresh categories on refocus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/categories');
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.log('Error fetching categories:', error.message);
      Alert.alert('Error', 'Failed to retrieve categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete the category "${category.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`/categories/${category.id}`);
              if (response.data.success) {
                Alert.alert('Success', 'Category deleted successfully');
                fetchCategories();
              }
            } catch (error) {
              console.log('Delete category error:', error.response?.data || error.message);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to delete category'
              );
            }
          }
        }
      ]
    );
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()))
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => navigation.navigate('CategoryProducts', { categoryId: item.id, categoryName: item.name })}
      activeOpacity={0.7}
    >
      <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.categoryImage} />
      
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryDesc} numberOfLines={2}>
          {item.description || 'No description provided'}
        </Text>
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate('AddEditCategory', { category: item })}
        >
          <Ionicons name="pencil" size={16} color={theme.primaryDark} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteCategory(item)}
        >
          <Ionicons name="trash" size={16} color={theme.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Manage Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories by name..."
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading && categories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={64} color={theme.textLight} />
          <Text style={styles.emptyText}>No categories found</Text>
          <Text style={styles.emptySubText}>
            {search ? `No results match "${search}"` : 'Get started by creating your first category.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditCategory')}
      >
        <Ionicons name="add" size={28} color={theme.white} />
      </TouchableOpacity>
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
    backgroundColor: theme.surface
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
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SPACING.sm,
    height: 40
  },
  searchIcon: {
    marginRight: SPACING.sm
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.text
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginTop: SPACING.md
  },
  emptySubText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
    gap: SPACING.md
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: SIZES.radiusSm,
    resizeMode: 'cover',
    marginRight: SPACING.md
  },
  categoryInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text
  },
  categoryDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16
  },
  actionColumn: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginLeft: SPACING.sm
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  },
  editBtn: {
    borderColor: theme.primaryLight,
    backgroundColor: theme.primaryLight
  },
  deleteBtn: {
    borderColor: '#FFEAEA',
    backgroundColor: '#FFEAEA'
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md
  }
});
