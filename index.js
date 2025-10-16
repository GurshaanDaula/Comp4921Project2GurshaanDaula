require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const pool = require("./db/connection");

// 🧩 Auto-install mongoose if missing
let mongoose;
try {
    mongoose = require("mongoose");
} catch (err) {
    console.warn("⚠️ Mongoose not found — installing it now...");
    const { execSync } = require("child_process");
    execSync("npm install mongoose", { stdio: "inherit" });
    mongoose = require("mongoose");
}

const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// =============================
// 🔑 Mongo + Session Config
// =============================
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const expireTime = 60 * 60 * 1000; // 1 hour

// ✅ MongoDB URI
const mongoUrl = `mongodb+srv://${mongodb_user}:${mongodb_password}@cluster0.xhmuui0.mongodb.net/sessiondb?retryWrites=true&w=majority&appName=Cluster0`;

// ✅ Verify MongoDB connection
(async () => {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 20000,
        });
        console.log("✅ Connected to MongoDB Atlas successfully!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
    }
})();

// ✅ Create Mongo Store
const mongoStore = MongoStore.create({
    mongoUrl: mongoUrl,
    crypto: { secret: mongodb_session_secret },
    mongoOptions: {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
    },
    ttl: 60 * 60, // 1 hour
});

// ✅ Express Session setup
app.use(
    session({
        secret: node_session_secret,
        store: mongoStore,
        saveUninitialized: false,
        resave: true,
        cookie: { maxAge: expireTime },
    })
);

// ✅ Make session data available in views
app.use((req, res, next) => {
    res.locals.loggedIn = req.session?.loggedIn || false;
    res.locals.username = req.session?.username || null;
    next();
});

// =============================
// 🔗 Routes
// =============================
const authRoutes = require("./routes/auth");
const newThreadRoutes = require("./routes/new_thread");
const likeRoutes = require("./routes/likes");

app.use("/", likeRoutes);
app.use("/", authRoutes);
app.use("/", newThreadRoutes);

// =============================
// 🏠 Homepage
// =============================
app.get("/", async (req, res) => {
    try {
        const [threads] = await pool.query(
            `SELECT t.*, u.username, u.profile_image
             FROM threads t
             JOIN users u ON t.user_id = u.user_id
             ORDER BY t.created_at DESC`
        );
        res.render("index", { threads, query: "" });
    } catch (err) {
        console.error("Error loading home page:", err);
        res.status(500).render("error", { message: "Error loading homepage." });
    }
});

// =============================
// 📊 Stats Page
// =============================
app.get("/stats", async (req, res) => {
    try {
        const [threads] = await pool.query(
            `SELECT t.*, u.username 
             FROM threads t
             JOIN users u ON t.user_id = u.user_id
             ORDER BY (t.likes + t.views) DESC`
        );

        res.render("stats", {
            loggedIn: req.session.loggedIn,
            username: req.session.username,
            threads,
            comments: [],
        });
    } catch (err) {
        console.error("Error loading stats:", err);
        res.status(500).render("error", { message: "Error loading stats page." });
    }
});

// =============================
// ❌ 404 Fallback
// =============================
app.use((req, res) => {
    res.status(404).render("error", { message: "Page not found." });
});

// =============================
// 🚀 Start Server
// =============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
