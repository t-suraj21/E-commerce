const BASE_URL = 'http://localhost:8001/api';

const runPaymentTests = async () => {
  console.log('🚀 Starting Tarun Kirana Store Payment Module Verification...\n');
  const results = {};

  try {
    const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`[${method} ${endpoint}] Failed with status ${response.status}: ${data.message || JSON.stringify(data)}`);
      }
      return data;
    };

    // 1. Register a test customer
    console.log('🔄 Registering a test customer for payment testing...');
    const email = `payment_test_${Date.now()}@tks.com`;
    const regRes = await apiCall('/auth/register', 'POST', {
      name: 'Payment Tester',
      email,
      password: 'testpassword123',
      role: 'customer',
      phone: '9876543210'
    });
    console.log('✅ Registration: SUCCESS');
    const token = regRes.token;

    // 2. Add Delivery Address
    console.log('🔄 Adding delivery address...');
    const addrRes = await apiCall('/addresses', 'POST', {
      fullName: 'Payment Tester',
      mobile: '9876543210',
      houseNumber: 'Flat 101',
      street: 'Payment Enclave',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true
    }, token);
    const addressId = addrRes.address.id;
    console.log(`✅ Address Added: SUCCESS (ID: ${addressId})`);

    // 3. Fetch products to add to cart
    console.log('🔄 Fetching products...');
    const productsRes = await apiCall('/products');
    const banana = productsRes.products.find(p => p.name.includes('Banana'));
    if (!banana) {
      throw new Error('Required seeded product (Banana) not found in database.');
    }
    console.log(`✅ Product found: Banana (ID: ${banana.id})`);

    // 4. Add item to cart
    console.log('🔄 Adding Banana to cart...');
    await apiCall('/cart', 'POST', { productId: banana.id, quantity: 5 }, token);
    console.log('✅ Add to Cart: SUCCESS');

    // 5. Place order with UPI (should start as pending)
    console.log('🔄 Placing order with UPI payment method...');
    const orderRes = await apiCall('/orders', 'POST', {
      addressId,
      paymentMethod: 'upi'
    }, token);

    const order = orderRes.order;
    const initialPayment = orderRes.initialPayment;

    if (order && initialPayment) {
      console.log(`✅ Order Placed: SUCCESS (ID: #TKS-${order.id})`);
      console.log(`✅ Initial Payment Created: SUCCESS (ID: ${initialPayment.id}, Status: ${initialPayment.status}, Txn ID: ${initialPayment.transactionId})`);
      
      // Asserting initial statuses
      if (order.status === 'pending' && order.paymentStatus === 'pending') {
        console.log('✅ Initial statuses match: Order is pending, paymentStatus is pending');
        results.initialStatuses = 'PASS';
      } else {
        throw new Error(`Initial status mismatch: order status = ${order.status}, paymentStatus = ${order.paymentStatus}`);
      }
    } else {
      throw new Error('Failed to create order or initial payment record');
    }

    // 6. Verify Payment Success Flow
    console.log(`\n🔄 Verifying payment success for payment ID ${initialPayment.id}...`);
    const verifyRes = await apiCall('/payments/verify', 'POST', {
      paymentId: initialPayment.id,
      status: 'success'
    }, token);

    if (verifyRes.success && verifyRes.payment.status === 'success') {
      console.log('✅ Payment status updated to SUCCESS in database');
      const updatedOrder = verifyRes.payment.order;
      if (updatedOrder.paymentStatus === 'paid' && updatedOrder.status === 'confirmed') {
        console.log('✅ Order status updated to CONFIRMED and paymentStatus to PAID');
        results.paymentVerificationSuccess = 'PASS';
      } else {
        throw new Error(`Order status update failed. Found order status: ${updatedOrder.status}, paymentStatus: ${updatedOrder.paymentStatus}`);
      }
    } else {
      throw new Error('Payment verification success assertion failed');
    }

    // 7. Place a second order to test payment Failure and Retry
    console.log('\n🔄 Creating second order for failure & retry testing...');
    await apiCall('/cart', 'POST', { productId: banana.id, quantity: 2 }, token);
    
    const secondOrderRes = await apiCall('/orders', 'POST', {
      addressId,
      paymentMethod: 'credit_card'
    }, token);

    const secondOrder = secondOrderRes.order;
    const secondPayment = secondOrderRes.initialPayment;
    console.log(`✅ Second Order Placed (ID: #TKS-${secondOrder.id}) with initial Payment (ID: ${secondPayment.id})`);

    // 8. Verify Payment Failure Flow
    console.log(`🔄 Verifying payment failure for payment ID ${secondPayment.id}...`);
    const failReason = 'Card declined: Insufficient funds';
    const failVerifyRes = await apiCall('/payments/verify', 'POST', {
      paymentId: secondPayment.id,
      status: 'failed',
      failureReason: failReason
    }, token);

    if (failVerifyRes.success && failVerifyRes.payment.status === 'failed') {
      console.log('✅ Payment status updated to FAILED in database');
      if (failVerifyRes.payment.failureReason === failReason) {
        console.log(`✅ Failure reason correctly saved: "${failVerifyRes.payment.failureReason}"`);
        results.paymentFailureReason = 'PASS';
      } else {
        throw new Error('Failure reason mismatch');
      }
    } else {
      throw new Error('Payment failure verification assertion failed');
    }

    // 9. Retry Payment Flow
    console.log(`\n🔄 Retrying payment for failed Order #${secondOrder.id} with UPI method...`);
    const retryRes = await apiCall('/payments/retry', 'POST', {
      orderId: secondOrder.id,
      method: 'upi'
    }, token);

    const retriedPayment = retryRes.payment;
    if (retryRes.success && retriedPayment.orderId === secondOrder.id && retriedPayment.method === 'upi') {
      console.log(`✅ New Payment Attempt Initiated (ID: ${retriedPayment.id}, Txn ID: ${retriedPayment.transactionId})`);
      
      // Verify the new payment as successful
      console.log(`🔄 Verifying retried payment ID ${retriedPayment.id} as successful...`);
      const retryVerifyRes = await apiCall('/payments/verify', 'POST', {
        paymentId: retriedPayment.id,
        status: 'success'
      }, token);

      if (retryVerifyRes.success && retryVerifyRes.payment.status === 'success') {
        const orderAfterRetry = retryVerifyRes.payment.order;
        if (orderAfterRetry.paymentStatus === 'paid' && orderAfterRetry.status === 'confirmed') {
          console.log(`✅ Retried order successfully confirmed and paid!`);
          results.paymentRetryFlow = 'PASS';
        } else {
          throw new Error('Retried order status did not update to confirmed/paid');
        }
      }
    } else {
      throw new Error('Payment retry endpoint failed or response structure incorrect');
    }

    // 10. Fetch Transaction History
    console.log('\n🔄 Fetching user transaction history...');
    const historyRes = await apiCall('/payments/history', 'GET', null, token);
    
    if (historyRes.success && historyRes.payments.length >= 3) {
      console.log(`✅ Transaction History retrieved. Count: ${historyRes.count}`);
      console.log('Transactions returned:');
      historyRes.payments.forEach(p => {
        console.log(`- Txn ID: ${p.transactionId} | Method: ${p.method} | Amount: ₹${p.amount} | Status: ${p.status} | Order ID: #${p.orderId}`);
      });
      results.transactionHistory = 'PASS';
    } else {
      throw new Error(`Transaction history count mismatch. Expected >= 3, found ${historyRes.payments?.length}`);
    }

    // 11. Fetch Payment details by Order ID
    console.log(`\n🔄 Fetching payments for Order #${secondOrder.id}...`);
    const orderPaymentsRes = await apiCall(`/payments/order/${secondOrder.id}`, 'GET', null, token);

    if (orderPaymentsRes.success && orderPaymentsRes.payments.length === 2) {
      console.log(`✅ Order payments fetched. Count: ${orderPaymentsRes.payments.length}`);
      console.log('Attempts listed (newest first):');
      orderPaymentsRes.payments.forEach(p => {
        console.log(`- Payment ID: ${p.id} | Status: ${p.status} | Method: ${p.method} | Reason: ${p.failureReason || 'N/A'}`);
      });
      results.paymentsByOrderId = 'PASS';
    } else {
      throw new Error(`Payments by order count mismatch. Expected 2, found ${orderPaymentsRes.payments?.length}`);
    }

    console.log('\n=================================================');
    console.log('🎉 PAYMENT MODULE INTEGRATION TESTS PASSED 🎉');
    console.log('=================================================');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);

  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED');
    console.error(error.message);
    process.exit(1);
  }
};

runPaymentTests();
