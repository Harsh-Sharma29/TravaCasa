const express = require('express');
const fetch = require("node-fetch");
const path = require('path');
const mongoose = require('mongoose');
const Listing = require("./models/listing.js");
const app = express();
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
const ejsMate = require('ejs-mate');
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const Review = require("./models/review.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require("./models/user.js");
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const { Client } = require('@googlemaps/google-maps-services-js');
const { processVoiceQuery, searchWebForTravelInfo, generateSearchSuggestions, findNearbyListings } = require('./utils/searchHelpers');
const { isLoggedIn } = require('./middleware/auth');

// Ollama Llama2 integration (direct API calls)
// Note: Using direct Ollama API instead of LangChain for better control

// Cloudinary configuration
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
    api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'travacasa-listings',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});


const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// connecting to the database
const dbURL = process.env.ATLASDB_URL;

// Validate required environment variables
if (!dbURL) {
    console.error("❌ ATLASDB_URL environment variable is required!");
    process.exit(1);
}

if (!process.env.SECRET) {
    console.error("❌ SECRET environment variable is required for session security!");
    process.exit(1);
}

main()
    .then(() => {
        console.log("connected to database")
    })
    .catch((err) => {
        console.log("error in connecting to database", err)
    });
async function main() {
    try {
        await mongoose.connect(dbURL);
        console.log("✅ Connected to MongoDB Atlas successfully");
    } catch (err) {
        console.error("❌ Error connecting to database:", err.message);
        console.error("💡 Check ATLASDB_URL and IP whitelist in MongoDB Atlas");
        process.exit(1);
    }
}


// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejsMate);


const store = MongoStore.create({
    mongoUrl: dbURL,
    touchAfter: 24 * 3600, // time period in seconds
    crypto: {
        secret: process.env.SECRET, // Use a strong secret in production
    }
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false, // Changed to false for production security
    name: 'sessionId', // Custom session name for security
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Define the local strategy
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for chatbot endpoint
const chatbotLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 chatbot requests per minute
    message: 'Too many chatbot requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

// port configuration
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

/* ===============================
   AI CHATBOT API (OLLAMA) - WITH MONGODB INTEGRATION
================================ */

// Helper function to detect if user is asking about properties/listings
function isPropertyQuery(message) {
  const lowerMessage = message.toLowerCase();
  const propertyKeywords = [
    'property', 'properties', 'listing', 'listings', 'accommodation', 'accommodations',
    'place', 'places', 'stay', 'rental', 'rentals', 'hotel', 'hotels', 'apartment', 'apartments',
    'villa', 'villas', 'house', 'houses', 'room', 'rooms', 'find', 'search', 'show', 'available',
    'location', 'locations', 'city', 'cities', 'country', 'countries', 'price', 'prices',
    'cheap', 'expensive', 'budget', 'affordable', 'near', 'nearby', 'in', 'at'
  ];
  
  return propertyKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Helper function to extract search terms from user message
function extractSearchTerms(message) {
  const lowerMessage = message.toLowerCase();
  const searchTerms = [];
  
  // Remove common stop words and property-related words for better extraction
  const stopWords = ['the', 'and', 'for', 'are', 'with', 'this', 'that', 'find', 'show', 'search', 
                     'want', 'need', 'looking', 'for', 'a', 'an', 'in', 'at', 'near', 'around',
                     'apartment', 'house', 'villa', 'hotel', 'property', 'listing', 'properties', 'listings',
                     'places', 'place', 'stay', 'stays', 'available', 'availability'];
  
  // Extract location names (capitalized words, likely place names)
  const words = message.split(/\s+/);
  const locationWords = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:]/g, ''); // Remove punctuation
    const lowerWord = word.toLowerCase();
    
    // Skip stop words and very short words
    if (stopWords.includes(lowerWord) || word.length < 2) {
      continue;
    }
    
    // If word starts with capital letter (likely a location name)
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      locationWords.push(word);
    } else if (locationWords.length > 0) {
      // Continue building location name if previous word was capitalized
      locationWords.push(word);
    }
  }
  
  // Add location phrases
  if (locationWords.length > 0) {
    // Group consecutive capitalized words as potential location names
    let currentLocation = [];
    for (let i = 0; i < locationWords.length; i++) {
      if (locationWords[i][0] === locationWords[i][0].toUpperCase()) {
        currentLocation.push(locationWords[i]);
      } else {
        if (currentLocation.length > 0) {
          searchTerms.push(currentLocation.join(' '));
          currentLocation = [];
        }
        currentLocation.push(locationWords[i]);
      }
    }
    if (currentLocation.length > 0) {
      searchTerms.push(currentLocation.join(' '));
    }
  }
  
  // Extract meaningful keywords (longer words that aren't stop words)
  const keywords = words
    .map(w => w.replace(/[.,!?;:]/g, '').toLowerCase())
    .filter(w => w.length > 3 && !stopWords.includes(w) && !searchTerms.some(st => st.toLowerCase().includes(w)))
    .slice(0, 3);
  
  searchTerms.push(...keywords);
  
  // Extract price-related terms (but don't add as search term, handled separately)
  // This is just for reference in the query function
  
  // If still no terms, use filtered words from message
  if (searchTerms.length === 0) {
    const filteredWords = words
      .map(w => w.replace(/[.,!?;:]/g, ''))
      .filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
    if (filteredWords.length > 0) {
      searchTerms.push(filteredWords.slice(0, 2).join(' '));
    }
  }
  
  // Remove duplicates and empty strings
  return [...new Set(searchTerms.filter(term => term.trim().length > 0))];
}

