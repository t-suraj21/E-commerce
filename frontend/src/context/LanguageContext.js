import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LanguageContext = createContext();

const translations = {
  en: {
    appName: 'Tarun Kirana Store',
    shop: 'Shop',
    categories: 'Categories',
    cart: 'Cart',
    account: 'Account',
    wishlist: 'My Wishlist',
    wishlistEmpty: 'Your wishlist is empty',
    wishlistHint: 'Tap the heart icon on any product to save it here for later.',
    browseShop: 'Browse Shop',
    addToCart: 'Add to Cart',
    addedToCart: 'Added to your cart!',
    checkout: 'Checkout',
    placeOrder: 'Place Order',
    priceSummary: 'Price Summary',
    itemsTotal: 'Items Total (MRP)',
    productDiscount: 'Product Discount Savings',
    subtotal: 'Subtotal',
    coupon: 'Coupon',
    applyCoupon: 'Apply Coupon',
    selectCoupon: 'Select Coupon',
    deliveryCharges: 'Delivery Charges',
    free: 'FREE',
    gst: 'GST (5%)',
    totalPayable: 'Total Payable',
    savingsBanner: 'You save ₹{amount} on this order!',
    paymentMethod: 'Payment Method',
    payNow: 'Pay Now',
    orderPlaced: 'Order Placed! 🛍️',
    orderHistory: 'Order History',
    noOrders: 'No orders placed yet.',
    trackOrder: 'Track Order',
    transactionHistory: 'Transaction History',
    manageAddresses: 'Manage Addresses',
    contactUs: 'Contact Us',
    aboutApp: 'About App',
    signOut: 'Sign Out',
    changeLanguage: 'Change Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    settings: 'App Settings',
    customerReviews: 'Customer Reviews',
    writeReview: 'Write a Review',
    submitReview: 'Submit Review',
    averageRating: 'Average Rating',
    rating: 'Rating',
    comment: 'Comment',
    stockAlert: 'Low Stock Alert',
    salesDashboard: 'Sales Dashboard',
    totalRevenue: 'Total Revenue',
    totalCustomers: 'Total Customers',
    pendingOrders: 'Pending Orders',
    inventoryStatus: 'Inventory Status'
  },
  hi: {
    appName: 'तरुण किराना स्टोर',
    shop: 'दुकान',
    categories: 'श्रेणियां',
    cart: 'कार्ट',
    account: 'प्रोफ़ाइल',
    wishlist: 'मेरी विशलिस्ट',
    wishlistEmpty: 'आपकी विशलिस्ट खाली है',
    wishlistHint: 'बाद में सहेजने के लिए किसी भी उत्पाद पर दिल के आइकन को टैप करें।',
    browseShop: 'दुकान देखें',
    addToCart: 'कार्ट में जोड़ें',
    addedToCart: 'आपके कार्ट में जोड़ा गया!',
    checkout: 'चेकआउट',
    placeOrder: 'ऑर्डर दें',
    priceSummary: 'मूल्य विवरण',
    itemsTotal: 'कुल सामान (MRP)',
    productDiscount: 'उत्पाद छूट बचत',
    subtotal: 'उप-योग',
    coupon: 'कूपन',
    applyCoupon: 'कूपन लागू करें',
    selectCoupon: 'कूपन चुनें',
    deliveryCharges: 'डिलिवरी शुल्क',
    free: 'मुफ़्त',
    gst: 'जीएसटी (5%)',
    totalPayable: 'कुल देय राशि',
    savingsBanner: 'आप इस ऑर्डर पर ₹{amount} बचाते हैं!',
    paymentMethod: 'भुगतान का प्रकार',
    payNow: 'अभी भुगतान करें',
    orderPlaced: 'ऑर्डर हो गया! 🛍️',
    orderHistory: 'ऑर्डर इतिहास',
    noOrders: 'अभी तक कोई ऑर्डर नहीं दिया गया है।',
    trackOrder: 'ऑर्डर ट्रैक करें',
    transactionHistory: 'लेन-देन का इतिहास',
    manageAddresses: 'पते प्रबंधित करें',
    contactUs: 'संपर्क करें',
    aboutApp: 'ऐप के बारे में',
    signOut: 'लॉग आउट',
    changeLanguage: 'भाषा बदलें',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    settings: 'ऐप सेटिंग्स',
    customerReviews: 'ग्राहक समीक्षाएं',
    writeReview: 'एक समीक्षा लिखें',
    submitReview: 'समीक्षा भेजें',
    averageRating: 'औसत रेटिंग',
    rating: 'रेटिंग',
    comment: 'टिप्पणी',
    stockAlert: 'कम स्टॉक चेतावनी',
    salesDashboard: 'बिक्री डैशबोर्ड',
    totalRevenue: 'कुल राजस्व',
    totalCustomers: 'कुल ग्राहक',
    pendingOrders: 'लंबित ऑर्डर',
    inventoryStatus: 'इन्वेंट्री की स्थिति'
  }
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('tks_language');
      if (savedLang) {
        setLocale(savedLang);
      }
    } catch (e) {
      console.log('Error loading language from storage:', e.message);
    }
  };

  const changeLanguage = async (lang) => {
    try {
      setLocale(lang);
      await AsyncStorage.setItem('tks_language', lang);
    } catch (e) {
      console.log('Error saving language:', e.message);
    }
  };

  const t = (key, params = {}) => {
    let text = translations[locale][key] || translations['en'][key] || key;
    
    // Simple interpolation for params like ₹{amount}
    Object.keys(params).forEach(paramKey => {
      text = text.replace(`{${paramKey}}`, params[paramKey]);
    });
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
