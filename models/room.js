var mongoose = require('mongoose');

var roomSchema = new mongoose.Schema({
    roomId: String,
    lineHistory: [{
        pos: { x: Number, y: Number },
        pos_prev: { x: Number, y: Number },
        mode: String
    }]
});               //override default collection name

module.exports = mongoose.model("Room", roomSchema);
