import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import Container from '@mui/material/Container';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import MicIcon from '@mui/icons-material/Mic';
import './room.css';

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSendMessage = () => {
    socket.emit("chat:message", { to: remoteSocketId, message });
    setChatHistory([...chatHistory, { sender: "Me", message }]);
    setMessage(""); 
  };

  useEffect(() => {
    socket.on("chat:message", ({ sender, message }) => {
      setChatHistory((prevChatHistory) => [
        ...prevChatHistory,
        { sender, message },
      ]);
      console.log(`Message from ${sender}: ${message}`);
    });
  
    return () => {
      socket.off("chat:message");
    };
  }, [socket]);
  

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const toggleCamera = useCallback(async () => {
    const videoTrack = myStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
  }, [myStream]);

  const toggleMic = useCallback(async () => {
    const audioTrack = myStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
  }, [myStream]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  // const sendICECandidate = useCallback(async (event) => {
  //   if (event.candidate) {
  //     socket.emit("peer:ice", { to: remoteSocketId, candidate: event.candidate });
  //   }
  // }, [socket, remoteSocketId]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("peer:ice", (data) => {
      const { candidate } = data;
      peer.peer.addIceCandidate(candidate);
    });
    return () => {
      socket.off("peer:ice");
    };
  }, [socket]);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div className="outer-wrapper">
      <Container className="inner-wrapper">
        <h1>Vaarta Room</h1>
        {remoteSocketId ? <h4 className="connected"> Connected</h4> : <h4>No one in the room</h4>}
        {myStream && <button onClick={sendStreams} className="btn send">Send Stream</button>}
        {remoteSocketId && <button className="btn call" onClick={handleCallUser}>CALL</button>}
        {myStream && <button className="btn call" onClick={toggleCamera}><CameraAltIcon /></button>}
        {myStream && <button className="btn call" onClick={toggleMic}><MicIcon /></button>}
        <div className="streams" style={{ display: "flex" }}>
          {myStream && (
            <div className="stream-wrapper" style={{ flex: 1, marginRight: "10px" }}>
              <ReactPlayer
                playing
                height="100%"
                url={myStream}
                className="stream"
              />
              <h1>Your Stream</h1>
            </div>
          )}
          {remoteStream && (
            <div className="stream-wrapper" style={{ flex: 1 }}>
              <ReactPlayer
                playing
                height="100%"
                url={remoteStream}
                className="stream"
              />
              <h1>Receiver's Stream</h1>
            </div>
          )}
        </div>
      </Container>
      {remoteStream && (
        <div className="chatbox">
        <div className="chat-history">
          {chatHistory.map((item, index) => (
            <div key={index}>
              <strong>{item.sender}:</strong> {item.message}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            placeholder="Type your message..."
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
      )}
    </div>

  );

};

export default RoomPage;