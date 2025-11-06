// routes/comments.js
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");
const { ensureLoggedIn, ensureCanModifyComment } = require("../middleware/authz");

// Create a comment
router.post("/threads/:thread_id/comments", ensureLoggedIn, async (req, res) => {
    console.log("🔍 Session check on comment POST:", req.session);

    try {
        const { content } = req.body;
        const threadId = req.params.thread_id;
        const userId = req.session.user_id;

        if (!content?.trim()) {
            return res.redirect(`/threads/${threadId}`); // or re-render with message
        }

        await pool.query(
            `INSERT INTO comments (thread_id, user_id, content, likes, created_at)
       VALUES (?, ?, ?, 0, NOW())`,
            [threadId, userId, content.trim()]
        );

        res.redirect(`/threads/${threadId}`);
    } catch (err) {
        console.error("Create comment error:", err);
        res.status(500).render("error", { message: "Could not add comment." });
    }
});

// Edit (GET form)
router.get("/comments/:comment_id/edit", ensureLoggedIn, ensureCanModifyComment, async (req, res) => {
    const commentId = req.params.comment_id;
    const [[comment]] = await pool.query(
        `SELECT c.comment_id, c.thread_id, c.content
     FROM comments c WHERE c.comment_id = ?`,
        [commentId]
    );
    return res.render("edit_comment", {
        loggedIn: req.session.loggedIn,
        username: req.session.username,
        comment
    });
});

// Edit (POST)
router.post("/comments/:comment_id/edit", ensureLoggedIn, ensureCanModifyComment, async (req, res) => {
    try {
        const commentId = req.params.comment_id;
        const { content } = req.body;
        if (!content?.trim()) {
            return res.status(400).render("error", { message: "Content required." });
        }
        await pool.query(`UPDATE comments SET content = ? WHERE comment_id = ?`, [content.trim(), commentId]);
        // res.locals.comment injected by middleware
        return res.redirect(`/threads/${res.locals.comment.thread_id}`);
    } catch (err) {
        console.error("Edit comment error:", err);
        res.status(500).render("error", { message: "Could not edit comment." });
    }
});

// Delete (owner OR thread owner)
router.post("/comments/:comment_id/delete", ensureLoggedIn, ensureCanModifyComment, async (req, res) => {
    try {
        const commentId = req.params.comment_id;
        const { comment } = res.locals; // from middleware
        const threadId = comment.thread_id;

        await pool.query(`DELETE FROM comments WHERE comment_id = ?`, [commentId]);
        return res.redirect(`/threads/${threadId}`);
    } catch (err) {
        console.error("Delete comment error:", err);
        res.status(500).render("error", { message: "Could not delete comment." });
    }
});

// Toggle like on a comment
router.post("/comments/:comment_id/like", ensureLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user_id;
        const commentId = req.params.comment_id;

        const [liked] = await pool.query(
            `SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
            [commentId, userId]
        );

        if (liked.length > 0) {
            await pool.query(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, [commentId, userId]);
            await pool.query(`UPDATE comments SET likes = GREATEST(likes - 1, 0) WHERE comment_id = ?`, [commentId]);
            return res.json({ success: true, liked: false });
        } else {
            await pool.query(`INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`, [commentId, userId]);
            await pool.query(`UPDATE comments SET likes = likes + 1 WHERE comment_id = ?`, [commentId]);
            return res.json({ success: true, liked: true });
        }
    } catch (err) {
        console.error("Toggle comment like error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

module.exports = router;
