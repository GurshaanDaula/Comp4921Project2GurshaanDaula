const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// Middleware to ensure login
function ensureLoggedIn(req, res, next) {
    if (!req.session?.loggedIn) {
        return res.redirect("/login");
    }
    next();
}

// ======== GET: Thread Creation Page ========
router.get("/threads/new", ensureLoggedIn, (req, res) => {
    res.render("new_thread", {
        loggedIn: req.session.loggedIn,
        username: req.session.username,
        message: null,
    });
});


// ======== POST: Handle New Thread ========
router.post("/threads/new", ensureLoggedIn, async (req, res) => {
    try {
        const { title, description } = req.body;
        const userId = req.session.user_id;

        if (!title || !description) {
            return res.render("new_thread", {
                loggedIn: req.session.loggedIn,
                username: req.session.username,
                message: "Please fill in all fields.",
            });
        }
        console.log("🧠 SESSION DATA AT THREAD CREATION:", req.session);

        await pool.query(
            `INSERT INTO threads (user_id, title, description, likes, views, created_at)
       VALUES (?, ?, ?, 0, 0, NOW())`,
            [userId, title, description]
        );

        res.redirect("/");
    } catch (err) {
        console.error("Error creating thread:", err);
        res.render("new_thread", {
            loggedIn: req.session.loggedIn,
            username: req.session.username,
            message: "An error occurred while creating the thread.",
        });
    }
});

router.get("/threads/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT t.*, u.username, u.profile_image 
       FROM threads t 
       JOIN users u ON t.user_id = u.user_id 
       WHERE t.thread_id = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).send("Thread not found");
        }

        const thread = rows[0];

        // increment view count
        await pool.query("UPDATE threads SET views = views + 1 WHERE thread_id = ?", [thread.thread_id]);
        thread.views++;

        res.render("thread", {
            loggedIn: req.session.loggedIn,
            username: req.session.username,
            thread,
            comments: [],
        });
    } catch (err) {
        console.error("Error loading thread:", err);
        res.status(500).send("Error loading thread");
    }
});


module.exports = router;
