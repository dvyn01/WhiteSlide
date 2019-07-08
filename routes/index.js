var express = require('express'),
    router = express.Router(),
    mongoose = require('mongoose'),
    Room = require('../models/room'),
    User = require('../models/user'),
    flash = require('connect-flash');


// Middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', 'You must Login first!');
        res.redirect('/login');
    }
}


// Home
router.get('/', (req, res) => {
    res.render('index');
});


// Assign a random ID to a room
function getRandomId() {
        var id = Math.floor(100000 + Math.random() * 900000).toString();
        return new Promise((resolve, reject) => {
            Room.findOne({ roomId: id }, (err, foundRoom) => {

                if (err) {
                    console.log('Something Bad Happened!');
                    reject(err);
                } else if (!foundRoom) {
                    resolve(id);
                } else {
                    setTimeout(getRandomId, 10);
                }

            });  
        });
}


// Create a new room
router.post('/', (req, res) => {
    getRandomId().then((data) => {
        res.redirect(`/${data}`);
    });
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
                roomId: room,
                isCreated: false
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
            req.flash('error', 'Please enter a valid room id!');
            res.redirect('/');
        } else {
            res.redirect(`/${room}`);
        }
    });

});

module.exports = router;

