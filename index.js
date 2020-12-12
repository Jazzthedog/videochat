const express = require('express');
const socket = require('socket.io');

var app = express();

// callback function
var server = app.listen(4000, function() {
    console.log("Listening on port 4000");
});

// interesting use of this method to point to a folder?? this will render index.html automatically
app.use(express.static('public'));
