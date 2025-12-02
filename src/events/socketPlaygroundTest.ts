(() => {
  const ioClient = require("socket.io-client");

  // -----------------------------
  // TypeScript interfaces
  // -----------------------------
  interface JoinData {
    room: string;
    message: string;
  }

  interface ChatMessage {
    user: string;
    message: string;
    room?: string;
  }

  // -----------------------------
  // Function to create a client
  // -----------------------------
  const createClient = (name: string, room?: string, intervalMs: number = 5000) => {
    const socket = ioClient("http://localhost:3002");

    socket.on("connect", () => {
      console.log(`[${name}] Connected with ID: ${socket.id}`);

      // Join room if provided
      if (room) {
        socket.emit("join", { room });
      }

      // Send initial chat message
      socket.emit("chat_message", { user: name, message: `Hello from ${name}!`, room });

      // Repeat messages every intervalMs milliseconds
      setInterval(() => {
        const msg = `Random message from ${name} at ${new Date().toLocaleTimeString()}`;
        socket.emit("chat_message", { user: name, message: msg, room });
      }, intervalMs);
    });

    // Listen for join confirmation
    socket.on("joined", (data: JoinData) => {
      console.log(`[${name}] Joined room:`, data);
    });

    // Listen for chat messages
    socket.on("chat_message", (data: ChatMessage) => {
      console.log(`[${name}] Chat message received:`, data);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[${name}] Disconnected`);
    });

    return socket;
  };

  // -----------------------------
  // Create multiple clients
  // -----------------------------
  const clients = [
    createClient("Alice", "room1", 7000),
    createClient("Bob", "room1", 9000),
    createClient("Charlie", undefined, 6000),
    createClient("Dave", "room2", 8000),
  ];

  console.log("Backend Socket.IO playground running...");
})();
