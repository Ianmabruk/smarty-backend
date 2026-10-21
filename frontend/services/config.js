import Constants from "expo-constants";
import { Platform } from "react-native";

const envApiBase = (process.env.EXPO_PUBLIC_API_BASE || process.env.API_BASE || "").trim();
const localhostFallback = "http://localhost:5000/api";
const androidEmulatorFallback = "http://10.0.2.2:5000/api";

const hostUriBase = (() => {
  if (!Constants?.expoConfig?.hostUri) return null;
  const host = Constants.expoConfig.hostUri.split(":")[0];
  return `http://${host}:5000/api`;
})();

let runtimeFallback = localhostFallback;
if (hostUriBase) {
  runtimeFallback = hostUriBase;
} else if (Platform.OS === "android") {
  runtimeFallback = androidEmulatorFallback;
}

export const API_BASE = envApiBase || runtimeFallback;
