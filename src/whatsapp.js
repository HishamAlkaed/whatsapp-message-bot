const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { MessageStore } = require('./messageStore');
const { handleCommand } = require('./commands');

async function initWhatsApp() {
  const store = new MessageStore();
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with your WhatsApp app:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => console.log('🔑 Authentication successful'));
  client.on('auth_failure', (msg) => console.error('❌ Auth failed:', msg));

  client.on('ready', () => {
    const num = client.info.wid.user;
    console.log(`\n✅ Bot ready! Connected as +${num}`);
    console.log(`\nHow to use: Send a message to yourself (+${num}) like:`);
    console.log('  "Summarize the family group"');
    console.log('  "Who asks the most questions in work chat?"');
    console.log('  "Draft a reply to my girlfriend"');
    console.log('  "help" — show all commands\n');
  });

  client.on('disconnected', (reason) => console.log('Disconnected:', reason));

  client.on('message_create', async (msg) => {
    if (msg.body) store.add(msg);

    if (!msg.fromMe) return;
    if (!client.info?.wid) return;
    if (msg.id?.remote !== client.info.wid._serialized) return;

    const command = msg.body?.trim();
    if (!command) return;
    if (command.startsWith('🤖') || command.startsWith('⏳')) return;

    console.log(`\n📨 Received command: "${command}"`);

    try {
      const myId = client.info.wid._serialized;
      const chat = await client.getChatById(myId);
      await chat.sendStateTyping();
      const response = await handleCommand(command, client, store);
      await client.sendMessage(myId, response);
      console.log('✅ Response sent');
    } catch (err) {
      console.error('Command error:', err);
      await client.sendMessage(client.info.wid._serialized, `❌ Error: ${err.message}`).catch(() => {});
    }
  });

  console.log('⚡ Initializing WhatsApp connection...\n');
  await client.initialize();
}

module.exports = { initWhatsApp };
