import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      if (response.data.success) {
        setOrder(response.data.order);
      }
    } catch (error) {
      console.log('Error fetching order details:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const response = await apiClient.put(`/orders/${orderId}/status`, {
                status: 'cancelled'
              });
              if (response.data.success) {
                Alert.alert('Cancelled', 'Your order was cancelled successfully.');
                fetchOrderDetails();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel order.');
            } finally {
              setIsCancelling(false);
            }
          }
        }
      ]
    );
  };

  // Helper to determine active step in timeline
  const getStepIndex = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'confirmed':
      case 'accepted':
      case 'packed': return 1;
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const renderTimelineStep = (stepNum, title, description, activeIndex, isLast = false) => {
    // A step is fully completed if we've passed it OR if it's the final step ('delivered') and we are on it.
    const isCompleted = activeIndex > stepNum || (activeIndex === 3 && stepNum === 3);
    // A step is the current "in-progress" step if we are on it, EXCEPT if it's the final step
    const isCurrent = activeIndex === stepNum && stepNum !== 3;

    return (
      <View style={styles.timelineStep} key={stepNum}>
        <View style={styles.timelineIndicatorWrapper}>
          <View
            style={[
              styles.timelineDot,
              isCompleted && styles.completedDot,
              isCurrent && styles.currentDot
            ]}
          >
            {isCompleted && (
              <Ionicons name="checkmark" size={14} color={COLORS.white} />
            )}
          </View>
          {!isLast && (
            <View
              style={[
                styles.timelineLine,
                activeIndex > stepNum && styles.completedLine
              ]}
            />
          )}
        </View>
        <View style={styles.timelineContent}>
          <Text style={[styles.stepTitle, (isCompleted || isCurrent) && styles.completedText]}>{title}</Text>
          <Text style={styles.stepDesc}>{description}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const activeIndex = getStepIndex(order.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Details Header */}
        <View style={styles.section}>
          <View style={styles.orderMetaRow}>
            <Text style={styles.metaLabel}>Order Reference:</Text>
            <Text style={styles.metaValue}>#TKS-{order.id}</Text>
          </View>
          <View style={styles.orderMetaRow}>
            <Text style={styles.metaLabel}>Placed On:</Text>
            <Text style={styles.metaValue}>{formattedDate}</Text>
          </View>
          <View style={styles.orderMetaRow}>
            <Text style={styles.metaLabel}>Payment Status:</Text>
            <Text style={[styles.metaValue, order.paymentStatus === 'paid' ? { color: COLORS.success } : { color: COLORS.secondary }]}>
              {order.paymentStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Status Timeline / Cancel banner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Status</Text>

          {order.status === 'cancelled' ? (
            <View style={styles.cancelledBanner}>
              <Ionicons name="close-circle" size={32} color={COLORS.error} />
              <View>
                <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                <Text style={styles.cancelledDesc}>This order was cancelled and items will not be delivered.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.timeline}>
              {renderTimelineStep(0, 'Order Placed', 'We have received your order request.', activeIndex)}
              {renderTimelineStep(
                1,
                order.status === 'packed' ? 'Order Packed' : 'Order Confirmed',
                order.status === 'packed' ? 'Tarun Kirana Store has packed your items.' : 'Tarun Kirana Store has confirmed your order.',
                activeIndex
              )}
              {renderTimelineStep(2, 'Out for Delivery', 'Our delivery agent is bringing your package.', activeIndex)}
              {renderTimelineStep(3, 'Delivered', 'Delivered safely at your doorstep.', activeIndex, true)}
            </View>
          )}

          {/* Cancellation button for Customer if status is pending */}
          {order.status === 'pending' && (
            <TouchableOpacity
              style={[styles.cancelOrderBtn, isCancelling && styles.disabledBtn]}
              onPress={handleCancelOrder}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.cancelOrderText}>Cancel Order</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Address Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {order.address ? (
            <View style={styles.addressBox}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              <View style={styles.addressInfo}>
                <Text style={[styles.addressLine, { fontWeight: '750' }]}>{order.address.fullName} ({order.address.mobile})</Text>
                <Text style={styles.addressLine}>{order.address.houseNumber}, {order.address.street}</Text>
                {order.address.landmark ? <Text style={[styles.addressLine, { fontStyle: 'italic', color: COLORS.textSecondary }]}>Landmark: {order.address.landmark}</Text> : null}
                <Text style={styles.addressCity}>{order.address.city}, {order.address.state} - {order.address.pincode}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.errorText}>No address details loaded.</Text>
          )}
        </View>

        {/* Items Summary Card */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          {order.items?.map(item => (
            <View style={styles.itemRow} key={item.id}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product?.name || 'Kirana Item'}</Text>
                <Text style={styles.itemMeta}>{item.quantity} x ₹{parseFloat(item.price).toFixed(2)} ({item.weight || item.product?.unit || 'pc'})</Text>
              </View>
              <Text style={styles.itemTotal}>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.priceSummaryRow}>
            <Text style={styles.priceSummaryLabel}>Subtotal</Text>
            <Text style={styles.priceSummaryValue}>₹{parseFloat(order.subtotal || 0).toFixed(2)}</Text>
          </View>
          {parseFloat(order.discount || 0) > 0 && (
            <View style={styles.priceSummaryRow}>
              <Text style={styles.priceSummaryLabel}>Coupon Discount ({order.couponCode})</Text>
              <Text style={[styles.priceSummaryValue, { color: COLORS.success, fontWeight: '650' }]}>
                -₹{parseFloat(order.discount).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.priceSummaryRow}>
            <Text style={styles.priceSummaryLabel}>Delivery Charges</Text>
            <Text style={[styles.priceSummaryValue, parseFloat(order.deliveryCharge || 0) === 0 && { color: COLORS.success, fontWeight: '700' }]}>
              {parseFloat(order.deliveryCharge || 0) === 0 ? 'FREE' : `₹${parseFloat(order.deliveryCharge).toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalBillRow}>
            <Text style={styles.totalBillLabel}>Grand Total</Text>
            <Text style={styles.totalBillValue}>₹{parseFloat(order.totalPrice).toFixed(2)}</Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '700'
  },
  scrollContent: {
    flex: 1
  },
  section: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '750',
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  metaLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEAEA',
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    gap: SPACING.md
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error
  },
  cancelledDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    paddingRight: SPACING.xl
  },
  timeline: {
    paddingLeft: SPACING.xs
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 60,
    gap: SPACING.md
  },
  timelineIndicatorWrapper: {
    alignItems: 'center',
    width: 24
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  completedDot: {
    backgroundColor: COLORS.primary
  },
  currentDot: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2
  },
  completedLine: {
    backgroundColor: COLORS.primary
  },
  timelineContent: {
    flex: 1,
    paddingBottom: SPACING.md
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  completedText: {
    color: COLORS.primaryDark
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  cancelOrderBtn: {
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md
  },
  cancelOrderText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700'
  },
  disabledBtn: {
    opacity: 0.7
  },
  addressBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    padding: SPACING.md,
    gap: SPACING.sm
  },
  addressInfo: {
    flex: 1
  },
  addressLine: {
    fontSize: 13,
    color: COLORS.text
  },
  addressCity: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text
  },
  itemMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md
  },
  totalBillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  totalBillLabel: {
    fontSize: 15,
    fontWeight: '750',
    color: COLORS.text
  },
  totalBillValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  priceSummaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  priceSummaryValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600'
  }
});
