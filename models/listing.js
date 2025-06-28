const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    image: { 
        url: {
            type: String,
            default: 'https://images.unsplash.com/photo-1527555197883-98e27ca0c1ea?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9'
        },
        filename: {
            type: String,
           
        },
    },
    country: {
        type: String,
        required: true,
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review',
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    // category: {
    //     type: String,
    //     enum: ['Trending', 'Top Rated', 'Location', 'Price', 'Bedrooms', 'Mountains', 'Castles', 'Amazing Pools', 'Date', 'Domes', 'Arctic', 'Camping'],
    //     required: true,
    // },
});



const Listing = mongoose.model('Listing', listingSchema);
module.exports = Listing ;