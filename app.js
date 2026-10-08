if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const Listing = require("./listing.js");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
const redisClient = require("./config/redis");

const path = require("path");
const ejsMate = require("ejs-mate");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const authRoutes = require("./routes/auth");
const authenticateUser = require("./middleware/auth");

const {
  listingValidation,
  validateRequest
} = require("./middleware/validation");

const dbUrl = process.env.ATLASDB_URL;


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


// ====================
// Current User Middleware
// ====================

app.use(async (req, res, next) => {

  res.locals.currentUser = null;

  const token = req.cookies.token;

  if (!token) {
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
// .then(() => {
//   console.log("connected to db");
// })
// .catch((err) => {
//   console.log(err);
// });

async function main() {
  await mongoose.connect(dbUrl);
}

main()
  .then(() => {
    console.log("connected to db");
    return redisClient.connect();
  })
  .then(async () => {
    console.log("connected to redis");

  })
  .catch((err) => {
    console.log(err);
  });


// ====================
// Home Route
// ====================

app.get("/", async (req, res) => {
  try {
    let featuredListings = [];
    
    // Check Redis cache first
    const cachedListings = await redisClient.get("listings:all");

    if (cachedListings) {
      featuredListings = JSON.parse(cachedListings).slice(0, 8);
    } else {
      featuredListings = await Listing.find({}).limit(8);
    }

    res.render("home.ejs", { featuredListings });
  } catch (error) {
    console.log("Home route error:", error);
    res.render("home.ejs", { featuredListings: [] });
  }
});


// ====================
// Listing Routes
// ====================


// Index route But now its an cache-aside implementation

app.get("/listings", async (req, res) => {

  try {

    // 1. Check Redis first
    const cachedListings = await redisClient.get("listings:all");

    // 2. Cache HIT
    if (cachedListings) {

      console.log("CACHE HIT");

      const allListings = JSON.parse(cachedListings);

      return res.render("listings/index.ejs", {
        allListings
      });

    }

    // 3. Cache MISS
    console.log("CACHE MISS");

    // 4. Get data from MongoDB
    const allListings = await Listing.find({});

    // 5. Store data in Redis
    await redisClient.set(
      "listings:all",
      JSON.stringify(allListings),
      {
        EX: 300
      }
    );

    // 6. Send data to browser
    res.render("listings/index.ejs", {
      allListings
    });

  } catch (error) {

    console.log("Listing cache error:", error);

    // Redis failure should not break the application
    const allListings = await Listing.find({});

    res.render("listings/index.ejs", {
      allListings
    });

  }

});


// Create new listing page
// 🔐 Login required

app.get(
  "/listings/new",
  authenticateUser,
  (req, res) => {

    res.render("listings/new.ejs");

  }
);


// Show route

app.get("/listings/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const cacheKey = `listing:${id}`;

    // Check Redis first
    const cachedListing = await redisClient.get(cacheKey);

    // Cache HIT
    if (cachedListing) {

      console.log("LISTING CACHE HIT");

      const listing = JSON.parse(cachedListing);

      return res.render("listings/show.ejs", {
        listing
      });

    }

    // Cache MISS
    console.log("LISTING CACHE MISS");

    // Get listing from MongoDB
    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).send("Listing not found");
    }

    // Store listing in Redis for 5 minutes
    await redisClient.set(
      cacheKey,
      JSON.stringify(listing),
      {
        EX: 300
      }
    );

    res.render("listings/show.ejs", {
      listing
    });

  } catch (error) {

    console.log("Listing cache error:", error);

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).send("Listing not found");
    }

    res.render("listings/show.ejs", {
      listing
    });

  }

});


// Create listing
// 🔐 Login required
// ✅ Validation added

app.post(
  "/listings",
  authenticateUser,
  listingValidation,
  validateRequest,
  async (req, res) => {

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

      owner: req.user._id
    });

    await newListing.save();

    // Invalidate listings cache
    await redisClient.del(
      "listings:all",
      `listing:${id}`
    );

    res.redirect("/listings");

  }
);


// ====================
// Edit Listing
// ====================

// 🔐 Login required
// 🔐 Owner only

app.get(
  "/listings/:id/edit",
  authenticateUser,
  async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);


    if (!listing) {
      return res.status(404).send("Listing not found");
    }


    // Prevent crash when owner is missing

    if (
      !listing.owner ||
      listing.owner.toString() !== req.user._id.toString()
    ) {

      return res
        .status(403)
        .send("You are not allowed to edit this listing");

    }


    res.render("listings/edit.ejs", {
      listing
    });

  }
);


// ====================
// Update Listing
// ====================

// 🔐 Login required
// 🔐 Owner only
// ✅ Validation added

app.put(
  "/listings/:id",
  authenticateUser,
  listingValidation,
  validateRequest,
  async (req, res) => {

    const { id } = req.params;


    const listing = await Listing.findById(id);


    if (!listing) {
      return res.status(404).send("Listing not found");
    }


    // Prevent crash when owner is missing

    if (
      !listing.owner ||
      listing.owner.toString() !== req.user._id.toString()
    ) {

      return res
        .status(403)
        .send("You are not allowed to edit this listing");

    }


    const {
      title,
      description,
      image,
      price,
      location,
      country
    } = req.body;


    await Listing.findByIdAndUpdate(
      id,
      {
        title,
        description,

        image: {
          url: image
        },

        price,
        location,
        country
      },
      {
        runValidators: true
      }
    );

    // Invalidate listings cache
    await redisClient.del("listings:all");

    res.redirect(`/listings/${id}`);

  }
);


// ====================
// Delete Listing
// ====================

// 🔐 Login required
// 🔐 Owner only

app.delete(
  "/listings/:id",
  authenticateUser,
  async (req, res) => {

    const { id } = req.params;


    const listing = await Listing.findById(id);


    if (!listing) {
      return res.status(404).send("Listing not found");
    }


    // Prevent crash when owner is missing

    if (
      !listing.owner ||
      listing.owner.toString() !== req.user._id.toString()
    ) {

      return res
        .status(403)
        .send("You are not allowed to delete this listing");

    }


    await Listing.findByIdAndDelete(id);

    // Invalidate listings cache
    await redisClient.del(
      "listings:all",
      `listing:${id}`
    );

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


  res
    .status(500)
    .send(err.message);

});


// ====================
// Server
// ====================

app.listen(8080, () => {

  console.log(
    "app is listening on port 8080"
  );

});


module.exports = app;