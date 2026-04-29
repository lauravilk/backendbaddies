const mongoose = require("mongoose");
bcrypt = require("bcrypt");
const User = require("./models/UserModel"); 
require("dotenv").config(); 

async function createAdmin() {
    try {
        const uri = process.env.URI;
        await mongoose.connect(uri);

        const existing = await User.findOne({ name: "admin" });

        if (existing) {
            console.log("Admin already exists");
            return;
        }

        const admin = new User({
            name: "admin",
            password: await bcrypt.hash("admin123", 10)
        });

        await admin.save();

        console.log("New admin created");

    } catch (err) {
        console.error("Error creating user:", err);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();