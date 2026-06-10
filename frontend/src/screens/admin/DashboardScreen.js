import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Chart tab state: 'daily' | 'weekly' | 'monthly'
  const [chartTab, setChartTab] = useState('daily');
  
  // Detailed report tab state: 'category' | 'payments' | 'lowStock'
  const [reportTab, setReportTab] = useState('category');

  const { t, locale } = useContext(LanguageContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const styles = getStyles(theme);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStats();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.log('Error fetching dashboard stats:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Helper to render metric cards
  const renderMetricCard = (icon, title, value, color, subtitle = '') => (
    <View style={styles.metricCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.metricDetails}>
        <Text style={styles.metricLabel}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  // Modern Horizontal Bar Chart Render Function
  const renderSalesChart = () => {
    const chartData = (stats.charts && stats.charts[chartTab]) || [];
    if (chartData.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyText}>No sales data available for this range.</Text>
        </View>
      );
    }

    const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 100) : 100;

    return (
      <View style={styles.horizontalChartContainer}>
        {chartData.map((item, index) => {
          const isZero = item.value === 0;
          const widthPercent = isZero ? 0 : Math.max((item.value / maxVal) * 100, 2);

          return (
            <View key={index} style={styles.horizontalBarRow}>
              {/* Left Side: Date/Label */}
              <View style={styles.horizontalBarLabelCol}>
                <Text style={styles.horizontalBarLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.horizontalBarSubLabel}>
                  {item.count} {item.count === 1 ? 'order' : 'orders'}
                </Text>
              </View>

              {/* Right Side: Bar & Value */}
              <View style={styles.horizontalBarTrackArea}>
                <View style={styles.horizontalBarTrack}>
                  <View 
                    style={[
                      styles.horizontalBarFill, 
                      { 
                        width: `${widthPercent}%`, 
                        backgroundColor: theme.primary,
                        opacity: isZero ? 0 : 1
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.horizontalBarValue, isZero && { color: theme.textLight }]}>
                  ₹{item.value.toFixed(0)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Render Details Tab Content
  const renderDetailsTabContent = () => {
    if (reportTab === 'category') {
      const catSales = stats.categorySales || [];
      if (catSales.length === 0) return <Text style={styles.emptyText}>No category sales reported.</Text>;
      
      const maxCategoryRevenue = Math.max(...catSales.map(c => c.revenue), 1);

      return (
        <View style={styles.detailsList}>
          {catSales.map((item, idx) => {
            const widthPercent = (item.revenue / maxCategoryRevenue) * 100;
            return (
              <View key={idx} style={styles.reportRow}>
                <View style={styles.reportRowHeader}>
                  <Text style={styles.reportRowTitle}>{item.category}</Text>
                  <Text style={styles.reportRowVal}>₹{item.revenue.toFixed(0)} <Text style={styles.unitsText}>({item.unitsSold} sold)</Text></Text>
                </View>
                <View style={styles.reportProgressBarTrack}>
                  <View style={[styles.reportProgressBarFill, { width: `${widthPercent}%`, backgroundColor: theme.primary }]} />
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (reportTab === 'payments') {
      const payStats = stats.paymentStats || [];
      if (payStats.length === 0) return <Text style={styles.emptyText}>No payment statistics found.</Text>;

      const totalPaymentsCount = payStats.reduce((sum, item) => sum + item.count, 0);

      return (
        <View style={styles.detailsList}>
          {payStats.map((item, idx) => {
            const percentage = totalPaymentsCount > 0 ? ((item.count / totalPaymentsCount) * 100).toFixed(0) : 0;
            return (
              <View key={idx} style={styles.paymentRow}>
                <View style={styles.paymentRowLeft}>
                  <Ionicons 
                    name={item.paymentMethod === 'cod' ? 'cash-outline' : 'card-outline'} 
                    size={18} 
                    color={theme.primary} 
                  />
                  <Text style={styles.paymentMethodName}>{item.paymentMethod.toUpperCase()}</Text>
                </View>
                <View style={styles.paymentRowRight}>
                  <Text style={styles.paymentRevenue}>₹{parseFloat(item.revenue).toFixed(0)}</Text>
                  <Text style={styles.paymentCount}>{item.count} orders ({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (reportTab === 'lowStock') {
      const lowStockList = stats.lowStockItems || [];
      if (lowStockList.length === 0) {
        return (
          <View style={styles.inStockBanner}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            <Text style={styles.inStockText}>All products are sufficiently stocked!</Text>
          </View>
        );
      }

      return (
        <View style={styles.detailsList}>
          {lowStockList.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.lowStockRow}
              onPress={() => navigation.navigate('InventoryManager', { screen: 'InventoryList', params: { search: item.name } })}
            >
              <View style={styles.lowStockLeft}>
                <Text style={styles.lowStockName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.lowStockUnit}>{item.unit}</Text>
              </View>
              <View style={[styles.lowStockBadge, { backgroundColor: item.stockQuantity === 0 ? '#FFEAEA' : '#FFF3E0' }]}>
                <Text style={[styles.lowStockBadgeText, { color: item.stockQuantity === 0 ? theme.error : theme.secondary }]}>
                  {item.stockQuantity === 0 ? 'Out of Stock' : `${item.stockQuantity} Left`}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'confirmed':
        return styles.statusConfirmed;
      case 'delivered':
        return styles.statusDelivered;
      default:
        return styles.statusOther;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{locale === 'en' ? 'Sales Dashboard' : 'बिक्री डैशबोर्ड'}</Text>
        <Text style={styles.headerSubtitle}>Tarun Kirana Store Business Intelligence</Text>
      </View>

      {/* Metric Cards Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          {renderMetricCard(
            'wallet-outline', 
            locale === 'en' ? 'Total Sales' : 'कुल बिक्री', 
            `₹${(stats.kpis?.totalSales || 0).toFixed(0)}`, 
            theme.primary,
            `AOV: ₹${(stats.kpis?.averageOrderValue || 0).toFixed(0)}`
          )}
          {renderMetricCard(
            'cart-outline', 
            locale === 'en' ? 'Total Orders' : 'कुल ऑर्डर्स', 
            stats.kpis?.totalOrders || 0, 
            theme.secondary,
            `${stats.kpis?.pendingOrders || 0} pending`
          )}
        </View>
        <View style={styles.metricsRow}>
          {renderMetricCard(
            'people-outline', 
            locale === 'en' ? 'Customers' : 'ग्राहक संख्या', 
            stats.kpis?.totalCustomers || 0, 
            '#00B0FF'
          )}
          {renderMetricCard(
            'warning-outline', 
            locale === 'en' ? 'Low Stock Alerts' : 'कम स्टॉक अलर्ट', 
            stats.kpis?.lowStockCount || 0, 
            theme.error,
            `${stats.kpis?.outOfStockCount || 0} out of stock`
          )}
        </View>
      </View>

      {/* Chart Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{locale === 'en' ? 'Sales Analytics' : 'बिक्री विश्लेषण'}</Text>
          {/* Chart Filter Tabs */}
          <View style={styles.tabsRow}>
            {['daily', 'weekly', 'monthly'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, chartTab === tab && styles.activeTabBtn]}
                onPress={() => setChartTab(tab)}
              >
                <Text style={[styles.tabBtnText, chartTab === tab && styles.activeTabBtnText]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderSalesChart()}
      </View>

      {/* Detailed Reports Section */}
      <View style={styles.section}>
        <View style={styles.reportTabSelector}>
          <TouchableOpacity 
            style={[styles.reportSelectorBtn, reportTab === 'category' && styles.activeReportSelectorBtn]}
            onPress={() => setReportTab('category')}
          >
            <Text style={[styles.reportSelectorText, reportTab === 'category' && styles.activeReportSelectorText]}>
              Categories
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.reportSelectorBtn, reportTab === 'payments' && styles.activeReportSelectorBtn]}
            onPress={() => setReportTab('payments')}
          >
            <Text style={[styles.reportSelectorText, reportTab === 'payments' && styles.activeReportSelectorText]}>
              Payments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.reportSelectorBtn, reportTab === 'lowStock' && styles.activeReportSelectorBtn]}
            onPress={() => setReportTab('lowStock')}
          >
            <Text style={[styles.reportSelectorText, reportTab === 'lowStock' && styles.activeReportSelectorText]}>
              Stock Alerts
            </Text>
          </TouchableOpacity>
        </View>

        {renderDetailsTabContent()}
      </View>

      {/* Recent Orders Section */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <Text style={styles.sectionTitle}>{locale === 'en' ? 'Recent Orders' : 'हाल के ऑर्डर्स'}</Text>
        {(stats.recentOrders || []).length === 0 ? (
          <Text style={styles.emptyText}>No recent orders found.</Text>
        ) : (
          <View style={styles.ordersList}>
            {(stats.recentOrders || []).map((order) => {
              const statusStyle = getStatusStyle(order.status);
              return (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderId}>#TKS-{order.id}</Text>
                    <Text style={styles.customerName}>{order.user?.name || 'Walk-in Customer'}</Text>
                    <Text style={styles.orderTimeText}>{new Date(order.createdAt).toLocaleTimeString()}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderPrice}>₹{parseFloat(order.totalPrice).toFixed(0)}</Text>
                    <View style={[styles.statusChip, { backgroundColor: statusStyle.backgroundColor }]}>
                      <Text style={[styles.statusChipText, { color: statusStyle.color }]}>
                        {order.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    ...SHADOWS.sm
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  metricsGrid: {
    padding: SPACING.lg,
    gap: SPACING.md
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.sm
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center'
  },
  metricDetails: {
    flex: 1,
    gap: 1
  },
  metricLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '650'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.text
  },
  metricSubtitle: {
    fontSize: 10,
    color: theme.textLight,
    fontWeight: '500'
  },
  section: {
    backgroundColor: theme.surface,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    marginTop: SPACING.md,
    ...SHADOWS.sm
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
    marginBottom: SPACING.sm
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: SIZES.radiusSm,
    padding: 2,
    borderWidth: 1,
    borderColor: theme.border
  },
  tabBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  activeTabBtn: {
    backgroundColor: theme.primary
  },
  tabBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.textSecondary
  },
  activeTabBtnText: {
    color: '#FFFFFF'
  },
  horizontalChartContainer: {
    marginTop: SPACING.md,
    gap: SPACING.md
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  horizontalBarLabelCol: {
    width: 65
  },
  horizontalBarLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.text
  },
  horizontalBarSubLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: '600'
  },
  horizontalBarTrackArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm
  },
  horizontalBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: theme.border,
    borderRadius: 6,
    overflow: 'hidden'
  },
  horizontalBarFill: {
    height: '100%',
    borderRadius: 6
  },
  horizontalBarValue: {
    width: 55,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    color: theme.text,
    marginLeft: SPACING.xs
  },
  emptyChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center'
  },
  reportTabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: theme.border,
    marginBottom: SPACING.md
  },
  reportSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeReportSelectorBtn: {
    borderBottomColor: theme.primary
  },
  reportSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary
  },
  activeReportSelectorText: {
    color: theme.primary
  },
  detailsList: {
    gap: SPACING.sm
  },
  reportRow: {
    marginBottom: SPACING.sm
  },
  reportRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs
  },
  reportRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  reportRowVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.text
  },
  unitsText: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '555'
  },
  reportProgressBarTrack: {
    height: 6,
    backgroundColor: theme.background,
    borderRadius: 3,
    overflow: 'hidden'
  },
  reportProgressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  paymentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  paymentRowRight: {
    alignItems: 'flex-end',
    gap: 2
  },
  paymentRevenue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: theme.text
  },
  paymentCount: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  inStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight,
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    gap: SPACING.sm,
    justifyContent: 'center',
    marginVertical: SPACING.md
  },
  inStockText: {
    fontSize: 13,
    fontWeight: '750',
    color: theme.primary
  },
  lowStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  lowStockLeft: {
    flex: 1,
    gap: 1
  },
  lowStockName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text
  },
  lowStockUnit: {
    fontSize: 11,
    color: theme.textSecondary
  },
  lowStockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm
  },
  lowStockBadgeText: {
    fontSize: 10,
    fontWeight: '750'
  },
  ordersList: {
    marginTop: SPACING.sm
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  orderLeft: {
    gap: 2
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  orderId: {
    fontSize: 14,
    fontWeight: '850',
    color: theme.text
  },
  customerName: {
    fontSize: 12,
    color: theme.textSecondary
  },
  orderTimeText: {
    fontSize: 10,
    color: theme.textLight,
    fontWeight: '600'
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '800'
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#E65100'
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32'
  },
  statusDelivered: {
    backgroundColor: '#E8F5E9',
    color: '#1B5E20'
  },
  statusOther: {
    backgroundColor: '#ECEFF1',
    color: '#546E7A'
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    padding: SPACING.md
  }
});
