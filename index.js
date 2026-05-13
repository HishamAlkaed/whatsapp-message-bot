require('dotenv').config();
const { initWhatsApp } = require('./src/whatsapp');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is required. Copy .env.example to .env and add your key.');
  process.exit(1);
}

console.log('🤖 WhatsApp AI Bot');
console.log('   Powered by Claude Opus 4.7\n');

initWhatsApp().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
