const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: String
}, { collection: "users" });
module.exports = mongoose.model('user', userSchema);