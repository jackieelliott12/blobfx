//code frame from class github repo examples
//Initialize the express 'app' object
let express = require('express');
let app = express();
app.use('/', express.static('public'));

//Initialize the actual HTTP server
let http = require('http');
let server = http.createServer(app);
let port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log("Server listening at port: " + port);
});

//Initialize socket.io
let io = require('socket.io');
io = new io.Server(server);

//console log new client connection
io.sockets.on('connection', function(socket) {
    console.log("We have a new client: " + socket.id);

    //look for blob position updates
    socket.on('blobMove', function(data) {
        console.log("Server received blobMove:", data);
        io.sockets.emit('blobMove', data);
        console.log("Server broadcasted movement to all clients");
    });

    //look for joint creation
    socket.on('jointCreated', function(data) {
        console.log("Server received joint creation:", data);
        io.sockets.emit('jointCreated', data);
    });

    //look for joints destroyed
    socket.on('jointDestroyed', function(data) {
        console.log("Server received joint destruction:", data);
        io.sockets.emit('jointDestroyed', data);
    });

    //listen for client to disconnect
    socket.on('disconnect', function() {
        console.log("A client has disconnected: " + socket.id);
    });
});
