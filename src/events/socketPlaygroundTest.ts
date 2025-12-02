(() => {
  const ioClient = require("socket.io-client");

  // -----------------------------
  // TypeScript interfaces
  // -----------------------------
  interface JoinData {
    room: string;
    message?: string;
  }

  interface ChatMessage {
    user: string;
    message: string;
    room?: string;
    timestamp?: string;
    count?: number;
  }

  // -----------------------------
  // Function to create a chat client
  // -----------------------------
  const createClient = (
    name: string,
    room: string,
    intervalMs: number = 5000
  ) => {
    const socket = ioClient("http://localhost:3002");
    let messageCount = 0;

    const sendMessage = (msg: string) => {
      messageCount++;
      const payload: ChatMessage = {
        user: name,
        message: msg,
        room,
        timestamp: new Date().toISOString(),
        count: messageCount,
      };
      console.log(`[${name}] Sending:`, payload);
      socket.emit("chat_message", payload);
    };

    socket.on("connect", () => {
      console.log(`[${name}] Connected with ID: ${socket.id}`);

      // Join room
      socket.emit("join", { room });

      // Initial message after 1s
      setTimeout(() => sendMessage(`Hello from ${name}!`), 1000);

      // Repeat messages at intervalMs
      setInterval(() => {
        const msg = `Random message from ${name} at ${new Date().toLocaleTimeString()}`;
        sendMessage(msg);
      }, intervalMs);
    });

    // Listen for server events
    socket.on("joined", (data: JoinData) =>
      console.log(`[${name}] Joined room:`, data)
    );

    // Receive messages from others in the room
    socket.on("chat_message", (data: ChatMessage) => {
      if (data.user !== name) {
        console.log(`[${name}] Received from ${data.user}:`, data);
      }
    });

    // Confirmation for sender
    socket.on("message_sent", (data: ChatMessage) => {
      console.log(`[${name}] Confirmed sent:`, data);
    });

    socket.on("disconnect", () => console.log(`[${name}] Disconnected`));

    return socket;
  };

  // -----------------------------
  // Comment In or Out to add User
  // -----------------------------
  const roomName1 = "room1";
  const roomName2 = "room2";
  const roomName3 = "room3";
  const roomName4 = "room4";
  const roomName5 = "room5";
  const roomName6 = "room6";
  const roomName7 = "room7";
  const roomName8 = "room8";
  const roomName9 = "room9";
  const roomName10 = "room10";
  const test1 = createClient("_1_", roomName1, 10000); // every 10s
  const test2 = createClient("_2_", roomName1, 15000); // every 15s
  //   const test3 = createClient("_3_", roomName, 10000); // every 10s
  //   const test4 = createClient("_4_", roomName, 15000); // every 15s
  //   const test5 = createClient("_5_", roomName, 10000); // every 10s
  //   const test6 = createClient("_6_", roomName, 15000); // every 15s
  //   const test7 = createClient("_7_", roomName, 10000); // every 10s
  //   const test8 = createClient("_8_", roomName, 15000); // every 15s
  //   const test9 = createClient("_9_", roomName, 10000); // every 10s
  //   const test10 = createClient("_10_", roomName, 15000); // every 15s
  //   const test11 = createClient("_11_", roomName, 10000); // every 10s
  //   const test12 = createClient("_12_", roomName, 15000); // every 15s
  //   const test13 = createClient("_13_", roomName, 10000); // every 10s
  //   const test14 = createClient("_14_", roomName, 15000); // every 15s

})();
