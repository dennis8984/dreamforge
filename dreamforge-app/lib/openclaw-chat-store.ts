import type { ChatMessage } from '@/types/openclaw';

// In-memory chat history (per-process; in production, use a database)
const chatHistory: ChatMessage[] = [];

export function getChatHistory(channel?: string, limit = 50): ChatMessage[] {
  const filtered = channel
    ? chatHistory.filter(m => m.channel === channel)
    : chatHistory;
  return filtered.slice(-limit);
}

export function addToChatHistory(message: ChatMessage) {
  chatHistory.push(message);
  // Keep last 500 messages
  if (chatHistory.length > 500) {
    chatHistory.splice(0, chatHistory.length - 500);
  }
}
