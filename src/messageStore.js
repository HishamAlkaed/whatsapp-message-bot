const MAX_PER_CHAT = 500;

class MessageStore {
  constructor() {
    this.chats = new Map();
  }

  add(msg) {
    if (!msg.body || !msg.id?.remote) return;
    const chatId = msg.id.remote;
    if (!this.chats.has(chatId)) this.chats.set(chatId, []);
    const messages = this.chats.get(chatId);
    messages.push({
      id: msg.id._serialized,
      body: msg.body,
      from: msg.from,
      fromMe: msg.fromMe,
      author: msg.author || null,
      timestamp: msg.timestamp,
      type: msg.type,
    });
    if (messages.length > MAX_PER_CHAT) messages.splice(0, messages.length - MAX_PER_CHAT);
  }

  get(chatId) {
    return this.chats.get(chatId) || [];
  }

  size() {
    return this.chats.size;
  }
}

module.exports = { MessageStore };
