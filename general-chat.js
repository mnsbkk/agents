// Agent: General Chat Assistant
// File: agents/general-chat.js
// Version: 5.0 - Optimized for Llama 3.1

export const agent = {
  id: 'general-chat',
  name: '💬 General Chat',
  description: 'Versatile AI assistant for general questions, advice, and everyday conversations',
  
  systemPrompt: `You are a helpful, friendly AI assistant. Give clear, concise answers. Never repeat yourself. Respond once. Be conversational and warm. Use 1-3 sentences for most answers. Use bullet points only when listing 3+ items.`,
  
  examplePrompt: 'What are some tips for learning a new language?'
};

export default agent;
