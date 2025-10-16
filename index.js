require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const authRoutes = require("./routes/auth");
app.use("/", authRoutes);


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            ttl: 60 * 60, // 1 hour
        }),
        cookie: { maxAge: 60 * 60 * 1000 },
    })
);

const mongoose = require("mongoose");

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

const pool = require("./db/connection");

app.use(async (req, res, next) => {
    try {
        const conn = await pool.getConnection();
        conn.release(); // simple connection test
        next();
    } catch (err) {
        console.error("Database connection failed:", err);
        res.status(500).send("Database not connected");
    }
});

const pool = require("./db/connection");

app.use(async (req, res, next) => {
  try {
    const conn = await pool.getConnection();
    conn.release(); // simple connection test
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).send("Database not connected");
  }
});

const threads = [
    {
        thread_id: 1,
        username: "Gurshaan",
        profile_image: "/images/default.jpg",
        title: "Why is Node.js so popular?",
        description: "Let’s discuss the pros and cons of Node.js in backend development.",
        likes: 12,
        views: 45,
        comment_count: 4,
        created_at: new Date(),
    },
    {
        thread_id: 2,
        username: "Patrick",
        profile_image: "/images/default.jpg",
        title: "Best SQL practices?",
        description: "What are common SQL antipatterns to avoid?",
        likes: 9,
        views: 30,
        comment_count: 2,
        created_at: new Date(),
    },
];

const comments = [
    {
        comment_id: 1,
        thread_id: 1,
        username: "Alex",
        profile_image: "/images/default.jpg",
        content: "Node.js is awesome for scalable applications!",
        created_at: new Date(),
    },
    {
        comment_id: 2,
        thread_id: 1,
        username: "Sam",
        profile_image: "/images/default.jpg",
        content: "It’s great for real-time apps but debugging can be tricky.",
        created_at: new Date(),
    },
];

app.use((req, res, next) => {
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.username = req.session.username || null;
    next();
});

app.get("/", (req, res) => {
    res.render("index", { threads, query: "" });
});

app.get("/search", (req, res) => {
    const q = req.query.q?.toLowerCase() || "";
    const filtered = threads.filter(
        (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
    );
    res.render("index", { threads: filtered, query: q });
});

app.get("/threads/:id", (req, res) => {
    const thread = threads.find((t) => t.thread_id == req.params.id);
    if (!thread) return res.status(404).render("error", { message: "Thread not found." });
    const threadComments = comments.filter((c) => c.thread_id == thread.thread_id);
    res.render("thread", { thread, comments: threadComments });
});

app.get("/stats", (req, res) => {
    const sorted = [...threads].sort((a, b) => b.likes + b.views - (a.likes + a.views));
    res.render("stats", { threads: sorted });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        req.session.loggedIn = true;
        req.session.username = "DemoUser";
        res.redirect("/");
    } else {
        res.render("login", { message: "Invalid credentials" });
    }
});

app.post("/register", (req, res) => {
    req.session.loggedIn = true;
    req.session.username = req.body.username;
    res.redirect("/");
});

app.use((req, res) => {
    res.status(404).render("error", { message: "Page not found." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
