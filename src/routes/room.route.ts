import express from "express";
import RoomCtrl from "../controllers/room.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.post("/create", RoomCtrl.createRoom);         
router.get("/", RoomCtrl.getAllRooms);          
router.get("/list", RoomCtrl.fetchRoomList);      
router.get("/:id", RoomCtrl.getRoomById);        
router.put("/update", RoomCtrl.updateRoom);     
router.delete("/:id", RoomCtrl.deleteRoom);    
router.post("/:id/join", RoomCtrl.joinRoom);     
router.post("/:id/leave", RoomCtrl.leaveRoom);   

export default router;