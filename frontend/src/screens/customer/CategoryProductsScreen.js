import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';
import { CartContext } from '../../context/CartContext';
import { getImageUrl } from '../../utils/imageUtils';
import { analytics } from '../../utils/firebase';


const { width } = Dimensions.get('window');

export default function CategoryProductsScreen({ route, navigation }) {
  const { categoryId, categoryName, searchQuery } = route.params || {};
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(searchQuery || '');
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async (queryOverride = '') => {
    setIsLoading(true);
    try {
      const q = queryOverride !== '' ? queryOverride : search;
      const params = {};
      if (categoryId) params.categoryId = categoryId;
      if (q) params.search = q;

      const response = await apiClient.get('/products', { params });
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.log('Error fetching category products:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchProducts();
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchProducts('');
  };

  const handleAddToCart = async (product) => {
    const result = await addToCart(product.id, 1);
    if (result && !result.success) {
      alert(result.message);
    } else {
      await analytics().logEvent('add_to_cart', {
        item_id: product.id.toString(),
        item_name: product.name,
        quantity: 1
      });
    }
  };

  const renderProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <TouchableOpacity 
        style={styles.cardImageLink}
        onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
      >
        <Image 
          source={{ uri: getImageUrl(item.imageUrl) }} 
          style={styles.productImage} 
        />
      </TouchableOpacity>
      
      <View style={styles.productDetails}>
        <Text style={styles.productUnit}>{item.unit || '1 pc'}</Text>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
          {item.stock > 0 ? (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title} numberOfLines={1}>
          {categoryName || 'Products'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter / Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search in ${categoryName || 'Products'}...`}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
          />
          {search ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No items found</Text>
          <Text style={styles.emptySubText}>We couldn't find any products matching your search.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    backgroundColor: COLORS.white
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
    color: COLORS.primaryDark,
    maxWidth: width - 120,
    textAlign: 'center'
  },
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text
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
    color: COLORS.text,
    marginTop: SPACING.md
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs
  },
  listContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 40
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm
  },
  cardImageLink: {
    marginRight: SPACING.md
  },
  productImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain'
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center'
  },
  productUnit: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2
  },
  productDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text
  },
  addButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  outOfStockBadge: {
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm
  },
  outOfStockText: {
    color: COLORS.error,
    fontSize: 10,
    fontWeight: '700'
  }
});
