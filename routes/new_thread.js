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

// ...top of file unchanged...
router.get("/threads/:id", async (req, res) => {
    try {
        const threadId = req.params.id;

        const [[thread]] = await pool.query(
            `SELECT t.*, u.username, u.profile_image
       FROM threads t
       JOIN users u ON t.user_id = u.user_id
       WHERE t.thread_id = ?`,
            [threadId]
        );
        if (!thread) return res.status(404).send("Thread not found");

        // increment view count
        await pool.query("UPDATE threads SET views = views + 1 WHERE thread_id = ?", [threadId]);
        thread.views++;

        // comments (with author + profile image)
        const [comments] = await pool.query(
            `SELECT c.comment_id, c.content, c.likes,
              c.created_at, u.username, u.profile_image, u.user_id
       FROM comments c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.thread_id = ?
       ORDER BY c.created_at ASC`,
            [threadId]
        );

        // total likes = thread_likes + comment_likes
        const [[likeTotals]] = await pool.query(
            `SELECT t.likes AS thread_likes,
              COALESCE((
                SELECT COUNT(*)
                FROM comment_likes cl
                JOIN comments c2 ON c2.comment_id = cl.comment_id
                WHERE c2.thread_id = t.thread_id
              ), 0) AS comment_likes
       FROM threads t
       WHERE t.thread_id = ?`,
            [threadId]
        );
        const totalLikes = (likeTotals?.thread_likes || 0) + (likeTotals?.comment_likes || 0);

        res.render("thread", {
            loggedIn: req.session.loggedIn,
            username: req.session.username,
            thread,
            comments,
            totalLikes
        });
    } catch (err) {
        console.error("Error loading thread:", err);
        res.status(500).send("Error loading thread");
    }
});



module.exports = router;
