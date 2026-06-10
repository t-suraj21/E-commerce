import React, { useContext,  useState, useEffect } from 'react';
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
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';

export default function OrderDetailsScreen({ route, navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

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
      console.log('Error fetching shop order details:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      const response = await apiClient.put(`/orders/${orderId}/status`, {
        status: newStatus
      });
      if (response.data.success) {
        Alert.alert('Status Updated', `Order status changed to ${newStatus.replace(/_/g, ' ')}`);
        fetchOrderDetails();
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#FFF3E0', text: '#E65100' };
      case 'confirmed': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'out_for_delivery': return { bg: '#E3F2FD', text: '#0D47A1' };
      case 'delivered': return { bg: '#E8F5E9', text: '#1B5E20' };
      case 'cancelled': return { bg: '#FFEBEE', text: '#C62828' };
      default: return { bg: theme.background, text: theme.text };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order details not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusBadge = getStatusBadgeColor(order.status);
  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Order Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Meta */}
        <View style={styles.section}>
          <View style={styles.metaRow}>
            <Text style={styles.orderId}>Order #TKS-{order.id}</Text>
            <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                {order.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>Placed On: {dateStr}</Text>
          <Text style={styles.orderDate}>Payment Method: {order.paymentMethod.toUpperCase()}</Text>
          <Text style={styles.orderDate}>Payment Status: {order.paymentStatus.toUpperCase()}</Text>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
            <Text style={styles.infoText}>{order.user?.name || 'Guest Customer'}</Text>
          </View>
          {order.user?.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.infoText}>{order.user.phone}</Text>
            </View>
          )}
          {order.user?.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
              <Text style={styles.infoText}>{order.user.email}</Text>
            </View>
          )}

          {/* Delivery Address Details */}
          {order.address && (
            <View style={[styles.infoRow, { alignItems: 'flex-start', marginTop: SPACING.sm }]}>
              <Ionicons name="location-outline" size={18} color={theme.textSecondary} style={{ marginTop: 2 }} />
              <View style={styles.addressBox}>
                <Text style={[styles.addressLine, { fontWeight: 'bold' }]}>{order.address.fullName || 'Recipient'}</Text>
                {order.address.mobile && <Text style={styles.addressLine}>Mobile: {order.address.mobile}</Text>}
                <Text style={styles.addressLine}>{order.address.houseNumber}, {order.address.street}</Text>
                {order.address.landmark && <Text style={styles.addressLine}>Landmark: {order.address.landmark}</Text>}
                <Text style={styles.addressCity}>{order.address.city}, {order.address.state} - {order.address.pincode}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Items Ordered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          {order.items?.map(item => (
            <View style={[styles.itemRow, { alignItems: 'center' }]} key={item.id}>
              <Text style={[styles.itemName, { flex: 2 }]} numberOfLines={2}>
                {item.product?.name || 'Kirana Item'}
              </Text>
              <Text style={[styles.itemMeta, { flex: 1, textAlign: 'center', marginTop: 0 }]}>
                {item.quantity} {item.product?.unit || 'pc'}
              </Text>
              <Text style={[styles.itemPrice, { flex: 1, textAlign: 'right' }]}>
                ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{parseFloat(order.totalPrice).toFixed(2)}</Text>
          </View>
        </View>

        {/* Update Status Buttons Block */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Process Order Status</Text>

          {isUpdating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : order.status === 'pending' ? (
            <View style={styles.actionsBlock}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleUpdateStatus('confirmed')}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.white} />
                <Text style={styles.actionBtnText}>Confirm Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => handleUpdateStatus('cancelled')}
              >
                <Ionicons name="close-circle-outline" size={18} color={theme.white} />
                <Text style={styles.actionBtnText}>Cancel Order</Text>
              </TouchableOpacity>
            </View>
          ) : order.status === 'confirmed' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deliveryBtn]}
              onPress={() => handleUpdateStatus('out_for_delivery')}
            >
              <Ionicons name="bicycle-outline" size={20} color={theme.white} />
              <Text style={styles.actionBtnText}>Mark Out for Delivery</Text>
            </TouchableOpacity>
          ) : order.status === 'out_for_delivery' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleUpdateStatus('delivered')}
            >
              <Ionicons name="gift-outline" size={20} color={theme.white} />
              <Text style={styles.actionBtnText}>Mark Delivered & Paid</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedAlert}>
              <Ionicons
                name={order.status === 'delivered' ? 'checkmark-circle' : 'close-circle'}
                size={22}
                color={order.status === 'delivered' ? theme.success : theme.error}
              />
              <Text style={styles.completedText}>
                Order status is finalized as <Text style={styles.bold}>{order.status.toUpperCase()}</Text>
              </Text>
            </View>
          )}
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
    color: theme.textSecondary,
    marginBottom: SPACING.md
  },
  backBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSm
  },
  backBtnText: {
    color: theme.white,
    fontWeight: '700'
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderId: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  orderDate: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '750',
    color: theme.text,
    marginBottom: SPACING.md
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: 4
  },
  infoText: {
    fontSize: 14,
    color: theme.text
  },
  addressBox: {
    flex: 1
  },
  addressLine: {
    fontSize: 13,
    color: theme.text
  },
  addressCity: {
    fontSize: 13,
    color: theme.textSecondary,
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
  itemDetails: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text
  },
  itemMeta: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: SPACING.md
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '750',
    color: theme.text
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.primaryDark
  },
  actionsBlock: {
    flexDirection: 'row',
    gap: SPACING.md
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd,
    gap: SPACING.xs,
    ...SHADOWS.sm
  },
  acceptBtn: {
    backgroundColor: theme.primary
  },
  cancelBtn: {
    backgroundColor: theme.error
  },
  deliveryBtn: {
    backgroundColor: '#1E88E5'
  },
  actionBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14
  },
  completedAlert: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    gap: SPACING.sm
  },
  completedText: {
    fontSize: 13,
    color: theme.textSecondary
  },
  bold: {
    fontWeight: '700'
  }
});
