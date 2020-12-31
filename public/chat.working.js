let socket = io.connect("http://localhost:4000");

let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let roomName = roomInput.value;

let creator = false;
let rtcPeerConnection;
let userStream;

let divButtonGroup = document.getElementById("btn-group");
let muteButton = document.getElementById("muteButton");
let hideCameraButton = document.getElementById("hideCameraButton");
let leaveRoomButton = document.getElementById("leaveRoomButton");

let muteFlag = false;
let hideCameraFlag = false;

// Contains the stun server URL we will be using.
let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

joinButton.addEventListener("click", function () {
  if (roomInput.value == "") {
    alert("Please enter a room name");
  } else {
    socket.emit("join", roomName);
  }
});

muteButton.addEventListener("click", function () {
  muteFlag = !muteFlag;
  if (muteFlag) {
    userStream.getTracks()[0].enabled = false;
    muteButton.textContent = "Unmute";
  } else {
    userStream.getTracks()[0].enabled = true;
    muteButton.textContent = "Mute";
  }
});

hideCameraButton.addEventListener("click", function () {
  hideCameraFlag = !hideCameraFlag;
  if (hideCameraFlag) {
    userStream.getTracks()[1].enabled = false;
    hideCameraButton.textContent = "Show Camera";
  } else {
    userStream.getTracks()[1].enabled = true;
    hideCameraButton.textContent = "Hide Camera";
  }
});

leaveRoomButton.addEventListener("click", function () {
  socket.emit("leave", roomName); //Let's the server know that user has left the room.

  divVideoChatLobby.style = "display:block"; //Brings back the Lobby UI
  divButtonGroup.style = "display:none";

  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of User.
    userVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of User
  }
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
    peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of Peer.
  }

  //Checks if there is peer on the other side and safely closes the existing connection established with the peer.
  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
});

socket.on("created", function () {
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

socket.on("full", function () {
  alert("Room is Full, Can't Join");
});

socket.on("ready", function () {
  if (creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.createOffer(
      function (offer) {
        rtcPeerConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomName);
      },
      function (error) {
        console.log(error);
      }
    );
  }
});

socket.on("candidate", function (candidate) {
  let icecandidate = new RTCIceCandidate(candidate);
  rtcPeerConnection.addIceCandidate(icecandidate);
});

socket.on("offer", function (offer) {
  if (!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.setRemoteDescription(offer);
    rtcPeerConnection.createAnswer(
      function (answer) {
        rtcPeerConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
      },
      function (error) {
        console.log(error);
      }
    );
  }
});

socket.on("answer", function (answer) {
  rtcPeerConnection.setRemoteDescription(answer);
});

socket.on("leave", function () {
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
  console.log("Candidate");
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

function OnTrackFunction(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}