require('dotenv').config(); 
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// ⚠️ LEE LAS INSTRUCCIONES DE ABAJO PARA SABER QUÉ PONER AQUÍ ⚠️
const WEBHOOK_URL = 'https://TU-DOMINIO-DE-RAILWAY.up.railway.app/TU_RUTA'; 

async function configurar() {
  if (!TELEGRAM_TOKEN || !WEBHOOK_SECRET) {
    console.log('❌ ERROR: Revisa tu archivo .env local, faltan el Token o el Secret.');
    return;
  }
  if (WEBHOOK_URL.includes('TU-DOMINIO')) {
    console.log('❌ ERROR: Tienes que editar este archivo y poner tu URL real de Railway.');
    return;
  }
  
  console.log('⏳ Hablando con Telegram...');
  try {
    const r = await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      url: WEBHOOK_URL,
      secret_token: WEBHOOK_SECRET
    });
    console.log('✅ ÉXITO TOTAL:', r.data);
    console.log('🎉 ¡Tu bot está blindado! Ya puedes borrar este archivo.');
  } catch (e) {
    console.log('❌ Telegram respondió con error:', e.response?.data || e.message);
  }
}
configurar();