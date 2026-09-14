const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function authenticateUser(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send("Please login first");
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).send("User not found");
        }

        req.user = user;

        next();

    } catch (error) {
        return res.status(401).send("Invalid or expired token");
    }
}

module.exports = authenticateUser;