// routes/botRoutes.js
const express = require('express');
const router = express.Router();
const {getMessages,telegramWebhook, whatsappWebhook,botStatus,appChat,getChatHistory} 
= require('../controllers/botController');
console.log('🔍 [DEBUG] appChat type:', typeof appChat); // Debería decir 'function'
console.log('🔍 [DEBUG] telegramWebhook type:', typeof telegramWebhook);

if (typeof appChat !== 'function') {
    console.error('❌ ERROR: appChat no se importó como función. Revisa botController.js');
}
// ✅ Verificar que cada handler es una función válida
router.get('/messages/:platform/:externalId', getMessages);
router.post('/telegram/webhook', telegramWebhook);
router.post('/whatsapp/webhook', whatsappWebhook);
router.get('/status', botStatus);
router.post('/chat', appChat);
router.get('/history/:email', getChatHistory);

module.exports = router;