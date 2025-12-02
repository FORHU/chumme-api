Test Local Development in BACK-END

# Socket.IO server (if not installed) server
+ npm install socket.io

# Socket.IO client for Node.js testing Node.js client testing
+ npm install socket.io-client

# TypeScript (if not installed globally) a TypeScript support
+ npm install typescript ts-node @types/node --save-dev

# Optional: If you want type definitions for socket.io-client
# Optional TypeScript definitions for client
+ npm install @types/socket.io-client --save-dev

+++++++++++++++++++++++++++++
// src/server.ts
* Wrap your Express app in an HTTP server.
* Attach Socket.IO.
* cors: { origin: "*" } allows connections from anywhere (optional)
* App is on 3002, listen to the changes
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
* join → log client joins a room
* chat_message → log emits messages globally or to rooms
-------------------------------

+++++++++++++++++++++++++++++
// src/events/socketPlayground.ts
* Simulates multiple clients in Node.js without a frontend.
* Messages and room behavior appear in both server and client consoles.
* Fully tests Socket.IO features without a frontend.
-------------------------------
-Uses socket.io-client to simulate multiple clients:
-Each client can:
*Connect to server
*Join rooms
*Send messages
*Receive messages
-Messages are logged in server console and client console.
-Repeated messages simulate real-time activity.
-------------------------------

+++++++++++++++++++++++++++++
run in another cli
npx ts-node src/server.ts || npm run dev

run in another cli
npx ts-node src/events/socketPlayground.ts


+++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++
Notes / Tips
If testing on a real mobile device, replace localhost with your computer’s LAN IP in the playground and React Native client.
Make sure ports aren’t blocked by firewall.
Each client logs its messages independently; counts and rooms work per client.