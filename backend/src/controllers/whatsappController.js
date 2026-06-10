const crypto = require('crypto');

// Verify token for Meta webhook subscription
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'tks_whatsapp_webhook_token_123';

/**
 * Handles Webhook verification request from Meta
 * @route GET /api/whatsapp/webhook
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook verified successfully!');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  } else {
    res.status(400).send('Bad Request');
  }
};

/**
 * Handles incoming webhook events (message statuses, incoming messages)
 * @route POST /api/whatsapp/webhook
 */
const receiveWebhook = (req, res) => {
  const body = req.body;

  // Check if this is an event from a WhatsApp API
  if (body.object === 'whatsapp_business_account') {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      // Inbound message handling (if a customer replies to the bot)
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      console.log(`📥 Received WhatsApp message from ${from}`);
    } else if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
      // Message status update (delivered, read, failed)
      const status = body.entry[0].changes[0].value.statuses[0];
      console.log(`📡 WhatsApp Message Status Update: [ID: ${status.id}] -> ${status.status}`);
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
};

module.exports = {
  verifyWebhook,
  receiveWebhook
};