// Helper function to query MongoDB for listings based on user query
async function queryListingsForChatbot(message) {
  try {
    const searchTerms = extractSearchTerms(message);
    const lowerMessage = message.toLowerCase();
    
    // Build search query
    let query = {};
    
    // Check if it's a price-related query
    const isBudgetQuery = lowerMessage.includes('cheap') || lowerMessage.includes('budget') || lowerMessage.includes('affordable');
    const isLuxuryQuery = lowerMessage.includes('expensive') || lowerMessage.includes('luxury') || lowerMessage.includes('premium');
    
    if (searchTerms.length > 0) {
      // Search in title, description, location, and country using regex
      // Combine all search terms into one regex pattern for better matching
      const searchPattern = searchTerms.join('|');
      query.$or = [
        { title: { $regex: searchPattern, $options: 'i' } },
        { description: { $regex: searchPattern, $options: 'i' } },
        { location: { $regex: searchPattern, $options: 'i' } },
        { country: { $regex: searchPattern, $options: 'i' } }
      ];
    }
    
    // Apply price filter if mentioned
    if (isBudgetQuery) {
      // Budget: less than average price (assuming average around 100-150)
      query.price = { $lt: 150 };
    } else if (isLuxuryQuery) {
      // Luxury: higher than average
      query.price = { $gt: 200 };
    }
    
    // Execute query
    let listings;
    if (Object.keys(query).length > 0) {
      listings = await Listing.find(query)
        .limit(5)
        .sort({ createdAt: -1 })
        .populate('owner', 'username')
        .populate('reviews');
    } else {
      // If no specific search terms, return recent listings
      listings = await Listing.find({})
        .limit(5)
        .sort({ createdAt: -1 })
        .populate('owner', 'username')
        .populate('reviews');
    }
    
    // Format listings for AI prompt
    return listings.map(listing => {
      const avgRating = listing.reviews && listing.reviews.length > 0
        ? (listing.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / listing.reviews.length).toFixed(1)
        : 'No ratings yet';
      
      return {
        id: listing._id.toString(),
        title: listing.title,
        description: listing.description.substring(0, 150) + (listing.description.length > 150 ? '...' : ''),
        location: listing.location,
        country: listing.country,
        price: listing.price,
        rating: avgRating,
        reviewCount: listing.reviews ? listing.reviews.length : 0,
        image: listing.image?.url || ''
      };
    });
  } catch (error) {
    console.error('Error querying listings for chatbot:', error);
    return [];
  }
}

