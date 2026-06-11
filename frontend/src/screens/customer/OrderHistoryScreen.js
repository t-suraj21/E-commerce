import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';

export default function OrderHistoryScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh orders when focus returns
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/orders');
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.log('Error fetching order history:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return { bg: '#FFF3E0', text: '#E65100', icon: 'time-outline' };
      case 'confirmed':
      case 'accepted':
        return { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle-outline' };
      case 'packed':
        return { bg: '#F3E5F5', text: '#7B1FA2', icon: 'cube-outline' };
      case 'out_for_delivery':
        return { bg: '#E3F2FD', text: '#0D47A1', icon: 'bicycle-outline' };
      case 'delivered':
        return { bg: '#E8F5E9', text: '#1B5E20', icon: 'gift-outline' };
      case 'cancelled':
        return { bg: '#FFEBEE', text: '#C62828', icon: 'close-circle-outline' };
      default:
        return { bg: COLORS.background, text: COLORS.text, icon: 'help-circle-outline' };
    }
  };

  const renderOrderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsSummary = item.items
      ?.map(el => `${el.product?.name || 'Item'} (${el.quantity} x ${el.weight || el.product?.unit || ''})`)
      .join(', ');

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Order #TKS-{item.id}</Text>
            <Text style={styles.orderDate}>{dateStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} style={styles.badgeIcon} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.itemsPreview} numberOfLines={2}>
            {itemsSummary}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>₹{parseFloat(item.totalPrice).toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.trackLink}
            onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
          >
            <Text style={styles.trackLinkText}>Track</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={72} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No orders placed yet</Text>
          <Text style={styles.emptySubText}>When you place orders, they will show up here.</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
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
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl
  },
  shopBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: SIZES.radiusMd
  },
  shopBtnText: {
    color: COLORS.white,
    fontWeight: '700'
  },
  listContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 40
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.sm
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm
  },
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  badgeIcon: {
    marginRight: 4
  },
  statusText: {
    fontSize: 10,
    fontWeight: '750'
  },
  cardBody: {
    marginVertical: SPACING.xs
  },
  itemsPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text
  },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  trackLinkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700'
  }
});
