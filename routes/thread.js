const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    username: String,
    profile_image: String,
    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    comment_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Thread", threadSchema);
