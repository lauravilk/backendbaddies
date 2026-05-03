const express = require("express");
const fs = require("fs");
const path = require("path");
const { engine } = require("express-handlebars");
const mongoose = require('mongoose');
require('dotenv').config();
const Movies = require('./models/Movies');
const UserModel = require("./models/UserModel");
const session= require('express-session');
const passport = require('passport');
require('./config/passport')(passport);

//middleware uusien elokuvien kuvien lisäystä varten
const multer = require('multer');

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

//stting up session for passport
app.use(session({
    //session cookie
    secret: 'secretkey',
    //if nothing changes doesnt save session again
    resave: false,
    //only creates session when user loggs in
    saveUninitialized: false
}));

//passport setup
app.use(passport.initialize());
app.use(passport.session());

//adding request user to show on all views
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Handlebar ja partialit
app.engine("handlebars", engine({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "views/partials")
}));

app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Home route ja newest movies
app.get("/", async (req, res) => {
    try {
        const newestMovies = await Movies.find()
            .sort({ releaseDate: -1 })
            .limit(8)
            .lean();

        res.render("home", {
            title: "Etusivu",
            newestMovies
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Error loading home page");
    }
});

// Movies sivu

app.get("/movies-page", async (req, res) => {
    const movies = await Movies.find().lean();

    res.render("movies", {
        title: "Movie List",
        movies
    });
});

// Login 

app.get("/login", (req, res) => {
    res.render("login", {
        error: req.query.error
    });
});

//Logout
app.get('/logout', (req, res, next) => {
    //removes user from session
    req.logout(function(err) {
        if (err) return next(err);
        //deleting the whole session
        req.session.destroy(() => {
            res.redirect('/login');
        });
    });
});

// Admin sivu
app.get("/admin", async (req, res) => {
    const movies = await Movies.find().lean();

    res.render("admin", {
        movies
    });
});

// APIT

// get all movies api
app.get('/api/movies', async (req, res) => {
    try {
        const result = await Movies.find();
        res.json({
            status: 'success',
            results: result.length,
            data: result
        });
    }
    catch (err) {
        console.log(err);
    }
});

// GET movie by id
app.get('/api/movies/:id', async (req,res) => {
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

// DELETE movie by id
app.delete('/api/movies/:id', async (req, res) => {
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

// Search movies by title
app.post('/api/movies/search/:key', async (req, res) => {
    const key = req.params.key
    console.log(key);

    try {
    let data = await Movies.find(
        {
            "$or": [
                {title: {$regex: key, $options: 'i'}}
            ]
        });
    res.json({
        status: 'success',
        results: data.length,
        data: data
    });
    }
    catch (err) {
        res.status(500).json({
            msg: "Error"
        })
    }
 });

// Lisää uusi elokuva

//mihin uuden elokuvan kuvat tallennetaan
const storage = multer.diskStorage({
    destination: (req,res, cb) => {
        cb(null, "public/images");
    },
    filename: (req, file, cb) =>{
        const imageName = Date.now() + path.extname(file.originalname);
        cb(null, imageName);
    }
});

const uploadImage = multer ({ storage });

app.get('/movies/add-movie/', (req,res) => {
    res.render("addMovie");
});

//api lisää elokuva
app.post("/api/movies", uploadImage.single("image"), async (req, res) => {
    try{
        const {description,title, director, releaseDate, genres, rating, watched, alt } = req.body;
        
        //tietojen validointi
        if (!title || !director || !releaseDate || !genres || rating === undefined) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newMovie = new Movies({
            description,
            title,
            director,
            releaseDate,
            genres: Array.isArray(genres) ? genres : genres.split(",").map(g => g.trim()),
            rating: Number(rating),
            watched: watched === "true" || watched === "on",
            alt,

            //kuvan lisäys
            image: req.file ? "/images/" + req.file.filename : null,
        });

        await newMovie.save();
        res.redirect("/admin");

    }
    catch(err) {
        res.status(500).json({
            msg: "error"
        });
    }

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

app.post("/movies/edit/:id", uploadImage.single("image"), async (req,res) => {
    
    try {
        const updatedInfo = {
        title : req.body.title,
        director: req.body.director,
        releaseDate: req.body.releaseDate,
        genres: req.body.genres.split(",").map(g => g.trim()),
        rating: Number(req.body.rating),
        watched: req.body.watched === "on"
    };
    //jos uusi kuva lisätään
    if (req.file) {
        updatedInfo.image = "/images/" + req.file.filename;
    }

    await Movies.findByIdAndUpdate(req.params.id, updatedInfo);
    res.redirect("/admin");
}
    catch (err){
        res.status(404).send(err.message);
    }
});

// Movie details page

app.get('/movies/:id', async (req, res) => {
    try {
    const movie = await Movies.findById(req.params.id).lean();

    if (!movie) {
        return res.status(404).send('Movie not found');
    }

    res.render('moviedetails', { movie });

    } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
}
});

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

// DELETE movie
app.post("/movies/delete/:id", async (req,res) => {
    const id = req.params.id;
    try {
        const movieToRemove = await Movies.findByIdAndDelete(id).lean();
        if (movieToRemove)
        {
            res.redirect("/admin");
        }
    } catch (err) {
        console.log(error);
        res.status(500).json({
            msg: 'Error, movie can not be deleted'
        })
    }
    
});

// Search movies by title
app.post('/search', async (req, res) => {
    const key = req.body.key
    console.log(key);

    try {
    let data = await Movies.find(
        {
            "$or": [
                {title: {$regex: key, $options: 'i'}}
            ]
        }).lean();
    res.render("movies", {movies: data, key: key});
    }
    catch (err) {
        res.status(500).json({
            msg: "Error"
        })
    }
 });

 // Search movies by genre
 app.post('/movies/search/genre', async (req, res) => {
    const genres = req.body.genre
    console.log(genres);
    try {
        const category = await Movies.find({genres: genres}).lean();
        res.render("movies", {movies: category, genres: genres});  
    } catch (err) {
        res.status(500).json({
            msg: "Kategoriaa ei löydy"
        });
    }
 });

 //Login api
app.post('/api/login', passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login?error=true'
}));

app.listen(PORT, () => {
console.log(`Server running at http://localhost:${PORT}`);
});
