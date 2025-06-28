//const express = require('express');
//const app = express();
const mongoose = require('mongoose');
const Listing = require('../models/listing.js') ; // Ensure this path is correct

const initData =require('./data.js'); // Import the sample data
///const path = require('path');



const MONGO_URL= 'mongodb://127.0.0.1:27017/wanderlust';
main ()
.then(() => {
  console.log("connected to database")
})
.catch((err) => {
  console.log("error in connecting to database", err)
});
async function main(){ 
    await mongoose.connect(MONGO_URL);
}





// Initialize the database with sample data
// This function clears the existing listings and inserts new sample data
const initDB = async () => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj)=>({...obj, 
      owner: "6488c2e3ed5bd15b7d188888"}));

    //console.log(data); // log this before insertMany
    await Listing.insertMany(initData.data);
    console.log('Database initialized with sample data');
};

// Call the initDB function to initialize the database
initDB(); 

// module.exports = initDB;
