// Search and voice helper functions for TravaCasa
const Listing = require('../models/listing');

// Process voice query to improve search accuracy
async function processVoiceQuery(transcript) {
    try {
        let processed = transcript.toLowerCase().trim();
        const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
        fillerWords.forEach(word => {
            processed = processed.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
        });
        const locationKeywords = ['near', 'in', 'at', 'around', 'close to', 'nearby'];
        const typeKeywords = ['hotel', 'apartment', 'house', 'villa', 'resort', 'cabin'];
        const words = processed.split(' ').filter(word => word.length > 0);
        let location = '';
        let type = '';
        for (let i = 0; i < words.length; i++) {
            if (locationKeywords.includes(words[i]) && i + 1 < words.length) {
                location = words.slice(i + 1).join(' ');
                break;
            }
        }
        for (const word of words) {
            if (typeKeywords.includes(word)) {
                type = word;
                break;
            }
        }
        return {
            original: transcript,
            processed: processed,
            location: location || processed,
            type: type,
            keywords: words.filter(word => word.length > 2)
        };
    } catch (error) {
        console.error('Error processing voice query:', error);
        return {
            original: transcript,
            processed: transcript,
            location: transcript,
            type: '',
            keywords: []
        };
    }
}

// Search web for travel information
async function searchWebForTravelInfo(query, type = 'travel') {
    try {
        const travelSuggestions = [
            {
                title: `Visit ${query} - Travel Guide`,
                description: `Discover the best places to visit in ${query}. Find hotels, restaurants, and attractions.`,
                url: `https://www.example-travel-site.com/destinations/${query.replace(/\s+/g, '-')}`,
                type: 'travel_guide'
            },
            {
                title: `Best Hotels in ${query}`,
                description: `Find and book the perfect hotel in ${query}. Compare prices and read reviews.`,
                url: `https://www.example-booking-site.com/hotels/${query.replace(/\s+/g, '-')}`,
                type: 'accommodation'
            },
            {
                title: `Things to Do in ${query}`,
                description: `Explore top attractions, activities, and experiences in ${query}.`,
                url: `https://www.example-activities-site.com/things-to-do/${query.replace(/\s+/g, '-')}`,
                type: 'activities'
            }
        ];
        return travelSuggestions;
    } catch (error) {
        console.error('Error searching web for travel info:', error);
        return [];
    }
}

// Generate search suggestions
async function generateSearchSuggestions(processedQuery) {
    try {
        const suggestions = [];
        const popularDestinations = await Listing.aggregate([
            { $group: { _id: '$location', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        popularDestinations.forEach(dest => {
            if (dest._id && dest._id.toLowerCase().includes(processedQuery.location.toLowerCase())) {
                suggestions.push({
                    text: dest._id,
                    type: 'location',
                    count: dest.count
                });
            }
        });
        const commonSuggestions = [
            'beach resorts',
            'mountain cabins',
            'city apartments',
            'luxury villas',
            'budget hotels'
        ];
        commonSuggestions.forEach(suggestion => {
            if (suggestion.includes(processedQuery.type) || processedQuery.keywords.some(keyword => suggestion.includes(keyword))) {
                suggestions.push({
                    text: suggestion,
                    type: 'category',
                    count: 0
                });
            }
        });
        return suggestions.slice(0, 8);
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return [];
    }
}

// Find nearby listings (simplified geospatial search)
async function findNearbyListings(latitude, longitude, radiusKm) {
    try {
        const allListings = await Listing.find({}).limit(20);
        return allListings.slice(0, 10).map(listing => ({
            id: listing._id,
            title: listing.title,
            location: listing.location,
            price: listing.price,
            image: listing.image,
            distance: Math.random() * radiusKm, // Mock distance
            type: 'nearby_listing'
        }));
    } catch (error) {
        console.error('Error finding nearby listings:', error);
        return [];
    }
}

module.exports = {
    processVoiceQuery,
    searchWebForTravelInfo,
    generateSearchSuggestions,
    findNearbyListings
}; 