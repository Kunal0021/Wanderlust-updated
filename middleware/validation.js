const { body, validationResult } = require("express-validator");

const signupValidation = [
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required")
        .isLength({ min: 3 })
        .withMessage("Username must be at least 3 characters"),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")
];

const loginValidation = [
    body("email")
        .trim()
        .isEmail()
        .withMessage("Enter a valid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
];

const listingValidation = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required"),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required"),

    body("price")
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number"),

    body("location")
        .trim()
        .notEmpty()
        .withMessage("Location is required"),

    body("country")
        .trim()
        .notEmpty()
        .withMessage("Country is required")
];

function validateRequest(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).send(
            errors.array().map(error => error.msg).join(", ")
        );
    }

    next();
}

module.exports = {
    signupValidation,
    loginValidation,
    listingValidation,
    validateRequest
};