// /home/cidtecuc/backendEvento/test-gemini.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const key = process.env.GEMINI_API_KEY;
  console.log('🔑 Key configurada:', key?.startsWith('AIzaSy') ? '✅ Sí' : '❌ No');
  
  if (!key?.startsWith('AIzaSy')) {
    return console.error('❌ API Key inválida o no configurada');
  }
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Responde solo: OK");
    console.log('✅ Gemini responde:', result.response.text());
  } catch (e) {
    console.error('❌ Error Gemini:', e.message, '| Status:', e.status);
  }
}
test();