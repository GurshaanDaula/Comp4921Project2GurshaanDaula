const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

function ensureLoggedIn(req, res, next) {
    if (!req.session?.loggedIn) {
        return res.status(401).json({ success: false, message: "Please log in first." });
    }
    next();
}

router.post("/like/:thread_id", ensureLoggedIn, async (req, res) => {
    const userId = req.session.user_id;
    const threadId = req.params.thread_id;

    try {
        const [liked] = await pool.query(
            "SELECT * FROM thread_likes WHERE thread_id = ? AND user_id = ?",
            [threadId, userId]
        );

        if (liked.length > 0) {
            await pool.query("DELETE FROM thread_likes WHERE thread_id = ? AND user_id = ?", [threadId, userId]);
            await pool.query("UPDATE threads SET likes = likes - 1 WHERE thread_id = ?", [threadId]);
            return res.json({ success: true, liked: false });
        } else {
            await pool.query("INSERT INTO thread_likes (thread_id, user_id) VALUES (?, ?)", [threadId, userId]);
            await pool.query("UPDATE threads SET likes = likes + 1 WHERE thread_id = ?", [threadId]);
            return res.json({ success: true, liked: true });
        }
    } catch (err) {
        console.error("Error toggling like:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

module.exports = router;
