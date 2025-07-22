# TravaCasa AI Chatbot

## Overview
TravaCasa is a full-featured travel and accommodation platform powered by an advanced AI chatbot. Users can search, filter, and book vacation rentals, get travel advice, and interact with a smart assistant that answers any question—travel-related or general knowledge—using a locally hosted Llama2 model (with cloud fallback).

---

## Features
- **AI Chatbot (Llama2-powered):**
  - Answers any question (travel, tech, science, general knowledge, etc.)
  - Context-aware, multi-turn conversations
  - Voice input, file upload, and quick actions
  - Smart fallback to cloud AI if local model is unavailable
- **Property Listings:**
  - Responsive grid view with filters (category, location, type, price)
  - “Near Me” feature using geolocation
  - Detailed listing pages with reviews and image zoom
- **User System:**
  - Signup, login, and profile management
  - Bookings, favorites, and user listings
- **Modern UI:**
  - Mobile-first, dark mode, smooth animations
  - Accessible and keyboard-friendly

---

## Tech Stack
- **Frontend:** EJS, Bootstrap, Vanilla JS, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **AI Integration:**
  - Local: Llama2 via LangChain/Ollama (http://localhost:11434)
  - Cloud fallback: Hugging Face (DialoGPT, Blenderbot)
- **Other:**
  - Multer (file uploads), Google Maps API (location/places), Passport.js (auth)

---

## Setup & Installation
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd Major-Project-AI-ChatBot
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment variables:**
   - Create a `.env` file in the root with:
     ```
     MONGODB_URI=your_mongodb_uri
     SESSION_SECRET=your_secret
     HUGGINGFACE_API_KEY=your_hf_key
     OLLAMA_BASE_URL=http://localhost:11434
     GOOGLE_MAPS_API_KEY=your_google_maps_key
     ```
4. **Start your local Llama2 server (Ollama, llama.cpp, etc.)**
   - Example for Ollama:
     ```bash
     ollama run llama2
     ```
5. **Start the app:**
   ```bash
   npm start
   # Visit http://localhost:3000
   ```

---

## Usage
- **Chatbot:** Click the chat icon (bottom right) to ask anything—travel, bookings, or general questions.
- **Listings:** Browse, filter, and view property details. Use “Near Me” to find local options.
- **Account:** Sign up to save favorites, manage bookings, and list your own properties.

---

## Deployment
- Deploy to any Node.js-compatible host (Heroku, Render, DigitalOcean, etc.)
- For production, ensure your Llama2 server is accessible or use the Hugging Face fallback.
- Use environment variables for all secrets and API keys.

---

## Customization
- **AI Model:**
  - Change the prompt or model in `app.js` for different behavior.
  - Add more intents/entities/templates for richer fallback responses.
- **UI:**
  - Edit EJS/CSS for branding, themes, or layout changes.
- **APIs:**
  - Integrate more travel APIs, payment gateways, or analytics as needed.

---

## License
This project is for educational and demonstration purposes. For commercial use, review the licenses of all dependencies and AI models.

---

## Credits
- Llama2 (Meta), Hugging Face, LangChain, Ollama, Bootstrap, MongoDB, and all open-source contributors.

---

**Enjoy your AI-powered travel platform!** 