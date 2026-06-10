import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';
import { getImageUrl } from '../../utils/imageUtils';


const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const { theme, isDarkMode } = useContext(ThemeContext);
  const { t, locale } = useContext(LanguageContext);

  const styles = getStyles(theme);

  const [feed, setFeed] = useState({
    categories: [],
    todayDeals: [],
    bestSellers: [],
    newArrivals: [],
    recommended: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Banners data (localized titles/subtitles)
  const banners = [
    {
      id: 1,
      title: locale === 'en' ? 'Superfast Delivery' : 'सुपरफास्ट डिलीवरी',
      subtitle: locale === 'en' ? 'Kirana items at your door in 10 mins!' : 'किराना सामान 10 मिनट में आपके द्वार पर!',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
      color: isDarkMode ? '#1B3A1E' : '#E8F5E9'
    },
    {
      id: 2,
      title: locale === 'en' ? 'Monsoon Dairy Deals' : 'मानसून डेयरी डील्स',
      subtitle: locale === 'en' ? 'Up to 15% off on Ghee, Butter & Milk' : 'घी, मक्खन और दूध पर 15% तक की छूट',
      image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&auto=format&fit=crop&q=80',
      color: isDarkMode ? '#3A2A1A' : '#FFF3E0'
    },
    {
      id: 3,
      title: locale === 'en' ? 'Fresh Fruits Discount' : 'ताजे फलों पर छूट',
      subtitle: locale === 'en' ? '100% organic red apples & farm bananas' : '100% जैविक सेब और केले',
      image: 'https://images.unsplash.com/photo-1610832958506-ee563361f158?w=600&auto=format&fit=crop&q=80',
      color: isDarkMode ? '#1A334E' : '#E3F2FD'
    }
  ];

  useEffect(() => {
    fetchHomeFeed();
  }, []);

  const fetchHomeFeed = async () => {
    try {
      const response = await apiClient.get('/products/home');
      if (response.data.success) {
        setFeed(response.data.feed);
      }
    } catch (error) {
      console.log('Error fetching home feed:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHomeFeed();
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('CategoryProducts', {
        searchQuery: searchQuery.trim(),
        categoryName: locale === 'en' ? 'Search Results' : 'खोज परिणाम'
      });
    }
  };

  const handleAddToCart = async (product) => {
    const result = await addToCart(product.id, 1);
    if (result && !result.success) {
      Alert.alert('Error', result.message);
    } else {
      Alert.alert(t('cart'), `"${product.name}" ${t('addedToCart')}`);
    }
  };

  const renderProductCard = ({ item }) => {
    const hasDiscount = item.discountPercent > 0;
    const originalPrice = parseFloat(item.price);
    const finalPrice = hasDiscount
      ? originalPrice - (originalPrice * item.discountPercent) / 100
      : originalPrice;

    const isOutOfStock = item.stockQuantity === 0;

    return (
      <View style={styles.productCard}>
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discountPercent}% OFF</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.cardImageLink}
          onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
        >
          <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.productImage} />
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <Text style={styles.productUnit}>{item.unit}</Text>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          
          <View style={styles.priceRow}>
            <View style={{ gap: 2 }}>
              <Text style={styles.productPrice}>₹{finalPrice.toFixed(0)}</Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>₹{originalPrice.toFixed(0)}</Text>
              )}
            </View>

            {isOutOfStock ? (
              <View style={styles.soldOutBadge}>
                <Text style={styles.soldOutText}>{locale === 'en' ? 'OUT' : 'खत्म'}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddToCart(item)}
              >
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>
              {locale === 'en' ? 'Hello,' : 'नमस्ते,'} {user?.name || 'Guest'}
            </Text>
            <Text style={styles.storeName}>{t('appName')}</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={locale === 'en' ? 'Search groceries, fruits & more...' : 'सामान, फल और अधिक खोजें...'}
            placeholderTextColor={theme.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.primary]} />
        }
      >
        {/* Banner Carousels */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.bannersScroll}
        >
          {banners.map((b) => (
            <View key={b.id} style={[styles.bannerCard, { backgroundColor: b.color }]}>
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              </View>
              <Image source={{ uri: getImageUrl(b.image) }} style={styles.bannerImage} />
            </View>
          ))}
        </ScrollView>

        {/* Categories Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('categories')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CategoriesTab')}>
              <Text style={styles.seeAllBtn}>{locale === 'en' ? 'See All' : 'सभी देखें'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {feed.categories.slice(0, 7).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCol}
                onPress={() => navigation.navigate('CategoryProducts', { categoryId: cat.id, categoryName: cat.name })}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: theme.primaryLight }]}>
                  <Image source={{ uri: getImageUrl(cat.imageUrl) }} style={styles.categoryImage} />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Today's Deals Section */}
        {feed.todayDeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {locale === 'en' ? "Today's Hot Deals 🔥" : 'आज के बेहतरीन ऑफर्स 🔥'}
              </Text>
            </View>
            <FlatList
              data={feed.todayDeals}
              renderItem={renderProductCard}
              keyExtractor={(item) => `deal-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductsList}
              initialNumToRender={5}
              windowSize={3}
            />
          </View>
        )}

        {/* Best Sellers Section */}
        {feed.bestSellers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {locale === 'en' ? 'Bestsellers 🏆' : 'सर्वाधिक बिकने वाले 🏆'}
              </Text>
            </View>
            <FlatList
              data={feed.bestSellers}
              renderItem={renderProductCard}
              keyExtractor={(item) => `best-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductsList}
              initialNumToRender={5}
              windowSize={3}
            />
          </View>
        )}

        {/* New Arrivals Section */}
        {feed.newArrivals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {locale === 'en' ? 'New Arrivals Spark ✨' : 'नए उत्पाद ✨'}
              </Text>
            </View>
            <FlatList
              data={feed.newArrivals}
              renderItem={renderProductCard}
              keyExtractor={(item) => `new-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalProductsList}
              initialNumToRender={5}
              windowSize={3}
            />
          </View>
        )}

        {/* Recommended Grid Section */}
        {feed.recommended.length > 0 && (
          <View style={[styles.section, { marginBottom: 60 }]}>
            <Text style={styles.sectionTitle}>
              {locale === 'en' ? 'Recommended for You 🎯' : 'आपके लिए अनुशंसित 🎯'}
            </Text>
            <View style={styles.gridContainer}>
              {feed.recommended.map((item) => (
                <View key={`rec-${item.id}`} style={styles.gridItemWrapper}>
                  {renderProductCard({ item })}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: theme.surface,
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderColor: theme.border,
    ...SHADOWS.sm
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  welcomeText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '550'
  },
  storeName: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.primary
  },
  wishlistIcon: {
    width: 38,
    height: 38,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SPACING.md,
    height: 44
  },
  searchIcon: {
    marginRight: SPACING.xs
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    height: '100%'
  },
  scrollContent: {
    paddingBottom: 40
  },
  bannersScroll: {
    marginTop: SPACING.md,
    height: 140
  },
  bannerCard: {
    width: width - SPACING.lg * 2,
    marginHorizontal: SPACING.lg,
    borderRadius: SIZES.radiusLg,
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  bannerInfo: {
    flex: 1,
    gap: 4
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.text
  },
  bannerSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  bannerImage: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    borderRadius: SIZES.radiusMd
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text
  },
  seeAllBtn: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '700'
  },
  categoriesScroll: {
    gap: SPACING.md,
    paddingVertical: 4
  },
  categoryCol: {
    alignItems: 'center',
    width: 65
  },
  categoryIconCircle: {
    width: 54,
    height: 54,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm
  },
  categoryImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    borderRadius: SIZES.radiusSm
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text,
    marginTop: 4,
    textAlign: 'center',
    width: '100%'
  },
  horizontalProductsList: {
    gap: SPACING.md,
    paddingVertical: 4
  },
  productCard: {
    width: 145,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusMd,
    padding: SPACING.md,
    ...SHADOWS.sm
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: theme.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800'
  },
  cardImageLink: {
    alignItems: 'center',
    marginTop: SPACING.xs
  },
  productImage: {
    width: 85,
    height: 85,
    resizeMode: 'contain'
  },
  productInfo: {
    marginTop: SPACING.xs,
    gap: 2
  },
  productUnit: {
    fontSize: 10,
    color: theme.textSecondary
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.xs
  },
  originalPrice: {
    fontSize: 11,
    color: theme.textLight,
    textDecorationLine: 'line-through'
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text
  },
  addButton: {
    borderWidth: 1,
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  addButtonText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '800'
  },
  soldOutBadge: {
    backgroundColor: '#FFEAEA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  soldOutText: {
    color: theme.error,
    fontSize: 9,
    fontWeight: '700'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.xs
  },
  gridItemWrapper: {
    width: '48%',
    marginBottom: SPACING.sm
  }
});
