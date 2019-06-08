var mongoose = require('mongoose'),
    passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new mongoose.Schema({
    name: String,
    password: String,
    rooms: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            roomName: String
        }
    ]
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);