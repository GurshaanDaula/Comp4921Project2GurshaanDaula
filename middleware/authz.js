// middleware/authz.js
const pool = require("../db/connection");

// Require login
// Require login
function ensureLoggedIn(req, res, next) {
    if (req.session?.loggedIn) return next();

    // Handle AJAX or form POSTs differently
    if (req.method === "POST") {
        // For API/fetch: respond JSON; for HTML form: redirect manually
        if (req.headers.accept && req.headers.accept.includes("application/json")) {
            return res.status(401).json({ success: false, message: "Login required" });
        } else {
            // fallback for normal form submissions
            return res.redirect("/login");
        }
    }

    // For normal GET routes
    return res.redirect("/login");
}


// Only the comment owner can edit their comment.
// Thread owner may delete *others'* comments on that thread.
async function ensureCanModifyComment(req, res, next) {
    try {
        const userId = req.session.user_id;
        const commentId = req.params.comment_id;

        const [[comment]] = await pool.query(
            `SELECT c.comment_id, c.user_id, c.thread_id, t.user_id AS thread_owner
       FROM comments c
       JOIN threads t ON t.thread_id = c.thread_id
       WHERE c.comment_id = ?`,
            [commentId]
        );

        if (!comment) return res.status(404).render("error", { message: "Comment not found." });

        // Allow if user owns the comment
        if (comment.user_id === userId) {
            res.locals.comment = comment;
            return next();
        }

        // Allow delete (not edit) if user owns the thread
        if (req.method === "POST" && req.path.includes("/delete") && comment.thread_owner === userId) {
            res.locals.comment = comment;
            return next();
        }

        return res.status(400).render("error", { message: "Not authorized for this action." });
    } catch (err) {
        console.error("Authorization error:", err);
        return res.status(500).render("error", { message: "Authorization error." });
    }
}

module.exports = { ensureLoggedIn, ensureCanModifyComment };
