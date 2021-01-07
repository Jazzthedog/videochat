const express = require("express");
const socket = require("socket.io");
const app = express();

// callback function
// let server = app.listen(4000, function() {
//     console.log("Listening on port 4000");
// });

let server = app.listen(process.env.PORT || 4000, function() {
    console.log("Listening on port 4000");
});

// interesting use of this method to point to a folder?? this will render index.html by default.
app.use(express.static("public"));

// wrap the server with socket.io , not 100% sure why we need this fully?
let io = socket(server);

io.on("connection", function(socket) {
    console.log("User Connected :", socket.id);

    socket.on("join", function(roomName) {
        // each room can only have 2 particants
        // each room name is unique, so if room doesn't exist, we create one. 
        // If roomname already exists, let user join it.
        // If the room already has 2 people in it, let user not join.

        // get a map or list of existing websocket connections
        let rooms = io.sockets.adapter.rooms;
        console.log("rooms:", rooms);

        //check to see if room already exists
        //var room = io.sockets.adapter.rooms.get(roomName);

        let room = rooms.get(roomName);
        console.log("roomName: ", roomName);

        // if room is undefined, we will dynamically create one.
        if (room == undefined) {
            // no room exists so create one dynamically
            console.log("Room Created");
            socket.join(roomName);

            //console.log("room:", io.sockets.adapter.rooms.get(roomName) );

            // let the client side know we created a room with "created" event
            socket.emit("created");
        }
        else if (room.size == 1) {
            socket.join(roomName);
            console.log("Room Joined");

            // let client side know we "joined" a room.
            socket.emit("joined");
        }
        else {
            console.log("Room full (2 people max) for now");

            // let client side know the room is full
            socket.emit("full");
        }
    });

    // let know that some one joined the room with a 'ready' event
    // everything our server gets a 'ready' event, it broadcast that event to the 
    // other peers in the room
    socket.on("ready", function(roomName) {
        console.log("ready event on server!")
        socket.broadcast.to(roomName).emit("ready");
    });

    // we also have to send ICE candidate to get the 'public' address.
    socket.on("candidate", function(candidate, roomName) {
        console.log("candidate event on server!")
        socket.broadcast.to(roomName).emit("candidate", candidate);
    });

    // Offer and Answer - STP
    // Server needs to broadcast offer and answer
    socket.on("offer", function(offer, roomName) {
        console.log("offer event on server!")
        //console.log(offer);
        socket.broadcast.to(roomName).emit("offer", offer);
    });

    socket.on("answer", function(answer, roomName) {
        console.log("answer event on server!")
        //console.log(answer);
        socket.broadcast.to(roomName).emit("answer", answer);
    });    

    socket.on("leave", function(roomName) {
        console.log("leave event on server!");
        socket.leave(roomName);

        // let the other peer know you also left the room.
        // server needs to broadcast to other peer
        socket.broadcast.to(roomName).emit("leave");
    });
});



