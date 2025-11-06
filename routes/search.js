// routes/search.js
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

/**
 * We support:
 * - FULLTEXT relevance on (title, description) and (content)
 * - Frequency rank using REGEXP_COUNT (MySQL 8.0) for exact word hits
 */
router.get("/search", async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) return res.render("search", { loggedIn: req.session.loggedIn, username: req.session.username, q: "", results: [] });

        // frequency: count of whole-word matches in title/description/content
        // \b = word boundary with REGEXP in MySQL uses [[:<:]] and [[:>:]] for word boundaries
        // We’ll use REGEXP_COUNT for each text field and sum.
        const sql = `
      SELECT
        t.thread_id,
        t.title,
        t.description,
        u.username,
        u.profile_image,
        t.views,
        t.likes AS thread_likes,
        COALESCE((
          SELECT COUNT(*) FROM comment_likes cl
          JOIN comments c2 ON c2.comment_id = cl.comment_id
          WHERE c2.thread_id = t.thread_id
        ), 0) AS comment_likes,

        -- frequency among thread fields
        REGEXP_COUNT(LOWER(t.title), CONCAT('[[:<:]]', LOWER(?), '[[:>:]]')) +
        REGEXP_COUNT(LOWER(t.description), CONCAT('[[:<:]]', LOWER(?), '[[:>:]]')) +
        -- frequency among comments of the thread
        COALESCE((
          SELECT SUM(REGEXP_COUNT(LOWER(c.content), CONCAT('[[:<:]]', LOWER(?), '[[:>:]]')))
          FROM comments c WHERE c.thread_id = t.thread_id
        ), 0) AS freq_score,

        -- fulltext relevance across threads+comments
        (MATCH(t.title, t.description) AGAINST (? IN NATURAL LANGUAGE MODE)) +
        COALESCE((
          SELECT SUM(MATCH(c.content) AGAINST (? IN NATURAL LANGUAGE MODE))
          FROM comments c WHERE c.thread_id = t.thread_id
        ), 0) AS ft_score

      FROM threads t
      JOIN users u ON u.user_id = t.user_id
      WHERE
        MATCH(t.title, t.description) AGAINST (? IN NATURAL LANGUAGE MODE)
        OR EXISTS (
          SELECT 1 FROM comments c
          WHERE c.thread_id = t.thread_id
            AND MATCH(c.content) AGAINST (? IN NATURAL LANGUAGE MODE)
        )
      ORDER BY freq_score DESC, ft_score DESC, (t.likes + (
        SELECT COUNT(*) FROM comment_likes cl
        JOIN comments c3 ON c3.comment_id = cl.comment_id
        WHERE c3.thread_id = t.thread_id
      )) DESC, t.views DESC, t.created_at DESC
      LIMIT 100;
    `;

        const params = [q, q, q, q, q, q, q];

        const [rows] = await pool.query(sql, params);

        const results = rows.map(r => ({
            thread_id: r.thread_id,
            title: r.title,
            description: r.description,
            username: r.username,
            profile_image: r.profile_image,
            views: r.views,
            total_likes: r.thread_likes + r.comment_likes,
            freq_score: r.freq_score,
            ft_score: r.ft_score
        }));

        res.render("search", {
            loggedIn: req.session.loggedIn,
            username: req.session.username,
            q,
            results
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).render("error", { message: "Search failed." });
    }
});

module.exports = router;
