require('dotenv').config();
const { initWhatsApp } = require('./src/whatsapp');

if (!process.env.GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY is required. Copy .env.example to .env and add your key.');
  console.error('   Get a free key at: https://aistudio.google.com/apikey');
  process.exit(1);
}

console.log('🤖 WhatsApp AI Bot');
console.log('   Powered by Gemini 2.0 Flash\n');

initWhatsApp().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
