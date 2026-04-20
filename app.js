const express = require("express");
const fs = require("fs");
const path = require("path");
const { engine } = require("express-handlebars");
const mongoose = require('mongoose');
require('dotenv').config();
const Movies = require('./models/Movies');

const app = express();
const PORT = 3000;

const uri = process.env.URI;

//Tietokantayhteys
mongoose.connect(uri)
.then((result) => console.log("Connected to DB"))
.catch((err) => console.log(err));

//Parsinnat ja staattiset filut
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Handlebar
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Datan luku JSONista
const filePath = path.join(__dirname, "data", "movies.json");
let movies = JSON.parse(fs.readFileSync(filePath, "utf-8"));

// Home route
app.get("/", (req, res) => {
res.redirect("/movies-page");
});

// GET movie by id
app.get('/movies/:id', async (req,res) => {
    const id = req.params.id;
    console.log(id)
    try {
        const movie = await Movies.findById(id);
        if (movie)
        {
            res.status(200).json(movie);
        }
    res.json(movie);
    }
    catch (err) {
        console.log(error);
        res.status(500).json({
            msg: 'Error! Movie not found'
        })
    }
    
});

// POST uus leffa
app.post("/api/movies", (req, res) => {
const { title, director, releaseDate, genres, rating, watched } = req.body;

if (!title || !director || !releaseDate || !genres || rating === undefined || watched === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
}

const newMovie = {
    id: movies.length > 0 ? Math.max(...movies.map(m => m.id)) + 1 : 1,
    title,
    director,
    releaseDate,
    genres: Array.isArray(genres) ? genres : genres.split(",").map(g => g.trim()),
    rating: Number(rating),
    watched: watched === true || watched === "true"
};

movies.push(newMovie);
res.status(201).json(newMovie);
});

// PUT update leffa
app.put("/api/movies/:id", (req, res) => {
const id = parseInt(req.params.id);
const movie = movies.find(m => m.id === id);

if (!movie) {
    return res.status(404).json({ message: "Movie not found" });
}

const { title, director, releaseDate, genres, rating, watched } = req.body;

if (title !== undefined) movie.title = title;
if (director !== undefined) movie.director = director;
if (releaseDate !== undefined) movie.releaseDate = releaseDate;
if (genres !== undefined) {
    movie.genres = Array.isArray(genres) ? genres : genres.split(",").map(g => g.trim());
}
if (rating !== undefined) movie.rating = Number(rating);
if (watched !== undefined) movie.watched = watched === true || watched === "true";

res.json(movie);
});

// DELETE movie by id
app.delete('/movies/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const MovieToRemove = await Movies.findByIdAndDelete(id);
        if (MovieToRemove)
        {
            res.status(200).json({
                msg: 'Movie deleted'
            });
        }
        res.json(MovieToRemove)
    }
    catch (err) {
        console.log(error);
        res.status(500).json({
            msg: 'Error, movie can not be deleted'
        })
    }
});


app.get("/movies-page", (req, res) => {
res.render("movies", {
    title: "Movie List",
    movies
});
});

app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});