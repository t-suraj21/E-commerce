import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { CartContext } from '../../context/CartContext';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';


const { width } = Dimensions.get('window');

export default function CartScreen({ navigation }) {
  const {
    cartItems,
    isLoading,
    updateQuantity,
    removeFromCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    cartOriginalTotal,
    cartProductDiscount,
    cartSubtotal,
    cartCouponDiscount,
    cartTax,
    cartDeliveryCharge,
    cartGrandTotal,
    calculateWeightPrice
  } = useContext(CartContext);

  const { t, locale } = useContext(LanguageContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const [couponInput, setCouponInput] = useState('');
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);

  useEffect(() => {
    fetchActiveCoupons();
  }, []);

  const fetchActiveCoupons = async () => {
    try {
      setIsCouponsLoading(true);
      const response = await apiClient.get('/coupons/active');
      if (response.data.success) {
        setActiveCoupons(response.data.coupons || []);
      }
    } catch (error) {
      console.log('Error fetching active coupons:', error.message);
    } finally {
      setIsCouponsLoading(false);
    }
  };

  const handleIncrement = async (item) => {
    const newQty = item.quantity + 1;
    if (newQty <= item.product.stockQuantity) {
      await updateQuantity(item.productId, newQty, item.weight);
    } else {
      Alert.alert(t('stockAlert'), `Only ${item.product.stockQuantity} items available in stock`);
    }
  };

  const handleDecrement = async (item) => {
    const newQty = item.quantity - 1;
    if (newQty >= 1) {
      await updateQuantity(item.productId, newQty, item.weight);
    } else {
      await removeFromCart(item.productId, item.weight);
    }
  };

  const handleRemoveItem = async (item) => {
    Alert.alert(
      locale === 'en' ? 'Remove Item' : 'सामान हटाएं',
      locale === 'en' 
        ? `Remove "${item.product.name}" from your cart?` 
        : `क्या आप कार्ट से "${item.product.name}" हटाना चाहते हैं?`,
      [
        { text: locale === 'en' ? 'Cancel' : 'रद्द करें', style: 'cancel' },
        { text: locale === 'en' ? 'Remove' : 'हटाएं', style: 'destructive', onPress: () => removeFromCart(item.productId, item.weight) }
      ]
    );
  };

  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = codeToApply || couponInput;
    if (!targetCode.trim()) {
      Alert.alert(t('coupon'), 'Please enter a coupon code.');
      return;
    }
    const result = await applyCoupon(targetCode.trim());
    if (result && result.success) {
      Alert.alert(t('coupon'), result.message);
      setCouponInput('');
    } else {
      Alert.alert(t('coupon'), result?.message || 'Failed to apply coupon');
    }
  };

  const renderCartItem = ({ item }) => {
    const product = item.product;
    if (!product) return null;

    const baseOriginalPrice = parseFloat(product.price);
    const originalPrice = calculateWeightPrice(product, baseOriginalPrice, item.weight);
    const hasDiscount = product.discountPercent > 0;
    const finalPrice = hasDiscount
      ? originalPrice - (originalPrice * product.discountPercent) / 100
      : originalPrice;
    const itemTotal = finalPrice * item.quantity;

    return (
      <View style={[styles.cartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Image source={{ uri: getImageUrl(product.imageUrl) }} style={styles.productImage} />
        
        <View style={styles.cardDetails}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>{product.name}</Text>
          <Text style={[styles.productUnit, { color: theme.textSecondary }]}>{item.weight || product.unit}</Text>
          
          <View style={styles.priceRow}>
            <Text style={[styles.finalPrice, { color: theme.text }]}>₹{finalPrice.toFixed(0)}</Text>
            {hasDiscount && (
              <Text style={[styles.originalPrice, { color: theme.textLight }]}>₹{originalPrice.toFixed(0)}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardRight}>
          <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveItem(item)}>
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>

          <View style={[styles.qtySelector, { borderColor: theme.border }]}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecrement(item)}>
              <Ionicons name="remove" size={16} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: theme.text }]}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncrement(item)}>
              <Ionicons name="add" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.itemTotal, { color: theme.text }]}>₹{itemTotal.toFixed(0)}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerComponent}>
      {/* Coupon Application Section */}
      <View style={[styles.couponSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('applyCoupon')}</Text>
        
        {appliedCoupon ? (
          <View style={[styles.appliedCouponCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <View style={styles.appliedCouponHeader}>
              <View style={[styles.couponBadge, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
                <Ionicons name="pricetag" size={14} color={theme.primary} />
                <Text style={[styles.couponBadgeText, { color: theme.primary }]}>{appliedCoupon.code}</Text>
              </View>
              <TouchableOpacity style={styles.removeCouponBtn} onPress={removeCoupon}>
                <Text style={styles.removeCouponText}>{locale === 'en' ? 'Remove' : 'हटाएं'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.couponMessage, { color: theme.text }]}>{appliedCoupon.message}</Text>
            {appliedCoupon.discount > 0 ? (
              <Text style={[styles.couponSavings, { color: theme.success }]}>
                Saved ₹{parseFloat(appliedCoupon.discount).toFixed(0)} extra
              </Text>
            ) : (
              <Text style={[styles.couponSavings, { color: theme.success }]}>Free shipping applied</Text>
            )}
          </View>
        ) : (
          <>
            <View style={styles.couponInputRow}>
              <TextInput
                style={[styles.couponInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder={locale === 'en' ? 'Enter Promo Code' : 'प्रोमो कोड डालें'}
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
                placeholderTextColor={theme.textLight}
              />
              <TouchableOpacity style={[styles.couponApplyBtn, { borderColor: theme.primary, backgroundColor: theme.primaryLight }]} onPress={() => handleApplyCoupon()}>
                <Text style={[styles.couponApplyBtnText, { color: theme.primary }]}>Apply</Text>
              </TouchableOpacity>
            </View>

            {/* List Active Coupons horizontally */}
            {activeCoupons.length > 0 && (
              <View style={styles.activeCouponsContainer}>
                <Text style={[styles.activeCouponsTitle, { color: theme.textSecondary }]}>{t('selectCoupon')}:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couponsScroll}>
                  {activeCoupons.map((coupon) => (
                    <TouchableOpacity
                      key={coupon.id}
                      style={[styles.couponItemTag, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => handleApplyCoupon(coupon.code)}
                    >
                      <Text style={[styles.couponTagCode, { color: theme.primary }]}>{coupon.code}</Text>
                      <Text style={[styles.couponTagDesc, { color: theme.textSecondary }]}>
                        {coupon.discountType === 'percentage' 
                          ? `${parseFloat(coupon.discountValue).toFixed(0)}% OFF` 
                          : coupon.discountType === 'flat' 
                            ? `₹${parseFloat(coupon.discountValue).toFixed(0)} OFF` 
                            : 'FREE SHIP'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </View>

      {/* Pricing Bill Details */}
      <View style={[styles.billDetailsContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Bill Details</Text>
        
        <View style={styles.billRow}>
          <Text style={[styles.billLabel, { color: theme.textSecondary }]}>{t('itemsTotal')}</Text>
          <Text style={[styles.billValue, { color: theme.text }]}>₹{cartOriginalTotal.toFixed(0)}</Text>
        </View>

        {cartProductDiscount > 0 && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: theme.textSecondary }]}>{t('productDiscount')}</Text>
            <Text style={[styles.billValue, { color: theme.success }]}>-₹{cartProductDiscount.toFixed(0)}</Text>
          </View>
        )}

        {appliedCoupon && cartCouponDiscount > 0 && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: theme.success }]}>{t('coupon')} ({appliedCoupon.code})</Text>
            <Text style={[styles.billValue, { color: theme.success }]}>-₹{cartCouponDiscount.toFixed(0)}</Text>
          </View>
        )}

        <View style={styles.billRow}>
          <Text style={[styles.billLabel, { color: theme.textSecondary }]}>{t('gst')}</Text>
          <Text style={[styles.billValue, { color: theme.text }]}>₹{cartTax.toFixed(0)}</Text>
        </View>

        <View style={styles.billRow}>
          <Text style={[styles.billLabel, { color: theme.textSecondary }]}>{t('deliveryCharges')}</Text>
          <Text style={[styles.billValue, cartDeliveryCharge === 0 && { color: theme.success }]}>
            {cartDeliveryCharge === 0 ? t('free') : `₹${cartDeliveryCharge.toFixed(0)}`}
          </Text>
        </View>

        {cartDeliveryCharge > 0 && cartSubtotal < 200 && (
          <Text style={[styles.deliveryWarning, { color: theme.secondary }]}>
            Add ₹{(200 - cartSubtotal).toFixed(0)} more for FREE delivery
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('cart')}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={theme.textLight} />
          <Text style={[styles.emptyText, { color: theme.text }]}>{locale === 'en' ? 'Your cart is empty' : 'आपका कार्ट खाली है'}</Text>
          <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
            {locale === 'en' ? 'Add items from our shop to make an order.' : 'ऑर्डर करने के लिए दुकान से सामान जोड़ें।'}
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.shopBtnText}>{t('browseShop')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />

          {/* Sticky Checkout Footer */}
          <View style={[styles.stickyFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <View style={styles.totalPayableContainer}>
              <Text style={[styles.payableLabel, { color: theme.textLight }]}>{t('totalPayable')}</Text>
              <Text style={[styles.payableAmount, { color: theme.primary }]}>₹{cartGrandTotal.toFixed(0)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text style={styles.checkoutText}>{t('checkout')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800'
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
    marginTop: SPACING.md
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg
  },
  shopBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.sm
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: 20
  },
  cartCard: {
    flexDirection: 'row',
    borderRadius: SIZES.radiusMd,
    borderWidth: 0,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm
  },
  productImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: SPACING.md
  },
  cardDetails: {
    flex: 1,
    gap: 2
  },
  productName: {
    fontSize: 14,
    fontWeight: '700'
  },
  productUnit: {
    fontSize: 11
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2
  },
  finalPrice: {
    fontSize: 14,
    fontWeight: '800'
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through'
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
    marginLeft: SPACING.sm
  },
  removeBtn: {
    padding: 2,
    marginBottom: 2
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    height: 26,
    justifyContent: 'center'
  },
  qtyBtn: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: SPACING.xs
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '850',
    marginTop: 2
  },
  footerComponent: {
    marginTop: SPACING.sm,
    gap: SPACING.md
  },
  couponSection: {
    borderRadius: SIZES.radiusMd,
    borderWidth: 0,
    padding: SPACING.md,
    ...SHADOWS.sm
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '750',
    marginBottom: SPACING.sm
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.md,
    height: 44,
    fontSize: 13
  },
  couponApplyBtn: {
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  couponApplyBtnText: {
    fontWeight: '750',
    fontSize: 14
  },
  appliedCouponCard: {
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    padding: SPACING.md
  },
  appliedCouponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  couponBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4
  },
  couponBadgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  removeCouponBtn: {
    paddingVertical: 2
  },
  removeCouponText: {
    fontSize: 13,
    fontWeight: '700'
  },
  couponMessage: {
    fontSize: 13,
    fontWeight: '600'
  },
  couponSavings: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2
  },
  activeCouponsContainer: {
    marginTop: SPACING.md,
    gap: SPACING.xs
  },
  activeCouponsTitle: {
    fontSize: 12,
    fontWeight: '600'
  },
  couponsScroll: {
    gap: SPACING.sm,
    paddingVertical: 4
  },
  couponItemTag: {
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 90,
    ...SHADOWS.sm
  },
  couponTagCode: {
    fontSize: 12,
    fontWeight: '800'
  },
  couponTagDesc: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2
  },
  billDetailsContainer: {
    borderRadius: SIZES.radiusMd,
    borderWidth: 0,
    padding: SPACING.md,
    ...SHADOWS.sm,
    marginBottom: 100
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm
  },
  billLabel: {
    fontSize: 13
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600'
  },
  deliveryWarning: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: -SPACING.xs,
    marginBottom: SPACING.xs,
    fontWeight: '650'
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 35,
    borderTopWidth: 0,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.lg
  },
  totalPayableContainer: {
    flexDirection: 'column'
  },
  payableLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  payableAmount: {
    fontSize: 20,
    fontWeight: '900'
  },
  checkoutBtn: {
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    height: 52,
    gap: SPACING.xs,
    ...SHADOWS.md
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  }
});
