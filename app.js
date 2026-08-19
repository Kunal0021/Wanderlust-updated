if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const Listing = require("./listing.js"); // Fixed path
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override"); // 1. Require the package

const dbUrl = process.env.ATLASDB_URL || "mongodb+srv://Wanderlust_admin:YAdJ9amNQPYIg800@cluster0.dxkke8w.mongodb.net/myapp";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// 2. Configure method-override to look for ?_method=PUT/DELETE in the URL
app.use(methodOverride("_method"));

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

app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

// Index route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("./listings/index.ejs", { allListings });
})

// Create new route (Get)
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
})

// Show route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/show.ejs", { listing });
})

// Create route (Post)
app.post("/listings", async (req, res) => {
  let { title, description, image, price, location, country } = req.body;

  const newListing = new Listing({
    title: title,
    description: description,
    image: { url: image },
    price: price,
    location: location,
    country: country
  });

  await newListing.save();
  res.redirect("/listings");
});

// Edit route (Get)
app.get("/listings/:id/edit", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
})

// 3. Update Route (Put) - This was missing
app.put("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let { title, description, image, price, location, country } = req.body;

  await Listing.findByIdAndUpdate(id, {
    title: title,
    description: description,
    image: { url: image }, // Ensure image is wrapped in object
    price: price,
    location: location,
    country: country
  });

  res.redirect(`/listings/${id}`);
});

// Delete Route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  res.redirect("/listings");
});

// Sample data route
app.get("/testListing", async (req, res) => {
  let sampleListing = new Listing({
    title: "My new Villa",
    description: "by the beach",
    price: 1200,
    location: "Calangute, Goa",
    country: "India",
  });
  await sampleListing.save();
  console.log("sample was saved");
  res.send("successful testing");
});

app.use((err, req, res, next) => {
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("ERROR DETAILS:", err);
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  res.status(500).send(err.message); // This will show the specific error on the page
});

app.listen(8080, () => {
  console.log("app is listening on port 8080");
});

module.exports = app;