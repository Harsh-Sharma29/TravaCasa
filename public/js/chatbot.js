// TravaCasa AI Chatbot – Production Safe Version

class TravaCasaChatBot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.sessionId = this.generateSessionId();
        this.apiUrl = '/api/chatbot';
        this.context = [];
        this.analytics = [];
        this.lastMessageTime = null;

        this.init();
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    init() {
        if (document.getElementById('chatbotContainer')) return;

        this.createUI();
        this.bindEvents();
        this.restoreHistory();

        console.log('✅ TravaCasa Chatbot initialized');
    }

    createUI() {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="chatbotToggle" class="chatbot-toggle">💬</div>

            <div id="chatbotContainer" class="chatbot-container">
                <div class="chatbot-header">
                    <h4>TravaCasa Assistant</h4>
                    <button id="chatbotClose">×</button>
                </div>

                <div id="chatbotMessages" class="chatbot-messages">
                    <div class="chatbot-message bot-message">
                        👋 Hi! I can help you find properties, rentals, and travel stays.
                    </div>
                </div>

                <div id="chatbotTyping" class="chatbot-typing" style="display:none;">
                    Typing...
                </div>

                <div class="chatbot-input-wrapper">
                    <input id="chatbotInput" placeholder="Ask me something..." />
                    <button id="chatbotSend">Send</button>
                </div>
            </div>
        `);
    }

    bindEvents() {
        document.getElementById('chatbotToggle').onclick = () => this.open();
        document.getElementById('chatbotClose').onclick = () => this.close();
        document.getElementById('chatbotSend').onclick = () => this.send();

        document.getElementById('chatbotInput')
            .addEventListener('keydown', e => {
                if (e.key === 'Enter') this.send();
            });
    }

    open() {
        document.getElementById('chatbotContainer').classList.add('chatbot-open');
        this.isOpen = true;
    }

    close() {
        document.getElementById('chatbotContainer').classList.remove('chatbot-open');
        this.isOpen = false;
    }

    async send() {
        const input = document.getElementById('chatbotInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.lastMessageTime = Date.now();

        this.addMessage('user', text);
        this.showTyping();

        try {
            const reply = await this.fetchAI(text);
            this.hideTyping();
            this.addMessage('bot', reply);
            this.track(text, reply);
        } catch {
            this.hideTyping();
            this.addMessage('bot', '⚠️ Something went wrong. Please try again.');
        }
    }

    async fetchAI(message) {
        const res = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                sessionId: this.sessionId,
                context: this.context.slice(-6)
            })
        });

        if (!res.ok) throw new Error('API error');

        const data = await res.json();
        if (!data.message) throw new Error('Invalid response');

        this.context.push({ role: 'user', content: message });
        this.context.push({ role: 'assistant', content: data.message });

        if (this.context.length > 12) {
            this.context = this.context.slice(-12);
        }

        return data.message;
    }

    addMessage(sender, text) {
        const box = document.getElementById('chatbotMessages');
        const div = document.createElement('div');

        div.className = `chatbot-message ${sender}-message`;
        div.textContent = text; // XSS safe

        box.appendChild(div);
        box.scrollTop = box.scrollHeight;

        this.messages.push({ sender, text });
        this.saveHistory();
    }

    showTyping() {
        document.getElementById('chatbotTyping').style.display = 'block';
    }

    hideTyping() {
        document.getElementById('chatbotTyping').style.display = 'none';
    }

    saveHistory() {
        localStorage.setItem('travacasa_chat_history', JSON.stringify(this.messages.slice(-50)));
    }

    restoreHistory() {
        const history = localStorage.getItem('travacasa_chat_history');
        if (!history) return;

        JSON.parse(history).forEach(m => this.addMessage(m.sender, m.text));
    }

    track(userMsg, botMsg) {
        this.analytics.push({
            time: new Date().toISOString(),
            latency: Date.now() - this.lastMessageTime,
            userMsg,
            botMsg
        });

        localStorage.setItem(
            'travacasa_chat_analytics',
            JSON.stringify(this.analytics.slice(-30))
        );
    }
}

// Init safely
document.addEventListener('DOMContentLoaded', () => {
    const blocked = ['/login', '/admin'];
    if (!blocked.includes(location.pathname)) {
        new TravaCasaChatBot();
    }
});
