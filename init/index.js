const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const initData = require("./data.js");
require("dotenv").config();

const DB_URL = process.env.ATLASDB_URL;

async function connectDB() {
  try {
    await mongoose.connect(DB_URL, {
      serverSelectionTimeoutMS: 30000,
      tls: true
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}

const initDB = async () => {
  await Listing.deleteMany({});
  const data = initData.data.map(obj => ({
    ...obj,
    owner: "6488c2e3ed5bd15b7d188888"
  }));

  await Listing.insertMany(data);
  console.log("✅ Database initialized with sample data");
};

(async () => {
  await connectDB();
  await initDB();
  mongoose.connection.close();
})();
