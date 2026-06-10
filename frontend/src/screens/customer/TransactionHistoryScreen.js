import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';

export default function TransactionHistoryScreen({ navigation }) {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Refresh when focus returns
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchTransactions = async () => {
    try {
      const response = await apiClient.get('/payments/history');
      if (response.data.success) {
        setPayments(response.data.payments || []);
      }
    } catch (error) {
      console.log('Error fetching transaction history:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransactions();
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Transaction ID copied to clipboard');
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'success':
        return { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle' };
      case 'failed':
        return { bg: '#FFEBEE', text: '#D32F2F', icon: 'close-circle' };
      case 'pending':
        return { bg: '#FFF3E0', text: '#EF6C00', icon: 'time-outline' };
      default:
        return { bg: COLORS.background, text: COLORS.text, icon: 'help-circle' };
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cod':
        return { icon: 'cash-outline', color: '#43A047' };
      case 'upi':
        return { icon: 'logo-google', color: '#0F9D58' };
      case 'razorpay':
        return { icon: 'wallet-outline', color: '#0029FF' };
      case 'debit_card':
      case 'credit_card':
        return { icon: 'card-outline', color: '#1E88E5' };
      default:
        return { icon: 'receipt-outline', color: COLORS.textSecondary };
    }
  };

  const renderTransactionItem = ({ item }) => {
    // If the payment record is stuck on pending but the order was delivered (e.g. older COD orders), display it as success
    const effectiveStatus = (item.status === 'pending' && item.order?.status === 'delivered') ? 'success' : item.status;
    const statusStyle = getStatusStyle(effectiveStatus);
    const methodStyle = getMethodIcon(item.method);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.methodRow}>
            <View style={[styles.iconBox, { backgroundColor: methodStyle.color + '10' }]}>
              <Ionicons name={methodStyle.icon} size={20} color={methodStyle.color} />
            </View>
            <View>
              <Text style={styles.methodName}>
                {item.method === 'cod' ? 'Cash On Delivery' : item.method.toUpperCase().replace('_', ' ')}
              </Text>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {effectiveStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.txnIdRow}>
            <Text style={styles.txnIdLabel}>Txn ID: </Text>
            <Text style={styles.txnIdValue} numberOfLines={1}>{item.transactionId || 'N/A'}</Text>
            {item.transactionId && (
              <TouchableOpacity onPress={() => copyToClipboard(item.transactionId)}>
                <Ionicons name="copy-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
          </View>
          {item.status === 'failed' && item.failureReason && (
            <Text style={styles.failureReason}>{item.failureReason}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>₹{parseFloat(item.amount).toFixed(2)}</Text>
          </View>
          {item.orderId && (
            <TouchableOpacity 
              style={styles.orderLink}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.orderId })}
            >
              <Text style={styles.orderLinkLabel}>View Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={72} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No transactions found</Text>
          <Text style={styles.emptySubText}>All your payments and refunds will appear here.</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.shopBtnText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderTransactionItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
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
    padding: SPACING.md,
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
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  methodName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800'
  },
  cardBody: {
    marginVertical: SPACING.sm,
    gap: 4
  },
  txnIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  txnIdLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  txnIdValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: 200
  },
  failureReason: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs
  },
  priceContainer: {
    gap: 2
  },
  amountLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primaryDark
  },
  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  orderLinkLabel: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '800'
  }
});