// Enhanced chatbot endpoint with MongoDB integration
app.post("/api/chatbot", chatbotLimiter, async (req, res) => {
  try {
    const { message, sessionId = "default", context = [] } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    // Check if user is asking about properties
    const isPropertyRelated = isPropertyQuery(message);
    let databaseResults = [];
    let databaseContext = '';

    // Query MongoDB if it's a property-related query
    if (isPropertyRelated) {
      databaseResults = await queryListingsForChatbot(message);
      
      if (databaseResults.length > 0) {
        databaseContext = `\n\nAVAILABLE PROPERTIES FROM DATABASE:\n${databaseResults.map((listing, index) => 
          `${index + 1}. ${listing.title}
   - Location: ${listing.location}, ${listing.country}
   - Price: $${listing.price} per night
   - Rating: ${listing.rating} (${listing.reviewCount} reviews)
   - Description: ${listing.description}
   - Property ID: ${listing.id}`
        ).join('\n\n')}\n\nIMPORTANT: Reference these actual properties when answering. Include specific details like location, price, and ratings. If user asks about a specific property, use the Property ID to help them find it.`;
      } else {
        databaseContext = '\n\nNOTE: No properties found matching the user\'s query in the database. Apologize and suggest they try different search terms or browse all listings.';
      }
    }

    // Build enhanced prompt with database context
    const prompt = `You are TravaCasa AI Assistant, an expert AI assistant for a travel and accommodation platform.
You help users find properties, bookings, and travel help.
Be polite, helpful, and concise. Use emojis where appropriate to make responses engaging.

${databaseContext}

Conversation Context:
${context.map(c => `- ${c}`).join("\n")}

User: ${message}
Assistant:`;

    // Try Ollama first
    let aiResponse = null;
    let aiSource = "Ollama Llama2";
    
    try {
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
      const ollamaResponse = await fetch(
        `${ollamaBaseUrl}/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama2",
            prompt,
            stream: false,
          }),
        }
      );

      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        if (data.response) {
          aiResponse = data.response;
        }
      }
    } catch (ollamaError) {
      console.warn("⚠️ Ollama not available:", ollamaError.message);
    }

    // Fallback to Hugging Face if Ollama fails
    if (!aiResponse && process.env.HUGGINGFACE_API_KEY) {
      try {
        console.log("🔄 Trying Hugging Face API as fallback...");
        aiResponse = await callHuggingFaceAPI(message, prompt);
        if (aiResponse && !aiResponse.includes("Hugging Face API")) {
          aiSource = "Hugging Face AI";
        } else {
          aiResponse = null; // Reset if HF returned error message
        }
      } catch (hfError) {
        console.warn("⚠️ Hugging Face API failed:", hfError.message);
      }
    }

    // Final fallback to contextual/database response
    if (!aiResponse) {
      if (databaseResults.length > 0) {
        // Create a response based on database results
        aiResponse = `I found ${databaseResults.length} ${databaseResults.length === 1 ? 'property' : 'properties'} that might interest you:\n\n`;
        databaseResults.forEach((listing, index) => {
          aiResponse += `${index + 1}. **${listing.title}** 🏡\n`;
          aiResponse += `   📍 Location: ${listing.location}, ${listing.country}\n`;
          aiResponse += `   💰 Price: $${listing.price} per night\n`;
          aiResponse += `   ⭐ Rating: ${listing.rating} (${listing.reviewCount} ${listing.reviewCount === 1 ? 'review' : 'reviews'})\n`;
          aiResponse += `   📝 ${listing.description}\n\n`;
        });
        aiResponse += `You can view more details by visiting the property page. Would you like to know more about any specific property?`;
        aiSource = "Database + Contextual Response";
      } else {
        aiResponse = getContextualResponse(message);
        aiSource = "Contextual Response";
      }
    }

    res.json({
      success: true,
      message: aiResponse,
      aiSource: aiSource,
      databaseResults: isPropertyRelated ? databaseResults : undefined,
      hasDatabaseData: databaseResults.length > 0
    });
  } catch (err) {
    console.error("❌ Chatbot Error:", err.message);
    res.status(500).json({
      success: false,
      message: "AI service unavailable. Please try again later.",
    });
  }
});


// Signup form route
app.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});


// Signup POST route
app.post("/signup", wrapAsync(async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            req.flash("error", "Passwords do not match.");
            return res.redirect("/signup");
        }
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to TravaCasa! 🎉");
            const redirectUrl = req.session.returnTo || "/listings";
            delete req.session.returnTo;
            res.redirect(redirectUrl);
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}));

// Show login form
app.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

// Handle login
app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        req.flash("success", "Welcome back!!");
        console.log("Redirecting to:", req.session.returnTo); // Debug log
        const redirectUrl = req.session.returnTo || "/listings";
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }
);

// Logout route
app.get("/logout", (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        req.flash("success", "Logged out successfully!");
        res.redirect("/listings");
    });
});

// Profile route
app.get("/profile", isLoggedIn, wrapAsync(async (req, res) => {
    const userListings = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    const userReviews = await Review.find({ author: req.user._id }).populate('listing', 'title').sort({ createdAt: -1 });
    
    res.render("users/profile.ejs", { 
        user: req.user, 
        userListings, 
        userReviews 
    });
}));

// My Listings route
app.get("/my-listings", isLoggedIn, wrapAsync(async (req, res) => {
    const userListings = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.render("users/my-listings.ejs", { userListings });
}));

// Favorites route (placeholder)
app.get("/favorites", isLoggedIn, (req, res) => {
    res.render("users/favorites.ejs");
});

// Bookings route (placeholder)
app.get("/bookings", isLoggedIn, (req, res) => {
    res.render("users/bookings.ejs");
});

// Settings route (placeholder)
app.get("/settings", isLoggedIn, (req, res) => {
    res.render("users/settings.ejs");
});

// Index route to render the listings page
app.get("/listings", wrapAsync(async (req, res) => {
    const { search } = req.query;
    let allListings;
    let searchHistory = [];
    
    if (search && search.trim() !== '') {
        const searchTerm = search.trim();
        
        // Search in title, description, location, and country
        allListings = await Listing.find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { location: { $regex: searchTerm, $options: 'i' } },
                { country: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 }); // Sort by newest first
        
        // Get search history (recent searches) - fixed to avoid distinct + limit error
        try {
            const recentSearches = await Listing.distinct('location', {
                location: { $regex: searchTerm, $options: 'i' }
            });
            
            // Filter and limit the search history manually
            searchHistory = recentSearches
                .filter(item => item !== searchTerm && item && item.trim() !== '')
                .slice(0, 5);
        } catch (error) {
            console.error('Error fetching search history:', error);
            // Fallback: get some recent locations without distinct
            try {
                const fallbackResults = await Listing.find({
                    location: { $regex: searchTerm, $options: 'i' }
                })
                .select('location')
                .limit(10)
                .sort({ createdAt: -1 });
                
                searchHistory = [...new Set(fallbackResults.map(item => item.location))]
                    .filter(item => item !== searchTerm && item && item.trim() !== '')
                    .slice(0, 5);
            } catch (fallbackError) {
                console.error('Fallback search history also failed:', fallbackError);
                searchHistory = [];
            }
        }
    } else {
        allListings = await Listing.find({}).sort({ createdAt: -1 });
    }
    
    res.render("listings/index.ejs", { 
        allListings, 
        searchQuery: search || '',
        searchHistory: searchHistory || []
    });
}));

// Get popular search terms and trending locations
app.get("/api/popular-searches", wrapAsync(async (req, res) => {
    try {
        // Get most common locations
        const popularLocations = await Listing.aggregate([
            { $group: { _id: '$location', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        // Get most common countries
        const popularCountries = await Listing.aggregate([
            { $group: { _id: '$country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        res.json({
            locations: popularLocations
                .filter(item => item._id && item._id.trim() !== '')
                .map(item => ({ name: item._id, count: item.count })),
            countries: popularCountries
                .filter(item => item._id && item._id.trim() !== '')
                .map(item => ({ name: item._id, count: item.count }))
        });
    } catch (error) {
        console.error('Error fetching popular searches:', error);
        res.status(500).json({ 
            error: 'Failed to fetch popular searches',
            message: error.message 
        });
    }
}));

//review route
//Post route 
app.post("/listings/:id/reviews", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    // Find the listing to which the review will be added
    const listing = await Listing.findById(id);

    // Create a new Review object from the form data
    // Assuming your form names are like "review[rating]", "review[comment]"
    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;

    // Add the new review to the listing's reviews array
    listing.reviews.push(newReview);

    // Save the new review and the updated listing
    await newReview.save();
    await listing.save();

    console.log(newReview);
    // Redirect back to the listing's show page to see the new review
    req.flash("success", "New Review Created!"); //flash ka use kro 

    res.redirect(`/listings/${id}`);
}));

//new route 
app.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Voice Search Analytics API
app.post("/api/voice-search", wrapAsync(async (req, res) => {
    try {
        const { transcript, confidence, timestamp } = req.body;
        
        // Log voice search analytics (you can save to database if needed)
        console.log('Voice Search Analytics:', {
            transcript,
            confidence,
            timestamp,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        
        // For now, just return success
        res.json({
            success: true,
            message: 'Voice search analytics recorded',
            processedTranscript: transcript
        });
    } catch (error) {
        console.error('Voice search analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to record voice search analytics',
            message: error.message 
        });
    }
}));

// Enhanced Voice Search with Web Search API Integration
app.post("/api/voice-search-enhanced", wrapAsync(async (req, res) => {
    try {
        const { transcript, confidence, timestamp } = req.body;
        
        // Log voice search analytics
        console.log('Enhanced Voice Search Analytics:', {
            transcript,
            confidence,
            timestamp,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        
        // Process the transcript for better search results
        const processedQuery = await processVoiceQuery(transcript);
        
        // Search in database
        const databaseResults = await searchInDatabase(processedQuery);
        
        // If no results found in database, search web for relevant travel information
        let webResults = [];
        if (databaseResults.length === 0) {
            webResults = await searchWebForTravelInfo(processedQuery);
        }
        
        res.json({
            success: true,
            message: 'Enhanced voice search processed',
            originalTranscript: transcript,
            processedQuery,
            confidence,
            databaseResults,
            webResults,
            suggestions: await generateSearchSuggestions(processedQuery)
        });
    } catch (error) {
        console.error('Enhanced voice search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process enhanced voice search',
            message: error.message 
        });
    }
}));

// Geolocation-based listings API
app.post("/api/nearby-listings", wrapAsync(async (req, res) => {
    try {
        const { latitude, longitude, radius = 10, type = 'all' } = req.body;
        
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }
        
        // Find nearby listings (simplified - in a real app, you'd use geospatial queries)
        const nearbyListings = await findNearbyListings(latitude, longitude, radius);
        
        // Get nearby attractions using Google Maps Places API
        const nearbyAttractions = await getNearbyAttractions(latitude, longitude, type);
        
        res.json({
            success: true,
            location: { latitude, longitude },
            radius,
            listings: nearbyListings,
            attractions: nearbyAttractions,
            count: nearbyListings.length + nearbyAttractions.length
        });
    } catch (error) {
        console.error('Nearby listings error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch nearby listings',
            message: error.message 
        });
    }
}));

// Google Maps Places API endpoint
app.get("/api/places-nearby", wrapAsync(async (req, res) => {
    try {
        const { lat, lng, radius = 1500, type = 'tourist_attraction' } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }
        
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Google Maps API key not configured'
            });
        }
        
        const response = await googleMapsClient.placesNearby({
            params: {
                location: { lat: parseFloat(lat), lng: parseFloat(lng) },
                radius: parseInt(radius),
                type: type,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });
        
        const places = response.data.results.map(place => ({
            id: place.place_id,
            name: place.name,
            rating: place.rating,
            types: place.types,
            vicinity: place.vicinity,
            location: place.geometry.location,
            photos: place.photos ? place.photos.map(photo => ({
                photoReference: photo.photo_reference,
                width: photo.width,
                height: photo.height
            })) : [],
            priceLevel: place.price_level,
            openNow: place.opening_hours?.open_now
        }));
        
        res.json({
            success: true,
            places,
            count: places.length
        });
    } catch (error) {
        console.error('Places API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch nearby places',
            message: error.message 
        });
    }
}));

// Web Search API for travel information
app.get("/api/web-search", wrapAsync(async (req, res) => {
    try {
        const { query, type = 'travel' } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }
        
        const searchResults = await searchWebForTravelInfo(query, type);
        
        res.json({
            success: true,
            query,
            results: searchResults,
            count: searchResults.length
        });
    } catch (error) {
        console.error('Web search error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to perform web search',
            message: error.message 
        });
    }
}));

//Read(Show) route
app.get("/listings/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    id = id.trim(); // Ensure id is trimmed to remove any extra spaces
    const listingDetails = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
    if (!listingDetails) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listingDetails });
}));

//delete review route 
app.delete("/listings/:listingId/reviews/:reviewId", isLoggedIn, wrapAsync(async (req, res) => {
    let { listingId, reviewId } = req.params;

    let review = await Review.findById(reviewId);
    if (!review.author.equals(req.user._id)) {
        req.flash("error", "You are not the author of this review");
        return res.redirect(`/listings/${listingId}`);
    }

    await Listing.findByIdAndUpdate(listingId, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted!");

    res.redirect(`/listings/${listingId}`);
}));

//create route (with file upload)
app.post("/listings", isLoggedIn, upload.single('listing[image][url]'), wrapAsync(async (req, res, next) => {
    try {
        const listingData = req.body.listing;
        const newListing = new Listing(listingData);
        newListing.owner = req.user._id;

        // If a file was uploaded, set the image url and filename
        if (req.file) {
            newListing.image = {
                url: req.file.path, // Cloudinary URL
                filename: req.file.filename || req.file.originalname
            };
        } else {
            // Set default image if no file uploaded
            newListing.image = {
                url: 'https://images.unsplash.com/photo-1527555197883-98e27ca0c1ea?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9',
                filename: ''
            };
        }

        await newListing.save();
        req.flash("success", "New Listing Created!");
        res.redirect("/listings");
    } catch (error) {
        // If there's an error, delete the uploaded file from Cloudinary
        if (req.file && req.file.public_id) {
            try {
                await cloudinary.uploader.destroy(req.file.public_id);
            } catch (destroyError) {
                console.error('Error deleting uploaded file from Cloudinary:', destroyError);
            }
        }
        throw error;
    }
}));

// Edit route form deta hai 
app.get("/listings/:id/edit", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    id = id.trim();
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { listing });
}));

// Update route (with file upload)
app.put("/listings/:id", isLoggedIn, 
    upload.single('listing[image][url]'), // Correct field name for file upload
    wrapAsync(async (req, res) => {
    try {
        const { id } = req.params;
        let listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }

        if (!listing.owner.equals(req.user._id)) {
            req.flash("error", "You don't have permission to edit this listing!");
            return res.redirect(`/listings/${id}`);
        }

        // Prepare update data
        const updatedListingData = { ...req.body.listing };

        // Handle new file upload
        if (req.file) {
            // If there was an old image file, delete it from Cloudinary
            if (listing.image && listing.image.filename && listing.image.filename !== '') {
                try {
                    // Extract public_id from the old image URL if it's a Cloudinary URL
                    const oldImageUrl = listing.image.url;
                    if (oldImageUrl.includes('cloudinary.com')) {
                        const publicId = oldImageUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Deleted old image from Cloudinary: ${publicId}`);
                    }
                } catch (destroyError) {
                    console.error(`Error deleting old image from Cloudinary:`, destroyError);
                }
            }

            // Update image details with the newly uploaded file
            updatedListingData.image = {
                url: req.file.path, // Cloudinary URL
                filename: req.file.filename || req.file.originalname
            };
        } else if (req.body.removeImage === 'on') {
            // If user wants to remove the image
            if (listing.image && listing.image.filename && listing.image.filename !== '') {
                try {
                    // Extract public_id from the old image URL if it's a Cloudinary URL
                    const oldImageUrl = listing.image.url;
                    if (oldImageUrl.includes('cloudinary.com')) {
                        const publicId = oldImageUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Deleted old image from Cloudinary due to removal: ${publicId}`);
                    }
                } catch (destroyError) {
                    console.error(`Error deleting old image from Cloudinary (removal case):`, destroyError);
                }
            }
            updatedListingData.image = {
                url: 'https://images.unsplash.com/photo-1527555197883-98e27ca0c1ea?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9',
                filename: ''
            };
        } else {
            // If no new file uploaded, keep the existing image
            updatedListingData.image = listing.image;
        }

        // Perform a single update operation
        const updatedListing = await Listing.findByIdAndUpdate(id, updatedListingData, { new: true, runValidators: true });

        if (!updatedListing) {
            req.flash("error", "Failed to update listing.");
            return res.redirect("/listings");
        }

        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    } catch (error) {
        // If there's an error, delete the uploaded file from Cloudinary
        if (req.file && req.file.public_id) {
            try {
                await cloudinary.uploader.destroy(req.file.public_id);
            } catch (destroyError) {
                console.error('Error deleting uploaded file from Cloudinary:', destroyError);
            }
        }
        throw error;
    }
}));

// Delete route
app.delete("/listings/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    
    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You don't have permission to delete this listing!");
        return res.redirect(`/listings/${id}`);
    }
    
    // Delete the associated image file from Cloudinary if it exists
    if (listing.image && listing.image.url && listing.image.url.includes('cloudinary.com')) {
        try {
            // Extract public_id from the image URL
            const imageUrl = listing.image.url;
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted image from Cloudinary: ${publicId}`);
        } catch (destroyError) {
            console.error(`Error deleting image from Cloudinary:`, destroyError);
        }
    }
    
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}));

