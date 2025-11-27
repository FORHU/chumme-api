import { Server } from "socket.io";

export default (io: Server) => {
    io.on("connection", (socket) => {
        console.log("Client connected to /organization");

        socket.on("disconnect", () => {
            console.log("Client disconnected from /organization");
        });

        socket.on("join", (data) => {
            console.log("Client joined /organization", data);
        });

        socket.on("chat_message", (data) => {
            console.log("Client sent chat message", data);
        });
    });
};
