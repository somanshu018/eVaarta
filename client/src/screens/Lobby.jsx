import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import './lobby.css';

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { email, room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="container">
      
      <Box className="lobby" m="auto" sx={{
        width: 500,
        height: 375,
        color: 'black',
        alignItems: "center",
        backgroundColor: 'rgb(250, 249, 246)',
      }}>
        <Container className="wrapper">
          <Container className="header">
            <h2 className="name">eVaarta</h2>
          </Container>
          <Container>
            <h1 className="lobby-head">LOBBY</h1>
            <form onSubmit={handleSubmitForm}>
              <label htmlFor="email" className="email-label">Email ID</label>
              <br/>
              <input
                className="inp email"
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <br />
              <label className="roomLabel" htmlFor="room">Room Number</label>
              <br/>
              <input
                className="inp roomNo"
                type="text"
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
              <br />
              <button className="join">Join</button>
            </form>
          </Container>
        </Container>
      </Box>
    </div>
  );
};

export default LobbyScreen;
