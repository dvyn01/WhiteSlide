var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Room = require('../models/room'),
    User = require('../models/user');

    
// Middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}


// Home
router.get('/', (req, res) => {
    res.render('index', { message: "" });
});


// Assign a random ID to a room
function getRandomId() {
    return Math.floor(100000 + Math.random() * 900000);
}


// Create a new room
router.post('/', (req, res) => {
    var newId = getRandomId();
    res.redirect(`/${newId}`);
});


// Create a new room
router.get('/:id', (req, res) => {

    // Room id
    var room = req.params.id.toString();

    Room.findOne({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log('Something bad happened. Please try again!');
            res.redirect('back');
        } else if (!foundRoom) {                                                    // Room doesn't exist.
            Room.create({                                                           // Create a new room
                roomId: room
            }, function (err, createdRoom) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('New room created with id: ' + room);
                    res.render('show', { id: room });
                }
            });
        } else {
            res.render('show', { id: room });
        }
    });

});


// Join an existing room
router.post('/connect', (req, res) => {

    // Room id
    var room = req.body.roomName.toString();

    // Check if room exists
    Room.findOne({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log('Something bad happened. Please try again!');
            res.redirect('back');
        } else if (!foundRoom) {
            console.log('Room does not exist');
            res.render('index', { message: "Please enter a valid room id!" });
        } else {
            res.redirect(`/${room}`);
        }
    });

});

module.exports = router;

