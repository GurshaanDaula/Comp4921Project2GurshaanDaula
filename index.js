require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const pool = require("./db/connection");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "supersecret",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            mongoOptions: {
                serverSelectionTimeoutMS: 10000, // 10 seconds
                connectTimeoutMS: 10000,
            },
            ttl: 60 * 60, // 1 hour
        }),
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 1000,
        },
    })
);

app.use((req, res, next) => {
    res.locals.loggedIn = req.session?.loggedIn || false;
    res.locals.username = req.session?.username || null;
    next();
});

const authRoutes = require("./routes/auth");
const newThreadRoutes = require("./routes/new_thread");
const likeRoutes = require("./routes/likes");

app.use("/", likeRoutes);
app.use("/", authRoutes);
app.use("/", newThreadRoutes);

app.get("/", async (req, res) => {
    const [threads] = await pool.query(
        `SELECT t.*, u.username, u.profile_image
     FROM threads t
     JOIN users u ON t.user_id = u.user_id
     ORDER BY t.created_at DESC`
    );
    res.render("index", { threads, query: "" });
});

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
            comments: []
        });
    } catch (err) {
        console.error("Error loading stats:", err);
        res.status(500).render("error", { message: "Error loading stats page." });
    }
});


app.use((req, res) => {
    res.status(404).render("error", { message: "Page not found." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
