var socket = io.connect("http://localhost:4000");

var divVideoChatLobby = document.getElementById("video-chat-lobby");
var divVideoChat = document.getElementById("video-chat-room");
var joinButton = document.getElementById("join");
var userVideo = document.getElementById("user-video");
var peerVideo = document.getElementById("peer-video");
var roomInput = document.getElementById("roomName");

console.log("socket:", socket);

joinButton.addEventListener('click', function() {
    if (roomInput.value == "") {
        alert("Please enter a room name");
    }
    else {

        // we need to let the server know that a user is trying to enter our room. Raise an 'event' and pass the roomname with it.
        socket.emit("join", roomInput.value);

        // navigator.mediaDevices.getUserMedia does NOT work!!!
        // navigator.getUserMedia() is a legacy method.
        navigator.getUserMedia(
        {
            audio: false,
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
    }
});

