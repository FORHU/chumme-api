import { Server } from "socket.io";
import organizationEvents from "./organization.events";
export default function events(io: Server) {
  io.on("connection", () => {
    console.log("User connected to root socket");
  });

  organizationEvents(io);
}
