import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import apiClient from '../../api/client';
import { CartContext } from '../../context/CartContext';
import { analytics } from '../../utils/firebase';

const { width } = Dimensions.get('window');

export default function PaymentScreen({ route, navigation }) {
  const { addressId, couponCode, amount } = route.params || {};
  const { fetchCart } = useContext(CartContext);

  const [paymentMethod, setPaymentMethod] = useState('upi'); // default UPI
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  // Form states
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  // UI screens: 'selection', 'processing', 'success', 'failure'
  const [paymentState, setPaymentState] = useState('selection');
  const [failureMessage, setFailureMessage] = useState('');

  // Choose payment method handler
  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
  };

  // Pre-fill UPI handles
  const handleUpiHandleClick = (suffix) => {
    setUpiId(prev => {
      const main = prev.split('@')[0];
      return (main || 'customer') + suffix;
    });
  };

  // Place order first (in pending status) and then verify payment
  const handleProcessPayment = async () => {
    // Validate inputs
    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., name@upi)');
      return;
    }
    if ((paymentMethod === 'debit_card' || paymentMethod === 'credit_card')) {
      if (cardNumber.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
        Alert.alert('Invalid Card Details', 'Please complete the card details.');
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Create the order
      const response = await apiClient.post('/orders', {
        addressId,
        paymentMethod,
        couponCode
      });

      if (response.data.success) {
        const { order, initialPayment } = response.data;
        setOrderCreated(order);
        setCurrentPayment(initialPayment);
        
        await analytics().logEvent('order_placed', {
          transaction_id: order.id.toString(),
          value: amount,
          currency: 'INR'
        });
        
        // Clear local cart
        await fetchCart();

        if (paymentMethod === 'cod') {
          // COD orders auto-confirm and don't need simulated validation
          setPaymentState('success');
          await analytics().logEvent('payment_success', {
            transaction_id: initialPayment.id.toString(),
            value: amount,
            currency: 'INR'
          });
        } else {
          // Start simulated online processing flow
          setPaymentState('processing');
          simulateOnlinePayment(initialPayment.id);
        }
      }
    } catch (error) {
      console.error('Create order error during payment:', error.response?.data || error.message);
      Alert.alert('Order Failed', error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate verification delay
  const simulateOnlinePayment = (paymentId) => {
    setTimeout(async () => {
      try {
        // Simple mock rules:
        // Cards starting with '4000' or UPIs with 'fail@' will fail to show failure scenario
        let simulatedSuccess = true;
        let reason = 'Transaction approved';

        if (paymentMethod === 'upi' && upiId.startsWith('fail')) {
          simulatedSuccess = false;
          reason = 'Simulated UPI payment request timed out or was rejected by user';
        } else if ((paymentMethod === 'debit_card' || paymentMethod === 'credit_card') && cardNumber.startsWith('4000')) {
          simulatedSuccess = false;
          reason = 'Card declined: Insufficient funds or invalid CVV';
        }

        const verifyResponse = await apiClient.post('/payments/verify', {
          paymentId,
          status: simulatedSuccess ? 'success' : 'failed',
          failureReason: simulatedSuccess ? '' : reason
        });

        if (verifyResponse.data.success && simulatedSuccess) {
          setPaymentState('success');
          await analytics().logEvent('payment_success', {
            transaction_id: paymentId.toString(),
            value: amount,
            currency: 'INR'
          });
        } else {
          setFailureMessage(reason);
          setPaymentState('failure');
        }
      } catch (error) {
        console.error('Verify payment error:', error);
        setFailureMessage('Network timeout verifying transaction.');
        setPaymentState('failure');
      }
    }, 2500);
  };

  // Retry failed payment handler
  const handleRetryPayment = async (newMethod) => {
    if (!orderCreated) return;
    
    // Update local selection for retry
    setPaymentMethod(newMethod);

    // Basic input check for newMethod
    if (newMethod === 'upi' && !upiId.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID');
      return;
    }
    if ((newMethod === 'debit_card' || newMethod === 'credit_card') && (cardNumber.length < 16 || cardExpiry.length < 5)) {
      Alert.alert('Invalid Card Details', 'Please enter card details to retry.');
      return;
    }

    setLoading(true);
    setPaymentState('selection'); // Go back to show loading inside Selection screen
    
    try {
      const retryResponse = await apiClient.post('/payments/retry', {
        orderId: orderCreated.id,
        method: newMethod
      });

      if (retryResponse.data.success) {
        const { payment } = retryResponse.data;
        setCurrentPayment(payment);

        if (newMethod === 'cod') {
          // COD goes straight to success
          await apiClient.post('/payments/verify', {
            paymentId: payment.id,
            status: 'success'
          });
          setPaymentState('success');
          await analytics().logEvent('payment_success', {
            transaction_id: payment.id.toString(),
            value: amount,
            currency: 'INR'
          });
        } else {
          setPaymentState('processing');
          simulateOnlinePayment(payment.id);
        }
      }
    } catch (error) {
      console.error('Retry payment error:', error.response?.data || error.message);
      Alert.alert('Retry Failed', error.response?.data?.message || 'Could not initiate retry. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render screens conditionally based on state
  if (paymentState === 'processing') {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        <Text style={styles.stateTitle}>Processing Payment...</Text>
        <Text style={styles.stateSubtitle}>Please do not press back or close the app</Text>
        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
          <Text style={styles.secureText}>100% Secure SSL Payment</Text>
        </View>
      </View>
    );
  }

  if (paymentState === 'success') {
    return (
      <View style={styles.stateContainer}>
        <View style={[styles.circle, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>
        <Text style={[styles.stateTitle, { color: COLORS.success }]}>Order Placed Successfully!</Text>
        <Text style={styles.stateSubtitle}>Thank you for shopping at Tarun Kirana Store.</Text>
        
        <View style={styles.orderSummaryBox}>
          <Text style={styles.summaryLabel}>Order ID: <Text style={styles.summaryValue}>#{orderCreated?.id}</Text></Text>
          <Text style={styles.summaryLabel}>Amount Paid: <Text style={styles.summaryValue}>₹{amount?.toFixed(2)}</Text></Text>
          <Text style={styles.summaryLabel}>Payment: <Text style={[styles.summaryValue, { textTransform: 'uppercase' }]}>{paymentMethod}</Text></Text>
        </View>
        <TouchableOpacity 
          style={styles.doneBtn}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (paymentState === 'failure') {
    return (
      <View style={styles.stateContainer}>
        <View style={[styles.circle, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="close-circle" size={80} color={COLORS.error} />
        </View>
        <Text style={[styles.stateTitle, { color: COLORS.error }]}>Payment Failed</Text>
        <Text style={styles.stateSubtitle}>{failureMessage}</Text>

        <View style={styles.retryMethodBox}>
          <Text style={styles.retryTitle}>Retry with another method:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {['upi', 'razorpay', 'debit_card', 'credit_card', 'cod'].map(method => (
              <TouchableOpacity
                key={method}
                style={[styles.horizontalCard, paymentMethod === method && styles.selectedHorizontalCard]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[styles.horizontalCardText, paymentMethod === method && styles.selectedHorizontalCardText]}>
                  {method === 'cod' ? 'COD' : method.toUpperCase().replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick inputs for retry */}
          {paymentMethod === 'upi' && (
            <TextInput
              style={styles.retryInput}
              placeholder="Enter new UPI ID"
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
            />
          )}
          {(paymentMethod === 'debit_card' || paymentMethod === 'credit_card') && (
            <TextInput
              style={styles.retryInput}
              placeholder="Card Number"
              keyboardType="numeric"
              maxLength={16}
              value={cardNumber}
              onChangeText={setCardNumber}
            />
          )}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Text style={styles.secondaryBtnText}>Cancel Order</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={() => handleRetryPayment(paymentMethod)}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white}/> : <Text style={styles.primaryBtnText}>Retry Payment</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Selection Screen
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Select Payment Mode</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Amount Panel */}
        <View style={styles.amountPanel}>
          <Text style={styles.amountLabel}>Total Payable Amount</Text>
          <Text style={styles.amountValue}>₹{amount?.toFixed(2)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Available Payment Options</Text>

        {/* ─── UPI option ─── */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'upi' && styles.selectedPaymentCard]}
          onPress={() => handlePaymentMethodSelect('upi')}
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name={paymentMethod === 'upi' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'upi' ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={styles.paymentInfo}>
              <Ionicons name="logo-google" size={20} color="#0F9D58" />
              <Text style={styles.paymentText}>UPI / GPay / PhonePe</Text>
            </View>
          </View>
          
          {paymentMethod === 'upi' && (
            <View style={styles.cardDetails}>
              <TextInput
                style={styles.input}
                placeholder="Enter UPI ID (e.g., yourname@okaxis)"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
              <View style={styles.upiQuickRow}>
                {['@okaxis', '@okhdfcbank', '@okicici', '@paytm'].map(suffix => (
                  <TouchableOpacity
                    key={suffix}
                    style={styles.quickUpiBadge}
                    onPress={() => handleUpiHandleClick(suffix)}
                  >
                    <Text style={styles.quickUpiText}>{suffix}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>Enter "fail@upi" to simulate a failed UPI flow.</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Razorpay option ─── */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'razorpay' && styles.selectedPaymentCard]}
          onPress={() => handlePaymentMethodSelect('razorpay')}
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name={paymentMethod === 'razorpay' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'razorpay' ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={styles.paymentInfo}>
              <Ionicons name="wallet-outline" size={22} color="#0029FF" />
              <Text style={styles.paymentText}>Razorpay Netbanking / Wallets</Text>
            </View>
          </View>
          {paymentMethod === 'razorpay' && (
            <View style={styles.cardDetails}>
              <Text style={styles.infoDescription}>
                Secure payment using Razorpay portal. Includes Netbanking and Wallets. (Simulated instant validation)
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Debit Card ─── */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'debit_card' && styles.selectedPaymentCard]}
          onPress={() => handlePaymentMethodSelect('debit_card')}
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name={paymentMethod === 'debit_card' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'debit_card' ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={styles.paymentInfo}>
              <Ionicons name="card-outline" size={22} color="#1E88E5" />
              <Text style={styles.paymentText}>Debit Card</Text>
            </View>
          </View>
          {paymentMethod === 'debit_card' && (
            <View style={styles.cardDetails}>
              <TextInput
                style={styles.input}
                placeholder="Card Number (16 digits)"
                keyboardType="numeric"
                maxLength={16}
                value={cardNumber}
                onChangeText={setCardNumber}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Expiry (MM/YY)"
                  maxLength={5}
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="CVV (3 digits)"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={3}
                  value={cardCvv}
                  onChangeText={setCardCvv}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Card Holder Name"
                value={cardName}
                onChangeText={setCardName}
              />
              <Text style={styles.hintText}>Use card starting with "4000" to simulate a declined transaction.</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Credit Card ─── */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'credit_card' && styles.selectedPaymentCard]}
          onPress={() => handlePaymentMethodSelect('credit_card')}
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name={paymentMethod === 'credit_card' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'credit_card' ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={styles.paymentInfo}>
              <Ionicons name="gift-outline" size={22} color="#8E24AA" />
              <Text style={styles.paymentText}>Credit Card</Text>
            </View>
          </View>
          {paymentMethod === 'credit_card' && (
            <View style={styles.cardDetails}>
              <TextInput
                style={styles.input}
                placeholder="Card Number (16 digits)"
                keyboardType="numeric"
                maxLength={16}
                value={cardNumber}
                onChangeText={setCardNumber}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Expiry (MM/YY)"
                  maxLength={5}
                  value={cardExpiry}
                  onChangeText={setCardExpiry}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="CVV (3 digits)"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={3}
                  value={cardCvv}
                  onChangeText={setCardCvv}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Card Holder Name"
                value={cardName}
                onChangeText={setCardName}
              />
              <Text style={styles.hintText}>Use card starting with "4000" to simulate a declined transaction.</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Cash On Delivery ─── */}
        <TouchableOpacity
          style={[styles.paymentCard, paymentMethod === 'cod' && styles.selectedPaymentCard]}
          onPress={() => handlePaymentMethodSelect('cod')}
        >
          <View style={styles.cardHeader}>
            <Ionicons
              name={paymentMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'cod' ? COLORS.primary : COLORS.textSecondary}
            />
            <View style={styles.paymentInfo}>
              <Ionicons name="cash-outline" size={22} color="#43A047" />
              <Text style={styles.paymentText}>Cash on Delivery (COD)</Text>
            </View>
          </View>
          {paymentMethod === 'cod' && (
            <View style={styles.cardDetails}>
              <Text style={styles.infoDescription}>
                Pay cash or show UPI code when delivery executive reaches your door.
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Pay & Confirm Button Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.disabledBtn]}
          onPress={handleProcessPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.payBtnText}>
                {paymentMethod === 'cod' ? 'Place Order (COD)' : 'Pay & Place Order'}
              </Text>
              <Text style={styles.payAmount}>₹{amount?.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    flex: 1,
    padding: SPACING.md
  },
  amountPanel: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  amountLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primaryDark
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm
  },
  selectedPaymentCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text
  },
  cardDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%'
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SPACING.sm,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.sm
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm
  },
  upiQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs
  },
  quickUpiBadge: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  quickUpiText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600'
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2
  },
  infoDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.lg
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    height: 52,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.md
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700'
  },
  payAmount: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900'
  },
  disabledBtn: {
    opacity: 0.7
  },

  /* Simulated States Styling */
  stateContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  loader: {
    marginBottom: SPACING.lg
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm
  },
  stateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xl
  },
  secureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  orderSummaryBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.xl,
    gap: 8,
    ...SHADOWS.sm
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  summaryValue: {
    color: COLORS.text,
    fontWeight: '800'
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    height: 52,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.md
  },
  doneBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700'
  },

  /* Failure State Styling */
  retryMethodBox: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm
  },
  retryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm
  },
  horizontalScroll: {
    marginVertical: 4
  },
  horizontalCard: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: SPACING.xs
  },
  selectedHorizontalCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  horizontalCardText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  selectedHorizontalCardText: {
    color: COLORS.white,
    fontWeight: '700'
  },
  retryInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SPACING.sm,
    height: 40,
    fontSize: 13,
    color: COLORS.text,
    marginTop: 8
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%'
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700'
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    borderRadius: SIZES.radiusSm,
    justifyContent: 'center',
    alignItems: 'center'
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700'
  }
});
