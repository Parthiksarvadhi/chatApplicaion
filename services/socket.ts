import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

// ALWAYS use Mac IP for Expo Go
const SOCKET_URL = "http://192.168.2.28:5000";

console.log("🔌 Socket URL:", SOCKET_URL);

let socket: Socket | null = null;

export const initSocket = async () => {
  try {
    const token = await AsyncStorage.getItem("authToken");

    if (!socket) {
      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      socket.on("connect", async () => {
        console.log("✅ Socket connected:", socket?.id);

        socket?.emit("authenticate", token);

       
      });

      socket.on("authenticated", (data) => {
        console.log("Socket authenticated:", data);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      socket.on("connect_error", (err) => {
        console.log("Socket connect error:", err.message);
      });
    }

    return socket;
  } catch (err) {
    console.error("Socket init failed:", err);
    return null;
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
