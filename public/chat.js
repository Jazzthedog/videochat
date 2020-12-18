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

// RTCPeerconnection (provide by WebRTC)
var rtcPeerConnection;

// we are NOT using TURN servers for this project? why?
// Create a dictionary with a list of free STUN servers (MANY to choose from)
// we need client(s) to contact and get there 'public' addresses.
var iceServers = {
    iceServers: [
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
};

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

    console.log("chatjs:joined");
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
            // after entering the room, we trigger the 'ready' event.
            socket.emit("ready", roomName);
        },
        function() {
            alert("Could not access User Media");
        }
    );
});


socket.on("full", function() {
    console.log("chatjs:full");
    alert("Room is full, you can't join");
});


socket.on("ready", function() {
    if (creator) {
        RTCPeerconnection = new RTCPeerconnection(iceServers);
        // this is just an interface. RTC has only empty methods we have to implement ourselves! :()
        RTCPeerconnection.oniceCandidate = onIceCandidateFunction;
    }
});
socket.on("candidate", function() {});
socket.on("offer", function() {});
socket.on("answer", function() {});

// need to exchange ICE candiates
function onIceCandidateFunction(event) {
    if (event.candidate) {
        socket.emit("candidate", event.candidate, roomName);
    }
}