var mongoose = require('mongoose'),
    passportLocalMongoose = require('passport-local-mongoose');


var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    firstName: String,
    lastName: String,
    rooms: [{
        roomInfo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
        },
        roomName: String
    }]
});


userSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model("User", userSchema);