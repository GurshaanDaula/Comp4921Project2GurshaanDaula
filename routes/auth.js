const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/connection");
const multer = require("multer");
const { uploadToCloudinary } = require("../utils/cloudinary");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/login", (req, res) => res.render("login"));
router.get("/register", (req, res) => res.render("register"));
router.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

// REGISTER
router.post("/register", upload.single("profileImage"), async (req, res) => {
    const { username, email, password } = req.body;
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{10,}$/;
    if (!regex.test(password))
        return res.render("register", { message: "Password must be ≥10 chars, upper/lower/number/symbol." });

    const hashed = await bcrypt.hash(password, 10);
    const image = req.file ? await uploadToCloudinary(req.file.path) : "/images/default.jpg";

    await pool.query(
        "INSERT INTO users (username,email,password,profile_image) VALUES (?,?,?,?)",
        [username, email, hashed, image]
    );
    req.session.loggedIn = true;
    req.session.username = username;
    res.redirect("/");
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    const user = rows[0];
    if (!user) return res.render("login", { message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render("login", { message: "Invalid credentials" });

    req.session.loggedIn = true;
    req.session.username = user.username;
    req.session.user_id = user.user_id;
    res.redirect("/");
});

module.exports = router;
