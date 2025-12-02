# Socket.IO server (if not installed already)
npm install socket.io

# Socket.IO client for Node.js testing
npm install socket.io-client

# TypeScript (if not installed globally)
npm install typescript ts-node @types/node --save-dev

#Optional: If you want type definitions for socket.io-client
npm install @types/socket.io-client --save-dev

+++++++++++++++++++++++++++++
// src/server.ts
* Wrap your Express app in an HTTP server.
* Attach Socket.IO.
* cors: { origin: "*" } allows connections from anywhere (optional)
-------------------------------
Wrapped your Express app in an HTTP server.
Attached a Socket.IO server.
Listens on port 3002.
-------------------------------

+++++++++++++++++++++++++++++
// src/socketHandler.ts
* Supports rooms and global messages.
* Logs everything on the server console.
-------------------------------
-Handles events:
* connection → log client connects
* disconnect → log client disconnects
* join → client joins a room
* chat_message → emits messages globally or to rooms
-------------------------------

+++++++++++++++++++++++++++++
// src/events/socketPlayground.ts
* Simulates multiple clients in Node.js.
* Messages and room behavior appear in both server and client consoles.
* Fully tests Socket.IO features without a frontend.
-------------------------------
-Uses socket.io-client to simulate multiple clients:
*Alice, Bob, Charlie, Dave
-Each client can:
*Connect to server
*Join rooms
*Send messages
*Receive messages
-Messages are logged in server console and client console.
-Repeated messages simulate real-time activity.
-------------------------------



+++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++
run in another cli
npx ts-node src/server.ts || npm run dev

run in another cli
npx ts-node src/events/socketPlayground.ts
