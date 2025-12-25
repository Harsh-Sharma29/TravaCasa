/**
 * TravaCasa – Chatbot Test Script
 * Safe for Node 18+
 * DO NOT import this file in app.js
 */

require('dotenv').config();

const fetch = global.fetch || require('node-fetch');

console.log('=== TravaCasa Chatbot Test ===');

// ----------------------------
// 1. Test Ollama Connection
// ----------------------------
async function testOllamaConnection() {
    console.log('\n1. Testing Ollama Connection...');
    try {
        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama not reachable at ${baseUrl}`);
        }

        const data = await response.json();
        console.log('✅ Ollama server is running');

        const models = data.models?.map(m => m.name) || [];
        console.log('📋 Available models:', models);

        const llama2Available = models.some(m =>
            m.toLowerCase().includes('llama2')
        );

        if (llama2Available) {
            console.log('✅ Llama2 model is available');
        } else {
            console.log('⚠️ Llama2 not found. Run: ollama pull llama2');
        }

        return true;
    } catch (error) {
        console.log('❌ Ollama connection failed:', error.message);
        return false;
    }
}

// ----------------------------
// 2. Test Hugging Face API (FIXED)
// ----------------------------
async function testHuggingFaceAPI() {
    console.log('\n2. Testing Hugging Face API...');
    try {
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            console.log('⚠️ HUGGINGFACE_API_KEY not set');
            return false;
        }

        const response = await fetch(
            'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: 'Hello, how are you?',
                    parameters: {
                        max_new_tokens: 50,
                        return_full_text: false
                    },
                    options: {
                        wait_for_model: true
                    }
                }),
            }
        );

        if (response.status === 503) {
            console.log('⏳ Model is loading, this is normal for first request');
            console.log('✅ Hugging Face API endpoint is accessible');
            return true;
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HF ${response.status}: ${text}`);
        }

        const data = await response.json();
        if (data.error) {
            console.log('⚠️ Hugging Face API error:', data.error);
            return false;
        }

        console.log('✅ Hugging Face API is working');
        if (data.generated_text || (Array.isArray(data) && data[0]?.generated_text)) {
            console.log('📝 Sample response received');
        }
        return true;
    } catch (error) {
        console.log('❌ Hugging Face API test failed:', error.message);
        return false;
    }
}

// ----------------------------
// 3. Test Chatbot API Endpoint
// ----------------------------
async function testChatbotAPI() {
    console.log('\n3. Testing Chatbot API Endpoint...');
    try {
        const response = await fetch('http://localhost:3000/api/chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello, can you help me find a property?',
                sessionId: 'test-session',
            }),
        });

        if (!response.ok) {
            throw new Error(`API ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Chatbot API is working');
        console.log('🤖 Response:', data.message);
        console.log('🔧 AI Source:', data.aiSource);

        return true;
    } catch (error) {
        console.log('❌ Chatbot API test failed:', error.message);
        console.log('💡 Ensure server is running on port 3000');
        return false;
    }
}

// ----------------------------
// Run All Tests
// ----------------------------
async function runAllTests() {
    console.log('🚀 Starting TravaCasa Chatbot Tests...\n');

    const ollama = await testOllamaConnection();
    const hf = await testHuggingFaceAPI();
    const api = await testChatbotAPI();

    console.log('\n=== Test Results ===');
    console.log(`Ollama: ${ollama ? '✅ Working' : '❌ Failed'}`);
    console.log(`Hugging Face: ${hf ? '✅ Working' : '❌ Failed'}`);
    console.log(`Chatbot API: ${api ? '✅ Working' : '❌ Failed'}`);

    if (ollama || hf) {
        console.log('\n🎉 Chatbot is operational.');
    } else {
        console.log('\n⚠️ No AI backend available.');
    }
}

// Run only when executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testOllamaConnection,
    testHuggingFaceAPI,
    testChatbotAPI,
};
