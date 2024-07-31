import { ListModel } from "./schema.js";
import { resSuccess, resFail } from "../../config/utils/response.js";
import { v4 as uuidv4 } from "uuid";
import argon2 from "argon2";
import { io } from "../../app.js";
import { generateUniqueCode } from "../../config/utils/codeGenerator.js";

// Create a new list
export const createList = async (req, res) => {
  const { name, adminPassword, isPrivate } = req.body;
  const hashedPassword = await argon2.hash(adminPassword);
  const code = uuidv4().slice(0, 8); // Generate a unique 8-character code

  const newList = new ListModel({
    name,
    adminPassword: hashedPassword,
    isPrivate,
    code,
  });

  try {
    await newList.save();
    return resSuccess(res, 201, "List created successfully", { code });
  } catch (error) {
    return resFail(res, 500, "Failed to create list", error.message);
  }
};

// Join a list
export const joinList = async (req, res) => {
  const { code, username } = req.body;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    if (list.isPrivate && !list.users.includes(username)) {
      return resSuccess(res, 200, "Request sent to admin for approval");
    } else {
      list.users.push(username);
      await list.save();
      return resSuccess(res, 200, "Joined list successfully", { code });
    }
  } catch (error) {
    return resFail(res, 500, "Failed to join list", error.message);
  }
};

// Add a song to the list
export const addSong = async (req, res) => {
  const { code, title, artist, url, thumbnail, addedBy } = req.body;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    const newSong = { title, artist, url, addedBy };
    if (thumbnail) {
      newSong.thumbnail = thumbnail;
    }

    list.songs.push(newSong);

    // If there's no current song, set the new song as the current song
    if (!list.currentSong) {
      list.currentSong = newSong;
    }

    await list.save();

    // Emit the updated playlist to all clients in the room
    io.to(code).emit("playlistUpdated", list);

    return resSuccess(res, 200, "Song added successfully", { list });
  } catch (error) {
    console.error("Error adding song:", error);
    return resFail(res, 500, "Failed to add song", error.message);
  }
};

// Delete a song (admin only)
export const deleteSong = async (req, res) => {
  const { code, songId, adminPassword } = req.body;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    const isPasswordValid = await argon2.verify(list.adminPassword, adminPassword);
    if (!isPasswordValid) {
      return resFail(res, 403, "Invalid admin password");
    }

    list.songs.pull({ _id: songId });
    await list.save();

    // Emit the updated playlist to all clients in the room
    io.to(code).emit("playlistUpdated", list);

    return resSuccess(res, 200, "Song deleted successfully", { list });
  } catch (error) {
    return resFail(res, 500, "Failed to delete song", error.message);
  }
};

export const getList = async (req, res) => {
  const code = req.params.code;
  const username = req.query.username;
  console.log(code);
  console.log(username);
  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }
    if (list.isPrivate && !list.users.includes(username)) {
      return resFail(res, 403, "User is not on the list");
    }
    return resSuccess(res, 200, "List found", { list });
  } catch (error) {
    return resFail(res, 400, "List not found", error.message);
  }
};

export const playNextSong = async (req, res) => {
  const { code, adminPassword } = req.body;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    const isPasswordValid = await argon2.verify(list.adminPassword, adminPassword);
    if (!isPasswordValid) {
      return resFail(res, 403, "Invalid admin password");
    }

    if (list.currentSong) {
      list.history.unshift(list.currentSong);
      list.history = list.history.slice(0, 25);
    }

    if (list.songs.length > 0) {
      list.currentSong = list.songs.shift();
    } else {
      list.currentSong = null;
    }

    await list.save();

    return resSuccess(res, 200, "Next song set", { list });
  } catch (error) {
    return resFail(res, 500, "Failed to set next song", error.message);
  }
};

export const playPreviousSong = async (req, res) => {
  const { code, adminPassword } = req.body;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    const isPasswordValid = await argon2.verify(list.adminPassword, adminPassword);
    if (!isPasswordValid) {
      return resFail(res, 403, "Invalid admin password");
    }

    if (list.history.length === 0) {
      return resFail(res, 400, "No previous songs in history");
    }

    if (list.currentSong) {
      list.songs.unshift(list.currentSong);
    }

    list.currentSong = list.history.shift();

    await list.save();

    return resSuccess(res, 200, "Previous song set", { list });
  } catch (error) {
    return resFail(res, 500, "Failed to set previous song", error.message);
  }
};

export const playSpecificSong = async (req, res) => {
  const { code, songId, adminPassword, fromHistory } = req.body;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    const isPasswordValid = await argon2.verify(list.adminPassword, adminPassword);
    if (!isPasswordValid) {
      return resFail(res, 403, "Invalid admin password");
    }

    let songToPlay;
    let songIndex;

    if (fromHistory) {
      songIndex = list.history.findIndex(song => song._id.toString() === songId);
      if (songIndex === -1) {
        return resFail(res, 404, "Song not found in history");
      }
      songToPlay = list.history.splice(songIndex, 1)[0];
    } else {
      songIndex = list.songs.findIndex(song => song._id.toString() === songId);
      if (songIndex === -1) {
        return resFail(res, 404, "Song not found in the list");
      }
      songToPlay = list.songs.splice(songIndex, 1)[0];
    }

    // Add the current song to history if it exists
    if (list.currentSong) {
      list.history.unshift(list.currentSong);
      list.history = list.history.slice(0, 25); // Keep only the latest 25 songs
    }
    
    // Set the new current song
    list.currentSong = songToPlay;
    
    await list.save();
    
    // Emit the updated playlist to all clients in the room
    io.to(code).emit("playlistUpdated", list);
    
    return resSuccess(res, 200, "Song set as current and playlist updated", { list });
  } catch (error) {
    return resFail(res, 500, "Failed to update current song", error.message);
  }
};

export const getHistory = async (req, res) => {
  const { code } = req.params;

  try {
    const list = await ListModel.findOne({ code });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    return resSuccess(res, 200, "History retrieved successfully", { history: list.history });
  } catch (error) {
    return resFail(res, 500, "Failed to retrieve history", error.message);
  }
};

export const accessList = async (req, res) => {
  const { name, adminPassword } = req.body;

  try {
    const list = await ListModel.findOne({ name });
    if (!list) {
      return resFail(res, 404, "List not found");
    }

    const isPasswordValid = await argon2.verify(list.adminPassword, adminPassword);
    if (!isPasswordValid) {
      return resFail(res, 403, "Invalid admin password");
    }

    return resSuccess(res, 200, "Access granted", { code: list.code });
  } catch (error) {
    return resFail(res, 500, "Failed to access list", error.message);
  }
};