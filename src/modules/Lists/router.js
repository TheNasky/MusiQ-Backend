import express from "express";
import { createList, joinList, addSong, deleteSong, getList, playNextSong, playSpecificSong, getHistory, playPreviousSong, accessList } from "./controller.js";

const router = express.Router();

router.get("/:code", getList);
router.post("/create", createList);
router.post("/join", joinList);
router.post("/access", accessList);
router.post("/addSong", addSong);
router.delete("/deleteSong", deleteSong);
router.post("/playNext", playNextSong);
router.post("/playSpecific", playSpecificSong);
router.get("/history/:code", getHistory);
router.post("/playPrevious", playPreviousSong);

export default router;