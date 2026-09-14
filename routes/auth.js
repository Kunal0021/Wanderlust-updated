const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// Signup page
router.get("/signup", (req, res) => {
    res.render("auth/signup");
});

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).send("Username or email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.redirect("/auth/login");

    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

// Login page
router.get("/login", (req, res) => {
    res.render("auth/login");
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).send("Invalid email or password");
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).send("Invalid email or password");
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000
        });

        res.redirect("/listings");

    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

//Logout Route
router.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/listings");
});

module.exports = router;