// routes/random.js
const express = require("express");
const router = express.Router();
const pool = require("../db/connection");

// Redirect to a random thread
router.get("/random", async (req, res) => {
    try {
        const [[randomThread]] = await pool.query(
            `SELECT thread_id FROM threads ORDER BY RAND() LIMIT 1`
        );
        if (randomThread) {
            return res.redirect(`/threads/${randomThread.thread_id}`);
        }
        res.redirect("/"); // fallback if no threads exist
    } catch (err) {
        console.error("Random thread error:", err);
        res.status(500).render("error", { message: "Couldn't load random thread." });
    }
});

module.exports = router;
