let socket = io.connect("http://localhost:4000");

let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let roomName = roomInput.value;

// need to distinguish between user who created the room and the one who 'joins' it.
let creator = false;

// variable to contain a RTCPeerconnection type (provide by WebRTC)
let rtcPeerConnection;

// global variable to access stream in other functions
let userStream;

let divButtonGroup = document.getElementById("btn-group");
let muteButton = document.getElementById("muteButton");
let hideCameraButton = document.getElementById("hideCameraButton");
let leaveRoomButton = document.getElementById("leaveRoomButton");

// mute and hide are toggles
// 2 variable to hold these states
let muteFlag = false;
let hideCameraFlag = false;


// we are NOT using TURN servers for this project? why?
// Create a dictionary with a list of free STUN servers (MANY to choose from)
// we need client(s) to contact and get there 'public' addresses.
let iceServers = {
    iceServers: [
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
};

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

muteButton.addEventListener("click", function() {
    console.log("chat.js: mute");
    muteFlag = !muteFlag;
    if (muteFlag) {
        userStream.getTracks()[0].enabled = false; // disable audio stream
        muteButton.textContent = "Unmute";
    } else {
        userStream.getTracks()[1].enabled = true; // enable audio stream
        muteButton.textContent = "Mute";
        //muteFlag = false;
    }
});

hideCameraButton.addEventListener("click", function() {
    console.log("chat.js: hide camera");
    hideCameraFlag = !hideCameraFlag;
    if (hideCameraFlag) {
        userStream.getTracks()[1].enabled = false;  // disable the camera
        hideCameraButton.textContent = "Show Camera";
    } else {
        userStream.getTracks()[1].enabled = true;
        hideCameraButton.textContent = "Hide Camera";
        //hideCameraFlag = false;
    }
});

// 7 events to create and the callback functions are needed.
socket.on("created", function () {
    console.log("chat.js: created");
    creator = true;
  
    // navigator.getUserMedia() is a legacy method.
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { width: 500, height: 500 },
      })
      .then(function (stream) {
        /* use the stream */
        userStream = stream;

        // any time successfull callback, hide the lobby information
        divVideoChatLobby.style = "display:none";
        divButtonGroup.style = "display:flex";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = function (e) {
          userVideo.play();
        };
      })
      .catch(function (err) {
        /* handle the error */
        alert("Couldn't Access User Media");
      });
});


// Triggered when a room is succesfully joined.
socket.on("joined", function () {
    console.log("chat.js: joined");
    creator = false;
  
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { width: 500, height: 500 },
      })
      .then(function (stream) {
        /* use the stream */
        userStream = stream;
        divVideoChatLobby.style = "display:none";
        divButtonGroup.style = "display:flex";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = function (e) {
          userVideo.play();
        };
        socket.emit("ready", roomName);
      })
      .catch(function (err) {
        /* handle the error */
        alert("Couldn't Access User Media");
      });
});

socket.on("full", function() {
    console.log("chatjs: full");
    alert("Room is full, you can't join");
});

socket.on("ready", function() {
    console.log("chatjs: ready function");
    if (creator) {
        console.log("chatjs: setting up a new RTCPeerConnection");
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        // this is just an interface. RTC has only empty methods we have to implement ourselves! :()
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;

        // this 'ontrack' gets triggered when you get a Video stream from other peer
        rtcPeerConnection.ontrack = OnTrackFunction;

        //console.log(userStream.getTracks());

        // we also responble to send media information to the other peer. Send media
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // 0 - audio stream
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // 1 - video stream

        // emit this offer to our server, so it can broadcast it to the other side
        rtcPeerConnection.createOffer(
            function(offer) {
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit("offer", offer, roomName);
            },
            function(error){
                console.log(error)
            }
        );
    }
});

socket.on("candidate", function(candidate) {
    // type cast the candidate to a RTCIceCandidate type
    let icecandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(icecandidate);
    console.log("chatjs: Ice Candidate");
});

socket.on("offer", function(offer) {
    if (!creator) {
        console.log("chatjs: offer");
        rtcPeerConnection = new RTCPeerconnection(iceServers);
        // this is just an interface. RTC has only empty methods we have to implement ourselves! :()
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;

        // this 'ontrack' gets triggered when you get a Video stream from other peer
        rtcPeerConnection.ontrack = OnTrackFunction;

        // we also responble to send media information to the other peer. Send media
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // 0 - video stream
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // 1 - audio stream

        rtcPeerConnection.setRemoteDescription(offer);

        // emit this offer to our server, so it can broadcast it to the other side
        rtcPeerConnection.createAnswer(
            function(answer) {
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit("answer", answer, roomName);
            },
            function(error){
                console.log(error)
            }
        );
    }    
});

socket.on("answer", function(answer) {
    console.log("chatjs: answer");
    rtcPeerConnection.setRemoteDescription(answer);
});


leaveRoomButton.addEventListener("click", function() {
    // let the server know this peer wants to leave the room
    console.log("chat.js: leave");
    socket.emit("leave", roomName);

    // clean up the UI a bit as we want to remove elements from showing up
    divVideoChatLobby.style = "display:block";
    divButtonGroup.sytle = "display:none";

    if (userVideo.srcObject) {
        // get rid of user-video and peer-video
        userVideo.srcObject.getTracks()[0].stop();
        userVideo.srcObject.getTracks()[1].stop();
    }
    //userVideo.srcObject.getTracks().forEach( (track) => track.stop());

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    // close the connection we established previously
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
});

// leave callback function executes on the side of the person leaving the room
socket.on("leave", function() {
    // close the connection we established previously
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }  

    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }      

    // leave user-video alone as the user still should see his own video
});

// need to exchange ICE candiates
function OnIceCandidateFunction(event) {
    if (event.candidate) {
        console.log("chatjs: onIceCandidateFunction");
        socket.emit("candidate", event.candidate, roomName);
    }
}

function OnTrackFunction(event) {
    console.log("chatjs: ontrack got triggered!");
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function (e) {
        peerVideo.play();
    }
}