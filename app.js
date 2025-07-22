const express = require('express');
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
require('dotenv').config();
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const { Client } = require('@googlemaps/google-maps-services-js');
const { processVoiceQuery, searchWebForTravelInfo, generateSearchSuggestions, findNearbyListings } = require('./utils/searchHelpers');
const { isLoggedIn } = require('./middleware/auth');

// Import LangChain components for Llama2 integration
const { ChatOllama } = require('@langchain/ollama');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const { ConversationSummaryMemory } = require('langchain/memory');
const { ChatMessageHistory } = require('langchain/stores/message/in_memory');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
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
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// connecting to the database
const dbURL = process.env.ATLASDB_URL;
main()
    .then(() => {
        console.log("connected to database")
    })
    .catch((err) => {
        console.log("error in connecting to database", err)
    });
async function main() {
    await mongoose.connect(dbURL);
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
    secret: process.env.SECRET, // Replace with a strong secret in production
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }, // Set to true if using HTTPS
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Define the local strategy
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

// port configuration
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Server is running on port ");
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

// Chatbot API endpoint with LangChain and Llama2 integration
app.post("/api/chatbot", wrapAsync(async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        let botResponse;
        try {
            // Try LangChain with Llama2 first
            botResponse = await callLangChainLlama2(message);
        } catch (aiError) {
            console.error('LangChain Llama2 error:', aiError);
            try {
                // Fallback to Hugging Face API
                botResponse = await callHuggingFaceAPI(message);
            } catch (hfError) {
                console.error('Hugging Face API error:', hfError);
                // Final fallback to contextual response
                botResponse = getContextualResponse(message);
            }
        }

        res.json({
            success: true,
            message: botResponse,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Chatbot API error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process message',
            message: "I apologize, but I'm having trouble responding right now. Please try again later."
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
                url: `/uploads/${req.file.filename}`,
                filename: req.file.filename
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
        // If there's an error, delete the uploaded file
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
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
            // If there was an old image file, delete it
            if (listing.image && listing.image.filename && listing.image.filename !== '') {
                const oldImagePath = path.join(__dirname, 'public', 'uploads', listing.image.filename);
                try {
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log(`Deleted old image: ${oldImagePath}`);
                    }
                } catch (unlinkError) {
                    console.error(`Error deleting old image ${oldImagePath}:`, unlinkError);
                }
            }

            // Update image details with the newly uploaded file
            updatedListingData.image = {
                url: `/uploads/${req.file.filename}`,
                filename: req.file.filename
            };
        } else if (req.body.removeImage === 'on') {
            // If user wants to remove the image
            if (listing.image && listing.image.filename && listing.image.filename !== '') {
                const oldImagePath = path.join(__dirname, 'public', 'uploads', listing.image.filename);
                try {
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log(`Deleted old image due to removal: ${oldImagePath}`);
                    }
                } catch (unlinkError) {
                    console.error(`Error deleting old image (removal case) ${oldImagePath}:`, unlinkError);
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
        // If there's an error, delete the uploaded file
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
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
    
    // Delete the associated image file if it exists
    if (listing.image && listing.image.filename && listing.image.filename !== '') {
        const imagePath = path.join(__dirname, 'public', 'uploads', listing.image.filename);
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`Deleted image file: ${imagePath}`);
            }
        } catch (unlinkError) {
            console.error(`Error deleting image file ${imagePath}:`, unlinkError);
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

// Enhanced AI Chatbot with Advanced Features
class AdvancedChatbotAI {
    constructor() {
        this.conversationHistory = new Map(); // Store conversation context
        this.userPreferences = new Map(); // Store user preferences
        this.intentClassifier = new IntentClassifier();
        this.entityExtractor = new EntityExtractor();
        this.responseGenerator = new ResponseGenerator();
    }

    async processMessage(userMessage, sessionId = 'default') {
        try {
            // Get conversation context
            const context = this.getConversationContext(sessionId);
            
            // Classify intent and extract entities
            const intent = await this.intentClassifier.classify(userMessage, context);
            const entities = await this.entityExtractor.extract(userMessage);
            
            // Update conversation context
            this.updateConversationContext(sessionId, { userMessage, intent, entities });
            
            // Generate response based on intent and entities
            const response = await this.responseGenerator.generate(intent, entities, context);
            
            // Update context with bot response
            this.updateConversationContext(sessionId, { botResponse: response });
            
            return response;
        } catch (error) {
            console.error('Advanced AI processing failed:', error);
            throw error;
        }
    }

    getConversationContext(sessionId) {
        return this.conversationHistory.get(sessionId) || { messages: [], intent: null, entities: [] };
    }

    updateConversationContext(sessionId, data) {
        const context = this.getConversationContext(sessionId);
        context.messages.push(data);
        // Keep only last 10 messages for context
        if (context.messages.length > 10) {
            context.messages = context.messages.slice(-10);
        }
        this.conversationHistory.set(sessionId, context);
    }
}

// Intent Classification System
class IntentClassifier {
    constructor() {
        this.intents = {
            greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
            booking: ['book', 'reserve', 'reservation', 'availability', 'available'],
            search: ['find', 'search', 'look for', 'show me', 'properties'],
            pricing: ['price', 'cost', 'expensive', 'cheap', 'budget', 'how much'],
            cancellation: ['cancel', 'refund', 'change', 'modify', 'policy'],
            support: ['help', 'support', 'assistance', 'problem', 'issue'],
            amenities: ['amenities', 'features', 'facilities', 'services', 'wifi'],
            location: ['location', 'where', 'near', 'around', 'city', 'country'],
            travel_planning: ['plan', 'trip', 'vacation', 'holiday', 'travel'],
            reviews: ['review', 'rating', 'feedback', 'quality', 'recommend'],
            general: ['what', 'how', 'why', 'when', '?', 'tell me', 'explain', 'help me', 'tell me about', 'tell me more about']
        };
    }

    async classify(message, context) {
        const lowerMessage = message.toLowerCase();
        let maxScore = 0;
        let detectedIntent = 'general';

        // Check for intent keywords
        for (const [intent, keywords] of Object.entries(this.intents)) {
            const score = keywords.reduce((acc, keyword) => {
                return acc + (lowerMessage.includes(keyword) ? 1 : 0);
            }, 0);
            
            if (score > maxScore) {
                maxScore = score;
                detectedIntent = intent;
            }
        }

        // Context-based intent refinement
        if (context.messages.length > 0) {
            const lastIntent = context.messages[context.messages.length - 1]?.intent;
            if (lastIntent && this.isFollowUpIntent(lowerMessage, lastIntent)) {
                detectedIntent = lastIntent;
            }
        }

        return detectedIntent;
    }

    isFollowUpIntent(message, lastIntent) {
        const followUps = {
            booking: ['yes', 'sure', 'okay', 'proceed', 'continue'],
            search: ['more', 'other', 'different', 'another'],
            pricing: ['compare', 'cheaper', 'better', 'alternative']
        };
        
        return followUps[lastIntent]?.some(word => message.includes(word)) || false;
    }
}

// Entity Extraction System
class EntityExtractor {
    constructor() {
        this.patterns = {
            location: /\b(?:in|at|near|around)\s+([a-zA-Z\s]+?)\b/gi,
            dates: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
            numbers: /\b\d+\b/g,
            propertyType: /\b(apartment|house|villa|hotel|resort|cabin|condo)s?\b/gi,
            amenities: /\b(wifi|pool|parking|kitchen|gym|spa|balcony|garden)\b/gi,
            priceRange: /\$\d+(?:,\d{3})*(?:\.\d{2})?/g
        };
    }

    async extract(message) {
        const entities = {};
        
        for (const [type, pattern] of Object.entries(this.patterns)) {
            const matches = [...message.matchAll(pattern)];
            if (matches.length > 0) {
                entities[type] = matches.map(match => match[1] || match[0]).filter(Boolean);
            }
        }
        
        return entities;
    }
}

// Advanced Response Generation System
class ResponseGenerator {
    constructor() {
        this.templates = {
            greeting: [
                "Hello! How can I help you today?",
                "Hi there! What can I do for you?",
                "Hey! How can I assist you?"
            ],
            booking: [
                "I'd love to help you with your booking! 🏨 Let me guide you through our simple reservation process. What type of property and dates are you considering?",
                "Great choice! 📅 I'll help you secure the perfect accommodation. Do you have specific dates and location preferences?",
                "Perfect! Let's get you booked. 🎯 I'll need some details about your travel dates, group size, and preferred location."
            ],
            search: [
                "I'm excited to help you find the perfect property! 🔍 What type of accommodation are you looking for and in which location?",
                "Let's find your ideal stay! 🏡 Tell me about your preferences - location, property type, and any specific amenities you need.",
                "I'll help you discover amazing properties! 🌟 What's your destination and what kind of experience are you looking for?"
            ],
            pricing: [
                "I'll help you understand our pricing! 💰 Property costs vary based on location, size, season, and amenities. What's your budget range?",
                "Let me break down pricing for you! 📊 Rates depend on several factors. What type of property and location are you considering?",
                "Great question about pricing! 💡 I can help you find properties within your budget. What's your price range and preferred location?"
            ],
            location: [
                "We have properties in amazing destinations worldwide! 🌍 Are you looking for beach, city, mountain, or countryside locations?",
                "I can help you explore fantastic locations! 🗺️ What type of destination appeals to you - urban, coastal, or rural?",
                "Let's find the perfect location for you! 🎯 Are you interested in specific regions or types of destinations?"
            ],
            general: [
                "That's an interesting question! Here's what I know: ...",
                "Let me help you with that! ...",
                "Here's some information: ...",
                "I'm happy to answer any question you have!"
            ]
        };
    }

    async generate(intent, entities, context) {
        try {
            // First try Hugging Face API
            const aiResponse = await this.callHuggingFaceAPI(intent, entities, context);
            if (aiResponse) return aiResponse;
        } catch (error) {
            console.error('Hugging Face API failed:', error);
        }

        // Fallback to template-based response
        return this.generateTemplateResponse(intent, entities, context);
    }

    async callHuggingFaceAPI(intent, entities, context) {
        const apiKey = process.env.HUGGINGFACE_API_KEY;
        
        if (!apiKey) {
            throw new Error('Hugging Face API key not configured');
        }
        
        const models = [
            'microsoft/DialoGPT-large',
            'microsoft/DialoGPT-medium',
            'facebook/blenderbot-400M-distill'
        ];
        
        const contextMessages = context.messages.slice(-3).map(m => m.userMessage).join(' ');
        const entityText = Object.entries(entities).map(([key, values]) => `${key}: ${values.join(', ')}`).join('; ');
        
        const prompt = `You are TravaCasa AI Assistant, an expert AI assistant who can answer any question, including travel, technology, science, math, general knowledge, and more. Be helpful, clear, and concise. Use emojis where appropriate to make responses engaging.\n\nUser: ${message}\nAI:`;
        
        for (const model of models) {
            try {
                const response = await axios.post(`https://api-inference.huggingface.co/models/${model}`, {
                    inputs: prompt,
                    parameters: {
                        max_length: 150,
                        temperature: 0.8,
                        do_sample: true,
                        top_p: 0.9,
                        repetition_penalty: 1.2
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 8000
                });
                
                if (response.data?.[0]?.generated_text) {
                    let responseText = response.data[0].generated_text;
                    const assistantIndex = responseText.lastIndexOf('TravaCasa Assistant:');
                    if (assistantIndex !== -1) {
                        responseText = responseText.substring(assistantIndex + 'TravaCasa Assistant:'.length).trim();
                    }
                    
                    if (responseText && responseText.length > 20) {
                        return responseText;
                    }
                }
            } catch (error) {
                console.error(`Model ${model} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All AI models failed');
    }

    generateTemplateResponse(intent, entities, context) {
        const templates = this.templates[intent] || this.templates.general;
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Personalize with entities
        if (entities.location) {
            return template + ` I noticed you're interested in ${entities.location.join(', ')}. Let me help you find great options there!`;
        }
        
        if (entities.propertyType) {
            return template + ` I see you're looking for ${entities.propertyType.join(' or ')}. I can show you some excellent options!`;
        }
        
        return template;
    }
}

// Initialize Advanced AI System
const advancedAI = new AdvancedChatbotAI();

// Initialize LangChain Llama2 System
let llama2Chain = null;
let conversationMemory = new Map();

// Initialize LangChain with Llama2
async function initializeLangChainLlama2() {
    try {
        // Create Ollama ChatLlama2 instance
        const llama2 = new ChatOllama({
            baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
            model: "llama2", // or "llama2:7b", "llama2:13b" etc.
            temperature: 0.7,
            maxTokens: 500,
            topP: 0.9,
        });

        // Create prompt template for TravaCasa context
        const promptTemplate = PromptTemplate.fromTemplate(`
You are TravaCasa AI Assistant, an expert AI assistant who can answer any question, including travel, technology, science, math, general knowledge, and more. Be helpful, clear, and concise. Use emojis where appropriate to make responses engaging.

Conversation Context: {context}

User Question: {input}

TravaCasa Assistant:`);

        // Create the chain
        llama2Chain = RunnableSequence.from([
            promptTemplate,
            llama2,
            new StringOutputParser()
        ]);

        console.log('✅ LangChain with Llama2 initialized successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize LangChain with Llama2:', error.message);
        return false;
    }
}

// Call LangChain Llama2 function
async function callLangChainLlama2(userMessage, sessionId = 'default') {
    try {
        // Initialize if not already done
        if (!llama2Chain) {
            const initialized = await initializeLangChainLlama2();
            if (!initialized) {
                throw new Error('LangChain Llama2 initialization failed');
            }
        }

        // Get conversation context
        const context = getConversationContext(sessionId);
        
        // Prepare the input
        const input = {
            input: userMessage,
            context: context.slice(-3).join('\n') // Last 3 messages for context
        };

        // Call the chain
        const response = await llama2Chain.invoke(input);
        
        // Update conversation context
        updateConversationContext(sessionId, `User: ${userMessage}`);
        updateConversationContext(sessionId, `Assistant: ${response}`);
        
        return response;
    } catch (error) {
        console.error('LangChain Llama2 call failed:', error);
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

// Legacy function for backward compatibility
async function callHuggingFaceAPI(userMessage) {
    return await advancedAI.processMessage(userMessage);
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
