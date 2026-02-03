import { Server } from "socket.io";

import organizationEvents from "./organization.events";
import musicStudioEvents from "./musicStudio.events";

export default function events(io: Server) {
  organizationEvents(io);
  musicStudioEvents(io);
}
