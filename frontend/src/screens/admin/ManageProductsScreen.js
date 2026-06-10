import React, { useContext,  useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';


export default function ManageProductsScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Refresh products list when focus returns
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts();
    });
    return unsubscribe;
  }, [navigation]);

  const categoryId = route?.params?.categoryId;
  const categoryName = route?.params?.categoryName;

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      
      const response = await apiClient.get('/products', { params });
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.log('Error fetching products catalog:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchProducts();
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchProducts();
  };

  const handleDeleteProduct = (id, name) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to permanently delete "${name}" from Tarun Kirana Store?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`/products/${id}`);
              if (response.data.success) {
                Alert.alert('Deleted', 'Product removed successfully.');
                fetchProducts();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete product.');
            }
          }
        }
      ]
    );
  };

  const renderProductRow = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.image} />
      
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{item.category?.name || 'No Category'}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.price}>₹{parseFloat(item.price).toFixed(2)}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.unit}>{item.unit}</Text>
        </View>

        <View style={styles.stockStatus}>
          <Text style={styles.stockLabel}>Stock: </Text>
          <Text
            style={[
              styles.stockVal,
              item.stockQuantity === 0 && { color: theme.error },
              item.stockQuantity > 0 && item.stockQuantity < 10 && { color: theme.secondary }
            ]}
          >
            {item.stockQuantity} remaining
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('AddEditProduct', { product: item })}
        >
          <Ionicons name="create-outline" size={20} color={theme.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteProduct(item.id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, categoryId && { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{categoryName ? `${categoryName} Products` : 'Inventory Catalog'}</Text>
          <Text style={styles.subtitle}>{categoryName ? `Manage products in ${categoryName}` : 'Create, Edit and Delete Products'}</Text>
        </View>
      </View>

      {/* Filter / Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items by name..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
          />
          {search ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color={theme.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={theme.textLight} />
          <Text style={styles.emptyText}>No products found</Text>
          <TouchableOpacity style={styles.addNewBtn} onPress={() => navigation.navigate('AddEditProduct', { preselectedCategoryId: categoryId })}>
            <Text style={styles.addNewText}>Add Your First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductRow}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditProduct', { preselectedCategoryId: categoryId })}
      >
        <Ionicons name="add" size={30} color={theme.white} />
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
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.primaryDark
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 2
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
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
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: SPACING.md
  },
  addNewBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd
  },
  addNewText: {
    color: theme.white,
    fontWeight: '700'
  },
  listContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 80
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.sm
  },
  image: {
    width: 65,
    height: 65,
    resizeMode: 'contain',
    marginRight: SPACING.md
  },
  details: {
    flex: 1,
    gap: 2
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text
  },
  category: {
    fontSize: 11,
    color: theme.primary,
    fontWeight: '600'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text
  },
  dot: {
    fontSize: 12,
    color: theme.textLight
  },
  unit: {
    fontSize: 12,
    color: theme.textSecondary
  },
  stockStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  stockLabel: {
    fontSize: 11,
    color: theme.textSecondary
  },
  stockVal: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.success
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    paddingHorizontal: SPACING.sm
  },
  editBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.primaryLight,
    borderRadius: SIZES.radiusSm
  },
  deleteBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    borderRadius: SIZES.radiusSm
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg
  }
});
