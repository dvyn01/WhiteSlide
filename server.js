const express = require('express'),
    http = require('http'),
    socketIO = require('socket.io'),
    ejs = require('ejs'),
    path = require('path'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    Room = require('./models/room'),
    User = require('./models/user');

const app = express(),
    server = http.createServer(app),
    io = socketIO.listen(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Use ejs
app.set('view engine', 'ejs');
// Use body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to the database
mongoose.connect('mongodb://localhost/socket_app');

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

    Room.find({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log('Something bad happened. Please try again!');
            res.redirect('back');
        } else if (!foundRoom.length) {                                             // Room doesn't exist.
            Room.create({                                                           // Create a new room
                roomId: room,
            }, function (err, createdRoom) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('New room created with id: ' + room);
                    res.render('show', { id: req.params.id });
                }
            });
        } else {                                                                   // Room with id already exists
            res.render('show', { id: req.params.id });
        }
    });
});

// Join an existing room
app.post('/connect', (req, res) => {

    // Room id
    var room = req.body.roomName;

    // Check if room exists
    Room.find({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log('Something bad happened. Please try again!');
            res.redirect('back');
        } else if (!foundRoom.length) {
            console.log('Room does not exist');
            res.render('index', { message: "Please enter a valid room id!" });
        } else {
            res.redirect(`/${room}`);
        }
    });
});

io.on('connection', (socket) => {

    // Room id
    var room = socket.handshake['query']['r_var'];

    // Join room
    socket.join(room);                                                          // Join particular room
    
    console.log('user has joined room ' + room);

    Room.findOne({ roomId: room }, (err, foundRoom) => {
        if (err) {
            console.log(err);
        } else {
            foundRoom.lineHistory.forEach(line => {
                var thisLine = [{ x: line.pos.x, y: line.pos.y }, { x: line.pos_prev.x, y: line.pos_prev.y }];
                var mode = line.mode;
                socket.emit('draw_line', { line: thisLine, mode: mode });
            });
        }
    });

    // On disconnection
    socket.on('disconnect', () => {
        socket.leave(room);
        console.log('user disconnected');
    });

    // add handler for message type "draw_line".
    socket.on('draw_line', function (data) {

        var thisLine = { pos: { x: data.line[0].x, y: data.line[0].y }, pos_prev: { x: data.line[1].x, y: data.line[1].y }, mode: data.mode };

        Room.findOneAndUpdate({ roomId: room }, { $push: { lineHistory: thisLine } },
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