const express = require('express');
const router = express.Router();
const { verifyWebhook, receiveWebhook } = require('../controllers/whatsappController');

// Meta Webhook endpoints
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

module.exports = router;
