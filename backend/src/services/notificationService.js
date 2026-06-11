const { User, Notification } = require('../models');
const axios = require('axios');

const validTypes = ['order_placed', 'order_accepted', 'order_packed', 'order_shipped', 'order_delivered', 'order_cancelled', 'offer', 'general'];

const getValidType = (data = {}) => {
  let type = data.type;
  if (type === 'order_status_update' && data.newStatus) {
    if (data.newStatus === 'accepted') return 'order_accepted';
    if (data.newStatus === 'packed') return 'order_packed';
    if (data.newStatus === 'out_for_delivery') return 'order_shipped';
    if (data.newStatus === 'delivered') return 'order_delivered';
    if (data.newStatus === 'cancelled') return 'order_cancelled';
  }
  if (type === 'new_order') return 'order_placed';
  if (validTypes.includes(type)) return type;
  return 'general';
};

/**
 * Send a push notification to a specific user by ID
 * @param {number} userId - The database ID of the user
 * @param {string} title - Title of the notification
 * @param {string} body - Body content of the notification
 * @param {object} [data] - Optional metadata payload
 */
const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    // 1. Save to database completely
    await Notification.create({
      userId,
      title,
      body,
      data,
      type: getValidType(data)
    });

    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`[Notification] User ID ${userId} not found.`);
      return false;
    }

    const pushToken = user.pushToken;
    if (!pushToken || (!pushToken.startsWith('ExponentPushToken') && !pushToken.startsWith('ExpoPushToken'))) {
      console.log(`[Notification] User #${userId} has no valid Expo Push Token.`);
      return false;
    }

    return await sendExpoPushNotification(pushToken, title, body, data);
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error.message);
    return false;
  }
};

/**
 * Send a push notification to all users of a specific role (e.g. 'admin')
 * @param {string} role - ENUM: 'customer', 'admin'
 * @param {string} title - Title of the notification
 * @param {string} body - Body content of the notification
 * @param {object} [data] - Optional metadata payload
 */
const sendNotificationToRole = async (role, title, body, data = {}) => {
  try {
    const users = await User.findAll({ where: { role } });
    if (!users || users.length === 0) return true;

    // Save to database completely for all users
    const notificationsToCreate = users.map(user => ({
      userId: user.id,
      title,
      body,
      data,
      type: getValidType(data)
    }));
    await Notification.bulkCreate(notificationsToCreate);

    const messages = [];
    for (let user of users) {
      if (user.pushToken && (user.pushToken.startsWith('ExponentPushToken') || user.pushToken.startsWith('ExpoPushToken'))) {
        messages.push({
          to: user.pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: data,
        });
      }
    }

    if (messages.length > 0) {
      await sendExpoPushMessagesInChunks(messages);
    }
    return true;
  } catch (error) {
    console.error(`Error sending notification to role ${role}:`, error.message);
    return false;
  }
};

/**
 * Send a broadcast push notification to all registered tokens
 * @param {string} title - Title of the notification
 * @param {string} body - Body content of the notification
 * @param {object} [data] - Optional metadata payload
 */
const sendBroadcastNotification = async (title, body, data = {}) => {
  try {
    const users = await User.findAll();
    
    // Save to database completely for all users
    const notificationsToCreate = users.map(user => ({
      userId: user.id,
      title,
      body,
      data,
      type: getValidType(data)
    }));
    await Notification.bulkCreate(notificationsToCreate);

    const messages = [];
    
    for (let user of users) {
      if (user.pushToken && (user.pushToken.startsWith('ExponentPushToken') || user.pushToken.startsWith('ExpoPushToken'))) {
        messages.push({
          to: user.pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: data,
        });
      }
    }

    if (messages.length > 0) {
      await sendExpoPushMessagesInChunks(messages);
    }
    return true;
  } catch (error) {
    console.error('Error broadcasting notification:', error.message);
    return false;
  }
};

// Internal helper to perform raw Expo Push API delivery
const sendExpoPushNotification = async (token, title, body, data) => {
  try {
    const message = {
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    };

    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`[Notification] Sent to ${token}:`, response.data);
    return true;
  } catch (error) {
    console.error(`[Notification] Failed to send push to ${token}:`, error.message);
    return false;
  }
};

// Internal helper to send multiple messages in chunks (Expo API limit is 100)
const sendExpoPushMessagesInChunks = async (messages) => {
  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
    console.log(`[Notification] Bulk push sent:`, response.data);
  } catch (error) {
    console.error(`[Notification] Failed to send bulk push:`, error.message);
  }
};

module.exports = {
  sendNotificationToUser,
  sendNotificationToRole,
  sendBroadcastNotification
};
