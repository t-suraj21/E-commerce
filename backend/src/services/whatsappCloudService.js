const axios = require('axios');

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const isConfigured = !!(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);

/**
 * Format phone number for WhatsApp
 * Assumes +91 for India if no country code is present.
 */
const formatWhatsAppNumber = (phone) => {
  if (!phone) return null;
  // Remove non-digit characters except +
  let formatted = phone.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, assume it's a 10-digit Indian number
  if (!formatted.startsWith('+')) {
    if (formatted.length === 10) {
      formatted = `91${formatted}`; // Cloud API doesn't want the + symbol
    } else {
      formatted = `${formatted}`;
    }
  } else {
    // Remove the + symbol for Cloud API
    formatted = formatted.substring(1);
  }
  
  return formatted;
};

/**
 * Core function to send a WhatsApp message via Meta Cloud API
 */
const sendWhatsAppMessage = async (toPhone, messageBody) => {
  if (!isConfigured) {
    console.warn('⚠️ Meta WhatsApp Cloud API credentials missing. Cannot send message.');
    return false;
  }

  const to = formatWhatsAppNumber(toPhone);
  if (!to) {
    console.warn('⚠️ Cannot send WhatsApp message: Invalid phone number');
    return false;
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: messageBody
        }
      }
    });

    console.log(`✅ WhatsApp message sent to ${to}. Message ID: ${response.data.messages[0].id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending WhatsApp message to ${toPhone}:`, error.response?.data || error.message);
    return false;
  }
};

/**
 * Sent when order is successfully placed
 */
const sendOrderPlacedMessage = async (order, user) => {
  const message = `*Order Placed!* 🛍️\n\nHi ${user.name},\nThank you for shopping at *Tarun Kirana Store*!\n\nYour order *#TKS-${order.id}* has been successfully placed on ${new Date(order.createdAt).toLocaleDateString()}.\n\n*Total Amount:* ₹${order.totalPrice}\n*Payment:* ${order.paymentMethod.toUpperCase()}\n\nWe will notify you once your order is confirmed.`;
  return await sendWhatsAppMessage(user.phone, message);
};

/**
 * Sent when order is confirmed by admin
 */
const sendOrderConfirmedMessage = async (order, user) => {
  const message = `*Order Confirmed!* ✅\n\nHi ${user.name},\nGreat news! Your order *#TKS-${order.id}* has been accepted and is currently being prepared.\n\nWe'll let you know once it's out for delivery.`;
  return await sendWhatsAppMessage(user.phone, message);
};

/**
 * Sent when order is out for delivery
 */
const sendShippedMessage = async (order, user) => {
  const message = `*Order Shipped!* 🚚\n\nHi ${user.name},\nYour order *#TKS-${order.id}* from Tarun Kirana Store is out for delivery and on its way to your address!\n\nOur delivery executive will reach you shortly.\n\n*Amount to Pay:* ₹${order.totalPrice} (${order.paymentMethod.toUpperCase()})`;
  return await sendWhatsAppMessage(user.phone, message);
};

/**
 * Sent when order is successfully delivered
 */
const sendDeliveredMessage = async (order, user) => {
  const message = `*Order Delivered!* 🎉\n\nHi ${user.name},\nYour order *#TKS-${order.id}* has been successfully delivered.\n\nThank you for choosing *Tarun Kirana Store*. We hope you enjoy your items! 🛒`;
  return await sendWhatsAppMessage(user.phone, message);
};

/**
 * Sent when order is cancelled
 */
const sendCancelledMessage = async (order, user, reason) => {
  const reasonText = reason ? `\n*Reason:* ${reason}` : '';
  const message = `*Order Cancelled* 🛑\n\nHi ${user.name},\nWe regret to inform you that your order *#TKS-${order.id}* has been cancelled.${reasonText}\n\nIf you have any questions, please contact our support.`;
  return await sendWhatsAppMessage(user.phone, message);
};

/**
 * Sent when a product in a pending order goes out of stock
 */
const sendOutOfStockMessage = async (order, user, product) => {
  const message = `*Out of Stock Notice* ⚠️\n\nHi ${user.name},\nWe're sorry to inform you that an item in your pending order *#TKS-${order.id}* is currently out of stock:\n\n*Item:* ${product.name}\n\nOur team will review your order shortly and process the remaining items or issue a refund. We apologize for the inconvenience.`;
  return await sendWhatsAppMessage(user.phone, message);
};

module.exports = {
  sendWhatsAppMessage,
  sendOrderPlacedMessage,
  sendOrderConfirmedMessage,
  sendShippedMessage,
  sendDeliveredMessage,
  sendCancelledMessage,
  sendOutOfStockMessage
};
