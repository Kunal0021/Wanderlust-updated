if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("./listing.js"); // Fixed path

const dbUrl = process.env.ATLASDB_URL || "mongodb+srv://Wanderlust_admin:YAdJ9amNQPYIg800@cluster0.dxkke8w.mongodb.net/myapp";

main()
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

const initDB = async () => {
  await Listing.deleteMany({});
  await Listing.insertMany(initData.data);
  console.log("Data was initialized");
}

initDB();