import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import { LanguageContext } from '../../context/LanguageContext';
import { ThemeContext } from '../../context/ThemeContext';

export default function NotificationHistoryScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useContext(NotificationContext);
  
  const { locale } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
      return locale === 'en' ? 'Just now' : 'अभी';
    } else if (diffMin < 60) {
      return locale === 'en' ? `${diffMin}m ago` : `${diffMin} मिनट पहले`;
    } else if (diffHr < 24) {
      return locale === 'en' ? `${diffHr}h ago` : `${diffHr} घंटे पहले`;
    } else if (diffDays === 1) {
      return locale === 'en' ? 'Yesterday' : 'कल';
    } else {
      return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'hi-IN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.isRead;
    
    // Select icon and colors based on notification type
    let iconName = 'notifications-outline';
    let iconColor = theme.primary;
    let bgTint = `${theme.primary}12`;

    switch (item.type) {
      case 'order_placed':
      case 'order_accepted':
        iconName = 'cart-outline';
        iconColor = theme.primary;
        bgTint = `${theme.primary}15`;
        break;
      case 'order_packed':
      case 'order_shipped':
        iconName = 'gift-outline';
        iconColor = '#FF9100'; // Warning/Alert Orange
        bgTint = '#FF910015';
        break;
      case 'order_delivered':
        iconName = 'checkmark-circle-outline';
        iconColor = theme.success || '#00E676';
        bgTint = `${theme.success || '#00E676'}15`;
        break;
      case 'order_cancelled':
        iconName = 'close-circle-outline';
        iconColor = theme.error || '#FF1744';
        bgTint = `${theme.error || '#FF1744'}15`;
        break;
      case 'offer':
        iconName = 'pricetag-outline';
        iconColor = '#D500F9'; // Purple
        bgTint = '#D500F915';
        break;
      default:
        iconName = 'notifications-outline';
        iconColor = theme.secondary || '#2979FF';
        bgTint = `${theme.secondary || '#2979FF'}15`;
    }

    const handlePress = async () => {
      if (isUnread) {
        await markAsRead(item.id);
      }

      // Safe navigation check
      if (item.data) {
        let payload = item.data;
        if (typeof item.data === 'string') {
          try {
            payload = JSON.parse(item.data);
          } catch (e) {
            console.log('Error parsing notification data payload:', e);
          }
        }

        if (payload && payload.orderId) {
          const orderIdVal = parseInt(payload.orderId, 10);
          if (!isNaN(orderIdVal)) {
            if (user && user.role === 'admin') {
              navigation.navigate('OrderDetails', { orderId: orderIdVal });
            } else {
              navigation.navigate('OrderTracking', { orderId: orderIdVal });
            }
          }
        } else if (payload && payload.productId) {
          const productIdVal = parseInt(payload.productId, 10);
          if (!isNaN(productIdVal)) {
            navigation.navigate('ProductDetails', { productId: productIdVal });
          }
        }
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isUnread ? styles.unreadCard : styles.readCard
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: bgTint }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, isUnread && styles.unreadTitleText]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.cardBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.cardTime}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        {/* Spacer on left to center the title */}
        <View style={{ width: 80 }} />
        <Text style={styles.headerTitle}>
          {locale === 'en' ? 'Notifications' : 'सूचनाएं'}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>
              {locale === 'en' ? 'Read All' : 'सभी पढ़ें'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Main List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => `notif-${item.id}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchNotifications}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBg, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="notifications-off-outline" size={48} color={theme.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {locale === 'en' ? 'No Notifications Yet' : 'कोई सूचना नहीं है'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {locale === 'en'
                  ? 'We will notify you when something important happens.'
                  : 'कुछ महत्वपूर्ण होने पर हम आपको सूचित करेंगे।'}
              </Text>
            </View>
          )
        }
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    ...SHADOWS.sm
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
    flex: 1
  },
  readAllBtn: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  readAllText: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '700'
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: 40
  },
  card: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'flex-start',
    ...SHADOWS.sm
  },
  unreadCard: {
    backgroundColor: theme.surface,
    borderColor: `${theme.primary}40`,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary
  },
  readCard: {
    backgroundColor: theme.surface,
    opacity: 0.9
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md
  },
  cardContent: {
    flex: 1,
    gap: 4
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 14.5,
    color: theme.textSecondary,
    fontWeight: '600',
    flex: 1
  },
  unreadTitleText: {
    color: theme.text,
    fontWeight: '800'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
    marginLeft: SPACING.xs
  },
  cardBody: {
    fontSize: 12.5,
    color: theme.textSecondary,
    lineHeight: 18
  },
  cardTime: {
    fontSize: 10.5,
    color: theme.textLight,
    marginTop: 2,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: SPACING.xl
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: SIZES.radiusRound,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: SPACING.xs
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  }
});
