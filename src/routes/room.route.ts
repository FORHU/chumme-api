import express from "express";
import RoomCtrl from "../controllers/room.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();

// All room routes require authentication
router.use(authenticate);

// CRUD operations for rooms
router.post("/", RoomCtrl.createRoom);           // Create a new room
router.get("/", RoomCtrl.getAllRooms);           // Get all rooms (with pagination)
router.get("/:id", RoomCtrl.getRoomById);        // Get room by ID
router.put("/:id", RoomCtrl.updateRoom);         // Update room details
router.delete("/:id", RoomCtrl.deleteRoom);      // Soft delete room
router.post("/:id/join", RoomCtrl.joinRoom);     // Join a room
router.post("/:id/leave", RoomCtrl.leaveRoom);   // Leave a room
router.get("/:id/members", RoomCtrl.getRoomMembers); // Get room members

export default router;