// Helper functions for enhanced search and geolocation

// Search in database using processed query
async function searchInDatabase(processedQuery) {
    try {
        const searchTerm = processedQuery.location || processedQuery.processed;
        
        const results = await Listing.find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { location: { $regex: searchTerm, $options: 'i' } },
                { country: { $regex: searchTerm, $options: 'i' } }
            ]
        }).limit(10).sort({ createdAt: -1 });
        
        return results.map(listing => ({
            id: listing._id,
            title: listing.title,
            description: listing.description,
            location: listing.location,
            country: listing.country,
            price: listing.price,
            image: listing.image,
            type: 'database_listing'
        }));
    } catch (error) {
        console.error('Error searching database:', error);
        return [];
    }
}

// Get nearby attractions using Google Maps Places API
async function getNearbyAttractions(latitude, longitude, type) {
    try {
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            console.log('Google Maps API key not configured');
            return [];
        }
        
        const placeTypes = {
            'all': 'tourist_attraction',
            'restaurants': 'restaurant',
            'hospitals': 'hospital',
            'cafes': 'cafe',
            'attractions': 'tourist_attraction',
            'shopping': 'shopping_mall'
        };
        
        const searchType = placeTypes[type] || 'tourist_attraction';
        
        const response = await googleMapsClient.placesNearby({
            params: {
                location: { lat: latitude, lng: longitude },
                radius: 2000,
                type: searchType,
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });
        
        return response.data.results.slice(0, 10).map(place => ({
            id: place.place_id,
            name: place.name,
            rating: place.rating,
            types: place.types,
            vicinity: place.vicinity,
            location: place.geometry.location,
            priceLevel: place.price_level,
            photos: place.photos ? place.photos.slice(0, 1).map(photo => ({
                photoReference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${photo.width}&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            })) : [],
            type: 'attraction'
        }));
    } catch (error) {
        console.error('Error fetching nearby attractions:', error);
        return [];
    }
}

