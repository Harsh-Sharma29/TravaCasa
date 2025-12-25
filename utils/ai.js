// utils/ai.js
const fetch = require('node-fetch');

/* ---------------- INTENT DETECTION ---------------- */

function detectIntent(message) {
  const msg = message.toLowerCase();

  if (msg.includes('itinerary') || msg.includes('plan trip') || msg.includes('days')) {
    return 'ITINERARY_PLANNING';
  }

  if (msg.includes('price') || msg.includes('budget') || msg.includes('cost')) {
    return 'PRICE_ESTIMATION';
  }

  if (
    msg.includes('refund') ||
    msg.includes('payment') ||
    msg.includes('support') ||
    msg.includes('travacasa')
  ) {
    return 'WEBSITE_INFO';
  }

  if (
    msg.includes('destination') ||
    msg.includes('beach') ||
    msg.includes('mountain') ||
    msg.includes('travel')
  ) {
    return 'TRAVEL_INFO';
  }

  return 'GENERAL_CHAT';
}

/* ---------------- ITINERARY ---------------- */

function extractTripDetails(message) {
  const daysMatch = message.match(/(\d+)\s*(day|days)/i);
  const destinationMatch = message.match(/to\s([a-zA-Z\s]+)/i);

  return {
    days: daysMatch ? Number(daysMatch[1]) : null,
    destination: destinationMatch ? destinationMatch[1].trim() : null
  };
}

function generateItinerary(destination, days) {
  let text = `🗺️ ${days}-Day Travel Itinerary for ${destination}\n\n`;

  for (let i = 1; i <= days; i++) {
    text += `Day ${i}:
• Morning: Local sightseeing
• Afternoon: Cultural experience
• Evening: Food & leisure
• Tip: Use public transport to save money\n\n`;
  }

  text += `💰 Estimated Budget: ₹${days * 4000} – ₹${days * 7000}`;
  return text;
}

/* ---------------- PRICE ESTIMATION ---------------- */

function priceEstimator(destination = '') {
  return `
💰 Average Stay Prices ${destination ? 'in ' + destination : ''}

🏠 Budget: ₹1,500 – ₹3,000 / night
🏨 Mid-range: ₹4,000 – ₹7,000 / night
✨ Luxury: ₹10,000+ / night

💡 Money-Saving Tips:
• Book early
• Avoid weekends
• Choose local listings
`;
}

/* ---------------- WEBSITE INFO ---------------- */

function websiteInfoHandler() {
  return `
TravaCasa is a travel accommodation platform.

🔹 Book verified stays worldwide
🔹 Secure payments (UPI, cards, wallets)
🔹 Property-based refund policies
🔹 24/7 customer support

Ask me about destinations, pricing, or itinerary planning.
`;
}

/* ---------------- OLLAMA AI ---------------- */

async function ollamaResponse(message, context = []) {
  const prompt = `
You are TravaCasa AI Assistant.
Use conversation context if provided.

Context:
${context.map(c => `${c.type}: ${c.message}`).join('\n')}

User: ${message}
Assistant:
`;

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',
      prompt,
      stream: false
    })
  });

  const data = await res.json();
  return data.response || 'Sorry, I could not generate a response.';
}

module.exports = {
  detectIntent,
  extractTripDetails,
  generateItinerary,
  priceEstimator,
  websiteInfoHandler,
  ollamaResponse
};
