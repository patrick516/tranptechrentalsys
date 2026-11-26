// Connects Mongoose to MongoDB Atlas
const mongoose = require("mongoose");
const env = require("./env");

async function connectDb() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is missing in environment configuration");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  return mongoose.connection;
}

module.exports = { connectDb };