// Initialize LangChain Llama2 System
let llama2Chain = null;
let conversationMemory = new Map();

// Initialize Ollama Llama2 connection
let ollamaClient = null;

async function initializeOllamaLlama2() {
    try {
        const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        
        // Test connection to Ollama
        const testResponse = await fetch(`${baseUrl}/api/tags`);
        if (!testResponse.ok) {
            throw new Error(`Ollama server not accessible at ${baseUrl}`);
        }
        
        const models = await testResponse.json();
        const llama2Available = models.models && models.models.some(model => 
            model.name.includes('llama2')
        );
        
        if (!llama2Available) {
            console.warn('⚠️ Llama2 model not found in Ollama. Available models:', models.models?.map(m => m.name) || []);
        }
        
        ollamaClient = baseUrl;
        console.log('✅ Ollama Llama2 connection initialized successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Ollama Llama2:', error.message);
        return false;
    }
}

// Call Ollama Llama2 function
async function callOllamaLlama2(userMessage, sessionId = 'default', context = []) {
    try {
        // Initialize if not already done
        if (!ollamaClient) {
            const initialized = await initializeOllamaLlama2();
            if (!initialized) {
                throw new Error('Ollama Llama2 initialization failed');
            }
        }

        // Get conversation context
        const conversationContext = getConversationContext(sessionId);
        const recentContext = conversationContext.slice(-5); // Last 5 messages
        
        // Create the prompt with TravaCasa context
        const prompt = `You are TravaCasa AI Assistant, an expert AI assistant for a travel and accommodation platform. You can answer questions about travel, properties, bookings, and general knowledge. Be helpful, clear, and concise. Use emojis where appropriate to make responses engaging.

${recentContext.length > 0 ? `Recent conversation context:
${recentContext.join('\n')}

` : ''}User Question: ${userMessage}

TravaCasa Assistant:`;

        // Call Ollama API
        const response = await fetch(`${ollamaClient}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama2',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 500
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.response) {
            throw new Error('No response from Ollama');
        }

        return data.response.trim();
    } catch (error) {
        console.error('Ollama Llama2 call failed:', error);
        throw error;
    }
}

// Conversation context management for LangChain
function getConversationContext(sessionId) {
    return conversationMemory.get(sessionId) || [];
}

function updateConversationContext(sessionId, message) {
    const context = getConversationContext(sessionId);
    context.push(message);
    
    // Keep only last 10 messages for context
    if (context.length > 10) {
        context.splice(0, context.length - 10);
    }
    
    conversationMemory.set(sessionId, context);
}

// Enhanced Hugging Face API function with better error handling
async function callHuggingFaceAPI(userMessage, fullPrompt = null) {
    try {
        // Check if Hugging Face API key is available
        if (!process.env.HUGGINGFACE_API_KEY) {
            throw new Error('Hugging Face API key not configured');
        }

        // Use a better model for text generation - meta-llama/Llama-2-7b-chat-hf or gpt2 for faster response
        // Using a more reliable endpoint and model
        const modelUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';
        
        // Use the full prompt if available, otherwise just the user message
        const inputText = fullPrompt || userMessage;
        
        const response = await fetch(modelUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: inputText,
                parameters: {
                    max_new_tokens: 200,
                    temperature: 0.7,
                    top_p: 0.9,
                    return_full_text: false
                },
                options: {
                    wait_for_model: true // Wait for model to load if needed
                }
            })
        });

        // Handle different response statuses
        if (response.status === 503) {
            // Model is loading, wait and retry once
            console.log('⏳ Hugging Face model is loading, waiting...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
            const retryResponse = await fetch(modelUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: inputText,
                    parameters: {
                        max_new_tokens: 200,
                        temperature: 0.7,
                        return_full_text: false
                    },
                    options: {
                        wait_for_model: true
                    }
                })
            });
            
            if (!retryResponse.ok) {
                throw new Error(`Hugging Face API error: ${retryResponse.status} - Model may still be loading`);
            }
            
            const retryData = await retryResponse.json();
            return processHuggingFaceResponse(retryData, userMessage);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return processHuggingFaceResponse(data, userMessage);
        
    } catch (error) {
        console.error('❌ Hugging Face API call failed:', error.message);
        // Don't throw, return null so caller can use other fallback
        return null;
    }
}

// Helper function to process Hugging Face API response
function processHuggingFaceResponse(data, originalMessage) {
    // Handle different response formats
    if (Array.isArray(data) && data.length > 0) {
        // Format: [{ generated_text: "..." }]
        if (data[0].generated_text) {
            return data[0].generated_text.trim();
        }
    } else if (data.generated_text) {
        // Format: { generated_text: "..." }
        return data.generated_text.trim();
    } else if (data[0] && typeof data[0] === 'string') {
        // Format: ["generated text"]
        return data[0].trim();
    } else if (data.error) {
        // API returned an error
        console.error('Hugging Face API error:', data.error);
        return null;
    }
    
    // If we can't parse the response, return null
    console.warn('⚠️ Unexpected Hugging Face response format:', JSON.stringify(data).substring(0, 200));
    return null;
}

// Enhanced contextual response function with comprehensive coverage
function getContextualResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Greetings and basic interactions
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('good morning') || lowerMessage.includes('good afternoon') || lowerMessage.includes('good evening')) {
        return "Hello! 👋 Welcome to TravaCasa! I'm your AI travel assistant, ready to help you find the perfect accommodation for your next adventure. How can I assist you today?";
    }

    // General travel assistance
    if (lowerMessage.includes('travel') || lowerMessage.includes('trip') || lowerMessage.includes('vacation') || lowerMessage.includes('holiday')) {
        return "I'm excited to help you plan your trip! 🌍 I can assist with:\n\n• Finding the perfect accommodation\n• Destination recommendations\n• Booking guidance\n• Travel tips and advice\n• Local attractions and activities\n\nWhat kind of travel experience are you looking for?";
    }

    // Booking and reservations
    if (lowerMessage.includes('book') || lowerMessage.includes('reservation') || lowerMessage.includes('reserve')) {
        return "I'd be happy to help you with booking! 🏨 Here's how to make a reservation:\n\n1. Browse our available properties\n2. Select your preferred dates\n3. Choose your desired property\n4. Complete the booking process\n5. Receive confirmation\n\nWould you like me to help you find properties in a specific location or with particular amenities?";
    }
    
    // Properties and listings
    if (lowerMessage.includes('property') || lowerMessage.includes('listing') || lowerMessage.includes('accommodation') || lowerMessage.includes('stay')) {
        return "Great question about properties! 🏡 TravaCasa offers diverse accommodations:\n\n• **Apartments & Condos** - Modern city living\n• **Houses & Villas** - Spacious family options\n• **Hotels & Resorts** - Full-service luxury\n• **Unique stays** - Boutique experiences\n• **Budget-friendly options** - Affordable comfort\n\nWhat type of property and location interests you most?";
    }
    
    // Pricing and costs
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('expensive') || lowerMessage.includes('cheap') || lowerMessage.includes('budget')) {
        return "Property prices vary based on several factors 💰:\n\n• **Location & Demand** - City center vs. suburbs\n• **Property Type & Size** - Studio to luxury villa\n• **Seasonal Rates** - Peak vs. off-season\n• **Amenities Included** - Pool, kitchen, parking\n• **Length of Stay** - Discounts for longer stays\n\nWhat's your budget range? I can help you find the best value options!";
    }
    
    // Cancellation and refunds
    if (lowerMessage.includes('cancel') || lowerMessage.includes('refund') || lowerMessage.includes('change') || lowerMessage.includes('modify')) {
        return "I understand you need help with changes to your booking 📋:\n\n• **Free cancellation** - Usually 24-48 hours before\n• **Partial refund** - Depends on timing and property\n• **Full refund** - Available for eligible bookings\n• **Modification options** - Date or guest changes\n\nPlease check your booking confirmation email for specific policy details, or contact our support team for personalized assistance.";
    }
    
    // Locations and destinations
    if (lowerMessage.includes('location') || lowerMessage.includes('where') || lowerMessage.includes('destination') || lowerMessage.includes('city') || lowerMessage.includes('country')) {
        return "We have properties in amazing locations worldwide! 🌍 Popular destinations include:\n\n• **Beach destinations** 🏖️ - Coastal retreats\n• **Mountain retreats** 🏔️ - Scenic escapes\n• **City centers** 🏙️ - Urban experiences\n• **Countryside** 🌾 - Peaceful getaways\n• **Historic towns** 🏛️ - Cultural immersion\n\nWhich type of location or specific destination interests you most?";
    }
    
    // Help and support
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('assistance') || lowerMessage.includes('question')) {
        return "I'm here to help! 💪 I can assist you with:\n\n• **Finding properties** - Search by location, price, amenities\n• **Booking assistance** - Step-by-step guidance\n• **Pricing information** - Compare rates and deals\n• **Cancellation policies** - Understanding terms\n• **Travel recommendations** - Local tips and attractions\n• **General questions** - Any TravaCasa inquiry\n\nWhat would you like help with specifically?";
    }
    
    // Amenities and features
    if (lowerMessage.includes('amenities') || lowerMessage.includes('features') || lowerMessage.includes('facilities') || lowerMessage.includes('services')) {
        return "Our properties offer fantastic amenities! 🌟 Common features include:\n\n• **WiFi & Tech** - High-speed internet, smart TVs\n• **Kitchen facilities** - Full or kitchenette options\n• **Parking** - Free or paid options available\n• **Pool & Fitness** - Recreation facilities\n• **24/7 Support** - Always here to help\n• **Cleaning services** - Regular housekeeping\n• **Pet-friendly** - Many properties welcome pets\n\nAre you looking for specific amenities or features?";
    }

    // Availability and dates
    if (lowerMessage.includes('available') || lowerMessage.includes('dates') || lowerMessage.includes('when') || lowerMessage.includes('calendar')) {
        return "Great question about availability! 📅 To check dates:\n\n• **Real-time availability** - Updated instantly\n• **Flexible dates** - Find the best rates\n• **Seasonal availability** - Peak and off-season options\n• **Last-minute bookings** - Often available\n• **Extended stays** - Weekly/monthly discounts\n\nWhat dates are you considering for your stay?";
    }

    // Reviews and ratings
    if (lowerMessage.includes('review') || lowerMessage.includes('rating') || lowerMessage.includes('feedback') || lowerMessage.includes('quality')) {
        return "Reviews help you make informed decisions! ⭐ Here's what to look for:\n\n• **Guest ratings** - Overall satisfaction scores\n• **Detailed reviews** - Real guest experiences\n• **Recent feedback** - Up-to-date information\n• **Property highlights** - What guests love most\n• **Areas for improvement** - Honest feedback\n\nWould you like help finding highly-rated properties in your preferred location?";
    }

    // Safety and security
    if (lowerMessage.includes('safe') || lowerMessage.includes('security') || lowerMessage.includes('covid') || lowerMessage.includes('clean')) {
        return "Your safety is our priority! 🔒 TravaCasa ensures:\n\n• **Enhanced cleaning** - Professional sanitization\n• **Health protocols** - Following local guidelines\n• **Secure bookings** - Protected payment systems\n• **Verified properties** - Quality-checked accommodations\n• **24/7 support** - Always available for emergencies\n• **Safe neighborhoods** - Carefully selected locations\n\nWhat safety or cleanliness questions do you have?";
    }

    // Contact and communication
    if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email') || lowerMessage.includes('reach')) {
        return "You can reach us anytime! 📞 Contact options:\n\n• **Live chat** - Right here with me!\n• **24/7 support** - Always available\n• **Email support** - Detailed inquiries\n• **Phone support** - Speak with our team\n• **Property managers** - Local assistance\n• **Emergency support** - Urgent situations\n\nI'm here to help immediately - what do you need assistance with?";
    }

    // General questions that don't fit specific categories
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why') || lowerMessage.includes('when') || lowerMessage.includes('?')) {
        return "I'm here to answer your questions! 🤔 I can help with:\n\n• **Property details** - Amenities, location, pricing\n• **Booking process** - Step-by-step guidance\n• **Travel planning** - Destination recommendations\n• **TravaCasa services** - What we offer\n• **General inquiries** - Any other questions\n\nWhat specific information are you looking for?";
    }
    
    // Default response for unmatched queries
    return "Thank you for your message! I'm your TravaCasa AI assistant, ready to help with any questions about properties, bookings, travel planning, or our services. Could you please provide more details about what you're looking for? I'm here to make your travel experience amazing! ✈️🏨";
}

// Multer error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            req.flash("error", "File too large. Maximum size is 5MB.");
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            req.flash("error", "Unexpected file field.");
        } else {
            req.flash("error", "File upload error: " + error.message);
        }
        return res.redirect('back');
    }
    
    if (error.message === 'Only image files are allowed!') {
        req.flash("error", "Only image files are allowed!");
        return res.redirect('back');
    }
    
    next(error);
});

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something Went Wrong!" } = err; // Default to 500 Internal Server Error
    res.status(statusCode).send(message); // Send the error status and message
    console.error(err.stack); // Log the error stack for debugging
});

