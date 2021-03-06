//let socket = io.connect("http://localhost:4000");

let socket = io();

let message = document.getElementById("message");
let button = document.getElementById("send");
let username = document.getElementById("username");
let output = document.getElementById("output");

let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let roomName;

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

// Contains the stun server URL we will be using.
// we are NOT using TURN servers for this project? why?
// Create a dictionary with a list of free STUN servers (MANY to choose from)
// we need client(s) to contact and get there 'public' addresses.
let iceServers = {
  iceServers: [
    {
        urls: 'turn:numb.viagenie.ca:3489',
        credential: '3cJIyEJ7pRLa',
        username: 'jazzthedog.bowwow@gmail.com'
    },      
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

button.addEventListener('click', function() {
  socket.emit("sendMessage",  {
      message: message.value,
      username: username.value,
  });
  console.log("chat.js: sendMessage");
});

// display what's broadcasted when socket get a 'broadcastMessage' event.
socket.on("broadcastMessage", function(data) {
  output.innerHTML += '<p><strong>' + data.username + ': <strong>' + data.message + '</p>';
  console.log("chat.js: broadcastMessage");
});

joinButton.addEventListener("click", function() {
    console.log("chat.js: join");
    if (roomInput.value == "") {
        alert("Please enter a room name");
    } else {
        roomName = roomInput.value;
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
        userStream.getTracks()[0].enabled = true; // enable audio stream
        muteButton.textContent = "Mute";
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
    }
});

leaveRoomButton.addEventListener("click", function() {
    console.log("chat.js: leave");
    socket.emit("leave", roomName);

    divVideoChatLobby.style = "display:block";
    divButtonGroup.style = "display:none";

    if (userVideo.srcObject) {
        userVideo.srcObject.getTracks()[0].stop();
        userVideo.srcObject.getTracks()[1].stop();
    }
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

socket.on("created", function () {
    console.log("chat.js: created");
    creator = true;
  
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
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
        audio: true,
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
    console.log("chat.js: full");
    alert("Room is full, you can't join");
});

socket.on("ready", function() {
    console.log("chat.js: ready");
    if (creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // 0 - audio stream
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // 1 - video stream

        // rtcPeerConnection.createOffer(
        //     function(offer) {
        //         rtcPeerConnection.setLocalDescription(offer);
        //         socket.emit("offer", offer, roomName);
        //     },
        //     function(error){
        //         console.log(error)
        //     }
        // );
        rtcPeerConnection
            .createOffer()
            .then( (offer) => {
                rtcPeerConnection.setLocalDescription(offer);
                socket.emit("offer", offer, roomName);
            })
            .catch( (error) => {
                console.log(error)
            });            
    }
});

socket.on("candidate", function(candidate) {
    console.log("chat.js: candidate");
    let icecandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(icecandidate);
});

socket.on("offer", function(offer) {
    console.log("chat.js: offer");
    if (!creator) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
        rtcPeerConnection.ontrack = OnTrackFunction;
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // 0 - video stream
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // 1 - audio stream
        rtcPeerConnection.setRemoteDescription(offer);

        // rtcPeerConnection.createAnswer(
        //     function(answer) {
        //         rtcPeerConnection.setLocalDescription(answer);
        //         socket.emit("answer", answer, roomName);
        //     },
        //     function(error){
        //         console.log(error)
        //     }
        // );

        rtcPeerConnection
            .createAnswer()
            .then( (answer) => {
                rtcPeerConnection.setLocalDescription(answer);
                socket.emit("answer", answer, roomName);
            })
            .catch( (error) => {
                console.log(error)
            });
    }    
});

socket.on("answer", function(answer) {
    console.log("chat.js: answer");
    rtcPeerConnection.setRemoteDescription(answer);
});

socket.on("leave", function () {
  console.log("chat.js: leave");
  creator = true; //This person is now the creator because they are the only person in the room.
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
    peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving video track of Peer.
  }

  //Safely closes the existing connection established with the peer who left.

  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
});

function OnIceCandidateFunction(event) {
  console.log("OnIceCandidateFunction");
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

function OnTrackFunction(event) {
  console.log("OnTrackFunction");
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}

//In case user just closes browser tab or exits WITHOUT leave..
socket.on('disconnect', function () {
  // same code as leave button!
  console.log("chat.js: disconnect");
  socket.emit("leave", roomName);

  divVideoChatLobby.style = "display:block";
  divButtonGroup.style = "display:none";

  if (userVideo.srcObject) {
      userVideo.srcObject.getTracks()[0].stop();
      userVideo.srcObject.getTracks()[1].stop();
  }
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