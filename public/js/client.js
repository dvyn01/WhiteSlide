
document.addEventListener("DOMContentLoaded", () => {


    var socket_connect = function (room) {
        return io('localhost:3000', {
            query: 'r_var=' + room
        });
    }


    // Room id
    var room = document.getElementById('room').innerText.replace(/\s\s+/g, '');


    // Connect to room
    var socket = socket_connect(room);


    var mode = "pen";


    // Store write permissions
    var writePermission = true;


    var pen = document.getElementById('pen');
    var eraser = document.getElementById('eraser');


    // Select pen
    pen.onclick = function () {
        mode = "pen";
    }


    // Select eraser
    eraser.onclick = function () {
        mode = "eraser";
    }


    // To track position of mouse
    var mouse = {
        click: false,
        move: false,
        pos: { x: 0, y: 0 },
        pos_prev: false
    }


    // Get Canvas element and create context
    var canvas = document.getElementById('drawing');
    var context = canvas.getContext('2d');
    var width = window.innerWidth / 1.05;
    var height = window.innerHeight / 1.3;


    // set canvas to full browser width/height
    canvas.width = width;
    canvas.height = height;


    // register mouse event handlers
    canvas.onmousedown = function (e) {
        mouse.click = true;
    };

    canvas.onmouseup = function (e) {
        mouse.click = false;
    };


    canvas.onmousemove = function (e) {

        // normalize mouse position to range 0.0 - 1.0
        mouse.pos.x = e.clientX / width;
        mouse.pos.y = e.clientY / height * 0.85;
        mouse.move = true;
    };


    // draw line received from server
    socket.on('draw_line', function (data) {

        var line = data.line;
        context.beginPath();
        if (data.mode == "pen") {
            context.strokeStyle = "#000000";
            context.lineWidth = 2;
        }
        else {
            context.strokeStyle = "#FFFFFF";
            context.lineWidth = 5;
        }

        context.moveTo(line[0].x * width, line[0].y * height);
        context.lineTo(line[1].x * width, line[1].y * height);
        context.stroke();

    });



    socket.on('changePermission', () => {
        alert('Sorry! You do not have write permission now.');
        writePermission = false;
    });


    // main loop, running every 25ms
    function mainLoop() {

        // check if the user is drawing
        if (mouse.click && mouse.move && mouse.pos_prev) {

            // send line to to the server
            socket.emit('draw_line', { line: [mouse.pos, mouse.pos_prev], mode: mode });
            mouse.move = false;

        }
        mouse.pos_prev = { x: mouse.pos.x, y: mouse.pos.y };


        // If the user doesn't have write permission
        if (!writePermission) {
            console.log('You do not have write permission!');
            clearTimeout(mainLoop);
            return;
        }

        
        // Check for changes every 25ms
        setTimeout(mainLoop, 25);

    }

    mainLoop();

});