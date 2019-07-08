const express = require('express'),
    http = require('http'),
    socketIO = require('socket.io'),
    ejs = require('ejs'),
    path = require('path'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    localStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose'),
    expressSession = require('express-session'),
    Room = require('./models/room'),
    User = require('./models/user'),
    userRoutes = require('./routes/user'),
    indexRoute = require('./routes/index'),
    flash = require('connect-flash');


// Create server and use socket.io
const app = express(),
    server = http.createServer(app),
    io = socketIO.listen(server);


mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Use connect-flash
app.use(flash());


// Use ejs
app.set('view engine', 'ejs');


// Use body-parser
app.use(bodyParser.urlencoded({ extended: true }));


// Initialize passport
app.use(expressSession({
    secret: "This is secret! Shush!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session())


passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// Connect to the database
mongoose.connect('mongodb://localhost/socket_io');


// Pass current user and flash message details to every route
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();                                                                                 // next function to call
});


// Middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', 'Please Login First!');
        res.redirect('/login');
    }
}


// Use Auth Routes
app.use(userRoutes);


// Use Index Routes
app.use(indexRoute);


// function to draw all the previous lines when a new user is connected to a room
function loadHistory(socket, room) {

    Room.findOne({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log('Something bad happened. Please try again!');
        } else if (!foundRoom) {                                                            // Room doesn't exist.
            console.log('Room not found');
        } else {                                                                            // Room with id exists
            foundRoom.lineHistory.forEach(line => {
                var thisLine = [
                    { x: line.pos_prev.x, y: line.pos_prev.y },
                    { x: line.pos.x, y: line.pos.y }
                ];
                var mode = line.mode;
                socket.emit('draw_line', {
                    line: thisLine,
                    mode: mode
                });
            });
        }
    });

}


// On connection
io.on('connection', (socket) => {

    // Room id
    var room = socket.handshake['query']['r_var'].replace(/(\r\n|\n|\r)/gm, "");            // Remove all the whitespaces


    io.of('/').adapter.clients([room], (err, clients) => {                                  // clients is an array containing all connected users
        var connectedUsersCount = clients.length;                                           // Number of connected users in a room


        // If there are no users currently  
        if (connectedUsersCount == 0) {

            Room.findOne({ roomId: room }, (err, foundRoom) => {
                if (err) {
                    console.log(err);
                } else {

                    // If the room is already created with no users online
                    if (foundRoom.isCreated) {
                        socket.emit('changePermission');
                        return;
                    } else {                                                                // Create new room

                        // Join room
                        socket.join(room);
                        foundRoom.isCreated = true;
                        foundRoom.save();
                    }
                }
            })
        } else {

            // // Join room
            socket.join(room);
        }
    });



    // On disconnection
    socket.on('disconnect', () => {
        socket.leave(room);
        console.log('user disconnected');
    });


    // Fetch lineHistory for the room
    loadHistory(socket, room);

    
    // Add handler for message type "draw_line".
    socket.on('draw_line', function (data) {

        var thisLine = {
            pos: { x: data.line[1].x, y: data.line[1].y },
            pos_prev: { x: data.line[0].x, y: data.line[0].y },
            mode: data.mode
        };

        Room.findOneAndUpdate({ roomId: room },
            { $push: { lineHistory: thisLine } },
            { new: true },
            (err, success) => {
                if (err) {
                    console.log(err)
                } else {
                    io.in(room).emit('draw_line', { line: data.line, mode: data.mode });
                }
            }
        );
    });

});


// Server on port 3000
server.listen(3000, () => {
    console.log('Server started at port 3000');
});