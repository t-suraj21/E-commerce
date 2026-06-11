import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';
import { getImageUrl } from '../../utils/imageUtils';
import { analytics } from '../../utils/firebase';


const { width } = Dimensions.get('window');

const WEIGHT_OPTIONS = ['100gm', '200gm', '250gm', '500gm', '1kg', '2kg', '3kg', '5kg', '10kg', '25kg'];

const isWeightBasedProduct = (product) => {
  if (!product) return false;
  const unit = (product.unit || '').toLowerCase();
  if (unit === 'kg' || unit === 'gram') return true;
  
  const name = (product.name || '').toLowerCase();
  const keywords = ['rice', 'flour', 'floar', 'maida', 'sugar', 'daal', 'humad', 'misri', 'badam', 'channa', 'jawain', 'mangraila', 'dal'];
  return keywords.some(keyword => name.includes(keyword));
};

export default function ProductDetailsScreen({ route, navigation }) {
  const { productId } = route.params;
  const { user } = useContext(AuthContext);
  const { t, locale } = useContext(LanguageContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const styles = getStyles(theme);

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState('1kg');

  const { addToCart, calculateWeightPrice } = useContext(CartContext);

  useEffect(() => {
    fetchProductDetails();
  }, [productId, user]);

  const fetchProductDetails = async () => {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      if (response.data.success) {
        const fetchedProduct = response.data.product;
        setProduct(fetchedProduct);
        await analytics().logEvent('product_viewed', {
          item_id: fetchedProduct.id.toString(),
          item_name: fetchedProduct.name
        });
      }
    } catch (error) {
      console.log('Error fetching product details:', error.message);
    } finally {
      setIsLoading(false);
    }
  };



  const handleIncrement = () => {
    if (product && quantity < product.stockQuantity) {
      setQuantity(prev => prev + 1);
    } else {
      Alert.alert(locale === 'en' ? 'Stock Limit' : 'स्टॉक सीमा', locale === 'en' ? 'Cannot add more items than available in stock.' : 'स्टॉक में उपलब्ध मात्रा से अधिक नहीं जोड़ा जा सकता।');
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    const isWeightBased = isWeightBasedProduct(product);
    const result = await addToCart(product.id, quantity, isWeightBased ? selectedWeight : product.unit);
    if (result && result.success) {
      await analytics().logEvent('add_to_cart', {
        item_id: product.id.toString(),
        item_name: product.name,
        quantity: quantity,
        weight: isWeightBased ? selectedWeight : product.unit
      });
      Alert.alert(t('cart'), `Added ${quantity} x ${isWeightBased ? selectedWeight : product.unit} of "${product.name}" to your cart!`);
      navigation.navigate('CartTab');
    } else {
      Alert.alert('Error', result?.message || 'Failed to add item to cart.');
    }
  };



  if (isLoading || !product) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isWeightBased = isWeightBasedProduct(product);
  const baseOriginalPrice = parseFloat(product.price);
  const originalPrice = isWeightBased 
    ? calculateWeightPrice(product, baseOriginalPrice, selectedWeight)
    : baseOriginalPrice;

  const hasDiscount = product.discountPercent > 0;
  const finalPrice = hasDiscount
    ? originalPrice - (originalPrice * product.discountPercent) / 100
    : originalPrice;
  const totalPrice = finalPrice * quantity;
  const isOutOfStock = product.stockQuantity === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageSection}>
          <Image source={{ uri: getImageUrl(product.imageUrl) }} style={styles.productImage} />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{product.discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Metadata Info */}
        <View style={styles.detailsCard}>
          <Text style={styles.categoryLabel}>{product.category?.name || 'Grocery'}</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productUnit}>{isWeightBased ? selectedWeight : product.unit}</Text>

          <View style={styles.priceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.finalPrice}>₹{finalPrice.toFixed(0)}</Text>
              {hasDiscount && (
                <Text style={styles.originalPrice}>₹{originalPrice.toFixed(0)}</Text>
              )}
            </View>
          </View>

          {/* Weight Selector */}
          {isWeightBased && (
            <View style={styles.weightSelectorSection}>
              <Text style={styles.label}>{locale === 'en' ? 'Select Weight' : 'वजन चुनें'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weightSelectorScroll}>
                {WEIGHT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.weightOptBtn,
                      selectedWeight === opt && styles.selectedWeightOptBtn
                    ]}
                    onPress={() => setSelectedWeight(opt)}
                  >
                    <Text
                      style={[
                        styles.weightOptText,
                        selectedWeight === opt && styles.selectedWeightOptText
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          {product.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionHeading}>{locale === 'en' ? 'Description' : 'विवरण'}</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}
        </View>


      </ScrollView>

      {/* Sticky Bottom Purchase Footer */}
      <View style={styles.footer}>
        {isOutOfStock ? (
          <View style={styles.outOfStockBanner}>
            <Text style={styles.outOfStockText}>{locale === 'en' ? 'OUT OF STOCK' : 'स्टॉक खत्म'}</Text>
          </View>
        ) : (
          <>
            {/* Quantity Picker */}
            <View style={styles.quantityPicker}>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrement}>
                <Ionicons name="remove" size={20} color={theme.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleIncrement}>
                <Ionicons name="add" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {/* Add to Cart button */}
            <TouchableOpacity style={styles.submitButton} onPress={handleAddToCart}>
              <Text style={styles.submitButtonText}>{t('addToCart')}</Text>
              <Text style={styles.totalPriceText}>₹{totalPrice.toFixed(0)}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    ...SHADOWS.sm
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.md
  },
  wishlistBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    flex: 1
  },
  imageSection: {
    backgroundColor: theme.background,
    paddingVertical: SPACING.xl * 1.5,
    alignItems: 'center',
    position: 'relative',
    borderBottomLeftRadius: SIZES.radiusLg,
    borderBottomRightRadius: SIZES.radiusLg,
    marginBottom: -SIZES.radiusLg,
    zIndex: 1,
    ...SHADOWS.sm
  },
  productImage: {
    width: width * 0.7,
    height: width * 0.7,
    resizeMode: 'contain'
  },
  discountBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.lg,
    backgroundColor: theme.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radiusMd
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  detailsCard: {
    backgroundColor: theme.surface,
    paddingTop: SPACING.xl + SIZES.radiusLg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    zIndex: 0,
    ...SHADOWS.sm
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  productName: {
    fontSize: 20,
    fontWeight: '850',
    color: theme.text,
    marginTop: 4
  },
  productUnit: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.text
  },
  originalPrice: {
    fontSize: 16,
    color: theme.textLight,
    textDecorationLine: 'line-through'
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border
  },
  ratingText: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '700'
  },
  descriptionSection: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: SPACING.md
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '750',
    color: theme.text,
    marginBottom: SPACING.xs
  },
  descriptionText: {
    fontSize: 13.5,
    color: theme.textSecondary,
    lineHeight: 19
  },
  reviewsSection: {
    backgroundColor: theme.surface,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    marginBottom: 100
  },
  noReviewsText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontStyle: 'italic',
    marginVertical: SPACING.md
  },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: SPACING.md
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  reviewStars: {
    flexDirection: 'row'
  },
  reviewComment: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
    lineHeight: 18
  },
  reviewDate: {
    fontSize: 10,
    color: theme.textLight,
    marginTop: 4
  },
  writeReviewSection: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    marginTop: SPACING.sm,
    marginBottom: 6
  },
  starSelector: {
    flexDirection: 'row',
    marginBottom: SPACING.sm
  },
  reviewInput: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: theme.text,
    height: 70,
    textAlignVertical: 'top'
  },
  reviewSubmitBtn: {
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md
  },
  reviewSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 34,
    backgroundColor: theme.surface,
    alignItems: 'center',
    gap: SPACING.md,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    ...SHADOWS.lg
  },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusMd,
    padding: 2,
    backgroundColor: theme.background,
    ...SHADOWS.sm
  },
  qtyBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusSm,
    ...SHADOWS.sm
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: SPACING.md,
    color: theme.text
  },
  submitButton: {
    flex: 1,
    backgroundColor: theme.primary,
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 52,
    ...SHADOWS.md
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  totalPriceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  },
  outOfStockBanner: {
    flex: 1,
    backgroundColor: '#FFEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    borderRadius: SIZES.radiusMd
  },
  outOfStockText: {
    color: theme.error,
    fontSize: 16,
    fontWeight: '800'
  },
  weightSelectorSection: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: SPACING.sm
  },
  weightSelectorScroll: {
    gap: SPACING.xs,
    paddingVertical: SPACING.xs
  },
  weightOptBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    marginRight: SPACING.xs
  },
  selectedWeightOptBtn: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight
  },
  weightOptText: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '700'
  },
  selectedWeightOptText: {
    color: theme.primary,
    fontWeight: '800'
  }
});
