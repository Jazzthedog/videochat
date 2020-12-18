var socket = io.connect("http://localhost:4000");

var divVideoChatLobby = document.getElementById("video-chat-lobby");
var divVideoChat = document.getElementById("video-chat-room");
var joinButton = document.getElementById("join");
var userVideo = document.getElementById("user-video");
var peerVideo = document.getElementById("peer-video");
var roomInput = document.getElementById("roomName");
var roomName = roomInput.value;

// need to distinguish between user who created the room and the one who 'joins' it.
var creator = false;

console.log("socket:", socket);

joinButton.addEventListener("click", function() {
    if (roomInput.value == "") {
        alert("Please enter a room name");
    }
    else {

        // we need to let the server know that a user is trying to enter our room. 
        // Raise an 'event' and pass the roomname with it.
        socket.emit("join", roomName);
    }
});

// 7 events to and the callback functions are needed.
socket.on("created", function() {

    console.log("chatjs:created");
    creator = true;

    // navigator.mediaDevices.getUserMedia does NOT work!!!
    // navigator.getUserMedia() is a legacy method.
    navigator.getUserMedia(
        {
            audio: false, // turn off audio for now as i get feedback??
            video: { width: 1280, height: 720 },
        },
        function(stream) {
            // any time successfull callback, hide the lobby information
            divVideoChatLobby.style = "display:none";
            userVideo.srcObject = stream;
            userVideo.onloadedmetadata = function(e) {
                userVideo.play();
            };
        },
        function() {
            alert("Could not access User Media");
        }
    );

});

socket.on("joined", function() {

    console.log("chatjs:join");
    creator = false;

    // navigator.mediaDevices.getUserMedia does NOT work!!!
    // navigator.getUserMedia() is a legacy method.
    navigator.getUserMedia(
    {
        audio: false, // turn off audio for now as i get feedback??
        video: { width: 1280, height: 720 },
    },
    function(stream) {
        // any time successfull callback, hide the lobby information
        divVideoChatLobby.style = "display:none";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = function(e) {
            userVideo.play();
        };
    },
    function() {
        alert("Could not access User Media");
    }
    )
});


socket.on("full", function() {
    console.log("chatjs:full");
    alert("Room is full, you can't join");
});


socket.on("ready", function() {});
socket.on("candidate", function() {});
socket.on("offer", function() {});
socket.on("answer", function() {});

