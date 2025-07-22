// Advanced AI Chatbot for TravaCasa - Enhanced Version
// Complete chatbot functionality with advanced AI, context memory, and personalization

class TravaCasaChatBot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.currentConversationId = this.generateSessionId();
        this.apiUrl = '/api/chatbot';
        this.conversationContext = [];
        this.userPreferences = this.loadUserPreferences();
        this.suggestedActions = [];
        this.isVoiceRecording = false;
        this.typingTimer = null;
        this.lastMessageTime = null;
        this.responseAnalytics = [];
        this.smartSuggestions = [];
        
        // Initialize chatbot
        this.init();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    loadUserPreferences() {
        try {
            const prefs = localStorage.getItem('travacasa_user_preferences');
            return prefs ? JSON.parse(prefs) : {
                preferredLanguage: 'en',
                theme: 'light',
                notifications: true,
                quickResponses: true
            };
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return {};
        }
    }
    
    saveUserPreferences() {
        try {
            localStorage.setItem('travacasa_user_preferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.loadChatHistory();
        this.initializeQuickResponses();
        console.log('🤖 TravaCasa ChatBot initialized successfully!');
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <!-- Chatbot Toggle Button -->
            <div class="chatbot-toggle" id="chatbotToggle">
                <div class="chatbot-toggle-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <div class="chatbot-notification-badge" id="chatbotNotification">
                    <span>1</span>
                </div>
            </div>

            <!-- Chatbot Container -->
            <div class="chatbot-container" id="chatbotContainer">
                <div class="chatbot-header">
                    <div class="chatbot-header-info">
                        <div class="chatbot-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="chatbot-title">
                            <h4>TravaCasa Assistant</h4>
                            <span class="chatbot-status">Online</span>
                        </div>
                    </div>
                    <div class="chatbot-header-actions">
                        <button class="chatbot-action-btn" id="chatbotMinimize" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="chatbot-action-btn" id="chatbotClose" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="chatbot-messages" id="chatbotMessages">
                    <div class="chatbot-welcome-message">
                        <div class="chatbot-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="chatbot-message-content">
                            <p>👋 Hello! I'm your TravaCasa assistant. How can I help you today?</p>
                            <div class="chatbot-quick-actions">
                                <button class="quick-action-btn" data-action="properties">🏠 Find Properties</button>
                                <button class="quick-action-btn" data-action="booking">📅 Help with Booking</button>
                                <button class="quick-action-btn" data-action="support">💬 Support</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chatbot-typing-indicator" id="chatbotTyping">
                    <div class="chatbot-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>

                <div class="chatbot-input-container">
                    <div class="chatbot-input-wrapper">
                        <input type="text" class="chatbot-input" id="chatbotInput" placeholder="Type your message...">
                        <button class="chatbot-attachment-btn" id="chatbotAttachment" title="Attach file">
                            <i class="fas fa-paperclip"></i>
                        </button>
                        <button class="chatbot-voice-btn" id="chatbotVoice" title="Voice message">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="chatbot-send-btn" id="chatbotSend" title="Send message">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>

                <div class="chatbot-footer">
                    <div class="chatbot-footer-actions">
                        <button class="chatbot-footer-btn" id="chatbotClear" title="Clear conversation">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="chatbot-footer-btn" id="chatbotSettings" title="Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="chatbot-footer-btn" id="chatbotFeedback" title="Feedback">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="chatbot-powered-by">
                        <span>Powered by AI (Hugging Face)</span>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        const toggle = document.getElementById('chatbotToggle');
        const container = document.getElementById('chatbotContainer');
        const close = document.getElementById('chatbotClose');
        const minimize = document.getElementById('chatbotMinimize');
        const input = document.getElementById('chatbotInput');
        const send = document.getElementById('chatbotSend');
        const clear = document.getElementById('chatbotClear');
        const voice = document.getElementById('chatbotVoice');
        const attachment = document.getElementById('chatbotAttachment');

        // Toggle chatbot
        toggle.addEventListener('click', () => this.toggleChatbot());
        
        // Close chatbot
        close.addEventListener('click', () => this.closeChatbot());
        
        // Minimize chatbot
        minimize.addEventListener('click', () => this.minimizeChatbot());
        
        // Send message
        send.addEventListener('click', () => this.sendMessage());
        
        // Send on Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Clear conversation
        clear.addEventListener('click', () => this.clearConversation());
        
        // Voice input
        voice.addEventListener('click', () => this.toggleVoiceInput());
        
        // File attachment
        attachment.addEventListener('click', () => this.handleFileAttachment());
        
        // Quick actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-action-btn')) {
                this.handleQuickAction(e.target.dataset.action);
            }
        });

        // Auto-resize input
        input.addEventListener('input', () => this.autoResizeInput());
    }

    toggleChatbot() {
        if (this.isOpen) {
            this.closeChatbot();
        } else {
            this.openChatbot();
        }
    }

    openChatbot() {
        const container = document.getElementById('chatbotContainer');
        const toggle = document.getElementById('chatbotToggle');
        const notification = document.getElementById('chatbotNotification');
        
        container.classList.add('chatbot-open');
        toggle.classList.add('chatbot-active');
        notification.style.display = 'none';
        this.isOpen = true;
        
        // Focus input
        setTimeout(() => {
            document.getElementById('chatbotInput').focus();
        }, 300);
    }

    closeChatbot() {
        const container = document.getElementById('chatbotContainer');
        const toggle = document.getElementById('chatbotToggle');
        
        container.classList.remove('chatbot-open');
        toggle.classList.remove('chatbot-active');
        this.isOpen = false;
    }

    minimizeChatbot() {
        const container = document.getElementById('chatbotContainer');
        container.classList.toggle('chatbot-minimized');
    }

    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Update conversation context
        this.updateConversationContext(message);
        
        // Add user message with enhanced UI
        this.addMessage('user', message);
        input.value = '';
        
        // Show typing indicator with realistic delay
        this.showTypingIndicator();
        
        try {
            // Enhanced API call with session context
            const response = await this.callEnhancedAPI(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add bot response with suggestions
            this.addMessage('bot', response);
            
            // Generate smart suggestions based on response
            this.generateSmartSuggestions(message, response);
            
            // Track analytics
            this.trackMessageAnalytics(message, response);
            
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.hideTypingIndicator();
            
            // Enhanced fallback with context
            const fallbackResponse = await this.getEnhancedContextualResponse(message);
            this.addMessage('bot', fallbackResponse);
        }
    }
    
    updateConversationContext(message) {
        this.conversationContext.push({
            message: message,
            timestamp: new Date().toISOString(),
            type: 'user'
        });
        
        // Keep only last 10 messages for context
        if (this.conversationContext.length > 20) {
            this.conversationContext = this.conversationContext.slice(-20);
        }
    }
    
    async callEnhancedAPI(userMessage) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: this.currentConversationId,
                    context: this.conversationContext.slice(-5), // Send last 5 messages
                    preferences: this.userPreferences
                })
            });

            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.message) {
                // Update context with bot response
                this.conversationContext.push({
                    message: data.message,
                    timestamp: new Date().toISOString(),
                    type: 'bot'
                });
                
                return data.message;
            }
            
            throw new Error('No response from server');
            
        } catch (error) {
            console.error('Enhanced API call failed:', error);
            throw error;
        }
    }
    
    async getEnhancedContextualResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check conversation context for better responses
        const recentContext = this.conversationContext.slice(-3);
        const hasDiscussedBooking = recentContext.some(ctx => 
            ctx.message.toLowerCase().includes('book') || 
            ctx.message.toLowerCase().includes('reservation')
        );
        
        const hasDiscussedLocation = recentContext.some(ctx => 
            ctx.message.toLowerCase().includes('location') || 
            ctx.message.toLowerCase().includes('where')
        );
        
        // Context-aware responses
        if (hasDiscussedBooking && (lowerMessage.includes('yes') || lowerMessage.includes('proceed'))) {
            return "Perfect! 🎉 Let me help you proceed with your booking. I'll need:\n\n1. Your preferred destination\n2. Check-in and check-out dates\n3. Number of guests\n4. Budget range\n\nWhat destination are you interested in?";
        }
        
        if (hasDiscussedLocation && (lowerMessage.includes('more') || lowerMessage.includes('other'))) {
            return "Of course! Here are more amazing destinations we serve:\n\n🏝️ **Tropical Islands**: Maldives, Bali, Hawaii\n🏔️ **Mountain Escapes**: Swiss Alps, Rockies, Himalayas\n🏛️ **Historic Cities**: Rome, Paris, Istanbul\n🌴 **Beach Paradises**: Caribbean, Thailand, Greece\n\nWhich type of destination excites you most?";
        }
        
        // Enhanced default responses with personality
        if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
            return "I'm excited to help you with your booking! 🏨 Let me guide you through our streamlined process:\n\n✨ **Step 1**: Choose your destination\n📅 **Step 2**: Select your dates\n🏠 **Step 3**: Pick your property\n💳 **Step 4**: Complete booking\n\nWhat amazing destination are you dreaming of?";
        }
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            const greetings = [
                "Hello there! 👋 I'm thrilled to help you plan your perfect getaway! What adventure are you looking for?",
                "Hi! 🌟 Welcome to TravaCasa! I'm here to turn your travel dreams into reality. How can I assist you today?",
                "Hey! ✨ Ready to discover your next amazing destination? I'm here to help you every step of the way!"
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        // Continue with existing contextual responses...
        return this.getContextualResponse(message);
    }
    
    generateSmartSuggestions(userMessage, botResponse) {
        const lowerMessage = userMessage.toLowerCase();
        const suggestions = [];
        
        if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
            suggestions.push(
                "Check availability for specific dates",
                "Compare different property types",
                "Learn about cancellation policies"
            );
        }
        
        if (lowerMessage.includes('location') || lowerMessage.includes('destination')) {
            suggestions.push(
                "Show me properties in this area",
                "What are the local attractions?",
                "Tell me about the neighborhood"
            );
        }
        
        if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            suggestions.push(
                "Show me budget-friendly options",
                "Compare prices for different dates",
                "Are there any current discounts?"
            );
        }
        
        if (suggestions.length > 0) {
            this.displaySuggestions(suggestions);
        }
    }
    
    displaySuggestions(suggestions) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'chatbot-suggestions';
        
        const suggestionHTML = suggestions.map(suggestion => 
            `<button class="suggestion-btn" onclick="this.parentElement.parentElement.querySelector('.chatbot-input').value='${suggestion}'; this.parentElement.parentElement.querySelector('.chatbot-send-btn').click();">${suggestion}</button>`
        ).join('');
        
        suggestionElement.innerHTML = `
            <div class="suggestion-header">💡 You might also want to ask:</div>
            <div class="suggestion-buttons">${suggestionHTML}</div>
        `;
        
        messagesContainer.appendChild(suggestionElement);
        this.scrollToBottom();
    }
    
    trackMessageAnalytics(userMessage, botResponse) {
        const analytics = {
            timestamp: new Date().toISOString(),
            sessionId: this.currentConversationId,
            userMessage: userMessage,
            botResponse: botResponse,
            responseTime: Date.now() - this.lastMessageTime,
            context: this.conversationContext.length
        };
        
        this.responseAnalytics.push(analytics);
        
        // Keep only last 50 analytics entries
        if (this.responseAnalytics.length > 50) {
            this.responseAnalytics = this.responseAnalytics.slice(-50);
        }
        
        // Save analytics to localStorage
        try {
            localStorage.setItem('travacasa_chat_analytics', JSON.stringify(this.responseAnalytics));
        } catch (error) {
            console.error('Error saving analytics:', error);
        }
    }

    /**
     * Calls the backend endpoint, which should be configured to use Hugging Face API.
     * The backend must handle the Hugging Face API key and request.
     * Returns the AI's response as a string.
     */
    async callHuggingFaceAPI(userMessage) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage
                })
            });

            if (!response.ok) {
                throw new Error(`Server Error: ${response.status}`);
            }

            const data = await response.json();
            
            // The backend should return { success: true, message: "AI response" }
            if (data.success && data.message) {
                return data.message;
            }
            
            throw new Error('No response from server');
            
        } catch (error) {
            console.error('Server API call failed:', error);
            throw error;
        }
    }

    async getContextualResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Travel and accommodation related responses
        if (lowerMessage.includes('book') || lowerMessage.includes('reservation')) {
            return "I'd be happy to help you with booking! 🏨 To make a reservation, please:\n\n1. Browse our available properties\n2. Select your preferred dates\n3. Choose your desired property\n4. Complete the booking process\n\nWould you like me to help you find properties in a specific location?";
        }
        
        if (lowerMessage.includes('property') || lowerMessage.includes('listing')) {
            return "Great question about properties! 🏡 TravaCasa offers various types of accommodations:\n\n• Apartments & Condos\n• Houses & Villas\n• Hotels & Resorts\n• Unique stays\n\nWhat type of property are you looking for, and in which location?";
        }
        
        if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            return "Property prices vary based on location, size, and amenities. 💰 Here are some factors that affect pricing:\n\n• Location and demand\n• Property type and size\n• Seasonal availability\n• Included amenities\n\nWould you like me to help you find properties within your budget range?";
        }
        
        if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) {
            return "I understand you need help with cancellation. 📋 Our cancellation policy varies by property:\n\n• Free cancellation: Usually 24-48 hours before\n• Partial refund: Depends on timing\n• Full refund: Available for eligible bookings\n\nPlease check your booking details or contact our support team for specific assistance.";
        }
        
        if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
            return "We have properties in amazing locations worldwide! 🌍 Popular destinations include:\n\n• Beach destinations 🏖️\n• Mountain retreats 🏔️\n• City centers 🏙️\n• Countryside escapes 🌾\n\nWhich type of location interests you most?";
        }
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return "Hello! 👋 Welcome to TravaCasa! I'm here to help you find the perfect accommodation. How can I assist you today?";
        }
        
        if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
            return "I'm here to help! 💪 I can assist you with:\n\n• Finding properties\n• Booking assistance\n• Pricing information\n• Cancellation policies\n• General questions\n\nWhat would you like help with?";
        }
        
        if (lowerMessage.includes('amenities') || lowerMessage.includes('features')) {
            return "Our properties offer great amenities! 🌟 Common features include:\n\n• WiFi & Modern tech\n• Kitchen facilities\n• Parking availability\n• Pool & fitness areas\n• 24/7 support\n\nSpecific amenities vary by property. Would you like to search for properties with particular features?";
        }
        
        // Default response
        return "Thank you for your message! I'm here to help with any questions about TravaCasa properties, bookings, or services. Could you please provide more details about what you're looking for?";
    }

    addMessage(sender, content) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `chatbot-message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (sender === 'user') {
            messageElement.innerHTML = `
                <div class="chatbot-message-content">
                    <p>${content}</p>
                    <span class="chatbot-timestamp">${timestamp}</span>
                </div>
                <div class="chatbot-user-avatar">
                    <i class="fas fa-user"></i>
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="chatbot-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="chatbot-message-content">
                    <p>${content}</p>
                    <span class="chatbot-timestamp">${timestamp}</span>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Save message
        this.messages.push({ sender, content, timestamp });
        this.saveChatHistory();
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('chatbotTyping');
        typingIndicator.style.display = 'flex';
        this.isTyping = true;
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('chatbotTyping');
        typingIndicator.style.display = 'none';
        this.isTyping = false;
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbotMessages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    handleQuickAction(action) {
        const actions = {
            'properties': 'I\'m looking for properties to rent',
            'booking': 'I need help with booking a property',
            'support': 'I need customer support'
        };
        
        const input = document.getElementById('chatbotInput');
        input.value = actions[action] || '';
        this.sendMessage();
    }

    clearConversation() {
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.innerHTML = `
            <div class="chatbot-welcome-message">
                <div class="chatbot-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="chatbot-message-content">
                    <p>👋 Hello! I'm your TravaCasa assistant. How can I help you today?</p>
                    <div class="chatbot-quick-actions">
                        <button class="quick-action-btn" data-action="properties">🏠 Find Properties</button>
                        <button class="quick-action-btn" data-action="booking">📅 Help with Booking</button>
                        <button class="quick-action-btn" data-action="support">💬 Support</button>
                    </div>
                </div>
            </div>
        `;
        this.messages = [];
        this.saveChatHistory();
    }

    toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        const voiceBtn = document.getElementById('chatbotVoice');
        const input = document.getElementById('chatbotInput');

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            voiceBtn.classList.add('chatbot-voice-active');
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('chatbot-voice-active');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceBtn.classList.remove('chatbot-voice-active');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.start();
    }

    handleFileAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf,.doc,.docx';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processFileAttachment(file);
            }
        };
        
        input.click();
    }

    processFileAttachment(file) {
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        
        this.addMessage('user', `📎 Attached file: ${fileName} (${fileSize} MB)`);
        this.addMessage('bot', `Thank you for sharing the file "${fileName}". I've received it! How can I help you with this?`);
    }

    autoResizeInput() {
        const input = document.getElementById('chatbotInput');
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    saveChatHistory() {
        try {
            localStorage.setItem('travacasa_chat_history', JSON.stringify(this.messages));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    loadChatHistory() {
        try {
            const history = localStorage.getItem('travacasa_chat_history');
            if (history) {
                this.messages = JSON.parse(history);
                this.renderChatHistory();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    renderChatHistory() {
        const messagesContainer = document.getElementById('chatbotMessages');
        
        this.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `chatbot-message ${message.sender}-message`;
            
            if (message.sender === 'user') {
                messageElement.innerHTML = `
                    <div class="chatbot-message-content">
                        <p>${message.content}</p>
                        <span class="chatbot-timestamp">${message.timestamp}</span>
                    </div>
                    <div class="chatbot-user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                `;
            } else {
                messageElement.innerHTML = `
                    <div class="chatbot-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="chatbot-message-content">
                        <p>${message.content}</p>
                        <span class="chatbot-timestamp">${message.timestamp}</span>
                    </div>
                `;
            }
            
            messagesContainer.appendChild(messageElement);
        });
        
        this.scrollToBottom();
    }

    initializeQuickResponses() {
        // Add quick response suggestions
        const quickResponses = [
            'Show me available properties',
            'How do I make a booking?',
            'What are your cancellation policies?',
            'Help with payment issues',
            'Contact customer support'
        ];
        
        // You can implement quick response UI here if needed
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if chatbot should be loaded
    if (window.location.pathname !== '/admin' && window.location.pathname !== '/login') {
        new TravaCasaChatBot();
    }
});
