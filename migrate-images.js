const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Connect to MongoDB
const dbURL = process.env.ATLASDB_URL;
mongoose.connect(dbURL)
    .then(() => console.log("Connected to database"))
    .catch(err => console.log("Error connecting to database", err));

const Listing = require('./models/listing.js');

async function migrateImages() {
    try {
        console.log('Starting image migration to Cloudinary...');
        
        // Find all listings with local image URLs
        const listings = await Listing.find({
            'image.url': { $regex: /^\/uploads\// }
        });
        
        console.log(`Found ${listings.length} listings with local images to migrate`);
        
        for (const listing of listings) {
            try {
                const imagePath = path.join(__dirname, 'public', 'uploads', listing.image.filename);
                
                if (fs.existsSync(imagePath)) {
                    console.log(`Uploading ${listing.image.filename} to Cloudinary...`);
                    
                    // Upload to Cloudinary
                    const result = await cloudinary.uploader.upload(imagePath, {
                        folder: 'travacasa-listings',
                        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
                    });
                    
                    // Update the listing with Cloudinary URL
                    await Listing.findByIdAndUpdate(listing._id, {
                        'image.url': result.secure_url,
                        'image.filename': result.public_id
                    });
                    
                    console.log(`Successfully migrated ${listing.image.filename} to Cloudinary`);
                    
                    // Optionally delete the local file
                    // fs.unlinkSync(imagePath);
                    // console.log(`Deleted local file: ${imagePath}`);
                } else {
                    console.log(`Local file not found: ${imagePath}`);
                }
            } catch (error) {
                console.error(`Error migrating image for listing ${listing._id}:`, error);
            }
        }
        
        console.log('Image migration completed!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateImages();
}

module.exports = { migrateImages }; 

