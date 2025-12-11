import { Server, Socket } from "socket.io";
interface ChatMessage {
    username: string;
    text: string;
}

export default (io: Server) => {
    console.log("Organization events initialized");
    // const namespace = io.of("/organization-chat");
    // let connectedUsers = 0;
    // namespace.on("connection", (socket: Socket) => {
    //     console.log("User connected to organization chat");
    //     connectedUsers++;
    //     // Broadcast updated user count
    //     namespace.emit("usersCount", connectedUsers);
    //     // Listen for incoming chat messages
    //     socket.on("sendMessage", (message: ChatMessage) => {
    //         // Broadcast to all clients except the sender
    //         socket.broadcast.emit("receiveMessage", message);
    //     });
    //     // Handle disconnection
    //     socket.on("disconnect", () => {
    //         connectedUsers--;
    //         // Broadcast updated user count
    //         namespace.emit("usersCount", connectedUsers);
    //     });
    // });

    io.on("connection", (socket: Socket) => {
        console.log("User connected to organization chat");
        socket.join("organization-chat");
        socket.emit("usersCount", 0);
        socket.on("disconnect", () => {
            console.log("User disconnected from organization chat");
        });

        // socket.on("join_room", (data) => {
        //     const { room_id } = data;
        //     console.log("User joined room", room_id);
        //     // Join the dynamically generated room
        //     socket.join(room_id);
        //     // emit an event to notify the client about the room ID
        //     socket.emit("join_room", room_id);
        // });

        socket.on("join_room", (data) => {
            /**
             * TODO
             * 1. import room service
             * 2. check if room exists by room_id (uuid)
             * 3. if room exists, join the room
             * 4. if room does not exist, emit an event to notify the client about the room ID
             */
            const { room_id } = data;
            console.log({ room_id });
            // Join the dynamically generated room
            socket.join(room_id);
            // emit an event to notify the client about the room ID
            socket.emit("join_room", room_id);
        });
    });
};
