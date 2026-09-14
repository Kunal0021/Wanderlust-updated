if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const Listing = require("./listing.js");
const jwt = require("jsonwebtoken");
const User = require("./models/user");


const path = require("path");
const ejsMate = require("ejs-mate");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const authenticateUser = require("./middleware/auth");
const methodOverride = require("method-override");

const dbUrl =
  process.env.ATLASDB_URL ||
  "mongodb+srv://Wanderlust_admin:YAdJ9amNQPYIg800@cluster0.dxkke8w.mongodb.net/myapp";


// ====================
// App Configuration
// ====================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ====================
// Middleware
// ====================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());
app.use(async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    res.locals.currentUser = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);

    res.locals.currentUser = user || null;

  } catch (error) {
    res.locals.currentUser = null;
  }

  next();
});




app.use(methodOverride("_method"));

app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "public")));


// ====================
// Authentication Routes
// ====================

app.use("/auth", authRoutes);


// ====================
// Database
// ====================

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


// ====================
// Home Route
// ====================

app.get("/", (req, res) => {
  res.send("Hi, I am root");
});


// ====================
// Listing Routes
// ====================

// Index route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
});


// Create new listing page
// 🔐 Login required
app.get("/listings/new", authenticateUser, (req, res) => {
  res.render("listings/new.ejs");
});


// Show route
app.get("/listings/:id", async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

  res.render("listings/show.ejs", { listing });
});


// Create listing
// 🔐 Login required
app.post("/listings", authenticateUser, async (req, res) => {
  const {
    title,
    description,
    image,
    price,
    location,
    country
  } = req.body;

  const newListing = new Listing({
    title,
    description,
    image: {
      url: image
    },
    price,
    location,
    country,

    // 👇 Connect listing to logged-in user
    owner: req.user.userId
  });

  await newListing.save();

  res.redirect("/listings");
});


// Edit page
// 🔐 Login required
app.get(
  "/listings/:id/edit",
  authenticateUser,
  async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).send("Listing not found");
    }

    if (!listing.owner || listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).send("You are not allowed to edit this listing");
    }

    res.render("listings/edit.ejs", { listing });
  }
);


// Update listing
// 🔐 Login required
app.put(
  "/listings/:id",
  authenticateUser,
  async (req, res) => {
    const { id } = req.params;

    const {
      title,
      description,
      image,
      price,
      location,
      country
    } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).send("Listing not found");
    }

    // Authorization check
    if (listing.owner.toString() !== req.user.userId) {
      return res
        .status(403)
        .send("You are not allowed to edit this listing");
    }

    await Listing.findByIdAndUpdate(id, {
      title,
      description,
      image: {
        url: image
      },
      price,
      location,
      country
    });

    res.redirect(`/listings/${id}`);
  }
);


// Delete listing
// 🔐 Login required
app.delete(
  "/listings/:id",
  authenticateUser,
  async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).send("Listing not found");
    }

    // Authorization check
    if (listing.owner.toString() !== req.user.userId) {
      return res
        .status(403)
        .send("You are not allowed to delete this listing");
    }

    await Listing.findByIdAndDelete(id);

    res.redirect("/listings");
  }
);


// ====================
// Sample Data Route
// ====================

app.get("/testListing", async (req, res) => {
  const sampleListing = new Listing({
    title: "My new Villa",
    description: "by the beach",
    price: 1200,
    location: "Calangute, Goa",
    country: "India"
  });

  await sampleListing.save();

  console.log("sample was saved");

  res.send("successful testing");
});


// ====================
// Error Handler
// ====================

app.use((err, req, res, next) => {
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.log("ERROR DETAILS:", err);
  console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

  res.status(500).send(err.message);
});


// ====================
// Server
// ====================

app.listen(8080, () => {
  console.log("app is listening on port 8080");
});


module.exports = app;