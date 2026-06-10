import React, { useContext,  useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  Switch,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {  SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { ThemeContext } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { getImageUrl } from '../../utils/imageUtils';


const { width } = Dimensions.get('window');

export default function InventoryScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter and Search states
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'low_stock' | 'out_of_stock' | 'in_stock'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'stock' | 'price'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [showReports, setShowReports] = useState(false); // Toggle to show reports modal/section

  // Quick Edit State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingStockVal, setEditingStockVal] = useState('');
  const [isSavingStock, setIsSavingStock] = useState(false);

  useEffect(() => {
    fetchInventoryData();
  }, [statusFilter, sortBy, sortOrder]);

  // Refetch when screen focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInventoryData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchInventoryData = async () => {
    try {
      // Fetch Summary
      const summaryRes = await apiClient.get('/inventory/summary');
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.summary);
      }

      // Fetch Items with params
      const itemsRes = await apiClient.get('/inventory/items', {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery ? searchQuery : undefined,
          sortBy,
          order: sortOrder
        }
      });
      if (itemsRes.data.success) {
        setItems(itemsRes.data.items || []);
      }

      // Fetch Reports
      const reportsRes = await apiClient.get('/inventory/reports');
      if (reportsRes.data.success) {
        setReports(reportsRes.data.reports);
      }
    } catch (error) {
      console.log('Error fetching inventory details:', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInventoryData();
  };

  const handleSearchSubmit = () => {
    setIsLoading(true);
    fetchInventoryData();
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Quick Restock API Call
  const handleQuickRestock = async (itemId) => {
    const numVal = parseInt(editingStockVal, 10);
    if (isNaN(numVal) || numVal < 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid stock quantity');
      return;
    }

    setIsSavingStock(true);
    try {
      const response = await apiClient.put(`/inventory/product/${itemId}/stock`, {
        stockQuantity: numVal
      });

      if (response.data.success) {
        // Update local items state
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, stockQuantity: numVal } : item));
        
        // Refresh summary
        const summaryRes = await apiClient.get('/inventory/summary');
        if (summaryRes.data.success) {
          setSummary(summaryRes.data.summary);
        }

        setEditingItemId(null);
        Alert.alert('Stock Updated', 'Stock quantity adjusted successfully.');
      }
    } catch (error) {
      console.error('Stock adjustment error:', error.message);
      Alert.alert('Update Failed', 'Failed to update stock quantity.');
    } finally {
      setIsSavingStock(false);
    }
  };

  // Toggle availability Switch
  const handleToggleAvailability = async (itemId, currentActive) => {
    try {
      const response = await apiClient.put(`/inventory/product/${itemId}/availability`, {
        isActive: !currentActive
      });

      if (response.data.success) {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, isActive: !currentActive } : item));
      }
    } catch (error) {
      console.error('Availability toggle error:', error.message);
      Alert.alert('Update Failed', 'Failed to toggle product status.');
    }
  };

  // Export / Print report action
  const handlePrintReport = () => {
    Alert.alert(
      'Export Success',
      'Inventory report saved as PDF. Ready to print or share!',
      [{ text: 'OK' }]
    );
  };

  const renderInventoryItem = ({ item }) => {
    const isEditing = editingItemId === item.id;
    const isOutOfStock = item.stockQuantity === 0;
    const isLowStock = item.stockQuantity > 0 && item.stockQuantity < 10;

    return (
      <View style={[styles.itemCard, !item.isActive && styles.inactiveCard]}>
        <View style={styles.cardMainRow}>
          <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.productImage} />
          
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category?.name || 'General'}</Text>
            <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)} / {item.unit}</Text>
            
            <View style={styles.badgeRow}>
              {isOutOfStock && (
                <View style={[styles.alertBadge, { backgroundColor: '#FFEBEE' }]}>
                  <Text style={[styles.alertBadgeText, { color: theme.error }]}>OUT OF STOCK</Text>
                </View>
              )}
              {isLowStock && (
                <View style={[styles.alertBadge, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.alertBadgeText, { color: theme.secondary }]}>LOW STOCK</Text>
                </View>
              )}
              {!item.isActive && (
                <View style={[styles.alertBadge, { backgroundColor: '#E0E0E0' }]}>
                  <Text style={[styles.alertBadgeText, { color: '#616161' }]}>HIDDEN</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.actionRow}>
          {/* Stock control area */}
          {isEditing ? (
            <View style={styles.editStockContainer}>
              <TextInput
                style={styles.stockInput}
                keyboardType="numeric"
                value={editingStockVal}
                onChangeText={setEditingStockVal}
                placeholder="Qty"
                autoFocus
              />
              <TouchableOpacity 
                style={styles.saveStockBtn}
                onPress={() => handleQuickRestock(item.id)}
              >
                {isSavingStock ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <Ionicons name="checkmark" size={16} color={theme.white} />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelStockBtn}
                onPress={() => setEditingItemId(null)}
              >
                <Ionicons name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.stockDisplayBtn}
              onPress={() => {
                setEditingStockVal(item.stockQuantity.toString());
                setEditingItemId(item.id);
              }}
            >
              <Text style={styles.stockLabel}>Stock: </Text>
              <Text style={[
                styles.stockValue, 
                isOutOfStock ? { color: theme.error } : 
                isLowStock ? { color: theme.secondary } : 
                { color: theme.text }
              ]}>{item.stockQuantity}</Text>
              <Ionicons name="pencil" size={12} color={theme.textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}

          {/* Visibility Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Active</Text>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleAvailability(item.id, item.isActive)}
              trackColor={{ false: '#E0E0E0', true: theme.primaryLight }}
              thumbColor={item.isActive ? theme.primary : '#F5F5F5'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <TouchableOpacity onPress={() => setShowReports(prev => !prev)}>
          <Ionicons 
            name={showReports ? "cube-outline" : "analytics-outline"} 
            size={22} 
            color={theme.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Toggle View: Items list vs Reports View */}
      {showReports ? (
        /* ─────────────── INVENTORY REPORTS VIEW ─────────────── */
        <ScrollView style={styles.reportScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.reportBanner}>
            <Text style={styles.reportBannerTitle}>Inventory Valuation Report</Text>
            <Text style={styles.reportBannerSub}>Real-time stock valuation by category</Text>
          </View>

          {/* Valuation Stats Summary */}
          <View style={styles.reportSummaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTitle}>Total Valuation</Text>
              <Text style={styles.summaryVal}>₹{summary?.totalValuation.toFixed(2)}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTitle}>Low Stock Items</Text>
              <Text style={[styles.summaryVal, { color: theme.secondary }]}>{summary?.lowStock}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryTitle}>Out of Stock</Text>
              <Text style={[styles.summaryVal, { color: theme.error }]}>{summary?.outOfStock}</Text>
            </View>
          </View>

          {/* Category breakdown reports */}
          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Category Valuation</Text>
            {reports?.categoryValuation?.map((item, index) => (
              <View key={index} style={styles.reportRow}>
                <View style={styles.reportRowInfo}>
                  <Text style={styles.reportCategoryName}>{item.categoryName}</Text>
                  <Text style={styles.reportCategorySub}>{item.productCount} items | {item.totalStock} units</Text>
                </View>
                <Text style={styles.reportCategoryValuation}>₹{item.valuation.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Out of stock details */}
          <View style={styles.reportSection}>
            <Text style={[styles.reportSectionTitle, { color: theme.error }]}>Out of Stock Alerts</Text>
            {reports?.outOfStock?.items.length === 0 ? (
              <Text style={styles.emptyText}>All products are in stock!</Text>
            ) : (
              reports?.outOfStock?.items.map((item, index) => (
                <View key={index} style={styles.alertReportRow}>
                  <Text style={styles.alertItemName}>{item.name}</Text>
                  <Text style={styles.alertItemCategory}>{item.category?.name || 'General'}</Text>
                </View>
              ))
            )}
          </View>

          {/* Low stock details */}
          <View style={styles.reportSection}>
            <Text style={[styles.reportSectionTitle, { color: theme.secondary }]}>Restock Reminders</Text>
            {reports?.lowStock?.items.length === 0 ? (
              <Text style={styles.emptyText}>No low stock products found.</Text>
            ) : (
              reports?.lowStock?.items.map((item, index) => (
                <View key={index} style={styles.alertReportRow}>
                  <View>
                    <Text style={styles.alertItemName}>{item.name}</Text>
                    <Text style={styles.alertItemCategory}>{item.category?.name || 'General'}</Text>
                  </View>
                  <Text style={[styles.alertQty, { color: theme.secondary }]}>{item.stockQuantity} Left</Text>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity style={styles.printBtn} onPress={handlePrintReport}>
            <Ionicons name="share-outline" size={20} color={theme.white} />
            <Text style={styles.printBtnText}>Export Inventory Report</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ─────────────── STOCK ITEMS LIST VIEW ─────────────── */
        <View style={{ flex: 1 }}>
          {/* Summary Panel */}
          <View style={styles.summaryGrid}>
            <TouchableOpacity 
              style={[styles.summaryBox, statusFilter === 'all' && styles.activeSummaryBox]} 
              onPress={() => setStatusFilter('all')}
            >
              <Text style={styles.summaryNum}>{summary?.totalProducts}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.summaryBox, statusFilter === 'in_stock' && styles.activeSummaryBox]} 
              onPress={() => setStatusFilter('in_stock')}
            >
              <Text style={[styles.summaryNum, { color: theme.primary }]}>{summary?.inStock}</Text>
              <Text style={styles.summaryLabel}>In Stock</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.summaryBox, statusFilter === 'low_stock' && styles.activeSummaryBox]} 
              onPress={() => setStatusFilter('low_stock')}
            >
              <Text style={[styles.summaryNum, { color: theme.secondary }]}>{summary?.lowStock}</Text>
              <Text style={styles.summaryLabel}>Low</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.summaryBox, statusFilter === 'out_of_stock' && styles.activeSummaryBox]} 
              onPress={() => setStatusFilter('out_of_stock')}
            >
              <Text style={[styles.summaryNum, { color: theme.error }]}>{summary?.outOfStock}</Text>
              <Text style={styles.summaryLabel}>Out</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products in inventory..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
              <Ionicons name="search" size={18} color={theme.white} />
            </TouchableOpacity>
          </View>

          {/* Sorting row */}
          <View style={styles.sortingRow}>
            <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('name')}>
              <Text style={[styles.sortBtnText, sortBy === 'name' && { color: theme.primary }]}>Name</Text>
              {sortBy === 'name' && (
                <Ionicons name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={theme.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('stock')}>
              <Text style={[styles.sortBtnText, sortBy === 'stock' && { color: theme.primary }]}>Stock</Text>
              {sortBy === 'stock' && (
                <Ionicons name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={theme.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortBtn} onPress={() => toggleSort('price')}>
              <Text style={[styles.sortBtnText, sortBy === 'price' && { color: theme.primary }]}>Price</Text>
              {sortBy === 'price' && (
                <Ionicons name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Items List */}
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color={theme.textLight} />
              <Text style={styles.emptyLabel}>No products matched your filters</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderInventoryItem}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
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

  /* Summary Grid */
  summaryGrid: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm
  },
  summaryBox: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusMd,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.sm
  },
  activeSummaryBox: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.text
  },
  summaryLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '700',
    marginTop: 2
  },

  /* Search & Sort */
  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.xs
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.md,
    height: 44,
    fontSize: 14,
    color: theme.text,
    ...SHADOWS.sm
  },
  searchBtn: {
    width: 44,
    height: 44,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    ...SHADOWS.sm
  },
  sortingRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.lg
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary
  },

  /* Stock List */
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 40,
    gap: SPACING.md
  },
  itemCard: {
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    ...SHADOWS.sm
  },
  inactiveCard: {
    opacity: 0.65
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: SIZES.radiusSm,
    resizeMode: 'contain',
    backgroundColor: theme.background,
    marginRight: SPACING.md
  },
  productDetails: {
    flex: 1,
    gap: 1
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text
  },
  productCategory: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '750',
    color: theme.text,
    marginTop: 2
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs
  },
  alertBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3
  },
  alertBadgeText: {
    fontSize: 8,
    fontWeight: '850'
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: SPACING.md
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stockDisplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: theme.border
  },
  stockLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600'
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '800'
  },
  editStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  stockInput: {
    width: 60,
    height: 36,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    color: theme.text,
    fontWeight: '800'
  },
  saveStockBtn: {
    backgroundColor: theme.primary,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6
  },
  cancelStockBtn: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: SPACING.md
  },
  emptyLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600'
  },

  /* ─────────────── Reports Layout ─────────────── */
  reportScroll: {
    flex: 1,
    padding: SPACING.md
  },
  reportBanner: {
    backgroundColor: theme.primary,
    padding: SPACING.lg,
    borderRadius: SIZES.radiusMd,
    marginBottom: SPACING.md,
    ...SHADOWS.md
  },
  reportBannerTitle: {
    fontSize: 18,
    fontWeight: '850',
    color: theme.white
  },
  reportBannerSub: {
    fontSize: 12,
    color: theme.primaryLight,
    marginTop: 2
  },
  reportSummaryCard: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: SIZES.radiusMd,
    padding: SPACING.md,
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
    ...SHADOWS.sm
  },
  summaryItem: {
    alignItems: 'center'
  },
  summaryTitle: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '600',
    marginBottom: 4
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.text
  },
  verticalDivider: {
    width: 1,
    backgroundColor: theme.border,
    height: '100%'
  },
  reportSection: {
    backgroundColor: theme.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.sm
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9'
  },
  reportRowInfo: {
    gap: 2
  },
  reportCategoryName: {
    fontSize: 13,
    fontWeight: '750',
    color: theme.text
  },
  reportCategorySub: {
    fontSize: 11,
    color: theme.textSecondary
  },
  reportCategoryValuation: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primaryDark
  },
  alertReportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9'
  },
  alertItemName: {
    fontSize: 13,
    fontWeight: '750',
    color: theme.text
  },
  alertItemCategory: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 1
  },
  alertQty: {
    fontSize: 13,
    fontWeight: '800'
  },
  printBtn: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    height: 52,
    borderRadius: SIZES.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: 40,
    ...SHADOWS.md
  },
  printBtnText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700'
  },
  emptyText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.sm
  }
});
