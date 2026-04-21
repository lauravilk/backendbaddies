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

// Handlebar ja partialit
app.engine("handlebars", engine({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "views/partials")
}));

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

//EDIT MOVIE
//edit movie route, by id or name
app.get("/movies/edit/:value", async (req,res) => {
    const value = req.params.value;

    let movie; 
    //katsotaan onko value mongodb id
    const isValueId = value.length === 24;

    if (isValueId) {
        movie = await Movies.findById(value).lean();
    }
    //jos ei ole id etsii nimellä
    else {
        movie = await Movies.findOne({
            //etsitään valuea vastaava teksti regexillä, ignorataan iso ja pieni kirjain 
            title: {$regex: value, $options: "i"}
        }).lean();
    }
    //jos value ei vastaa mitään, error
    if (!movie){
        return res.status(404).send("Movie not found");
    }
    res.render("editMovie", { movie });
});

app.post("/movies/edit/:id", async (req,res) => {
    await Movies.findByIdAndUpdate(req.params.id, {
        title : req.body.title,
        director: req.body.director,
        releaseDate: req.body.releaseDate,
        genres: req.body.genres.split(",").map(g => g.trim()),
        rating: Number(req.body.rating),
        watched: req.body.watched === "on"
    });
    res.redirect("/");
})
//api
app.put("/api/movies/:id", async (req,res) => {
    try {
        //datan haku
        const { title, director, releaseDate, genres, rating, watched } = req.body;

        //mongoon päivitys
        const updatedMovie = await Movies.findByIdAndUpdate (
            req.params.id,
            //päivitettävä data
            {
                title,
                director,
                releaseDate,
                // katotaan löytyykö lisätty tieto jo genrestä, jos ei lisää listaan uuden String
                genres: Array.isArray(genres)
                    ? genres
                    : genres?.split(",").map(g => g.trim()),
                rating: Number(rating),
                watched: watched === true || watched === "true"
            },
            //palauttaa päivitetyn version
            {new: true}
        );

        //jos id ei löydy
        if(!updatedMovie) {
            return res.status(404).send("Movie not found.");
        }

        res.json(updatedMovie);
    }
    //errors
    catch (err) {
        res.status(500).send(err.message);
    }
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