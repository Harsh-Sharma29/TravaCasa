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
            req.flash("success", "Welcome to Wanderlust!");
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

// Add isLoggedIn middleware
function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl; // Store the original URL
        console.log("User not authenticated, setting returnTo to:", req.originalUrl); // Debug log
        req.flash("error", "You must be logged in!");
        return res.redirect("/login");
    }
    next();
}

// Temporary route to create a test user for login verification
app.get("/create-test-user", async (req, res) => {
    try {
        const User = require("./models/user.js");
        const user = new User({ username: "testuser", email: "test@example.com" });
        await User.register(user, "testpassword123");
        res.send("Test user created! Username: testuser, Password: testpassword123");
    } catch (e) {
        res.send("Error creating test user: " + e.message);
    }
});

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
