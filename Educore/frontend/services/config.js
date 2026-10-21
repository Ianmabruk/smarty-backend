import Constants from "expo-constants";
import { Platform } from "react-native";

const envApiBase = process.env.EXPO_PUBLIC_API_BASE || process.env.API_BASE || "";
const lanFallback = "http://192.168.100.31:8080/api";
const localhostFallback = "http://localhost:8080/api";
const androidEmulatorFallback = "http://10.0.2.2:8080/api";

const hostUriBase = (() => {
  if (!Constants?.expoConfig?.hostUri) return null;
  const host = Constants.expoConfig.hostUri.split(":")[0];
  return `http://${host}:8080/api`;
})();

let runtimeFallback = lanFallback;
if (Platform.OS === "web") {
  runtimeFallback = localhostFallback;
} else if (hostUriBase) {
  runtimeFallback = hostUriBase;
} else if (Platform.OS === "android") {
  runtimeFallback = androidEmulatorFallback;
}

export const API_BASE = envApiBase || runtimeFallback;
