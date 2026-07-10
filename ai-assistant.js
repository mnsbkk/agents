// agent.js - Cloudflare AI Chat Assistant
// Host this on GitHub and use the raw URL
// Version: 2.0 - Updated with current AI models

class ChatAssistant {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || 'https://ai-assistant.mnsibkhan.workers.dev',
            apiKey: config.apiKey || '',
            model: config.model || '@cf/meta/llama-3.2-3b-instruct', // Updated: not deprecated
            systemPrompt: config.systemPrompt || 'You are a helpful AI assistant for this website. Keep responses concise, friendly, and professional. Always be honest and helpful.',
            maxTokens: config.maxTokens || 500,
            temperature: config.temperature || 0.7,
            theme: config.theme || 'light',
            position: config.position || 'bottom-right',
            initialMessage: config.initialMessage || '👋 Hello! I am your AI assistant. How can I help you today?',
            companyName: config.companyName || 'Our Website',
            enableHistory: config.enableHistory !== undefined ? config.enableHistory : true,
            maxHistoryLength: config.maxHistoryLength || 20
        };
        
        this.messages = [];
        this.isOpen = false;
        this.isLoading = false;
        this.messageCount = 0;
        
        // Load history if enabled
        if (this.config.enableHistory) {
            this.loadHistory();
        }
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.bindEvents();
        
        // Add initial message if no history
        if (this.messages.length === 0) {
            setTimeout(() => {
                this.addMessage(this.config.initialMessage, 'bot');
            }, 500);
        } else {
            // Re-display history
            this.messages.forEach(msg => {
                if (msg.role !== 'system') {
                    this.addMessageToUI(msg.content, msg.role === 'user' ? 'user' : 'bot', true);
                }
            });
        }
    }
    
    createUI() {
        // Create chat container
        const container = document.createElement('div');
        container.id = 'chat-assistant-container';
        container.innerHTML = `
            <style>
                /* Chat Container */
                #chat-assistant-container {
                    position: fixed;
                    ${this.config.position === 'bottom-right' ? 'bottom: 20px; right: 20px;' : ''}
                    ${this.config.position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : ''}
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    z-index: 10000;
                }
                
                /* Chat Toggle Button */
                .chat-toggle-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    font-size: 28px;
                    position: relative;
                }
                
                .chat-toggle-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
                }
                
                .chat-toggle-btn .close-icon {
                    display: none;
                }
                
                .chat-toggle-btn.active .chat-icon {
                    display: none;
                }
                
                .chat-toggle-btn.active .close-icon {
                    display: inline;
                }
                
                /* Unread badge */
                .unread-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ff4757;
                    color: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    font-size: 11px;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }
                
                .unread-badge.show {
                    display: flex;
                }
                
                /* Chat Window */
                .chat-window {
                    display: none;
                    width: 380px;
                    max-width: 90vw;
                    height: 520px;
                    max-height: 70vh;
                    background: ${this.config.theme === 'dark' ? '#1a1a2e' : '#ffffff'};
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    flex-direction: column;
                    overflow: hidden;
                    margin-bottom: 15px;
                    border: 1px solid ${this.config.theme === 'dark' ? '#2a2a4e' : '#e0e0e0'};
                }
                
                .chat-window.open {
                    display: flex;
                    animation: slideUp 0.3s ease;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                /* Chat Header */
                .chat-header {
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                
                .chat-header-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .chat-header-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .chat-header-info h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .chat-header-info .status {
                    font-size: 11px;
                    opacity: 0.8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .chat-header-info .status .status-dot {
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #2ecc71;
                    animation: pulse 2s infinite;
                }
                
                .chat-header-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .chat-header-actions button {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 4px;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                
                .chat-header-actions button:hover {
                    opacity: 1;
                }
                
                /* Chat Messages */
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 20px;
                    background: ${this.config.theme === 'dark' ? '#16213e' : '#f8f9fa'};
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .chat-messages::-webkit-scrollbar {
                    width: 4px;
                }
                
                .chat-messages::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .chat-messages::-webkit-scrollbar-thumb {
                    background: #667eea;
                    border-radius: 2px;
                }
                
                /* Message Bubbles */
                .message {
                    max-width: 85%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    animation: messageIn 0.3s ease;
                    position: relative;
                }
                
                @keyframes messageIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .message.user {
                    align-self: flex-end;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                
                .message.bot {
                    align-self: flex-start;
                    background: ${this.config.theme === 'dark' ? '#2a2a4e' : '#ffffff'};
                    color: ${this.config.theme === 'dark' ? '#e0e0e0' : '#333'};
                    border-bottom-left-radius: 4px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .message .message-time {
                    font-size: 10px;
                    opacity: 0.5;
                    margin-top: 4px;
                    display: block;
                }
                
                .message.bot .message-time {
                    text-align: left;
                }
                
                .message.user .message-time {
                    text-align: right;
                }
                
                .message.bot .typing-indicator {
                    display: flex;
                    gap: 4px;
                    padding: 4px 0;
                }
                
                .message.bot .typing-indicator span {
                    width: 8px;
                    height: 8px;
                    background: #667eea;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                
                .message.bot .typing-indicator span:nth-child(2) {
                    animation-delay: 0.2s;
                }
                
                .message.bot .typing-indicator span:nth-child(3) {
                    animation-delay: 0.4s;
                }
                
                @keyframes typing {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.4;
                    }
                    30% {
                        transform: translateY(-8px);
                        opacity: 1;
                    }
                }
                
                /* Chat Input */
                .chat-input-container {
                    padding: 12px 20px;
                    background: ${this.config.theme === 'dark' ? '#1a1a2e' : '#ffffff'};
                    border-top: 1px solid ${this.config.theme === 'dark' ? '#2a2a4e' : '#e0e0e0'};
                    display: flex;
                    gap: 10px;
                    flex-shrink: 0;
                }
                
                .chat-input-wrapper {
                    flex: 1;
                    position: relative;
                }
                
                .chat-input-wrapper input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid ${this.config.theme === 'dark' ? '#2a2a4e' : '#ddd'};
                    border-radius: 25px;
                    font-size: 14px;
                    outline: none;
                    background: ${this.config.theme === 'dark' ? '#16213e' : '#f8f9fa'};
                    color: ${this.config.theme === 'dark' ? '#e0e0e0' : '#333'};
                    transition: border-color 0.3s;
                    box-sizing: border-box;
                }
                
                .chat-input-wrapper input:focus {
                    border-color: #667eea;
                }
                
                .chat-input-wrapper input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .chat-input-wrapper .input-char-count {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 10px;
                    color: #999;
                }
                
                .chat-input-container button {
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }
                
                .chat-input-container button:hover:not(:disabled) {
                    transform: scale(1.02);
                    box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
                }
                
                .chat-input-container button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                /* Quick replies */
                .quick-replies {
                    padding: 8px 20px 4px;
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    flex-shrink: 0;
                }
                
                .quick-reply-btn {
                    padding: 4px 12px;
                    border-radius: 15px;
                    border: 1px solid #667eea;
                    background: transparent;
                    color: #667eea;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                
                .quick-reply-btn:hover {
                    background: #667eea;
                    color: white;
                }
                
                /* Empty state */
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #999;
                    text-align: center;
                    padding: 20px;
                }
                
                .empty-state .empty-icon {
                    font-size: 48px;
                    margin-bottom: 12px;
                }
                
                .empty-state h4 {
                    margin: 0 0 8px;
                    color: #666;
                }
                
                /* Responsive */
                @media (max-width: 480px) {
                    .chat-window {
                        width: 100vw;
                        max-width: 100vw;
                        height: 100vh;
                        max-height: 100vh;
                        border-radius: 0;
                        margin-bottom: 0;
                    }
                    
                    #chat-assistant-container {
                        bottom: 0;
                        right: 0;
                    }
                    
                    .chat-toggle-btn {
                        width: 50px;
                        height: 50px;
                        font-size: 24px;
                    }
                }
            </style>
            <div class="chat-window" id="chat-window">
                <div class="chat-header">
                    <div class="chat-header-left">
                        <div class="chat-header-avatar">🤖</div>
                        <div class="chat-header-info">
                            <h3>${this.config.companyName} Assistant</h3>
                            <div class="status">
                                <span class="status-dot"></span>
                                <span>Online</span>
                            </div>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <button id="clear-history" title="Clear chat history">🗑️</button>
                        <button id="close-window">✕</button>
                    </div>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="empty-state" id="empty-state">
                        <div class="empty-icon">💬</div>
                        <h4>Start a conversation</h4>
                        <p style="font-size: 13px; margin: 0;">Ask me anything about ${this.config.companyName}</p>
                    </div>
                </div>
                <div class="quick-replies" id="quick-replies">
                    <button class="quick-reply-btn" data-msg="What services do you offer?">What services do you offer?</button>
                    <button class="quick-reply-btn" data-msg="Tell me about your company">Tell me about your company</button>
                    <button class="quick-reply-btn" data-msg="How can I contact you?">How can I contact you?</button>
                </div>
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <input type="text" id="chat-input" placeholder="Type your message..." maxlength="1000" />
                        <span class="input-char-count" id="char-count">0/1000</span>
                    </div>
                    <button id="send-btn">Send</button>
                </div>
            </div>
            <button class="chat-toggle-btn" id="chat-toggle-btn">
                <span class="chat-icon">💬</span>
                <span class="close-icon">✕</span>
                <span class="unread-badge" id="unread-badge">0</span>
            </button>
        `;
        
        document.body.appendChild(container);
        
        // Store references
        this.window = document.getElementById('chat-window');
        this.messagesContainer = document.getElementById('chat-messages');
        this.emptyState = document.getElementById('empty-state');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.toggleBtn = document.getElementById('chat-toggle-btn');
        this.closeBtn = document.getElementById('close-window');
        this.clearBtn = document.getElementById('clear-history');
        this.charCount = document.getElementById('char-count');
        this.unreadBadge = document.getElementById('unread-badge');
        this.quickReplies = document.querySelectorAll('.quick-reply-btn');
        
        this.unreadCount = 0;
    }
    
    bindEvents() {
        // Toggle chat
        this.toggleBtn.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.closeChat());
        
        // Clear history
        this.clearBtn.addEventListener('click', () => this.clearHistory());
        
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Character counter
        this.input.addEventListener('input', () => {
            const count = this.input.value.length;
            this.charCount.textContent = `${count}/1000`;
            this.charCount.style.color = count > 900 ? '#ff4757' : '#999';
        });
        
        // Quick replies
        this.quickReplies.forEach(btn => {
            btn.addEventListener('click', () => {
                this.input.value = btn.dataset.msg;
                this.sendMessage();
            });
        });
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.closeChat();
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            const container = document.getElementById('chat-assistant-container');
            if (container && !container.contains(e.target) && this.isOpen) {
                // Don't close if clicking on the toggle button
                if (!e.target.closest('.chat-toggle-btn')) {
                    this.closeChat();
                }
            }
        });
    }
    
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    openChat() {
        this.window.classList.add('open');
        this.toggleBtn.classList.add('active');
        this.isOpen = true;
        this.unreadCount = 0;
        this.unreadBadge.classList.remove('show');
        setTimeout(() => this.input.focus(), 300);
        this.scrollToBottom();
    }
    
    closeChat() {
        this.window.classList.remove('open');
        this.toggleBtn.classList.remove('active');
        this.isOpen = false;
    }
    
    addMessage(text, sender, skipHistory = false) {
        this.addMessageToUI(text, sender);
        
        // Store in history
        if (!skipHistory && this.config.enableHistory) {
            const role = sender === 'user' ? 'user' : 'assistant';
            this.messages.push({ role, content: text });
            this.saveHistory();
        }
    }
    
    addMessageToUI(text, sender, skipAnimation = false) {
        // Hide empty state
        this.emptyState.style.display = 'none';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        if (!skipAnimation) {
            messageDiv.style.animation = 'messageIn 0.3s ease';
        }
        
        messageDiv.innerHTML = `
            ${this.escapeHtml(text)}
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Update unread badge if chat is closed
        if (!this.isOpen && sender === 'bot') {
            this.unreadCount++;
            this.unreadBadge.textContent = this.unreadCount;
            this.unreadBadge.classList.add('show');
        }
    }
    
    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    removeTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async sendMessage() {
        const text = this.input.value.trim();
        if (!text || this.isLoading) return;
        
        // Add user message
        this.addMessage(text, 'user');
        this.input.value = '';
        this.charCount.textContent = '0/1000';
        this.input.disabled = true;
        this.sendBtn.disabled = true;
        this.isLoading = true;
        
        // Add typing indicator
        this.addTypingIndicator();
        
        try {
            const response = await this.callAI(text);
            this.removeTypingIndicator();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator();
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            if (error.message.includes('5028')) {
                errorMessage = 'The AI model is temporarily unavailable. Please try again later.';
            } else if (error.message.includes('limit')) {
                errorMessage = 'I have reached my daily usage limit. Please try again tomorrow.';
            }
            this.addMessage(errorMessage, 'bot');
            console.error('Chat error:', error);
        }
        
        this.input.disabled = false;
        this.sendBtn.disabled = false;
        this.isLoading = false;
        this.input.focus();
    }
    
    async callAI(userMessage) {
        // Prepare conversation history (keep last 10 messages for context)
        const history = this.messages.slice(-10);
        const messages = [
            { role: 'system', content: this.config.systemPrompt },
            ...history
        ];
        
        try {
            const response = await fetch(`${this.config.apiEndpoint}/ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : ''
                },
                body: JSON.stringify({
                    messages: messages,
                    model: this.config.model,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unknown error occurred');
            }
            
            return data.response || 'No response received';
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }
    
    clearHistory() {
        if (confirm('Clear all chat history?')) {
            this.messages = [];
            this.messagesContainer.innerHTML = '';
            this.emptyState.style.display = 'flex';
            this.saveHistory();
            this.addMessage(this.config.initialMessage, 'bot');
        }
    }
    
    saveHistory() {
        try {
            const history = {
                messages: this.messages.slice(-this.config.maxHistoryLength),
                timestamp: Date.now()
            };
            localStorage.setItem('chat_history', JSON.stringify(history));
        } catch (e) {
            // Silently fail if localStorage is not available
        }
    }
    
    loadHistory() {
        try {
            const data = localStorage.getItem('chat_history');
            if (data) {
                const history = JSON.parse(data);
                // Only load history if it's less than 7 days old
                if (Date.now() - history.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    this.messages = history.messages || [];
                }
            }
        } catch (e) {
            // Silently fail if localStorage is not available
            this.messages = [];
        }
    }
}

// Initialize the chat when loaded
document.addEventListener('DOMContentLoaded', function() {
    // Configuration - customize these
    const config = {
        apiEndpoint: 'https://ai-assistant.mnsibkhan.workers.dev',
        apiKey: '', // Optional: Add if you need authentication
        model: '@cf/meta/llama-3.2-3b-instruct', // Current model (not deprecated)
        systemPrompt: 'You are a helpful AI assistant for this website. Keep responses concise, friendly, and professional. If you don\'t know something, say so honestly. Always be helpful and polite.',
        maxTokens: 500,
        temperature: 0.7,
        theme: 'light', // 'light' or 'dark'
        position: 'bottom-right', // 'bottom-right' or 'bottom-left'
        initialMessage: '👋 Hello! I am your AI assistant. How can I help you today?',
        companyName: 'Our Website',
        enableHistory: true,
        maxHistoryLength: 20
    };
    
    // Initialize the chat assistant
    window.chatAssistant = new ChatAssistant(config);
});
