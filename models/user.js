var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    name: String,
    password: String,
    rooms: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room"
        }
    ]
});

module.exports = mongoose.model("User", userSchema);