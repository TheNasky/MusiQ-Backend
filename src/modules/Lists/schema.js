import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, default:"Desconocido" },
  url: { type: String, required: true },
  thumbnail: { type: String, required: false },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

const listSchema = new mongoose.Schema({
  name: { type: String, required: true },
  adminPassword: { type: String, required: true },
  isPrivate: { type: Boolean, default: true },
  code: { type: String, required: true, unique: true },
  songs: [songSchema],
  currentSong: { type: songSchema, default: null, required: false },
  users: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  history: [songSchema], // Add this line
});

export const ListModel = mongoose.model("List", listSchema);