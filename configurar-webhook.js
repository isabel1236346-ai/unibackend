require('dotenv').config(); // Esto lee tu archivo .env
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// ⚠️ IMPORTANTE: Cambia esta URL por la dirección EXACTA de tu servidor en internet.
// Si usas Render, Vercel o un VPS, pon tu dominio real. Ejemplo: https://mi-api.com/api/telegram/webhook
const WEBHOOK_URL = 'https://TU-DOMINIO-REAL.com/la/ruta/de/tu/webhook'; 

async function configurarWebhook() {
  try {
    console.log('⏳ Configurando webhook con secreto...');
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`,
      {
        params: {
          url: WEBHOOK_URL,
          secret_token: WEBHOOK_SECRET
        }
      }
    );
    console.log('✅ Respuesta de Telegram:', response.data);
    console.log('🎉 ¡Webhook blindado con éxito! Ya puedes borrar este archivo.');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

configurarWebhook();