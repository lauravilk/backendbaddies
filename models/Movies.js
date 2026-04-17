const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: {
        type:String,
        required: true
    },
    director: String,
    genres: Array,
    releaseDate: String,
    rating: Number,
    watched: Boolean
});

module.exports = mongoose.model("Movies", movieSchema);
