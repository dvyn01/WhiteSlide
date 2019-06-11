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
    User = require('./models/user');

const app = express(),
    server = http.createServer(app),
    io = socketIO.listen(server);


mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
// mongoose.set('useCreateIndex', true);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

// Pass current user details to every route
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();                                                                 // next function to call
});

// Middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// ===================================================================
//                          Auth Routes
// ===================================================================

// Register new user
app.get('/register', (req, res) => {
    res.render('register');
});

// Register logic
app.post('/register', (req, res) => {
    User.register(new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    }), req.body.password, (err, user) => {
        if (err) {
            console.log('Something Bad Happened!');
            res.redirect('back');
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/');
            });
        }
    });
});

// Login route
app.get('/login', (req, res) => {
    res.render('login');
});

// Login logic
app.post('/login', passport.authenticate("local", {
    successRedirect: '/',
    failureRedirect: '/login'
}), (req, res) => {

});

// logout
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('back');
});

// User profile
app.get('/home', isLoggedIn, (req, res) => {
    Room.find({}, (err, room) => {
        if(err) {
            console.log(err);
        } else {
            res.render('profile', {rooms: room});     
        }
    });
});

// Add a new room for a user
app.post('/user/rooms/new', (req, res) => {
    var room = req.body.roomId,
        userName = req.user.username,
        roomName = req.body.roomName;
    Room.findOne({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log('Something Bad Happened!');
            res.redirect('back');
        } else {
            User.findOneAndUpdate({ username: userName },
                { $push: { rooms: foundRoom } },
                { new: true },
                (err, foundUser) => {
                    if (err) {
                        console.log(err)
                    } else {
                        console.log(foundUser);
                    }
                }
            );
        }
    });
    res.redirect('/home');
});


//
//
//

// Home
app.get('/', (req, res) => {
    res.render('index', { message: "" });
});

function getRandomId() {
    return Math.floor(100000 + Math.random() * 900000);
}

// Create a new room
app.post('/', (req, res) => {
    var newId = getRandomId();
    res.redirect(`/${newId}`);
});

// Create a new room
app.get('/:id', (req, res) => {

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
app.post('/connect', (req, res) => {

    // Room id
    var room = req.body.roomName;

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

io.on('connection', (socket) => {

    // Room id
    var room = socket.handshake['query']['r_var'].replace(/(\r\n|\n|\r)/gm, "");            // Remove all the whitespaces

    // Join room
    socket.join(room);

    console.log('user has joined room ' + room);

    // On disconnection
    socket.on('disconnect', () => {
        socket.leave(room);
        console.log('user disconnected');
    });

    // Fetch lineHistory for the room
    loadHistory(socket, room);

    // add handler for message type "draw_line".
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