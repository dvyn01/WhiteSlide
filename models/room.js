var mongoose = require('mongoose');


var roomSchema = new mongoose.Schema({
    roomId: String,
    lineHistory: [{
        pos: { x: Number, y: Number },
        pos_prev: { x: Number, y: Number },
        mode: String
    }],
    isCreated: Boolean
});


module.exports = mongoose.model("Room", roomSchema);
