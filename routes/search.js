// routes/search.js
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// GET /search?q=...
router.get("/search", async (req, res) => {
    try {
        const query = req.query.q ? req.query.q.trim() : "";

        if (!query) {
            // If search is blank, just show all threads like the homepage
            const [threads] = await pool.query(
                `SELECT t.*, u.username, u.profile_image,
                (SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.thread_id) AS comment_count
         FROM threads t
         JOIN users u ON t.user_id = u.user_id
         ORDER BY t.created_at DESC`
            );
            return res.render("index", { threads, query: "" });
        }

        const searchSql = `
      SELECT
        t.thread_id,
        t.title,
        t.description,
        t.views,
        t.likes,
        t.created_at,
        u.username,
        u.profile_image,
        (SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.thread_id) AS comment_count
      FROM threads t
      JOIN users u ON u.user_id = t.user_id
      WHERE
        t.title LIKE ? OR
        t.description LIKE ? OR
        u.username LIKE ? OR
        EXISTS (
          SELECT 1 FROM comments c WHERE c.thread_id = t.thread_id AND c.content LIKE ?
        )
      ORDER BY t.created_at DESC
    `;

        const likeQuery = `%${query}%`;
        const [threads] = await pool.query(searchSql, [
            likeQuery,
            likeQuery,
            likeQuery,
            likeQuery,
        ]);

        res.render("index", { threads, query });

    } catch (err) {
        console.error("Search error:", err);
        res
            .status(500)
            .render("error", { message: "Error performing search." });
    }
});

module.exports = router;
