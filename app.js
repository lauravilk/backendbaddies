const express = require("express");
const fs = require("fs");
const path = require("path");
const { engine } = require("express-handlebars");

const app = express();
const PORT = 3000;

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

// GET kaikki leffat
app.get("/api/movies", (req, res) => {
res.json(movies);
});

// GET yks leffa
app.get("/api/movies/:id", (req, res) => {
const id = parseInt(req.params.id);
const movie = movies.find(m => m.id === id);

if (!movie) {
    return res.status(404).json({ message: "Movie not found" });
}

res.json(movie);
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

// DELETE leffa
app.delete("/api/movies/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const index = movies.findIndex(m => m.id === id);

if (index === -1) {
    return res.status(404).json({ message: "Movie not found" });
}

const deletedMovie = movies.splice(index, 1);
    res.json({
        message: "Movie deleted successfully",
        deletedMovie: deletedMovie[0]
    });
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