const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/connection");
const multer = require("multer");
const { uploadToCloudinary } = require("../utils/cloudinary");

const router = express.Router();
const upload = multer({ dest: "uploads/" });


router.get("/register", (req, res) => {
    res.render("register", {
        loggedIn: req.session?.loggedIn || false,
        username: req.session?.username || null,
        message: null,
    });
});


router.get("/login", (req, res) => {
    res.render("login", {
        loggedIn: req.session?.loggedIn || false,
        username: req.session?.username || null,
        message: null,
    });
});


router.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});


router.post("/register", upload.single("profileImage"), async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.render("register", {
                loggedIn: false,
                username: null,
                message: "All fields are required.",
            });
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,}$/;
        if (!passwordRegex.test(password)) {
            return res.render("register", {
                loggedIn: false,
                username: null,
                message:
                    "Password must be ≥10 characters and include uppercase, lowercase, number, and symbol.",
            });
        }

        const [existingUser] = await pool.query(
            "SELECT * FROM users WHERE email = ? OR username = ?",
            [email, username]
        );
        if (existingUser.length > 0) {
            return res.render("register", {
                loggedIn: false,
                username: null,
                message: "Username or email already taken.",
            });
        }

        const hashed = await bcrypt.hash(password, 10);

        let profileUrl = "/images/default.jpg";
        if (req.file) {
            profileUrl = await uploadToCloudinary(req.file.path);
        }

        const [result] = await pool.query(
            `INSERT INTO users (username, email, password, profile_image, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [username, email, hashed, profileUrl]
        );

        req.session.loggedIn = true;
        req.session.username = username;
        req.session.user_id = result.insertId;


        res.redirect("/");
    } catch (err) {
        console.error("Registration error:", err);
        res.render("register", {
            loggedIn: false,
            username: null,
            message: "An error occurred while registering. Please try again.",
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render("login", {
                loggedIn: false,
                username: null,
                message: "Email and password are required.",
            });
        }

        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];

        if (!user) {
            return res.render("login", {
                loggedIn: false,
                username: null,
                message: "Invalid credentials.",
            });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.render("login", {
                loggedIn: false,
                username: null,
                message: "Invalid credentials.",
            });
        }

        req.session.loggedIn = true;
        req.session.username = user.username;
        req.session.user_id = user.user_id || user.id;
        console.log("LOGGED IN SESSION:", req.session);

        res.redirect("/");
    } catch (err) {
        console.error("Login error:", err);
        res.render("login", {
            loggedIn: false,
            username: null,
            message: "An error occurred during login. Please try again.",
        });
    }
});

module.exports = router;
