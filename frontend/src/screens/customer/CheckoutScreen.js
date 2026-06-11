import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';
import { CartContext } from '../../context/CartContext';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';
import { getImageUrl } from '../../utils/imageUtils';
import { crashlytics } from '../../utils/firebase';


export default function CheckoutScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddressesLoading, setIsAddressesLoading] = useState(true);

  const {
    cartItems,
    appliedCoupon,
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

  const styles = getStyles(theme);

  useEffect(() => {
    fetchAddresses();
    crashlytics().log('User opened checkout page');
  }, []);

  // Refresh addresses when focus returns (e.g. after adding address)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddresses();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchAddresses = async () => {
    try {
      const response = await apiClient.get('/addresses');
      if (response.data.success) {
        const addrList = response.data.addresses || [];
        setAddresses(addrList);
        
        // Auto select default address
        const defaultAddr = addrList.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (addrList.length > 0) {
          setSelectedAddressId(addrList[0].id);
        }
      }
    } catch (error) {
      console.log('Error fetching addresses:', error.message);
    } finally {
      setIsAddressesLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedAddressId) {
      Alert.alert(
        locale === 'en' ? 'Address Required' : 'पता आवश्यक है',
        locale === 'en' ? 'Please add or select a delivery address' : 'कृपया एक वितरण पता जोड़ें या चुनें'
      );
      return;
    }
    navigation.navigate('Payment', {
      addressId: selectedAddressId,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      amount: cartGrandTotal
    });
  };

  const getItemPricing = (item) => {
    const product = item.product;
    if (!product) return { originalPrice: 0, finalPrice: 0, hasDiscount: false, itemTotal: 0 };
    const baseOriginalPrice = parseFloat(product.price);
    const originalPrice = calculateWeightPrice(product, baseOriginalPrice, item.weight);
    const hasDiscount = product.discountPercent > 0;
    const finalPrice = hasDiscount
      ? originalPrice - (originalPrice * product.discountPercent) / 100
      : originalPrice;
    const itemTotal = finalPrice * item.quantity;
    return { originalPrice, finalPrice, hasDiscount, itemTotal, discountPercent: product.discountPercent };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.headerTitle}>{t('checkout')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Order Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{locale === 'en' ? 'Order Summary' : 'ऑर्डर विवरण'}</Text>
            <Text style={styles.itemCount}>
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {cartItems.map((item) => {
            const product = item.product;
            if (!product) return null;
            const { originalPrice, finalPrice, hasDiscount, itemTotal, discountPercent } = getItemPricing(item);

            return (
              <View style={styles.orderItemCard} key={item.id}>
                <Image
                  source={{ uri: getImageUrl(product.imageUrl) }}
                  style={styles.orderItemImage}
                />
                <View style={styles.orderItemDetails}>
                  <Text style={styles.orderItemName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.orderItemUnit}>{item.weight || product.unit}</Text>

                  <View style={styles.orderItemPriceRow}>
                    <Text style={styles.orderItemFinalPrice}>₹{finalPrice.toFixed(0)}</Text>
                    {hasDiscount && (
                      <>
                        <Text style={styles.orderItemOriginalPrice}>₹{originalPrice.toFixed(0)}</Text>
                        <View style={styles.orderItemDiscountBadge}>
                          <Text style={styles.orderItemDiscountText}>{discountPercent}% OFF</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.orderItemRight}>
                  <View style={styles.orderItemQtyBadge}>
                    <Text style={styles.orderItemQtyText}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.orderItemTotal}>₹{itemTotal.toFixed(0)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{locale === 'en' ? 'Delivery Address' : 'वितरण पता'}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddressManager')}>
              <Text style={styles.actionText}>{locale === 'en' ? '+ Add New' : '+ नया जोड़ें'}</Text>
            </TouchableOpacity>
          </View>

          {isAddressesLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: SPACING.md }} />
          ) : addresses.length === 0 ? (
            <View style={styles.emptyAddress}>
              <Text style={styles.emptyAddressText}>No saved addresses found</Text>
              <TouchableOpacity
                style={[styles.addAddressBtn, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddressManager')}
              >
                <Text style={styles.addAddressBtnText}>Add Delivery Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map(addr => (
              <TouchableOpacity
                key={addr.id}
                style={[
                  styles.addressCard,
                  selectedAddressId === addr.id && styles.selectedAddressCard
                ]}
                onPress={() => setSelectedAddressId(addr.id)}
              >
                <Ionicons
                  name={selectedAddressId === addr.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedAddressId === addr.id ? theme.primary : theme.textSecondary}
                  style={styles.radioIcon}
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLine1}>{addr.fullName} ({addr.mobile})</Text>
                  <Text style={styles.addressLine2}>{addr.houseNumber}, {addr.street}</Text>
                  {addr.landmark ? <Text style={styles.addressLine2}>Landmark: {addr.landmark}</Text> : null}
                  <Text style={styles.addressCity}>{addr.city}, {addr.state} - {addr.pincode}</Text>
                  {addr.isDefault && <Text style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>DEFAULT</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Price Breakdown Summary */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>{t('priceSummary')}</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('itemsTotal')}</Text>
            <Text style={styles.priceValue}>₹{cartOriginalTotal.toFixed(0)}</Text>
          </View>
          {cartProductDiscount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('productDiscount')}</Text>
              <Text style={[styles.priceValue, { color: theme.success }]}>
                -₹{cartProductDiscount.toFixed(0)}
              </Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('subtotal')}</Text>
            <Text style={styles.priceValue}>₹{cartSubtotal.toFixed(0)}</Text>
          </View>
          {appliedCoupon && cartCouponDiscount > 0 && (
            <View style={styles.priceRow}>
              <View style={styles.couponLabelRow}>
                <Ionicons name="pricetag" size={13} color={theme.success} />
                <Text style={[styles.priceLabel, { color: theme.success }]}>{t('coupon')} ({appliedCoupon.code})</Text>
              </View>
              <Text style={[styles.priceValue, { color: theme.success }]}>
                -₹{cartCouponDiscount.toFixed(0)}
              </Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('deliveryCharges')}</Text>
            <Text style={[styles.priceValue, cartDeliveryCharge === 0 && { color: theme.success, fontWeight: '700' }]}>
              {cartDeliveryCharge === 0 ? t('free') : `₹${cartDeliveryCharge.toFixed(0)}`}
            </Text>
          </View>
          {cartDeliveryCharge > 0 && cartSubtotal < 200 && (
            <Text style={styles.deliveryHint}>
              Add ₹{(200 - cartSubtotal).toFixed(0)} more for FREE delivery
            </Text>
          )}
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>{t('totalPayable')}</Text>
            <Text style={styles.totalValue}>₹{cartGrandTotal.toFixed(0)}</Text>
          </View>

          {/* Savings Callout Banner */}
          {(cartProductDiscount > 0 || cartCouponDiscount > 0 || cartDeliveryCharge === 0) && (
            <View style={[styles.savingsBanner, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="gift-outline" size={16} color={theme.primary} />
              <Text style={[styles.savingsText, { color: theme.primary }]}>
                {t('savingsBanner', { amount: (cartProductDiscount + cartCouponDiscount + (cartSubtotal > 200 ? 30 : 0)).toFixed(0) })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Proceed button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.placeOrderBtn}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.placeOrderText}>{locale === 'en' ? 'Proceed to Payment' : 'भुगतान के लिए आगे बढ़ें'}</Text>
          <Text style={styles.payAmount}>₹{cartGrandTotal.toFixed(0)}</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 18,
    fontWeight: '800',
    color: theme.primaryDark
  },
  scrollContent: {
    flex: 1
  },
  section: {
    backgroundColor: theme.surface,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: SPACING.sm
  },
  itemCount: {
    fontSize: 13,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  actionText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600'
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: SIZES.radiusMd,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: theme.border
  },
  orderItemImage: {
    width: 45,
    height: 45,
    resizeMode: 'contain',
    marginRight: SPACING.sm
  },
  orderItemDetails: {
    flex: 1
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  orderItemUnit: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 1
  },
  orderItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2
  },
  orderItemFinalPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.text
  },
  orderItemOriginalPrice: {
    fontSize: 10,
    color: theme.textLight,
    textDecorationLine: 'line-through'
  },
  orderItemDiscountBadge: {
    backgroundColor: theme.success,
    paddingHorizontal: 4,
    borderRadius: 2
  },
  orderItemDiscountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800'
  },
  orderItemRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs
  },
  orderItemQtyBadge: {
    backgroundColor: theme.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm
  },
  orderItemQtyText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.text
  },
  orderItemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text
  },
  emptyAddress: {
    alignItems: 'center',
    paddingVertical: SPACING.lg
  },
  emptyAddressText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: SPACING.md
  },
  addAddressBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm
  },
  addAddressBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  addressCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: theme.border,
    marginBottom: SPACING.sm,
    backgroundColor: theme.background
  },
  selectedAddressCard: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight
  },
  radioIcon: {
    marginRight: SPACING.sm,
    marginTop: 2
  },
  addressInfo: {
    flex: 1
  },
  addressLine1: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text
  },
  addressLine2: {
    fontSize: 12.5,
    color: theme.textSecondary,
    marginTop: 2
  },
  addressCity: {
    fontSize: 12.5,
    color: theme.textSecondary,
    marginTop: 1
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: SPACING.xs
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4
  },
  priceLabel: {
    fontSize: 13,
    color: theme.textSecondary
  },
  priceValue: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '600'
  },
  couponLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  deliveryHint: {
    fontSize: 11,
    color: theme.secondary,
    textAlign: 'right',
    marginTop: -2,
    marginBottom: SPACING.xs,
    fontWeight: '650'
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: SPACING.sm
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.primary
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    padding: SPACING.sm,
    marginTop: SPACING.md,
    gap: SPACING.xs
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  footer: {
    backgroundColor: theme.surface,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    ...SHADOWS.lg
  },
  placeOrderBtn: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    height: 52,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.md
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  payAmount: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900'
  }
});
