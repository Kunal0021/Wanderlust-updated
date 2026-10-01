require("dotenv").config();

const mongoose = require("mongoose");
const Listing = require("./listing.js");
const User = require("./models/user");

const dbUrl = process.env.ATLASDB_URL;

async function migrateListings() {
    try {
        await mongoose.connect(dbUrl);

        console.log("Connected to MongoDB");

        const user = await User.findOne({
            email: "kniti9567@gmail.com"
        });

        if (!user) {
            console.log("User not found");
            return;
        }

        console.log("User found:", user.username);

        const result = await Listing.updateMany(
            { owner: { $exists: false } },
            { $set: { owner: user._id } }
        );

        console.log("Migration result:", result);

    } catch (error) {
        console.error("Migration error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }
}

migrateListings();