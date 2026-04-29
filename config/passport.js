const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');

//configuring passport
module.exports = function(passport) {
    //using local strategy
    passport.use(new LocalStrategy(
    {
        usernameField: "name"
    },
    //passport searches for a name and ppassword, then finishes login
    async (name, password, done) => {

        try {
            //searching username from mongoDB
            const user = await UserModel.findOne({ name });
            //checking that user can be found
            console.log("USER FROM DB:", user);
            //if user is not found login fails
            if (!user) return done(null, false);
            //comparing input password to db hashed password
            const match = await bcrypt.compare(password, user.password);
            //if passwoprds dont match, login fails
            if (!match) return done(null, false);
            //if login successfull
            return done(null, user);

        } catch (err) {
            return done(err);
        }
    }
));
    //passport stores user id in session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    //passport takes user id and uses it for the session
    passport.deserializeUser(async (id, done) => {
    try {
        //loading usr data to make it awailable for user requests
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

};