var express = require('express'),
    router = express.Router(),
    User = require('../models/user'),
    Room = require('../models/room'),
    passport = require('passport')
    mongoose = require('mongoose'),
    flash = require("connect-flash");


// Middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', 'You must Login first!');
        res.redirect('/login');
    }
}


// Register new user
router.get('/register', (req, res) => {
    res.render('register');
});


// Register logic
router.post('/register', (req, res) => {

    User.register(new User({

        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName

    }), req.body.password, (err, user) => {

        if (err) {
            req.flash('error', err.message);
            res.redirect('back');
        } else {
            passport.authenticate('local')(req, res, () => {
                req.flash('success', 'You have been successfully registered!');
                res.redirect('/');
            });
        }

    });

});


// Login route
router.get('/login', (req, res) => {
    res.render('login');
});


// Login logic
router.post('/login', passport.authenticate("local", {
    successRedirect: '/',
    failureRedirect: '/login'
}), (req, res) => {

});


// logout
router.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    req.flash('success', 'You have been successfully logged out!');
    res.redirect('/');
});


// User profile
router.get('/home', isLoggedIn, (req, res) => {

    Room.find({}, (err, room) => {
        if(err) {
            console.log(err);
        } else {
            res.render('profile', {rooms: room});     
        }
    });

});


// Add a new room for a user
router.post('/user/rooms/new', isLoggedIn, (req, res) => {

    var room = req.body.roomId,
        userName = req.user.username,
        roomName = req.body.roomName;

    Room.findOne({ roomId: room }, (err, foundRoom) => {

        if (err) {
            console.log('Something Bad Happened!');
            res.redirect('back');
        } else {
            User.findOneAndUpdate({ username: userName },
                { $push: { rooms: {roomInfo: foundRoom, roomName: roomName} } },
                { new: true },
                (err, foundUser) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(foundUser);
                    }
                }
            );
        }

    });

    res.redirect('/home');

});


module.exports = router;
