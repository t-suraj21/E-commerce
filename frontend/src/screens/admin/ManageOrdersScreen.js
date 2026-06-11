import React, { useContext,  useState, useEffect } from 'react';
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
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';

export default function ManageOrdersScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all'); // all, pending, accepted, packed, out_for_delivery, delivered, cancelled
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
    setIsLoading(true);
    try {
      const response = await apiClient.get('/orders');
      if (response.data.success) {
        const list = response.data.orders || [];
        setOrders(list);
        applyFilter(list, selectedStatus);
      }
    } catch (error) {
      console.log('Error fetching shop orders:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (list, status) => {
    setSelectedStatus(status);
    if (status === 'all') {
      setFilteredOrders(list);
    } else {
      setFilteredOrders(list.filter(ord => ord.status === status));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#FFF3E0', text: '#E65100' };
      case 'confirmed':
      case 'accepted': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'packed': return { bg: '#F3E5F5', text: '#7B1FA2' };
      case 'out_for_delivery': return { bg: '#E3F2FD', text: '#0D47A1' };
      case 'delivered': return { bg: '#E8F5E9', text: '#1B5E20' };
      case 'cancelled': return { bg: '#FFEBEE', text: '#C62828' };
      default: return { bg: theme.background, text: theme.text };
    }
  };

  const renderStatusTab = (statusKey, label) => (
    <TouchableOpacity
      style={[
        styles.tab,
        selectedStatus === statusKey && styles.activeTab
      ]}
      onPress={() => applyFilter(orders, statusKey)}
    >
      <Text
        style={[
          styles.tabText,
          selectedStatus === statusKey && styles.activeTabText
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderCard = ({ item }) => {
    const statusStyle = getStatusColor(item.status);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsSummary = item.items
      ?.map(el => `${el.product?.name || 'Item'} x${el.quantity}`)
      .join(', ');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Order #TKS-{item.id}</Text>
            <Text style={styles.orderDate}>{dateStr}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.customerName}>
            👤 Customer: <Text style={styles.bold}>{item.user?.name || 'Guest'}</Text>
          </Text>
          <Text style={styles.itemsSummary} numberOfLines={1}>
            📦 Items: {itemsSummary}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Total Revenue:</Text>
          <Text style={styles.totalValue}>₹{parseFloat(item.totalPrice).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Orders Pipeline</Text>
        <Text style={styles.subtitle}>Update Delivery Statuses & Manage Sales</Text>
      </View>

      {/* Filter Tabs Horizontal Scroller */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          data={[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'packed', label: 'Packed' },
            { key: 'out_for_delivery', label: 'Out for Delivery' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'cancelled', label: 'Cancelled' }
          ]}
          renderItem={({ item }) => renderStatusTab(item.key, item.label)}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsList}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={64} color={theme.textLight} />
          <Text style={styles.emptyText}>No orders in this status</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  tabsContainer: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: SPACING.sm
  },
  tabsList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.background
  },
  activeTab: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  activeTabText: {
    color: theme.white
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
    fontSize: 15,
    color: theme.textSecondary,
    marginTop: SPACING.sm
  },
  listContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 40
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    ...SHADOWS.sm
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text
  },
  orderDate: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800'
  },
  cardBody: {
    marginVertical: SPACING.md,
    gap: 4
  },
  customerName: {
    fontSize: 13,
    color: theme.text
  },
  itemsSummary: {
    fontSize: 12,
    color: theme.textSecondary
  },
  bold: {
    fontWeight: '700'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: SPACING.sm,
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 12,
    color: theme.textSecondary
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.primaryDark
  }
});
