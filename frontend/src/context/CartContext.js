import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import apiClient from '../api/client';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const { user } = useContext(AuthContext);

  const fetchCart = async () => {
    if (!user || user.role !== 'customer') {
      setCartItems([]);
      return;
    }
    try {
      setIsLoading(true);
      const response = await apiClient.get('/cart');
      if (response.data.success) {
        setCartItems(response.data.cartItems || []);
      }
    } catch (error) {
      console.log('Error fetching cart:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    setAppliedCoupon(null); // Reset coupon when user changes/logs out
  }, [user]);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await apiClient.post('/cart', { productId, quantity });
      if (response.data.success) {
        await fetchCart();
        return { success: true };
      }
    } catch (error) {
      console.error('Error adding to cart:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add item to cart'
      };
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      const response = await apiClient.put(`/cart/${productId}`, { quantity });
      if (response.data.success) {
        await fetchCart();
        return { success: true };
      }
    } catch (error) {
      console.error('Error updating quantity:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update quantity'
      };
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const response = await apiClient.delete(`/cart/${productId}`);
      if (response.data.success) {
        await fetchCart();
        return { success: true };
      }
    } catch (error) {
      console.error('Error removing from cart:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove item'
      };
    }
  };

  const clearCart = async () => {
    try {
      const response = await apiClient.delete('/cart');
      if (response.data.success) {
        setCartItems([]);
        setAppliedCoupon(null);
        return { success: true };
      }
    } catch (error) {
      console.error('Error clearing cart:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clear cart'
      };
    }
  };

  const applyCoupon = async (couponCode) => {
    try {
      const response = await apiClient.post('/cart/coupon/apply', { couponCode });
      if (response.data.success) {
        setAppliedCoupon(response.data.coupon);
        return { success: true, message: response.data.coupon.message };
      }
    } catch (error) {
      console.error('Error applying coupon:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to apply coupon'
      };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Pricing calculations
  const getCartOriginalTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.product?.price || 0);
      return total + price * item.quantity;
    }, 0);
  };

  const getCartSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const product = item.product;
      if (!product) return total;
      const originalPrice = parseFloat(product.price);
      const discountPercent = product.discountPercent || 0;
      const discountedPrice = originalPrice - (originalPrice * discountPercent) / 100;
      return total + discountedPrice * item.quantity;
    }, 0);
  };

  const getCouponDiscount = (sub) => {
    if (!appliedCoupon) return 0;
    const type = appliedCoupon.discountType;
    const value = parseFloat(appliedCoupon.discountValue || 0);
    const minAmount = parseFloat(appliedCoupon.minOrderAmount || 0);
    const maxAmount = appliedCoupon.maxDiscountAmount ? parseFloat(appliedCoupon.maxDiscountAmount) : null;

    if (sub < minAmount) return 0.00;

    if (type === 'percentage') {
      let disc = parseFloat((sub * value / 100).toFixed(2));
      if (maxAmount && disc > maxAmount) {
        disc = maxAmount;
      }
      return disc;
    } else if (type === 'flat') {
      return value > sub ? sub : value;
    } else if (type === 'free_shipping') {
      return 0.00;
    }
    return 0.00;
  };

  const getDeliveryCharge = (sub) => {
    if (sub === 0) return 0.00;
    const hasFreeShipCoupon = appliedCoupon && appliedCoupon.discountType === 'free_shipping' && sub >= parseFloat(appliedCoupon.minOrderAmount || 0);
    if (hasFreeShipCoupon || sub > 200) {
      return 0.00;
    }
    return 30.00;
  };

  const getTax = (sub, discountVal) => {
    const taxable = Math.max(0, sub - discountVal);
    return parseFloat((taxable * 0.05).toFixed(2)); // 5% GST
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const originalTotal = getCartOriginalTotal();
  const subtotal = getCartSubtotal();
  const couponDiscount = getCouponDiscount(subtotal);
  const deliveryCharge = getDeliveryCharge(subtotal);
  const tax = getTax(subtotal, couponDiscount);
  const grandTotal = parseFloat((subtotal - couponDiscount + tax + deliveryCharge).toFixed(2));

  return (
    <CartContext.Provider value={{
      cartItems,
      isLoading,
      fetchCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      cartOriginalTotal: originalTotal,
      cartProductDiscount: originalTotal - subtotal,
      cartSubtotal: subtotal,
      cartCouponDiscount: couponDiscount,
      cartTax: tax,
      cartDeliveryCharge: deliveryCharge,
      cartGrandTotal: grandTotal,
      cartCount: getCartCount()
    }}>
      {children}
    </CartContext.Provider>
  );
};
export default CartContext;
