# WhatsApp AI Bot

A personal WhatsApp bot powered by Google Gemini 2.0 Flash. Message your own number to analyze chats, summarize group conversations, and draft replies in your writing style.

## Setup

```bash
npm install
cp .env.example .env
# Add your GOOGLE_API_KEY to .env
node index.js
```

Scan the QR code with WhatsApp, then message yourself:

- `"Summarize the family group"`
- `"Who asks the most questions in work chat?"`
- `"Who's the most positive person in the soccer group?"`
- `"Draft a reply to my girlfriend"`
- `"help"` — show all commands

## Requirements

- Node.js 18+
- A [Google AI Studio API key](https://aistudio.google.com/apikey)
