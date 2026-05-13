const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a personal WhatsApp assistant helping the user analyze their conversations and draft messages.
You help with:
- Summarizing major events and topics from group chats
- Analyzing conversation patterns (who's most positive/negative, who asks most questions, etc.)
- Drafting replies that match the user's personal writing style
Format responses for WhatsApp: plain text, concise, no markdown.`;

async function handleCommand(command, client, store) {
  if (command.toLowerCase().trim() === 'help') {
    return `🤖 WhatsApp AI Bot\n\nYou can ask me things like:\n• "Summarize the family group"\n• "Who asks the most questions in the soccer group?"\n• "Who's the most positive person in my college group?"\n• "Draft a reply to my girlfriend"\n\nJust message me naturally!`;
  }

  const allChats = await client.getChats();
  const chatList = allChats
    .filter(c => c.lastMessage)
    .slice(0, 50)
    .map((c, i) => ({ index: i + 1, id: c.id._serialized, name: c.name || c.id.user, isGroup: c.isGroup }));

  if (chatList.length === 0) return "You don't seem to have any WhatsApp chats yet.";

  // Step 1: Routing — identify intent + target chat
  const routingResponse = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    system: 'Identify which WhatsApp chat a user is referring to and what they want to do. Respond only with valid JSON.',
    messages: [{
      role: 'user',
      content: `User command: "${command}"\n\nAvailable chats:\n${chatList.map(c => `${c.index}. [${c.isGroup ? 'Group' : 'DM'}] ${c.name}`).join('\n')}\n\nRespond with JSON only:\n{\n  "intent": "summarize" | "analyze" | "draft_reply" | "other",\n  "chatNumber": <1-${chatList.length} or null if unclear>,\n  "details": "<what specifically to analyze or draft>"\n}`,
    }],
  });

  let routing;
  const routingText = routingResponse.content.find(b => b.type === 'text')?.text || '';
  try {
    const jsonMatch = routingText.match(/\{[\s\S]*?\}/);
    routing = JSON.parse(jsonMatch?.[0] ?? '{}');
  } catch {
    routing = { intent: 'other', chatNumber: null };
  }

  if (!routing.chatNumber) {
    const chatNames = chatList.slice(0, 10).map(c => `• ${c.name}`).join('\n');
    return `I'm not sure which chat you mean. Your recent chats:\n${chatNames}\n\nTry: "Summarize [chat name]"`;
  }

  const targetChat = chatList[routing.chatNumber - 1];
  if (!targetChat) return "I couldn't find that chat. Please try again with the exact name.";

  // Step 2: Fetch messages
  console.log(`  Fetching messages from: ${targetChat.name}`);
  const whatsappChat = await client.getChatById(targetChat.id);
  const msgLimit = routing.intent === 'analyze' ? 300 : 150;
  const rawMessages = await whatsappChat.fetchMessages({ limit: msgLimit });

  const formatted = formatMessages(rawMessages);
  if (!formatted) return `No readable messages found in ${targetChat.name}.`;

  // Step 3: Build prompt based on intent
  let userPrompt;
  if (routing.intent === 'summarize') {
    userPrompt = `Summarize the major events, topics, and highlights from this conversation:\n\nChat: ${targetChat.name}\n---\n${formatted}`;
  } else if (routing.intent === 'analyze') {
    userPrompt = `Analyze this conversation: "${routing.details || command}"\n\nChat: ${targetChat.name}\n---\n${formatted}`;
  } else if (routing.intent === 'draft_reply') {
    const myMessages = rawMessages.filter(m => m.fromMe && m.body).slice(-30);
    const styleExamples = myMessages.map(m => m.body).join('\n');
    userPrompt = `Draft a reply for me in the conversation below. Match my writing style based on my recent messages.\n\nMy writing style (my recent messages):\n---\n${styleExamples || '(no messages from me yet)'}\n---\n\nFull conversation in ${targetChat.name}:\n---\n${formatted}\n\nDraft a reply that sounds like me. Just give the message text, nothing else.`;
  } else {
    userPrompt = `User asked: "${command}"\n\nThis is about the conversation in ${targetChat.name}:\n---\n${formatted}`;
  }

  // Step 4: Final Claude response
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content.find(b => b.type === 'text')?.text;
  return text || 'Sorry, I could not generate a response.';
}

function formatMessages(messages) {
  const readable = messages.filter(m => m.body && m.type === 'chat');
  if (!readable.length) return '';
  return readable.map(m => {
    const date = new Date(m.timestamp * 1000);
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const author = m.fromMe ? 'Me' : (m.author || m.from)?.split('@')[0] || 'Unknown';
    return `[${dateStr} ${time}] ${author}: ${m.body}`;
  }).join('\n');
}

module.exports = { handleCommand };
